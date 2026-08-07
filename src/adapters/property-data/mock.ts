import { createHash } from "crypto";
import type {
  AddressInput,
  CharacteristicsResult,
  PhotoResult,
  PropertyDataProvider,
  PropertyPublicSnapshot,
  SaleHistoryItem,
  TaxResult,
  ValuationResult,
} from "@/adapters/property-data/types";

/** Clearly labeled mock provider for development. Uses authorized-adapter shape only. */
export class MockPropertyDataProvider implements PropertyDataProvider {
  name = "authorized-sample-provider-mock";

  async getConnectionStatus() {
    return "ready" as const;
  }

  async fetchValuation(address: AddressInput): Promise<ValuationResult> {
    const seed = hash(`${address.streetAddress}-${address.zipCode}`);
    // Weekly drift: slight value change by ISO week so refreshes can find "newer" data.
    const week = isoWeekNumber(new Date());
    return {
      estimatedValue: 250000 + (seed % 750000) + week * 250,
      source: "Sample licensed provider (mock)",
      sourceUpdatedAt: new Date(),
      isEstimated: true as const,
    };
  }

  async fetchTax(address: AddressInput): Promise<TaxResult> {
    const seed = hash(`${address.city}-${address.zipCode}`);
    const week = isoWeekNumber(new Date());
    return {
      assessedValue: 200000 + (seed % 500000) + week * 100,
      annualTax: 3000 + (seed % 12000) + week * 5,
      authority: `${address.city} County Tax Assessor (sample authorized feed)`,
      parcelNumber: `SAMPLE-${seed.toString().padStart(8, "0")}`,
      source: "Sample licensed provider (mock)",
      sourceUpdatedAt: new Date(),
    };
  }

  async fetchCharacteristics(address: AddressInput): Promise<CharacteristicsResult> {
    const seed = hash(`${address.streetAddress}-${address.city}`);
    return {
      bedrooms: 2 + (seed % 4),
      bathrooms: 1 + (seed % 3) + (seed % 2 === 0 ? 0.5 : 0),
      squareFootage: 900 + (seed % 2500),
      lotSizeSqFt: 3000 + (seed % 12000),
      yearBuilt: 1950 + (seed % 70),
      source: "Sample licensed provider (mock)",
      sourceUpdatedAt: new Date(),
    };
  }

  async fetchSaleHistory(address: AddressInput): Promise<SaleHistoryItem[]> {
    const seed = hash(`${address.streetAddress}-sales`);
    const year = new Date().getFullYear();
    return [
      {
        externalKey: `${address.zipCode}-${seed}-sale-1`,
        saleDate: new Date(`${year - 6}-05-15T00:00:00.000Z`),
        salePrice: 200000 + (seed % 300000),
        buyerSeller: "Prior sale (sample)",
        source: "Sample licensed provider (mock)",
        sourceUpdatedAt: new Date(),
      },
      {
        externalKey: `${address.zipCode}-${seed}-sale-2`,
        saleDate: new Date(`${year - 1}-08-01T00:00:00.000Z`),
        salePrice: 280000 + (seed % 400000),
        buyerSeller: "Recent sale (sample)",
        source: "Sample licensed provider (mock)",
        sourceUpdatedAt: new Date(),
      },
    ];
  }

  async fetchExteriorPhoto(address: AddressInput): Promise<PhotoResult> {
    const seed = hash(`${address.streetAddress}-photo`);
    const week = isoWeekNumber(new Date());
    const label = `${address.streetAddress}\\n${address.city}, ${address.state}`;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f6b56"/>
      <stop offset="100%" stop-color="#0f3d32"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#g)"/>
  <rect x="180" y="140" width="280" height="180" fill="#f7faf8" opacity="0.92"/>
  <polygon points="180,140 320,70 460,140" fill="#dce8e3"/>
  <text x="320" y="230" text-anchor="middle" fill="#14201c" font-size="22" font-family="Arial, sans-serif">Sample exterior photo</text>
  <text x="320" y="265" text-anchor="middle" fill="#3d524a" font-size="16" font-family="Arial, sans-serif">${escapeXml(label)}</text>
  <text x="320" y="300" text-anchor="middle" fill="#3d524a" font-size="14" font-family="Arial, sans-serif">Authorized mock feed · week ${week}</text>
</svg>`;
    const data = Buffer.from(svg, "utf8");
    return {
      data,
      mimeType: "image/svg+xml",
      fileName: `sample-exterior-${seed}-${week}.svg`,
      source: "Sample licensed provider (mock)",
      retrievedAt: new Date(),
      contentKey: createHash("sha256").update(`${seed}-${week}`).digest("hex"),
    };
  }

  async fetchPublicSnapshot(address: AddressInput): Promise<PropertyPublicSnapshot> {
    const [valuation, tax, characteristics, saleHistory, photo] = await Promise.all([
      this.fetchValuation(address),
      this.fetchTax(address),
      this.fetchCharacteristics(address),
      this.fetchSaleHistory(address),
      this.fetchExteriorPhoto(address),
    ]);
    return {
      providerName: this.name,
      valuation,
      tax,
      characteristics,
      saleHistory,
      photo,
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

function isoWeekNumber(date: Date) {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
