import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/shipments/[id] — get single shipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          id: true,
          hebrewName: true,
          firstNameMoodle: true,
          firstNameOverride: true,
          lastNameMoodle: true,
          lastNameOverride: true,
        },
      },
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  return NextResponse.json(shipment);
}

// PATCH /api/shipments/[id] — update shipment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "carrier",
    "status",
    "trackingNumber",
    "recipientName",
    "address",
    "city",
    "country",
    "postalCode",
    "state",
    "recipientNameEn",
    "phone",
    "email",
    "packageCount",
    "remarks",
    "carrierRef",
    "carrierStatus",
    "weight",
    "contentDescription",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  // If status changes to delivered, set deliveredAt
  if (data.status === "delivered") {
    data.deliveredAt = new Date();
  }

  const shipment = await prisma.shipment.update({
    where: { id },
    data,
  });

  return NextResponse.json(shipment);
}

// DELETE /api/shipments/[id] — delete shipment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.shipment.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
