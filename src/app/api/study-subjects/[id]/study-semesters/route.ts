import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: studySubjectId } = await params;
  const { name, number } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const subject = await prisma.studySubject.findUnique({ where: { id: studySubjectId } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const semester = await prisma.studySemester.create({
    data: {
      name: name.trim(),
      number: number ?? 1,
      studySubjectId,
    },
  });

  return NextResponse.json(semester, { status: 201 });
}
