import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";


// Gmail API via direct HTTPS fetch (no heavy googleapis package)
async function getGmailAccessToken(): Promise<string | null> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Email] Failed to refresh Gmail token:", err);
    return null;
  }

  const data = await res.json();
  return data.access_token;
}

async function sendViaGmailApi(accessToken: string, rawMessage: string) {
  const encodedMessage = Buffer.from(rawMessage).toString("base64url");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.id;
}

// Build RFC 2822 MIME message with attachment
function buildMimeMessage(
  from: string,
  to: string,
  subject: string,
  html: string,
  attachmentName: string,
  attachmentBuffer: Buffer
): string {
  const boundary = "boundary_" + Date.now().toString(36);

  const mimeMessage = [
    `From: =?UTF-8?B?${Buffer.from("למען ילמדו").toString("base64")}?= <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString("base64"),
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${attachmentName}"`,
    `Content-Disposition: attachment; filename="${attachmentName}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    attachmentBuffer.toString("base64"),
    ``,
    `--${boundary}--`,
  ].join("\r\n");

  return mimeMessage;
}

const MAIL_FROM = process.env.GMAIL_USER || "office@lemaanyilmedo.org";

// Terms text - cleaned of all problematic characters for PDF rendering
const TERMS_TEXT_SECTIONS = [
  {
    title: "תקנון הצטרפות לקורס",
    body: `מרכז "למען ילמדו" מתחייב להכין ולהגיש את התלמיד לבחינות באמצעות שיעורים, מצגות וחוברות לימוד. כל תכני הקורס נקבעים על ידי הנהלת המכון בלבד, עם זאת המכון שומר לעצמו את הזכות לשינויים בתכני השיעור, זהות המרצים, וזמני השיעורים באם יהיו אילוצים.`
  },
  {
    body: `התלמיד מודע לכך שהצלחה במבחנים תלויה בהשתתפות בשיעורים, חזרה על החומר בבית, ומילוי שאלות החזרה ומטלות הכיתה. התשלום עבור החודש הראשון לא יוחזר אף אם לא החל התלמיד את הקורס.`
  },
  {
    body: `תלמיד המצטרף לקורס מתחייב על כל משך הקורס, לאחר הכניסה לקורס אין אפשרות לפרוש כלל. במקרים חריגים ובאישור ההנהלה בלבד נוהל הביטול יהיה שאחרי השתתפות בשיעור אחד יהיה אפשרות לפרוש בניכוי תשלום עבור החודש הראשון ובהחזרת כל החומר הלימודי עד השיעור שני. בביטול לאחר השיעור השני יוחזר רק חצי מסכום דמי הקורס, לאחר השיעור השלישי לא תהיה כלל אפשרות לקבלת החזר.`
  },
  {
    body: `מכון "למען ילמדו" מעביר לתלמידים חומר בכתב או במייל או בכל אמצעי מדיה אחר. הזכויות של חומרי הלימודים שייכות ל"למען ילמדו" ונתונה הרשות לתלמידים לשימוש אישי בלבד, חובת התלמיד לשמור על הזכויות ולא להעביר חומרי לימוד לאף אחד. כמו כן התלמיד מודע לכך שחלק מן הבחינות נעשות באמצעות גורם חיצוני המעניק את הציון ואת התעודה. קבלת התעודה מטעם המכון מותנית באישור ועדת הבחינות של המכון על פי הקריטריונים שנקבעו על ידי ועדת ההסמכה בלבד, ולאחר סיום התשלום על הקורס.`
  },
  {
    title: "תנאי שימוש באתר",
    body: `תקנון השימוש באתר נכתב בלשון זכר אך האמור בו מתייחס לנשים וגברים כאחד. אתר "למען ילמדו" הוא אתר המכללה להכשרה תורנית. השימוש באתר זה על כל תכניו והשירותים המוצעים בו עשויים להשתנות מעת לעת. הנהלת האתר שומרת לעצמה הזכות לעדכן את תנאי השימוש מעת לעת וללא התראה מיוחדת.`
  },
  {
    title: "קניין רוחני",
    body: `האתר וכל המידע שבו לרבות עיצוב האתר, קוד האתר, קבצי מדיה וכל חומר אחר שייכים במלואם לאתר ומהווים קניין רוחני בלעדי של "למען ילמדו" ואין לעשות בהם שימוש ללא אישור כתוב מראש. אין להפיץ, להעתיק, לשכפל, לפרסם, לחקות או לעבד כל תוכן מבלי שיש ברשותכם אישור כתוב מראש.`
  },
  {
    title: "תוכן האתר",
    body: `אנו שואפים לספק לכם את המידע המוצג באתר ללא הפרעות אך יתכנו הפרעות בזמינות האתר. לכן איננו יכולים להתחייב כי האתר יהיה זמין לכם בכל עת. קישורים לאתרים חיצוניים אינם מהווים ערובה כי מדובר באתרים בטוחים וביקור בהם נעשה על דעתכם האישית בלבד.`
  },
  {
    title: "ניהול משתמשים",
    body: `הנהלת האתר שומרת לעצמה את הזכות לחסום כל משתמש ללא צורך לספק תירוץ. צוות האתר יעשה כל שביכולתו להגן על פרטי המשתמשים הרשומים באתר.`
  },
  {
    title: "גילוי נאות",
    body: `באתר זה עשוי להיעשות שימוש בקבצי קוקיז ובממשקי סטטיסטיקה פנימיים. המידע הנשמר הוא אנונימי לחלוטין ואין בו את שם הגולש או כל פרט מזהה אחר.`
  },
  {
    title: "אזור שיפוט",
    body: `בעת שאתם עושים שימוש באתר ובמקרה בו התגלעה כל מחלוקת, אתם מסכימים כי האמור לעיל נמצא תחת סמכות השיפוט הבלעדי של בית הדין של הרב לנדא בבני ברק בלבד.`
  },
];

export async function POST(request: NextRequest) {
  try {
    console.log("[Terms] POST received");
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    const gmailAccessToken = await getGmailAccessToken();

    if (!resend && !gmailAccessToken) {
      console.error("[Terms] No email service configured! Set Gmail OAuth2 env vars or RESEND_API_KEY");
    }

    const body = await request.json();
    const { token, studentId, firstName, email, courseName, signature } = body;
    console.log("[Terms] Student:", firstName, "Email:", email, "HasSignature:", !!signature);

    // Auth: either via session (admin dashboard) or via payment token (public terms page)
    if (token) {
      const link = await prisma.paymentLink.findUnique({ where: { token } });
      if (!link || link.studentId !== studentId) {
        console.error("[Terms] Auth failed - token mismatch. Link studentId:", link?.studentId, "Requested:", studentId);
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!studentId || !firstName || !email || !signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    console.log("[Terms] Generating remote PDF via Api2Pdf (Headless Chrome)...");
    const studentDateStr = new Date().toLocaleDateString('he-IL');
    const contentText = typeof TERMS_TEXT_SECTIONS !== 'undefined' ? TERMS_TEXT_SECTIONS.join('\\n\\n') : '';
    const pdfBuffer = await generateTermsPDF({
      content: contentText,
      signature,
      studentName: firstName,
      courseName: courseName || 'לא צוין',
      date: studentDateStr,
    });
    console.log("[Terms] PDF ready, size:", pdfBuffer.length, "bytes");

    const fileName = `terms-${studentId}-${Date.now()}.pdf`;

    // Save to database
    console.log("[Terms] Saving to database...");
    const termsAcceptance = await (prisma as any).termsAcceptance.create({
      data: {
        studentId,
        firstName,
        email,
        courseName: courseName || null,
        signature,
        pdfContent: pdfBuffer as Buffer,
        pdfFileName: fileName,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });
    console.log("[Terms] Saved to DB, id:", termsAcceptance.id);

    const pdfBase64ForEmail = pdfBuffer.toString("base64");

    // Helper: send email via Gmail API (primary) or Resend (fallback)
    async function sendEmail(to: string, subject: string, html: string) {
      if (gmailAccessToken) {
        console.log("[Email] Using Gmail API (HTTPS)");
        const raw = buildMimeMessage(MAIL_FROM, to, subject, html, fileName, pdfBuffer);
        const messageId = await sendViaGmailApi(gmailAccessToken, raw);
        return messageId;
      } else if (resend) {
        const result = await resend.emails.send({
          from: `למען ילמדו <${MAIL_FROM}>`,
          to,
          subject,
          html,
          attachments: [{ filename: fileName, content: pdfBase64ForEmail }],
        });
        return JSON.stringify(result);
      } else {
        throw new Error("No email service configured");
      }
    }

    // Send welcome email to student with PDF attachment
    try {
      console.log("[Terms] Sending welcome email to student:", email);
      const result = await sendEmail(
        email,
        `ברוך הבא ל${courseName || "קורס"} - למען ילמדו`,
        `<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e40af; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">ברוך הבא, ${firstName}!</h1>
            <p style="margin: 8px 0 0; opacity: 0.9;">המכללה להכשרה תורנית - למען ילמדו</p>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
            <p style="font-size: 16px; color: #374151;">שמחים שהצטרפת לקורס <strong>${courseName || ""}</strong>!</p>
            
            <p style="color: #6b7280;">הרישום שלך התקבל בהצלחה ואישור התקנון החתום מצורף למייל זה.</p>
            
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 12px; color: #1e40af;">מה הלאה?</h3>
              <p style="margin: 4px 0;"><span style="color: #1e40af;">1.</span> כנס לאתר הלימודים שלנו:</p>
              <p style="margin: 4px 0 12px;"><a href="https://school.lemaanyilmedo.org" style="color: #1e40af; font-weight: bold;">school.lemaanyilmedo.org</a></p>
              <p style="margin: 4px 0;"><span style="color: #1e40af;">2.</span> התחבר עם המייל שנרשמת איתו: <strong>${email}</strong></p>
              <p style="margin: 4px 0;"><span style="color: #1e40af;">3.</span> השלם את הפרופיל הלימודי שלך באזור האישי</p>
            </div>

            <p style="color: #6b7280; font-size: 13px;">לכל שאלה ניתן לפנות אלינו במייל: <a href="mailto:office@lemaanyilmedo.org" style="color: #1e40af;">office@lemaanyilmedo.org</a></p>
          </div>
          
          <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>למען ילמדו - המכללה להכשרה תורנית</p>
          </div>
        </div>`
      );
      console.log("[Terms] Student welcome email sent:", result);
    } catch (emailError) {
      console.error("[Terms] Failed to send email to student:", emailError);
    }

    // Send notification to office with PDF
    try {
      const officeEmail = "office@lemaanyilmedo.org";
      console.log("[Terms] Sending notification to office:", officeEmail);
      const result = await sendEmail(
        officeEmail,
        `תלמיד חדש נרשם - ${firstName} - ${courseName || ""}`,
        `<div dir="rtl" style="font-family: Arial, sans-serif;">
          <h2 style="color: #1e40af;">תלמיד חדש נרשם לקורס</h2>
          <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">שם</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${firstName}</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">אימייל</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${email}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">קורס</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${courseName || "לא צוין"}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">תאריך</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td></tr>
          </table>
          <p style="margin-top: 16px;"><a href="https://lms-dashboard-qx2u.onrender.com/admin/terms-acceptances" style="color: #1e40af;">צפה בניהול התקנונים</a></p>
          <p style="color: #9ca3af; font-size: 12px;">התקנון החתום מצורף כ-PDF.</p>
        </div>`
      );
      console.log("[Terms] Office email sent:", result);
    } catch (emailError) {
      console.error("[Terms] Failed to send office notification:", emailError);
    }

    console.log("[Terms] All done, returning response");
    return NextResponse.json({
      success: true,
      termsAcceptanceId: termsAcceptance.id,
      fileName,
    });
  } catch (error) {
    console.error("Terms acceptance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process terms acceptance" },
      { status: 500 }
    );
  }
}

async function generateTermsPDF({ content, signature, studentName, courseName, date }: {
  content: string;
  signature: string | null;
  studentName: string;
  courseName: string;
  date: string;
}): Promise<Buffer> {
  const html = `
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333; padding: 40px; background: #fff; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
        .header h1 { font-size: 24px; color: #111; margin-bottom: 10px; }
        .content { text-align: justify; white-space: pre-wrap; font-size: 15px; }
        .footer { margin-top: 50px; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .signature-img { max-width: 250px; max-height: 120px; display: block; margin-top: 10px; border-bottom: 1px solid #777; padding-bottom: 5px; }
        .date { font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>תקנון הרשמה - ${courseName}</h1>
        <p class="date">תאריך חתימה: ${date}</p>
      </div>
      <div class="content">${content.replace(/\n/g, '<br/>')}</div>
      <div class="footer">
        <p>אני, <strong>${studentName}</strong>, מצהיר/ה בזאת כי קראתי, הבנתי ואני מסכים/ה לכל תנאי התקנון המפורטים לעיל.</p>
        <p>חתימה:</p>
        ${signature ? `<img src="${signature}" class="signature-img" />` : '<p>(לא צורפה חתימה)</p>'}
        <p><strong>שם החותם:</strong> ${studentName}</p>
      </div>
    </body>
    </html>
  `;
  const apiKey = process.env.API2PDF_KEY;
  if (!apiKey) {
    console.error("[Terms PDF] API2PDF_KEY is missing! API2PDF_KEY must be in .env");
    throw new Error('PDF Generation requires Api2Pdf key.');
  }
  const res = await fetch('https://v2.api2pdf.com/chrome/pdf/html', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html: html, inline: true, fileName: `terms-${studentName}.pdf`,
      options: { marginTop: 0.5, marginBottom: 0.5, marginLeft: 0.5, marginRight: 0.5, format: "A4" }
    })
  });
  if (!res.ok) { throw new Error('PDF Generation via Api2Pdf failed: ' + await res.text()); }
  const data = await res.json();
  if (data.success && data.FileUrl) {
    const pdfRes = await fetch(data.FileUrl);
    const arrayBuffer = await pdfRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else { throw new Error('PDF Generation failed (invalid response from Api2Pdf).'); }
}
