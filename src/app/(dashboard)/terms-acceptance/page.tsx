import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TermsAcceptanceForm from "./form";

export default async function TermsAcceptancePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  // Get student info
  const student = await prisma.student.findFirst({
    where: {
      OR: [
        { emailMoodle: { equals: session.user.email, mode: "insensitive" } },
        { emailOverride: { equals: session.user.email, mode: "insensitive" } },
      ],
    },
  });

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">שגיאה</h1>
            <p className="text-gray-700">לא בוצעה מציאת פרטי התלמיד. אנא פנה לתמיכה.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if already accepted
  const existingAcceptance = await (prisma as any).termsAcceptance.findFirst({
    where: { studentId: student.id },
    orderBy: { acceptedAt: "desc" },
  });

  if (existingAcceptance) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-green-600 mb-4">✓ התקנון כבר אושר</h1>
            <p className="text-gray-700 mb-4">
              אתה כבר אישרת את התקנון בתאריך{" "}
              <strong>{new Date(existingAcceptance.acceptedAt).toLocaleDateString("he-IL")}</strong>
            </p>
            <p className="text-gray-600 text-sm mb-4">
              ניתן להוריד את חתימתך מדף ניהול התקנונים.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              חזרה לדשבורד
            </a>
          </div>
        </div>
      </div>
    );
  }

  const firstName = student.firstNameOverride || student.firstNameMoodle || "תלמיד";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-3xl font-bold">אישור תקנון הקורס</h1>
            <p className="text-blue-100 mt-2">אנא קרא בעיון ואשר את התקנון</p>
          </div>

          {/* Form */}
          <TermsAcceptanceForm
            studentId={student.id}
            firstName={firstName}
            email={session.user.email}
          />
        </div>
      </div>
    </div>
  );
}
