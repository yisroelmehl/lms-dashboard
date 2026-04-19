"use client";

import { useState, useRef } from "react";

interface LearningUnitFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface LearningUnit {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  files: LearningUnitFile[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ fileType }: { fileType: string }) {
  if (fileType === "application/pdf") return <span>📄</span>;
  if (fileType.includes("word") || fileType.includes("docx")) return <span>📝</span>;
  if (fileType.startsWith("image/")) return <span>🖼️</span>;
  return <span>📎</span>;
}

export function LearningUnitsManager({
  courseId,
  initialUnits,
}: {
  courseId: string;
  initialUnits: LearningUnit[];
}) {
  const [units, setUnits] = useState<LearningUnit[]>(initialUnits);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitDesc, setNewUnitDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [editingUnit, setEditingUnit] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadUnit = useRef<string | null>(null);

  const createUnit = async () => {
    if (!newUnitName.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/learning-units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUnitName, description: newUnitDesc }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const unit = await res.json();
      setUnits((prev) => [...prev, unit]);
      setNewUnitName("");
      setNewUnitDesc("");
      setAddingUnit(false);
      setExpandedUnit(unit.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (unitId: string) => {
    if (!confirm("למחוק את יחידת הלימוד וכל הקבצים שבה?")) return;
    try {
      await fetch(`/api/learning-units/${unitId}`, { method: "DELETE" });
      setUnits((prev) => prev.filter((u) => u.id !== unitId));
    } catch {
      setError("שגיאה במחיקת היחידה");
    }
  };

  const startEdit = (unit: LearningUnit) => {
    setEditingUnit(unit.id);
    setEditName(unit.name);
    setEditDesc(unit.description ?? "");
  };

  const saveEdit = async (unitId: string) => {
    try {
      const res = await fetch(`/api/learning-units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
      setEditingUnit(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const triggerFileUpload = (unitId: string) => {
    activeUploadUnit.current = unitId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const unitId = activeUploadUnit.current;
    if (!files || files.length === 0 || !unitId) return;

    setUploadingTo(unitId);
    setError("");

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`/api/learning-units/${unitId}/files`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error((await res.json()).error || "שגיאה בהעלאה");
        const newFile = await res.json();
        setUnits((prev) =>
          prev.map((u) =>
            u.id === unitId ? { ...u, files: [...u.files, newFile] } : u
          )
        );
      } catch (e: any) {
        setError(`שגיאה בהעלאת "${file.name}": ${e.message}`);
      }
    }

    setUploadingTo(null);
    e.target.value = "";
  };

  const deleteFile = async (unitId: string, fileId: string) => {
    try {
      await fetch(`/api/learning-units/${unitId}/files/${fileId}`, { method: "DELETE" });
      setUnits((prev) =>
        prev.map((u) =>
          u.id === unitId ? { ...u, files: u.files.filter((f) => f.id !== fileId) } : u
        )
      );
    } catch {
      setError("שגיאה במחיקת הקובץ");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">יחידות לימוד</h2>
        <button
          onClick={() => setAddingUnit(true)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + יחידה חדשה
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
          <button className="mr-2 underline text-xs" onClick={() => setError("")}>סגור</button>
        </div>
      )}

      {/* Hidden multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Add unit form */}
      {addingUnit && (
        <div className="mb-4 rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4 space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="שם יחידת הלימוד *"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createUnit()}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="תיאור קצר (אופציונלי)"
            value={newUnitDesc}
            onChange={(e) => setNewUnitDesc(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={createUnit}
              disabled={saving || !newUnitName.trim()}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "שומר..." : "הוסף"}
            </button>
            <button
              onClick={() => { setAddingUnit(false); setNewUnitName(""); setNewUnitDesc(""); }}
              className="rounded-md border border-border px-4 py-1.5 text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {units.length === 0 && !addingUnit && (
        <p className="text-sm text-muted-foreground text-center py-6">
          אין יחידות לימוד. לחץ על "+ יחידה חדשה" כדי להתחיל.
        </p>
      )}

      <div className="space-y-3">
        {units.map((unit) => (
          <div key={unit.id} className="rounded-lg border border-border bg-background">
            {/* Unit header */}
            <div className="flex items-center gap-2 px-4 py-3">
              <button
                className="flex-1 flex items-center gap-2 text-right"
                onClick={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
              >
                <span className="text-muted-foreground text-xs">{expandedUnit === unit.id ? "▲" : "▼"}</span>
                {editingUnit === unit.id ? (
                  <div className="flex-1 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm font-medium"
                    />
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="תיאור"
                      className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm text-muted-foreground"
                    />
                    <button onClick={() => saveEdit(unit.id)} className="text-xs text-green-600 font-medium">שמור</button>
                    <button onClick={() => setEditingUnit(null)} className="text-xs text-muted-foreground">ביטול</button>
                  </div>
                ) : (
                  <div className="flex-1 text-right">
                    <span className="font-medium text-sm">{unit.name}</span>
                    {unit.description && (
                      <span className="mr-2 text-xs text-muted-foreground">{unit.description}</span>
                    )}
                  </div>
                )}
              </button>

              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {unit.files.length} קבצים
              </span>

              {editingUnit !== unit.id && (
                <>
                  <button
                    onClick={() => triggerFileUpload(unit.id)}
                    disabled={uploadingTo === unit.id}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {uploadingTo === unit.id ? "מעלה..." : "+ קובץ"}
                  </button>
                  <button onClick={() => startEdit(unit)} className="text-xs text-muted-foreground hover:text-foreground">✏️</button>
                  <button onClick={() => deleteUnit(unit.id)} className="text-xs text-destructive hover:text-destructive/80">🗑️</button>
                </>
              )}
            </div>

            {/* Files list */}
            {expandedUnit === unit.id && (
              <div className="border-t border-border px-4 pb-3 pt-2">
                {unit.files.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">אין קבצים ביחידה זו</p>
                    <button
                      onClick={() => triggerFileUpload(unit.id)}
                      disabled={uploadingTo === unit.id}
                      className="rounded-md border border-dashed border-primary/50 px-4 py-2 text-sm text-primary hover:bg-primary/5 disabled:opacity-50"
                    >
                      {uploadingTo === unit.id ? "מעלה קבצים..." : "העלה קבצים (PDF, Word, תמונות)"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 mt-1">
                    {unit.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileIcon fileType={file.fileType} />
                          <span className="text-sm truncate">{file.fileName}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.fileSize)}</span>
                        </div>
                        <button
                          onClick={() => deleteFile(unit.id, file.id)}
                          className="text-xs text-muted-foreground hover:text-destructive ml-2 shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => triggerFileUpload(unit.id)}
                      disabled={uploadingTo === unit.id}
                      className="mt-2 text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {uploadingTo === unit.id ? "מעלה..." : "+ הוסף קובץ נוסף"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
