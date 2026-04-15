"use client";

interface Question {
  id: string;
  type: "multiple_choice" | "open_ended";
  question: string;
  options: string[];
  correctAnswer: number | null;
  rubric: string;
  points: number;
}

interface ExamData {
  title: string;
  questions: Question[];
}

export function ExamPreview({
  examData,
  totalPoints,
}: {
  examData: ExamData;
  totalPoints: number | null;
}) {
  if (!examData || !examData.questions) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        טרם נוצרו שאלות למבחן זה
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{examData.title}</h3>
        {totalPoints && (
          <span className="text-sm text-muted-foreground">
            סה&quot;כ: {totalPoints} נקודות
          </span>
        )}
      </div>

      {examData.questions.map((q, i) => (
        <div
          key={q.id}
          className="rounded-lg border border-border bg-card p-4 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-sm font-medium text-muted-foreground">
                שאלה {i + 1}{" "}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                    q.type === "multiple_choice"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {q.type === "multiple_choice" ? "אמריקאית" : "פתוחה"}
                </span>
              </span>
              <p className="mt-1 font-medium">{q.question}</p>
            </div>
            <span className="text-sm text-muted-foreground mr-2">
              {q.points} נק&apos;
            </span>
          </div>

          {q.type === "multiple_choice" && q.options.length > 0 && (
            <div className="space-y-1 mr-4">
              {q.options.map((opt, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                    idx === q.correctAnswer
                      ? "bg-green-50 text-green-700 font-medium"
                      : ""
                  }`}
                >
                  <span className="text-muted-foreground">{idx + 1}.</span>
                  <span>{opt}</span>
                  {idx === q.correctAnswer && (
                    <span className="text-green-600">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {q.rubric && (
            <div className="mt-2 rounded bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium">קריטריונים: </span>
              {q.rubric}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
