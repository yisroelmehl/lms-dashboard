import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveField } from "@/lib/utils";
import { StudentRegistrationForm } from "@/components/students/student-registration-form";

export const dynamic = "force-dynamic";

export default async function RegisterStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Fetch only necessary non-sensitive data
  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      firstNameMoodle: true,
      lastNameMoodle: true,
      firstNameOverride: true,
      lastNameOverride: true,
      emailMoodle: true,
      emailOverride: true,
      phoneMoodle: true,
      phoneOverride: true,
      hebrewName: true,
      city: true,
      address: true,
      dateOfBirth: true,
      torahBackground: true,
      smichaBackground: true,
      studyPreferences: true,
      hasChavrusa: true,
      participationType: true,
    },
  });

  if (!student) {
    notFound();
  }

  const firstName = resolveField(student.firstNameMoodle, student.firstNameOverride) || "";
  const lastName = resolveField(student.lastNameMoodle, student.lastNameOverride) || "";
  const email = resolveField(student.emailMoodle, student.emailOverride) || "";
  const phone = resolveField(student.phoneMoodle, student.phoneOverride) || "";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 dir-rtl">
      <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-8 text-center text-white">
          <h1 className="text-3xl font-bold">ברוכים הבאים</h1>
          <p className="mt-2 opacity-90 text-lg">טופס רישום והשלמת פרטים אישיים</p>
          <p className="mt-1 font-semibold">{firstName} {lastName}</p>
        </div>
        <div className="p-8">
          <StudentRegistrationForm 
            studentId={student.id}
            initialData={{
              hebrewName: student.hebrewName || "",
              email: email,
              phone: phone,
              city: student.city || "",
              address: student.address || "",
              addressNum: "",
              dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split("T")[0] : "",
              torahBackground: student.torahBackground || "",
              smichaBackground: student.smichaBackground || "",
              studyPreferences: student.studyPreferences || "",
              hasChavrusa: student.hasChavrusa,
              participationType: student.participationType || "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
