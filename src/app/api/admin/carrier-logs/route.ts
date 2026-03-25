import { getBaldarServerLogs } from "@/lib/shipping/yahav-baldar";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const logs = getBaldarServerLogs();
  return NextResponse.json({
    count: logs.length,
    logs: logs.slice(-50), // Last 50 logs
  });
}
