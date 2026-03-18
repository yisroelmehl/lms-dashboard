import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, title, description, dueDate, priority, assignedToId } = body;

    // Prepare update data. Only update provided fields.
    const data: any = {};
    if (status !== undefined) data.status = status;
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) data.priority = priority;
    if (assignedToId !== undefined) data.assignedToId = assignedToId;
    if (status === "completed") data.completedAt = new Date();

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "שגיאה בעדכון משימה" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json({ error: "שגיאה במחיקת משימה" }, { status: 500 });
  }
}
