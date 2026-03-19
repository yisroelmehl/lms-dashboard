import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const body = await req.json();
    const { studentId, syllabusItemId, completed } = body;

    // We'll use upsert to create or update the ActivityCompletion record
    const record = await prisma.activityCompletion.upsert({
      where: {
        studentId_syllabusItemId: {
          studentId,
          syllabusItemId,
        },
      },
      create: {
        studentId,
        syllabusItemId,
        completionStateOverride: completed ? "complete" : "not_started",
        completionStateSource: "manual",
        completedAtOverride: completed ? new Date() : null,
      },
      update: {
        completionStateOverride: completed ? "complete" : "not_started",
        completionStateSource: "manual",
        completedAtOverride: completed ? new Date() : null,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Failed to update activity completion:", error);
    return NextResponse.json(
      { error: "Failed to update completion" },
      { status: 500 }
    );
  }
}
