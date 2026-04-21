import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { unitIds, questionTypes, countPerType } = body;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: "לא הוגדר מפתח API (חסר GOOGLE_API_KEY) בסביבת הפיתוח" 
      }, { status: 400 });
    }

    // Fetch units content
    const units = await prisma.studyUnit.findMany({
      where: { id: { in: unitIds } }
    });

    if (units.length === 0) {
      return NextResponse.json({ error: "לא נמצאו יחידות לימוד" }, { status: 400 });
    }

    const aggregatedContent = units.map(u => `### יחידה: ${u.title}\n${u.content}`).join("\n\n");
    
    // Configure Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build the prompt instruction
    let requestedTypesText = "";
    if (questionTypes.includes("multiple_choice")) requestedTypesText += `- אמריקאיות (multiple_choice): ${countPerType} שאלות\n`;
    if (questionTypes.includes("open")) requestedTypesText += `- פתוחות (open): ${countPerType} שאלות\n`;
    if (questionTypes.includes("true_false")) requestedTypesText += `- נכון/לא נכון (true_false): ${countPerType} שאלות\n`;

    const prompt = `
אתה מורה מקצועי שתפקידו לחבר מבחן על בסיס חומר לימוד מסוים.
חומר הלימוד מצורף למטה (מחולק ליחידות).

נא לחבר את השאלות הבאות:
${requestedTypesText}

ענה בפורמט JSON בלבד, בלי שום הסברים נוספים מסביב, במבנה הבא:
[
  {
    "questionText": "טקסט השאלה",
    "questionType": "open" | "multiple_choice" | "true_false",
    "correctAnswer": "התשובה הנכונה (לשאלות פתוחות או נכון/לא נכון)",
    "options": [
      {"id": "1", "text": "אפשרות א", "isCorrect": true},
      {"id": "2", "text": "אפשרות ב", "isCorrect": false}
      // במקרה של שאלות אמריקאיות בלבד
    ]
  }
]

יש לוודא שהתשובות נכונות במדויק על פי חומר הלימוד שסופק!

חומר הלימוד:
==========
${aggregatedContent}
`;

    // Try generating the content
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const text = result.response.text();
    let generatedQuestions;
    try {
      generatedQuestions = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "המודל החזיר תשובה בפורמט לא תקין" }, { status: 500 });
    }

    // Attempt to connect generated questions to one of the units (randomly or generically)
    // Actually we'll just insert them without studyUnitId since we grouped the text
    const defaultPoints = 100 / generatedQuestions.length;

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
          sortOrder: i * 10
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      count: generatedQuestions.length 
    });

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return NextResponse.json({ error: "שגיאה בתהליך יצירת השאלות האוטומטי" }, { status: 500 });
  }
}
