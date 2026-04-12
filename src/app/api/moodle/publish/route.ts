import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const SITE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://lms-dashboard-qx2u.onrender.com";
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/moodle/publish — generate embed URL for a syllabus item
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "JWT_SECRET not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { syllabusItemId, courseId, sectionNum } = body;

  if (!syllabusItemId || !courseId) {
    return NextResponse.json(
      { error: "syllabusItemId and courseId are required" },
      { status: 400 }
    );
  }

  const item = await prisma.syllabusItem.findUnique({
    where: { id: syllabusItemId },
    include: { course: true },
  });

  if (!item) {
    return NextResponse.json({ error: "פריט סילבוס לא נמצא" }, { status: 404 });
  }

  if (item.courseId !== courseId) {
    return NextResponse.json({ error: "פריט לא שייך לקורס" }, { status: 400 });
  }

  if (item.publishedToMoodle) {
    return NextResponse.json(
      { error: "פריט זה כבר פורסם למודל" },
      { status: 400 }
    );
  }

  const moodleCourseId = item.course.moodleCourseId;

  // Generate a unique embed token for this syllabus item
  const embedToken = crypto.randomUUID();

  // Build the embed URL
  const embedUrl = `${SITE_URL}/embed/assignment/${syllabusItemId}?et=${embedToken}`;

  try {
    // Update the syllabus item — mark as published with embed URL
    await prisma.syllabusItem.update({
      where: { id: syllabusItemId },
      data: {
        publishedToMoodle: true,
        moodlePublishedCourseId: moodleCourseId,
        moodlePublishedAt: new Date(),
        embedToken,
      },
    });

    return NextResponse.json({
      success: true,
      embedUrl,
    });
  } catch (error) {
    console.error("Error publishing to Moodle:", error);
    return NextResponse.json(
      { error: "שגיאה בפרסום למודל" },
      { status: 500 }
    );
  }
}
