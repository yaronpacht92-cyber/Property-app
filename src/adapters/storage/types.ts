export type StoredFile = {
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
};

export type SignedUrl = {
  url: string;
  expiresAt: Date;
};

export interface FileStorageAdapter {
  name: string;
  upload(params: {
    organizationId: string;
    fileName: string;
    mimeType: string;
    data: Buffer;
  }): Promise<StoredFile>;
  getSignedDownloadUrl(storageKey: string, expiresInSeconds?: number): Promise<SignedUrl>;
  delete(storageKey: string): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
}
