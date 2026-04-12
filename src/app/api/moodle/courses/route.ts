import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourses } from "@/lib/moodle/endpoints";

// GET /api/moodle/courses — fetch Moodle courses list for publish modal
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const courses = await getCourses();
    // Filter out site-level course (id=1) and return useful fields
    const filtered = courses
      .filter((c) => c.id !== 1)
      .map((c) => ({
        id: c.id,
        fullname: c.fullname,
        shortname: c.shortname,
        categoryid: c.categoryid,
      }));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching Moodle courses:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת קורסים ממודל" },
      { status: 500 }
    );
  }
}
