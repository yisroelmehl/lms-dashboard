import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDriveFileContent } from "@/lib/services/google-drive";
import { extractTextFromBuffer } from "@/lib/services/text-extraction";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      prompt,
      fileIds = [],
      fileNames = [],
      fileMimeTypes = [],
      questionCount = 10,
      questionType = "mixed",
      pointsPerQuestion = 10,
    } = body;

    if (!prompt && fileIds.length === 0) {
      return NextResponse.json(
        { error: "יש לספק פרומפט או לבחור קבצים מהדרייב" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "מפתח Anthropic לא מוגדר במערכת." },
        { status: 500 }
      );
    }

    // Download and extract text from Drive files
    const sourceTexts: string[] = [];
    for (let i = 0; i < fileIds.length; i++) {
      const buffer = await getDriveFileContent(fileIds[i], fileMimeTypes[i]);
      const effectiveName =
        fileMimeTypes[i] === "application/vnd.google-apps.document"
          ? (fileNames[i] || "doc") + ".docx"
          : fileNames[i] || "file";
      const text = await extractTextFromBuffer(buffer, effectiveName);
      sourceTexts.push(text);
    }

    const combinedText = sourceTexts.join("\n\n---\n\n");

    // Build the AI prompt
    const typeInstruction =
      questionType === "multiple_choice"
        ? "שאלות אמריקאיות בלבד (multiple_choice)"
        : questionType === "open_ended"
          ? "שאלות פתוחות בלבד (open_ended)"
          : "מעורב - גם אמריקאיות וגם פתוחות (mixed)";

    const aiPrompt = `
אתה מומחה ביצירת מבחנים ומטלות אקדמיים בעברית.

${prompt ? `הנחיות המשתמש: ${prompt}` : ""}

${combinedText ? `חומר הלימוד:\n<text>\n${combinedText}\n</text>` : ""}

עליך ליצור ${questionCount} שאלות מסוג: ${typeInstruction}.
כל שאלה שווה ${pointsPerQuestion} נקודות.

חוקים נוקשים:
1. החזר אך ורק JSON תקין. אל תוסיף שום טקסט לפני או אחרי ה-JSON.
2. המבנה:
{
  "title": "כותרת המבחן",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "ניסוח השאלה בעברית",
      "options": ["אופציה 1", "אופציה 2", "אופציה 3", "אופציה 4"],
      "correctAnswer": 0,
      "rubric": "",
      "points": ${pointsPerQuestion}
    },
    {
      "id": "q2",
      "type": "open_ended",
      "question": "ניסוח שאלה פתוחה בעברית",
      "options": [],
      "correctAnswer": null,
      "rubric": "קריטריונים מפורטים לבדיקה: נקודות עיקריות שצריכות להופיע, עומק נדרש, ודוגמאות",
      "points": ${pointsPerQuestion}
    }
  ]
}
3. בשאלות אמריקאיות: correctAnswer = אינדקס התשובה הנכונה (0-3).
4. בשאלות פתוחות: rubric חייב להיות מפורט עם קריטריונים ברורים לבדיקה.
5. השאלות צריכות להיות מגוונות ברמת הקושי ובנושאים.
`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      temperature: 0.3,
      system: "אתה בונה מבחנים מקצועי שמחזיר רק JSON מושלם בלי הקדמות.",
      messages: [{ role: "user", content: aiPrompt }],
    });

    let rawJson = (message.content[0] as any).text.trim();

    // Clean up potential markdown wrappers
    if (rawJson.startsWith("```json")) rawJson = rawJson.substring(7);
    if (rawJson.startsWith("```")) rawJson = rawJson.substring(3);
    if (rawJson.endsWith("```")) rawJson = rawJson.substring(0, rawJson.length - 3);

    const examData = JSON.parse(rawJson.trim());
    const totalPoints = questionCount * pointsPerQuestion;

    // Save to database
    const exam = await prisma.examTemplate.update({
      where: { id },
      data: {
        examData,
        totalPoints,
        aiPrompt: prompt || null,
        sourceFileIds: fileIds,
        sourceFileNames: fileNames,
        sourceTexts: sourceTexts.length > 0 ? sourceTexts : undefined,
        status: "ready",
      },
    });

    return NextResponse.json({ success: true, exam });
  } catch (error: any) {
    console.error("[Exam Generate]", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת המבחן: " + (error.message || "תקלה") },
      { status: 500 }
    );
  }
}
