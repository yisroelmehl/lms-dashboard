"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GradeDistribution } from "@/components/exams/grade-distribution";

export default function ReportPage() {
  const params = useParams();
  const examId = params.id as string;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exams/${examId}/report`)
      .then((res) => res.json())
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!report || !report.exam) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        דוח לא נמצא
      </div>
    );
  }

  const courseName =
    report.exam.course?.fullNameOverride ||
    report.exam.course?.fullNameMoodle ||
    "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">דוח ציונים - {report.exam.title}</h1>
          <p className="text-muted-foreground mt-1">
            {report.exam.type === "exam" ? "מבחן" : "מטלה"} | {courseName}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/exams/${examId}`}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
          >
            חזרה למבחן
          </Link>
          <Link
            href={`/exams/${examId}/grade`}
            className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:bg-muted"
          >
            בדיקה
          </Link>
        </div>
      </div>

      {/* Stats & Distribution */}
      <GradeDistribution
        stats={report.stats}
        questionStats={report.questionStats}
      />

      {/* Student Breakdown Table */}
      {report.submissions && report.submissions.length > 0 && (
        <div className="rounded-lg border border-border bg-card">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-medium">פירוט לפי תלמידים</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-2 text-right font-medium">#</th>
                <th className="px-4 py-2 text-right font-medium">שם</th>
                <th className="px-4 py-2 text-right font-medium">ציון</th>
                <th className="px-4 py-2 text-right font-medium">אחוז</th>
                <th className="px-4 py-2 text-right font-medium">משוב כללי</th>
              </tr>
            </thead>
            <tbody>
              {report.submissions.map((sub: any, i: number) => {
                const name = sub.student
                  ? `${sub.student.firstNameOverride || sub.student.firstNameMoodle || ""} ${sub.student.lastNameOverride || sub.student.lastNameMoodle || ""}`.trim()
                  : sub.studentName || "לא זוהה";
                const pct =
                  sub.grade !== null && sub.maxGrade
                    ? ((sub.grade / sub.maxGrade) * 100).toFixed(0)
                    : "-";

                return (
                  <tr
                    key={sub.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-2 text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="px-4 py-2 font-medium">{name}</td>
                    <td className="px-4 py-2">
                      {sub.grade !== null
                        ? `${sub.grade}/${sub.maxGrade}`
                        : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          Number(pct) >= 56
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        {pct}%
                      </span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs truncate">
                      {sub.feedback?.overall || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
