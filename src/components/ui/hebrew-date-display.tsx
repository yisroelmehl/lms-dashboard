"use client";

import { toHebrewDateString } from "@/lib/hebrew-date";

interface HebrewDateDisplayProps {
  dateValue: string;
}

export function HebrewDateDisplay({ dateValue }: HebrewDateDisplayProps) {
  if (!dateValue) return null;

  let hebrewDate: string;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    hebrewDate = toHebrewDateString(date);
  } catch {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground mt-0.5" dir="rtl">
      {hebrewDate}
    </p>
  );
}
