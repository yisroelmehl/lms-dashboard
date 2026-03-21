import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sales-agents/[id] - Get a single sales agent with stats
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const agent = await prisma.salesAgent.findUnique({
    where: { id },
    include: {
      paymentLinks: {
        orderBy: { createdAt: "desc" },
        include: {
          course: { select: { id: true, fullNameOverride: true, fullNameMoodle: true } },
          student: { select: { id: true, firstNameOverride: true, lastNameOverride: true, firstNameMoodle: true, lastNameMoodle: true } },
        },
      },
      payments: {
        where: { isSuccess: true },
        orderBy: { processedAt: "desc" },
      },
      _count: {
        select: {
          paymentLinks: true,
          payments: { where: { isSuccess: true } },
        },
      },
    },
  });

  if (!agent) {
    return NextResponse.json({ error: "איש מכירות לא נמצא" }, { status: 404 });
  }

  return NextResponse.json(agent);
}

// PATCH /api/sales-agents/[id] - Update a sales agent
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { firstName, lastName, email, phone, isActive } = body;

  const agent = await prisma.salesAgent.update({
    where: { id },
    data: {
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(email !== undefined && { email: email || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(agent);
}

// DELETE /api/sales-agents/[id] - Delete a sales agent
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if agent has payment links
  const linkCount = await prisma.paymentLink.count({ where: { salesAgentId: id } });
  if (linkCount > 0) {
    return NextResponse.json(
      { error: "לא ניתן למחוק איש מכירות עם קישורי תשלום קיימים. ניתן לסמן כלא פעיל." },
      { status: 400 }
    );
  }

  await prisma.salesAgent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
