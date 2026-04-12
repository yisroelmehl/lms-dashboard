import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseSections } from "@/lib/moodle/endpoints";

// GET /api/moodle/courses/[courseId]/sections — fetch sections for a Moodle course
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;
  const moodleCourseId = parseInt(courseId);
  if (isNaN(moodleCourseId)) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }

  try {
    const sections = await getCourseSections(moodleCourseId);
    const result = sections.map((s) => ({
      id: s.id,
      section: s.section,
      name: s.name || `שבוע ${s.section}`,
      visible: s.visible,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Moodle course sections:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת נושאים מהקורס" },
      { status: 500 }
    );
  }
}
