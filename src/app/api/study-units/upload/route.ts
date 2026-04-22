import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
const pdfParse = require("pdf-parse");

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const mime = file.type;

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (mime === "text/plain" || name.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }
  throw new Error(`פורמט לא נתמך: ${file.name}`);
}

function splitByUnits(text: string, separator: string): string[] {
  let parts = text.split(separator).map(p => p.trim()).filter(p => p.length > 0);
  if (parts.length === 1 && separator === "---") {
    const fallback = text.split(/יחידה\s+[0-9]+/).map(p => p.trim()).filter(p => p.length > 0);
    if (fallback.length > 1) parts = fallback;
  }
  return parts;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const courseId = formData.get("courseId") as string;
    const tagId = formData.get("tagId") as string;
    const studySemesterId = formData.get("studySemesterId") as string;
    const separator = (formData.get("separator") as string) || "---";

    if (!files.length) {
      return NextResponse.json({ error: "לא נשלחו קבצים" }, { status: 400 });
    }

    // Start unit numbering after existing units in this semester
    const existingCount = studySemesterId
      ? await prisma.studyUnit.count({ where: { studySemesterId } })
      : 0;

    let globalUnitNumber = existingCount + 1;
    let totalCreated = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const rawText = await extractText(file);
        if (!rawText.trim()) {
          errors.push(`${file.name}: לא נמצא טקסט`);
          continue;
        }

        const parts = splitByUnits(rawText, separator);

        for (let i = 0; i < parts.length; i++) {
          const content = parts[i];
          const title = `יחידה ${globalUnitNumber}`;

          await prisma.studyUnit.create({
            data: {
              title,
              content: content.trim(),
              courseId: courseId || null,
              tagId: tagId || null,
              studySemesterId: studySemesterId || null,
              unitNumber: globalUnitNumber,
              sortOrder: (globalUnitNumber - 1) * 10,
            },
          });

          globalUnitNumber++;
          totalCreated++;
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    const message = `נוצרו ${totalCreated} יחידות לימוד${errors.length ? ` (${errors.length} שגיאות)` : ""}`;
    return NextResponse.json({ success: true, message, count: totalCreated, errors });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "שגיאה בייבוא הקבצים" }, { status: 500 });
  }
}
