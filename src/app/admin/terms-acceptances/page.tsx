import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminTermsAcceptancesPage() {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Fetch all terms acceptances
  const termsAcceptances = await (prisma as any).termsAcceptance.findMany({
    include: {
      student: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      acceptedAt: "desc",
    },
  }) as any[];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-right">אישורי תקנון</h1>

      {termsAcceptances.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded">
          <p className="text-gray-500">אין אישורי תקנון עדיין</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-100">
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  תאריך
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  קורס
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  אימייל
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  שם
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold">
                  פעולות
                </th>
              </tr>
            </thead>
            <tbody>
              {termsAcceptances.map((acceptance: any) => (
                <tr
                  key={acceptance.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm">
                    {acceptance.acceptedAt
                      ? new Date(acceptance.acceptedAt).toLocaleDateString(
                          "he-IL"
                        )
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">{acceptance.courseName}</td>
                  <td className="px-4 py-3 text-sm">{acceptance.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {acceptance.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <a
                      href={`/api/terms-acceptances/${acceptance.id}/download`}
                      download={acceptance.pdfFileName || "terms.pdf"}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      הורד PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
