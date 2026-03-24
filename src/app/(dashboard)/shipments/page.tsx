import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShipmentsPageClient } from "./shipments-page-client";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shipments = await prisma.shipment.findMany({
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

  return <ShipmentsPageClient shipments={JSON.parse(JSON.stringify(shipments))} />;
}
