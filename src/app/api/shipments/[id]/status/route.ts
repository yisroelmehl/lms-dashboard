import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBaldarStatus, BALDAR_STATUS_MAP } from "@/lib/shipping/yahav-baldar";

// POST /api/shipments/[id]/status — refresh status from carrier API
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shipment = await prisma.shipment.findUnique({ where: { id } });
  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  if (!shipment.trackingNumber) {
    return NextResponse.json(
      { error: "No tracking number to check" },
      { status: 400 }
    );
  }

  if (shipment.carrier === "yahav_baldar") {
    const result = await getBaldarStatus(shipment.trackingNumber);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to check status" },
        { status: 502 }
      );
    }

    const statusInfo = result.deliveryStatus
      ? BALDAR_STATUS_MAP[result.deliveryStatus]
      : undefined;

    const updateData: Record<string, unknown> = {
      carrierStatus: result.statusLabel,
      carrierRawData: result.rawData,
    };

    if (statusInfo) {
      updateData.status = statusInfo.status;
    }

    if (result.mappedStatus === "delivered" && result.exeTime) {
      updateData.deliveredAt = new Date(result.exeTime);
    }

    const updated = await prisma.shipment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      shipment: updated,
      baldarStatus: {
        code: result.deliveryStatus,
        label: result.statusLabel,
        receiver: result.receiver,
        exeTime: result.exeTime,
      },
    });
  }

  // DHL and other carriers - placeholder
  return NextResponse.json(
    { error: "Status refresh not implemented for this carrier" },
    { status: 501 }
  );
}
