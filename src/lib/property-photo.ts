export const MAX_PROPERTY_PHOTO_BYTES = 10 * 1024 * 1024;

const PHOTO_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export function isHeicMimeOrName(mimeType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    mimeType === "image/heic" ||
    mimeType === "image/heif" ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  );
}

export function isAllowedPropertyPhoto(mimeType: string, fileName: string) {
  const lower = fileName.toLowerCase();
  if (PHOTO_MIME.has(mimeType)) return true;
  // Some browsers/OS omit MIME for HEIC / camera rolls.
  return PHOTO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function propertyPhotoAcceptAttribute() {
  return "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif";
}

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
