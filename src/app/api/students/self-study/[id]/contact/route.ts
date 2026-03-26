import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - get contact logs for a self-study enrollment
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

    const logs = await prisma.selfStudyContactLog.findMany({
      where: { selfStudyEnrollmentId: id },
      include: {
        admin: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching contact logs:", error);
    return NextResponse.json({ error: "שגיאה בטעינת יומן תקשורת" }, { status: 500 });
  }
}

// POST - add contact log entry + auto-create task reminder
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const { id } = await params;
    const body = await req.json();
    const { summary, nextContactDate } = body;

    if (!summary) {
      return NextResponse.json({ error: "תקציר השיחה הוא שדה חובה" }, { status: 400 });
    }

    // Verify enrollment exists and get student info
    const enrollment = await prisma.selfStudyEnrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            hebrewName: true,
            firstNameOverride: true,
            lastNameOverride: true,
          },
        },
        course: {
          select: { fullNameMoodle: true, fullNameOverride: true },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "רישום לא נמצא" }, { status: 404 });
    }

    const studentName =
      enrollment.student.hebrewName ||
      [enrollment.student.firstNameOverride, enrollment.student.lastNameOverride].filter(Boolean).join(" ") ||
      "תלמיד";
    const courseName = enrollment.course.fullNameOverride || enrollment.course.fullNameMoodle || "קורס";

    let taskId: string | null = null;

    // If nextContactDate is set, create an automatic task reminder
    if (nextContactDate) {
      const task = await prisma.task.create({
        data: {
          title: `יצירת קשר עם ${studentName} - לימוד עצמאי`,
          description: `תזכורת ליצירת קשר עם התלמיד ${studentName} (קורס: ${courseName}).\nתקציר שיחה אחרונה: ${summary}`,
          status: "open",
          scope: "student",
          dueDate: new Date(nextContactDate),
          createdById: adminId,
          assignedToId: adminId,
          students: {
            create: { studentId: enrollment.studentId },
          },
        },
      });
      taskId = task.id;
    }

    // Create the contact log
    const contactLog = await prisma.selfStudyContactLog.create({
      data: {
        selfStudyEnrollmentId: id,
        adminId,
        summary,
        nextContactDate: nextContactDate ? new Date(nextContactDate) : null,
        taskId,
      },
      include: {
        admin: { select: { id: true, name: true } },
      },
    });

    // Update the enrollment's nextContactDate
    if (nextContactDate) {
      await prisma.selfStudyEnrollment.update({
        where: { id },
        data: { nextContactDate: new Date(nextContactDate) },
      });
    }

    return NextResponse.json({ success: true, contactLog, taskId });
  } catch (error) {
    console.error("Error creating contact log:", error);
    return NextResponse.json({ error: "שגיאה ביצירת רשומת תקשורת" }, { status: 500 });
  }
}
