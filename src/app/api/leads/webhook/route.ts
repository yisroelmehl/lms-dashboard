// src/app/api/leads/webhook/route.ts
// Webhook endpoint for receiving new leads from external sources (forms, landing pages)
// Uses the webhook queue service to serialise concurrent requests and log every call.

import { NextRequest, NextResponse } from "next/server";
import { enqueueWebhook } from "@/lib/webhookQueueService";
import { leadWebhookHandler } from "@/lib/leadWebhookHandler";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sourceIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const result = await enqueueWebhook("lead", body, sourceIp, leadWebhookHandler);

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "שגיאה בקליטת ליד" }, { status: 400 });
  }

  const data = result.data as { lead: unknown; duplicate?: boolean };
  return NextResponse.json(
    { ok: true, ...data, message: data?.duplicate ? "ליד קיים כבר במערכת" : undefined },
    { status: data?.duplicate ? 200 : 201 },
  );
}