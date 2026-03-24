import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/shipments/[id]/label — download PDF label
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
    select: { id: true, labelData: true, trackingNumber: true, carrier: true },
  });

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  if (!shipment.labelData) {
    return NextResponse.json(
      { error: "No label available for this shipment" },
      { status: 404 }
    );
  }

  const pdfBuffer = Buffer.from(shipment.labelData, "base64");
  const filename = `DHL-Label-${shipment.trackingNumber || shipment.id}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
