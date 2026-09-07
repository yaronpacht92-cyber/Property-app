import { describe, expect, it } from "vitest";
import {
  isAllowedPropertyPhoto,
  isHeicMimeOrName,
  MAX_PROPERTY_PHOTO_BYTES,
} from "@/lib/property-photo";

describe("property photo validation", () => {
  it("allows common image types", () => {
    expect(isAllowedPropertyPhoto("image/jpeg", "house.jpg")).toBe(true);
    expect(isAllowedPropertyPhoto("image/png", "house.png")).toBe(true);
    expect(isAllowedPropertyPhoto("image/webp", "house.webp")).toBe(true);
    expect(isAllowedPropertyPhoto("image/heic", "house.heic")).toBe(true);
  });

  it("allows HEIC by extension when MIME is missing", () => {
    expect(isAllowedPropertyPhoto("", "IMG_001.HEIC")).toBe(true);
    expect(isHeicMimeOrName("", "IMG_001.heif")).toBe(true);
  });

  it("rejects non-images", () => {
    expect(isAllowedPropertyPhoto("application/pdf", "deed.pdf")).toBe(false);
    expect(isAllowedPropertyPhoto("text/plain", "notes.txt")).toBe(false);
  });

  it("keeps a reasonable size limit", () => {
    expect(MAX_PROPERTY_PHOTO_BYTES).toBe(10 * 1024 * 1024);
  });
});
