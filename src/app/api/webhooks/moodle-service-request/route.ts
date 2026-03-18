import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Expected payload from Moodle webhook
    const {
      student_id, // Moodle user ID
      student_email,
      student_name,
      title,
      description,
      request_type, // new_shipment, study_partner, exam_retake, material_request, schedule_change, other
      webhook_secret, // For security validation
    } = body;

    // Validate webhook secret (set this in env variables)
    const expectedSecret = process.env.MOODLE_WEBHOOK_SECRET;
    if (!expectedSecret || webhook_secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    // Find or create the student using Moodle ID
    let student = await prisma.student.findFirst({
      where: { moodleUserId: parseInt(student_id) },
    });

    if (!student) {
      // Create a new student with Moodle data if doesn't exist
      student = await prisma.student.create({
        data: {
          moodleUserId: parseInt(student_id),
          emailMoodle: student_email,
          firstNameMoodle: student_name.split(" ")[0] || "",
          lastNameMoodle: student_name.split(" ").slice(1).join(" ") || "",
          emailSource: "moodle",
          firstNameSource: "moodle",
          lastNameSource: "moodle",
        },
      });
    }

    // Validate request type
    const validTypes = [
      "new_shipment",
      "study_partner",
      "exam_retake",
      "material_request",
      "schedule_change",
      "other",
    ];
    const type = validTypes.includes(request_type)
      ? request_type
      : "other";

    // Create the service request
    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        studentId: student.id,
        title,
        type,
        description,
        status: "open",
        source: "moodle_webhook", // Track where it came from
      },
      include: {
        student: true,
      },
    });

    // TODO: Send email notification to admins
    // await sendAdminNotification(serviceRequest);

    return NextResponse.json(
      {
        success: true,
        request_id: serviceRequest.id,
        message: "Service request created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing service request webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Service request webhook endpoint is running",
  });
}
