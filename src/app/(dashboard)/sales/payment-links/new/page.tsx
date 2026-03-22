import { prisma } from "@/lib/prisma";
import { getCourseName } from "@/lib/utils";
import { CreatePaymentLinkForm } from "@/components/sales/create-payment-link-form";

export const dynamic = "force-dynamic";

export default async function NewPaymentLinkPage() {
  const [agents, courses, tags, discountGroups] = await Promise.all([
    prisma.salesAgent.findMany({
      where: { isActive: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.course.findMany({
      orderBy: { fullNameMoodle: "asc" },
      select: {
        id: true,
        fullNameMoodle: true,
        fullNameOverride: true,
        tags: {
          include: { tag: { select: { id: true, name: true, defaultPriceILS: true, defaultPriceUSD: true, defaultNumPayments: true } } },
        },
        semesters: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true },
        },
        classGroups: {
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.tag.findMany({
      where: { category: "subject" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, defaultPriceILS: true, defaultPriceUSD: true, defaultNumPayments: true },
    }),
    prisma.discountGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, discountType: true, discountValue: true, color: true },
    }),
  ]);

  const agentOptions = agents.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
  }));

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: getCourseName(c),
    semesters: c.semesters,
    classGroups: c.classGroups,
    tags: c.tags.map((ct) => ct.tag),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">יצירת קישור תשלום חדש</h1>
      <CreatePaymentLinkForm
        agents={agentOptions}
        courses={courseOptions}
        tags={tags}
        discountGroups={discountGroups}
      />
    </div>
  );
}
