import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const lecturer = await prisma.lecturer.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        baseRatePerLesson: body.baseRatePerLesson,
        bonusRate: body.bonusRate,
      }
    });
    
    return NextResponse.json(lecturer);
  } catch (error) {
    console.error("Failed to update lecturer:", error);
    return NextResponse.json({ error: "Failed to update lecturer" }, { status: 500 });
  }
}
