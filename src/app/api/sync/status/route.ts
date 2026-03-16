import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const latestSync = await prisma.syncLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  const syncLogs = await prisma.syncLog.findMany({
    orderBy: { startedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    latest: latestSync,
    history: syncLogs,
  });
}
