import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PaymentLinksTable } from "@/components/sales/payment-links-table";

export const dynamic = "force-dynamic";

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
        <h1 className="text-2xl font-bold">קישורי תשלום ורישום</h1>
        <Link
          href="/sales/payment-links/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          + הוספת תלמיד חדש
        </Link>
      </div>

      <PaymentLinksTable initialLinks={links} />
    </div>
  );
}
