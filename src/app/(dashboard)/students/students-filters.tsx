"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, FormEvent } from "react";

interface FiltersProps {
  courses: { id: string; name: string }[];
  groups: { id: string; name: string; courseName: string }[];
}

export function StudentsFilters({ courses, groups }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [course, setCourse] = useState(searchParams.get("course") || "");
  const [group, setGroup] = useState(searchParams.get("group") || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (course) params.set("course", course);
    if (group) params.set("group", group);
    
    router.push(`/students?${params.toString()}`);
  };

  const handleClear = () => {
    setQ("");
    setCourse("");
    setGroup("");
    router.push("/students");
  };

  // Filter groups by selected course
  const filteredGroups = course
    ? groups.filter((g) => g.courseName === courses.find((c) => c.id === course)?.name)
    : groups;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="חיפוש לפי שם, אימייל..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          🔍
        </span>
      </div>

      {/* Course filter */}
      <select
        value={course}
        onChange={(e) => {
          setCourse(e.target.value);
          setGroup(""); // Reset group when course changes
        }}
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
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">כל הקבוצות</option>
        {filteredGroups.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      {/* Submit Button */}
      <button
        type="submit"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        סנן
      </button>

      {/* Clear filters */}
      {(searchParams.get("q") || searchParams.get("course") || searchParams.get("group")) && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          נקה סינון ✕
        </button>
      )}
    </form>
  );
}
