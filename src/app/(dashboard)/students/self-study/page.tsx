"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AddSelfStudyModal } from "@/components/students/self-study/add-self-study-modal";
import { SelfStudyContactModal } from "@/components/students/self-study/self-study-contact-modal";
import { SelfStudyProgressModal } from "@/components/students/self-study/self-study-progress-modal";
import { SelfStudyEditModal } from "@/components/students/self-study/self-study-edit-modal";

interface SelfStudyEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: string;
  studyTopic: string | null;
  nextExamDate: string | null;
  examUnits: string | null;
  examNotes: string | null;
  nextContactDate: string | null;
  createdAt: string;
  student: {
    id: string;
    hebrewName: string | null;
    firstNameMoodle: string | null;
    firstNameOverride: string | null;
    lastNameMoodle: string | null;
    lastNameOverride: string | null;
    emailMoodle: string | null;
    emailOverride: string | null;
    phoneMoodle: string | null;
    phoneOverride: string | null;
    moodleUserId: number | null;
  };
  course: {
    id: string;
    moodleCourseId: number | null;
    fullNameMoodle: string | null;
    fullNameOverride: string | null;
  };
  contactLogs: {
    id: string;
    summary: string;
    nextContactDate: string | null;
    createdAt: string;
    admin: { id: string; name: string };
  }[];
}

function getStudentName(student: SelfStudyEnrollment["student"]): string {
  if (student.hebrewName) return student.hebrewName;
  const first = student.firstNameOverride || student.firstNameMoodle || "";
  const last = student.lastNameOverride || student.lastNameMoodle || "";
  return [first, last].filter(Boolean).join(" ") || "ללא שם";
}

function getCourseName(course: SelfStudyEnrollment["course"]): string {
  return course.fullNameOverride || course.fullNameMoodle || "ללא שם";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isContactOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) <= new Date();
}

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "פעיל", className: "bg-green-100 text-green-700" },
  paused: { label: "מושהה", className: "bg-amber-100 text-amber-700" },
  completed: { label: "סיים", className: "bg-blue-100 text-blue-700" },
  withdrawn: { label: "פרש", className: "bg-red-100 text-red-700" },
};

export default function SelfStudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [enrollments, setEnrollments] = useState<SelfStudyEnrollment[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQ, setSearchQ] = useState(searchParams.get("q") || "");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [filterTopic, setFilterTopic] = useState(searchParams.get("studyTopic") || "");
  const [filterNeedsContact, setFilterNeedsContact] = useState(searchParams.get("needsContact") === "true");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [contactModalEnrollment, setContactModalEnrollment] = useState<SelfStudyEnrollment | null>(null);
  const [progressModalEnrollment, setProgressModalEnrollment] = useState<SelfStudyEnrollment | null>(null);
  const [editModalEnrollment, setEditModalEnrollment] = useState<SelfStudyEnrollment | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (filterStatus) params.set("status", filterStatus);
    if (filterTopic) params.set("studyTopic", filterTopic);
    if (filterNeedsContact) params.set("needsContact", "true");

    try {
      const res = await fetch(`/api/students/self-study?${params.toString()}`);
      const data = await res.json();
      setEnrollments(data.enrollments || []);
      setTopics(data.topics || []);
    } catch {
      console.error("Error fetching self-study data");
    } finally {
      setLoading(false);
    }
  }, [searchQ, filterStatus, filterTopic, filterNeedsContact]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (filterStatus) params.set("status", filterStatus);
    if (filterTopic) params.set("studyTopic", filterTopic);
    if (filterNeedsContact) params.set("needsContact", "true");
    const qs = params.toString();
    router.replace(`/students/self-study${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [searchQ, filterStatus, filterTopic, filterNeedsContact, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">תלמידים עצמאיים</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {enrollments.length} רישומים
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + רישום חדש
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-card p-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם תלמיד..."
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">כל הסטטוסים</option>
          <option value="active">פעיל</option>
          <option value="paused">מושהה</option>
          <option value="completed">סיים</option>
          <option value="withdrawn">פרש</option>
        </select>
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">כל נושאי הלימוד</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={filterNeedsContact}
            onChange={(e) => setFilterNeedsContact(e.target.checked)}
            className="rounded border-input"
          />
          דורש יצירת קשר
        </label>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">טוען...</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQ || filterStatus || filterTopic || filterNeedsContact
            ? "לא נמצאו תלמידים עצמאיים התואמים לסינון"
            : "אין עדיין תלמידים עצמאיים. לחץ '+ רישום חדש' כדי להתחיל."}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">שם תלמיד</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">קורס</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">נושא לימוד</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">סטטוס</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">בחינה קרובה</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">יצירת קשר הבאה</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">שיחה אחרונה</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enrollment) => {
                const statusInfo = statusLabels[enrollment.status] || statusLabels.active;
                const contactOverdue = isContactOverdue(enrollment.nextContactDate);
                const lastLog = enrollment.contactLogs[0];

                return (
                  <tr key={enrollment.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">
                      <Link
                        href={`/students/${enrollment.studentId}`}
                        className="text-blue-600 hover:underline"
                      >
                        {getStudentName(enrollment.student)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getCourseName(enrollment.course)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {enrollment.studyTopic || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        {formatDate(enrollment.nextExamDate)}
                        {enrollment.examUnits && (
                          <p className="text-xs text-muted-foreground mt-0.5">{enrollment.examUnits}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={contactOverdue ? "text-red-600 font-medium" : ""}>
                        {formatDate(enrollment.nextContactDate)}
                        {contactOverdue && " ⚠️"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lastLog ? (
                        <div className="max-w-[180px]">
                          <p className="truncate text-xs">{lastLog.summary}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(lastLog.createdAt)}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setProgressModalEnrollment(enrollment)}
                          className="rounded px-2 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="התקדמות במודל"
                        >
                          📊
                        </button>
                        <button
                          onClick={() => setContactModalEnrollment(enrollment)}
                          className="rounded px-2 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100"
                          title="רישום שיחה"
                        >
                          📞
                        </button>
                        <button
                          onClick={() => setEditModalEnrollment(enrollment)}
                          className="rounded px-2 py-1 text-xs bg-slate-50 text-slate-700 hover:bg-slate-100"
                          title="עריכה"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddSelfStudyModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onCreated={fetchData}
        />
      )}
      {contactModalEnrollment && (
        <SelfStudyContactModal
          enrollment={contactModalEnrollment}
          onClose={() => setContactModalEnrollment(null)}
          onSaved={fetchData}
        />
      )}
      {progressModalEnrollment && (
        <SelfStudyProgressModal
          enrollment={progressModalEnrollment}
          onClose={() => setProgressModalEnrollment(null)}
        />
      )}
      {editModalEnrollment && (
        <SelfStudyEditModal
          enrollment={editModalEnrollment}
          onClose={() => setEditModalEnrollment(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
