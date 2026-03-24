import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBaldarShipment } from "@/lib/shipping/yahav-baldar";

// POST /api/shipments/[id]/send — send a pending shipment to Baldar
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

  if (shipment.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending shipments can be sent to carrier" },
      { status: 400 }
    );
  }

  if (shipment.carrier !== "yahav_baldar") {
    return NextResponse.json(
      { error: "Only Yahav/Baldar shipments can be sent automatically" },
      { status: 400 }
    );
  }

  if (!shipment.city) {
    return NextResponse.json(
      { error: "City is required to send shipment" },
      { status: 400 }
    );
  }

  try {
    const result = await createBaldarShipment({
      recipientName: shipment.recipientName,
      address: shipment.address || "",
      city: shipment.city,
      phone: shipment.phone || "",
      email: shipment.email || "",
      orderNum: shipment.id.slice(-8),
      remarks: shipment.remarks || undefined,
      packageCount: shipment.packageCount,
    });

    if (result.success && result.deliveryNumber) {
      const updated = await prisma.shipment.update({
        where: { id },
        data: {
          status: "created",
          trackingNumber: result.deliveryNumber,
          carrierRef: result.deliveryNumber,
        },
      });
      return NextResponse.json(updated);
    } else {
      return NextResponse.json(
        { error: result.error || "Baldar API returned an error" },
        { status: 502 }
      );
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("Failed to send shipment to Baldar:", errorMsg, e);
    return NextResponse.json(
      { error: `Failed to communicate with Baldar API: ${errorMsg}` },
      { status: 502 }
    );
  }
}
