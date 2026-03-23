import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook endpoint for Jotform form submissions
 * POST /api/webhooks/jotform
 * 
 * Receives Terms of Service submissions from Jotform and:
 * 1. Saves submission record in our database
 * 2. Notification email is handled by Jotform or separate system
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    
    // Parse Jotform submission data
    const submissionId = body.get("submissionID") as string;
    const rawData = body.get("rawRequest") as string;
    
    if (!submissionId) {
      return NextResponse.json(
        { error: "Missing submissionID" },
        { status: 400 }
      );
    }

    // Parse the submission answers
    const answers = rawData ? JSON.parse(rawData) : {};
    
    // Extract data from Jotform submission format
    // Questions are indexed (1, 2, 3, etc.)
    const firstName = answers[1]?.answer || "";
    const lastName = answers[2]?.answer || "";
    const email = answers[3]?.answer || "";
    const studentPaymentRef = answers[4]?.answer || ""; // Contains studentId|paymentLinkId
    const courseName = answers[5]?.answer || "";

    // Parse the student ID and payment link ID
    const [studentId, paymentLinkId] = studentPaymentRef.split("|");

    if (!studentId || !email) {
      return NextResponse.json(
        { error: "Missing required fields: student ID, email" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: `Student not found: ${studentId}` },
        { status: 404 }
      );
    }

    // Save submission record in our database
    const submission = await prisma.jotformSubmission.create({
      data: {
        jotformSubmissionId: submissionId,
        studentId: studentId,
        firstName,
        lastName,
        email,
        courseName,
        paymentLinkId: paymentLinkId || undefined,
        jotformLink: `https://www.jotform.com/submission/${submissionId}`,
      },
    });

    console.log(`Jotform submission created for student ${studentId}:`, submission.id);

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      jotformSubmissionId: submissionId,
      message: "Submission received and processed",
    });
  } catch (error) {
    console.error("Jotform webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
