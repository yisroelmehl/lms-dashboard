// src/app/api/leads/webhook/route.ts
// Webhook endpoint for receiving new leads from external sources (forms, landing pages)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/leads/webhook — receive a new lead
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, email, courseInterest, source } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
    }

    // Check for duplicate by phone
    const normalizedPhone = phone.replace(/\D/g, "");
    const existing = await prisma.lead.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({
        ok: true,
        lead: existing,
        duplicate: true,
        message: "ליד קיים כבר במערכת",
      });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone: normalizedPhone,
        email: email || null,
        courseInterest: courseInterest || null,
        notes: source ? `מקור: ${source}` : null,
        status: "new",
      },
    });

    return NextResponse.json({ ok: true, lead }, { status: 201 });
  } catch (error) {
    console.error("Lead webhook error:", error);
    return NextResponse.json({ error: "שגיאה בקליטת ליד" }, { status: 500 });
  }
}