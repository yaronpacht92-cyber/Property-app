import "server-only";

import { isHeicMimeOrName } from "@/lib/property-photo";

export async function normalizePropertyPhoto(params: {
  data: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ data: Buffer; mimeType: string; fileName: string }> {
  if (!isHeicMimeOrName(params.mimeType, params.fileName)) {
    const mime =
      params.mimeType === "image/jpg" ? "image/jpeg" : params.mimeType || "application/octet-stream";
    return { data: params.data, mimeType: mime, fileName: params.fileName };
  }

  try {
    const convert = (await import("heic-convert")).default;
    const output = await convert({
      buffer: params.data,
      format: "JPEG",
      quality: 0.9,
    });
    const jpegName = params.fileName.replace(/\.(heic|heif)$/i, ".jpg");
    return {
      data: Buffer.from(output),
      mimeType: "image/jpeg",
      fileName: jpegName.endsWith(".jpg") ? jpegName : `${jpegName}.jpg`,
    };
  } catch {
    throw new Error(
      "We could not read that HEIC photo. Please export it as JPEG or PNG and try again.",
    );
  }
}
