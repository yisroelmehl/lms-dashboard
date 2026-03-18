import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { cmid, type, courseId, grade, attended } = await req.json();

    if (!cmid || !type || !courseId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    if (type === "lesson") {
      const existing = await prisma.attendance.findFirst({
        where: { studentId: id, moodleCmId: cmid },
      });
      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            statusOverride: attended ? "present" : "absent",
            statusSource: "manual",
          },
        });
      } else {
        await prisma.attendance.create({
          data: {
            studentId: id,
            courseId,
            date: new Date(),
            statusOverride: attended ? "present" : "absent",
            statusSource: "manual",
            moodleCmId: cmid,
          },
        });
      }
    } else if (type === "exam") {
      // Upsert grade
      const existing = await prisma.grade.findFirst({
        where: { studentId: id, moodleCmId: cmid },
      });
      if (existing) {
        await prisma.grade.update({
          where: { id: existing.id },
          data: {
            scoreOverride: grade,
            maxScore: 100,
            scoreSource: "manual",
          },
        });
      } else {
        await prisma.grade.create({
          data: {
            studentId: id,
            courseId,
            scoreOverride: grade,
            maxScore: 100,
            scoreSource: "manual",
            gradeType: "manual_override",
            moodleCmId: cmid,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving override:", error);
    return NextResponse.json(
      { error: "Failed to save override" },
      { status: 500 }
    );
  }
}
