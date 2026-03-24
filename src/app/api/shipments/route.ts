import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBaldarShipment } from "@/lib/shipping/yahav-baldar";
import { createDhlShipment } from "@/lib/shipping/dhl";

// GET /api/shipments — list all shipments
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status");
  const carrier = searchParams.get("carrier");

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = studentId;
  if (status) where.status = status;
  if (carrier) where.carrier = carrier;

  const shipments = await prisma.shipment.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          hebrewName: true,
          firstNameMoodle: true,
          firstNameOverride: true,
          lastNameMoodle: true,
          lastNameOverride: true,
          city: true,
          address: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(shipments);
}

// POST /api/shipments — create a new shipment
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    studentId,
    carrier = "yahav_baldar",
    recipientName,
    address,
    city,
    country = "IL",
    phone,
    email,
    packageCount = 1,
    remarks,
    sendNow = false, // Whether to immediately send to carrier API
    // DHL-specific fields
    weight,
    contentDescription,
    postalCode,
  } = body;

  if (!studentId || !recipientName) {
    return NextResponse.json(
      { error: "studentId and recipientName are required" },
      { status: 400 }
    );
  }

  // Create shipment record
  const shipment = await prisma.shipment.create({
    data: {
      studentId,
      carrier,
      recipientName,
      address,
      city,
      country,
      phone,
      email,
      packageCount,
      remarks,
      weight: weight ? parseFloat(weight) : undefined,
      contentDescription,
      status: "pending",
    },
  });

  // If sendNow and domestic (yahav_baldar), submit to Baldar API
  if (sendNow && carrier === "yahav_baldar" && city) {
    try {
      const result = await createBaldarShipment({
        recipientName,
        address: address || "",
        city,
        phone: phone || "",
        email: email || "",
        orderNum: shipment.id.slice(-8),
        remarks,
        packageCount,
      });

      if (result.success && result.deliveryNumber) {
        const updated = await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: "created",
            trackingNumber: result.deliveryNumber,
            carrierRef: result.deliveryNumber,
          },
        });
        return NextResponse.json(updated, { status: 201 });
      } else {
        // Shipment created locally but Baldar failed - keep as pending
        const updated = await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            carrierRawData: { error: result.error },
          },
        });
        return NextResponse.json(
          { ...updated, baldarError: result.error },
          { status: 201 }
        );
      }
    } catch (e) {
      console.error("Failed to create Baldar shipment:", e);
      // Keep the local record
    }
  }

  // If sendNow and DHL, submit to DHL Express API
  if (sendNow && carrier === "dhl" && city) {
    try {
      const result = await createDhlShipment({
        recipientName,
        address: address || "",
        city,
        countryCode: country || "US",
        postalCode: postalCode || "",
        phone: phone || "",
        email: email || "",
        weight: weight ? parseFloat(weight) : 1,
        description: contentDescription || "Books / Educational materials",
        packageCount,
        reference: shipment.id.slice(-8),
      });

      if (result.success && result.trackingNumber) {
        const updated = await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            status: "created",
            trackingNumber: result.trackingNumber,
            carrierRef: result.shipmentId || result.trackingNumber,
            labelData: result.labelBase64 || null,
            carrierRawData: result.rawResponse as object || undefined,
          },
        });
        return NextResponse.json(updated, { status: 201 });
      } else {
        const updated = await prisma.shipment.update({
          where: { id: shipment.id },
          data: {
            carrierRawData: { error: result.error },
          },
        });
        return NextResponse.json(
          { ...updated, dhlError: result.error },
          { status: 201 }
        );
      }
    } catch (e) {
      console.error("Failed to create DHL shipment:", e);
    }
  }

  return NextResponse.json(shipment, { status: 201 });
}
