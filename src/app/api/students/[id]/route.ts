import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      hebrewName: true,
      firstNameMoodle: true,
      firstNameOverride: true,
      lastNameMoodle: true,
      lastNameOverride: true,
      emailMoodle: true,
      emailOverride: true,
      phoneMoodle: true,
      phoneOverride: true,
      city: true,
      address: true,
      idNumberMoodle: true,
      idNumberOverride: true,
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  return NextResponse.json(student);
}
