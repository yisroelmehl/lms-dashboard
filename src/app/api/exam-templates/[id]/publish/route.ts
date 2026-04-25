import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/exam-templates/:id/publish
// Body: { courseId: string, deadline?: string (ISO), slotKey?: string }
// Creates ExamAssignment for every active student enrolled in the course.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: templateId } = await params;
  const body = await request.json();
  const { courseId, deadline, slotKey } = body as {
    courseId?: string;
    deadline?: string;
    slotKey?: string;
  };

  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const template = await prisma.examTemplate.findUnique({ where: { id: templateId } });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      OR: [
        { statusOverride: "active" },
        { statusMoodle: "active", statusOverride: null },
      ],
    },
    select: { studentId: true },
  });

  const finalSlotKey = slotKey || `template:${templateId}`;
  const dl = deadline ? new Date(deadline) : null;

  const results = { created: 0, skipped: 0 };
  for (const enr of enrollments) {
    try {
      await prisma.examAssignment.create({
        data: {
          templateId,
          studentId: enr.studentId,
          slotKey: finalSlotKey,
          attempt: 1,
          deadline: dl,
        },
      });
      results.created++;
    } catch {
      results.skipped++;
    }
  }

  // Mark template as ready when first published
  if (template.status === "draft") {
    await prisma.examTemplate.update({
      where: { id: templateId },
      data: { status: "ready" },
    });
  }

  return NextResponse.json({
    ok: true,
    created: results.created,
    skipped: results.skipped,
    total: enrollments.length,
  });
}
