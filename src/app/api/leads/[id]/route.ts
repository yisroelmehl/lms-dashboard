// src/app/api/leads/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leads/[id] — מידע מלא על ליד + אינטראקציות
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      salesAgent: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      interactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(lead);
}

// PATCH /api/leads/[id] — עדכון שדות ספציפיים על ליד בודד
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "name", "phone", "phone2", "email", "city", "address", "idNumber",
    "status", "notes", "salesAgentId", "courseId", "courseInterest",
    "sourceType", "sourceName", "campaignName",
    "leadResponse", "followUpCount", "lastContactDate", "discountNotes",
    "paymentCompleted", "paymentCompletedAt", "paymentAmount", "paymentMethod", "paymentReference",
    "kinyanSigned", "kinyanSignedAt", "kinyanMethod", "kinyanNotes",
    "shippingDetailsComplete", "shippingAddress", "shippingCity", "shippingPhone", "shippingNotes",
    "studentChatAdded", "studentChatAddedAt", "studentChatPlatform",
    "handoffToManager", "handoffAt", "handoffNotes",
    "conversionChecklistComplete", "conversionCompletedAt",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      data[key] = body[key];
    }
  }

  const updated = await prisma.lead.update({
    where: { id },
    data,
    include: {
      salesAgent: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      interactions: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/leads/[id] — מחיקת ליד (רק אם לא הומר)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (lead.convertedAt) {
    return NextResponse.json({ error: "לא ניתן למחוק ליד שהומר לתלמיד" }, { status: 400 });
  }

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
