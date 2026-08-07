import { describe, expect, it } from "vitest";
import { MockPropertyDataProvider } from "@/adapters/property-data/mock";

describe("property data adapter", () => {
  it("returns clearly labeled sample estimates", async () => {
    const provider = new MockPropertyDataProvider();
    const result = await provider.fetchValuation({
      streetAddress: "123 Oak Street",
      city: "Austin",
      state: "TX",
      zipCode: "78702",
    });
    expect(result?.isEstimated).toBe(true);
    expect(result?.source.toLowerCase()).toContain("sample");
  });
});
