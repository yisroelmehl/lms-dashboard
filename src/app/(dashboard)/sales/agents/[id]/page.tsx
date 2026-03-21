import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateHe, formatDateTimeHe, getCourseName } from "@/lib/utils";
import { SalesAgentEditForm } from "@/components/sales/sales-agent-edit-form";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-gray-100 text-gray-700" },
  sent: { label: "נשלח", className: "bg-blue-100 text-blue-700" },
  opened: { label: "נפתח", className: "bg-yellow-100 text-yellow-700" },
  paid: { label: "שולם", className: "bg-green-100 text-green-700" },
  failed: { label: "נכשל", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-gray-100 text-gray-700" },
  expired: { label: "פג תוקף", className: "bg-orange-100 text-orange-700" },
};

export default async function SalesAgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const agent = await prisma.salesAgent.findUnique({
    where: { id },
    include: {
      paymentLinks: {
        orderBy: { createdAt: "desc" },
        include: {
          course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
        },
      },
      payments: {
        where: { isSuccess: true },
        orderBy: { processedAt: "desc" },
      },
    },
  });

  if (!agent) notFound();

  const totalRevenue = agent.payments.reduce((sum, p) => sum + p.amount, 0);
  const paidLinks = agent.paymentLinks.filter((l) => l.status === "paid");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/sales" className="text-sm text-muted-foreground hover:underline">
            ← חזרה למכירות
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {agent.firstName} {agent.lastName}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${
          agent.isActive
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}>
          {agent.isActive ? "פעיל" : "לא פעיל"}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">סה"כ קישורים</p>
          <p className="text-2xl font-bold">{agent.paymentLinks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">שולמו</p>
          <p className="text-2xl font-bold">{paidLinks.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">אחוז המרה</p>
          <p className="text-2xl font-bold">
            {agent.paymentLinks.length > 0
              ? Math.round((paidLinks.length / agent.paymentLinks.length) * 100)
              : 0}%
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">סה"כ הכנסות</p>
          <p className="text-2xl font-bold">₪{totalRevenue.toLocaleString("he-IL")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Edit Form */}
        <div className="lg:col-span-1">
          <SalesAgentEditForm agent={{
            id: agent.id,
            firstName: agent.firstName,
            lastName: agent.lastName,
            email: agent.email || "",
            phone: agent.phone || "",
            isActive: agent.isActive,
          }} />
        </div>

        {/* Payment Links */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">קישורי תשלום</h2>
            <Link
              href={`/sales/payment-links/new`}
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:bg-primary/90"
            >
              + קישור חדש
            </Link>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">שם</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">קורס</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">סכום</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">סטטוס</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {agent.paymentLinks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      אין קישורי תשלום עדיין.
                    </td>
                  </tr>
                ) : (
                  agent.paymentLinks.map((link) => {
                    const sc = statusConfig[link.status] || statusConfig.draft;
                    return (
                      <tr key={link.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="px-4 py-2">
                          <Link href={`/sales/payment-links/${link.id}`} className="text-sm text-primary hover:underline">
                            {link.firstName} {link.lastName}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {link.course ? getCourseName(link.course) : (link.courseName || "—")}
                        </td>
                        <td className="px-4 py-2 text-sm">₪{link.finalAmount.toLocaleString("he-IL")}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${sc.className}`}>{sc.label}</span>
                        </td>
                        <td className="px-4 py-2 text-sm">{formatDateHe(link.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
