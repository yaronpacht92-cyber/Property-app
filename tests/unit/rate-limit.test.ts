import { describe, expect, it } from "vitest";
import { clearRateLimits, rateLimit } from "@/lib/rate-limit";

describe("rate limiting", () => {
  it("blocks repeated attempts inside the window", () => {
    clearRateLimits();
    expect(rateLimit("test:user", 2, 60_000).ok).toBe(true);
    expect(rateLimit("test:user", 2, 60_000).ok).toBe(true);
    expect(rateLimit("test:user", 2, 60_000).ok).toBe(false);
  });
});
