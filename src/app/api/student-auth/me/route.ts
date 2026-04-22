import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStudentSession } from "@/lib/student-session";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: {
      id: true,
      firstNameMoodle: true, firstNameOverride: true,
      lastNameMoodle: true, lastNameOverride: true,
      emailMoodle: true, emailOverride: true,
      enrollments: {
        where: { status: "active" },
        include: {
          course: {
            select: {
              id: true,
              fullNameMoodle: true,
              fullNameOverride: true,
              moodleCourseId: true,
              shortNameMoodle: true,
            },
          },
        },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ student });
}
