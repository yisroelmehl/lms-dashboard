import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateHe } from "@/lib/utils";
import { SalesAgentActions } from "@/components/sales/sales-agent-actions";
import { SalesManagementButtons } from "@/components/sales/sales-management-buttons";
import { MonthlySalesDashboard } from "@/components/sales/monthly-sales-dashboard";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const currentMonthName = monthNames[startOfMonth.getMonth()];

  const [agents, recentLinks, stats, thisMonthLinks] = await Promise.all([
    prisma.salesAgent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            paymentLinks: true,
            payments: { where: { isSuccess: true } },
          },
        },
      },
    }),
    prisma.paymentLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        salesAgent: { select: { firstName: true, lastName: true } },
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      },
    }),
    prisma.payment.aggregate({
      where: { isSuccess: true },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.paymentLink.findMany({
      where: {
        status: "paid",
        paidAt: {
          gte: startOfMonth,
          lt: endOfMonth,
        }
      },
      include: {
        salesAgent: { select: { id: true, firstName: true, lastName: true } },
        course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      }
    }),
  ]);

  const totalRevenue = stats._sum.amount || 0;
  const totalPayments = stats._count;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מכירות וסליקה</h1>
        <div className="flex gap-2">
          <SalesManagementButtons />
          <Link
            href="/sales/payment-links/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + קישור תשלום חדש
          </Link>
        </div>
      </div>

      <MonthlySalesDashboard links={thisMonthLinks} monthName={currentMonthName} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">אנשי מכירות פעילים</p>
          <p className="text-2xl font-bold">{agents.filter((a) => a.isActive).length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">סה"כ תשלומים מוצלחים</p>
          <p className="text-2xl font-bold">{totalPayments}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
          <p className="text-2xl font-bold">₪{totalRevenue.toLocaleString("he-IL")}</p>
        </div>
      </div>

      {/* Sales Agents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">אנשי מכירות</h2>
          <SalesAgentActions />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">שם</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">אימייל</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">טלפון</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">קישורים</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">תשלומים</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    אין אנשי מכירות. הוסף איש מכירות חדש כדי להתחיל.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sales/agents/${agent.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {agent.firstName} {agent.lastName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm" dir="ltr">{agent.email || "—"}</td>
                    <td className="px-4 py-3 text-sm" dir="ltr">{agent.phone || "—"}</td>
                    <td className="px-4 py-3 text-sm">{agent._count.paymentLinks}</td>
                    <td className="px-4 py-3 text-sm">{agent._count.payments}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        agent.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                      }`}>
                        {agent.isActive ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Payment Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">קישורי תשלום אחרונים</h2>
          <Link href="/sales/payment-links" className="text-sm text-primary hover:underline">
            הצג הכל
          </Link>
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
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">תאריך</th>
              </tr>
            </thead>
            <tbody>
              {recentLinks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    אין קישורי תשלום עדיין.
                  </td>
                </tr>
              ) : (
                recentLinks.map((link) => (
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
                      {link.course ? (link.course.fullNameOverride || link.course.fullNameMoodle) : (link.courseName || "—")}
                    </td>
                    <td className="px-4 py-3 text-sm">₪{link.finalAmount.toLocaleString("he-IL")}</td>
                    <td className="px-4 py-3">
                      <PaymentLinkStatusBadge status={link.status} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {link.salesAgent.firstName} {link.salesAgent.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDateHe(link.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PaymentLinkStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "טיוטה", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    sent: { label: "נשלח", className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" },
    opened: { label: "נפתח", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200" },
    paid: { label: "שולם", className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200" },
    failed: { label: "נכשל", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" },
    cancelled: { label: "בוטל", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    expired: { label: "פג תוקף", className: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200" },
  };

  const c = config[status] || config.draft;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${c.className}`}>
      {c.label}
    </span>
  );
}
