/**
 * src/lib/leadWebhookHandler.ts
 *
 * Reusable handler function for lead webhook payloads.
 * Used both by the live webhook endpoint and by the retry mechanism.
 */

import { prisma } from "./prisma";
import type { WebhookResult } from "./webhookQueueService";

export async function leadWebhookHandler(payload: unknown): Promise<WebhookResult> {
  const { name, phone, email, courseInterest, source, campaignName, city } =
    (payload ?? {}) as Record<string, string | undefined>;

  if (!name || !phone) {
    return { success: false, error: "name and phone are required" };
  }

  const normalizedPhone = phone.replace(/\D/g, "");
  const existing = await prisma.lead.findFirst({
    where: { OR: [{ phone: normalizedPhone }, { phone }] },
  });

  if (existing) {
    await prisma.leadInteraction.create({
      data: {
        leadId: existing.id,
        interactionType: "website_form",
        description: `פנייה חוזרת מטופס${campaignName ? ` — קמפיין: ${campaignName}` : ""}`,
      },
    });
    return {
      success: true,
      action: "duplicate",
      entityType: "lead",
      entityId: existing.id,
      data: { lead: existing, duplicate: true },
    };
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      phone: normalizedPhone,
      email: email ?? null,
      courseInterest: courseInterest ?? null,
      city: city ?? null,
      sourceType: source ? "website" : null,
      sourceName: source ?? null,
      campaignName: campaignName ?? null,
      notes: null,
      status: "new",
    },
  });

  await prisma.leadInteraction.create({
    data: {
      leadId: lead.id,
      interactionType: "website_form",
      description: `פנייה ראשונה מטופס${campaignName ? ` — קמפיין: ${campaignName}` : ""}`,
    },
  });

  return {
    success: true,
    action: "created",
    entityType: "lead",
    entityId: lead.id,
    data: { lead },
  };
}
