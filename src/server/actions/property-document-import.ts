"use server";

import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import {
  mapPropertyFieldsFromText,
  type ExtractionResult,
} from "@/lib/document-property-extract";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

async function extractTextFromPdf(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text || "";
}

async function extractTextFromImage(buffer: Buffer) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(buffer);
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Read a user-uploaded closing statement, tax bill, lease, or scan and suggest
 * property form fields. Does not scrape third-party websites.
 */
export async function extractPropertyFromDocumentAction(
  formData: FormData,
): Promise<{ error?: string; result?: ExtractionResult }> {
  await requirePermission(PERMISSIONS.PROPERTIES_WRITE);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a PDF, photo scan, or text file." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is too large. Please use a file under 15 MB." };
  }
  if (!ALLOWED.has(file.type)) {
    return {
      error: "Please upload a PDF, JPEG, PNG, WebP, or plain text file.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let text = "";
    if (file.type === "application/pdf") {
      text = await extractTextFromPdf(buffer);
    } else if (file.type === "text/plain") {
      text = buffer.toString("utf8");
    } else {
      text = await extractTextFromImage(buffer);
    }

    const result = mapPropertyFieldsFromText(text);
    if (!text.trim()) {
      return {
        error:
          "We could not read text from that file. Try a clearer scan or a text-based PDF.",
      };
    }
    return { result };
  } catch (error) {
    console.error("property_document_extract_failed", {
      error: error instanceof Error ? error.name : "unknown",
      mimeType: file.type,
    });
    return {
      error:
        "We could not read that document right now. You can still enter the property details by hand.",
    };
  }
}
