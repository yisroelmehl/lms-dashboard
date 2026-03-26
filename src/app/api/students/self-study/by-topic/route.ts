import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEnrolledUsers } from "@/lib/moodle/endpoints";

interface StudentWithActivity {
  selfStudyEnrollmentId: string;
  studentId: string;
  studentName: string;
  topic: string;
  status: string;
  nextExamDate: string | null;
  nextContactDate: string | null;
  examUnits: string | null;
  lastActivityDate: string | null;
  lastActivityType: string | null;
  lastLogin: string | null;
  daysInactive: number;
  contactLogsCount: number;
  completionPercentage: number;
}

interface TopicGroup {
  topic: string;
  students: StudentWithActivity[];
  studentCount: number;
  activeCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any).role?.includes("admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all self-study enrollments with student, course, and contact logs
    const enrollments = await prisma.selfStudyEnrollment.findMany({
      include: {
        student: {
          select: {
            id: true,
            hebrewName: true,
            firstNameOverride: true,
            lastNameOverride: true,
            firstNameMoodle: true,
            lastNameMoodle: true,
            moodleUserId: true,
          },
        },
        course: {
          select: {
            id: true,
            moodleCourseId: true,
            fullNameMoodle: true,
            fullNameOverride: true,
          },
        },
        contactLogs: {
          select: {
            id: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        studyTopic: "asc",
      },
    });

    // Get Moodle user data for last access times
    const moodleUserDataMap = new Map();
    const uniqueCourseIds = [...new Set(enrollments.map((e) => e.course.moodleCourseId))];

    for (const courseId of uniqueCourseIds) {
      if (!courseId) continue;
      try {
        const users = await getEnrolledUsers(courseId);
        users.forEach((user) => {
          moodleUserDataMap.set(`${courseId}-${user.id}`, user);
        });
      } catch (error) {
        console.error(`Failed to get Moodle users for course ${courseId}:`, error);
      }
    }

    // Group by topic and calculate activity data
    const topicMap = new Map<string, StudentWithActivity[]>();

    for (const enrollment of enrollments) {
      const studentName = enrollment.student.hebrewName || 
        [enrollment.student.firstNameOverride, enrollment.student.lastNameOverride].filter(Boolean).join(" ") ||
        [enrollment.student.firstNameMoodle, enrollment.student.lastNameMoodle].filter(Boolean).join(" ") ||
        "אין שם";

      // Get Moodle data
      const moodleKey = `${enrollment.course.moodleCourseId}-${enrollment.student.moodleUserId}`;
      const moodleUser = moodleUserDataMap.get(moodleKey);
      
      const lastLoginDate = moodleUser?.lastaccess
        ? new Date(moodleUser.lastaccess * 1000)
        : null;
      const now = new Date();
      const daysInactive = lastLoginDate
        ? Math.floor((now.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      const lastContactLog = enrollment.contactLogs[0];

      const student: StudentWithActivity = {
        selfStudyEnrollmentId: enrollment.id,
        studentId: enrollment.student.id,
        studentName,
        topic: enrollment.studyTopic || "ללא נושא",
        status: enrollment.status,
        nextExamDate: enrollment.nextExamDate ? enrollment.nextExamDate.toISOString().split("T")[0] : null,
        nextContactDate: enrollment.nextContactDate ? enrollment.nextContactDate.toISOString().split("T")[0] : null,
        examUnits: enrollment.examUnits,
        lastActivityDate: lastContactLog?.createdAt ? lastContactLog.createdAt.toISOString().split("T")[0] : null,
        lastActivityType: "contact_log", // Can be expanded
        lastLogin: lastLoginDate ? lastLoginDate.toISOString().split("T")[0] : null,
        daysInactive,
        contactLogsCount: enrollment.contactLogs.length,
        completionPercentage: 0, // Will be calculated separately if needed
      };

      const topic = enrollment.studyTopic || "ללא נושא";
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(student);
    }

    // Convert to array format
    const topicsData: TopicGroup[] = Array.from(topicMap.entries())
      .map(([topic, students]) => ({
        topic,
        students: students.sort((a, b) => a.studentName.localeCompare(b.studentName)),
        studentCount: students.length,
        activeCount: students.filter((s) => s.daysInactive >= 0 && s.daysInactive <= 7).length,
      }))
      .sort((a, b) => {
        // "ללא נושא" last
        if (a.topic === "ללא נושא") return 1;
        if (b.topic === "ללא נושא") return -1;
        return a.topic.localeCompare(b.topic);
      });

    return NextResponse.json(topicsData);
  } catch (error) {
    console.error("Error fetching self-study students by topic:", error);
    return NextResponse.json(
      { error: "Failed to fetch self-study students" },
      { status: 500 }
    );
  }
}
