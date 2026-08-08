import { describe, expect, it } from "vitest";
import { matchEmailToProperty } from "@/services/email-match";
import { categorizeEmail } from "@/adapters/email/category";
import { createOAuthState, parseOAuthState } from "@/lib/oauth-state";
import { openTokens, sealTokens, tokensNeedRefresh } from "@/lib/token-vault";

const properties = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    nickname: "Oak Street",
    streetAddress: "123 Oak Street",
    city: "Austin",
    zipCode: "78701",
    parcelNumbers: ["R123456"],
    managerEmails: ["manager@oak.example"],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    nickname: "Lake House",
    streetAddress: "9 Lake View",
    city: "Austin",
    zipCode: "78703",
    parcelNumbers: ["R999000"],
    managerEmails: ["lake@pm.example"],
  },
];

describe("email matching", () => {
  it("matches by manager email", () => {
    const result = matchEmailToProperty(
      {
        subject: "Monthly update",
        snippet: "All good",
        sender: "Oak Manager <manager@oak.example>",
      },
      properties,
    );
    expect(result).toEqual({
      propertyId: properties[0].id,
      matchMethod: "manager_email",
      ambiguous: false,
    });
  });

  it("matches by parcel number", () => {
    const result = matchEmailToProperty(
      {
        subject: "Tax notice for parcel R123456",
        snippet: "Please review",
        sender: "taxes@county.example",
      },
      properties,
    );
    expect(result.matchMethod).toBe("parcel_number");
    expect(result.propertyId).toBe(properties[0].id);
  });

  it("matches by street address", () => {
    const result = matchEmailToProperty(
      {
        subject: "Inspection at 123 Oak Street",
        snippet: "Tuesday morning",
        sender: "inspector@city.example",
      },
      properties,
    );
    expect(result.matchMethod).toBe("street_address");
    expect(result.propertyId).toBe(properties[0].id);
  });

  it("matches by nickname", () => {
    const result = matchEmailToProperty(
      {
        subject: "Lake House roof quote",
        snippet: "Estimate attached",
        sender: "roofs@vendor.example",
      },
      properties,
    );
    expect(result.matchMethod).toBe("nickname");
    expect(result.propertyId).toBe(properties[1].id);
  });

  it("leaves ambiguous matches unmatched", () => {
    const result = matchEmailToProperty(
      {
        subject: "Austin portfolio note",
        snippet: "Mentions Oak Street and Lake House",
        sender: "ops@family.example",
      },
      properties,
    );
    // Nickname/address multi-hit should be ambiguous or null depending on which rule fires.
    expect(result.propertyId).toBeNull();
  });
});

describe("email category heuristics", () => {
  it("detects insurance and maintenance categories", () => {
    expect(categorizeEmail("Policy renewal", "premium due", "agent@insure.example")).toBe(
      "INSURANCE",
    );
    expect(categorizeEmail("HVAC repair", "technician visit", "jobs@hvac.example")).toBe(
      "MAINTENANCE",
    );
  });
});

describe("oauth state and token vault", () => {
  it("round-trips signed oauth state", () => {
    const state = createOAuthState({
      organizationId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      userId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      provider: "GMAIL",
    });
    const parsed = parseOAuthState(state);
    expect(parsed.provider).toBe("GMAIL");
    expect(parsed.organizationId).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
  });

  it("seals and opens oauth tokens", () => {
    const sealed = sealTokens({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60_000,
      demo: true,
    });
    const opened = openTokens(sealed);
    expect(opened.accessToken).toBe("access");
    expect(opened.demo).toBe(true);
    expect(tokensNeedRefresh({ ...opened, expiresAt: Date.now() - 1 })).toBe(true);
  });
});
