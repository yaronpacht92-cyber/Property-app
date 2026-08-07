import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashForAudit } from "@/lib/crypto";

describe("crypto helpers", () => {
  it("encrypts and decrypts secrets", () => {
    const encrypted = encryptSecret("refresh-token-value");
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe("refresh-token-value");
  });

  it("hashes audit identifiers without revealing the original value", () => {
    const hash = hashForAudit("203.0.113.10");
    expect(hash).toHaveLength(32);
    expect(hash).not.toContain("203");
  });
});
