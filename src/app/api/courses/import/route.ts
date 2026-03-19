import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callMoodleApi } from "@/lib/moodle/client";
import { getEnrolledUsers } from "@/lib/moodle/endpoints";
import type { MoodleCourse, MoodleUser } from "@/lib/moodle/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { moodleCourseIds } = body as { moodleCourseIds: number[] };

    if (!Array.isArray(moodleCourseIds) || moodleCourseIds.length === 0) {
      return NextResponse.json(
        { error: "נדרש לבחור לפחות קורס אחד" },
        { status: 400 }
      );
    }

    // Fetch all courses from Moodle to get details
    const allMoodleCourses = await callMoodleApi<MoodleCourse[]>(
      "core_course_get_courses"
    );
    const coursesMap = new Map(allMoodleCourses.map((c) => [c.id, c]));

    const results = {
      coursesImported: 0,
      studentsImported: 0,
      studentsUpdated: 0,
      enrollmentsCreated: 0,
      groupsCreated: 0,
      errors: [] as string[],
    };

    for (const moodleId of moodleCourseIds) {
      const mc = coursesMap.get(moodleId);
      if (!mc) {
        results.errors.push(`קורס ${moodleId} לא נמצא במודל`);
        continue;
      }

      // Check if already imported
      const existing = await prisma.course.findUnique({
        where: { moodleCourseId: mc.id },
      });

      let courseId: string;

      if (existing) {
        // Update existing course's Moodle data
        await prisma.course.update({
          where: { id: existing.id },
          data: {
            fullNameMoodle: mc.fullname,
            shortNameMoodle: mc.shortname,
            moodleRawData: mc as never,
            lastSyncedAt: new Date(),
          },
        });
        courseId = existing.id;
      } else {
        // Create new course
        const newCourse = await prisma.course.create({
          data: {
            moodleCourseId: mc.id,
            fullNameMoodle: mc.fullname,
            fullNameSource: "moodle",
            shortNameMoodle: mc.shortname,
            shortNameSource: "moodle",
            moodleRawData: mc as never,
            lastSyncedAt: new Date(),
          },
        });
        courseId = newCourse.id;
        results.coursesImported++;
      }

      // Import enrolled students
      let moodleUsers: MoodleUser[];
      try {
        moodleUsers = await getEnrolledUsers(mc.id);
      } catch (error) {
        results.errors.push(
          `שגיאה בטעינת תלמידים לקורס ${mc.fullname}: ${
            error instanceof Error ? error.message : "Unknown"
          }`
        );
        continue;
      }

      for (const mu of moodleUsers) {
        // Skip teachers/managers
        const isTeacher = mu.roles?.some(
          (r) =>
            r.shortname === "editingteacher" ||
            r.shortname === "teacher" ||
            r.shortname === "manager"
        );
        if (isTeacher) continue;

        const existingStudent = await prisma.student.findUnique({
          where: { moodleUserId: mu.id },
        });

        let studentId: string;

        if (existingStudent) {
          await prisma.student.update({
            where: { id: existingStudent.id },
            data: {
              firstNameMoodle: mu.firstname,
              lastNameMoodle: mu.lastname,
              emailMoodle: mu.email,
              phoneMoodle: mu.phone1 || null,
              idNumberMoodle: mu.idnumber || null,
              moodleUsername: mu.username,
              moodleLastAccess: mu.lastaccess
                ? new Date(mu.lastaccess * 1000)
                : null,
              moodleRawData: mu as never,
              lastSyncedAt: new Date(),
            },
          });
          studentId = existingStudent.id;
          results.studentsUpdated++;
        } else {
          const newStudent = await prisma.student.create({
            data: {
              moodleUserId: mu.id,
              firstNameMoodle: mu.firstname,
              firstNameSource: "moodle",
              lastNameMoodle: mu.lastname,
              lastNameSource: "moodle",
              emailMoodle: mu.email,
              emailSource: "moodle",
              phoneMoodle: mu.phone1 || null,
              phoneSource: "moodle",
              idNumberMoodle: mu.idnumber || null,
              idNumberSource: "moodle",
              moodleUsername: mu.username,
              moodleLastAccess: mu.lastaccess
                ? new Date(mu.lastaccess * 1000)
                : null,
              moodleRawData: mu as never,
              lastSyncedAt: new Date(),
            },
          });
          studentId = newStudent.id;
          results.studentsImported++;
        }

        // Upsert enrollment
        const enrollment = await prisma.enrollment.upsert({
          where: {
            studentId_courseId: { studentId, courseId },
          },
          update: {
            statusMoodle: "active",
            lastSyncedAt: new Date(),
          },
          create: {
            studentId,
            courseId,
            statusMoodle: "active",
            statusSource: "moodle",
          },
        });

        results.enrollmentsCreated++;

        // Handle Moodle groups
        if (mu.groups && mu.groups.length > 0) {
          for (const group of mu.groups) {
            const classGroup = await prisma.classGroup.upsert({
              where: { moodleGroupId: group.id },
              update: { name: group.name },
              create: {
                courseId,
                moodleGroupId: group.id,
                name: group.name,
                description: group.description || null,
              },
            });

            await prisma.enrollment.update({
              where: { id: enrollment.id },
              data: { classGroupId: classGroup.id },
            });

            results.groupsCreated++;
          }
        }
      }

      // Small delay between courses
      if (moodleCourseIds.length > 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error importing courses:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "שגיאה בייבוא קורסים",
      },
      { status: 500 }
    );
  }
}
