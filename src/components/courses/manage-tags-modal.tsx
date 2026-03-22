"use client";

import { useState, useEffect } from "react";

interface Tag {
  id: string;
  name: string;
  category: string;
  color: string | null;
  defaultPriceILS: number | null;
  defaultPriceUSD: number | null;
  defaultNumPayments: number | null;
  _count?: { courses: number };
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
];

export function ManageTagsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newPriceILS, setNewPriceILS] = useState("");
  const [newPriceUSD, setNewPriceUSD] = useState("");
  const [newNumPayments, setNewNumPayments] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editPriceILS, setEditPriceILS] = useState("");
  const [editPriceUSD, setEditPriceUSD] = useState("");
  const [editNumPayments, setEditNumPayments] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadTags();
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      setEditingId(null);
      setError(null);
    }
  }, [open]);

  async function loadTags() {
    setLoading(true);
    try {
      const res = await fetch("/api/tags?category=subject");
      if (!res.ok) throw new Error("שגיאה בטעינת תגיות");
      const data = await res.json();
      setTags(data.tags);
    } catch {
      setError("שגיאה בטעינת תגיות");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setError(null);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          category: "subject",
          color: newColor,
          defaultPriceILS: newPriceILS ? Number(newPriceILS) : null,
          defaultPriceUSD: newPriceUSD ? Number(newPriceUSD) : null,
          defaultNumPayments: newNumPayments ? Number(newNumPayments) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה ביצירת תגית");
        return;
      }
      setNewName("");
      setNewColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setNewPriceILS("");
      setNewPriceUSD("");
      setNewNumPayments("");
      loadTags();
    } catch {
      setError("שגיאה ביצירת תגית");
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    setError(null);
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          color: editColor,
          defaultPriceILS: editPriceILS ? Number(editPriceILS) : null,
          defaultPriceUSD: editPriceUSD ? Number(editPriceUSD) : null,
          defaultNumPayments: editNumPayments ? Number(editNumPayments) : null,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      loadTags();
    } catch {
      setError("שגיאה בעדכון תגית");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      loadTags();
    } catch {
      setError("שגיאה במחיקת תגית");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">ניהול נושאי לימוד</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 text-sm text-destructive">{error}</p>
        )}

        {/* Create new tag */}
        <div className="mb-4 space-y-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="שם נושא חדש..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              dir="rtl"
            />
            <div className="flex items-center gap-1">
              {PRESET_COLORS.slice(0, 5).map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${
                    newColor === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              הוסף
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">מחיר ̧שקלים</label>
              <input
                type="number"
                value={newPriceILS}
                onChange={(e) => setNewPriceILS(e.target.value)}
                placeholder="₪"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">מחיר $דולר</label>
              <input
                type="number"
                value={newPriceUSD}
                onChange={(e) => setNewPriceUSD(e.target.value)}
                placeholder="$"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">תשלומים</label>
              <input
                type="number"
                value={newNumPayments}
                onChange={(e) => setNewNumPayments(e.target.value)}
                placeholder="1"
                min="1"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Tags list */}
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">טוען...</p>
          ) : tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              אין נושאי לימוד. הוסף נושא חדש למעלה.
            </p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-md border border-border p-2"
              >
                {editingId === tag.id ? (
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                        dir="rtl"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.slice(0, 5).map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={`h-5 w-5 rounded-full border-2 ${
                              editColor === c ? "border-foreground" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={editPriceILS}
                        onChange={(e) => setEditPriceILS(e.target.value)}
                        placeholder="מחיר ₪"
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                        dir="ltr"
                      />
                      <input
                        type="number"
                        value={editPriceUSD}
                        onChange={(e) => setEditPriceUSD(e.target.value)}
                        placeholder="מחיר $"
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                        dir="ltr"
                      />
                      <input
                        type="number"
                        value={editNumPayments}
                        onChange={(e) => setEditNumPayments(e.target.value)}
                        placeholder="תשלומים"
                        min="1"
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(tag.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        שמור
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color || "#94a3b8" }}
                      />
                      <span className="text-sm font-medium">{tag.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({tag._count?.courses || 0} קורסים)
                      </span>
                      {(tag.defaultPriceILS || tag.defaultPriceUSD) && (
                        <span className="text-xs text-muted-foreground">
                          {tag.defaultPriceILS ? `₪${tag.defaultPriceILS}` : ""}
                          {tag.defaultPriceILS && tag.defaultPriceUSD ? " / " : ""}
                          {tag.defaultPriceUSD ? `$${tag.defaultPriceUSD}` : ""}
                          {tag.defaultNumPayments ? ` ×${tag.defaultNumPayments}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditName(tag.name);
                          setEditColor(tag.color || PRESET_COLORS[0]);
                          setEditPriceILS(tag.defaultPriceILS?.toString() || "");
                          setEditPriceUSD(tag.defaultPriceUSD?.toString() || "");
                          setEditNumPayments(tag.defaultNumPayments?.toString() || "");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        🗑️
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
