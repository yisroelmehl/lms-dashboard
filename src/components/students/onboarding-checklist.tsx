"use client";

import { useState } from "react";
import Link from "next/link";

interface OnboardingStudent {
  id: string;
  studentId: string;
  callWithDirector: boolean;
  callWithRabbi: boolean;
  materialsSent: boolean;
  materialsReceived: boolean;
  connectedToPortal: boolean;
  completedAt: string | null;
  createdAt: string;
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

export function OnboardingChecklist({
  initialData,
}: {
  initialData: OnboardingStudent[];
}) {
  const [students, setStudents] = useState<OnboardingStudent[]>(initialData);
  const [loading, setLoading] = useState<string | null>(null);

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
            s.id === onboardingId ? { ...s, ...updated } : s
          )
        );
        // If all steps are now completed, remove after a delay
        const allDone = CHECKLIST_STEPS.every((step) => {
          if (step.field === field) return !currentValue;
          return updated[step.field];
        });
        if (allDone) {
          setTimeout(() => {
            setStudents((prev) => prev.filter((s) => s.id !== onboardingId));
          }, 2000);
        }
      }
    } catch (e) {
      console.error("Failed to toggle step:", e);
    } finally {
      setLoading(null);
    }
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">כל התלמידים החדשים חוברו בהצלחה! ✅</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {students.map((item) => {
        const name =
          item.student.hebrewName ||
          `${resolveField(item.student.firstNameMoodle, item.student.firstNameOverride)} ${resolveField(item.student.lastNameMoodle, item.student.lastNameOverride)}`.trim() ||
          "תלמיד ללא שם";

        const completedSteps = CHECKLIST_STEPS.filter(
          (s) => item[s.field as keyof OnboardingStudent]
        ).length;
        const totalSteps = CHECKLIST_STEPS.length;
        const progressPct = Math.round((completedSteps / totalSteps) * 100);
        const allDone = completedSteps === totalSteps;

        return (
          <div
            key={item.id}
            className={`rounded-lg border bg-card p-5 ${
              allDone ? "border-green-300 bg-green-50/30" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <Link
                  href={`/students/${item.student.id}`}
                  className="text-blue-600 hover:underline font-semibold text-lg"
                >
                  {name}
                </Link>
              </div>
              <div className="text-left flex items-center gap-3">
                <span className="text-sm font-medium">
                  {completedSteps}/{totalSteps}
                </span>
                <div className="w-24 h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      allDone ? "bg-green-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {CHECKLIST_STEPS.map((step, i) => {
                const checked = item[step.field as keyof OnboardingStudent] as boolean;
                const isLoading = loading === `${item.id}-${step.field}`;

                return (
                  <label
                    key={step.field}
                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors ${
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
                        onChange={() => toggleStep(item.id, step.field, checked)}
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
                        {String.fromCharCode(0x05d0 + i)}
                      </span>
                      <span
                        className={`text-sm ${
                          checked ? "line-through text-green-700" : "text-slate-700"
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
            </div>

            {allDone && (
              <div className="mt-3 rounded-md bg-green-100 p-3 text-center text-sm font-medium text-green-800">
                ✅ תהליך החיבור הושלם בהצלחה!
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
