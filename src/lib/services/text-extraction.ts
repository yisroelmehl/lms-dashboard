// @ts-ignore - pdf-parse has no proper ESM default export
import pdfParse from "pdf-parse";
// @ts-ignore
import mammoth from "mammoth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

/**
 * Extract text from a Blob (PDF, Word, or plain text).
 * Extracted from /api/ai/generate-quiz for reuse.
 */
export async function extractTextFromBlob(
  file: Blob,
  filename: string
): Promise<string> {
  const arrBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrBuffer);
  return extractTextFromBuffer(buffer, filename);
}

/**
 * Extract text from a Buffer (PDF, Word, or plain text).
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".pdf") || lowerName.includes("pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (lowerName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  }

  // Plain text fallback
  return buffer.toString("utf-8");
}

/**
 * Extract text from an image using Claude Vision API (OCR).
 * Supports JPEG, PNG, GIF, WebP.
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const base64 = imageBuffer.toString("base64");
  const mediaType = mimeType as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "חלץ את כל הטקסט מהתמונה הזו. אם זה מבחן או מטלה, שמור על מבנה השאלות והתשובות. החזר רק את הטקסט, ללא הסברים.",
          },
        ],
      },
    ],
  });

  return (message.content[0] as { type: "text"; text: string }).text;
}
