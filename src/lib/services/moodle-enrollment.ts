import { prisma } from "@/lib/prisma";
import { getUserByEmail, createUser, enrolUser } from "@/lib/moodle/endpoints";

/**
 * Automates creating a Moodle user and enrolling them in the associated course.
 * Uses 'oauth2' as the auth plugin if Moodle is configured for Google / Auth0,
 * but also provisions a generic password 'Kalad@2026!' as a backup for direct login.
 */
export async function autoEnrollStudentInMoodle(paymentLinkId: string) {
  try {
    const link = await prisma.paymentLink.findUnique({
      where: { id: paymentLinkId },
      include: {
        student: true,
        course: true,
      },
    });

    if (!link || !link.student || !link.course || !link.course.moodleCourseId) {
      console.log(`Moodle Auto-Enroll: Skipped. Missing student or course data for link ${paymentLinkId}`);
      return false;
    }

    const { student, course } = link;
    const email = student.emailOverride || link.email || student.emailMoodle;
    const firstName = student.firstNameOverride || link.firstName || student.firstNameMoodle || "תלמיד";
    const lastName = student.lastNameOverride || link.lastName || student.lastNameMoodle || "חדש";

    if (!email) {
      console.warn(`Moodle Auto-Enroll: Skipped. No email found for student ${student.id}`);
      return false;
    }

    console.log(`Moodle Auto-Enroll: Processing student ${email} for course ${course.moodleCourseId}`);

    // 1. Check if user already exists in Moodle
    let moodleUser = await getUserByEmail(email);
    let moodleUserId: number | null = null;

    if (moodleUser) {
      console.log(`Moodle Auto-Enroll: Found existing Moodle user ${moodleUser.id} for ${email}`);
      moodleUserId = moodleUser.id;
    } else {
      // 2. User doesn't exist, create a new one
      console.log(`Moodle Auto-Enroll: Creating new Moodle user for ${email}`);
      moodleUserId = await createUser({
        username: email.toLowerCase(),
        password: "Kalad@2026!", // Generic password
        firstname: firstName,
        lastname: lastName,
        email: email,
        auth: "oauth2" // Can use oauth2 for Google, but password login is enabled in background if allowed by Moodle
      });

      if (!moodleUserId) {
        console.error(`Moodle Auto-Enroll: Failed to create user ${email}`);
        return false;
      }
      console.log(`Moodle Auto-Enroll: Created new Moodle user with ID ${moodleUserId}`);
    }

    if (!moodleUserId) {
      console.error(`Moodle Auto-Enroll: Failed to create or find user ID for ${email}`);
      return false;
    }

    // 3. Enrol the user in the course (Role ID 5 is Student by default)
    console.log(`Moodle Auto-Enroll: Enrolling user ${moodleUserId} into Moodle Course ${course.moodleCourseId}`);
    const enrolled = await enrolUser(moodleUserId as number, course.moodleCourseId as number, 5);

    if (enrolled) {
      // Mark as enrolled in our DB
      await prisma.paymentLink.update({
        where: { id: paymentLinkId },
        data: {
          moodleEnrolled: true,
          moodleEnrolledAt: new Date(),
        },
      });

      // Also mark the general enrollment record if exists
      const enrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, courseId: course.id }
      });
      if (enrollment) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {} // Just touch the record if needed, or remove if no relevant fields exist
        });
      }

      console.log(`Moodle Auto-Enroll: Successfully completed for ${email}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Moodle Auto-Enroll: Unexpected error for link ${paymentLinkId}:`, error);
    return false;
  }
}
