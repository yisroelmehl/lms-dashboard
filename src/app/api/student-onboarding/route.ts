import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/student-onboarding — create onboarding record for a student
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { studentId, enrollmentId } = body;

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  // Check if onboarding already exists for this student
  const existing = await prisma.studentOnboarding.findFirst({
    where: { studentId, completedAt: null },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const onboarding = await prisma.studentOnboarding.create({
    data: { studentId, enrollmentId },
  });

  return NextResponse.json(onboarding, { status: 201 });
}
