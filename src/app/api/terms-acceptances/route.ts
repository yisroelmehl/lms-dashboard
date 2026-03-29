import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

// Pre-load font buffers at module level for reliability
let hebrewRegularFont: Buffer | null = null;
let hebrewBoldFont: Buffer | null = null;

function loadFonts() {
  if (hebrewRegularFont && hebrewBoldFont) return;
  
  const possiblePaths = [
    path.join(process.cwd(), "node_modules", "@embedpdf", "fonts-hebrew", "fonts"),
    path.join(process.cwd(), "public", "fonts"),
  ];

  for (const dir of possiblePaths) {
    const regular = path.join(dir, "NotoSansHebrew-Regular.ttf");
    const bold = path.join(dir, "NotoSansHebrew-Bold.ttf");
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      hebrewRegularFont = fs.readFileSync(regular);
      hebrewBoldFont = fs.readFileSync(bold);
      console.log("[Terms] Loaded Hebrew fonts from:", dir);
      return;
    }
  }
  console.error("[Terms] Hebrew fonts not found in any path!");
}

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

// Terms text - with placeholders for student info
const TERMS_TEXT = `תקנון הצטרפות לקורס:

{studentName}, שם הקורס: {courseName}

מרכז "למען ילמדו" מתחייב להכין ולהגיש את התלמיד לבחינות באמצעות שיעורים, מצגות וחוברות לימוד. כל תכני הקורס נקבעים ע"י הנהלת המכון בלבד, עם זאת המכון שומר לעצמו את הזכות לשינויים בתכני השיעור, זהות המרצים, וזמני השיעורים באם יהיו אילוצים.

התלמיד מודע לכך שהצלחה במבחנים תלויה בהשתתפות בשיעורים, חזרה על החומר בבית, ומילוי שאלות החזרה ומטלות הכיתה. התשלום עבור החודש הראשון לא יוחזר אף אם לא החל התלמיד את הקורס.

תלמיד המצטרף לקורס מתחייב על כל משך הקורס, לאחר הכניסה לקורס אין אפשרות לפרוש כלל. במקרים חריגים ובאישור ההנהלה בלבד נוהל הביטול יהיה שאחרי השתתפות בשיעור אחד יהיה אפשרות לפרוש בניכוי תשלום עבור החודש הראשון ובהחזרת כל החומר הלימודי עד השיעור שני. בביטול לאחר השיעור השני יוחזר רק חצי מסכום דמי הקורס, לאחר השיעור השלישי לא תהיה כלל אפשרות לקבלת החזר.

מכון 'למען ילמדו', מעביר לתלמידים חומר בכתב או במייל או בכל אמצעי מדיה אחר. הזכויות של חומרי הלימודים שייכות ל'למען ילמדו' ונתונה הרשות לתלמידים לשימוש אישי בלבד, חובת התלמיד לשמור על הזכויות ולא להעביר חומרי לימוד לאף אחד. כמו"כ התלמיד מודע לכך שחלק מן הבחינות נעשות באמצעות גורם חיצוני המעניק את הציון ואת התעודה. קבלת התעודה מטעם המכון מותנית באישור ועדת הבחינות של המכון ע"פ הקריטריונים שנקבעו ע"י ועדת ההסמכה בלבד, ולאחר סיום התשלום על הקורס.

תנאי שימוש באתר "למען ילמדו":

תקנון השימוש באתר הנ"ל נכתב בלשון זכר אך האמור בו מתייחס לנשים וגברים כאחד.

קדימון

אתר "למען ילמדו" (להלן "האתר") הוא אתר המשתמש כאתר (המכללה להכשרה תורנית) ייצוגי עבור "שם האתר שלכם" והנך מוזמן לקחת בו חלק בכפוף להסכמתך לתנאי השימוש אשר יפורטו להלן

בנוסף השימוש באתר זה על כל תכניו והשירותים המוצעים בו, הורדות של קבצים, מדיה כגון תמונות וסרטונים והתכנים השונים המוצעים לקהל המבקרים עשויים להשתנות מעת לעת או בהתאם לסוג התוכן.

הנהלת האתר שומרת לעצמה הזכות לעדכן את תנאי השימוש המוצגים להלן מעת לעת וללא התראה או אזכור מיוחד בערוצי האתר השונים.

קניין רוחני

האתר כמו גם כל המידע שבו לרבות עיצוב האתר, קוד האתר, קבצי מדיה לרבות גרפיקות, סרטונים, תמונות, טקסטים, קבצים המוצעים להורדה וכל חומר אחר אשר מוצג באתר שייכים במלואם לאתר הנ"ל ומהווים קניין רוחני בלעדי של אתר "למען ילמדו" ואין לעשות בהם שימוש ללא אישור כתוב מראש מאתר "למען ילמדו".

בנוסף אין להפיץ, להעתיק, לשכפל, לפרסם, לחקות או לעבד פיסות קוד, גרפיקות, סרטונים, סימנים מסחריים או כל מדיה ותוכן אחר מבלי שיש ברשותכם אישור כתוב מראש.

תוכן האתר

אנו שואפים לספק לכם את המידע המוצג באתר ללא הפרעות אך יתכנו בשל שיקולים טכניים, תקלות צד ג או אחרים, הפרעות בזמינות האתר. ולכן איננו יכולים להתחייב כי האתר יהיה זמין לכם בכל עת ולא יינתן כל פיצוי כספי או אחר בשל הפסקת השירות הורדת האתר.

קישורים לאתר חיצוניים אינם מהווים ערובה כי מדובר באתרים בטוחים, איכותיים או אמינים וביקור בהם נעשה על דעתכם האישית בלבד ונמצאים בתחום האחריות הבלעדי של המשתמש באתר.

התכנים המוצעים באתר הינם בבעלותם הבלעדית של "למען ילמדו" ואין לעשות בהם שימוש אשר נועד את האמור בתקנון זה (ראה סעיף 3) למעט במקרים בהם צוין אחרת או במקרים בהם צוין כי זכויות היוצרים שייכים לגוף חיצוני. במקרים אלו יש לבדוק מהם תנאי השימוש בקישור המצורף ולפעול על פי המצוין באתר החיצוני לו שייכים התכנים.

ניהול משתמשים ומבקרים באתר

הנהלת האתר שומרת לעצמה את הזכות לחסום כל משתמש ובין אם על ידי חסימת כתובת הIP של המחשב שלו, כתובת ה MACID של המחשב שלו או אפילו בהתאם למדינת המוצא ללא צורך לספק תירוץ אשר מקובל על הגולש.

צוות האתר הנהלת האתר יעשה כל שביכולתו להגן על פרטי המשתמשים הרשומים באתר מנויים הרשומים באתר. במקרים בהם יעלה בידיו של צד שלישי להשיג גישה למידע מוסכם בזאת כי לגולשים, משתמשים וחברים באתר לא תהה כל תביעה, טענה או דרישה כלפי צוות האתר "למען ילמדו".

גילוי נאות

באתר זה עשוי לעשות שימוש בקבצי קוקיז (במיוחד עבור משתמשים רשומים ומנויים) ובממשקי סטטיסטיקה פנימיים בכדי לשמור תיעוד סטטיסטי אנונימי של גולשים וניתוח תנועת הגולשים, הרגלי גלישה באתר וניתוח קליקים וזמן שהייה.

בכל העת ולבד מאשר גולשים המחוברים לאתר המידע הנשמר הוא אנונימי לחלוטין ואין בו את שם הגולש או כל פרט מזהה אחר.

איזור שיפוט

בעת שאתם עושים שימוש באתר ובמקרה בו התגלעה כל מחלוקת אתם מסכימים להלן כי האמור לעיל נמצא תחת סמכות השיפוט הבלעדי של בית הדין של הרב לנדא בבני ברק בלבד.

---

אני מודה בי שקראתי את התקנון בעיון והסכמתי לכל תנאיו.

תאריך: {date}

תלמיד: {studentName}
אימייל: {studentEmail}

חתימת תלמיד:
[signature]
`;

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

    // Generate PDF
    console.log("[Terms] Generating PDF...");
    const pdfBuffer = await generateTermsPDF({
      studentName: firstName,
      studentEmail: email,
      courseName: courseName || "לא צוין",
      signature,
    });
    console.log("[Terms] PDF generated, size:", pdfBuffer.length, "bytes");

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

    const pdfBase64 = pdfBuffer.toString("base64");

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
          attachments: [{ filename: fileName, content: pdfBase64 }],
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

async function generateTermsPDF(data: {
  studentName: string;
  studentEmail: string;
  courseName: string;
  signature: string;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Register Hebrew fonts
    loadFonts();
    if (hebrewRegularFont && hebrewBoldFont) {
      doc.registerFont("Hebrew", hebrewRegularFont);
      doc.registerFont("Hebrew-Bold", hebrewBoldFont);
    } else {
      doc.registerFont("Hebrew", "Helvetica");
      doc.registerFont("Hebrew-Bold", "Helvetica-Bold");
    }

    // Sanitize text: replace problematic Unicode chars with safe equivalents
    function clean(text: string): string {
      return text
        .replace(/[""״]/g, '"')
        .replace(/[''׳]/g, "'")
        .replace(/–/g, "-")
        .replace(/…/g, "...")
        .replace(/\u00A0/g, " ");
    }

    const textOpts = { align: "right" as const, features: ["rtla" as any] };
    const pageWidth = doc.page.width - 100;
    const dateStr = new Date().toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" });

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 90).fill("#1e40af");
    doc.fill("#ffffff").font("Hebrew-Bold").fontSize(22)
      .text(clean('תקנון הצטרפות לקורס'), 50, 25, { ...textOpts, width: pageWidth });
    doc.fontSize(12)
      .text(clean('המכללה להכשרה תורנית - "למען ילמדו"'), 50, 55, { ...textOpts, width: pageWidth });

    // ── Student info box ──
    doc.fill("#000000");
    const infoY = 105;
    doc.roundedRect(40, infoY, doc.page.width - 80, 70, 5).lineWidth(1).stroke("#d1d5db");
    doc.font("Hebrew").fontSize(10);
    doc.text(`שם התלמיד: ${clean(data.studentName)}`, 55, infoY + 12, { ...textOpts, width: pageWidth - 30 });
    doc.text(`קורס: ${clean(data.courseName)}`, 55, infoY + 28, { ...textOpts, width: pageWidth - 30 });
    doc.text(`אימייל: ${data.studentEmail}`, 55, infoY + 44, { ...textOpts, width: pageWidth - 30 });

    // Date on the left side
    doc.fontSize(9).fill("#6b7280")
      .text(`תאריך: ${dateStr}`, 55, infoY + 12, { align: "left", width: 200 });
    doc.fill("#000000");

    // ── Terms content ──
    doc.y = infoY + 85;

    const termsContent = TERMS_TEXT
      .replace(/\{studentName\}/g, data.studentName)
      .replace("{studentEmail}", data.studentEmail)
      .replace("{courseName}", data.courseName)
      .replace("{date}", dateStr);

    const paragraphs = termsContent.split("\n\n");
    const sectionHeaders = ["תנאי שימוש", "קדימון", "קניין רוחני", "תוכן האתר", "ניהול משתמשים", "גילוי נאות", "איזור שיפוט"];

    for (const paragraph of paragraphs) {
      const trimmed = clean(paragraph.trim());
      if (!trimmed || trimmed === "[signature]") continue;

      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }

      // Detect section headers
      const isHeader = sectionHeaders.some(h => trimmed.startsWith(h)) ||
        (trimmed.length < 30 && !trimmed.includes("."));

      if (isHeader) {
        doc.moveDown(0.5);
        doc.font("Hebrew-Bold").fontSize(11).fill("#1e40af")
          .text(trimmed, 50, doc.y, { ...textOpts, width: pageWidth });
        doc.fill("#000000").font("Hebrew").fontSize(9);
        // Underline
        doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2)
          .lineWidth(0.5).stroke("#d1d5db");
        doc.moveDown(0.3);
      } else {
        doc.font("Hebrew").fontSize(9).lineGap(3)
          .text(trimmed, 50, doc.y, { ...textOpts, width: pageWidth });
      }
      doc.moveDown(0.2);
    }

    // ── Signature section ──
    if (doc.y > doc.page.height - 180) {
      doc.addPage();
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
      .lineWidth(1).stroke("#1e40af");
    doc.moveDown(0.5);

    doc.font("Hebrew-Bold").fontSize(10).fill("#000000")
      .text(`אני, ${clean(data.studentName)}, מצהיר/ה בזאת שקראתי את התקנון בעיון ומסכים/ה לכל תנאיו.`, 50, doc.y, { ...textOpts, width: pageWidth });
    doc.moveDown(0.3);
    doc.font("Hebrew").fontSize(9)
      .text(`תאריך חתימה: ${dateStr}`, 50, doc.y, { ...textOpts, width: pageWidth });
    doc.moveDown(1);

    if (data.signature && data.signature.startsWith("data:")) {
      try {
        const buffer = Buffer.from(data.signature.split(",")[1], "base64");
        doc.font("Hebrew-Bold").fontSize(10)
          .text("חתימת התלמיד:", 50, doc.y, { ...textOpts, width: pageWidth });
        doc.moveDown(0.3);
        // Right-align the signature image
        const sigX = doc.page.width - 250;
        doc.image(buffer, sigX, doc.y, { width: 180 });
      } catch {
        doc.text("[לא ניתן לטעון את החתימה]", 50, doc.y, { ...textOpts, width: pageWidth });
      }
    }

    doc.end();
  });
}
