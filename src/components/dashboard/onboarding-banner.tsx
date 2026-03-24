"use client";

import { useState } from "react";
import Link from "next/link";

interface OnboardingStudent {
  id: string;
  studentId: string;
  enrollmentId: string | null;
  callWithDirector: boolean;
  callWithRabbi: boolean;
  materialsSent: boolean;
  materialsReceived: boolean;
  connectedToPortal: boolean;
  completedAt: string | null;
  student: {
    id: string;
    hebrewName: string | null;
    firstNameMoodle: string | null;
    firstNameOverride: string | null;
    lastNameMoodle: string | null;
    lastNameOverride: string | null;
  };
}

const CHECKLIST_STEPS = [
  { field: "callWithDirector", label: "שיחה עם מנהל הלימודים" },
  { field: "callWithRabbi", label: "שיחה עם הרב של הכיתה" },
  { field: "materialsSent", label: "שליחת חומרים" },
  { field: "materialsReceived", label: "לוודא שקיבל את החומרים" },
  { field: "connectedToPortal", label: "לוודא שמחובר לאיזור האישי" },
] as const;

function resolveField(moodle: string | null, override: string | null): string {
  return override || moodle || "";
}

function getStudentName(student: OnboardingStudent["student"]): string {
  if (student.hebrewName) return student.hebrewName;
  const first = resolveField(student.firstNameMoodle, student.firstNameOverride);
  const last = resolveField(student.lastNameMoodle, student.lastNameOverride);
  return `${first} ${last}`.trim() || "תלמיד ללא שם";
}

function getCompletedCount(item: OnboardingStudent): number {
  return CHECKLIST_STEPS.filter(
    (step) => item[step.field as keyof OnboardingStudent]
  ).length;
}

export function OnboardingBanner({
  initialData,
}: {
  initialData: OnboardingStudent[];
}) {
  const [students, setStudents] = useState<OnboardingStudent[]>(initialData);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialData.length === 1 ? initialData[0].id : null
  );
  const [loading, setLoading] = useState<string | null>(null);

  if (students.length === 0) return null;

  async function toggleStep(
    onboardingId: string,
    field: string,
    currentValue: boolean
  ) {
    setLoading(`${onboardingId}-${field}`);
    try {
      const res = await fetch(`/api/student-onboarding/${onboardingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value: !currentValue }),
      });
      if (res.ok) {
        const updated = await res.json();
        setStudents((prev) =>
          prev.map((s) =>
            s.id === onboardingId
              ? { ...s, ...updated }
              : s
          )
        );
        // If all completed, remove from list after a short delay
        const allDone = CHECKLIST_STEPS.every(
          (step) => {
            if (step.field === field) return !currentValue;
            return updated[step.field];
          }
        );
        if (allDone) {
          setTimeout(() => {
            setStudents((prev) => prev.filter((s) => s.id !== onboardingId));
          }, 1500);
        }
      }
    } catch (e) {
      console.error("Failed to toggle step:", e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-lg border-2 border-blue-300 bg-gradient-to-l from-blue-50 to-indigo-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎓</span>
          <div>
            <h2 className="text-lg font-bold text-blue-900">
              קליטת תלמידים חדשים
            </h2>
            <p className="text-sm text-blue-700">
              {students.length} תלמידים ממתינים להשלמת תהליך קליטה
            </p>
          </div>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
          {students.length}
        </span>
      </div>

      <div className="space-y-3">
        {students.map((item) => {
          const completed = getCompletedCount(item);
          const total = CHECKLIST_STEPS.length;
          const isExpanded = expandedId === item.id;
          const progressPercent = (completed / total) * 100;

          return (
            <div
              key={item.id}
              className="rounded-lg border border-blue-200 bg-white overflow-hidden"
            >
              {/* Student header - always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="flex w-full items-center justify-between p-4 text-right hover:bg-blue-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {getStudentName(item.student).charAt(0)}
                  </div>
                  <div>
                    <Link
                      href={`/students/${item.studentId}`}
                      className="text-sm font-semibold text-blue-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {getStudentName(item.student)}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {completed}/{total} שלבים הושלמו
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="hidden sm:block w-24 h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        completed === total ? "bg-green-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                    />
                  </svg>
                </div>
              </button>

              {/* Checklist - expandable */}
              {isExpanded && (
                <div className="border-t border-blue-100 px-4 py-3 space-y-2">
                  {CHECKLIST_STEPS.map((step, i) => {
                    const checked =
                      item[step.field as keyof OnboardingStudent] as boolean;
                    const isLoading = loading === `${item.id}-${step.field}`;

                    return (
                      <label
                        key={step.field}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer transition-colors ${
                          checked
                            ? "bg-green-50 text-green-800"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isLoading}
                            onChange={() =>
                              toggleStep(item.id, step.field, checked)
                            }
                            className="peer h-5 w-5 cursor-pointer rounded border-2 border-slate-300 text-blue-600 accent-blue-600 disabled:opacity-50"
                          />
                          {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            </div>
                          )}
                        </div>
                        <span className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                            {String.fromCharCode(0x05d0 + i) /* א, ב, ג... */}
                          </span>
                          <span
                            className={`text-sm ${
                              checked
                                ? "line-through text-green-700"
                                : "text-slate-700"
                            }`}
                          >
                            {step.label}
                          </span>
                        </span>
                        {checked && (
                          <span className="mr-auto text-green-600">✓</span>
                        )}
                      </label>
                    );
                  })}

                  {completed === total && (
                    <div className="mt-2 rounded-md bg-green-100 p-3 text-center text-sm font-medium text-green-800">
                      ✅ תהליך הקליטה הושלם בהצלחה!
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
