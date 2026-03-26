import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - get single self-study enrollment with full details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const enrollment = await prisma.selfStudyEnrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            hebrewName: true,
            firstNameMoodle: true,
            firstNameOverride: true,
            lastNameMoodle: true,
            lastNameOverride: true,
            emailMoodle: true,
            emailOverride: true,
            phoneMoodle: true,
            phoneOverride: true,
            moodleUserId: true,
          },
        },
        course: {
          select: {
            id: true,
            moodleCourseId: true,
            fullNameMoodle: true,
            fullNameOverride: true,
            reqExamsCount: true,
            reqGradeAverage: true,
            reqAttendancePercent: true,
            syllabusItems: {
              select: { id: true, title: true, type: true, sortOrder: true, moodleCmId: true, weight: true, maxScore: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contactLogs: {
          orderBy: { createdAt: "desc" },
          include: {
            admin: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "רישום לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({ enrollment });
  } catch (error) {
    console.error("Error fetching self-study enrollment:", error);
    return NextResponse.json({ error: "שגיאה בטעינת נתונים" }, { status: 500 });
  }
}

// PATCH - update self-study enrollment
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, studyTopic, nextExamDate, examUnits, examNotes, nextContactDate } = body;

    const data: any = {};
    if (status !== undefined) data.status = status;
    if (studyTopic !== undefined) data.studyTopic = studyTopic || null;
    if (nextExamDate !== undefined) data.nextExamDate = nextExamDate ? new Date(nextExamDate) : null;
    if (examUnits !== undefined) data.examUnits = examUnits || null;
    if (examNotes !== undefined) data.examNotes = examNotes || null;
    if (nextContactDate !== undefined) data.nextContactDate = nextContactDate ? new Date(nextContactDate) : null;

    const enrollment = await prisma.selfStudyEnrollment.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    console.error("Error updating self-study enrollment:", error);
    return NextResponse.json({ error: "שגיאה בעדכון רישום" }, { status: 500 });
  }
}

// DELETE - remove self-study enrollment
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.selfStudyEnrollment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting self-study enrollment:", error);
    return NextResponse.json({ error: "שגיאה במחיקת רישום" }, { status: 500 });
  }
}
