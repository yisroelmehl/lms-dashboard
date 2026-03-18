import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const studentId = searchParams.get("studentId");
    const assignedToId = searchParams.get("assignedToId"); // For filtering by assignee

    // Build the query
    const where: any = {};
    if (status) where.status = status;
    if (studentId) where.students = { some: { studentId } };
    if (assignedToId) where.assignedToId = assignedToId;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        students: { include: { student: { select: { id: true, hebrewName: true, firstNameOverride: true, lastNameOverride: true } } } },
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      },
      orderBy: [
        { status: "asc" }, // open -> in_progress -> completed
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "שגיאה בטעינת משימות" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminId = (session.user as any).id;

    const body = await req.json();
    const { 
      title, 
      description, 
      status, 
      dueDate, 
      priority, 
      scope, 
      assignedToId, 
      courseId, 
      studentIds 
    } = body;

    if (!title) {
      return NextResponse.json({ error: "כותרת משימה חסרה" }, { status: 400 });
    }

    // Create the task
    const newTask = await prisma.task.create({
      data: {
        title,
        description,
        status: status || "open",
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 0,
        scope: scope || "general",
        createdById: adminId,
        assignedToId: assignedToId || adminId, // Default to creator
        courseId: courseId || null,
        // Connect students
        students: {
          create: studentIds && Array.isArray(studentIds) 
            ? studentIds.map(sId => ({ studentId: sId })) 
            : []
        }
      },
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "שגיאה ביצירת משימה" }, { status: 500 });
  }
}
