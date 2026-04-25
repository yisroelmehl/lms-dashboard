"use client";

import { useState } from "react";

interface Props {
  studentId: string;
}

export function StudentLoginLinkButton({ studentId }: Props) {
  const [generating, setGenerating] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setGenerating(true);
    setError("");
    setLink(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/magic-link`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה");
        return;
      }
      setLink(data.url);
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-2">קישור כניסה לפורטל</h3>
      <p className="text-xs text-gray-500 mb-3">
        צור קישור חד-פעמי שהתלמיד יכול ללחוץ כדי להיכנס לפורטל. תקף 24 שעות.
      </p>

      {!link ? (
        <button
          onClick={generate}
          disabled={generating}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "מייצר..." : "🔗 צור קישור כניסה"}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs break-all font-mono text-blue-900">
            {link}
          </div>
          <div className="flex gap-2">
            <button
              onClick={copy}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {copied ? "✓ הועתק" : "📋 העתק"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`היי! קישור לכניסה לפורטל:\n${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
            >
              💬 WhatsApp
            </a>
            <button
              onClick={() => setLink(null)}
              className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
            >
              איפוס
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
