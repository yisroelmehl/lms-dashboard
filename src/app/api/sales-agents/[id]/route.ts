// src/app/api/sales-agents/[id]/route.ts
// GET    /api/sales-agents/[id]   — get agent with detailed stats + recent leads
// PATCH  /api/sales-agents/[id]   — update agent fields
// DELETE /api/sales-agents/[id]   — soft-delete (deactivate)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sales-agents/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await prisma.salesAgent.findUnique({
    where: { id },
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

  if (!agent) {
    return NextResponse.json({ error: "איש מכירות לא נמצא" }, { status: 404 });
  }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [leadsLast30, converted, interactions, statusDist, recentLeads] = await Promise.all([
    prisma.lead.count({ where: { salesAgentId: id, createdAt: { gte: since30 } } }),
    prisma.lead.count({ where: { salesAgentId: id, status: "registered" } }),
    prisma.leadInteraction.count({ where: { lead: { salesAgentId: id }, createdAt: { gte: since30 } } }),
    prisma.lead.groupBy({ by: ["status"], where: { salesAgentId: id }, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
    prisma.lead.findMany({
      where: { salesAgentId: id },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, name: true, phone: true, status: true, courseInterest: true, lastContactDate: true, updatedAt: true },
    }),
  ]);

  const totalLeads = agent._count.leads;
  const openLeads = statusDist.filter((s) => !["registered", "lost"].includes(s.status)).reduce((acc, s) => acc + s._count.id, 0);
  const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

  return NextResponse.json({
    id: agent.id,
    firstName: agent.firstName,
    lastName: agent.lastName,
    email: agent.email,
    phone: agent.phone,
    isActive: agent.isActive,
    refCode: agent.refCode,
    notes: agent.notes,
    notificationWebhookUrl: agent.notificationWebhookUrl,
    notifyOnNewLead: agent.notifyOnNewLead,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    stats: {
      totalLeads,
      openLeads,
      convertedLeads: converted,
      conversionRate,
      leadsLast30Days: leadsLast30,
      interactionsLast30Days: interactions,
      totalPaymentLinks: agent._count.paymentLinks,
      successfulPayments: agent._count.payments,
      statusDistribution: statusDist.map((s) => ({ status: s.status, count: s._count.id })),
    },
    recentLeads,
  });
}

// PATCH /api/sales-agents/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const ALLOWED = ["firstName", "lastName", "email", "phone", "isActive", "refCode", "notes", "notificationWebhookUrl", "notifyOnNewLead"];
  const data: Record<string, unknown> = {};
  for (const key of ALLOWED) {
    if (key in body) data[key] = body[key] ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "אין שדות לעדכון" }, { status: 400 });
  }

  if (data.email) {
    const dup = await prisma.salesAgent.findFirst({ where: { email: data.email as string, NOT: { id } } });
    if (dup) return NextResponse.json({ error: "כתובת מייל כבר קיימת" }, { status: 409 });
  }
  if (data.refCode) {
    const dup = await prisma.salesAgent.findFirst({ where: { refCode: data.refCode as string, NOT: { id } } });
    if (dup) return NextResponse.json({ error: "קוד הפניה כבר קיים" }, { status: 409 });
  }

  const agent = await prisma.salesAgent.update({ where: { id }, data });
  return NextResponse.json(agent);
}

// DELETE /api/sales-agents/[id] — soft deactivate
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await prisma.salesAgent.findUnique({ where: { id } });
  if (!agent) return NextResponse.json({ error: "איש מכירות לא נמצא" }, { status: 404 });

  await prisma.salesAgent.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true, message: `${agent.firstName} ${agent.lastName} הושבת` });
}
