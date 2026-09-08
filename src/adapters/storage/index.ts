import { LocalFileStorageAdapter } from "@/adapters/storage/local";
import { S3FileStorageAdapter } from "@/adapters/storage/s3";
import type { FileStorageAdapter } from "@/adapters/storage/types";
import { isProductionRuntime } from "@/lib/runtime-flags";

let adapter: FileStorageAdapter | null = null;

function env(name: string, ...fallbacks: string[]) {
  for (const key of [name, ...fallbacks]) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

export function s3Configured() {
  return Boolean(
    env("S3_BUCKET", "NEON_STORAGE_BUCKET") &&
      env("S3_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID") &&
      env("S3_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY"),
  );
}

export function getFileStorage(): FileStorageAdapter {
  if (adapter) return adapter;
  const driver = (process.env.FILE_STORAGE_DRIVER || "").toLowerCase();
  const preferS3 =
    driver === "s3" ||
    s3Configured() ||
    (isProductionRuntime() && driver !== "local");

  // Production / Vercel must use durable object storage — local disk is ephemeral there.
  if (preferS3) {
    if (!s3Configured()) {
      throw new Error(
        "Cloud file storage is required in production. Set FILE_STORAGE_DRIVER=s3 and S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (or Neon AWS_* storage vars).",
      );
    }
    adapter = new S3FileStorageAdapter();
    return adapter;
  }

  if (isProductionRuntime() && driver === "local") {
    throw new Error(
      "FILE_STORAGE_DRIVER=local is not allowed in production. Use S3-compatible storage so photos survive redeploys.",
    );
  }

  adapter = new LocalFileStorageAdapter();
  return adapter;
}

/** Test helper — clear cached adapter after env changes. */
export function resetFileStorageAdapter() {
  adapter = null;
}

export type { FileStorageAdapter } from "@/adapters/storage/types";
