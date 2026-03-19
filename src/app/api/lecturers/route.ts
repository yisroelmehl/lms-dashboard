import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const lecturers = await prisma.lecturer.findMany({
      orderBy: { firstName: "asc" }
    });
    return NextResponse.json(lecturers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch lecturers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const lecturer = await prisma.lecturer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      }
    });
    return NextResponse.json(lecturer);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create lecturer" }, { status: 500 });
  }
}
