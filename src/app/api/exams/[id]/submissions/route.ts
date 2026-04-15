import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractTextFromBuffer,
  extractTextFromImage,
} from "@/lib/services/text-extraction";

// GET - list submissions for an exam
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const submissions = await prisma.examSubmission.findMany({
    where: { examTemplateId: id },
    include: {
      student: {
        select: {
          id: true,
          firstNameMoodle: true,
          firstNameOverride: true,
          lastNameMoodle: true,
          lastNameOverride: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(submissions);
}

// POST - upload student exam files (multi-file)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Verify exam exists
    const exam = await prisma.examTemplate.findUnique({ where: { id } });
    if (!exam) {
      return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "לא נבחרו קבצים" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const arrBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      const fileName = file.name;
      const mimeType = file.type;

      // Determine file type
      let fileType = "pdf";
      if (mimeType.startsWith("image/")) fileType = "image";
      else if (fileName.endsWith(".docx")) fileType = "docx";

      // Extract text
      let extractedText = "";
      try {
        if (fileType === "image") {
          extractedText = await extractTextFromImage(buffer, mimeType);
        } else {
          extractedText = await extractTextFromBuffer(buffer, fileName);
        }
      } catch (e: any) {
        console.error(`[Submission] Text extraction failed for ${fileName}:`, e.message);
      }

      // Try to find student name in the first few lines of extracted text
      const studentName = extractStudentName(extractedText);

      // Try to auto-match student
      let studentId: string | null = null;
      if (studentName) {
        const matched = await tryMatchStudent(studentName, exam.courseId);
        if (matched) studentId = matched;
      }

      const submission = await prisma.examSubmission.create({
        data: {
          examTemplateId: id,
          fileName,
          fileType,
          fileData: buffer,
          extractedText,
          studentName,
          studentId,
          maxGrade: exam.totalPoints || 100,
        },
        include: {
          student: {
            select: {
              id: true,
              firstNameMoodle: true,
              firstNameOverride: true,
              lastNameMoodle: true,
              lastNameOverride: true,
            },
          },
        },
      });

      // Don't return fileData in response
      const { fileData, ...rest } = submission;
      results.push(rest);
    }

    return NextResponse.json({ success: true, submissions: results }, { status: 201 });
  } catch (error: any) {
    console.error("[Submissions POST]", error);
    return NextResponse.json(
      { error: "שגיאה בהעלאת קבצים: " + (error.message || "תקלה") },
      { status: 500 }
    );
  }
}

/**
 * Try to extract student name from the first lines of text.
 * Looks for patterns like "שם: ...", "שם התלמיד: ...", "Name: ..."
 */
function extractStudentName(text: string): string | null {
  if (!text) return null;

  const lines = text.split("\n").slice(0, 10);
  for (const line of lines) {
    const nameMatch = line.match(
      /(?:שם(?:\s*(?:התלמיד|הנבחן|הסטודנט))?|name)\s*[:\-]\s*(.+)/i
    );
    if (nameMatch) {
      return nameMatch[1].trim().substring(0, 100);
    }
  }
  return null;
}

/**
 * Try to match a student name to an existing student in the course.
 */
async function tryMatchStudent(
  name: string,
  courseId: string
): Promise<string | null> {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      student: {
        select: {
          id: true,
          firstNameMoodle: true,
          firstNameOverride: true,
          lastNameMoodle: true,
          lastNameOverride: true,
        },
      },
    },
  });

  const normalizedName = name.trim().toLowerCase();

  for (const e of enrollments) {
    const s = e.student;
    const firstName = (s.firstNameOverride || s.firstNameMoodle || "").toLowerCase();
    const lastName = (s.lastNameOverride || s.lastNameMoodle || "").toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim();

    if (
      fullName === normalizedName ||
      normalizedName.includes(firstName) && normalizedName.includes(lastName)
    ) {
      return s.id;
    }
  }

  return null;
}
