// src/app/api/webhook-queue/route.ts
// GET  /api/webhook-queue        — list queue items
// GET  /api/webhook-queue?stats  — return queue stats

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const statsMode = sp.has("stats");
  const status = sp.get("status") ?? undefined;
  const webhookType = sp.get("webhookType") ?? undefined;
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 500);
  const offset = parseInt(sp.get("offset") ?? "0", 10) || 0;

  const where = {
    ...(status ? { status } : {}),
    ...(webhookType ? { webhookType } : {}),
  };

  if (statsMode) {
    const [pending, failed, processing, byType] = await Promise.all([
      prisma.webhookQueue.count({ where: { status: "pending" } }),
      prisma.webhookQueue.count({ where: { status: "failed" } }),
      prisma.webhookQueue.count({ where: { status: "processing" } }),
      prisma.webhookQueue.groupBy({ by: ["webhookType"], _count: { id: true } }),
    ]);
    return NextResponse.json({
      pending,
      failed,
      processing,
      byType: Object.fromEntries(byType.map((r) => [r.webhookType, r._count.id])),
    });
  }

  const [items, total] = await Promise.all([
    prisma.webhookQueue.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        webhookType: true,
        status: true,
        retryCount: true,
        maxRetries: true,
        errorMessage: true,
        lastError: true,
        sourceIp: true,
        lastRetryAt: true,
        nextRetryAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        webhookLogId: true,
      },
    }),
    prisma.webhookQueue.count({ where }),
  ]);

  return NextResponse.json({ total, limit, offset, items });
}
