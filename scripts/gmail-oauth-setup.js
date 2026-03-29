/**
 * Gmail OAuth2 Refresh Token Generator
 * 
 * Usage:
 *   1. Set your credentials below
 *   2. Run: node scripts/gmail-oauth-setup.js
 *   3. Open the URL in your browser and authorize
 *   4. Paste the authorization code back here
 *   5. Copy the refresh token to your Render environment variables
 */

const http = require("http");
const { google } = require("googleapis");

// ⬇️ Fill these in from Google Cloud Console
const CLIENT_ID = process.env.GMAIL_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:3333/callback";

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ["https://mail.google.com/"];

// Step 1: Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent", // Force refresh token generation
});

console.log("\n=== Gmail OAuth2 Setup ===\n");
console.log("1. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n2. Authorize with office@lemaanyilmedo.org");
console.log("3. You will be redirected to localhost:3333 — the token will be printed here.\n");

// Step 2: Start local server to catch the callback
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/callback")) {
    res.writeHead(404);
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost:3333");
  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400);
    res.end("Missing code parameter");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <h1 dir="rtl">הצלחה! ✅</h1>
      <p dir="rtl">ה-Refresh Token נוצר. חזור לטרמינל לראות את הפרטים.</p>
      <p>ניתן לסגור את הדף.</p>
    `);

    console.log("\n✅ Success! Here are your tokens:\n");
    console.log("GMAIL_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("\nAdd these to Render Environment Variables:");
    console.log("  GMAIL_USER=office@lemaanyilmedo.org");
    console.log("  GMAIL_CLIENT_ID=" + CLIENT_ID);
    console.log("  GMAIL_CLIENT_SECRET=" + CLIENT_SECRET);
    console.log("  GMAIL_REFRESH_TOKEN=" + tokens.refresh_token);
    console.log("\n");

    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500);
    res.end("Error: " + err.message);
    console.error("Error getting token:", err.message);
  }
});

server.listen(3333, () => {
  console.log("Waiting for authorization callback on http://localhost:3333 ...\n");
});
