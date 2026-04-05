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
    const doc = new PDFDocument({ size: "A4", margins: { top: 40, bottom: 40, left: 50, right: 50 } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Register Hebrew font
    loadFonts();
    if (hebrewRegularFont && hebrewBoldFont) {
      doc.registerFont("Heb", hebrewRegularFont);
      doc.registerFont("HebBold", hebrewBoldFont);
    } else {
      doc.registerFont("Heb", "Helvetica");
      doc.registerFont("HebBold", "Helvetica-Bold");
    }

    // PDFKit + fontkit handle BiDi/RTL automatically for TTF Hebrew fonts.
    // Do NOT pre-reverse — that causes double-reversal and backwards text.
    // Just pass raw Hebrew strings with align:'right'.

    const W = doc.page.width - 100;
    const R = { align: "right" as const, width: W };
    
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // ── HEADER ──
    doc.rect(0, 0, doc.page.width, 80).fill("#1a3a6b");
    doc.font("HebBold").fill("#ffffff");
    doc.fontSize(20).text("למען ילמדו", 50, 18, R);
    doc.fontSize(11).text("המכללה להכשרה תורנית", 50, 44, R);
    doc.fill("#000000");
    doc.y = 95;

    // ── STUDENT INFO ──
    const boxY = 95;
    doc.roundedRect(45, boxY, W + 10, 65, 4)
      .lineWidth(0.5).fillAndStroke("#f0f4f8", "#c5cdd8");
    
    doc.fill("#1a3a6b").font("HebBold").fontSize(12);
    doc.text("אישור הצטרפות לקורס", 50, boxY + 8, R);
    
    doc.fill("#333333").font("Heb").fontSize(9.5);
    doc.text("תלמיד: " + data.studentName, 50, boxY + 28, R);
    doc.text("קורס: " + data.courseName, 50, boxY + 42, R);
    
    // Date and email using Helvetica (has digits)
    doc.fill("#666666").font("Helvetica").fontSize(8.5);
    doc.text(`${day}/${month}/${year}`, 55, boxY + 28, { align: "left", width: 200 });
    doc.text(data.studentEmail, 55, boxY + 42, { align: "left", width: 250 });
    
    doc.fill("#000000");
    doc.y = boxY + 78;

    // ── TERMS SECTIONS ──
    let sectionNum = 1;
    for (const section of TERMS_TEXT_SECTIONS) {
      if (doc.y > doc.page.height - 90) doc.addPage();

      if (section.title) {
        doc.moveDown(0.4);
        doc.font("HebBold").fontSize(10.5).fill("#1a3a6b");
        doc.text(section.title, 50, doc.y, R);
        doc.moveTo(50, doc.y + 2).lineTo(doc.page.width - 50, doc.y + 2)
          .lineWidth(0.3).stroke("#c5cdd8");
        doc.moveDown(0.2);
        sectionNum++;
      }

      doc.font("Heb").fontSize(9).fill("#333333").lineGap(2.5);
      // Split long text into sentences for better RTL handling
      const sentences = section.body.split(". ").filter(Boolean);
      for (const sentence of sentences) {
        const s = sentence.endsWith(".") ? sentence : sentence + ".";
        doc.text(s, 50, doc.y, R);
      }
      doc.moveDown(0.3);
    }

    // ── SIGNATURE SECTION ──
    if (doc.y > doc.page.height - 160) doc.addPage();

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y)
      .lineWidth(1).stroke("#1a3a6b");
    doc.moveDown(0.6);

    doc.font("HebBold").fontSize(10).fill("#000000");
    doc.text("אני " + data.studentName + " מצהיר בזאת שקראתי את התקנון בעיון ומסכים לכל תנאיו", 50, doc.y, R);
    doc.moveDown(0.3);
    
    // Date with Helvetica for the numbers
    doc.font("Heb").fontSize(9).fill("#555555");
    doc.text("תאריך חתימה:", 50, doc.y, R);
    doc.font("Helvetica").fontSize(9);
    doc.text(`${day}/${month}/${year}`, 55, doc.y - 12, { align: "left", width: 100 });
    doc.moveDown(0.8);

    if (data.signature && data.signature.startsWith("data:")) {
      try {
        const sigBuffer = Buffer.from(data.signature.split(",")[1], "base64");
        doc.font("HebBold").fontSize(9.5).fill("#000000");
        doc.text("חתימה:", 50, doc.y, R);
        doc.moveDown(0.3);
        const sigX = doc.page.width - 240;
        doc.image(sigBuffer, sigX, doc.y, { width: 170 });
      } catch {
        // skip
      }
    }

    // ── FOOTER ──
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc.font("Heb").fontSize(7).fill("#aaaaaa");
      doc.text("למען ילמדו - המכללה להכשרה תורנית", 50, doc.page.height - 30, { align: "center", width: W });
    }

    doc.end();
  });
}
