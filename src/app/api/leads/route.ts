// src/app/api/leads/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leads?status=new&course=יורה+יורה&search=כהן&page=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || undefined;
  const course = searchParams.get("course") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 50;

  const where: Record<string, unknown> = {};

  if (status && status !== "all") {
    where.status = status;
  }
  if (course && course !== "all") {
    where.courseInterest = { contains: course, mode: "insensitive" };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { inquiryDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  // קורסים ייחודיים לפילטר
  const courses = await prisma.lead.findMany({
    where: { courseInterest: { not: null } },
    select: { courseInterest: true },
    distinct: ["courseInterest"],
    orderBy: { courseInterest: "asc" },
  });

  return NextResponse.json({
    leads,
    total,
    pages: Math.ceil(total / pageSize),
    page,
    courses: courses
      .map((c) => c.courseInterest)
      .filter(Boolean),
  });
}

// PATCH /api/leads — עדכון סטטוס / הערות
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status, notes } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json(updated);
}