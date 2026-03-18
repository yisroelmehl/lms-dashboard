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

    const courses = await prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        fullNameMoodle: true,
        fullNameOverride: true,
        shortNameMoodle: true,
        shortNameOverride: true,
      },
      orderBy: { fullNameMoodle: "asc" },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ error: "שגיאה בטעינת קורסים" }, { status: 500 });
  }
}
