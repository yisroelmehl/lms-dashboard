import { callMoodleApi } from "./client";
import type {
  MoodleCourse,
  MoodleUser,
  MoodleCompletionResponse,
  MoodleGradesTableResponse,
  MoodleCalendarResponse,
  MoodleQuizAttempt,
} from "./types";

export async function getCourses(): Promise<MoodleCourse[]> {
  return callMoodleApi<MoodleCourse[]>("core_course_get_courses");
}

export async function getEnrolledUsers(
  courseId: number,
  onlyActive = true
): Promise<MoodleUser[]> {
  return callMoodleApi<MoodleUser[]>("core_enrol_get_enrolled_users", {
    courseid: courseId,
    ...(onlyActive
      ? { "options[0][name]": "onlyactive", "options[0][value]": 1 }
      : {}),
  });
}

export async function getActivitiesCompletion(
  courseId: number,
  userId: number
): Promise<MoodleCompletionResponse> {
  return callMoodleApi<MoodleCompletionResponse>(
    "core_completion_get_activities_completion_status",
    {
      courseid: courseId,
      userid: userId,
    }
  );
}

export async function getGradesTable(
  courseId: number,
  userId: number
): Promise<MoodleGradesTableResponse> {
  return callMoodleApi<MoodleGradesTableResponse>(
    "gradereport_user_get_grades_table",
    {
      courseid: courseId,
      userid: userId,
    }
  );
}

export async function getQuizAttempts(
  quizId: number,
  userId: number
): Promise<{ attempts: MoodleQuizAttempt[] }> {
  return callMoodleApi<{ attempts: MoodleQuizAttempt[] }>(
    "mod_quiz_get_user_attempts",
    {
      quizid: quizId,
      userid: userId,
      status: "all",
    }
  );
}

export async function getCalendarEvents(options: {
  courseIds?: number[];
  timestart?: number;
  timeend?: number;
}): Promise<MoodleCalendarResponse> {
  const params: Record<string, string | number> = {};

  if (options.courseIds) {
    options.courseIds.forEach((id, i) => {
      params[`events[courseids][${i}]`] = id;
    });
  }

  if (options.timestart) {
    params["options[timestart]"] = options.timestart;
  }
  if (options.timeend) {
    params["options[timeend]"] = options.timeend;
  }

  return callMoodleApi<MoodleCalendarResponse>(
    "core_calendar_get_calendar_events",
    params
  );
}

// === API functions for Auto-Enrollment & User Creation ===

/**
 * Searches Moodle for a user by their email address
 */
export async function getUserByEmail(email: string): Promise<MoodleUser | null> {
  try {
    const result = await callMoodleApi<MoodleUser[]>("core_user_get_users_by_field", {
      field: "email",
      "values[0]": email,
    });
    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Moodle Error (getUserByEmail):", error);
    return null;
  }
}

const USERS_MANAGER_TOKEN = process.env.MOODLE_USER_MANAGER_TOKEN || "349078ea850295700e45ba417a4d216e";

/**
 * Creates a new user in Moodle with the specified details.
 * We use the local_usersmanager plugin's REST API.
 */
export async function createUser(data: {
  username: string;
  password?: string;
  firstname: string;
  lastname: string;
  email: string;
  auth?: string;
}): Promise<number | null> {
  try {
    const result = await callMoodleApi<any>("local_usersmanager_create_user", {
      username: data.username.toLowerCase().trim(),
      password: data.password || "Kalad@2026!",
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email.toLowerCase().trim()
    }, 3, USERS_MANAGER_TOKEN);
    console.log("Moodle createUser (usersmanager) result:", JSON.stringify(result));
    
    // The plugin returns { id: 123, username: '...', success: true, message: '...' }
    if (result && result.success && result.id) {
      return result.id;
    }
    return null;
  } catch (error) {
    console.error("Moodle Error (createUser - usersmanager):", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Enrolls a Moodle user into a specific course.
 * We use the local_usersmanager plugin's REST API.
 * roleid: 5 is typically 'student' in Moodle.
 */
export async function enrolUser(userId: number, courseId: number, roleId = 5): Promise<boolean> {
  try {
    const result = await callMoodleApi<any>("local_usersmanager_enrol_user", {
      userid: userId,
      courseid: courseId,
      roleid: roleId,
    }, 3, USERS_MANAGER_TOKEN);
    console.log("Moodle enrolUser (usersmanager) result:", JSON.stringify(result));
    return true;
  } catch (error) {
    console.error("Moodle Error (enrolUser - usersmanager):", error instanceof Error ? error.message : error);
    return false;
  }
}

// === Course Content & Module Creation ===

export interface MoodleCourseSection {
  id: number;
  name: string;
  section: number;
  summary: string;
  visible: number;
  modules: { id: number; name: string; modname: string; url?: string }[];
}

/**
 * Get all sections (topics/weeks) of a Moodle course
 */
export async function getCourseSections(courseId: number): Promise<MoodleCourseSection[]> {
  return callMoodleApi<MoodleCourseSection[]>("core_course_get_contents", {
    courseid: courseId,
  });
}

/**
 * Create a URL resource in a Moodle course section.
 * This plants an iframe-like link students can click to open our embed page.
 */
export async function createUrlModule(params: {
  courseId: number;
  sectionNum: number;
  name: string;
  url: string;
  description?: string;
}): Promise<{ cmid: number } | null> {
  try {
    // First create the URL module via core_course_create_modules isn't standard.
    // Use core_course_edit_module or local_usersmanager if available.
    // Safest: use core_course_create_modules (Moodle 4.0+) or mod_url approach.
    // We'll use the content creation API:
    const result = await callMoodleApi<{ id: number; cmid: number }[]>(
      "core_course_create_modules",
      {
        "modules[0][course]": params.courseId,
        "modules[0][module]": "url",
        "modules[0][section]": params.sectionNum,
        "modules[0][name]": params.name,
        "modules[0][visible]": 1,
        "modules[0][options][0][name]": "externalurl",
        "modules[0][options][0][value]": params.url,
        ...(params.description
          ? {
              "modules[0][options][1][name]": "intro",
              "modules[0][options][1][value]": params.description,
            }
          : {}),
      }
    );

    if (result && result.length > 0 && result[0].cmid) {
      return { cmid: result[0].cmid };
    }
    return null;
  } catch (error) {
    console.error("Moodle Error (createUrlModule):", error);
    throw error;
  }
}
