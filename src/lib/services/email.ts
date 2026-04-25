// Generic email sender that prefers Gmail OAuth (already configured for course
// emails / terms PDFs) and falls back to Resend if Gmail is not configured.

const FROM_NAME = "למען ילמדו";

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
    console.error("[email] Gmail refresh failed:", await res.text());
    return null;
  }
  return (await res.json()).access_token;
}

function buildHtmlMime(from: string, to: string, subject: string, html: string): string {
  return [
    `From: =?UTF-8?B?${Buffer.from(FROM_NAME).toString("base64")}?= <${from}>`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(html).toString("base64"),
  ].join("\r\n");
}

async function sendViaGmail(to: string, subject: string, html: string): Promise<boolean> {
  const accessToken = await getGmailAccessToken();
  if (!accessToken) return false;

  const from = process.env.GMAIL_USER || "office@lemaanyilmedo.org";
  const raw = buildHtmlMime(from, to, subject, html);
  const encoded = Buffer.from(raw).toString("base64url");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    console.error(`[email] Gmail send failed (${res.status}):`, await res.text());
    return false;
  }
  return true;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL || "noreply@lemaanyilmedo.org";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[email] Resend send failed (${res.status}):`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend threw:", err);
    return false;
  }
}

// Send an HTML email. Tries Gmail first, then Resend. Returns whether any
// provider succeeded.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const { to, subject, html } = opts;

  if (await sendViaGmail(to, subject, html)) return true;
  if (await sendViaResend(to, subject, html)) return true;

  console.warn(`[email] No provider available — message NOT sent. To: ${to}, Subject: ${subject}`);
  return false;
}
