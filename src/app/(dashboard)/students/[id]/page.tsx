import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField, formatDateHe } from "@/lib/utils";
import { AcademicOverview } from "@/components/students/academic-overview";
import { StudentAdminClassification } from "@/components/students/student-admin-classification";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          course: true,
          classGroup: true,
        },
      },
      grades: {
        include: { course: true, syllabusItem: true },
        orderBy: { createdAt: "desc" },
      },
      attendanceRecords: {
        orderBy: { date: "desc" },
        take: 20,
      },
      serviceRequests: {
        orderBy: { createdAt: "desc" },
      },
      studentNotes: {
        include: { author: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) notFound();

  const firstName = resolveField(
    student.firstNameMoodle,
    student.firstNameOverride
  );
  const lastName = resolveField(
    student.lastNameMoodle,
    student.lastNameOverride
  );
  const email = resolveField(student.emailMoodle, student.emailOverride);
  const phone = resolveField(student.phoneMoodle, student.phoneOverride);

  const adminStudentInfo = {
    id: student.id,
    sector: student.sector,
    studyLevel: student.studyLevel,
    engagementLevel: student.engagementLevel,
    paymentStatus: student.paymentStatus,
    monthlyPayment: student.monthlyPayment,
    paymentNotes: student.paymentNotes,
  };

  return (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {student.hebrewName || `${firstName} ${lastName}`}
            </h1>
            {student.hebrewName && (
              <p className="text-sm text-muted-foreground">
                {firstName} {lastName}
              </p>
            )}
            <div className="mt-2 text-xs">
              <Link href={`/public/register/${student.id}`} target="_blank" className="text-blue-600 hover:underline">
                [העתק קישור לטופס עדכון פרטים לתלמיד]
              </Link>
            </div>
          </div>
          <div className="flex gap-2">
            <SourceBadge source={student.firstNameSource} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          <InfoField
            label="אימייל"
            value={email}
            source={student.emailSource}
            dir="ltr"
          />
          <InfoField
            label="טלפון"
            value={phone}
            source={student.phoneSource}
            dir="ltr"
          />
          <InfoField
            label="ת.ז."
            value={resolveField(
              student.idNumberMoodle,
              student.idNumberOverride
            )}
            source={student.idNumberSource}
            dir="ltr"
          />
          <InfoField label="עיר" value={student.city} />
          <InfoField label="כתובת מלאה" value={student.address} />
          <InfoField label="תאריך לידה" value={student.dateOfBirth ? formatDateHe(student.dateOfBirth) : null} />
          <InfoField label="אופן השתתפות" value={student.participationType} />
          <InfoField label="חברותא" value={student.hasChavrusa ? "יש חברותא" : "אין / מבקש שידוך"} />
          
          {student.moodleLastAccess && (
            <InfoField
              label="גישה אחרונה למודל"
              value={formatDateHe(student.moodleLastAccess)}
            />
          )}
        </div>
        
        {(student.torahBackground || student.smichaBackground || student.studyPreferences) && (
          <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-6 text-sm bg-slate-50 p-4 rounded">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">רקע תורני</p>
              <p className="whitespace-pre-wrap">{student.torahBackground || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">רקע בסמיכה/רבנות</p>
              <p className="whitespace-pre-wrap">{student.smichaBackground || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">העדפות לימוד</p>
              <p className="whitespace-pre-wrap">{student.studyPreferences || "—"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Admin Classification Details */}
      <StudentAdminClassification student={adminStudentInfo} />

      {/* Enrollments */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">קורסים</h2>
        {student.enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">לא רשום לקורסים</p>
        ) : (
          <div className="space-y-2">
            {student.enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {resolveField(
                      enrollment.course.fullNameMoodle,
                      enrollment.course.fullNameOverride
                    )}
                  </p>
                  {enrollment.classGroup && (
                    <p className="text-xs text-muted-foreground">
                      {enrollment.classGroup.name}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    (resolveField(
                      enrollment.statusMoodle,
                      enrollment.statusOverride
                    ) ?? "active") === "active"
                      ? "bg-green-100 text-green-700"
                      : (resolveField(
                          enrollment.statusMoodle,
                          enrollment.statusOverride
                        )) === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {(resolveField(
                    enrollment.statusMoodle,
                    enrollment.statusOverride
                  ) ?? "active") === "active"
                    ? "פעיל"
                    : (resolveField(
                        enrollment.statusMoodle,
                        enrollment.statusOverride
                      )) === "completed"
                    ? "סיים"
                    : (resolveField(
                        enrollment.statusMoodle,
                        enrollment.statusOverride
                      )) === "withdrawn"
                    ? "פרש"
                    : "מושעה"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Academic Overview from Moodle */}
      <AcademicOverview studentId={id} />

      {/* Grades */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">ציונים</h2>
        {student.grades.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין ציונים</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  קורס
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  פריט
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  ציון
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  סוג
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">
                  מקור
                </th>
              </tr>
            </thead>
            <tbody>
              {student.grades.map((grade) => (
                <tr
                  key={grade.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2 text-sm">
                    {resolveField(
                      grade.course.fullNameMoodle,
                      grade.course.fullNameOverride
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {grade.syllabusItem?.title || "—"}
                  </td>
                  <td className="px-3 py-2 text-sm font-medium">
                    {resolveField(grade.scoreMoodle, grade.scoreOverride) ??
                      "—"}
                    {grade.maxScore ? `/${grade.maxScore}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {grade.gradeType === "written_exam"
                      ? "מבחן בכתב"
                      : grade.gradeType === "oral_exam"
                      ? "מבחן בע״פ"
                      : grade.gradeType === "moed_b"
                      ? "מועד ב"
                      : "רגיל"}
                  </td>
                  <td className="px-3 py-2">
                    <SourceBadge source={grade.scoreSource} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Service Requests */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">בקשות שירות</h2>
        {student.serviceRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין בקשות שירות</p>
        ) : (
          <div className="space-y-2">
            {student.serviceRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{req.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateHe(req.createdAt)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    req.status === "open"
                      ? "bg-amber-100 text-amber-700"
                      : req.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : req.status === "resolved"
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {req.status === "open"
                    ? "פתוח"
                    : req.status === "in_progress"
                    ? "בטיפול"
                    : req.status === "resolved"
                    ? "טופל"
                    : "בוטל"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">הערות</h2>
        {student.studentNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין הערות</p>
        ) : (
          <div className="space-y-3">
            {student.studentNotes.map((note) => (
              <div key={note.id} className="rounded-md bg-muted p-3">
                <p className="text-sm">{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.author.name} · {formatDateHe(note.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  source,
  dir,
}: {
  label: string;
  value: string | null;
  source?: string;
  dir?: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm" dir={dir}>
          {value || "—"}
        </p>
        {source && <SourceBadge source={source} />}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${
        source === "manual" ? "bg-amber-500" : "bg-blue-500"
      }`}
      title={source === "manual" ? "ערך ידני" : "מודל"}
    />
  );
}
