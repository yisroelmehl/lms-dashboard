"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SubmissionUpload } from "@/components/exams/submission-upload";
import { SubmissionList } from "@/components/exams/submission-list";

interface ExamData {
  id: string;
  title: string;
  type: string;
  status: string;
  totalPoints: number | null;
  course: {
    id: string;
    fullNameMoodle: string | null;
    fullNameOverride: string | null;
    driveFolderId: string | null;
  };
  submissions: any[];
}

export default function GradePage() {
  const params = useParams();
  const examId = params.id as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [courseStudents, setCourseStudents] = useState<
    { id: string; name: string }[]
  >([]);

  const loadExam = useCallback(async () => {
    try {
      const res = await fetch(`/api/exams/${examId}`);
      if (res.ok) {
        const data = await res.json();
        setExam(data);

        // Load course students for matching
        if (data.course?.id) {
          const studRes = await fetch(
            `/api/students?courseId=${data.course.id}`
          );
          if (studRes.ok) {
            const students = await studRes.json();
            setCourseStudents(
              students.map((s: any) => ({
                id: s.id,
                name: `${s.firstNameOverride || s.firstNameMoodle || ""} ${s.lastNameOverride || s.lastNameMoodle || ""}`.trim(),
              }))
            );
          }
        }
      }
    } catch (e) {
      console.error("Failed to load exam:", e);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        מבחן לא נמצא
      </div>
    );
  }

  const courseName =
    exam.course.fullNameOverride || exam.course.fullNameMoodle || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">בדיקת מבחנים - {exam.title}</h1>
          <p className="text-muted-foreground mt-1">{courseName}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/exams/${examId}`}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
          >
            חזרה למבחן
          </Link>
          {exam.submissions.length > 0 && (
            <Link
              href={`/exams/${examId}/report`}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              דוח ציונים
            </Link>
          )}
        </div>
      </div>

      {/* Upload Section */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">העלאת מבחנים לבדיקה</h2>
        <p className="text-sm text-muted-foreground mb-4">
          העלה קבצי מבחנים של תלמידים (PDF, Word או תמונות). המערכת תחלץ את
          הטקסט ותנסה לזהות את שם התלמיד אוטומטית.
        </p>
        <SubmissionUpload examId={examId} onUploaded={loadExam} />
      </div>

      {/* Submissions List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          הגשות ({exam.submissions.length})
        </h2>
        <SubmissionList
          submissions={exam.submissions}
          examId={examId}
          courseStudents={courseStudents}
          onRefresh={loadExam}
        />
      </div>
    </div>
  );
}
