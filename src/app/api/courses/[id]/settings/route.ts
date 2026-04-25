import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const course = await prisma.course.update({
      where: { id },
      data: {
        dayOfWeek: body.dayOfWeek !== undefined && body.dayOfWeek !== null ? Number(body.dayOfWeek) : null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        hebrewStartDate: body.hebrewStartDate || null,
        hours: body.hours || null,
        mainLecturerId: body.mainLecturerId || null,
        recordingsFolderUrl: body.recordingsFolderUrl !== undefined ? (body.recordingsFolderUrl || null) : undefined,
      }
    });
    
    return NextResponse.json(course);
  } catch (error) {
    console.error("Failed to update course settings:", error);
    return NextResponse.json({ error: "Failed to update course settings" }, { status: 500 });
  }
}
