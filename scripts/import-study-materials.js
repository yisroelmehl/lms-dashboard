#!/usr/bin/env node
/**
 * Import study materials from ZIP files.
 *
 * Usage:
 *   node scripts/import-study-materials.js \
 *     --dir ./my-zips \
 *     --server https://lms-dashboard-qx2u.onrender.com \
 *     --token YOUR_SUPER_ADMIN_JWT_TOKEN
 *
 * ZIP structure expected:
 *   subject-name.zip
 *   ├── semester-1/
 *   │   ├── unit1.docx
 *   │   └── unit2.pdf
 *   └── semester-2/
 *       └── unit3.docx
 *
 * Requires:  node >= 18 (built-in fetch)  +  adm-zip
 * Install:   npm install adm-zip   (in the project root or scripts folder)
 */

const path = require("path");
const fs = require("fs");

// adm-zip resolves from cwd; install it in project root first
let AdmZip;
try {
  AdmZip = require("adm-zip");
} catch {
  console.error(
    "adm-zip is not installed. Run: npm install adm-zip"
  );
  process.exit(1);
}

// ── CLI argument parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const get = (flag) => {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : null;
};

const dir = get("--dir");
const server = get("--server");
const token = get("--token");

if (!dir || !server || !token) {
  console.error("Usage: node import-study-materials.js --dir <path> --server <url> --token <jwt>");
  process.exit(1);
}

const baseUrl = server.replace(/\/$/, "");

// ── HTTP helpers ────────────────────────────────────────────────────────────

async function apiPost(endpoint, body) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      // NextAuth sends the token as a cookie; pass it in both ways for flexibility
      Cookie: `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function uploadFile(endpoint, fileBuffer, fileName, extraFields = {}) {
  const { FormData, Blob } = globalThis;

  const form = new FormData();
  form.append("file", new Blob([fileBuffer]), fileName);
  for (const [k, v] of Object.entries(extraFields)) {
    form.append(k, v);
  }

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Supported file extensions ───────────────────────────────────────────────

const SUPPORTED = [".docx", ".pdf", ".txt"];

function isSupportedFile(name) {
  return SUPPORTED.some((ext) => name.toLowerCase().endsWith(ext));
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const zipFiles = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".zip"))
    .map((f) => path.join(dir, f));

  if (zipFiles.length === 0) {
    console.log("No ZIP files found in", dir);
    return;
  }

  console.log(`Found ${zipFiles.length} ZIP file(s).\n`);

  for (const zipPath of zipFiles) {
    const subjectName = path.basename(zipPath, ".zip");
    console.log(`\n══ Subject: ${subjectName} ══`);

    // Create subject
    let subjectId;
    try {
      const subject = await apiPost("/api/study-subjects", { name: subjectName });
      subjectId = subject.id;
      console.log(`  ✓ Created subject  id=${subjectId}`);
    } catch (err) {
      // Subject may already exist — try to fetch it
      console.warn(`  ⚠ Could not create subject (${err.message}). Trying to find existing...`);
      try {
        const res = await fetch(`${baseUrl}/api/study-subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Cookie: `next-auth.session-token=${token}; __Secure-next-auth.session-token=${token}`,
          },
        });
        const list = await res.json();
        const existing = list.find((s) => s.name === subjectName);
        if (!existing) throw new Error("Subject not found after create failure");
        subjectId = existing.id;
        console.log(`  ✓ Using existing subject  id=${subjectId}`);
      } catch (fetchErr) {
        console.error(`  ✗ Skipping subject "${subjectName}":`, fetchErr.message);
        continue;
      }
    }

    // Read ZIP
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // Group files by top-level folder (= semester)
    const semesterMap = new Map(); // folderName → [{ entryName, buffer }]
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const parts = entry.entryName.replace(/\\/g, "/").split("/");
      if (parts.length < 2) continue; // skip root-level files
      const folderName = parts[0];
      if (!isSupportedFile(parts[parts.length - 1])) continue;

      if (!semesterMap.has(folderName)) semesterMap.set(folderName, []);
      semesterMap.get(folderName).push({
        entryName: parts[parts.length - 1],
        buffer: entry.getData(),
      });
    }

    if (semesterMap.size === 0) {
      console.log("  No supported files found in sub-folders — skipping.");
      continue;
    }

    let semesterNumber = 1;
    for (const [folderName, files] of semesterMap) {
      console.log(`\n  ── Semester: ${folderName}`);

      // Create semester
      let studySemesterId;
      try {
        const sem = await apiPost(`/api/study-subjects/${subjectId}/study-semesters`, {
          name: folderName,
          number: semesterNumber++,
        });
        studySemesterId = sem.id;
        console.log(`    ✓ Created semester  id=${studySemesterId}`);
      } catch (err) {
        console.error(`    ✗ Could not create semester "${folderName}":`, err.message);
        continue;
      }

      // Upload each file
      for (const { entryName, buffer } of files) {
        try {
          const result = await uploadFile(
            "/api/study-units/upload",
            buffer,
            entryName,
            { studySemesterId }
          );
          console.log(`    ✓ Uploaded "${entryName}" → ${result.count} unit(s)`);
        } catch (err) {
          console.error(`    ✗ Failed to upload "${entryName}":`, err.message);
        }
      }
    }
  }

  console.log("\n\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
