import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { data } = await req.json();
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Map through array of objects [{ email: "x", amount: "100" }]
    for (const row of data) {
      const email = row.email?.toString().trim().toLowerCase();
      const amountStr = row.amount?.toString().trim();
      
      if (!email || !amountStr) {
        skipped++;
        errors.push(`שורה חסרה אימייל או סכום: ${JSON.stringify(row)}`);
        continue;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        skipped++;
        errors.push(`סכום לא תקין עבור ${email}: ${amountStr}`);
        continue;
      }

      // Find student by email (check both moodle and override fields)
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { emailMoodle: { equals: email, mode: "insensitive" } },
            { emailOverride: { equals: email, mode: "insensitive" } },
          ],
        },
      });

      if (!student) {
        skipped++;
        errors.push(`תלמיד לא נמצא עם האימייל: ${email}`);
        continue;
      }

      // Update student payment amount
      await prisma.student.update({
        where: { id: student.id },
        data: {
          monthlyPayment: amount,
          // If paying, assume they are not in arrears unless changed manually later
          paymentStatus: amount > 0 ? "תקין" : student.paymentStatus,
        },
      });

      updated++;
    }

    return NextResponse.json({ updated, skipped, errors });
  } catch (error) {
    console.error("Payment sync error:", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בשרת בעת סנכרון התשלומים" },
      { status: 500 }
    );
  }
}
