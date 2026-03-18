"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  students: { student: { id: string; hebrewName: string | null } }[];
  course: { id: string; fullNameOverride: string | null; fullNameMoodle: string | null } | null;
}

export function RecentTasksWidget({ adminId }: { adminId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tasks?assignedToId=${adminId}&status=open`)
      .then(r => r.json())
      .then(d => {
        setTasks((d.tasks || []).slice(0, 5)); // Show only 5 most recent
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [adminId]);

  const getPriorityColor = (priority: number) => {
    if (priority >= 2) return "text-red-600";
    if (priority === 1) return "text-orange-600";
    return "text-slate-600";
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">המשימות שלי</h2>
        <div className="text-sm text-muted-foreground">טוען...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">המשימות שלי</h2>
        <Link href="/tasks" className="text-sm text-blue-600 hover:underline">
          הצג הכל →
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          אין משימות פתוחות. כל הכבוד! 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start justify-between p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{task.title}</p>
                <div className="flex gap-2 mt-1 text-xs text-slate-600">
                  {task.students && task.students.length > 0 && (
                    <span>
                      👤 {task.students.map(s => s.student.hebrewName).join(", ")}
                    </span>
                  )}
                  {task.course && (
                    <span>📚 {task.course.fullNameOverride || task.course.fullNameMoodle}</span>
                  )}
                </div>
              </div>
              <div className={`text-right ml-2 flex-shrink-0 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority >= 2 && "🔴"}
                {task.priority === 1 && "🟠"}
                {task.priority === 0 && "⚪"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
