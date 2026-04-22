import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { unitIds, questionTypes, countPerType } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "חסר ANTHROPIC_API_KEY בהגדרות השרת" }, { status: 400 });
    }

    const units = await prisma.studyUnit.findMany({
      where: { id: { in: unitIds } }
    });

    if (units.length === 0) {
      return NextResponse.json({ error: "לא נמצאו יחידות לימוד" }, { status: 400 });
    }

    const aggregatedContent = units.map(u => `### יחידה: ${u.title}\n${u.content}`).join("\n\n");

    let requestedTypesText = "";
    if (questionTypes.includes("multiple_choice")) requestedTypesText += `- אמריקאיות (multiple_choice): ${countPerType} שאלות\n`;
    if (questionTypes.includes("open")) requestedTypesText += `- פתוחות (open): ${countPerType} שאלות\n`;
    if (questionTypes.includes("true_false")) requestedTypesText += `- נכון/לא נכון (true_false): ${countPerType} שאלות\n`;

    const prompt = `אתה מורה מקצועי שתפקידו לחבר מבחן על בסיס חומר לימוד מסוים.
חומר הלימוד מצורף למטה (מחולק ליחידות).

נא לחבר את השאלות הבאות:
${requestedTypesText}
ענה בפורמט JSON בלבד, ללא הסברים נוספים, במבנה הבא:
[
  {
    "questionText": "טקסט השאלה",
    "questionType": "open",
    "correctAnswer": "התשובה הנכונה",
    "options": null
  },
  {
    "questionText": "שאלה אמריקאית",
    "questionType": "multiple_choice",
    "correctAnswer": null,
    "options": [
      {"id": "1", "text": "אפשרות א", "isCorrect": true},
      {"id": "2", "text": "אפשרות ב", "isCorrect": false},
      {"id": "3", "text": "אפשרות ג", "isCorrect": false},
      {"id": "4", "text": "אפשרות ד", "isCorrect": false}
    ]
  }
]

יש לוודא שהתשובות נכונות על פי חומר הלימוד בלבד!

חומר הלימוד:
==========
${aggregatedContent}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON array from response (Claude may wrap it in markdown)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "המודל החזיר תשובה בפורמט לא תקין" }, { status: 500 });
    }

    let generatedQuestions: any[];
    try {
      generatedQuestions = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: "שגיאה בפירוש תשובת ה-AI" }, { status: 500 });
    }

    const defaultPoints = Math.round(100 / generatedQuestions.length);

    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      await prisma.examQuestion.create({
        data: {
          examTemplateId: id,
          questionText: q.questionText,
          questionType: q.questionType,
          correctAnswer: q.correctAnswer || null,
          options: q.options || null,
          points: defaultPoints,
          sortOrder: i * 10,
        },
      });
    }

    return NextResponse.json({ success: true, count: generatedQuestions.length });

  } catch (error: any) {
    console.error("Claude Generation Error:", error);
    return NextResponse.json({ error: "שגיאה בתהליך יצירת השאלות האוטומטי" }, { status: 500 });
  }
}
