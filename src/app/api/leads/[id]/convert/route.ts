// src/app/api/leads/[id]/convert/route.ts
// ממיר ליד לתלמיד בפועל

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leadId } = await params;
  const body = await req.json().catch(() => ({}));

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  if (lead.convertedAt) {
    return NextResponse.json(
      { error: "Lead already converted", studentId: lead.studentId },
      { status: 409 }
    );
  }

  let studentId: string;

  try {
    const normalizedPhone = lead.phone.replace(/\D/g, "");
    
    // Search by phone (override or moodle)
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { phoneOverride: normalizedPhone },
          { phoneOverride: lead.phone },
          { phoneMoodle: normalizedPhone },
          { phoneMoodle: lead.phone },
        ],
      },
    });

    if (existing) {
      studentId = existing.id;
    } else {
      const newStudent = await prisma.student.create({
        data: {
          hebrewName: lead.name,
          phoneOverride: normalizedPhone,
          phoneSource: "manual",
          emailOverride: lead.email,
          emailSource: lead.email ? "manual" : "moodle",
        },
      });
      studentId = newStudent.id;
    }
  } catch (err) {
    console.error("Student creation error:", err);
    return NextResponse.json({ error: "שגיאה ביצירת תלמיד" }, { status: 500 });
  }

  const updatedLead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: "registered",
      convertedAt: new Date(),
      studentId,
    },
  });

  return NextResponse.json({
    ok: true,
    lead: updatedLead,
    studentId,
    message: `${lead.name} הומר לתלמיד בהצלחה`,
  });
}