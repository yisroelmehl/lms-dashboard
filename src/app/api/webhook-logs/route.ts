// src/app/api/webhook-logs/route.ts
// GET  /api/webhook-logs        — list logs (filters: webhookType, success, hours, limit)
// GET  /api/webhook-logs?stats  — return stats instead of list

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const stats = sp.has("stats");
  const webhookType = sp.get("webhookType") ?? undefined;
  const successParam = sp.get("success");
  const success = successParam === "true" ? true : successParam === "false" ? false : undefined;
  const hours = Math.min(parseInt(sp.get("hours") ?? "24", 10) || 24, 720);
  const limit = Math.min(parseInt(sp.get("limit") ?? "100", 10) || 100, 1000);

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const where = {
    createdAt: { gte: since },
    ...(webhookType ? { webhookType } : {}),
    ...(success !== undefined ? { success } : {}),
  };

  if (stats) {
    const [total, successful, byType, avgTime] = await Promise.all([
      prisma.webhookLog.count({ where }),
      prisma.webhookLog.count({ where: { ...where, success: true } }),
      prisma.webhookLog.groupBy({
        by: ["webhookType"],
        where,
        _count: { id: true },
      }),
      prisma.webhookLog.aggregate({ where, _avg: { processingTimeMs: true } }),
    ]);

    return NextResponse.json({
      totalWebhooks: total,
      successful,
      failed: total - successful,
      byType: Object.fromEntries(byType.map((r) => [r.webhookType, r._count.id])),
      avgProcessingTimeMs: avgTime._avg.processingTimeMs ?? null,
    });
  }

  const logs = await prisma.webhookLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      webhookType: true,
      sourceIp: true,
      success: true,
      action: true,
      errorMessage: true,
      entityType: true,
      entityId: true,
      processingTimeMs: true,
      createdAt: true,
      // omit rawPayload & resultData for list view (large)
      queueItem: { select: { id: true, status: true, retryCount: true } },
    },
  });

  return NextResponse.json(logs);
}
