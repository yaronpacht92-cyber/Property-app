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
