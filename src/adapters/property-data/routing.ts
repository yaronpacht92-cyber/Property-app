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
import type { CountyOpenDataProvider } from "@/adapters/property-data/county-open-data";

type PreferableProvider = PropertyDataProvider & {
  supportsAddress?: (address: AddressInput) => boolean;
};

/**
 * Tries preferred providers (e.g. public county GIS) when they cover an address,
 * otherwise uses the fallback (mock or licensed).
 */
export class RoutingPropertyDataProvider implements PropertyDataProvider {
  name = "routing-property-data";

  constructor(
    private readonly preferred: PreferableProvider[],
    private readonly fallback: PropertyDataProvider,
  ) {}

  async getConnectionStatus() {
    for (const provider of this.preferred) {
      const status = await provider.getConnectionStatus();
      if (status === "ready") return "ready";
    }
    return this.fallback.getConnectionStatus();
  }

  async fetchValuation(address: AddressInput): Promise<ValuationResult | null> {
    const provider = this.pick(address);
    return provider.fetchValuation(address);
  }

  async fetchTax(address: AddressInput): Promise<TaxResult | null> {
    const provider = this.pick(address);
    const tax = await provider.fetchTax(address);
    if (tax) return tax;
    if (provider !== this.fallback) {
      return this.fallback.fetchTax(address);
    }
    return null;
  }

  async fetchCharacteristics(address: AddressInput): Promise<CharacteristicsResult | null> {
    const provider = this.pick(address);
    if (provider.fetchCharacteristics) {
      const chars = await provider.fetchCharacteristics(address);
      if (chars) return chars;
    }
    if (provider !== this.fallback && this.fallback.fetchCharacteristics) {
      return this.fallback.fetchCharacteristics(address);
    }
    return null;
  }

  async fetchSaleHistory(address: AddressInput): Promise<SaleHistoryItem[]> {
    const provider = this.pick(address);
    if (provider.fetchSaleHistory) {
      const sales = await provider.fetchSaleHistory(address);
      if (sales.length) return sales;
    }
    if (provider !== this.fallback && this.fallback.fetchSaleHistory) {
      return this.fallback.fetchSaleHistory(address);
    }
    return [];
  }

  async fetchExteriorPhoto(address: AddressInput): Promise<PhotoResult | null> {
    const provider = this.pick(address);
    if (provider.fetchExteriorPhoto) {
      const photo = await provider.fetchExteriorPhoto(address);
      if (photo) return photo;
    }
    if (provider !== this.fallback && this.fallback.fetchExteriorPhoto) {
      return this.fallback.fetchExteriorPhoto(address);
    }
    return null;
  }

  async fetchPublicSnapshot(address: AddressInput): Promise<PropertyPublicSnapshot> {
    const preferred = this.preferred.find((p) => this.covers(p, address));
    if (preferred) {
      const snapshot = await preferred.fetchPublicSnapshot(address);
      // County hit with real tax/characteristics — use it (no mock market estimate).
      if (snapshot.tax || snapshot.characteristics) {
        return snapshot;
      }
    }
    return this.fallback.fetchPublicSnapshot(address);
  }

  private pick(address: AddressInput): PropertyDataProvider {
    return this.preferred.find((p) => this.covers(p, address)) ?? this.fallback;
  }

  private covers(provider: PreferableProvider, address: AddressInput): boolean {
    if (typeof provider.supportsAddress === "function") {
      return provider.supportsAddress(address);
    }
    return false;
  }
}

export function isCountyProvider(
  provider: PropertyDataProvider,
): provider is CountyOpenDataProvider {
  return provider.name === "county-open-data";
}
