import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { FileStorageAdapter } from "@/adapters/storage/types";

export class LocalFileStorageAdapter implements FileStorageAdapter {
  name = "local";

  private root() {
    return process.env.FILE_STORAGE_LOCAL_DIR || "./storage/uploads";
  }

  async upload(params: {
    organizationId: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
  }) {
    const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = path.join(params.organizationId, `${randomUUID()}-${safeName}`);
    const fullPath = path.join(this.root(), storageKey);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.data);
    return {
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.data.byteLength,
    };
  }

  async getSignedDownloadUrl(storageKey: string, expiresInSeconds = 300) {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = Buffer.from(
      JSON.stringify({ storageKey, exp: expiresAt.getTime() }),
    ).toString("base64url");
    return {
      url: `/api/files/download?token=${token}`,
      expiresAt,
    };
  }

  async delete(storageKey: string) {
    const fullPath = path.join(this.root(), storageKey);
    await unlink(fullPath).catch(() => undefined);
  }

  async read(storageKey: string) {
    return readFile(path.join(this.root(), storageKey));
  }
}
