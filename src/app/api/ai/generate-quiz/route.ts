import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
// @ts-ignore - pdf-parse has no proper ESM default export
import pdfParse from "pdf-parse";
// @ts-ignore
import mammoth from "mammoth";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Helper: parse a file into text
async function extractTextFromBlob(file: Blob, filename: string): Promise<string> {
  const arrBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrBuffer);
  const lowerName = filename.toLowerCase();

  // If PDF
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  // If Word Document (.docx)
  if (
    lowerName.endsWith(".docx") || 
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  // Otherwise assume plain text (txt, markdown, etc.)
  return buffer.toString("utf-8");
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const syllabusItemId = formData.get("syllabusItemId") as string;
    const documentFile = formData.get("document") as Blob | null;
    const pastedText = formData.get("text") as string | null;
    
    // Configuration
    const numQuestions = parseInt(formData.get("numQuestions") as string) || 5;
    const questionType = formData.get("questionType") as string || "mixed"; // multiple_choice, open_ended, mixed

    if (!syllabusItemId) {
      return NextResponse.json({ error: "חסר מזהה פריט סילבוס" }, { status: 400 });
    }

    if (!documentFile && !pastedText) {
      return NextResponse.json({ error: "חובה להעלות קובץ (PDF/Word) או להדביק טקסט" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "מפתח Anthropic לא מוגדר במערכת." }, { status: 500 });
    }

    // 1. Extract context text
    let sourceText = "";
    if (documentFile) {
      const filename = (documentFile as File).name || "document.txt";
      sourceText = await extractTextFromBlob(documentFile, filename);
    } else if (pastedText) {
      sourceText = pastedText;
    }

    if (sourceText.length < 50) {
      return NextResponse.json({ error: "הטקסט קצר מדי מכדי לייצר חידון איכותי." }, { status: 400 });
    }

    // 2. Build the AI prompt using JSON mode instructions
    const prompt = `
אתה מורה מקצועי בעברית הבונה חידון / מטלה לתלמידים بناء על חומר הלימוד המצורף.
עליך לייצר ${numQuestions} שאלות מסוג: ${
      questionType === "multiple_choice" ? "שאלות אמריקאיות בלבד" : 
      questionType === "open_ended" ? "שאלות פתוחות בלבד" : 
      "מעורב (גם אמריקאיות וגם פתוחות)"
    }.

חומר הלימוד מתוך הקובץ/הטקסט:
<text>
${sourceText}
</text>

חוקים נוקשים לתשובה שלך:
1. עליך להחזיר אך ורק אובייקט JSON תקין. אל תוסיף שום טקסט לפני או אחרי ה-JSON.
2. ה-JSON יהיה במבנה הבא בדיוק:
{
  "title": "כותרת קצרה לחידון",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "ניסוח השאלה בעברית",
      "options": ["אופציה 1", "אופציה 2", "אופציה 3", "אופציה 4"],
      "correctAnswer": 0, // מספר האינדקס של התשובה הנכונה מתוך מערך options, מ-0 עד 3
      "rubric": "" // בשאלות אמריקאיות אפשר להשאיר ריק
    },
    {
      "id": "q2",
      "type": "open_ended",
      "question": "ניסוח שאלה פתוחה בעברית",
      "options": [], // ריק לגמרי בשאלות פתוחות
      "correctAnswer": null,
      "rubric": "הסבר למורה או לבינה המלאכותית הבודקת איך לבדוק את התשובה והנקודות העיקריות שאמורות להופיע"
    }
  ]
}
`;

    // 3. Call Claude AI
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 3000,
      temperature: 0.2,
      system: "אתה בונה חידונים מקצועי שמחזיר רק JSON מושלם בלי הקדמות.",
      messages: [
        { role: "user", content: prompt }
      ]
    });

    let rawJson = (message.content[0] as any).text.trim();
    
    // Clean up potential markdown wrappers
    if (rawJson.startsWith("\`\`\`json")) rawJson = rawJson.substring(7);
    if (rawJson.startsWith("\`\`\`")) rawJson = rawJson.substring(3);
    if (rawJson.endsWith("\`\`\`")) rawJson = rawJson.substring(0, rawJson.length - 3);

    const quizData = JSON.parse(rawJson);

    // 4. Save to Database
    const updatedItem = await prisma.syllabusItem.update({
      where: { id: syllabusItemId },
      data: {
        quizData: quizData,
      }
    });

    return NextResponse.json({ success: true, item: updatedItem });

  } catch (error: any) {
    console.error("AI Quiz Generator error:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת החידון: " + (error?.message || "תקלה בשרת") }, 
      { status: 500 }
    );
  }
}