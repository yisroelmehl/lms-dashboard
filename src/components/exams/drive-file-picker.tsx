"use client";

import { useState } from "react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

interface DriveFilePickerProps {
  folderId: string;
  selectedFiles: DriveFile[];
  onSelectionChange: (files: DriveFile[]) => void;
}

export function DriveFilePicker({
  folderId,
  selectedFiles,
  onSelectionChange,
}: DriveFilePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentFolder, setCurrentFolder] = useState(folderId);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadFiles = async (folder: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/drive/browse?folderId=${folder}`);
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setFiles(data.files || []);
      setLoaded(true);
    } catch (e: any) {
      setError(e.message || "שגיאה בטעינת קבצים");
    } finally {
      setLoading(false);
    }
  };

  const openFolder = (file: DriveFile) => {
    setFolderStack([...folderStack, { id: currentFolder, name: "חזור" }]);
    setCurrentFolder(file.id);
    loadFiles(file.id);
  };

  const goBack = () => {
    if (folderStack.length === 0) return;
    const prev = folderStack[folderStack.length - 1];
    setFolderStack(folderStack.slice(0, -1));
    setCurrentFolder(prev.id);
    loadFiles(prev.id);
  };

  const toggleFile = (file: DriveFile) => {
    const isSelected = selectedFiles.some((f) => f.id === file.id);
    if (isSelected) {
      onSelectionChange(selectedFiles.filter((f) => f.id !== file.id));
    } else {
      onSelectionChange([...selectedFiles, file]);
    }
  };

  const isFolder = (mimeType: string) =>
    mimeType === "application/vnd.google-apps.folder";

  const isSupported = (mimeType: string) =>
    mimeType === "application/pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.google-apps.document" ||
    mimeType.startsWith("text/");

  const getFileIcon = (mimeType: string) => {
    if (isFolder(mimeType)) return "📁";
    if (mimeType === "application/pdf") return "📕";
    if (mimeType.includes("document") || mimeType.includes("google-apps.document"))
      return "📄";
    if (mimeType.startsWith("text/")) return "📝";
    return "📎";
  };

  if (!loaded) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium">קבצים מ-Google Drive</h3>
        </div>
        <button
          onClick={() => loadFiles(currentFolder)}
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "טוען..." : "טען קבצים מהדרייב"}
        </button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">קבצים מ-Google Drive</h3>
        {folderStack.length > 0 && (
          <button
            onClick={goBack}
            className="text-sm text-primary hover:underline"
          >
            ← חזור
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">טוען קבצים...</div>
      ) : files.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">תיקיה ריקה</div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1">
          {files.map((file) => {
            const folder = isFolder(file.mimeType);
            const supported = isSupported(file.mimeType);
            const selected = selectedFiles.some((f) => f.id === file.id);

            return (
              <div
                key={file.id}
                className={`flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                  selected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50"
                } ${!folder && !supported ? "opacity-40 cursor-not-allowed" : ""}`}
                onClick={() => {
                  if (folder) openFolder(file);
                  else if (supported) toggleFile(file);
                }}
              >
                <span>{getFileIcon(file.mimeType)}</span>
                <span className="flex-1 truncate">{file.name}</span>
                {!folder && supported && (
                  <input
                    type="checkbox"
                    checked={selected}
                    readOnly
                    className="h-4 w-4 accent-primary"
                  />
                )}
                {folder && (
                  <span className="text-xs text-muted-foreground">פתח</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-1">
            {selectedFiles.length} קבצים נבחרו
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedFiles.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs"
              >
                {f.name}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectionChange(selectedFiles.filter((sf) => sf.id !== f.id));
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
