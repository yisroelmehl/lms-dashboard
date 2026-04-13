"use client";

import { useState } from "react";

interface Props {
  syllabusItem: {
    id: string;
    title: string;
    type: string;
  };
  onClose: () => void;
  onGenerated: (quizData: any) => void;
}

export function GenerateQuizModal({ syllabusItem, onClose, onGenerated }: Props) {
  const [source, setSource] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [questionType, setQuestionType] = useState("mixed");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<any>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("syllabusItemId", syllabusItem.id);
      formData.append("numQuestions", numQuestions.toString());
      formData.append("questionType", questionType);

      if (source === "file" && file) {
        formData.append("document", file);
      } else if (source === "text" && text.trim()) {
        formData.append("text", text);
      } else {
        setError("יש להעלות קובץ או להדביק טקסט");
        setGenerating(false);
        return;
      }

      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPreview(data.item.quizData);
      } else {
        setError(data.error || "שגיאה ביצירת הקוויז");
      }
    } catch {
      setError("שגיאה בתקשורת");
    } finally {
      setGenerating(false);
    }
  }

  function handleAccept() {
    onGenerated(preview);
  }

  const typeLabel =
    syllabusItem.type === "exam" ? "מבחן" :
    syllabusItem.type === "quiz" ? "חידון" :
    syllabusItem.type === "assignment" ? "מטלה" : syllabusItem.type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white border border-slate-200 shadow-xl" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold">🪄 צור {typeLabel} עם AI</h2>
            <p className="text-sm text-slate-500 mt-1">{syllabusItem.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {!preview ? (
            <>
              {/* Source selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">מקור חומר הלימוד</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSource("file")}
                    className={`flex-1 border rounded-lg p-3 text-sm font-medium transition-colors ${
                      source === "file" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    📄 העלאת קובץ
                    <span className="block text-xs font-normal mt-1 opacity-70">PDF, Word (.docx), טקסט</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSource("text")}
                    className={`flex-1 border rounded-lg p-3 text-sm font-medium transition-colors ${
                      source === "text" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ✍️ הדבקת טקסט
                    <span className="block text-xs font-normal mt-1 opacity-70">העתק-הדבק מחומר הלימוד</span>
                  </button>
                </div>
              </div>

              {/* File upload */}
              {source === "file" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">בחר קובץ</label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                  {file && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ {file.name} ({(file.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
              )}

              {/* Text paste */}
              {source === "text" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">הדבק את חומר הלימוד כאן</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={8}
                    placeholder="העתק והדבק כאן את תוכן השיעור, ההלכות, התקנות וכו'..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">{text.length} תווים</p>
                </div>
              )}

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">מספר שאלות</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value={3}>3 שאלות</option>
                    <option value={5}>5 שאלות</option>
                    <option value={7}>7 שאלות</option>
                    <option value={10}>10 שאלות</option>
                    <option value={15}>15 שאלות</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סוג שאלות</label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="mixed">מעורב (אמריקאיות + פתוחות)</option>
                    <option value="multiple_choice">אמריקאיות בלבד</option>
                    <option value="open_ended">שאלות פתוחות בלבד</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Preview generated quiz */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="font-bold text-green-800 text-lg">✅ החידון נוצר בהצלחה!</h3>
                <p className="text-sm text-green-700 mt-1">{preview.title} — {preview.questions?.length || 0} שאלות</p>
              </div>

              <div className="space-y-3">
                {preview.questions?.map((q: any, i: number) => (
                  <div key={q.id} className="border rounded-md p-4 bg-slate-50">
                    <div className="flex items-start gap-2">
                      <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                        {i + 1}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{
                        background: q.type === "multiple_choice" ? "#dbeafe" : "#fef3c7",
                        color: q.type === "multiple_choice" ? "#1d4ed8" : "#92400e",
                      }}>
                        {q.type === "multiple_choice" ? "אמריקאית" : "פתוחה"}
                      </span>
                    </div>
                    <p className="font-medium text-sm mt-2">{q.question}</p>
                    {q.type === "multiple_choice" && q.options && (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt: string, j: number) => (
                          <li key={j} className={`text-sm px-2 py-1 rounded ${
                            j === q.correctAnswer ? "bg-green-100 text-green-800 font-medium" : "text-slate-600"
                          }`}>
                            {String.fromCharCode(1488 + j)}. {opt}
                            {j === q.correctAnswer && " ✓"}
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.type === "open_ended" && q.rubric && (
                      <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mt-2">
                        <strong>מחוון:</strong> {q.rubric}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-3 sticky bottom-0 bg-white">
          {!preview ? (
            <>
              <button onClick={onClose} disabled={generating} className="text-slate-600 border border-slate-300 px-4 py-2 rounded-md text-sm hover:bg-slate-100">
                ביטול
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || (source === "file" && !file) || (source === "text" && text.length < 50)}
                className="bg-purple-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    מייצר חידון...
                  </>
                ) : (
                  "🪄 צור חידון עם AI"
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPreview(null)}
                className="text-slate-600 border border-slate-300 px-4 py-2 rounded-md text-sm hover:bg-slate-100"
              >
                ← צור מחדש
              </button>
              <button
                onClick={handleAccept}
                className="bg-green-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                ✅ שמור ופרסם
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
