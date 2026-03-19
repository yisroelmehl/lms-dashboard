"use client";

import { useState } from "react";
import { ImportCoursesModal } from "./import-courses-modal";
import { useRouter } from "next/navigation";

export function CoursesHeader() {
  const [showImport, setShowImport] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">קורסים</h1>
        <button
          onClick={() => setShowImport(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          ייבא מהמודל
        </button>
      </div>

      <ImportCoursesModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => router.refresh()}
      />
    </>
  );
}
