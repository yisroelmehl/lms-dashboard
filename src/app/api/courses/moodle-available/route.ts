import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCourses } from "@/lib/moodle/endpoints";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all courses from Moodle
    const moodleCourses = await getCourses();

    // Get already-imported Moodle course IDs
    const imported = await prisma.course.findMany({
      where: { moodleCourseId: { not: null } },
      select: { moodleCourseId: true },
    });
    const importedIds = new Set(imported.map((c) => c.moodleCourseId));

    // Filter: remove site-level course (id=1) and already-imported ones
    const available = moodleCourses
      .filter((mc) => mc.id !== 1 && !importedIds.has(mc.id))
      .map((mc) => ({
        id: mc.id,
        fullname: mc.fullname,
        shortname: mc.shortname,
        categoryid: mc.categoryid,
        startdate: mc.startdate,
        enddate: mc.enddate,
        visible: mc.visible,
      }));

    // Also return already-imported for reference
    const alreadyImported = moodleCourses
      .filter((mc) => mc.id !== 1 && importedIds.has(mc.id))
      .map((mc) => ({
        id: mc.id,
        fullname: mc.fullname,
        shortname: mc.shortname,
      }));

    return NextResponse.json({ available, alreadyImported });
  } catch (error) {
    console.error("Error fetching Moodle courses:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת קורסים מהמודל" },
      { status: 500 }
    );
  }
}
