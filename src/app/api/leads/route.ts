// src/app/api/leads/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leads?status=new&course=יורה+יורה&search=כהן&page=1&salesAgentId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const status = searchParams.get("status") || undefined;
  const course = searchParams.get("course") || undefined;
  const search = searchParams.get("search") || undefined;
  const salesAgentId = searchParams.get("salesAgentId") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = 50;

  const where: Record<string, unknown> = {};

  if (status && status !== "all") {
    where.status = status;
  }
  if (salesAgentId && salesAgentId !== "all") {
    where.salesAgentId = salesAgentId;
  }
  if (course && course !== "all") {
    where.OR = [
      { courseInterest: { contains: course, mode: "insensitive" } },
      { course: { fullNameOverride: { contains: course, mode: "insensitive" } } },
      { course: { fullNameMoodle: { contains: course, mode: "insensitive" } } },
    ];
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { phone2: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { inquiryDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        salesAgent: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
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

  // איש מכירות לפילטר
  const salesAgents = await prisma.salesAgent.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json({
    leads,
    total,
    pages: Math.ceil(total / pageSize),
    page,
    courses: courses.map((c) => c.courseInterest).filter(Boolean),
    salesAgents,
  });
}

// POST /api/leads — יצירת ליד ידנית
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, phone, phone2, email, courseInterest, courseId, sourceType, sourceName, salesAgentId, notes, city, address } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "שם וטלפון הם שדות חובה" }, { status: 400 });
  }

  const normalizedPhone = phone.replace(/\D/g, "");

  const existing = await prisma.lead.findFirst({
    where: { OR: [{ phone: normalizedPhone }, { phone }] },
  });
  if (existing) {
    return NextResponse.json({ error: "ליד עם מספר טלפון זה כבר קיים", existing }, { status: 409 });
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone: normalizedPhone,
      phone2: phone2 || null,
      email: email || null,
      courseInterest: courseInterest || null,
      courseId: courseId || null,
      sourceType: sourceType || null,
      sourceName: sourceName || null,
      salesAgentId: salesAgentId || null,
      notes: notes || null,
      city: city || null,
      address: address || null,
      status: "new",
    },
    include: {
      salesAgent: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  return NextResponse.json(lead, { status: 201 });
}

// PATCH /api/leads — עדכון שדות ליד (bulk-style)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const allowed = [
    "status", "notes", "salesAgentId", "courseId", "courseInterest",
    "leadResponse", "followUpCount", "lastContactDate", "discountNotes",
    "phone2", "email", "city", "address", "sourceType", "sourceName",
    "paymentCompleted", "paymentCompletedAt", "paymentAmount", "paymentMethod", "paymentReference",
    "kinyanSigned", "kinyanSignedAt", "kinyanMethod", "kinyanNotes",
    "shippingDetailsComplete", "shippingAddress", "shippingCity", "shippingPhone", "shippingNotes",
    "studentChatAdded", "studentChatAddedAt", "studentChatPlatform",
    "handoffToManager", "handoffAt", "handoffNotes",
    "conversionChecklistComplete", "conversionCompletedAt",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in fields) {
      data[key] = fields[key];
    }
  }

  const updated = await prisma.lead.update({
    where: { id },
    data,
    include: {
      salesAgent: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  return NextResponse.json(updated);
}