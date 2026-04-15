import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// POST - trigger batch AI grading
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
    const { submissionIds } = body;

    // Load exam template with questions
    const exam = await prisma.examTemplate.findUnique({
      where: { id },
    });

    if (!exam || !exam.examData) {
      return NextResponse.json(
        { error: "מבחן לא נמצא או שאין שאלות" },
        { status: 404 }
      );
    }

    // Update exam status to grading
    await prisma.examTemplate.update({
      where: { id },
      data: { status: "grading" },
    });

    // Get submissions to grade
    const whereClause: any = {
      examTemplateId: id,
      gradingStatus: { in: ["pending", "error"] },
    };
    if (submissionIds && submissionIds.length > 0) {
      whereClause.id = { in: submissionIds };
    }

    const submissions = await prisma.examSubmission.findMany({
      where: whereClause,
    });

    if (submissions.length === 0) {
      return NextResponse.json({ error: "אין הגשות לבדיקה" }, { status: 400 });
    }

    const examData = exam.examData as any;
    const results = [];

    // Process sequentially to avoid rate limits
    for (const submission of submissions) {
      // Mark as processing
      await prisma.examSubmission.update({
        where: { id: submission.id },
        data: { gradingStatus: "processing" },
      });

      try {
        const gradeResult = await gradeSubmission(
          submission.extractedText || "",
          examData,
          exam.totalPoints || 100
        );

        await prisma.examSubmission.update({
          where: { id: submission.id },
          data: {
            grade: gradeResult.totalGrade,
            feedback: gradeResult.feedback,
            aiRawResponse: gradeResult.rawResponse,
            gradingStatus: "graded",
            gradedAt: new Date(),
          },
        });

        results.push({
          submissionId: submission.id,
          status: "graded",
          grade: gradeResult.totalGrade,
        });
      } catch (e: any) {
        console.error(`[Grade] Failed for submission ${submission.id}:`, e.message);

        await prisma.examSubmission.update({
          where: { id: submission.id },
          data: { gradingStatus: "error" },
        });

        results.push({
          submissionId: submission.id,
          status: "error",
          error: e.message,
        });
      }
    }

    // Check if all submissions are graded
    const pendingCount = await prisma.examSubmission.count({
      where: { examTemplateId: id, gradingStatus: { in: ["pending", "processing"] } },
    });

    if (pendingCount === 0) {
      await prisma.examTemplate.update({
        where: { id },
        data: { status: "completed" },
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("[Grade POST]", error);
    return NextResponse.json(
      { error: "שגיאה בתהליך הבדיקה: " + (error.message || "תקלה") },
      { status: 500 }
    );
  }
}

async function gradeSubmission(
  studentText: string,
  examData: any,
  totalPoints: number
) {
  const questionsInfo = examData.questions
    .map((q: any, i: number) => {
      let info = `שאלה ${i + 1} (${q.points || 10} נקודות, סוג: ${q.type}):\n${q.question}`;
      if (q.type === "multiple_choice") {
        info += `\nאפשרויות: ${q.options.join(" | ")}`;
        info += `\nתשובה נכונה: ${q.options[q.correctAnswer]}`;
      }
      if (q.rubric) {
        info += `\nקריטריונים לבדיקה: ${q.rubric}`;
      }
      return info;
    })
    .join("\n\n");

  const prompt = `
אתה בודק מבחנים מקצועי. עליך לבדוק את תשובות התלמיד ולתת ציון ומשוב מפורט.

שאלות המבחן והקריטריונים:
${questionsInfo}

תשובות התלמיד (טקסט שחולץ מהקובץ):
<student_answer>
${studentText}
</student_answer>

החזר אך ורק JSON תקין במבנה הבא:
{
  "overall": "משוב כללי על המבחן - נקודות חוזק וחולשה",
  "totalGrade": <ציון מספרי מתוך ${totalPoints}>,
  "perQuestion": [
    {
      "questionId": "q1",
      "score": <ציון לשאלה>,
      "maxScore": <ניקוד מקסימלי>,
      "feedback": "משוב מפורט לשאלה זו - מה היה נכון, מה חסר, מה שגוי"
    }
  ]
}

כללים:
1. נסה לזהות את התשובה של התלמיד לכל שאלה גם אם הפורמט לא מסודר.
2. אם לא ניתן לזהות תשובה לשאלה מסוימת, תן ציון 0 עם הערה שלא נמצאה תשובה.
3. בשאלות אמריקאיות: ציון מלא לתשובה נכונה, 0 לשגויה.
4. בשאלות פתוחות: הערך לפי הקריטריונים שניתנו.
5. המשוב חייב להיות בעברית, מפורט ובונה.
`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    temperature: 0.1,
    system: "אתה בודק מבחנים מקצועי שמחזיר רק JSON מושלם.",
    messages: [{ role: "user", content: prompt }],
  });

  let rawJson = (message.content[0] as any).text.trim();

  if (rawJson.startsWith("```json")) rawJson = rawJson.substring(7);
  if (rawJson.startsWith("```")) rawJson = rawJson.substring(3);
  if (rawJson.endsWith("```")) rawJson = rawJson.substring(0, rawJson.length - 3);

  const parsed = JSON.parse(rawJson.trim());

  return {
    totalGrade: parsed.totalGrade,
    feedback: {
      overall: parsed.overall,
      perQuestion: parsed.perQuestion,
    },
    rawResponse: parsed,
  };
}
