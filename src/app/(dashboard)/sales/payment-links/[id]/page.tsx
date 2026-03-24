import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTimeHe, getStudentName, getCourseName } from "@/lib/utils";
import { PaymentLinkActions } from "@/components/sales/payment-link-actions";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "טיוטה", className: "bg-gray-100 text-gray-700" },
  sent: { label: "נשלח", className: "bg-blue-100 text-blue-700" },
  opened: { label: "נפתח", className: "bg-yellow-100 text-yellow-700" },
  paid: { label: "שולם", className: "bg-green-100 text-green-700" },
  failed: { label: "נכשל", className: "bg-red-100 text-red-700" },
  cancelled: { label: "בוטל", className: "bg-gray-100 text-gray-700" },
  expired: { label: "פג תוקף", className: "bg-orange-100 text-orange-700" },
};

export default async function PaymentLinkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const link = await prisma.paymentLink.findUnique({
    where: { id },
    include: {
      salesAgent: true,
      course: { select: { id: true, fullNameMoodle: true, fullNameOverride: true } },
      student: {
        select: {
          id: true,
          firstNameMoodle: true,
          lastNameMoodle: true,
          firstNameOverride: true,
          lastNameOverride: true,
          hebrewName: true,
        },
      },
      payments: { orderBy: { processedAt: "desc" } },
    },
  });

  if (!link) notFound();

  const sc = statusConfig[link.status] || statusConfig.draft;
  const registrationUrl = `/pay/${link.token}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/sales/payment-links" className="text-sm text-muted-foreground hover:underline">
            ← חזרה לקישורי תשלום
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {link.firstName} {link.lastName}
          </h1>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${sc.className}`}>
          {sc.label}
        </span>
      </div>

      {/* Link URLs */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">קישורים</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm w-28 shrink-0">דף רישום ותשלום:</label>
          <code className="flex-1 rounded bg-muted px-2 py-1 text-xs" dir="ltr">
            {registrationUrl}
          </code>
          <PaymentLinkActions token={link.token} linkId={link.id} status={link.status} />
        </div>
        {link.kesherToken && (
          <div className="flex items-center gap-2">
            <label className="text-sm w-28 shrink-0">דף סליקה Kesher:</label>
            <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all" dir="ltr">
              {`https://ultra.kesherhk.info/external/paymentPage/${link.kesherPaymentPageId}?token=${link.kesherToken}`}
            </code>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Student Info */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">פרטי תלמיד</h2>
          <InfoRow label="שם" value={`${link.firstName} ${link.lastName}`} />
          <InfoRow label="אימייל" value={link.email} dir="ltr" />
          <InfoRow label="טלפון" value={link.phone} dir="ltr" />
          {link.student && (
            <div className="pt-1">
              <Link
                href={`/students/${link.student.id}`}
                className="text-sm text-primary hover:underline"
              >
                צפה בכרטיס תלמיד →
              </Link>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">תשלום</h2>
          <InfoRow label="סכום מקורי" value={`₪${link.totalAmount.toLocaleString("he-IL")}`} />
          {link.discountAmount > 0 && (
            <>
              <InfoRow label="קופון" value={link.couponCode} />
              <InfoRow label="הנחה" value={`₪${link.discountAmount.toLocaleString("he-IL")}`} />
            </>
          )}
          <InfoRow
            label="סכום סופי"
            value={`₪${link.finalAmount.toLocaleString("he-IL")}`}
            bold
          />
          <InfoRow label="תשלומים" value={String(link.numPayments)} />
          {link.chargeDay && <InfoRow label="יום חיוב" value={String(link.chargeDay)} />}
        </div>

        {/* Course Info */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">קורס</h2>
          {link.course ? (
            <Link href={`/courses/${link.course.id}`} className="text-sm text-primary hover:underline">
              {getCourseName(link.course)}
            </Link>
          ) : (
            <p className="text-sm">{link.courseName || "לא הוגדר"}</p>
          )}
          <InfoRow label="רישום ל-Moodle" value={link.moodleEnrolled ? "✅ בוצע" : "ממתין"} />
          {link.moodleEnrolledAt && (
            <InfoRow label="תאריך רישום" value={formatDateTimeHe(link.moodleEnrolledAt)} />
          )}
        </div>

        {/* Agent & Dates */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">פרטים נוספים</h2>
          <InfoRow label="איש מכירות" value={`${link.salesAgent.firstName} ${link.salesAgent.lastName}`} />
          <InfoRow label="נוצר" value={formatDateTimeHe(link.createdAt)} />
          {link.paidAt && <InfoRow label="שולם" value={formatDateTimeHe(link.paidAt)} />}
          {link.expiresAt && <InfoRow label="תוקף" value={formatDateTimeHe(link.expiresAt)} />}
          {link.termsAcceptedAt && <InfoRow label="תקנון אושר" value={formatDateTimeHe(link.termsAcceptedAt)} />}
        </div>
      </div>

      {/* Registration Data */}
      {link.registrationData && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">נתוני רישום (מהתלמיד)</h2>
          <pre className="text-xs bg-muted rounded p-3 overflow-x-auto" dir="ltr">
            {JSON.stringify(link.registrationData, null, 2)}
          </pre>
        </div>
      )}

      {/* Payments History */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">היסטוריית תשלומים</h2>
        {link.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין תשלומים עדיין.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">סכום</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">אמצעי</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">סטטוס</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">תאריך</th>
                <th className="py-2 text-right text-xs font-medium text-muted-foreground">קבלה</th>
              </tr>
            </thead>
            <tbody>
              {link.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2 text-sm">₪{p.amount.toLocaleString("he-IL")}</td>
                  <td className="py-2 text-sm">{p.paymentMethod}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      p.isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {p.isSuccess ? "הצלחה" : "נכשל"}
                    </span>
                  </td>
                  <td className="py-2 text-sm">{p.processedAt ? formatDateTimeHe(p.processedAt) : "—"}</td>
                  <td className="py-2 text-sm">
                    {p.kesherReceiptLink ? (
                      <a
                        href={p.kesherReceiptLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        🧾 {p.kesherDocNumber || "צפה בקבלה"}
                      </a>
                    ) : p.kesherDocNumber ? (
                      <span className="text-xs text-muted-foreground">מס׳ {p.kesherDocNumber}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, dir, bold }: { label: string; value: string | null | undefined; dir?: string; bold?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground w-24 shrink-0">{label}:</span>
      <span className={bold ? "font-semibold" : ""} dir={dir}>{value || "—"}</span>
    </div>
  );
}
