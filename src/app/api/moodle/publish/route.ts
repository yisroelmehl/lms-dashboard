import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUrlModule } from "@/lib/moodle/endpoints";
import crypto from "crypto";

const SITE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://lms-dashboard-qx2u.onrender.com";
const JWT_SECRET = process.env.JWT_SECRET;

// POST /api/moodle/publish — plant an activity in a Moodle course
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
  const { syllabusItemId, moodleCourseId, sectionNum } = body;

  if (!syllabusItemId || !moodleCourseId || sectionNum === undefined) {
    return NextResponse.json(
      { error: "syllabusItemId, moodleCourseId, sectionNum are required" },
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

  if (item.publishedToMoodle) {
    return NextResponse.json(
      { error: "פריט זה כבר פורסם למודל" },
      { status: 400 }
    );
  }

  // Generate a unique embed token for this syllabus item
  const embedToken = crypto.randomUUID();

  // Build the embed URL — Moodle will open this in the browser.
  // The student's email will be passed via Moodle's URL parameter substitution.
  // For a URL resource, we use a placeholder that the PHP filter/block replaces,
  // OR we handle auth via the embed page itself.
  const embedUrl = `${SITE_URL}/embed/assignment/${syllabusItemId}?et=${embedToken}`;

  try {
    const typeLabel =
      item.type === "exam" ? "מבחן" :
      item.type === "assignment" ? "מטלה" :
      item.type === "quiz" ? "בוחן" :
      item.type;

    const result = await createUrlModule({
      courseId: moodleCourseId,
      sectionNum,
      name: `${typeLabel}: ${item.title}`,
      url: embedUrl,
      description: item.description || undefined,
    });

    if (!result) {
      return NextResponse.json(
        { error: "לא הצלחנו ליצור פעילות במודל" },
        { status: 500 }
      );
    }

    // Update the syllabus item
    await prisma.syllabusItem.update({
      where: { id: syllabusItemId },
      data: {
        publishedToMoodle: true,
        moodleCmId: result.cmid,
        moodlePublishedCourseId: moodleCourseId,
        moodlePublishedAt: new Date(),
        embedToken,
      },
    });

    return NextResponse.json({
      success: true,
      cmid: result.cmid,
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
