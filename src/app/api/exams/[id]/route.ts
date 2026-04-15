import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - exam template detail
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const exam = await prisma.examTemplate.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true, fullNameSource: true, driveFolderId: true } },
      createdBy: { select: { id: true, name: true } },
      submissions: {
        include: {
          student: { select: { id: true, firstNameMoodle: true, firstNameOverride: true, lastNameMoodle: true, lastNameOverride: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
  }

  return NextResponse.json(exam);
}

// PUT - update exam template
export async function PUT(
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
    const { title, description, type, status, examDate, dueDate, examData, totalPoints } = body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (type !== undefined) data.type = type;
    if (status !== undefined) data.status = status;
    if (examDate !== undefined) data.examDate = examDate ? new Date(examDate) : null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (examData !== undefined) data.examData = examData;
    if (totalPoints !== undefined) data.totalPoints = totalPoints;

    const exam = await prisma.examTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json(exam);
  } catch (error: any) {
    console.error("[Exams PUT]", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון מבחן: " + (error.message || "תקלה") },
      { status: 500 }
    );
  }
}

// DELETE - delete exam template
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.examTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Exams DELETE]", error);
    return NextResponse.json(
      { error: "שגיאה במחיקת מבחן" },
      { status: 500 }
    );
  }
}
