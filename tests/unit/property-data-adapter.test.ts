import { describe, expect, it } from "vitest";
import { getPropertyDataProvider } from "@/adapters/property-data";
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

  it("returns a full public snapshot including photo metadata from the mock provider", async () => {
    const provider = new MockPropertyDataProvider();
    const snapshot = await provider.fetchPublicSnapshot({
      streetAddress: "123 Oak Street",
      city: "Austin",
      state: "TX",
      zipCode: "78702",
    });
    expect(snapshot.valuation?.estimatedValue).toBeGreaterThan(0);
    expect(snapshot.tax?.annualTax).toBeTruthy();
    expect(snapshot.characteristics?.bedrooms).toBeTruthy();
    expect(snapshot.saleHistory.length).toBeGreaterThan(0);
    expect(snapshot.photo?.source.toLowerCase()).toContain("sample");
  });

  it("wires auto mode to the routing provider by default", () => {
    const previous = process.env.PROPERTY_DATA_PROVIDER;
    process.env.PROPERTY_DATA_PROVIDER = "auto";
    try {
      const provider = getPropertyDataProvider();
      expect(provider.name).toBe("routing-property-data");
    } finally {
      if (previous === undefined) delete process.env.PROPERTY_DATA_PROVIDER;
      else process.env.PROPERTY_DATA_PROVIDER = previous;
    }
  });
});

