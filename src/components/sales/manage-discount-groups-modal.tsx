"use client";

import { useState, useEffect } from "react";

interface DiscountGroup {
  id: string;
  name: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  color: string | null;
  isActive: boolean;
  _count?: { paymentLinks: number };
}

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316",
];

export function ManageDiscountGroupsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<DiscountGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("fixed");
  const [newValue, setNewValue] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("fixed");
  const [editValue, setEditValue] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    if (open) {
      loadGroups();
      setError(null);
    }
  }, [open]);

  async function loadGroups() {
    setLoading(true);
    try {
      const res = await fetch("/api/discount-groups");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGroups(data.groups);
    } catch {
      setError("שגיאה בטעינת קבוצות הנחה");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || !newValue) return;
    setError(null);
    try {
      const res = await fetch("/api/discount-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription || null,
          discountType: newType,
          discountValue: Number(newValue),
          color: newColor,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה ביצירת קבוצה");
        return;
      }
      setNewName("");
      setNewDescription("");
      setNewValue("");
      setNewType("fixed");
      loadGroups();
    } catch {
      setError("שגיאה ביצירת קבוצה");
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim() || !editValue) return;
    setError(null);
    try {
      const res = await fetch(`/api/discount-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription || null,
          discountType: editType,
          discountValue: Number(editValue),
          color: editColor,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      loadGroups();
    } catch {
      setError("שגיאה בעדכון קבוצה");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/discount-groups/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      loadGroups();
    } catch {
      setError("שגיאה במחיקת קבוצה");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">ניהול קבוצות הנחה</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        {/* Create new group */}
        <div className="mb-4 space-y-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם הקבוצה (לדוגמה: שליח, מסלול 5 שנים)"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              dir="rtl"
            />
            <div className="flex items-center gap-1">
              {PRESET_COLORS.slice(0, 4).map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`h-6 w-6 rounded-full border-2 ${newColor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="תיאור (אופציונלי)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            dir="rtl"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="fixed">סכום קבוע (₪)</option>
              <option value="percent">אחוז (%)</option>
            </select>
            <input
              type="number"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder={newType === "percent" ? "אחוז" : "סכום"}
              min="0"
              className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              dir="ltr"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newValue}
              className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              הוסף
            </button>
          </div>
        </div>

        {/* Groups list */}
        <div className="max-h-60 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">טוען...</p>
          ) : groups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              אין קבוצות הנחה. הוסף קבוצה חדשה למעלה.
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="rounded-md border border-border p-2">
                {editingId === group.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                        dir="rtl"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {PRESET_COLORS.slice(0, 4).map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            className={`h-5 w-5 rounded-full border-2 ${editColor === c ? "border-foreground" : "border-transparent"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="תיאור"
                      className="w-full rounded border border-input bg-background px-2 py-1 text-sm"
                      dir="rtl"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="fixed">סכום קבוע</option>
                        <option value="percent">אחוז</option>
                      </select>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                        dir="ltr"
                      />
                      <div className="flex gap-1">
                        <button onClick={() => handleUpdate(group.id)} className="text-xs text-primary hover:underline">שמור</button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground hover:underline">ביטול</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {group.color && (
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color }} />
                      )}
                      <span className="text-sm font-medium">{group.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {group.discountType === "percent" ? `${group.discountValue}%` : `₪${group.discountValue}`}
                      </span>
                      {group._count?.paymentLinks ? (
                        <span className="text-xs text-muted-foreground">({group._count.paymentLinks} קישורים)</span>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(group.id);
                          setEditName(group.name);
                          setEditDescription(group.description || "");
                          setEditType(group.discountType);
                          setEditValue(String(group.discountValue));
                          setEditColor(group.color || PRESET_COLORS[0]);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >✏️</button>
                      <button
                        onClick={() => handleDelete(group.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
