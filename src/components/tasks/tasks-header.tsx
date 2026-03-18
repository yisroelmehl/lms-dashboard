"use client";

import { useState } from "react";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";

export function TasksHeader({ adminId }: { adminId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>📋</span> משימות לביצוע
        </h1>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          + משימה חדשה
        </button>
      </div>

      <CreateTaskModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        adminId={adminId} 
      />
    </>
  );
}
