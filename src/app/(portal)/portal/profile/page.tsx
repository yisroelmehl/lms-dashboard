"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course { id: string; fullNameMoodle: string | null; fullNameOverride: string | null; shortNameMoodle?: string | null; moodleCourseId?: number | null; }

interface Student {
  id: string;
  hebrewName: string | null;
  firstNameMoodle: string | null; firstNameOverride: string | null;
  lastNameMoodle: string | null; lastNameOverride: string | null;
  emailMoodle: string | null; emailOverride: string | null;
  phoneMoodle: string | null; phoneOverride: string | null;
  idNumberMoodle: string | null; idNumberOverride: string | null;
  city: string | null;
  address: string | null;
  dateOfBirth: string | null;
  torahBackground: string | null;
  smichaBackground: string | null;
  participationType: string | null;
  hasChavrusa: boolean;
  moodleUserId: number | null;
  enrollments: Array<{ course: Course; classGroup: { id: string; name: string } | null }>;
}

interface Grade {
  id: string;
  scoreMoodle: number | null;
  scoreOverride: number | null;
  maxScore: number | null;
  percentage: number | null;
  gradeType: string;
  examDate: string | null;
  comments: string | null;
  course: Course;
  syllabusItem: { id: string; title: string } | null;
}

interface Attendance {
  id: string;
  date: string;
  statusMoodle: string | null;
  statusOverride: string | null;
  course: Course;
}

interface AttendanceStats {
  present: number; absent: number; late: number; excused: number; total: number;
  courseName: string;
}

interface Submission {
  id: string;
  grade: number | null;
  feedback: string | null;
  submittedAt: string;
  syllabusItem: { id: string; title: string };
  course: Course;
}

interface ProfileData {
  student: Student;
  recentGrades: Grade[];
  attendanceStats: Record<string, AttendanceStats>;
  attendanceRecent: Attendance[];
  recentSubmissions: Submission[];
  examCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  present: { label: "נוכח", color: "bg-green-100 text-green-700" },
  late: { label: "איחור", color: "bg-yellow-100 text-yellow-700" },
  absent: { label: "חסר", color: "bg-red-100 text-red-700" },
  excused: { label: "פטור", color: "bg-blue-100 text-blue-700" },
};

function pickName(s: Student) {
  const first = s.firstNameOverride || s.firstNameMoodle || "";
  const last = s.lastNameOverride || s.lastNameMoodle || "";
  return s.hebrewName || `${first} ${last}`.trim() || "—";
}

function gradeScore(g: Grade) {
  const score = g.scoreOverride ?? g.scoreMoodle;
  if (score === null) return null;
  if (g.maxScore) return `${Math.round(score)} / ${g.maxScore}`;
  return `${Math.round(score)}`;
}

export default function PortalProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/profile")
      .then(r => {
        if (r.status === 401) { router.push("/portal"); return null; }
        return r.json();
      })
      .then(d => { if (d?.student) setData(d); })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  if (!data) return null;

  const { student } = data;
  const fullName = pickName(student);
  const email = student.emailOverride || student.emailMoodle || "—";
  const phone = student.phoneOverride || student.phoneMoodle || "—";
  const idNum = student.idNumberOverride || student.idNumberMoodle || "—";

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/portal/dashboard" className="flex items-center gap-2 hover:opacity-80">
            <span>←</span>
            <h1 className="font-bold text-lg">הכרטיסייה שלי</h1>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile card */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
              👤
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
              <p className="text-sm text-gray-500" dir="ltr">{email}</p>
              {student.moodleUserId && (
                <p className="text-xs text-gray-400 mt-1">Moodle ID: {student.moodleUserId}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 text-sm">
            <Field label="טלפון" value={phone} dir="ltr" />
            <Field label="ת.ז." value={idNum} dir="ltr" />
            <Field label="עיר" value={student.city || "—"} />
            <Field label="כתובת" value={student.address || "—"} />
            <Field label="תאריך לידה" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("he-IL") : "—"} />
            <Field label="חברותא" value={student.hasChavrusa ? "כן" : "לא"} />
            <Field label="אופן השתתפות" value={student.participationType || "—"} />
            <Field label="רקע תורני" value={student.torahBackground || "—"} />
            <Field label="רקע בסמיכה" value={student.smichaBackground || "—"} />
          </div>
        </section>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="קורסים פעילים" value={student.enrollments.length} icon="📚" />
          <Stat label="מבחנים" value={data.examCount} icon="📝" />
          <Stat label="ציונים" value={data.recentGrades.length} icon="📊" />
          <Stat label="נוכחות" value={Object.keys(data.attendanceStats).length} icon="✅" suffix=" קורסים" />
        </div>

        {/* Active courses */}
        <section>
          <h3 className="text-lg font-bold text-gray-900 mb-3">הקורסים שלי</h3>
          {student.enrollments.length === 0 ? (
            <Empty>אין קורסים פעילים</Empty>
          ) : (
            <div className="space-y-2">
              {student.enrollments.map(({ course, classGroup }) => (
                <div key={course.id} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {course.fullNameOverride || course.fullNameMoodle}
                    </p>
                    {classGroup && (
                      <p className="text-xs text-gray-500 mt-0.5">כיתה: {classGroup.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attendance per course */}
        {Object.keys(data.attendanceStats).length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">סיכום נוכחות</h3>
            <div className="space-y-2">
              {Object.entries(data.attendanceStats).map(([courseId, s]) => {
                const presentPct = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
                return (
                  <div key={courseId} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 text-sm truncate flex-1 ml-3">{s.courseName}</p>
                      <span className={`text-sm font-bold ${
                        presentPct >= 80 ? "text-green-600" : presentPct >= 60 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {presentPct}%
                      </span>
                    </div>
                    <div className="flex gap-1 text-xs">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">נוכח: {s.present}</span>
                      {s.late > 0 && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">איחור: {s.late}</span>}
                      {s.absent > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">חסר: {s.absent}</span>}
                      {s.excused > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">פטור: {s.excused}</span>}
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${presentPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent grades */}
        {data.recentGrades.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">ציונים אחרונים</h3>
            <div className="bg-white border rounded-lg overflow-hidden">
              {data.recentGrades.slice(0, 10).map((g, i) => {
                const score = gradeScore(g);
                return (
                  <div key={g.id} className={`p-3 ${i > 0 ? "border-t" : ""} flex items-center justify-between`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {g.syllabusItem?.title || "ציון כללי"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {g.course.fullNameOverride || g.course.fullNameMoodle}
                      </p>
                    </div>
                    <div className="text-left ml-3 whitespace-nowrap">
                      {score && <span className="font-bold text-gray-900">{score}</span>}
                      {g.percentage !== null && (
                        <p className="text-xs text-gray-500">{Math.round(g.percentage)}%</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent submissions */}
        {data.recentSubmissions.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">הגשות אחרונות</h3>
            <div className="bg-white border rounded-lg overflow-hidden">
              {data.recentSubmissions.map((s, i) => (
                <div key={s.id} className={`p-3 ${i > 0 ? "border-t" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.syllabusItem.title}</p>
                      <p className="text-xs text-gray-500 truncate">{s.course.fullNameOverride || s.course.fullNameMoodle}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(s.submittedAt).toLocaleDateString("he-IL")}
                      </p>
                    </div>
                    {s.grade !== null && (
                      <span className="font-bold text-gray-900 whitespace-nowrap">{Math.round(s.grade)}</span>
                    )}
                  </div>
                  {s.feedback && (
                    <p className="text-xs text-gray-600 mt-2 bg-yellow-50 p-2 rounded whitespace-pre-wrap">
                      {s.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent attendance */}
        {data.attendanceRecent.length > 0 && (
          <section>
            <h3 className="text-lg font-bold text-gray-900 mb-3">נוכחות אחרונה</h3>
            <div className="bg-white border rounded-lg overflow-hidden">
              {data.attendanceRecent.slice(0, 10).map((a, i) => {
                const status = a.statusOverride || a.statusMoodle || "absent";
                const meta = STATUS_LABELS[status];
                return (
                  <div key={a.id} className={`p-3 ${i > 0 ? "border-t" : ""} flex items-center justify-between`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">{a.course.fullNameOverride || a.course.fullNameMoodle}</p>
                      <p className="text-xs text-gray-500">{new Date(a.date).toLocaleDateString("he-IL")}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${meta?.color || "bg-gray-100 text-gray-700"}`}>
                      {meta?.label || status}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, dir }: { label: string; value: string; dir?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 truncate" dir={dir}>{value}</p>
    </div>
  );
}

function Stat({ label, value, icon, suffix }: { label: string; value: number; icon: string; suffix?: string }) {
  return (
    <div className="bg-white border rounded-lg p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}{suffix && <span className="text-xs text-gray-500">{suffix}</span>}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-center py-6 text-gray-400 bg-white rounded-lg border border-dashed">{children}</div>;
}
