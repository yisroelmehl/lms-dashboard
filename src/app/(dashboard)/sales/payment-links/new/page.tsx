import { prisma } from "@/lib/prisma";
import { getCourseName } from "@/lib/utils";
import { CreatePaymentLinkForm } from "@/components/sales/create-payment-link-form";

export const dynamic = "force-dynamic";

export default async function NewPaymentLinkPage() {
  const [agents, courses] = await Promise.all([
    prisma.salesAgent.findMany({
      where: { isActive: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.course.findMany({
      orderBy: { fullNameMoodle: "asc" },
      select: { id: true, fullNameMoodle: true, fullNameOverride: true },
    }),
  ]);

  const agentOptions = agents.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
  }));

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: getCourseName(c),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">יצירת קישור תשלום חדש</h1>
      <CreatePaymentLinkForm agents={agentOptions} courses={courseOptions} />
    </div>
  );
}
