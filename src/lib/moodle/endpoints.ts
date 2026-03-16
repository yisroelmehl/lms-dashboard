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
