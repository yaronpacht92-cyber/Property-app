import { LocalFileStorageAdapter } from "@/adapters/storage/local";
import type { FileStorageAdapter } from "@/adapters/storage/types";

let adapter: FileStorageAdapter | null = null;

export function getFileStorage(): FileStorageAdapter {
  if (adapter) return adapter;
  const driver = process.env.FILE_STORAGE_DRIVER || "local";
  if (driver === "local") {
    adapter = new LocalFileStorageAdapter();
    return adapter;
  }
  // S3 adapter plugs in here for production without changing callers.
  adapter = new LocalFileStorageAdapter();
  return adapter;
}

export type { FileStorageAdapter } from "@/adapters/storage/types";
