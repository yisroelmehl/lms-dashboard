import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.student.update({
      where: { id },
      data: {
        sector: body.sector,
        studyLevel: body.studyLevel,
        engagementLevel: body.engagementLevel,
        paymentStatus: body.paymentStatus,
        monthlyPayment: body.monthlyPayment ? parseFloat(body.monthlyPayment) : null,
        paymentNotes: body.paymentNotes,
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error("Error updating student classification:", error);
    return NextResponse.json(
      { error: "Failed to update classification" },
      { status: 500 }
    );
  }
}
