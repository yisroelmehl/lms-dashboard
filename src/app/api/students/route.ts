import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { firstName, lastName, email, phone } = body;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "שם פרטי, שם משפחה ואימייל הם שדות חובה" },
        { status: 400 }
      );
    }

    // Check if a student with this email already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { emailMoodle: { equals: email, mode: "insensitive" } },
          { emailOverride: { equals: email, mode: "insensitive" } },
        ],
      },
    });

    if (existingStudent) {
      return NextResponse.json(
        { error: "תלמיד עם אימייל זה כבר קיים במערכת" },
        { status: 400 }
      );
    }

    // Create the new student
    const newStudent = await prisma.student.create({
      data: {
        firstNameOverride: firstName,
        lastNameOverride: lastName,
        emailOverride: email,
        phoneOverride: phone || null,
        firstNameSource: "manual",
        lastNameSource: "manual",
        emailSource: "manual",
        phoneSource: "manual",
        hebrewName: `${firstName} ${lastName}`,
      },
    });

    return NextResponse.json({ success: true, student: newStudent });
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "שגיאה ביצירת תלמיד חדש" },
      { status: 500 }
    );
  }
}
