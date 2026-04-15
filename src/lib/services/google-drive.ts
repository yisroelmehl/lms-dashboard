/**
 * Google Drive API integration.
 * Follows the same OAuth2 refresh-token pattern as terms-pdf.ts (Gmail).
 * Uses direct fetch() calls - no googleapis npm package needed.
 */

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

async function getDriveAccessToken(): Promise<string | null> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
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
    console.error("[Drive] Failed to refresh token:", await res.text());
    return null;
  }

  return (await res.json()).access_token;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  parents?: string[];
}

export interface DriveListResult {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * List files in a Google Drive folder.
 */
export async function listDriveFiles(
  folderId: string,
  pageToken?: string
): Promise<DriveListResult> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error("לא ניתן להתחבר ל-Google Drive. בדוק את הגדרות החיבור.");

  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,parents)",
    orderBy: "folder,name",
    pageSize: "100",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Drive] List files error:", err);
    throw new Error("שגיאה בטעינת קבצים מ-Google Drive");
  }

  return res.json();
}

/**
 * Download file content from Google Drive as a Buffer.
 * For Google Docs, exports as DOCX.
 */
export async function getDriveFileContent(
  fileId: string,
  mimeType: string
): Promise<Buffer> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error("לא ניתן להתחבר ל-Google Drive.");

  let url: string;

  // Google Docs need to be exported
  if (mimeType === "application/vnd.google-apps.document") {
    url = `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=application/vnd.openxmlformats-officedocument.wordprocessingml.document`;
  } else {
    url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Drive] Download error:", err);
    throw new Error("שגיאה בהורדת קובץ מ-Google Drive");
  }

  const arrBuffer = await res.arrayBuffer();
  return Buffer.from(arrBuffer);
}

/**
 * Get file metadata from Google Drive.
 */
export async function getDriveFileMetadata(fileId: string): Promise<DriveFile> {
  const token = await getDriveAccessToken();
  if (!token) throw new Error("לא ניתן להתחבר ל-Google Drive.");

  const params = new URLSearchParams({
    fields: "id,name,mimeType,size,modifiedTime,iconLink,parents",
  });

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error("שגיאה בטעינת מידע על הקובץ");
  return res.json();
}
