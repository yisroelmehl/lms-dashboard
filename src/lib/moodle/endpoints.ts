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

/**
 * Creates a new user in Moodle with the specified details.
 * Uses the standard core_user_create_users Moodle API.
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
    const params: Record<string, string | number> = {
      "users[0][username]": data.username.toLowerCase().trim(),
      "users[0][password]": data.password || "Kalad@2026!",
      "users[0][firstname]": data.firstname,
      "users[0][lastname]": data.lastname,
      "users[0][email]": data.email.toLowerCase().trim(),
    };
    
    if (data.auth) {
      params["users[0][auth]"] = data.auth;
    }

    const result = await callMoodleApi<any[]>("core_user_create_users", params);
    console.log("Moodle core_user_create_users result:", JSON.stringify(result));
    
    // Moodle standard API returns an array of created users: [{ id: 123, username: '...' }]
    if (Array.isArray(result) && result.length > 0 && result[0].id) {
      return result[0].id;
    }
    return null;
  } catch (error) {
    console.error("Moodle Error (core_user_create_users):", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Enrolls a Moodle user into a specific course.
 * Uses the standard enrol_manual_enrol_users Moodle API.
 * roleid: 5 is typically 'student' in Moodle.
 */
export async function enrolUser(userId: number, courseId: number, roleId = 5): Promise<boolean> {
  try {
    const result = await callMoodleApi<any>("enrol_manual_enrol_users", {
      "enrolments[0][userid]": userId,
      "enrolments[0][courseid]": courseId,
      "enrolments[0][roleid]": roleId,
    });
    console.log("Moodle enrol_manual_enrol_users result:", JSON.stringify(result));
    // The default enrol API returns null on success
    return true;
  } catch (error) {
    console.error("Moodle Error (enrol_manual_enrol_users):", error instanceof Error ? error.message : error);
    return false;
  }
}
