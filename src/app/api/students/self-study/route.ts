import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - list all self-study enrollments (with filters)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    const studyTopic = searchParams.get("studyTopic");
    const needsContact = searchParams.get("needsContact"); // "true" = nextContactDate <= today

    const where: any = {};

    if (status) where.status = status;
    if (courseId) where.courseId = courseId;
    if (studyTopic) where.studyTopic = { contains: studyTopic, mode: "insensitive" };

    if (needsContact === "true") {
      where.nextContactDate = { lte: new Date() };
    }

    if (q) {
      where.student = {
        OR: [
          { firstNameMoodle: { contains: q, mode: "insensitive" } },
          { lastNameMoodle: { contains: q, mode: "insensitive" } },
          { firstNameOverride: { contains: q, mode: "insensitive" } },
          { lastNameOverride: { contains: q, mode: "insensitive" } },
          { hebrewName: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const enrollments = await prisma.selfStudyEnrollment.findMany({
      where,
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
            syllabusItems: {
              select: { id: true, title: true, type: true, sortOrder: true, moodleCmId: true },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        contactLogs: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            admin: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { nextContactDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    // Get distinct study topics for filter dropdown
    const topics = await prisma.selfStudyEnrollment.findMany({
      where: { studyTopic: { not: null } },
      select: { studyTopic: true },
      distinct: ["studyTopic"],
    });

    return NextResponse.json({
      enrollments,
      topics: topics.map((t) => t.studyTopic).filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching self-study enrollments:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תלמידים עצמאיים" }, { status: 500 });
  }
}

// POST - create a new self-study enrollment
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, courseId, studyTopic, nextExamDate, examUnits, examNotes, nextContactDate } = body;

    if (!studentId || !courseId) {
      return NextResponse.json({ error: "תלמיד וקורס הם שדות חובה" }, { status: 400 });
    }

    // Check student exists
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ error: "תלמיד לא נמצא" }, { status: 404 });
    }

    // Check course exists
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return NextResponse.json({ error: "קורס לא נמצא" }, { status: 404 });
    }

    // Check not already enrolled
    const existing = await prisma.selfStudyEnrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
    if (existing) {
      return NextResponse.json({ error: "התלמיד כבר רשום ללימוד עצמאי בקורס זה" }, { status: 400 });
    }

    const enrollment = await prisma.selfStudyEnrollment.create({
      data: {
        studentId,
        courseId,
        studyTopic: studyTopic || null,
        nextExamDate: nextExamDate ? new Date(nextExamDate) : null,
        examUnits: examUnits || null,
        examNotes: examNotes || null,
        nextContactDate: nextContactDate ? new Date(nextContactDate) : null,
      },
      include: {
        student: { select: { id: true, hebrewName: true, firstNameOverride: true, lastNameOverride: true } },
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      },
    });

    return NextResponse.json({ success: true, enrollment });
  } catch (error) {
    console.error("Error creating self-study enrollment:", error);
    return NextResponse.json({ error: "שגיאה ביצירת רישום לימוד עצמאי" }, { status: 500 });
  }
}
