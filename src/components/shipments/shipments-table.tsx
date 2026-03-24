"use client";

import { useState } from "react";
import Link from "next/link";

interface Shipment {
  id: string;
  studentId: string;
  carrier: string;
  status: string;
  trackingNumber: string | null;
  recipientName: string;
  address: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  carrierStatus: string | null;
  packageCount: number;
  remarks: string | null;
  deliveredAt: string | null;
  createdAt: string;
  student: {
    id: string;
    hebrewName: string | null;
    firstNameOverride: string | null;
    lastNameOverride: string | null;
    firstNameMoodle: string | null;
    lastNameMoodle: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "ממתין", color: "bg-yellow-100 text-yellow-800" },
  created: { label: "נוצר", color: "bg-blue-100 text-blue-800" },
  in_transit: { label: "בדרך", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "נמסר", color: "bg-green-100 text-green-800" },
  cancelled: { label: "בוטל", color: "bg-red-100 text-red-800" },
  returned: { label: "הוחזר", color: "bg-orange-100 text-orange-800" },
};

const CARRIER_LABELS: Record<string, string> = {
  yahav_baldar: "יהב / בלדר",
  dhl: "DHL",
  other: "אחר",
};

function getStudentName(student: Shipment["student"]) {
  if (student.hebrewName) return student.hebrewName;
  const first = student.firstNameOverride || student.firstNameMoodle || "";
  const last = student.lastNameOverride || student.lastNameMoodle || "";
  return `${first} ${last}`.trim() || "—";
}

export function ShipmentsTable({
  shipments: initialShipments,
}: {
  shipments: Shipment[];
}) {
  const [shipments, setShipments] = useState(initialShipments);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered =
    filter === "all"
      ? shipments
      : shipments.filter((s) => s.status === filter);

  async function refreshStatus(id: string) {
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/shipments/${id}/status`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setShipments((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...data.shipment } : s))
        );
      }
    } catch (e) {
      console.error("Failed to refresh status:", e);
    } finally {
      setRefreshingId(null);
    }
  }

  const counts = {
    all: shipments.length,
    pending: shipments.filter((s) => s.status === "pending").length,
    created: shipments.filter((s) => s.status === "created").length,
    in_transit: shipments.filter((s) => s.status === "in_transit").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
  };

  return (
    <div className="space-y-4">
      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            ["all", `הכל (${counts.all})`],
            ["pending", `ממתין (${counts.pending})`],
            ["created", `נוצר (${counts.created})`],
            ["in_transit", `בדרך (${counts.in_transit})`],
            ["delivered", `נמסר (${counts.delivered})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-right font-medium">תלמיד</th>
                <th className="px-4 py-3 text-right font-medium">נמען</th>
                <th className="px-4 py-3 text-right font-medium">עיר</th>
                <th className="px-4 py-3 text-right font-medium">חברה</th>
                <th className="px-4 py-3 text-right font-medium">סטטוס</th>
                <th className="px-4 py-3 text-right font-medium">מספר מעקב</th>
                <th className="px-4 py-3 text-right font-medium">תאריך</th>
                <th className="px-4 py-3 text-right font-medium">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    אין משלוחים להצגה
                  </td>
                </tr>
              ) : (
                filtered.map((shipment) => {
                  const statusInfo = STATUS_LABELS[shipment.status] || {
                    label: shipment.status,
                    color: "bg-gray-100 text-gray-800",
                  };

                  return (
                    <tr key={shipment.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link
                          href={`/students/${shipment.studentId}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {getStudentName(shipment.student)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{shipment.recipientName}</td>
                      <td className="px-4 py-3">
                        {shipment.city || "—"}
                        {shipment.country !== "IL" && (
                          <span className="text-xs text-muted-foreground mr-1">
                            ({shipment.country})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {CARRIER_LABELS[shipment.carrier] || shipment.carrier}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                        >
                          {shipment.carrierStatus || statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {shipment.trackingNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(shipment.createdAt).toLocaleDateString(
                          "he-IL"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {shipment.trackingNumber && (
                          <button
                            onClick={() => refreshStatus(shipment.id)}
                            disabled={refreshingId === shipment.id}
                            className="text-xs text-primary hover:underline disabled:opacity-50"
                          >
                            {refreshingId === shipment.id
                              ? "בודק..."
                              : "🔄 עדכן סטטוס"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
