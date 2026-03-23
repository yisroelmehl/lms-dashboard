"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateHe } from "@/lib/utils";
import { useRouter } from "next/navigation";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-gray-100 text-gray-700" },
  sent: { label: "נשלח", className: "bg-blue-100 text-blue-700" },
  opened: { label: "נפתח", className: "bg-yellow-100 text-yellow-700" },
  paid: { label: "שולם", className: "bg-green-100 text-green-700" },
  failed: { label: "נכשל", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-gray-100 text-gray-700" },
  expired: { label: "פג תוקף", className: "bg-orange-100 text-orange-700" },
};

type PaymentLink = any;

export function PaymentLinksTable({ initialLinks }: { initialLinks: PaymentLink[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filteredLinks = initialLinks.filter((link) => {
    const matchesSearch = 
      `${link.firstName} ${link.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (link.course?.fullNameOverride || link.course?.fullNameMoodle || link.courseName || "").toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || link.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק תלמיד/קישור זה לצמיתות? לא ניתן לשחזר.")) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/payment-links/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "שגיאה במחיקת הקישור");
      }
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="חיפוש לפי שם תלמיד או קורס..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm w-48"
        >
          <option value="all">כל הסטטוסים</option>
          <option value="paid">שולם / נרשם</option>
          <option value="opened">נפתח</option>
          <option value="failed">נכשל</option>
          <option value="sent">נשלח</option>
          <option value="draft">טיוטה</option>
          <option value="cancelled">בוטל</option>
          <option value="expired">פג תוקף</option>
        </select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">שם</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">קורס</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">סכום</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">סטטוס</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">איש מכירות</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">נוצר</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredLinks.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  אין קישורי תשלום תואמים.
                </td>
              </tr>
            ) : (
              filteredLinks.map((link) => {
                const sc = statusConfig[link.status] || statusConfig.draft;
                return (
                  <tr key={link.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales/payment-links/${link.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {link.firstName} {link.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {link.course
                        ? (link.course.fullNameOverride || link.course.fullNameMoodle)
                        : (link.courseName || "—")}
                    </td>
                    <td className="px-4 py-3 text-sm">₪{link.finalAmount.toLocaleString("he-IL")}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${sc.className}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{link.salesAgent.firstName} {link.salesAgent.lastName}</td>
                    <td className="px-4 py-3 text-sm">{formatDateHe(link.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/sales/payment-links/${link.id}/edit`}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          עריכה
                        </Link>
                        <button
                          onClick={() => handleDelete(link.id)}
                          disabled={deleting === link.id}
                          className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          {deleting === link.id ? "מוחק..." : "מחיקה"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}