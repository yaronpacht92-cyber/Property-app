import type { PropertyDataProvider } from "@/adapters/property-data/types";

/** Clearly labeled mock provider for development. Not a live data source. */
export class MockPropertyDataProvider implements PropertyDataProvider {
  name = "mock-sample-data";

  async getConnectionStatus() {
    return "ready" as const;
  }

  async fetchValuation(address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  }) {
    const seed = hash(`${address.streetAddress}-${address.zipCode}`);
    return {
      estimatedValue: 250000 + (seed % 750000),
      source: "Sample data provider (mock)",
      sourceUpdatedAt: new Date(),
      isEstimated: true as const,
    };
  }

  async fetchTax(address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  }) {
    const seed = hash(`${address.city}-${address.zipCode}`);
    return {
      assessedValue: 200000 + (seed % 500000),
      annualTax: 3000 + (seed % 12000),
      authority: `${address.city} County Tax Assessor (sample)`,
      parcelNumber: `SAMPLE-${seed.toString().padStart(8, "0")}`,
      source: "Sample data provider (mock)",
      sourceUpdatedAt: new Date(),
    };
  }
}

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}
