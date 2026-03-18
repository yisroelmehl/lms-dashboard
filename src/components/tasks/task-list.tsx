"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateHe } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string; // 'open', 'in_progress', 'completed', 'overdue'
  priority: number;
  dueDate: string | null;
  createdAt: string;
  students: { student: { id: string; hebrewName: string | null; firstNameOverride: string | null; lastNameOverride: string | null } }[];
  createdBy: { name: string };
  assignedTo: { name: string };
}

export function TaskList({ tasks, isAdminView = false }: { tasks: Task[], isAdminView?: boolean }) {
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdating(taskId);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      router.refresh();
    } catch (e) {
      alert("שגיאה בעדכון משימה");
    } finally {
      setUpdating(null);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 2) return "text-red-600 bg-red-100 border-red-200";
    if (priority === 1) return "text-orange-600 bg-orange-100 border-orange-200";
    return "text-slate-600 bg-slate-100 border-slate-200";
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 2) return "דחופה מאוד";
    if (priority === 1) return "חשובה";
    return "רגילה";
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center p-8 bg-slate-50 border border-dashed rounded-lg text-slate-500">
        אין משימות פתוחות. עבודה טובה! 🎉
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className={`flex flex-col sm:flex-row gap-4 rounded-lg border p-4 transition-colors ${task.status === 'completed' ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-300 shadow-sm hover:border-blue-300'}`}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-base font-semibold truncate ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                {task.title}
              </h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)}
              </span>
            </div>
            
            {task.description && (
              <p className="text-sm text-slate-600 mb-2 line-clamp-2">{task.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">📅</span> 
                  <span className={new Date(task.dueDate) < new Date() && task.status !== 'completed' ? "text-red-500 font-medium" : ""}>
                    יעד: {formatDateHe(new Date(task.dueDate))}
                  </span>
                </div>
              )}
              
              {task.students && task.students.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">👤</span>
                  {task.students.map(s => s.student.hebrewName || `${s.student.firstNameOverride} ${s.student.lastNameOverride}`).join(", ")}
                </div>
              )}

              {isAdminView && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">📝</span> הוקצה ע"י: {task.createdBy.name}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-2 border-t sm:border-t-0 sm:border-r border-slate-100 pt-3 sm:pt-0 sm:pr-4">
            <select 
              value={task.status} 
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
              disabled={updating === task.id}
              className={`text-sm px-2 py-1.5 rounded border font-medium ${
                task.status === 'completed' ? 'bg-slate-100 text-slate-600' :
                task.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <option value="open">בממתינים</option>
              <option value="in_progress">בטיפול</option>
              <option value="completed">הושלם ✓</option>
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
