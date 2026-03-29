import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";
import PDFDocument from "pdfkit";
import path from "path";

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
    const resend = new Resend(process.env.RESEND_API_KEY);

    const body = await request.json();
    const { token, studentId, firstName, email, courseName, signature } = body;

    // Auth: either via session (admin dashboard) or via payment token (public terms page)
    if (token) {
      const link = await prisma.paymentLink.findUnique({ where: { token } });
      if (!link || link.studentId !== studentId) {
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
    const pdfBuffer = await generateTermsPDF({
      studentName: firstName,
      studentEmail: email,
      courseName: courseName || "לא צוין",
      signature,
    });

    const fileName = `terms-${studentId}-${Date.now()}.pdf`;

    // Save to database
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

    // Send email to student with PDF attachment
    try {
      await resend.emails.send({
        from: "noreply@lemaanyilmedo.org",
        to: email,
        subject: `אישור התקנון - ${firstName}`,
        html: `
          <h2>שלום ${firstName},</h2>
          <p>אישור התקנון שלך התקבל בהצלחה!</p>
          <p>מצורף לכאן עותק של התקנון עם החתימה שלך.</p>
          <p>בברכה,<br/>צוות "למען ילמדו"</p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (emailError) {
      console.error("Failed to send email to student:", emailError);
      // Don't fail the request if email fails
    }

    // Send notification to office
    try {
      const officeEmail = process.env.OFFICE_EMAIL || "office@lemaanyilmedo.org";
      await resend.emails.send({
        from: "noreply@lemaanyilmedo.org",
        to: officeEmail,
        subject: `אישור תקנון חדש - ${firstName}`,
        html: `
          <h3>תקנון חדש אושר</h3>
          <ul>
            <li><strong>שם:</strong> ${firstName}</li>
            <li><strong>אימייל:</strong> ${email}</li>
            <li><strong>קורס:</strong> ${courseName || "לא צוין"}</li>
            <li><strong>תאריך הגשה:</strong> ${new Date().toLocaleString("he-IL")}</li>
          </ul>
          <p><a href="https://lms-dashboard.onrender.com/admin/terms-acceptances">צפה בניהול</a></p>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (emailError) {
      console.error("Failed to send office notification:", emailError);
    }

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
    const fontDir = path.join(process.cwd(), "public", "fonts");
    const regularFont = path.join(fontDir, "NotoSansHebrew-Regular.ttf");
    const boldFont = path.join(fontDir, "NotoSansHebrew-Bold.ttf");

    doc.registerFont("Hebrew", regularFont);
    doc.registerFont("Hebrew-Bold", boldFont);

    const textOptions = { align: "right" as const, features: ["rtla" as any] };
    const pageWidth = doc.page.width - 100; // margins

    // Title
    doc.font("Hebrew-Bold").fontSize(18).text("תקנון הצטרפות לקורס", { ...textOptions, width: pageWidth });
    doc.moveDown(0.5);

    // Student info
    doc.font("Hebrew").fontSize(11);
    doc.text(`שם התלמיד: ${data.studentName}`, { ...textOptions, width: pageWidth });
    doc.text(`אימייל: ${data.studentEmail}`, { ...textOptions, width: pageWidth });
    doc.text(`קורס: ${data.courseName}`, { ...textOptions, width: pageWidth });
    doc.text(`תאריך: ${new Date().toLocaleDateString("he-IL")}`, { ...textOptions, width: pageWidth });
    doc.moveDown();

    // Full terms text - split by double newlines into paragraphs
    const termsContent = TERMS_TEXT
      .replace("{studentName}", data.studentName)
      .replace("{studentName}", data.studentName)
      .replace("{studentEmail}", data.studentEmail)
      .replace("{courseName}", data.courseName)
      .replace("{date}", new Date().toLocaleDateString("he-IL"));

    doc.font("Hebrew").fontSize(9);
    const paragraphs = termsContent.split("\n\n");
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed || trimmed === "[signature]") continue;

      // Check if we need a new page
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }

      // Section headers (short lines ending with colon or single-word lines)
      if (trimmed.length < 40 && (trimmed.endsWith(":") || !trimmed.includes(" ") || trimmed.startsWith("תנאי") || trimmed.startsWith("קדימון") || trimmed.startsWith("קניין") || trimmed.startsWith("תוכן") || trimmed.startsWith("ניהול") || trimmed.startsWith("גילוי") || trimmed.startsWith("איזור"))) {
        doc.moveDown(0.3);
        doc.font("Hebrew-Bold").fontSize(10).text(trimmed, { ...textOptions, width: pageWidth });
        doc.font("Hebrew").fontSize(9);
      } else {
        doc.text(trimmed, { ...textOptions, width: pageWidth });
      }
      doc.moveDown(0.3);
    }

    doc.moveDown(1);

    // Signature image
    if (data.signature && data.signature.startsWith("data:")) {
      try {
        const buffer = Buffer.from(data.signature.split(",")[1], "base64");
        doc.font("Hebrew-Bold").fontSize(11).text("חתימת התלמיד:", { ...textOptions, width: pageWidth });
        doc.moveDown(0.3);
        doc.image(buffer, doc.page.width - 250, doc.y, { width: 200 });
      } catch {
        doc.text("[לא ניתן לטעון את החתימה]", { ...textOptions, width: pageWidth });
      }
    }

    doc.end();
  });
}
