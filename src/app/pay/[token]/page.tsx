import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentRegistrationForm } from "@/components/sales/payment-registration-form";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status: paymentStatus } = await searchParams;

  const link = await prisma.paymentLink.findUnique({
    where: { token },
    include: {
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
    },
  });

  if (!link) notFound();

  // Redirect to new dedicated success page
  if (paymentStatus === "success" || link.status === "paid") {
    redirect(`/pay/success?token=${token}`);
  }

  // Handle payment failure callback
  if (paymentStatus === "failed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-2xl font-bold text-red-700">התשלום לא הושלם</h1>
          <p className="text-muted-foreground">
            לצערנו, התשלום לא עבר. אנא נסה שנית או פנה למשרד לעזרה.
          </p>
          <a
            href={`/pay/${token}`}
            className="inline-block rounded-md bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
          >
            נסה שנית
          </a>
        </div>
      </div>
    );
  }

  // Check if expired
  if (link.expiresAt && new Date() > link.expiresAt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <span className="text-4xl">⏰</span>
          <h1 className="text-2xl font-bold">פג תוקף הקישור</h1>
          <p className="text-muted-foreground">
            קישור התשלום אינו פעיל יותר. אנא פנה למשרד לקבלת קישור חדש.
          </p>
        </div>
      </div>
    );
  }

  // If cancelled
  if (link.status === "cancelled") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md text-center space-y-4">
          <span className="text-4xl">❌</span>
          <h1 className="text-2xl font-bold">הקישור בוטל</h1>
          <p className="text-muted-foreground">
            קישור התשלום אינו פעיל. אנא פנה למשרד לקבלת קישור חדש.
          </p>
        </div>
      </div>
    );
  }

  // Mark as opened if first time
  if (link.status === "draft" || link.status === "sent") {
    await prisma.paymentLink.update({
      where: { id: link.id },
      data: { status: "opened" },
    });
  }

  const courseName = link.course
    ? (link.course.fullNameOverride || link.course.fullNameMoodle)
    : link.courseName;

  const currencySymbol = link.currency === "USD" ? "$" : "₪";
  const monthlyAmount = link.numPayments > 1
    ? link.finalAmount / link.numPayments
    : link.finalAmount;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-8 text-center text-white">
          <h1 className="text-3xl font-bold">ברוכים הבאים</h1>
          <p className="mt-2 opacity-90 text-lg">טופס רישום ותשלום</p>
          <p className="mt-1 font-semibold">{link.firstName} {link.lastName}</p>
          {courseName && (
            <p className="mt-1 opacity-80">{courseName}</p>
          )}
        </div>

        {/* Payment Summary */}
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          {link.showTotalOnForm || link.numPayments <= 1 ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">סכום לתשלום:</span>
                <span className="text-lg font-bold text-blue-800">
                  {currencySymbol}{link.finalAmount.toLocaleString("he-IL")}
                </span>
              </div>
              {link.numPayments > 1 && (
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-blue-600">מספר תשלומים:</span>
                  <span className="text-blue-700">
                    {link.numPayments} תשלומים של {currencySymbol}{monthlyAmount.toLocaleString("he-IL", { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">תשלום חודשי:</span>
                <span className="text-lg font-bold text-blue-800">
                  {currencySymbol}{monthlyAmount.toLocaleString("he-IL", { maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-blue-600">מספר תשלומים:</span>
                <span className="text-blue-700">{link.numPayments}</span>
              </div>
            </>
          )}
          {link.discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-green-600">הנחה:</span>
              <span className="text-green-700">{currencySymbol}{link.discountAmount.toLocaleString("he-IL")}</span>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="p-8">
          <PaymentRegistrationForm
            token={link.token}
            linkId={link.id}
            initialData={{
              firstName: link.firstName,
              lastName: link.lastName,
              email: link.email || "",
              phone: link.phone || "",
            }}
            hasKesherPayment={!link.isRegistrationOnly && !!link.kesherPaymentPageId}
            kesherPaymentPageId={link.kesherPaymentPageId}
            finalAmount={link.finalAmount}
            numPayments={link.numPayments}
            currency={link.currency}
            showCouponField={link.showCouponField}
            showTotalOnForm={link.showTotalOnForm}
            couponCode={link.couponCode}
          />
        </div>
      </div>
    </div>
  );
}
