import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mammoth from "mammoth";
const pdfParse = require("pdf-parse");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const courseId = formData.get("courseId") as string;
    const tagId = formData.get("tagId") as string;
    const separator = (formData.get("separator") as string) || "---";

    if (!file) {
      return NextResponse.json({ error: "לא נשלח קובץ" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let rawText = "";

    // Parse the file based on its type
    const mimeType = file.type;
    const fileName = file.name.toLowerCase();

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else if (mimeType === "text/plain" || fileName.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
    } else {
      return NextResponse.json({ error: "פורמט קובץ לא נתמך. העלה Word, PDF או TXT" }, { status: 400 });
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "לא נמצא טקסט בקובץ" }, { status: 400 });
    }

    // Split text by separator
    const splitRegex = new RegExp(
      separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\s*\\n",
      "g"
    );
    
    // First let's check if the generic split works
    let textParts = rawText.split(separator);
    
    // Clean up parts
    textParts = textParts.map(part => part.trim()).filter(part => part.length > 0);

    // If we only got 1 part and the separator was "---", maybe try "יחידה" fallback
    if (textParts.length === 1 && separator === "---") {
      const fallbackParts = rawText.split(/יחידה\s+[0-9]+/);
      if (fallbackParts.length > 1) {
        // Keep the splitting pattern
        textParts = fallbackParts.map(p => p.trim()).filter(p => p.length > 0);
      }
    }

    // Create units
    let createdCount = 0;
    for (let i = 0; i < textParts.length; i++) {
      const content = textParts[i];
      // Get the first line as Title
      const lines = content.split("\n").filter(l => l.trim().length > 0);
      const title = lines.length > 0 ? lines[0].substring(0, 100) : `יחידה ${i + 1}`;
      
      await prisma.studyUnit.create({
        data: {
          title: title.trim(),
          content: content.trim(),
          courseId: courseId || null,
          tagId: tagId || null,
          unitNumber: i + 1,
          sortOrder: i * 10,
        }
      });
      createdCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `נוצרו בהצלחה ${createdCount} יחידות לימוד`,
      count: createdCount
    });
  } catch (error: any) {
    console.error("Failed to upload and parse file:", error);
    return NextResponse.json({ error: "שגיאה בייבוא הקובץ קובץ או בפירוק היחידות" }, { status: 500 });
  }
}
