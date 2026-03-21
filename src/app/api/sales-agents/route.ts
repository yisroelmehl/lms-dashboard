import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/sales-agents - List all sales agents
export async function GET() {
  const agents = await prisma.salesAgent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          paymentLinks: true,
          payments: { where: { isSuccess: true } },
        },
      },
    },
  });

  return NextResponse.json(agents);
}

// POST /api/sales-agents - Create a new sales agent
export async function POST(request: Request) {
  const body = await request.json();
  const { firstName, lastName, email, phone } = body;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "שם פרטי ושם משפחה הם שדות חובה" },
      { status: 400 }
    );
  }

  const agent = await prisma.salesAgent.create({
    data: { firstName, lastName, email: email || null, phone: phone || null },
  });

  return NextResponse.json(agent, { status: 201 });
}
