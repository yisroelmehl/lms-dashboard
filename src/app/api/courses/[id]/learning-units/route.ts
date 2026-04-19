import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const units = await prisma.learningUnit.findMany({
    where: { courseId },
    orderBy: { sortOrder: "asc" },
    include: {
      files: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json(units);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;
  const { name, description } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "שם יחידת הלימוד הוא שדה חובה" }, { status: 400 });
  }

  const lastUnit = await prisma.learningUnit.findFirst({
    where: { courseId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const unit = await prisma.learningUnit.create({
    data: {
      courseId,
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: (lastUnit?.sortOrder ?? -1) + 1,
    },
    include: {
      files: {
        select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(unit, { status: 201 });
}
