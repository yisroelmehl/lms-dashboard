"use client";

import { useState, useRef } from "react";

interface SubmissionUploadProps {
  examId: string;
  onUploaded: () => void;
}

export function SubmissionUpload({ examId, onUploaded }: SubmissionUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate file types
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    const invalid = fileArray.filter(
      (f) => !allowed.includes(f.type) && !f.name.endsWith(".pdf") && !f.name.endsWith(".docx")
    );
    if (invalid.length > 0) {
      setError(`קבצים לא נתמכים: ${invalid.map((f) => f.name).join(", ")}`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      fileArray.forEach((f) => formData.append("files", f));

      const res = await fetch(`/api/exams/${examId}/submissions`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בהעלאה");
      }

      onUploaded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />

        {uploading ? (
          <div className="space-y-2">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">מעלה ומעבד קבצים...</p>
          </div>
        ) : (
          <>
            <p className="text-2xl">📤</p>
            <p className="mt-2 font-medium">גרור קבצים לכאן או לחץ לבחירה</p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF, Word, תמונות (JPG, PNG)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
