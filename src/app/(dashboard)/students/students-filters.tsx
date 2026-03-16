"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface FiltersProps {
  courses: { id: string; name: string }[];
  groups: { id: string; name: string; courseName: string }[];
}

export function StudentsFilters({ courses, groups }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSearch = searchParams.get("q") || "";
  const currentCourse = searchParams.get("course") || "";
  const currentGroup = searchParams.get("group") || "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      // Reset group when course changes
      if (key === "course") {
        params.delete("group");
      }
      router.push(`/students?${params.toString()}`);
    },
    [router, searchParams]
  );

  // Filter groups by selected course
  const filteredGroups = currentCourse
    ? groups.filter((g) => g.courseName === courses.find((c) => c.id === currentCourse)?.name)
    : groups;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="חיפוש לפי שם, אימייל..."
          defaultValue={currentSearch}
          onChange={(e) => {
            // Debounce search
            const value = e.target.value;
            const timeout = setTimeout(() => updateFilter("q", value), 300);
            return () => clearTimeout(timeout);
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔍
        </span>
      </div>

      {/* Course filter */}
      <select
        value={currentCourse}
        onChange={(e) => updateFilter("course", e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">כל הקורסים</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Group filter */}
      <select
        value={currentGroup}
        onChange={(e) => updateFilter("group", e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">כל הקבוצות</option>
        {filteredGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {(currentSearch || currentCourse || currentGroup) && (
        <button
          onClick={() => router.push("/students")}
          className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          נקה סינון ✕
        </button>
      )}
    </div>
  );
}
