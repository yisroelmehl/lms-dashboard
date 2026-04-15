"use client";

interface Stats {
  totalSubmissions: number;
  gradedCount: number;
  averageGrade: number;
  medianGrade: number;
  highestGrade: number;
  lowestGrade: number;
  maxGrade: number;
  passingCount: number;
  failingCount: number;
  distribution: { range: string; count: number }[];
}

interface QuestionStat {
  questionId: string;
  question: string;
  type: string;
  maxScore: number;
  averageScore: number;
  count: number;
}

export function GradeDistribution({
  stats,
  questionStats,
}: {
  stats: Stats;
  questionStats: QuestionStat[];
}) {
  const maxCount = Math.max(...stats.distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="ממוצע" value={`${stats.averageGrade.toFixed(1)}/${stats.maxGrade}`} />
        <StatCard label="חציון" value={`${stats.medianGrade.toFixed(1)}/${stats.maxGrade}`} />
        <StatCard label="עוברים" value={`${stats.passingCount}/${stats.gradedCount}`} color="text-green-600" />
        <StatCard label="נכשלים" value={`${stats.failingCount}/${stats.gradedCount}`} color="text-red-600" />
      </div>

      {/* Distribution Chart */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-medium mb-4">התפלגות ציונים</h3>
        <div className="space-y-2">
          {stats.distribution.map((d) => (
            <div key={d.range} className="flex items-center gap-3">
              <span className="w-16 text-sm text-muted-foreground text-left">
                {d.range}
              </span>
              <div className="flex-1 h-6 bg-muted rounded">
                <div
                  className={`h-6 rounded text-xs flex items-center justify-end px-2 text-white font-medium ${
                    d.range.startsWith("0")
                      ? "bg-red-400"
                      : d.range.startsWith("56") || d.range.startsWith("66")
                        ? "bg-yellow-400"
                        : "bg-green-400"
                  }`}
                  style={{
                    width: `${(d.count / maxCount) * 100}%`,
                    minWidth: d.count > 0 ? "2rem" : "0",
                  }}
                >
                  {d.count > 0 ? d.count : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-Question Stats */}
      {questionStats.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-medium mb-4">ממוצע לפי שאלות</h3>
          <div className="space-y-3">
            {questionStats.map((qs, i) => {
              const pct =
                qs.maxScore > 0
                  ? (qs.averageScore / qs.maxScore) * 100
                  : 0;

              return (
                <div key={qs.questionId} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate max-w-md">
                      שאלה {i + 1}: {qs.question.substring(0, 60)}
                      {qs.question.length > 60 ? "..." : ""}
                    </span>
                    <span className="font-medium mr-2">
                      {qs.averageScore.toFixed(1)}/{qs.maxScore}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-2 rounded-full ${
                        pct >= 75
                          ? "bg-green-500"
                          : pct >= 56
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || ""}`}>{value}</p>
    </div>
  );
}
