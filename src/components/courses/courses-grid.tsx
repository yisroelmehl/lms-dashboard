"use client";

import { useState } from "react";
import Link from "next/link";
import { resolveField } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface Semester {
  id: string;
  name: string;
}

interface CourseWithTags {
  id: string;
  fullNameMoodle: string | null;
  fullNameOverride: string | null;
  shortNameMoodle: string | null;
  shortNameOverride: string | null;
  isActive: boolean;
  _count: { enrollments: number; semesters: number; classGroups: number };
  enrollments: { id: string; statusMoodle: string | null; statusOverride: string | null }[];
  tags: { tag: Tag }[];
  semesters: Semester[];
}

export function CoursesGrid({
  courses,
  tags,
  semesters = [],
}: {
  courses: CourseWithTags[];
  tags: Tag[];
  semesters?: Semester[];
}) {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = courses.filter((course) => {
    // Filter by tag
    if (selectedTagId) {
      const hasTag = course.tags.some((ct) => ct.tag.id === selectedTagId);
      if (!hasTag) return false;
    }

    // Filter by semester
    if (selectedSemesterId) {
      const hasSemester = course.semesters.some((s) => s.id === selectedSemesterId);
      if (!hasSemester) return false;
    }

    // Filter by search
    if (search.trim()) {
      const name = resolveField(course.fullNameMoodle, course.fullNameOverride) || "";
      const shortName = resolveField(course.shortNameMoodle, course.shortNameOverride) || "";
      const q = search.trim().toLowerCase();
      if (!name.toLowerCase().includes(q) && !shortName.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש קורס..."
          className="w-60 rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
          dir="rtl"
        />

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">נושא:</span>
            <button
              onClick={() => setSelectedTagId(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedTagId === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              הכל
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  setSelectedTagId(selectedTagId === tag.id ? null : tag.id)
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTagId === tag.id
                    ? "text-white"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  backgroundColor:
                    selectedTagId === tag.id
                      ? tag.color || "#64748b"
                      : `${tag.color || "#64748b"}22`,
                  color:
                    selectedTagId === tag.id
                      ? "white"
                      : tag.color || "#64748b",
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {semesters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">מחזור:</span>
            <button
              onClick={() => setSelectedSemesterId(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedSemesterId === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              הכל
            </button>
            {semesters.map((sem) => (
              <button
                key={sem.id}
                onClick={() =>
                  setSelectedSemesterId(selectedSemesterId === sem.id ? null : sem.id)
                }
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedSemesterId === sem.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {sem.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {(selectedTagId || selectedSemesterId || search) && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} מתוך {courses.length} קורסים
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            {courses.length === 0
              ? "אין קורסים. ייבא קורסים מהמודל באמצעות הכפתור למעלה."
              : "לא נמצאו קורסים מתאימים לסינון."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const name = resolveField(
              course.fullNameMoodle,
              course.fullNameOverride
            );
            const activeEnrollments = course.enrollments.filter(
              (e) =>
                (e.statusOverride ?? e.statusMoodle ?? "active") === "active"
            );

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {resolveField(
                    course.shortNameMoodle,
                    course.shortNameOverride
                  )}
                </p>

                {/* Tags */}
                {course.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {course.tags.map((ct) => (
                      <span
                        key={ct.tag.id}
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: `${ct.tag.color || "#64748b"}22`,
                          color: ct.tag.color || "#64748b",
                        }}
                      >
                        {ct.tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {activeEnrollments.length} תלמידים
                  </span>
                  <span className="text-muted-foreground">
                    {course._count.semesters} סמסטרים
                  </span>
                  <span className="text-muted-foreground">
                    {course._count.classGroups} קבוצות
                  </span>
                </div>

                <div className="mt-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      course.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {course.isActive ? "פעיל" : "לא פעיל"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
