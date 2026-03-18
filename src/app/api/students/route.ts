import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const students = await prisma.student.findMany({
      select: {
        id: true,
        hebrewName: true,
        firstNameMoodle: true,
        firstNameOverride: true,
        lastNameMoodle: true,
        lastNameOverride: true,
      },
      orderBy: [{ hebrewName: "asc" }, { firstNameMoodle: "asc" }],
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ error: "שגיאה בטעינת תלמידים" }, { status: 500 });
  }
}

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
