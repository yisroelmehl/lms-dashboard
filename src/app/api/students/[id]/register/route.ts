import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Update student local fields
    const updated = await prisma.student.update({
      where: { id },
      data: {
        hebrewName: body.hebrewName || student.hebrewName,
        phoneOverride: body.phone || student.phoneOverride,
        city: body.city || student.city,
        address: body.address || student.address,
        torahBackground: body.torahBackground || student.torahBackground,
        smichaBackground: body.smichaBackground || student.smichaBackground,
        studyPreferences: body.studyPreferences || student.studyPreferences,
        hasChavrusa: body.hasChavrusa ?? student.hasChavrusa,
        participationType: body.participationType || student.participationType,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : student.dateOfBirth,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error("Error updating student registration:", error);
    return NextResponse.json(
      { error: "Failed to update registration" },
      { status: 500 }
    );
  }
}
