"use client";

import { useEffect, useState } from "react";

interface ActivityItem {
  cmid: number;
  name: string;
  modname: string;
  type: "lesson" | "exam" | "assignment" | "other";
  isRealExam: boolean;
  completed: boolean;
  completedAt: number | null;
  grade: number | null;
  gradeMax: number | null;
  gradePercentage: number | null;
  isOverride?: boolean;
}

interface CourseAcademicData {
  courseId: string;
  courseName: string;
  moodleCourseId: number;
  activities: ActivityItem[];
  lessonCount: number;
  lessonCompleted: number;
  examCount: number;
  examCompleted: number;
  reqExamsCount: number;
  reqGradeAverage: number;
  reqAttendancePercent: number;
  activeSemestersCount?: number;
}

function ProgressBar({ value, max, color = "blue" }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const bgColor = pct === 100 ? "bg-green-500" : pct >= 60 ? colorMap[color] : pct >= 30 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${bgColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-14 text-left text-xs text-muted-foreground">
        {value}/{max} ({pct}%)
      </span>
    </div>
  );
}

function GradeBadge({ grade, gradeMax, percentage }: { grade: number | null; gradeMax: number | null; percentage: number | null }) {
  if (grade === null && percentage === null) return null;

  const pct = percentage ?? (gradeMax && grade !== null ? Math.round((grade / gradeMax) * 100) : null);
  const display = grade !== null && gradeMax !== null ? `${Math.round(grade)}/${Math.round(gradeMax)}` : pct !== null ? `${Math.round(pct)}%` : "—";

  const color =
    pct === null ? "bg-slate-100 text-slate-600"
    : pct >= 60 ? "bg-green-100 text-green-700"
    : pct >= 50 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {display}
    </span>
  );
}

function ActivityRow({ activity, studentId, courseId, onUpdate }: { activity: ActivityItem, studentId: string, courseId: string, onUpdate: () => void }) {
  const isLesson = activity.type === "lesson";
  const isExam = activity.type === "exam" && activity.isRealExam;

  const [isEditing, setIsEditing] = useState(false);
  const [editGrade, setEditGrade] = useState(activity.grade?.toString() || "");

  const icon = isLesson
    ? activity.modname === "bigbluebuttonbn"
      ? "🎥"
      : activity.name.toLowerCase().includes("הקלטה") || activity.name.toLowerCase().includes("recording")
      ? "▶️"
      : "📹"
    : isExam
    ? "📝"
    : "📄";

  async function handleToggleAttendance() {
    try {
      await fetch(`/api/students/${studentId}/academic/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cmid: activity.cmid,
          type: "lesson",
          courseId,
          attended: !activity.completed,
        }),
      });
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveGrade() {
    try {
      await fetch(`/api/students/${studentId}/academic/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cmid: activity.cmid,
          type: "exam",
          courseId,
          grade: parseFloat(editGrade) || 0,
        }),
      });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-md px-3 py-2 ${activity.completed ? "bg-green-50" : "bg-slate-50"} hover:bg-slate-100 transition-colors`}>
      <span className="text-base">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" title={activity.name}>
          {activity.name} {activity.isOverride && <span className="text-[10px] text-amber-600 font-medium ml-1 bg-amber-100 px-1 rounded">ידני</span>}
        </p>
        {activity.completedAt && activity.completedAt > 0 && (
          <p className="text-xs text-muted-foreground">
            הושלם: {new Date(activity.completedAt * 1000).toLocaleDateString("he-IL")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isExam && (
          isEditing ? (
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                value={editGrade} 
                onChange={e => setEditGrade(e.target.value)}
                className="w-16 h-6 text-xs px-1 border border-input rounded" 
                autoFocus
              />
              <button onClick={handleSaveGrade} className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">שמור</button>
              <button onClick={() => setIsEditing(false)} className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">בטל</button>
            </div>
          ) : (
            <div className="cursor-pointer" onClick={() => setIsEditing(true)}>
              <GradeBadge
                grade={activity.grade}
                gradeMax={activity.gradeMax}
                percentage={activity.gradePercentage}
              />
            </div>
          )
        )}
        {isLesson ? (
          <button 
            onClick={handleToggleAttendance}
            className={`shrink-0 text-lg hover:scale-110 transition-transform ${activity.completed ? "text-green-500" : "text-slate-300"}`}
            title="לחץ לעדכון נוכחות ידנית"
          >
            {activity.completed ? "✓" : "○"}
          </button>
        ) : (
          <span className={`shrink-0 text-lg ${activity.completed ? "text-green-500" : "text-slate-300"}`}>
            {activity.completed ? "✓" : "○"}
          </span>
        )}
      </div>
    </div>
  );
}

function CourseCard({ course, studentId, onUpdate }: { course: CourseAcademicData, studentId: string, onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"lessons" | "exams" | "all">("lessons");

  const lessons = course.activities.filter((a) => a.type === "lesson");
  const realExams = course.activities.filter((a) => a.type === "exam" && a.isRealExam);
  const otherExams = course.activities.filter((a) => a.type === "exam" && !a.isRealExam);

  const displayedActivities =
    activeTab === "lessons"
      ? lessons
      : activeTab === "exams"
      ? realExams
      : course.activities.filter((a) => a.type !== "other");

  const lessonPct = course.lessonCount === 0 ? 100 : Math.round((course.lessonCompleted / course.lessonCount) * 100);
  const examPct = course.examCount === 0 ? 100 : Math.round((course.examCompleted / course.examCount) * 100);

  // Graduation status calculation
  let hasGradeIssue = false;
  if (course.reqGradeAverage > 0 && course.examCount > 0) {
    const gradesSum = realExams.reduce((sum, e) => sum + (e.gradePercentage || 0), 0);
    const avg = gradesSum / course.examCount;
    if (avg < course.reqGradeAverage) hasGradeIssue = true;
  }
  const meetsAttendance = course.reqAttendancePercent === 0 || lessonPct >= course.reqAttendancePercent;
  const meetsExams = course.reqExamsCount === 0 || course.examCompleted >= course.reqExamsCount;
  const meetsGrades = !hasGradeIssue;
  
  const isEligible = meetsAttendance && meetsExams && meetsGrades;
  const hasReqs = course.reqAttendancePercent > 0 || course.reqExamsCount > 0 || course.reqGradeAverage > 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Course Header */}
      <button
        className="w-full text-right p-4 hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm flex items-center gap-2 truncate">
              {course.courseName}
              {hasReqs && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isEligible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {isEligible ? "זכאי לתעודה" : "לא זכאי"}
                </span>
              )}
            </h3>
            <div className="mt-2 space-y-1.5">
              {course.lessonCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">שיעורים</span>
                  <ProgressBar value={course.lessonCompleted} max={course.lessonCount} color="blue" />
                </div>
              )}
              {course.examCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20">מבחנים</span>
                  <ProgressBar value={course.examCompleted} max={course.examCount} color="amber" />
                </div>
              )}
            </div>
            {hasReqs && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {course.reqAttendancePercent > 0 && (
                  <span className={`${meetsAttendance ? "text-green-600" : "text-red-500"}`}>
                    נוכחות: {lessonPct}% (דרוש {course.reqAttendancePercent}%) {meetsAttendance ? "✓" : "✗"}
                  </span>
                )}
                {course.reqExamsCount > 0 && (
                  <span className={`${meetsExams ? "text-green-600" : "text-red-500"}`}>
                    מבחנים: {course.examCompleted} (דרוש {course.reqExamsCount}) {meetsExams ? "✓" : "✗"}
                  </span>
                )}
                {course.reqGradeAverage > 0 && (
                  <span className={`${meetsGrades ? "text-green-600" : "text-red-500"}`}>
                    ממוצע דרוש: {course.reqGradeAverage} {meetsGrades ? "✓" : "✗"}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1 shrink-0">
            {course.lessonCount > 0 && (
              <div className={`text-center rounded-full w-12 h-12 flex items-center justify-center text-sm font-bold ${lessonPct >= 80 ? "bg-green-100 text-green-700" : lessonPct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                {lessonPct}%
              </div>
            )}
            <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {lessons.length > 0 && (
              <button
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "lessons" ? "border-blue-500 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("lessons")}
              >
                📹 שיעורים ({course.lessonCompleted}/{course.lessonCount})
              </button>
            )}
            {realExams.length > 0 && (
              <button
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "exams" ? "border-amber-500 text-amber-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("exams")}
              >
                📝 מבחנים ({course.examCompleted}/{course.examCount})
              </button>
            )}
            {otherExams.length > 0 && (
              <button
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "all" ? "border-slate-500 text-slate-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                onClick={() => setActiveTab("all")}
              >
                כל הפעילויות
              </button>
            )}
          </div>

          {/* Activity List */}
          <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
            {displayedActivities.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">אין פעילויות בקטגוריה זו</p>
            ) : (
              displayedActivities.map((activity) => (
                <ActivityRow key={activity.cmid} activity={activity} studentId={studentId} courseId={course.courseId} onUpdate={onUpdate} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AcademicOverview({ studentId }: { studentId: string }) {
  const [data, setData] = useState<CourseAcademicData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = () => {
    fetch(`/api/students/${studentId}/academic`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.courses);
        setLoading(false);
      })
      .catch(() => {
        setError("שגיאה בטעינת נתוני לימודים");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
  }, [studentId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">מעקב לימודי</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">מעקב לימודי</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">מעקב לימודי</h2>
        <p className="text-sm text-muted-foreground">אין נתוני לימודים זמינים. ייתכן שהתלמיד אינו מסונכרן עם המודל.</p>
      </div>
    );
  }

  // Overall stats
  const totalLessons = data.reduce((s, c) => s + c.lessonCount, 0);
  const totalLessonsCompleted = data.reduce((s, c) => s + c.lessonCompleted, 0);
  const totalExams = data.reduce((s, c) => s + c.examCount, 0);
  const totalExamsCompleted = data.reduce((s, c) => s + c.examCompleted, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">מעקב לימודי</h2>

      {/* Summary Bar */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-xs text-blue-600 font-medium">השתתפות שיעורים</p>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {totalLessons === 0 ? "—" : `${Math.round((totalLessonsCompleted / totalLessons) * 100)}%`}
          </p>
          <p className="text-xs text-blue-500">{totalLessonsCompleted} מתוך {totalLessons} שיעורים</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs text-amber-600 font-medium">מבחנים הושלמו</p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {totalExams === 0 ? "—" : `${totalExamsCompleted}/${totalExams}`}
          </p>
          <p className="text-xs text-amber-500">
            {totalExams === 0 ? "אין מבחנים" : totalExamsCompleted === totalExams ? "כל המבחנים הושלמו ✓" : `נותרו ${totalExams - totalExamsCompleted} מבחנים`}
          </p>
        </div>
      </div>

      {/* Per-course breakdown */}
      <div className="space-y-3">
        {data.map((course) => (
          <CourseCard key={course.courseId} course={course} studentId={studentId} onUpdate={fetchOverview} />
        ))}
      </div>
    </div>
  );
}
