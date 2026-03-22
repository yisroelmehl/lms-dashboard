import { prisma } from "@/lib/prisma";
import Link from "next/link";
// We will use standard unicode or custom SVGs since lucide-react might not be installed or named differently

interface PageProps {
  searchParams: Promise<{
    token?: string;
    adddata?: string;
    transactionNumber?: string;
  }>;
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const { token, adddata, transactionNumber } = await searchParams;

  // The token can come from our custom redirect ?token=... or directly from Kesher ?adddata=...
  const linkToken = token || adddata;

  if (!linkToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <svg className="mx-auto h-16 w-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">התשלום התקבל בהצלחה!</h1>
          <p className="text-gray-600">
            תודה רבה על תשלומך. אם מספר העסקה שלך הוא {transactionNumber}, התשלום עבר בהצלחה.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-blue-600 hover:underline">
              חזרה לדף הבית
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Find the payment link and related course/student info
  const link = await prisma.paymentLink.findUnique({
    where: { token: linkToken },
    include: {
      course: true,
      student: true,
    },
  });

  if (!link) {
    // We couldn't find the link, but payment might have succeeded ( Kesher token missing issue)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <svg className="mx-auto h-16 w-16 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">התשלום התקבל בהצלחה!</h1>
          <p className="text-gray-600 mb-4">
            שילמת בהצלחה, אך חסרים פרטי הזיהוי של הקישור. 
            המשרד עודכן ויטפל ברישום שלך בהקדם.
          </p>
          {transactionNumber && (
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-700 font-mono mb-6">
              מספר עסקה: {transactionNumber}
            </div>
          )}
        </div>
      </div>
    );
  }

  // At this point we have the full details!
  const moodleUrl = process.env.MOODLE_BASE_URL || process.env.MOODLE_URL || "https://lmy-courses.co.il";
  const courseUrl = link.course?.moodleCourseId 
    ? `${moodleUrl}/course/view.php?id=${link.course.moodleCourseId}` 
    : moodleUrl;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="bg-green-600 p-8 text-center text-white">
          <svg className="mx-auto h-20 w-20 mb-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <h1 className="text-3xl font-bold mb-2">{link.isRegistrationOnly ? "הרישום בוצע בהצלחה!" : "התשלום בוצע בהצלחה!"}</h1>
          <p className="text-green-100 text-lg">
            תודה רבה, {link.firstName}! רישומך התקבל.
          </p>
        </div>

        <div className="p-8 space-y-6">
          
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3 border-b pb-2">פרטי ההזמנה</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">שם הקורס:</span>
                <span className="font-medium text-gray-900">
                  {link.course?.fullNameOverride || link.course?.fullNameMoodle || "רישום כללי"}
                </span>
              </div>
              {!link.isRegistrationOnly && (
                <div className="flex justify-between">
                  <span className="text-gray-500">סכום ששולם:</span>
                  <span className="font-medium text-gray-900">
                    {link.currency === "USD" ? "$" : "₪"}{link.finalAmount.toLocaleString("he-IL")}
                  </span>
                </div>
              )}
              {(transactionNumber || link.kesherTransactionNum) && (
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500">מספר אישור קשר:</span>
                  <span className="font-mono text-gray-900 text-xs mt-0.5">
                    {transactionNumber || link.kesherTransactionNum}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Moodle Instructions */}
          {link.courseId && (
            <div className="bg-amber-50 rounded-lg p-6 border border-amber-200 text-center">
              <h3 className="text-xl font-bold text-amber-900 mb-2">🎓 חיבור למערכת הלימודים בקרוב</h3>
              <p className="text-amber-800 text-sm mb-4">
                תודה על הרישום! המשרד יטפל בחיבור חשבונך למערכת הלמידה (Moodle) בהקדם האפשري ויודיע לך.
              </p>
              
              <div className="bg-white rounded-lg p-4 border border-amber-100 space-y-3 text-right">
                <p className="font-semibold text-amber-900">📞 אם יש שאלות, צור קשר:</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>📧 דוא״ל:</strong> <a href="mailto:lyk@lemaanyilmedo.org" className="text-blue-600 hover:underline">lyk@lemaanyilmedo.org</a>
                  </p>
                  <p>
                    <strong>📱 טלפון / וואצאפ:</strong> <a href="tel:+972553082335" className="text-blue-600 hover:underline">+972 55-308-2335</a>
                  </p>
                </div>
              </div>

              <p className="text-xs text-amber-700 mt-4">
                📬 אנחנו נשלח לך המייל הראשון עם הנושא "מערכת הלימודים שלך מוכנה" כשהחשבון שלך יהיה פעיל.
              </p>
            </div>
          )}

          <div className="text-center text-sm text-gray-500 pt-4 border-t flex flex-col items-center gap-2">
            {!link.isRegistrationOnly && <p>קבלה דיגיטלית תשלח אליך למייל בקרוב.</p>}
            <p className="flex items-center gap-1.5"><span className="w-4 h-4" /> לשאלות ותמיכה, ניתן לפנות למזכירות.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
