import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const latestLink = await prisma.paymentLink.findFirst({
    where: { studentId: { not: null } },
    orderBy: { createdAt: 'desc' },
    include: { student: true }
  });
  return NextResponse.json(latestLink || {});
}
