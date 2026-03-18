import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callMoodleApi } from "@/lib/moodle/client";
import type { MoodleActivityCompletion } from "@/lib/moodle/types";

export const dynamic = "force-dynamic";

// Activity types that represent a "lesson" (zoom session or recording)
const LESSON_ACTIVITY_TYPES = ["bigbluebuttonbn", "url", "page", "lesson", "scorm", "hvac", "h5pactivity"];
const LESSON_NAME_KEYWORDS = ["זום", "zoom", "שיעור", "הקלטה", "מפגש", "וידאו", "video", "lesson", "recording", "live", "חי"];

// Activity types that represent a real exam/quiz
const EXAM_ACTIVITY_TYPES = ["quiz", "assign"];
const EXAM_NAME_KEYWORDS = ["מבחן", "בחינה", "בחן", "exam", "test", "quiz", "מועד", "סיכום"];

// Keywords that suggest it's NOT a real graded exam (study assignment)
const NOT_EXAM_KEYWORDS = ["תרגיל", "תרגול", "משוב", "practice", "exercise", "feedback", "draft", "טיוטה", "ניסיון", "שאלון הכנה", "שאלון היכרות", "שאלון כניסה"];

interface MoodleCourseModule {
  id: number;
  name: string;
  modname: string;
  instance: number;
  visible: number;
  completion: number; // 0=none, 1=manual, 2=auto
  completiondata?: {
    state: number;
    timecompleted: number;
  };
}

interface MoodleCourseSection {
  id: number;
  name: string;
  modules: MoodleCourseModule[];
}

interface ActivityItem {
  cmid: number;
  name: string;
  modname: string;
  type: "lesson" | "exam" | "assignment" | "other";
  isRealExam: boolean;
  completed: boolean;
  completedAt: number | null;
  grade?: number | null;
  gradeMax?: number | null;
  gradePercentage?: number | null;
}

interface CourseAcademicData {
  courseId: string;
  courseName: string;
  moodleCourseId: number;
  activities: ActivityItem[];
  lessonCount: number;
  lessonCompleted: number;
  examCount: number;
  examCompleted: number;
}

function classifyActivity(name: string, modname: string): { type: ActivityItem["type"]; isRealExam: boolean } {
  const lowerName = name.toLowerCase();

  // Check if it's a lesson type
  const isLessonType = LESSON_ACTIVITY_TYPES.includes(modname);
  const hasLessonKeyword = LESSON_NAME_KEYWORDS.some((k) => lowerName.includes(k.toLowerCase()));

  if (isLessonType || hasLessonKeyword) {
    return { type: "lesson", isRealExam: false };
  }

  // Check if it's an exam/quiz type
  const isExamType = EXAM_ACTIVITY_TYPES.includes(modname);
  const hasExamKeyword = EXAM_NAME_KEYWORDS.some((k) => lowerName.includes(k.toLowerCase()));

  if (isExamType || hasExamKeyword) {
    // Check if it's actually just a study exercise
    const isNotRealExam = NOT_EXAM_KEYWORDS.some((k) => lowerName.includes(k.toLowerCase()));
    return { type: "exam", isRealExam: !isNotRealExam };
  }

  // Assignments
  if (modname === "assign") {
    return { type: "assignment", isRealExam: false };
  }

  return { type: "other", isRealExam: false };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: { course: true },
        where: { course: { moodleCourseId: { not: null } } },
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  if (!student.moodleUserId) {
    return NextResponse.json({ courses: [] });
  }

  const results: CourseAcademicData[] = [];

  for (const enrollment of student.enrollments) {
    const course = enrollment.course;
    if (!course.moodleCourseId) continue;

    let sections: MoodleCourseSection[] = [];
    let completionStatuses: MoodleActivityCompletion[] = [];
    let gradeItems: Record<number, { grade: number | null; gradeMax: number | null; percentage: number | null }> = {};

    try {
      // Get course contents with completion data
      sections = await callMoodleApi<MoodleCourseSection[]>(
        "core_course_get_contents",
        {
          courseid: course.moodleCourseId,
          "options[0][name]": "includestealthmodules",
          "options[0][value]": 0,
        }
      );
    } catch {
      // Skip if API fails for this course
      continue;
    }

    try {
      // Get completion status for all activities
      const completionResp = await callMoodleApi<{ statuses: MoodleActivityCompletion[] }>(
        "core_completion_get_activities_completion_status",
        {
          courseid: course.moodleCourseId,
          userid: student.moodleUserId,
        }
      );
      completionStatuses = completionResp.statuses || [];
    } catch {
      // Continue without completion data
    }

    try {
      // Get grades
      const gradesResp = await callMoodleApi<{
        usergrades: {
          gradeitems: {
            id: number;
            cmid?: number;
            graderaw?: number;
            grademin: number;
            grademax: number;
            percentageformatted?: string;
          }[];
        }[];
      }>("gradereport_user_get_grade_items", {
        courseid: course.moodleCourseId,
        userid: student.moodleUserId,
      });

      const gradeItemsList = gradesResp.usergrades?.[0]?.gradeitems || [];
      for (const item of gradeItemsList) {
        if (item.cmid) {
          const pct = item.percentageformatted
            ? parseFloat(item.percentageformatted.replace("%", "").replace(",", "."))
            : null;
          gradeItems[item.cmid] = {
            grade: item.graderaw ?? null,
            gradeMax: item.grademax ?? null,
            percentage: isNaN(pct as number) ? null : pct,
          };
        }
      }
    } catch {
      // Continue without grades
    }

    // Build completion map
    const completionMap = new Map<number, MoodleActivityCompletion>();
    for (const cs of completionStatuses) {
      completionMap.set(cs.cmid, cs);
    }

    // Flatten all modules from sections
    const activities: ActivityItem[] = [];
    for (const section of sections) {
      for (const mod of section.modules || []) {
        if (mod.visible === 0) continue; // skip hidden modules
        if (mod.completion === 0) continue; // skip activities with no completion tracking

        const { type, isRealExam } = classifyActivity(mod.name, mod.modname);
        const completion = completionMap.get(mod.id);
        const completed = completion ? completion.state >= 1 : false;
        const gradeData = gradeItems[mod.id];

        activities.push({
          cmid: mod.id,
          name: mod.name,
          modname: mod.modname,
          type,
          isRealExam,
          completed,
          completedAt: completion?.timecompleted || null,
          grade: gradeData?.grade ?? null,
          gradeMax: gradeData?.gradeMax ?? null,
          gradePercentage: gradeData?.percentage ?? null,
        });
      }
    }

    const lessons = activities.filter((a) => a.type === "lesson");
    const exams = activities.filter((a) => a.type === "exam" && a.isRealExam);

    results.push({
      courseId: course.id,
      courseName:
        course.fullNameOverride || course.fullNameMoodle || "קורס ללא שם",
      moodleCourseId: course.moodleCourseId,
      activities,
      lessonCount: lessons.length,
      lessonCompleted: lessons.filter((l) => l.completed).length,
      examCount: exams.length,
      examCompleted: exams.filter((e) => e.completed).length,
    });
  }

  return NextResponse.json({ courses: results });
}
