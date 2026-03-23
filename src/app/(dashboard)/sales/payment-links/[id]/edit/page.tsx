import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreatePaymentLinkForm } from "@/components/sales/create-payment-link-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EditPaymentLinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [link, agents, courses, tags, discountGroups] = await Promise.all([
    prisma.paymentLink.findUnique({
      where: { id },
    }),
    prisma.salesAgent.findMany({
      where: { isActive: true },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.course.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        semesters: { orderBy: { sortOrder: "asc" } },
        classGroups: { orderBy: { name: "asc" } },
        tags: { include: { tag: true } },
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.discountGroup.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!link) notFound();

  // Map courses and tags to match props format
  const mappedCourses = courses.map((course) => ({
    id: course.id,
    name: course.fullNameOverride || course.fullNameMoodle || "",
    semesters: course.semesters.map((s) => ({ id: s.id, name: s.name })),
    classGroups: course.classGroups.map((cg) => ({ id: cg.id, name: cg.name })),
    tags: course.tags.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      defaultPriceILS: t.tag.defaultPriceILS,
      defaultPriceUSD: t.tag.defaultPriceUSD,
      defaultNumPayments: t.tag.defaultNumPayments,
    })),
  }));

  const mappedAgents = agents.map((a) => ({
    id: a.id,
    name: `${a.firstName} ${a.lastName}`,
  }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href={`/sales/payment-links/${id}`} className="text-muted-foreground hover:text-foreground">
          ← חזרה
        </Link>
        <h1 className="text-2xl font-bold">עריכת תלמיד / קישור תשלום</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <CreatePaymentLinkForm
          agents={mappedAgents}
          courses={mappedCourses}
          tags={tags}
          discountGroups={discountGroups}
          initialData={link}
        />
      </div>
    </div>
  );
}