import { prisma } from "@/lib/prisma";
import { getCourses, getEnrolledUsers } from "./endpoints";
import type { MoodleCourse, MoodleUser } from "./types";

type SyncType = "full" | "courses" | "students" | "grades" | "completion" | "calendar";

interface SyncResult {
  syncLogId: string;
  status: "completed" | "failed" | "partial";
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: number;
}

/**
 * Main sync orchestrator.
 * Runs sync jobs in sequence, logging everything.
 */
export async function runSync(
  type: SyncType,
  triggeredBy?: string
): Promise<SyncResult> {
  // Check for running sync
  const runningSync = await prisma.syncLog.findFirst({
    where: { status: "running" },
  });

  if (runningSync) {
    throw new Error("A sync is already running. Please wait.");
  }

  // Create sync log
  const syncLog = await prisma.syncLog.create({
    data: {
      syncType: type,
      status: "running",
      triggeredBy: triggeredBy ?? null,
    },
  });

  const result: SyncResult = {
    syncLogId: syncLog.id,
    status: "completed",
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsSkipped: 0,
    errors: 0,
  };

  const errorDetails: string[] = [];

  try {
    if (type === "full" || type === "courses") {
      const courseResult = await syncCourses();
      result.recordsProcessed += courseResult.processed;
      result.recordsCreated += courseResult.created;
      result.recordsUpdated += courseResult.updated;
    }

    if (type === "full" || type === "students") {
      const studentResult = await syncStudents();
      result.recordsProcessed += studentResult.processed;
      result.recordsCreated += studentResult.created;
      result.recordsUpdated += studentResult.updated;
      result.recordsSkipped += studentResult.skipped;
    }

    // Completion and grades sync will be implemented in Phase 4
    // Calendar sync will be implemented in Phase 6
  } catch (error) {
    result.status = "failed";
    result.errors++;
    errorDetails.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  // Update sync log
  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      status: result.status,
      completedAt: new Date(),
      recordsProcessed: result.recordsProcessed,
      recordsCreated: result.recordsCreated,
      recordsUpdated: result.recordsUpdated,
      recordsSkipped: result.recordsSkipped,
      errors: result.errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    },
  });

  return result;
}

async function syncCourses() {
  const moodleCourses = await getCourses();
  let created = 0;
  let updated = 0;

  for (const mc of moodleCourses) {
    // Skip the site-level course (id=1 in most Moodle installs)
    if (mc.id === 1) continue;

    const existing = await prisma.course.findUnique({
      where: { moodleCourseId: mc.id },
    });

    if (existing) {
      await prisma.course.update({
        where: { id: existing.id },
        data: {
          fullNameMoodle: mc.fullname,
          shortNameMoodle: mc.shortname,
          moodleRawData: mc as never,
          lastSyncedAt: new Date(),
        },
      });
      updated++;
    } else {
      await prisma.course.create({
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
      created++;
    }
  }

  return { processed: moodleCourses.length, created, updated };
}

async function syncStudents() {
  const courses = await prisma.course.findMany({
    where: { moodleCourseId: { not: null } },
  });

  let processed = 0;
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const course of courses) {
    if (!course.moodleCourseId) continue;

    let moodleUsers: MoodleUser[];
    try {
      moodleUsers = await getEnrolledUsers(course.moodleCourseId);
    } catch {
      skipped++;
      continue;
    }

    for (const mu of moodleUsers) {
      // Skip users with teacher/manager roles
      const isTeacher = mu.roles?.some(
        (r) =>
          r.shortname === "editingteacher" ||
          r.shortname === "teacher" ||
          r.shortname === "manager"
      );
      if (isTeacher) continue;

      processed++;

      const existingStudent = await prisma.student.findUnique({
        where: { moodleUserId: mu.id },
      });

      if (existingStudent) {
        // Update Moodle fields only, respect overrides
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
        updated++;
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

        // Create enrollment
        await prisma.enrollment.create({
          data: {
            studentId: newStudent.id,
            courseId: course.id,
            statusMoodle: "active",
            statusSource: "moodle",
          },
        });

        created++;
      }

      // Ensure enrollment exists for existing students too
      if (existingStudent) {
        await prisma.enrollment.upsert({
          where: {
            studentId_courseId: {
              studentId: existingStudent.id,
              courseId: course.id,
            },
          },
          update: {
            statusMoodle: "active",
            lastSyncedAt: new Date(),
          },
          create: {
            studentId: existingStudent.id,
            courseId: course.id,
            statusMoodle: "active",
            statusSource: "moodle",
          },
        });
      }

      // Handle group membership
      if (mu.groups && mu.groups.length > 0) {
        for (const group of mu.groups) {
          const classGroup = await prisma.classGroup.upsert({
            where: { moodleGroupId: group.id },
            update: { name: group.name },
            create: {
              courseId: course.id,
              moodleGroupId: group.id,
              name: group.name,
              description: group.description || null,
            },
          });

          const studentId = existingStudent
            ? existingStudent.id
            : (
                await prisma.student.findUnique({
                  where: { moodleUserId: mu.id },
                })
              )?.id;

          if (studentId) {
            await prisma.enrollment.updateMany({
              where: {
                studentId,
                courseId: course.id,
              },
              data: { classGroupId: classGroup.id },
            });
          }
        }
      }
    }

    // Add delay between courses to avoid overwhelming Moodle
    await new Promise((r) => setTimeout(r, 500));
  }

  return { processed, created, updated, skipped };
}
