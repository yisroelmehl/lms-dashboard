import { prisma } from "@/lib/prisma";

// Terms text sections
export const TERMS_TEXT_SECTIONS = [
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

const MAIL_FROM = process.env.GMAIL_USER || "office@lemaanyilmedo.org";

// Gmail API via direct HTTPS fetch
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
    console.error("[Email] Failed to refresh Gmail token:", await res.text());
    return null;
  }

  return (await res.json()).access_token;
}

async function sendViaGmailApi(accessToken: string, rawMessage: string) {
  const encodedMessage = Buffer.from(rawMessage).toString("base64url");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodedMessage }),
  });
  if (!res.ok) throw new Error(`Gmail API error ${res.status}: ${await res.text()}`);
  return (await res.json()).id;
}

function buildMimeMessage(
  from: string, to: string, subject: string, html: string,
  attachmentName: string, attachmentBuffer: Buffer
): string {
  const boundary = "boundary_" + Date.now().toString(36);
  return [
    `From: =?UTF-8?B?${Buffer.from("למען ילמדו").toString("base64")}?= <${from}>`,
    `To: ${to}`, `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`, `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``, `--${boundary}`, `Content-Type: text/html; charset="UTF-8"`, `Content-Transfer-Encoding: base64`,
    ``, Buffer.from(html).toString("base64"), ``,
    `--${boundary}`, `Content-Type: application/pdf; name="${attachmentName}"`,
    `Content-Disposition: attachment; filename="${attachmentName}"`, `Content-Transfer-Encoding: base64`,
    ``, attachmentBuffer.toString("base64"), ``, `--${boundary}--`,
  ].join("\r\n");
}

export async function generateTermsPDF(signature: string | null, studentName: string, courseName: string, date: string): Promise<Buffer> {
  const sectionsHtml = TERMS_TEXT_SECTIONS.map(s => {
    const titleHtml = s.title ? `<h3 style="color:#1e40af;margin-top:20px;margin-bottom:8px;">${s.title}</h3>` : '';
    return `${titleHtml}<p style="text-align:justify;margin-bottom:12px;">${s.body}</p>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8">
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 1.7; color: #333; padding: 40px; background: #fff; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e40af; padding-bottom: 20px; }
  .header h1 { font-size: 22px; color: #1e40af; margin-bottom: 6px; }
  .header h2 { font-size: 16px; color: #555; font-weight: normal; margin: 0; }
  .content { margin-bottom: 30px; }
  .footer { margin-top: 40px; background: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .signature-img { max-width: 250px; max-height: 120px; display: block; margin-top: 10px; border-bottom: 1px solid #777; padding-bottom: 5px; }
  .date { font-size: 13px; color: #888; }
</style></head>
<body>
  <div class="header">
    <h1>תקנון הרשמה</h1>
    <h2>${courseName} - המכללה להכשרה תורנית "למען ילמדו"</h2>
    <p class="date">תאריך חתימה: ${date}</p>
  </div>
  <div class="content">${sectionsHtml}</div>
  <div class="footer">
    <p>אני, <strong>${studentName}</strong>, מצהיר/ה בזאת כי קראתי, הבנתי ואני מסכים/ה לכל תנאי התקנון המפורטים לעיל.</p>
    <p>חתימה:</p>
    ${signature ? `<img src="${signature}" class="signature-img" />` : '<p>(לא צורפה חתימה)</p>'}
    <p><strong>שם החותם:</strong> ${studentName}</p>
  </div>
</body></html>`;

  const apiKey = process.env.API2PDF_KEY;
  if (!apiKey) throw new Error('[Terms PDF] API2PDF_KEY is missing');

  const res = await fetch('https://v2.api2pdf.com/chrome/pdf/html', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      html, inline: true, fileName: `terms-${studentName}.pdf`,
      options: { marginTop: 0.5, marginBottom: 0.5, marginLeft: 0.5, marginRight: 0.5, format: "A4" }
    })
  });
  if (!res.ok) throw new Error('Api2Pdf failed: ' + await res.text());
  const data = await res.json();
  console.log("[Terms PDF] Api2Pdf response:", JSON.stringify(data));
  if (data.success && data.FileUrl) {
    const pdfRes = await fetch(data.FileUrl);
    if (!pdfRes.ok) throw new Error(`Failed to download PDF from ${data.FileUrl}: ${pdfRes.status}`);
    return Buffer.from(await pdfRes.arrayBuffer());
  }
  throw new Error('Api2Pdf invalid response: ' + JSON.stringify(data));
}

/**
 * Full terms acceptance flow: generate PDF, save to DB, send emails.
 * Called directly (no HTTP self-fetch).
 */
export async function processTermsAcceptance(params: {
  studentId: string;
  firstName: string;
  email: string;
  courseName: string;
  signature: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; termsAcceptanceId?: string; error?: string }> {
  const { studentId, firstName, email, courseName, signature, ipAddress, userAgent } = params;

  try {
    console.log("[Terms] Processing terms for:", firstName, email);

    // Generate PDF
    const dateStr = new Date().toLocaleDateString('he-IL');
    const pdfBuffer = await generateTermsPDF(signature, firstName, courseName || 'לא צוין', dateStr);
    console.log("[Terms] PDF generated, size:", pdfBuffer.length, "bytes");

    const fileName = `terms-${studentId}-${Date.now()}.pdf`;

    // Save to DB
    const termsAcceptance = await (prisma as any).termsAcceptance.create({
      data: {
        studentId, firstName, email,
        courseName: courseName || null,
        signature,
        pdfContent: pdfBuffer as Buffer,
        pdfFileName: fileName,
        ipAddress, userAgent,
      },
    });
    console.log("[Terms] Saved to DB, id:", termsAcceptance.id);

    // Setup email transport
    const gmailAccessToken = await getGmailAccessToken();
    const { Resend } = await import("resend");
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    async function sendEmail(to: string, subject: string, html: string) {
      if (gmailAccessToken) {
        const raw = buildMimeMessage(MAIL_FROM, to, subject, html, fileName, pdfBuffer);
        return await sendViaGmailApi(gmailAccessToken, raw);
      } else if (resend) {
        return await resend.emails.send({
          from: `למען ילמדו <${MAIL_FROM}>`, to, subject, html,
          attachments: [{ filename: fileName, content: pdfBuffer.toString("base64") }],
        });
      }
      throw new Error("No email service configured");
    }

    // Send welcome email to student
    try {
      await sendEmail(
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
            <p style="color: #6b7280; font-size: 13px;">לכל שאלה: <a href="mailto:office@lemaanyilmedo.org" style="color: #1e40af;">office@lemaanyilmedo.org</a></p>
          </div>
          <div style="padding: 15px; text-align: center; color: #9ca3af; font-size: 12px;"><p>למען ילמדו - המכללה להכשרה תורנית</p></div>
        </div>`
      );
      console.log("[Terms] Welcome email sent to:", email);
    } catch (e) {
      console.error("[Terms] Failed to send student email:", e);
    }

    // Send notification to office
    try {
      await sendEmail(
        "office@lemaanyilmedo.org",
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
      console.log("[Terms] Office notification sent");
    } catch (e) {
      console.error("[Terms] Failed to send office email:", e);
    }

    return { success: true, termsAcceptanceId: termsAcceptance.id };
  } catch (error) {
    console.error("[Terms] processTermsAcceptance error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
