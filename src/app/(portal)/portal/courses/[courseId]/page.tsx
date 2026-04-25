"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  fullNameMoodle: string | null; fullNameOverride: string | null;
  shortNameMoodle: string | null;
  description: string | null;
  dayOfWeek: number | null;
  hours: string | null;
  hebrewStartDate: string | null;
  startDate: string | null;
  recordingsFolderUrl: string | null;
  mainLecturer: { id: string; name: string } | null;
  moodleCourseId: number | null;
  moodleUrl: string | null;
  nextSession: { iso: string; label: string } | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  type: string;
  scheduledAt: string | null;
  recordingUrl: string | null;
  zoomJoinUrl: string | null;
  moodleCmId: number | null;
  moodleActivityType: string | null;
  moodleActivityUrl: string | null;
  lecturer: { name: string } | null;
}

interface StudyUnit {
  id: string;
  title: string;
  unitNumber: number;
  studySemester: { id: string; name: string; studySubject: { name: string } } | null;
}

interface ExamAssignment {
  id: string;
  attempt: number;
  deadline: string | null;
  template: { id: string; title: string; type: string; dueDate: string | null };
  submission: { id: string; submittedAt: string | null; grade: number | null; maxGrade: number | null } | null;
}

interface Data {
  course: Course;
  lessons: Lesson[];
  studyUnits: StudyUnit[];
  examAssignments: ExamAssignment[];
}

const HEBREW_DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function isLessonLive(scheduledAt: string | null): boolean {
  if (!scheduledAt) return false;
  const start = new Date(scheduledAt).getTime();
  const now = Date.now();
  // Consider "live" from 15min before until 3h after
  return now >= start - 15 * 60 * 1000 && now <= start + 3 * 60 * 60 * 1000;
}

export default function PortalCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = use(params);
  const router = useRouter();

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/portal/courses/${courseId}`)
      .then(r => {
        if (r.status === 401) { router.push("/portal"); return null; }
        if (r.status === 403) { setError("אתה לא רשום לקורס זה"); return null; }
        if (r.status === 404) { setError("הקורס לא נמצא"); return null; }
        return r.json();
      })
      .then(d => { if (d?.course) setData(d); })
      .finally(() => setLoading(false));
  }, [courseId, router]);

  if (loading) return <Page>טוען קורס...</Page>;
  if (error) return <Page>{error}</Page>;
  if (!data) return null;

  const { course, lessons, studyUnits, examAssignments } = data;
  const courseName = course.fullNameOverride || course.fullNameMoodle || "קורס";
  const dayLabel = course.dayOfWeek !== null ? `יום ${HEBREW_DAYS[course.dayOfWeek]}` : null;

  // Group study units by subject/semester
  const groupedUnits: Record<string, StudyUnit[]> = {};
  for (const u of studyUnits) {
    const key = u.studySemester
      ? `${u.studySemester.studySubject.name} — ${u.studySemester.name}`
      : "כללי";
    if (!groupedUnits[key]) groupedUnits[key] = [];
    groupedUnits[key].push(u);
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/portal/dashboard" className="flex items-center gap-2 hover:opacity-80">
            <span>←</span>
            <h1 className="font-bold text-base sm:text-lg line-clamp-1">{courseName}</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Course header card */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
              🎓
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-gray-900">{courseName}</h2>
              {course.mainLecturer && (
                <p className="text-sm text-gray-600 mt-0.5">מרצה: {course.mainLecturer.name}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2 text-xs">
                {dayLabel && course.hours && (
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {dayLabel} · {course.hours}
                  </span>
                )}
                {course.hebrewStartDate && (
                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    תחילה: {course.hebrewStartDate}
                  </span>
                )}
              </div>
            </div>
          </div>

          {course.description && (
            <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">{course.description}</p>
          )}

          {course.nextSession && (
            <div className="mt-4 bg-gradient-to-l from-blue-600 to-blue-800 text-white rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">המפגש הבא</p>
                <p className="text-sm font-medium mt-0.5">{course.nextSession.label}</p>
              </div>
              {course.moodleUrl && (
                <a
                  href={course.moodleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-blue-700 hover:bg-blue-50 font-medium px-4 py-2 rounded-lg whitespace-nowrap text-sm shadow"
                >
                  📺 כניסה למפגש
                </a>
              )}
            </div>
          )}
        </section>

        {/* Lessons */}
        {lessons.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">📅 שיעורים</h3>
            <div className="space-y-2">
              {lessons.map(lesson => {
                const live = isLessonLive(lesson.scheduledAt);
                const dateLabel = lesson.scheduledAt
                  ? new Date(lesson.scheduledAt).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit" })
                  : null;
                const timeLabel = lesson.scheduledAt
                  ? new Date(lesson.scheduledAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
                  : null;
                return (
                  <div key={lesson.id} className={`bg-white rounded-lg border p-4 ${live ? "ring-2 ring-orange-400" : ""}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {live && (
                            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                              🔴 מתקיים עכשיו
                            </span>
                          )}
                          <p className="font-medium text-gray-900 line-clamp-1">{lesson.title}</p>
                        </div>
                        {(dateLabel || lesson.lecturer?.name) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {dateLabel} {timeLabel && `· ${timeLabel}`}
                            {lesson.lecturer?.name && ` · ${lesson.lecturer.name}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {/* Recording */}
                      {lesson.recordingUrl ? (
                        <a
                          href={lesson.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          🎥 צפייה בהקלטה
                        </a>
                      ) : null}

                      {/* Zoom join */}
                      {lesson.zoomJoinUrl ? (
                        <a
                          href={lesson.zoomJoinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
                        >
                          📺 כניסה למפגש (Zoom)
                        </a>
                      ) : lesson.moodleActivityUrl ? (
                        <a
                          href={lesson.moodleActivityUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg"
                          title="הקישור עובר דרך Moodle"
                        >
                          🔗 דרך מודל
                        </a>
                      ) : null}

                      {!lesson.recordingUrl && !lesson.zoomJoinUrl && !lesson.moodleActivityUrl && (
                        <span className="text-xs text-gray-400">אין קישורים זמינים</span>
                      )}
                    </div>

                    {lesson.description && (
                      <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap line-clamp-2">{lesson.description}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {course.recordingsFolderUrl && (
              <a
                href={course.recordingsFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-blue-600 hover:underline mt-3"
              >
                📁 כל ההקלטות בתיקיה הראשית ←
              </a>
            )}
          </section>
        )}

        {/* Study units */}
        {Object.keys(groupedUnits).length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">📚 חומרי לימוד</h3>
            <div className="space-y-3">
              {Object.entries(groupedUnits).map(([groupName, units]) => (
                <div key={groupName} className="bg-white border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 border-b">
                    {groupName}
                  </div>
                  <ul className="divide-y">
                    {units.map(u => (
                      <li key={u.id} className="px-4 py-2 text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono">{u.unitNumber}.</span>
                        <span className="truncate">{u.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Exams */}
        {examAssignments.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">📝 מבחנים בקורס</h3>
            <div className="space-y-2">
              {examAssignments.map(a => {
                const status = a.submission?.submittedAt ? "submitted" :
                  a.deadline && new Date(a.deadline) < new Date() ? "expired" : "open";
                const statusColors: Record<string, string> = {
                  submitted: "bg-green-100 text-green-700",
                  expired: "bg-gray-200 text-gray-500",
                  open: "bg-yellow-100 text-yellow-700",
                };
                const statusLabels: Record<string, string> = {
                  submitted: "הוגש", expired: "פג תוקף", open: "פתוח",
                };
                return (
                  <Link
                    key={a.id}
                    href={`/portal/exams/${a.id}`}
                    className="block bg-white border rounded-lg p-3 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{a.template.title}</p>
                        {a.submission?.grade !== null && a.submission?.maxGrade && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            ציון: {Math.round(a.submission.grade)} / {a.submission.maxGrade}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[status]} whitespace-nowrap`}>
                        {statusLabels[status]}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-gray-600" dir="rtl">
      {children}
    </div>
  );
}
