import { LocalFileStorageAdapter } from "@/adapters/storage/local";
import { S3FileStorageAdapter } from "@/adapters/storage/s3";
import type { FileStorageAdapter } from "@/adapters/storage/types";

let adapter: FileStorageAdapter | null = null;

function s3Configured() {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}

export function getFileStorage(): FileStorageAdapter {
  if (adapter) return adapter;
  const driver = (process.env.FILE_STORAGE_DRIVER || "local").toLowerCase();

  if (driver === "s3") {
    if (!s3Configured()) {
      throw new Error(
        "FILE_STORAGE_DRIVER=s3 but S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing.",
      );
    }
    adapter = new S3FileStorageAdapter();
    return adapter;
  }

  // Local disk for development. Production should set FILE_STORAGE_DRIVER=s3.
  adapter = new LocalFileStorageAdapter();
  return adapter;
}

/** Test helper — clear cached adapter after env changes. */
export function resetFileStorageAdapter() {
  adapter = null;
}

export type { FileStorageAdapter } from "@/adapters/storage/types";
