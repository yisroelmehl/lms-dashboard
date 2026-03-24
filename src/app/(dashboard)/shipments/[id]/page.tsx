import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { ShipmentDetailClient } from "./shipment-detail-client";

export const dynamic = "force-dynamic";

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

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
          city: true,
          address: true,
        },
      },
    },
  });

  if (!shipment) notFound();

  return (
    <ShipmentDetailClient
      shipment={JSON.parse(JSON.stringify(shipment))}
    />
  );
}
