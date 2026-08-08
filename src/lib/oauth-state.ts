import { createHmac, timingSafeEqual } from "crypto";

export type OAuthStatePayload = {
  organizationId: string;
  userId: string;
  provider: "GMAIL" | "MICROSOFT";
  exp: number;
  nonce: string;
};

function signingKey() {
  const key = process.env.ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!key) {
    throw new Error("ENCRYPTION_KEY or AUTH_SECRET is required to sign OAuth state.");
  }
  return key;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createOAuthState(
  input: Omit<OAuthStatePayload, "exp" | "nonce"> & { ttlSeconds?: number },
): string {
  const payload: OAuthStatePayload = {
    organizationId: input.organizationId,
    userId: input.userId,
    provider: input.provider,
    exp: Date.now() + (input.ttlSeconds ?? 600) * 1000,
    nonce: Math.random().toString(36).slice(2),
  };
  const body = toBase64Url(JSON.stringify(payload));
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function parseOAuthState(state: string): OAuthStatePayload {
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    throw new Error("Invalid OAuth state.");
  }
  const expected = createHmac("sha256", signingKey()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("OAuth state signature mismatch.");
  }
  const payload = JSON.parse(fromBase64Url(body)) as OAuthStatePayload;
  if (!payload.organizationId || !payload.userId || !payload.provider || !payload.exp) {
    throw new Error("OAuth state is incomplete.");
  }
  if (Date.now() > payload.exp) {
    throw new Error("OAuth state expired. Please try connecting again.");
  }
  return payload;
}
