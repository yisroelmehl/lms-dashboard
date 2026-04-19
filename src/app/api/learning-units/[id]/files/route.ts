import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromBuffer, extractTextFromImage } from "@/lib/services/text-extraction";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: learningUnitId } = await params;

  const unit = await prisma.learningUnit.findUnique({ where: { id: learningUnitId } });
  if (!unit) return NextResponse.json({ error: "יחידת לימוד לא נמצאה" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "לא נשלח קובץ" }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "הקובץ גדול מדי (מקסימום 20MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type;
  const isImage = mimeType.startsWith("image/");

  let extractedText: string | null = null;
  try {
    if (isImage) {
      extractedText = await extractTextFromImage(buffer, mimeType);
    } else {
      extractedText = await extractTextFromBuffer(buffer, file.name);
    }
  } catch {
    // text extraction is best-effort; continue without it
  }

  const record = await prisma.learningUnitFile.create({
    data: {
      learningUnitId,
      fileName: file.name,
      fileType: mimeType,
      fileSize: file.size,
      fileData: buffer,
      extractedText,
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
      createdAt: true,
    },
  });

  return NextResponse.json(record, { status: 201 });
}
