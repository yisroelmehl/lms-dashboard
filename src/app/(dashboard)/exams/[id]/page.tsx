"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ExamQuestionEditor } from "@/components/exam-templates/exam-question-editor";
import { PublishExamModal } from "@/components/exam-templates/publish-exam-modal";

export default function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/exam-templates/${resolvedParams.id}`);
      const data = await res.json();
      if (res.ok) setTemplate(data.template);
      else setError(data.error);
    } catch {
      setError("שגיאת תקשורת");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplate();
  }, [resolvedParams.id]);

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm("להסיר שאלה זו מהמבחן?")) return;
    try {
      await fetch(`/api/exam-templates/${resolvedParams.id}/questions/${qId}`, { method: "DELETE" });
      fetchTemplate();
    } catch {
      alert("שגיאה במחיקה");
    }
  };

  if (loading) return <div className="p-8 text-center">טוען מבחן...</div>;
  if (error || !template) return <div className="p-8 text-red-500 text-center">{error || "מבחן לא נמצא"}</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
            <Link href="/exams" className="hover:text-blue-600">מבחנים</Link>
            <span>/</span>
            <span>{template.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            {template.title}
            <span className={`text-xs px-2 py-1 rounded font-medium ${template.status === "published" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {template.status === "published" ? "פורסם" : "טיוטה"}
            </span>
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-2"
          >
            🚀 פרסם לכיתה
          </button>
          <Link
            href={`/exams/${template.id}/submissions`}
            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded text-sm hover:bg-blue-100 flex items-center gap-2"
          >
            📋 הגשות תלמידים
          </Link>
          <a href={`/api/exam-templates/${template.id}/export`} target="_blank" className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 flex items-center gap-2">
            📄 ייצוא המבחן
          </a>
        </div>
      </div>

      {showPublishModal && (
        <PublishExamModal
          templateId={template.id}
          defaultCourseId={template.courseId}
          defaultDeadline={template.dueDate}
          onClose={() => setShowPublishModal(false)}
          onPublished={({ created, total }) => {
            setShowPublishModal(false);
            alert(`המבחן הוקצה ל-${created} מתוך ${total} תלמידים פעילים בקורס.`);
            fetchTemplate();
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-5 rounded-lg border shadow-sm">
          <h3 className="font-semibold mb-3 border-b pb-2">פרטי המבחן</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><span className="font-medium text-gray-900">סוג:</span> {template.type === "exam" ? "מבחן" : "מטלה"}</p>
            <p><span className="font-medium text-gray-900">קורס:</span> {template.course?.fullNameOverride || template.course?.fullNameMoodle || "כללי"}</p>
            <p><span className="font-medium text-gray-900">ציון עובר:</span> {template.passingScore}</p>
            {template.timeLimit && <p><span className="font-medium text-gray-900">הגבלת זמן:</span> {template.timeLimit} דקות</p>}
            {template.description && <p className="pt-2 italic text-gray-500">{template.description}</p>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg border shadow-sm md:col-span-2">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h3 className="font-semibold text-lg">שאלות ({template.questions?.length ?? 0})</h3>
            {!isAddingQuestion && !editingQuestionId && (
              <button
                onClick={() => setIsAddingQuestion(true)}
                className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded hover:bg-blue-100"
              >
                + הוסף שאלה
              </button>
            )}
          </div>

          {(isAddingQuestion || editingQuestionId) && (
            <div className="mb-6 p-4 bg-slate-50 border rounded-lg">
              <ExamQuestionEditor
                templateId={template.id}
                studyUnits={(template.examTemplateUnits ?? []).map((eu: any) => eu.studyUnit)}
                existingQuestion={template.questions?.find((q: any) => q.id === editingQuestionId)}
                onClose={() => { setIsAddingQuestion(false); setEditingQuestionId(null); }}
                onSave={() => { setIsAddingQuestion(false); setEditingQuestionId(null); fetchTemplate(); }}
              />
            </div>
          )}

          <div className="space-y-4">
            {(template.questions ?? []).map((question: any, index: number) => (
              <div key={question.id} className="p-4 border rounded-lg bg-gray-50/50 hover:border-blue-300 transition">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-3 items-start">
                    <span className="font-bold text-gray-400 mt-0.5">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-900 whitespace-pre-wrap">{question.questionText}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                          {question.questionType === "open" ? "פתוחה" :
                           question.questionType === "multiple_choice" ? "אמריקאית" : "נכון/לא נכון"}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">{question.points} נק&apos;</span>
                        {question.studyUnit && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{question.studyUnit.title}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-50 hover:opacity-100 transition">
                    <button onClick={() => setEditingQuestionId(question.id)} className="text-blue-600 text-sm">ערוך</button>
                    <button onClick={() => handleDeleteQuestion(question.id)} className="text-red-500 text-sm">מחק</button>
                  </div>
                </div>

                {question.questionType === "multiple_choice" && question.options && Array.isArray(question.options) && (
                  <div className="mt-3 pl-8 space-y-1">
                    {question.options.map((opt: any, i: number) => (
                      <div key={opt.id || i} className={`text-sm flex gap-2 ${opt.isCorrect ? "text-green-700 font-medium" : "text-gray-600"}`}>
                        <span>{opt.isCorrect ? "✓" : "○"}</span>
                        {opt.text}
                      </div>
                    ))}
                  </div>
                )}

                {(question.questionType === "open" || question.questionType === "true_false") && question.correctAnswer && (
                  <div className="mt-3 pl-8 text-sm text-green-700">
                    <span className="font-medium">תשובה נכונה: </span> {question.correctAnswer}
                  </div>
                )}
              </div>
            ))}

            {(!template.questions || template.questions.length === 0) && !isAddingQuestion && (
              <div className="text-center py-6 text-gray-500">
                אין שאלות במבחן. לחץ על &quot;הוסף שאלה&quot; כדי להתחיל.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
