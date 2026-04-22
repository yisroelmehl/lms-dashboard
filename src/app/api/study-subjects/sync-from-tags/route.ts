import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "super_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tags = await prisma.tag.findMany({ where: { category: "subject" } });

  let created = 0;
  let skipped = 0;

  for (const tag of tags) {
    const existing = await prisma.studySubject.findUnique({ where: { name: tag.name } });
    if (existing) { skipped++; continue; }
    await prisma.studySubject.create({ data: { name: tag.name } });
    created++;
  }

  return NextResponse.json({ created, skipped, total: tags.length });
}
