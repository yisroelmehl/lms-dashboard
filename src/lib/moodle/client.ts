import type { MoodleError } from "./types";

const MOODLE_BASE_URL = process.env.MOODLE_BASE_URL;
const MOODLE_TOKEN = process.env.MOODLE_TOKEN;

export class MoodleApiError extends Error {
  constructor(
    public errorcode: string,
    message: string
  ) {
    super(message);
    this.name = "MoodleApiError";
  }
}

/**
 * Call a Moodle Web Service REST API function
 */
export async function callMoodleApi<T>(
  wsfunction: string,
  params: Record<string, string | number | boolean> = {},
  retries = 3
): Promise<T> {
  if (!MOODLE_BASE_URL || !MOODLE_TOKEN) {
    throw new Error(
      "MOODLE_BASE_URL and MOODLE_TOKEN must be set in environment"
    );
  }

  const url = new URL("/webservice/rest/server.php", MOODLE_BASE_URL);
  const body = new URLSearchParams({
    wstoken: MOODLE_TOKEN,
    wsfunction,
    moodlewsrestformat: "json",
  });

  for (const [key, value] of Object.entries(params)) {
    body.append(key, String(value));
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Moodle returns error objects in the response body
      if (data && typeof data === "object" && "exception" in data) {
        const err = data as MoodleError;
        throw new MoodleApiError(err.errorcode, err.message);
      }

      return data as T;
    } catch (error) {
      // Don't retry Moodle API errors (invalid params, no permission, etc.)
      if (error instanceof MoodleApiError) throw error;
      if (attempt === retries) throw error;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }

  throw new Error("Unreachable");
}

/**
 * Test the Moodle connection
 */
export async function testMoodleConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const info = await callMoodleApi<{ sitename: string; release: string }>(
      "core_webservice_get_site_info"
    );
    return {
      success: true,
      message: `Connected to ${info.sitename} (Moodle ${info.release})`,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
