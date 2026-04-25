import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/exam-templates/:id/assignments — list assignments for this template
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: templateId } = await params;
  const assignments = await prisma.examAssignment.findMany({
    where: { templateId },
    include: {
      student: {
        select: {
          id: true,
          firstNameMoodle: true, firstNameOverride: true,
          lastNameMoodle: true, lastNameOverride: true,
          emailMoodle: true, emailOverride: true,
        },
      },
      submission: {
        select: {
          id: true,
          submittedAt: true,
          grade: true,
          maxGrade: true,
          gradingStatus: true,
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json({ assignments });
}

// POST /api/exam-templates/:id/assignments — assign to one student
// Body: { studentId, deadline?, slotKey?, attempt? }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: templateId } = await params;
  const body = await request.json();
  const { studentId, deadline, slotKey, attempt } = body as {
    studentId?: string;
    deadline?: string;
    slotKey?: string;
    attempt?: number;
  };

  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const finalSlotKey = slotKey || `template:${templateId}`;

  try {
    const assignment = await prisma.examAssignment.create({
      data: {
        templateId,
        studentId,
        slotKey: finalSlotKey,
        attempt: attempt ?? 1,
        deadline: deadline ? new Date(deadline) : null,
      },
    });
    return NextResponse.json({ assignment }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "התלמיד כבר משובץ למבחן זה" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
