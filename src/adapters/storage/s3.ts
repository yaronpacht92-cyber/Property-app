import { createHash, randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { FileStorageAdapter } from "@/adapters/storage/types";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when FILE_STORAGE_DRIVER=s3.`);
  }
  return value;
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * S3-compatible object storage (AWS S3, MinIO, R2, etc.).
 * Downloads stay proxied through /api/files/download so auth stays org-scoped.
 */
export class S3FileStorageAdapter implements FileStorageAdapter {
  name = "s3";
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = requireEnv("S3_BUCKET");
    const region = process.env.S3_REGION || "us-east-1";
    const endpoint = process.env.S3_ENDPOINT || undefined;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
      },
    });
  }

  async upload(params: {
    organizationId: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
  }) {
    const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${params.organizationId}/${randomUUID()}-${safeName}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: params.data,
        ContentType: params.mimeType,
        // Private objects; access only via authenticated app download route.
        ACL: undefined,
        Metadata: {
          org: params.organizationId,
          checksum: createHash("sha256").update(params.data).digest("hex").slice(0, 16),
        },
      }),
    );
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
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    ).catch(() => undefined);
  }

  async read(storageKey: string) {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
    return streamToBuffer(response.Body);
  }
}
