// src/app/api/webhook-logs/[id]/route.ts
// GET /api/webhook-logs/[id] — get single log with full payload

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const log = await prisma.webhookLog.findUnique({
    where: { id },
    include: { queueItem: true },
  });
  if (!log) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(log);
}
