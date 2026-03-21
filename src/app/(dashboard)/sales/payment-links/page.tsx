import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateHe } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  sent: { label: "נשלח", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
  opened: { label: "נפתח", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200" },
  paid: { label: "שולם", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
  failed: { label: "נכשל", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" },
  cancelled: { label: "בוטל", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  expired: { label: "פג תוקף", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200" },
};

export default async function PaymentLinksPage() {
  const links = await prisma.paymentLink.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      salesAgent: { select: { firstName: true, lastName: true } },
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      _count: { select: { payments: { where: { isSuccess: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">קישורי תשלום</h1>
        <Link
          href="/sales/payment-links/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + קישור חדש
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">שם</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">קורס</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">סכום</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">תשלומים</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">סטטוס</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">איש מכירות</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">נוצר</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  אין קישורי תשלום.{" "}
                  <Link href="/sales/payment-links/new" className="text-primary hover:underline">
                    צור קישור חדש
                  </Link>
                </td>
              </tr>
            ) : (
              links.map((link) => {
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
                    <td className="px-4 py-3 text-sm">{link.numPayments}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${sc.className}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{link.salesAgent.firstName} {link.salesAgent.lastName}</td>
                    <td className="px-4 py-3 text-sm">{formatDateHe(link.createdAt)}</td>
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
