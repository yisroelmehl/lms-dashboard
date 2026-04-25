import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

// POST /api/exam-submissions/:id/ai-grade
// Internal endpoint — called from /portal/exams/:id/submit after a student submits.
// Auth: x-internal-secret header OR an authenticated admin session.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const internalSecret = request.headers.get("x-internal-secret");
  const isInternal = internalSecret && internalSecret === (process.env.SYNC_SECRET || "");

  if (!isInternal) {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const { id } = await params;
  const submission = await prisma.examSubmission.findUnique({
    where: { id },
    include: {
      examTemplate: {
        include: {
          questions: {
            orderBy: { sortOrder: "asc" },
            include: { studyUnit: { select: { title: true, content: true } } },
          },
        },
      },
      student: {
        select: {
          firstNameMoodle: true, firstNameOverride: true,
          lastNameMoodle: true, lastNameOverride: true,
        },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const studentAnswers = (submission.answers || []) as Array<{ questionId: string; answer: string }>;
  const studentName = [
    submission.student?.firstNameOverride || submission.student?.firstNameMoodle,
    submission.student?.lastNameOverride || submission.student?.lastNameMoodle,
  ].filter(Boolean).join(" ");

  const existingPerQ = (submission.aiPerQuestion as Array<{
    questionId: string; score: number; max: number; auto?: boolean; correct?: boolean; feedback?: string;
  }>) || [];

  const updatedPerQ: typeof existingPerQ = [];
  let totalScore = 0;
  let totalMax = 0;

  for (const q of submission.examTemplate.questions) {
    totalMax += q.points;
    const existing = existingPerQ.find(p => p.questionId === q.id);

    // Auto-graded questions (MC/TF) — keep the auto score
    if (existing?.auto) {
      totalScore += existing.score;
      updatedPerQ.push(existing);
      continue;
    }

    // Open / fill-in-blank — grade with AI
    const ans = studentAnswers.find(a => a.questionId === q.id);
    if (!ans?.answer?.trim()) {
      updatedPerQ.push({ questionId: q.id, score: 0, max: q.points, feedback: "לא נענה" });
      continue;
    }

    const studyContent = q.studyUnit?.content
      ? q.studyUnit.content.slice(0, 4000)
      : "(אין חומר לימוד מצורף)";

    try {
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 800,
        temperature: 0.2,
        system: "אתה מורה מומחה בודק תשובות לשאלות פתוחות בעברית. החזר אך ורק JSON תקין.",
        messages: [{
          role: "user",
          content: `בדוק את תשובת התלמיד "${studentName}" לשאלה הבאה.

שאלה: ${q.questionText}
ניקוד מקסימלי: ${q.points}
תשובה נכונה (רפרנס): ${q.correctAnswer || "אין רפרנס"}
חומר רקע (יחידת הלימוד):
${studyContent}

תשובת התלמיד:
${ans.answer}

החזר JSON בלבד:
{ "score": מספר בין 0 ל-${q.points}, "feedback": "משוב קצר לתלמיד — מה היה טוב, מה היה חסר" }`,
        }],
      });

      let raw = (msg.content[0] as { type: string; text?: string }).text?.trim() || "";
      raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(raw) as { score: number; feedback: string };
      const clamped = Math.max(0, Math.min(q.points, parsed.score));
      totalScore += clamped;
      updatedPerQ.push({
        questionId: q.id,
        score: clamped,
        max: q.points,
        feedback: parsed.feedback,
      });
    } catch (err) {
      console.error("AI grade error for question", q.id, err);
      updatedPerQ.push({
        questionId: q.id,
        score: 0,
        max: q.points,
        feedback: "AI grading failed — needs manual review",
      });
    }
  }

  // Overall evaluation
  let overallEval = "";
  try {
    const summary = updatedPerQ.map((p, i) =>
      `שאלה ${i + 1}: ${p.score}/${p.max}${p.feedback ? ` — ${p.feedback}` : ""}`
    ).join("\n");

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 600,
      temperature: 0.3,
      system: "אתה מורה כותב הערכה לימודית מקיפה לתלמיד בעברית.",
      messages: [{
        role: "user",
        content: `ההגשה של ${studentName} למבחן "${submission.examTemplate.title}" הסתיימה. ציון כולל: ${totalScore}/${totalMax}.

פירוט:
${summary}

כתוב הערכה לימודית קצרה (3-5 משפטים) שמתייחסת לחוזקות, חולשות, והמלצה ללמידה הבאה. פנה לתלמיד בלשון נוכח.`,
      }],
    });

    overallEval = (msg.content[0] as { type: string; text?: string }).text?.trim() || "";
  } catch (err) {
    console.error("Overall eval error:", err);
    overallEval = "";
  }

  const updated = await prisma.examSubmission.update({
    where: { id },
    data: {
      aiPerQuestion: updatedPerQ,
      aiOverallEval: overallEval || null,
      grade: totalScore,
      maxGrade: totalMax,
      gradingStatus: "graded",
      gradedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    grade: updated.grade,
    maxGrade: updated.maxGrade,
  });
}
