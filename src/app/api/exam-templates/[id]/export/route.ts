import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await prisma.examTemplate.findUnique({
      where: { id },
      include: {
        course: true,
        questions: { orderBy: { sortOrder: 'asc' } },
      }
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate HTML for print
    const html = `
      <!DOCTYPE html>
      <html lang="he" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>${template.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #000; line-height: 1.6; }
          .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .meta { font-size: 14px; color: #555; display: flex; justify-content: space-around; }
          .instructions { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 30px; font-style: italic; }
          .question { margin-bottom: 30px; page-break-inside: avoid; }
          .q-text { font-weight: bold; font-size: 16px; margin-bottom: 10px; }
          .options { list-style-type: none; padding-right: 0; }
          .option { margin-bottom: 8px; }
          .space { height: 100px; border-bottom: 1px dashed #ccc; margin-top: 20px; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #0056b3; color: white; border: none; cursor: pointer;">🖨️ הדפס / שמור כ-PDF</button>
          <p style="font-size:12px; color:gray">כדי לשמור כ-PDF, בחר "Save as PDF" בחלון ההדפסה. ניתן גם להעתיק הכל ולהדביק במסמך Word.</p>
        </div>

        <div class="header">
          <div class="title">${template.title}</div>
          <div class="meta">
            ${template.course ? `<span>קורס: ${template.course.fullNameOverride || template.course.fullNameMoodle}</span>` : ''}
            ${template.timeLimit ? `<span>זמן מוקצב: ${template.timeLimit} דקות</span>` : ''}
            <span>סה"כ נקודות: ${template.questions.reduce((sum, q) => sum + (q.points || 0), 0)}</span>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <strong>שם התלמיד:</strong> ______________________ &nbsp;&nbsp;&nbsp;&nbsp; <strong>תאריך:</strong> ______________________
        </div>

        ${template.instructions ? `<div class="instructions">${template.instructions.replace(/\\n/g, '<br>')}</div>` : ''}

        <div class="questions">
          ${template.questions.map((q, i) => `
            <div class="question">
              <div class="q-text">${i + 1}. ${q.questionText} <span style="font-weight:normal; font-size:12px; color:#666">(${q.points} נק')</span></div>
              
              ${q.questionType === 'multiple_choice' && Array.isArray(q.options) ? `
                <ul class="options">
                  ${q.options.map((opt: any) => `
                    <li class="option">
                      <input type="radio" disabled style="margin-left:8px"> ${opt.text}
                    </li>
                  `).join('')}
                </ul>
              ` : q.questionType === 'true_false' ? `
                <ul class="options">
                  <li class="option"><input type="radio" disabled style="margin-left:8px"> נכון</li>
                  <li class="option"><input type="radio" disabled style="margin-left:8px"> לא נכון</li>
                </ul>
              ` : `
                <div class="space"></div>
              `}
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
