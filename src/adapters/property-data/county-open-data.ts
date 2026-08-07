import {
  escapeArcGisLiteral,
  normalizeStreet,
  parseHouseNumber,
  scoreAddressMatch,
  streetNameTokens,
} from "@/adapters/property-data/address-match";
import {
  layersForAddress,
  type CountyParcelLayer,
} from "@/adapters/property-data/county-layers";
import type {
  AddressInput,
  CharacteristicsResult,
  PropertyDataProvider,
  PropertyPublicSnapshot,
  SaleHistoryItem,
  TaxResult,
  ValuationResult,
} from "@/adapters/property-data/types";

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
};

type ArcGisQueryResponse = {
  features?: ArcGisFeature[];
  error?: { message?: string; code?: number };
};

type ParcelMatch = {
  layer: CountyParcelLayer;
  attributes: Record<string, unknown>;
  score: number;
};

export type CountyOpenDataFetch = (url: string, init?: RequestInit) => Promise<Response>;

const ACRES_TO_SQ_FT = 43560;

/**
 * Public county / municipal GIS parcel adapter.
 * Uses official ArcGIS REST endpoints only — never consumer listing sites.
 */
export class CountyOpenDataProvider implements PropertyDataProvider {
  name = "county-open-data";
  private readonly fetchImpl: CountyOpenDataFetch;

  constructor(options?: { fetchImpl?: CountyOpenDataFetch }) {
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async getConnectionStatus() {
    return "ready" as const;
  }

  async fetchValuation(_address: AddressInput): Promise<ValuationResult | null> {
    // Assessor totals are not market AVMs. Keep valuation empty so the UI does not
    // present county assessed value as an estimated market price.
    return null;
  }

  async fetchTax(address: AddressInput): Promise<TaxResult | null> {
    const match = await this.findParcel(address);
    if (!match) return null;
    return this.toTax(match);
  }

  async fetchCharacteristics(address: AddressInput): Promise<CharacteristicsResult | null> {
    const match = await this.findParcel(address);
    if (!match) return null;
    return this.toCharacteristics(match);
  }

  async fetchSaleHistory(_address: AddressInput): Promise<SaleHistoryItem[]> {
    return [];
  }

  async fetchExteriorPhoto() {
    return null;
  }

  async fetchPublicSnapshot(address: AddressInput): Promise<PropertyPublicSnapshot> {
    const match = await this.findParcel(address);
    if (!match) {
      return {
        providerName: this.name,
        valuation: null,
        tax: null,
        characteristics: null,
        saleHistory: [],
        photo: null,
      };
    }
    return {
      providerName: match.layer.displayName,
      valuation: null,
      tax: this.toTax(match),
      characteristics: this.toCharacteristics(match),
      saleHistory: [],
      photo: null,
    };
  }

  /** True when at least one registered public layer covers this address. */
  supportsAddress(address: AddressInput): boolean {
    return layersForAddress(address).length > 0;
  }

  private toTax(match: ParcelMatch): TaxResult {
    const { layer, attributes } = match;
    const total = numberField(attributes, layer.fields.totalValue);
    const recordYear = numberField(attributes, layer.fields.recordYear);
    const retrievedAt = new Date();
    const yearLabel = recordYear ? ` · record year ${Math.trunc(recordYear)}` : "";
    return {
      assessedValue: total,
      annualTax: null,
      authority: `${layer.county} County assessor / revenue (public GIS)`,
      parcelNumber: cleanString(stringField(attributes, layer.fields.parcelNumber)),
      source: `${layer.displayName}${yearLabel}`,
      sourceUpdatedAt: retrievedAt,
    };
  }

  private toCharacteristics(match: ParcelMatch): CharacteristicsResult | null {
    const { layer, attributes } = match;
    const acres = numberField(attributes, layer.fields.acres);
    const lotSizeSqFt =
      acres !== null && acres > 0 ? Math.round(acres * ACRES_TO_SQ_FT) : null;
    if (lotSizeSqFt === null) return null;
    const recordYear = numberField(attributes, layer.fields.recordYear);
    const yearLabel = recordYear ? ` · record year ${Math.trunc(recordYear)}` : "";
    return {
      bedrooms: null,
      bathrooms: null,
      squareFootage: null,
      lotSizeSqFt,
      yearBuilt: null,
      source: `${layer.displayName}${yearLabel}`,
      sourceUpdatedAt: new Date(),
    };
  }

  private async findParcel(address: AddressInput): Promise<ParcelMatch | null> {
    const layers = layersForAddress(address);
    let best: ParcelMatch | null = null;

    for (const layer of layers) {
      const features = await this.queryLayer(layer, address);
      for (const feature of features) {
        const attributes = feature.attributes ?? {};
        const gisStreet = stringField(attributes, layer.fields.propertyAddress) ?? "";
        const score = scoreAddressMatch(address.streetAddress, gisStreet);
        if (score < 70) continue;
        if (!best || score > best.score) {
          best = { layer, attributes, score };
        }
      }
    }

    return best;
  }

  private async queryLayer(
    layer: CountyParcelLayer,
    address: AddressInput,
  ): Promise<ArcGisFeature[]> {
    const where = buildAddressWhere(layer, address);
    if (!where) return [];

    const outFields = [
      layer.fields.parcelNumber,
      layer.fields.ownerName,
      layer.fields.propertyAddress,
      layer.fields.propertyCity,
      layer.fields.propertyState,
      layer.fields.propertyZip,
      layer.fields.totalValue,
      layer.fields.landValue,
      layer.fields.improvementValue,
      layer.fields.acres,
      layer.fields.recordYear,
    ]
      .filter(Boolean)
      .join(",");

    const url = new URL(layer.queryUrl);
    url.searchParams.set("where", where);
    url.searchParams.set("outFields", outFields);
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("resultRecordCount", "10");
    url.searchParams.set("f", "json");

    const response = await this.fetchImpl(url.toString(), {
      headers: { Accept: "application/json" },
      // Public GIS; avoid hanging the refresh job.
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      throw new Error(`County GIS HTTP ${response.status}`);
    }

    const payload = (await response.json()) as ArcGisQueryResponse;
    if (payload.error) {
      throw new Error(payload.error.message || "County GIS query failed");
    }
    return payload.features ?? [];
  }
}

function buildAddressWhere(layer: CountyParcelLayer, address: AddressInput): string | null {
  const house = parseHouseNumber(address.streetAddress);
  const tokens = streetNameTokens(address.streetAddress);
  if (!house || tokens.length === 0) return null;

  const streetField = layer.fields.propertyAddress;
  const cityField = layer.fields.propertyCity;
  const stateField = layer.fields.propertyState;
  const zipField = layer.fields.propertyZip;

  const streetToken = escapeArcGisLiteral(tokens[0]!);
  const houseEsc = escapeArcGisLiteral(house);
  const clauses = [
    `UPPER(${streetField}) LIKE '${houseEsc} %${streetToken}%'`,
  ];

  const city = normalizeStreet(address.city).split(" ")[0];
  if (city && city.length >= 3) {
    clauses.push(`UPPER(${cityField}) LIKE '%${escapeArcGisLiteral(city)}%'`);
  }

  const state = normalizeStreet(address.state);
  if (state.length === 2) {
    clauses.push(`UPPER(${stateField}) LIKE '${escapeArcGisLiteral(state)}%'`);
  }

  const zip5 = address.zipCode.trim().slice(0, 5);
  if (/^\d{5}$/.test(zip5)) {
    clauses.push(`UPPER(${zipField}) LIKE '${escapeArcGisLiteral(zip5)}%'`);
  }

  return clauses.join(" AND ");
}

function stringField(attrs: Record<string, unknown>, field?: string): string | null {
  if (!field) return null;
  const value = attrs[field];
  if (value === null || value === undefined) return null;
  return String(value);
}

function numberField(attrs: Record<string, unknown>, field?: string): number | null {
  if (!field) return null;
  const value = attrs[field];
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
