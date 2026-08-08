import { decryptSecret, encryptSecret } from "@/lib/crypto";

export type StoredOAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
  /** Set for local demo connections that never call a real provider. */
  demo?: boolean;
};

export function sealTokens(tokens: StoredOAuthTokens): string {
  return encryptSecret(JSON.stringify(tokens));
}

export function openTokens(vaultRef: string): StoredOAuthTokens {
  const parsed = JSON.parse(decryptSecret(vaultRef)) as StoredOAuthTokens;
  if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt) {
    throw new Error("Stored OAuth tokens are incomplete.");
  }
  return parsed;
}

export function tokensNeedRefresh(tokens: StoredOAuthTokens, skewMs = 60_000) {
  return Date.now() + skewMs >= tokens.expiresAt;
}
