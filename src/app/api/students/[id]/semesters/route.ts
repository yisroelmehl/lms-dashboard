import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;
    const body = await req.json();
    const { semesterId, enrollmentId, status, joinedAt } = body;

    if (!semesterId || !enrollmentId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.semesterEnrollment.upsert({
      where: {
        studentId_semesterId: {
          studentId,
          semesterId,
        },
      },
      update: {
        status,
        joinedAt: joinedAt ? new Date(joinedAt) : null,
      },
      create: {
        studentId,
        semesterId,
        enrollmentId,
        status,
        joinedAt: joinedAt ? new Date(joinedAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: enrollment });
  } catch (error) {
    console.error("Error updating semester enrollment:", error);
    return NextResponse.json(
      { error: "Failed to update semester enrollment" },
      { status: 500 }
    );
  }
}
