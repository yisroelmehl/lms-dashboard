import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDriveFileContent } from "@/lib/services/google-drive";
import {
  extractTextFromBuffer,
  extractTextFromImage,
} from "@/lib/services/text-extraction";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId, fileName, mimeType } = await req.json();

    if (!fileId || !fileName) {
      return NextResponse.json({ error: "חסר מזהה קובץ או שם" }, { status: 400 });
    }

    const buffer = await getDriveFileContent(fileId, mimeType);

    let text: string;

    // Handle images with Claude Vision OCR
    if (mimeType?.startsWith("image/")) {
      text = await extractTextFromImage(buffer, mimeType);
    } else {
      // Handle Google Docs exported as DOCX
      const effectiveName =
        mimeType === "application/vnd.google-apps.document"
          ? fileName + ".docx"
          : fileName;
      text = await extractTextFromBuffer(buffer, effectiveName);
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("[Drive Download]", error);
    return NextResponse.json(
      { error: error.message || "שגיאה בהורדת קובץ" },
      { status: 500 }
    );
  }
}
