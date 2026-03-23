/**
 * Jotform Integration Service
 * Handles submission of Terms of Service to Jotform
 * Form ID: 260815688691471
 */

const JOTFORM_API_KEY = "6add91bbde9eab5c42afc85d52c66c03";
const JOTFORM_FORM_ID = "260815688691471";
const JOTFORM_API_URL = "https://api.jotform.com";

export interface JotformSubmissionData {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  courseId?: string | null;
  courseName?: string | null;
  paymentLinkId: string;
}

/**
 * Submit student Terms of Service agreement to Jotform
 * This creates a record in Jotform and stores it in our database
 */
export async function submitToJotform(data: JotformSubmissionData) {
  try {
    const submissionData = {
      // Map to Jotform question IDs (these are generated when questions are added)
      // For now, we'll use a simple approach and update form structure if needed
      [`submission[1]`]: data.firstName, // First Name
      [`submission[2]`]: data.lastName, // Last Name
      [`submission[3]`]: data.email, // Email
      [`submission[4]`]: `${data.studentId}|${data.paymentLinkId}`, // Student ID and Payment Link ID (stored as reference)
      [`submission[5]`]: data.courseName || "", // Course Name (optional)
    };

    const formData = new URLSearchParams();
    formData.append("apiKey", JOTFORM_API_KEY);
    Object.entries(submissionData).forEach(([key, value]) => {
      formData.append(key, String(value));
    });

    const response = await fetch(`${JOTFORM_API_URL}/form/${JOTFORM_FORM_ID}/submissions`, {
      method: "POST",
      body: formData,
    });

    const result = await response.json() as any;

    if (result.responseCode === 200) {
      const submissionId = result.content?.id;
      return {
        success: true,
        submissionId,
        jotformSubmissionId: submissionId,
        message: "Successfully submitted to Jotform",
      };
    } else {
      return {
        success: false,
        error: result.message || "Failed to submit to Jotform",
      };
    }
  } catch (error) {
    console.error("Jotform submission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get form details to retrieve question IDs
 * Useful for debugging question structure
 */
export async function getFormDetails() {
  try {
    const response = await fetch(
      `${JOTFORM_API_URL}/form/${JOTFORM_FORM_ID}?apiKey=${JOTFORM_API_KEY}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching form details:", error);
    throw error;
  }
}

/**
 * Get form questions to map question IDs
 * This helps us understand the structure of the form
 */
export async function getFormQuestions() {
  try {
    const response = await fetch(
      `${JOTFORM_API_URL}/form/${JOTFORM_FORM_ID}/questions?apiKey=${JOTFORM_API_KEY}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching form questions:", error);
    throw error;
  }
}

/**
 * Get all submissions to the form
 * Useful for syncing data
 */
export async function getFormSubmissions(limit = 50, offset = 0) {
  try {
    const response = await fetch(
      `${JOTFORM_API_URL}/form/${JOTFORM_FORM_ID}/submissions?apiKey=${JOTFORM_API_KEY}&limit=${limit}&offset=${offset}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    throw error;
  }
}

/**
 * Get a specific submission
 */
export async function getSubmission(submissionId: string) {
  try {
    const response = await fetch(
      `${JOTFORM_API_URL}/submission/${submissionId}?apiKey=${JOTFORM_API_KEY}`
    );
    return await response.json();
  } catch (error) {
    console.error("Error fetching submission:", error);
    throw error;
  }
}
