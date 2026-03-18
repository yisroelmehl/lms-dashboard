import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { TaskList } from "@/components/tasks/task-list";
import { TasksHeader } from "@/components/tasks/tasks-header";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  const adminId = (session?.user as any)?.id;

  const tasks = await prisma.task.findMany({
    where: {
      status: { not: "completed" }, // Show only active tasks by default
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      students: { include: { student: { select: { id: true, hebrewName: true, firstNameOverride: true, lastNameOverride: true } } } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
    orderBy: [
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  return (
    <div className="space-y-6">
      <TasksHeader adminId={adminId} />

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">משימות פתוחות ({tasks.length})</h2>
        <TaskList tasks={tasks as any} isAdminView={true} />
      </div>
    </div>
  );
}
