"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export function CourseTagsPicker({
  courseId,
  allTags,
  currentTagIds,
}: {
  courseId: string;
  allTags: Tag[];
  currentTagIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(currentTagIds)
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleToggle(tagId: string) {
    const next = new Set(selectedIds);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setSelectedIds(next);

    setSaving(true);
    try {
      await fetch(`/api/courses/${courseId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: Array.from(next) }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const selectedTags = allTags.filter((t) => selectedIds.has(t.id));

  return (
    <div className="relative mt-1" ref={ref}>
      <div className="flex flex-wrap items-center gap-1">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: `${tag.color || "#64748b"}22`,
              color: tag.color || "#64748b",
            }}
          >
            {tag.name}
          </span>
        ))}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-full border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:border-foreground hover:text-foreground"
        >
          {selectedTags.length === 0 ? "+ נושא לימוד" : "+"}
        </button>
        {saving && (
          <span className="text-[10px] text-muted-foreground">שומר...</span>
        )}
      </div>

      {open && allTags.length > 0 && (
        <div className="absolute top-full right-0 z-10 mt-1 w-48 rounded-md border border-border bg-card p-2 shadow-lg">
          {allTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleToggle(tag.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: tag.color || "#64748b" }}
              />
              <span className="flex-1 text-right">{tag.name}</span>
              {selectedIds.has(tag.id) && (
                <span className="text-primary">✓</span>
              )}
            </button>
          ))}
          {allTags.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">
              אין נושאי לימוד. צור נושאים בדף הקורסים.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
