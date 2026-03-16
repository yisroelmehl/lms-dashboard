import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a field that may have a Moodle value and/or an override.
 * Override takes priority when present.
 */
export function resolveField<T>(
  moodleValue: T | null | undefined,
  overrideValue: T | null | undefined
): T | null {
  if (overrideValue !== null && overrideValue !== undefined) {
    return overrideValue;
  }
  return moodleValue ?? null;
}

/**
 * Format a date for Hebrew display
 */
export function formatDateHe(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date and time for Hebrew display
 */
export function formatDateTimeHe(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get resolved student name from override pattern fields
 */
export function getStudentName(student: {
  firstNameMoodle: string | null;
  firstNameOverride: string | null;
  lastNameMoodle: string | null;
  lastNameOverride: string | null;
  hebrewName: string | null;
}): string {
  if (student.hebrewName) return student.hebrewName;
  const firstName = resolveField(
    student.firstNameMoodle,
    student.firstNameOverride
  );
  const lastName = resolveField(
    student.lastNameMoodle,
    student.lastNameOverride
  );
  return [firstName, lastName].filter(Boolean).join(" ") || "ללא שם";
}

/**
 * Get resolved course name from override pattern fields
 */
export function getCourseName(course: {
  fullNameMoodle: string | null;
  fullNameOverride: string | null;
}): string {
  return (
    resolveField(course.fullNameMoodle, course.fullNameOverride) || "ללא שם"
  );
}
