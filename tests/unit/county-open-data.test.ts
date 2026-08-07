import { describe, expect, it, vi } from "vitest";
import { CountyOpenDataProvider } from "@/adapters/property-data/county-open-data";
import { scoreAddressMatch, streetNameTokens } from "@/adapters/property-data/address-match";
import { RoutingPropertyDataProvider } from "@/adapters/property-data/routing";
import { MockPropertyDataProvider } from "@/adapters/property-data/mock";

const saddlewoodGis = {
  features: [
    {
      attributes: {
        ParcelNo: "10 01 01 3 007 003.034",
        OwnerName: "PACHT JARON & TENENBAUM RACHEL",
        PropertyAddr1: "544 SADDLEWOOD LN",
        PropertyCity: "MONTGOMERY",
        PropertyState: "AL",
        PropertyZip: "36109",
        Calc_Acre: 0.08566993,
        TotalLandValue: 15000,
        TotalImpValue: 88400,
        TotalValue: 103400,
        RecordYear: 2026,
      },
    },
  ],
};

describe("address matching helpers", () => {
  it("normalizes lane abbreviations for token matching", () => {
    expect(streetNameTokens("544 Saddlewood Lane")).toContain("SADDLEWOOD");
    expect(scoreAddressMatch("544 Saddlewood Lane", "544 SADDLEWOOD LN")).toBeGreaterThanOrEqual(
      70,
    );
  });
});

describe("CountyOpenDataProvider", () => {
  it("maps Montgomery County parcel fields for Saddlewood without inventing a market estimate", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(saddlewoodGis), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new CountyOpenDataProvider({ fetchImpl });
    const address = {
      streetAddress: "544 Saddlewood Lane",
      city: "Montgomery",
      state: "AL",
      zipCode: "36109",
    };

    expect(provider.supportsAddress(address)).toBe(true);

    const snapshot = await provider.fetchPublicSnapshot(address);
    expect(snapshot.providerName).toContain("Montgomery County");
    expect(snapshot.valuation).toBeNull();
    expect(snapshot.tax?.assessedValue).toBe(103400);
    expect(snapshot.tax?.parcelNumber).toContain("003.034");
    expect(snapshot.tax?.source.toLowerCase()).toContain("montgomery");
    expect(snapshot.characteristics?.lotSizeSqFt).toBe(Math.round(0.08566993 * 43560));
    expect(snapshot.characteristics?.bedrooms).toBeNull();
    expect(snapshot.photo).toBeNull();
    expect(fetchImpl).toHaveBeenCalled();
  });

  it("returns empty tax when GIS has no matching feature", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ features: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new CountyOpenDataProvider({ fetchImpl });
    const tax = await provider.fetchTax({
      streetAddress: "999 Missing Road",
      city: "Montgomery",
      state: "AL",
      zipCode: "36109",
    });
    expect(tax).toBeNull();
  });

  it("does not claim coverage outside registered counties", () => {
    const provider = new CountyOpenDataProvider();
    expect(
      provider.supportsAddress({
        streetAddress: "123 Oak Street",
        city: "Austin",
        state: "TX",
        zipCode: "78702",
      }),
    ).toBe(false);
  });
});

describe("RoutingPropertyDataProvider", () => {
  it("prefers county GIS over mock for covered addresses", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify(saddlewoodGis), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const county = new CountyOpenDataProvider({ fetchImpl });
    const mock = new MockPropertyDataProvider();
    const router = new RoutingPropertyDataProvider([county], mock);

    const snapshot = await router.fetchPublicSnapshot({
      streetAddress: "544 Saddlewood Lane",
      city: "Montgomery",
      state: "AL",
      zipCode: "36109",
    });

    expect(snapshot.tax?.assessedValue).toBe(103400);
    expect(snapshot.valuation).toBeNull();
    expect(snapshot.providerName.toLowerCase()).toContain("montgomery");
  });

  it("falls back to mock outside county coverage", async () => {
    const county = new CountyOpenDataProvider({
      fetchImpl: vi.fn(async () => {
        throw new Error("should not call GIS outside coverage");
      }),
    });
    const mock = new MockPropertyDataProvider();
    const router = new RoutingPropertyDataProvider([county], mock);

    const snapshot = await router.fetchPublicSnapshot({
      streetAddress: "123 Oak Street",
      city: "Austin",
      state: "TX",
      zipCode: "78702",
    });

    expect(snapshot.valuation?.estimatedValue).toBeGreaterThan(0);
    expect(snapshot.providerName).toContain("mock");
  });
});
