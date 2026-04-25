import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCourseSections } from "@/lib/moodle/endpoints";

const MOODLE_BASE = (process.env.MOODLE_URL || process.env.MOODLE_BASE_URL || "").replace(/\/$/, "");

// Modnames considered "Zoom-like" — direct meeting join activities
const ZOOM_LIKE = new Set(["zoom", "bigbluebuttonbn", "jitsi"]);

// Modnames considered "recording-like" — URL/resource pointing to a video
const RECORDING_LIKE = new Set(["url", "resource", "page"]);

interface SyncResult {
  zoomLinked: number;
  recordingLinked: number;
  newLessonsCreated: number;
  unmatched: Array<{ name: string; cmid: number; modname: string; reason: string }>;
}

// Heuristic: pick the best URL for a module
function pickModuleUrl(mod: {
  modname: string;
  url?: string;
  contents?: Array<{ fileurl?: string; type?: string }>;
}): string | null {
  // For url/resource activities Moodle provides the real URL in contents[].fileurl
  if (RECORDING_LIKE.has(mod.modname) && Array.isArray(mod.contents)) {
    const fileEntry = mod.contents.find(c => c.fileurl);
    if (fileEntry?.fileurl) return fileEntry.fileurl;
  }
  // Fallback to module's view URL (Moodle redirect page)
  return mod.url || null;
}

// Convert moodle's pluginfile/webservice fileurls to clean URLs (strip token)
function cleanFileUrl(raw: string): string {
  return raw.replace(/[?&]token=[^&]+/, "").replace(/[?&]forcedownload=1/, "");
}

// POST /api/courses/:id/sync-media
// Pulls all activities from Moodle, matches Zoom + recording URLs to syllabus.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, moodleCourseId: true },
  });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  if (!course.moodleCourseId) {
    return NextResponse.json({ error: "הקורס לא מקושר ל-Moodle" }, { status: 400 });
  }

  let sections: Awaited<ReturnType<typeof getCourseSections>>;
  try {
    sections = await getCourseSections(course.moodleCourseId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Moodle API failed" },
      { status: 502 }
    );
  }

  const existing = await prisma.syllabusItem.findMany({
    where: { courseId },
    select: { id: true, moodleCmId: true, title: true },
  });
  const byCmid = new Map(existing.filter(s => s.moodleCmId).map(s => [s.moodleCmId!, s]));
  const byTitle = new Map(existing.map(s => [s.title.trim(), s]));

  const result: SyncResult = {
    zoomLinked: 0,
    recordingLinked: 0,
    newLessonsCreated: 0,
    unmatched: [],
  };

  for (const section of sections) {
    if (!Array.isArray(section.modules)) continue;
    for (const mod of section.modules) {
      const isZoom = ZOOM_LIKE.has(mod.modname);
      const isRecording = RECORDING_LIKE.has(mod.modname);
      if (!isZoom && !isRecording) continue;

      // Find or create a SyllabusItem
      let item = byCmid.get(mod.id) || byTitle.get(mod.name.trim()) || null;
      if (!item) {
        // Create a new lesson — only if it looks meaningful
        const created = await prisma.syllabusItem.create({
          data: {
            courseId,
            title: mod.name,
            type: "lesson",
            moodleCmId: mod.id,
            moodleActivityType: mod.modname,
            isMapped: true,
            sortOrder: result.newLessonsCreated * 10 + 9000,
          },
        });
        item = { id: created.id, moodleCmId: mod.id, title: mod.name };
        byCmid.set(mod.id, item);
        result.newLessonsCreated++;
      }

      // Build the right URL
      if (isZoom) {
        // Zoom plugins don't expose join URL via core API; deep-link the
        // Moodle activity (Moodle session redirects to Zoom join).
        const zoomUrl = mod.url || (MOODLE_BASE ? `${MOODLE_BASE}/mod/${mod.modname}/view.php?id=${mod.id}` : null);
        if (zoomUrl) {
          await prisma.syllabusItem.update({
            where: { id: item.id },
            data: {
              zoomJoinUrl: zoomUrl,
              moodleCmId: mod.id,
              moodleActivityType: mod.modname,
              isMapped: true,
            },
          });
          result.zoomLinked++;
        } else {
          result.unmatched.push({ name: mod.name, cmid: mod.id, modname: mod.modname, reason: "no URL" });
        }
      } else {
        // Recording / URL resource
        const recordingUrl = pickModuleUrl(mod);
        if (recordingUrl) {
          await prisma.syllabusItem.update({
            where: { id: item.id },
            data: {
              recordingUrl: cleanFileUrl(recordingUrl),
              moodleCmId: mod.id,
              moodleActivityType: mod.modname,
              isMapped: true,
            },
          });
          result.recordingLinked++;
        } else {
          result.unmatched.push({ name: mod.name, cmid: mod.id, modname: mod.modname, reason: "no URL" });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
