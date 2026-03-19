"use client";

import { useState } from "react";
import { resolveField } from "@/lib/utils";

export function CourseProgressTable({
  courseId,
  students,
  syllabusItems,
  initialCompletions,
}: {
  courseId: string;
  students: any[];
  syllabusItems: any[];
  initialCompletions: any[];
}) {
  const [completions, setCompletions] = useState(initialCompletions);
  const [savingId, setSavingId] = useState<string | null>(null);

  const getCompletionState = (studentId: string, itemId: string) => {
    return completions.find(
      (c) => c.studentId === studentId && c.syllabusItemId === itemId
    );
  };

  const isCompleted = (studentId: string, itemId: string) => {
    const state = getCompletionState(studentId, itemId);
    if (!state) return false;
    const finalState = resolveField(
      state.completionStateMoodle,
      state.completionStateOverride
    );
    return finalState === "complete" || finalState === "complete_with_pass";
  };

  const handleToggle = async (studentId: string, itemId: string, current: boolean) => {
    const key = `${studentId}-${itemId}`;
    setSavingId(key);
    
    // Optimistic update
    const updated = [...completions];
    const existingIndex = updated.findIndex(c => c.studentId === studentId && c.syllabusItemId === itemId);
    
    if (existingIndex >= 0) {
      updated[existingIndex].completionStateOverride = !current ? "complete" : "not_started";
    } else {
      updated.push({
        studentId,
        syllabusItemId: itemId,
        completionStateOverride: !current ? "complete" : "not_started",
        completionStateMoodle: null,
      });
    }
    setCompletions(updated);

    try {
      await fetch(`/api/courses/${courseId}/activity-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          syllabusItemId: itemId,
          completed: !current,
        }),
      });
    } catch (e) {
      console.error(e);
      alert("שגיאה בעדכון הפעילות");
      // Revert optimism if failed (simplified here, ideally would reload)
    } finally {
      setSavingId(null);
    }
  };

  if (syllabusItems.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        אין עדיין פריטי סילבוס לקורס זה.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="sticky right-0 bg-muted/50 p-3 text-right font-semibold text-foreground border-l min-w-[150px] shadow-[1px_0_0_0_#e2e8f0]">
                תלמיד
              </th>
              {syllabusItems.map((item) => (
                <th key={item.id} className="p-3 text-center font-semibold text-foreground min-w-[100px] border-l whitespace-nowrap">
                  <div className="truncate w-[100px]" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal">
                    {item.type === 'exam' ? 'מבחן' : item.type === 'lesson' ? 'שיעור' : 'פעילות'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={syllabusItems.length + 1} className="p-4 text-center text-muted-foreground">
                  אין תלמידים רשומים
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const name = `${resolveField(student.firstNameMoodle, student.firstNameOverride)} ${resolveField(student.lastNameMoodle, student.lastNameOverride)}`;
                return (
                  <tr key={student.id} className="border-b border-border hover:bg-muted/20">
                    <td className="sticky right-0 bg-card p-3 font-medium border-l shadow-[1px_0_0_0_#e2e8f0]">
                      {name}
                    </td>
                    {syllabusItems.map((item) => {
                      const completed = isCompleted(student.id, item.id);
                      const key = `${student.id}-${item.id}`;
                      const isSaving = savingId === key;
                      
                      return (
                        <td key={item.id} className="p-3 text-center border-l">
                          <button
                            disabled={isSaving}
                            onClick={() => handleToggle(student.id, item.id, completed)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors mx-auto ${
                              completed 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                            } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                          >
                            {completed ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <span className="text-[10px]">-</span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
