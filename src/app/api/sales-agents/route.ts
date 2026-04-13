// src/app/api/sales-agents/route.ts
// GET  /api/sales-agents   — list all agents with lead stats
// POST /api/sales-agents   — create a new agent

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const agents = await prisma.salesAgent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          leads: true,
          paymentLinks: true,
          payments: { where: { isSuccess: true } },
        },
      },
    },
  });

  const agentIds = agents.map((a) => a.id);

  const [openLeads, convertedLeads] = await Promise.all([
    prisma.lead.groupBy({
      by: ["salesAgentId"],
      where: {
        salesAgentId: { in: agentIds },
        status: { notIn: ["registered", "lost"] },
      },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ["salesAgentId"],
      where: {
        salesAgentId: { in: agentIds },
        status: "registered",
      },
      _count: { id: true },
    }),
  ]);

  const openMap = Object.fromEntries(openLeads.map((r) => [r.salesAgentId!, r._count.id]));
  const convertedMap = Object.fromEntries(convertedLeads.map((r) => [r.salesAgentId!, r._count.id]));

  const result = agents.map((a) => {
    const totalLeads = a._count.leads;
    const converted = convertedMap[a.id] ?? 0;
    const open = openMap[a.id] ?? 0;
    const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone,
      isActive: a.isActive,
      refCode: a.refCode,
      notes: a.notes,
      notificationWebhookUrl: a.notificationWebhookUrl,
      notifyOnNewLead: a.notifyOnNewLead,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      stats: { totalLeads, openLeads: open, convertedLeads: converted, conversionRate, totalPaymentLinks: a._count.paymentLinks, successfulPayments: a._count.payments },
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { firstName, lastName, email, phone, refCode, notes, notificationWebhookUrl, notifyOnNewLead } =
    body as Record<string, string | boolean | undefined>;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "שם פרטי ושם משפחה הם שדות חובה" }, { status: 400 });
  }

  if (email) {
    const dup = await prisma.salesAgent.findUnique({ where: { email: email as string } });
    if (dup) return NextResponse.json({ error: "כתובת מייל כבר קיימת" }, { status: 409 });
  }
  if (refCode) {
    const dup = await prisma.salesAgent.findUnique({ where: { refCode: refCode as string } });
    if (dup) return NextResponse.json({ error: "קוד הפניה כבר קיים" }, { status: 409 });
  }

  const agent = await prisma.salesAgent.create({
    data: {
      firstName: firstName as string,
      lastName: lastName as string,
      email: (email as string) ?? null,
      phone: (phone as string) ?? null,
      refCode: (refCode as string) ?? null,
      notes: (notes as string) ?? null,
      notificationWebhookUrl: (notificationWebhookUrl as string) ?? null,
      notifyOnNewLead: notifyOnNewLead !== false,
    },
  });

  return NextResponse.json(agent, { status: 201 });
}
