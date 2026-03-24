"use client";

import { useRouter } from "next/navigation";
import { ShipmentsHeader } from "@/components/shipments/shipments-header";
import { ShipmentsTable } from "@/components/shipments/shipments-table";

export function ShipmentsPageClient({ shipments }: { shipments: any[] }) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <ShipmentsHeader onRefresh={() => router.refresh()} />
      <div className="rounded-lg border border-border bg-card p-6">
        <ShipmentsTable shipments={shipments} />
      </div>
    </div>
  );
}
