import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// POST /api/ai/grade-answer — AI grades an open-ended answer
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "מפתח Anthropic לא מוגדר" }, { status: 500 });
  }

  const body = await req.json();
  const { submissionId, questionId } = body;

  if (!submissionId || !questionId) {
    return NextResponse.json({ error: "חסרים submissionId ו-questionId" }, { status: 400 });
  }

  // Load submission with syllabus item
  const submission = await prisma.studentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      syllabusItem: { select: { quizData: true, title: true } },
      student: {
        select: {
          hebrewName: true,
          firstNameMoodle: true,
          lastNameMoodle: true,
          firstNameOverride: true,
          lastNameOverride: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json({ error: "הגשה לא נמצאה" }, { status: 404 });
  }

  const quizData = submission.syllabusItem.quizData as any;
  if (!quizData?.questions) {
    return NextResponse.json({ error: "לחידון זה אין שאלות" }, { status: 400 });
  }

  const question = quizData.questions.find((q: any) => q.id === questionId);
  if (!question) {
    return NextResponse.json({ error: "שאלה לא נמצאה" }, { status: 404 });
  }

  if (question.type !== "open_ended") {
    return NextResponse.json({ error: "בדיקת AI רלוונטית רק לשאלות פתוחות" }, { status: 400 });
  }

  const answers = submission.answers as any;
  const studentAnswer = answers?.[questionId];

  if (!studentAnswer) {
    return NextResponse.json({ error: "התלמיד לא ענה על שאלה זו" }, { status: 400 });
  }

  const studentName =
    submission.student.hebrewName ||
    `${submission.student.firstNameOverride || submission.student.firstNameMoodle || ""} ${submission.student.lastNameOverride || submission.student.lastNameMoodle || ""}`.trim();

  try {
    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      temperature: 0.1,
      system: "אתה מורה מקצועי שבודק תשובות לשאלות פתוחות. עליך להחזיר אך ורק JSON.",
      messages: [
        {
          role: "user",
          content: `בדוק את התשובה הבאה של התלמיד.

שם החידון: ${submission.syllabusItem.title}
שם התלמיד: ${studentName}

השאלה: ${question.question}

מחוון ציונים (קריטריונים): ${question.rubric}

תשובת התלמיד:
${studentAnswer}

עליך להחזיר אך ורק JSON במבנה הבא:
{
  "score": מספר בין 0 ל-100,
  "feedback": "הסבר קצר לתלמיד על הציון שקיבל, מה היה טוב ומה חסר"
}`,
        },
      ],
    });

    let rawJson = (message.content[0] as any).text.trim();
    if (rawJson.startsWith("```json")) rawJson = rawJson.substring(7);
    if (rawJson.startsWith("```")) rawJson = rawJson.substring(3);
    if (rawJson.endsWith("```")) rawJson = rawJson.substring(0, rawJson.length - 3);

    const result = JSON.parse(rawJson);

    return NextResponse.json({
      success: true,
      questionId,
      score: result.score,
      feedback: result.feedback,
    });
  } catch (error: any) {
    console.error("AI grading error:", error);
    return NextResponse.json(
      { error: "שגיאה בבדיקת AI: " + (error?.message || "תקלה") },
      { status: 500 }
    );
  }
}
