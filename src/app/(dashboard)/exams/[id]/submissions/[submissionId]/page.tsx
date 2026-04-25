"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  questionType: "open" | "multiple_choice" | "true_false" | "fill_in_the_blank";
  points: number;
  options: Array<{ id?: string; text?: string; isCorrect?: boolean }> | null;
  correctAnswer: string | null;
  sortOrder: number;
}

interface PerQ {
  questionId: string;
  score: number;
  max: number;
  feedback?: string;
  auto?: boolean;
  correct?: boolean;
}

interface Submission {
  id: string;
  examTemplateId: string;
  startedAt: string | null;
  submittedAt: string | null;
  answers: Array<{ questionId: string; answer: string }> | null;
  grade: number | null;
  maxGrade: number | null;
  gradingStatus: string;
  aiPerQuestion: PerQ[] | null;
  aiOverallEval: string | null;
  teacherFeedback: string | null;
  reviewedAt: string | null;
  examTemplate: {
    id: string;
    title: string;
    questions: Question[];
  };
  student: {
    id: string;
    firstNameMoodle: string | null; firstNameOverride: string | null;
    lastNameMoodle: string | null; lastNameOverride: string | null;
    emailMoodle: string | null; emailOverride: string | null;
  } | null;
  assignment: { slotKey: string; attempt: number } | null;
}

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id: templateId, submissionId } = use(params);

  const [sub, setSub] = useState<Submission | null>(null);
  const [perQ, setPerQ] = useState<PerQ[]>([]);
  const [teacherFeedback, setTeacherFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/exam-submissions/${submissionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.submission) {
          setSub(d.submission);
          setPerQ(d.submission.aiPerQuestion || []);
          setTeacherFeedback(d.submission.teacherFeedback || "");
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [submissionId]);

  const updateScore = (questionId: string, score: number) => {
    setPerQ(prev => prev.map(p => p.questionId === questionId ? { ...p, score } : p));
  };

  const totalScore = perQ.reduce((s, p) => s + (p.score || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/exam-submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: totalScore,
          teacherFeedback,
          perQuestion: perQ,
        }),
      });
      if (!res.ok) {
        alert("שגיאה בשמירה");
        return;
      }
      alert("נשמר");
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleRunAI = async () => {
    if (!confirm("להריץ בדיקת AI מחדש?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/exam-submissions/${submissionId}/ai-grade`, { method: "POST" });
      if (!res.ok) alert("AI grading failed");
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">טוען...</div>;
  if (!sub) return <div className="p-8 text-center text-red-600">הגשה לא נמצאה</div>;

  const student = sub.student;
  const studentName = student
    ? [student.firstNameOverride || student.firstNameMoodle, student.lastNameOverride || student.lastNameMoodle].filter(Boolean).join(" ")
    : "(לא ידוע)";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8" dir="rtl">
      <Link href={`/exams/${templateId}/submissions`} className="text-sm text-blue-600 hover:underline">← כל ההגשות</Link>

      <div className="mt-3 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{studentName}</h1>
          <p className="text-sm text-gray-500">{sub.examTemplate.title}</p>
          {sub.assignment && sub.assignment.attempt > 1 && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded inline-block mt-1">
              מועד {sub.assignment.attempt}
            </span>
          )}
        </div>
        <div className="text-left">
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(totalScore)} <span className="text-lg text-gray-400">/ {sub.maxGrade}</span>
          </div>
          {sub.submittedAt && (
            <p className="text-xs text-gray-500">הוגש: {new Date(sub.submittedAt).toLocaleString("he-IL")}</p>
          )}
        </div>
      </div>

      {sub.aiOverallEval && (
        <div className="mt-5 bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="font-semibold text-blue-800 mb-2">הערכה כללית (AI):</p>
          <p className="text-sm whitespace-pre-wrap text-gray-700">{sub.aiOverallEval}</p>
        </div>
      )}

      {/* Questions list */}
      <div className="mt-5 space-y-4">
        {sub.examTemplate.questions.map((q, idx) => {
          const ans = sub.answers?.find(a => a.questionId === q.id);
          const grade = perQ.find(p => p.questionId === q.id);
          return (
            <div key={q.id} className="bg-white border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-gray-900 whitespace-pre-wrap flex-1">
                  <span className="text-blue-600">{idx + 1}.</span> {q.questionText}
                </p>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="number"
                    min={0}
                    max={q.points}
                    step={0.5}
                    value={grade?.score ?? 0}
                    onChange={e => updateScore(q.id, parseFloat(e.target.value) || 0)}
                    className="w-16 border rounded px-2 py-1 text-center text-sm"
                  />
                  <span className="text-sm text-gray-500">/ {q.points}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-xs text-gray-500 mb-1">תשובת התלמיד:</p>
                <p className="whitespace-pre-wrap">{ans?.answer || <span className="text-gray-400">לא נענה</span>}</p>
              </div>

              {q.questionType === "open" && q.correctAnswer && (
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-green-700 mb-1">תשובה רפרנסיאלית:</p>
                  <p className="whitespace-pre-wrap text-green-800">{q.correctAnswer}</p>
                </div>
              )}

              {grade?.feedback && (
                <div className="bg-yellow-50 rounded-lg p-3 text-sm">
                  <p className="text-xs text-yellow-800 mb-1">משוב AI:</p>
                  <p className="whitespace-pre-wrap text-gray-700">{grade.feedback}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Teacher feedback */}
      <div className="mt-5 bg-white border rounded-xl p-5">
        <label className="block text-sm font-semibold mb-2">משוב מהמורה לתלמיד</label>
        <textarea
          value={teacherFeedback}
          onChange={e => setTeacherFeedback(e.target.value)}
          rows={5}
          className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="הערות אישיות, נקודות לחיזוק וללמידה..."
        />
      </div>

      {/* Actions */}
      <div className="mt-5 flex justify-between items-center gap-3 sticky bottom-4">
        <button
          onClick={handleRunAI}
          disabled={saving}
          className="px-4 py-2 text-sm border rounded-lg bg-white hover:bg-gray-50"
        >
          🔄 הרץ AI מחדש
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמור ציון ומשוב"}
        </button>
      </div>
    </div>
  );
}
