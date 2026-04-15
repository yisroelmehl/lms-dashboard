"use client";

interface PerQuestionFeedback {
  questionId: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface Feedback {
  overall: string;
  perQuestion: PerQuestionFeedback[];
}

export function SubmissionFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <div className="space-y-3">
      {/* Overall feedback */}
      {feedback.overall && (
        <div className="rounded-lg bg-blue-50 p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-1">משוב כללי</h4>
          <p className="text-sm text-blue-700">{feedback.overall}</p>
        </div>
      )}

      {/* Per-question breakdown */}
      {feedback.perQuestion && feedback.perQuestion.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">פירוט לפי שאלות</h4>
          {feedback.perQuestion.map((pq, i) => {
            const pct = pq.maxScore > 0 ? (pq.score / pq.maxScore) * 100 : 0;

            return (
              <div
                key={pq.questionId || i}
                className="rounded border border-border p-3 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    שאלה {i + 1}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      pct >= 75
                        ? "text-green-600"
                        : pct >= 56
                          ? "text-yellow-600"
                          : "text-red-600"
                    }`}
                  >
                    {pq.score}/{pq.maxScore}
                  </span>
                </div>
                {/* Score bar */}
                <div className="h-1.5 w-full rounded-full bg-gray-200">
                  <div
                    className={`h-1.5 rounded-full ${
                      pct >= 75
                        ? "bg-green-500"
                        : pct >= 56
                          ? "bg-yellow-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{pq.feedback}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
