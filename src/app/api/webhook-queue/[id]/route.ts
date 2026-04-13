// src/app/api/webhook-queue/[id]/route.ts
// GET    /api/webhook-queue/[id]          — get item detail (include raw payload)
// POST   /api/webhook-queue/[id]/retry    — handled in route below
// PATCH  /api/webhook-queue/[id]          — archive item (status → archived)
// DELETE /api/webhook-queue/[id]          — delete item permanently

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { retryQueueItem } from "@/lib/webhookQueueService";
// Lead handler re-used for retry
import { leadWebhookHandler } from "@/lib/leadWebhookHandler";

const HANDLERS: Record<string, Parameters<typeof retryQueueItem>[1]> = {
  lead: leadWebhookHandler,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await prisma.webhookQueue.findUnique({
    where: { id },
    include: { webhookLog: true },
  });
  if (!item) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });
  return NextResponse.json(item);
}

// PATCH ?action=retry|archive
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { action?: string };
  const action = body.action ?? req.nextUrl.searchParams.get("action");

  if (action === "retry") {
    const item = await prisma.webhookQueue.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: "לא נמצא" }, { status: 404 });

    const handler = HANDLERS[item.webhookType] ?? HANDLERS["lead"];
    if (!handler) {
      return NextResponse.json({ error: `אין handler לסוג ${item.webhookType}` }, { status: 400 });
    }

    const result = await retryQueueItem(id, handler);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  if (action === "archive") {
    const updated = await prisma.webhookQueue.update({
      where: { id },
      data: { status: "archived" },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "action לא תקין. השתמש ב-retry או archive" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.webhookQueue.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
