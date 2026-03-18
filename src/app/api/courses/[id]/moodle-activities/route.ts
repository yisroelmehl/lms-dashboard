import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callMoodleApi } from "@/lib/moodle/client";

interface MoodleCourseModule {
  id: number;
  name: string;
  modname: string;
  instance: number;
  visible: number;
  completion: number;
}

interface MoodleCourseSection {
  id: number;
  name: string;
  modules: MoodleCourseModule[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course || !course.moodleCourseId) {
      return NextResponse.json({ activities: [] }); // Course is not linked to moodle
    }

    // Get course contents from moodle
    const sections = await callMoodleApi<MoodleCourseSection[]>(
      "core_course_get_contents",
      {
        courseid: course.moodleCourseId,
        "options[0][name]": "includestealthmodules",
        "options[0][value]": 0,
      }
    );

    const activities = [];
    for (const section of sections) {
      for (const mod of section.modules || []) {
        if (mod.visible === 0) continue;
        
        activities.push({
          cmid: mod.id,
          name: mod.name,
          modname: mod.modname,
          sectionName: section.name,
        });
      }
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Error fetching moodle activities:", error);
    return NextResponse.json(
      { error: "שגיאה במשיכת פעילויות מהמודל" },
      { status: 500 }
    );
  }
}
