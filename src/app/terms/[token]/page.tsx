import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TermsPublicForm from "./form";

export const dynamic = "force-dynamic";

export default async function PublicTermsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Find the payment link by token
  const link = await prisma.paymentLink.findUnique({
    where: { token },
    include: {
      course: { select: { fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  if (!link || !link.studentId) {
    notFound();
  }

  // Check if already accepted terms for this student
  const existingAcceptance = await (prisma as any).termsAcceptance.findFirst({
    where: { studentId: link.studentId },
    orderBy: { acceptedAt: "desc" },
  });

  if (existingAcceptance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <svg className="mx-auto h-16 w-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">התקנון כבר אושר</h1>
          <p className="text-gray-600 mb-2">
            {link.firstName}, כבר אישרת את התקנון בתאריך{" "}
            <strong>{new Date(existingAcceptance.acceptedAt).toLocaleDateString("he-IL")}</strong>.
          </p>
          <p className="text-gray-500 text-sm">
            עותק חתום נשלח למייל שלך.
          </p>
        </div>
      </div>
    );
  }

  const courseName = link.course?.fullNameOverride || link.course?.fullNameMoodle || link.courseName || "";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6 text-center">
            <h1 className="text-2xl font-bold mb-1">אישור תקנון הקורס</h1>
            <p className="text-blue-100">
              {link.firstName}, אנא קרא את התקנון בעיון וחתום בתחתית העמוד
            </p>
            {courseName && (
              <p className="text-blue-200 text-sm mt-2">קורס: {courseName}</p>
            )}
          </div>

          {/* Form */}
          <TermsPublicForm
            token={token}
            studentId={link.studentId}
            firstName={link.firstName}
            email={link.email || ""}
            courseName={courseName}
          />
        </div>
      </div>
    </div>
  );
}
