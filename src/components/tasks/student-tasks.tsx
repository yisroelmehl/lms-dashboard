"use client";

import { useState } from "react";
import { TaskList } from "./task-list";
import { CreateTaskModal } from "./create-task-modal";

export function StudentTasks({
  studentId,
  adminId,
  tasks,
}: {
  studentId: string;
  adminId: string;
  tasks: any[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span>📋</span> משימות ומעקב
        </h2>
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-100 transition"
        >
          + משימה למעקב
        </button>
      </div>

      <TaskList tasks={tasks} isAdminView={false} />

      <CreateTaskModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        adminId={adminId} 
        studentId={studentId}
      />
    </div>
  );
}
