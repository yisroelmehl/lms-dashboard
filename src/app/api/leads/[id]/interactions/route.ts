// src/app/api/leads/[id]/interactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/leads/[id]/interactions — רשימת אינטראקציות עבור ליד
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const interactions = await prisma.leadInteraction.findMany({
    where: { leadId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(interactions);
}

// POST /api/leads/[id]/interactions — הוספת אינטראקציה
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const {
    interactionType,
    description,
    callStatus,
    durationSec,
    createdByName,
    nextContactDate,
  } = body;

  if (!interactionType) {
    return NextResponse.json({ error: "interactionType is required" }, { status: 400 });
  }

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const interaction = await prisma.leadInteraction.create({
    data: {
      leadId: id,
      interactionType,
      description: description || null,
      callStatus: callStatus || null,
      durationSec: durationSec ? parseInt(durationSec) : null,
      createdByName: createdByName || null,
      nextContactDate: nextContactDate ? new Date(nextContactDate) : null,
    },
  });

  // עדכן lastContactDate על הליד
  await prisma.lead.update({
    where: { id },
    data: {
      lastContactDate: new Date(),
      followUpCount: { increment: 1 },
    },
  });

  return NextResponse.json(interaction, { status: 201 });
}
