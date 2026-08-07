export type AddressInput = {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
};

export type ValuationResult = {
  estimatedValue: number;
  source: string;
  sourceUpdatedAt: Date;
  isEstimated: true;
};

export type TaxResult = {
  assessedValue: number | null;
  annualTax: number | null;
  authority: string | null;
  parcelNumber: string | null;
  source: string;
  sourceUpdatedAt: Date;
};

export type CharacteristicsResult = {
  bedrooms: number | null;
  bathrooms: number | null;
  squareFootage: number | null;
  lotSizeSqFt: number | null;
  yearBuilt: number | null;
  source: string;
  sourceUpdatedAt: Date;
};

export type SaleHistoryItem = {
  externalKey: string;
  saleDate: Date;
  salePrice: number | null;
  buyerSeller: string | null;
  source: string;
  sourceUpdatedAt: Date;
};

export type PhotoResult = {
  /** Raw image bytes from an authorized provider/mock. */
  data: Buffer;
  mimeType: string;
  fileName: string;
  source: string;
  retrievedAt: Date;
  /** Stable key used to detect whether the provider photo changed. */
  contentKey: string;
};

export type PropertyPublicSnapshot = {
  providerName: string;
  valuation: ValuationResult | null;
  tax: TaxResult | null;
  characteristics: CharacteristicsResult | null;
  saleHistory: SaleHistoryItem[];
  photo: PhotoResult | null;
};

export interface PropertyDataProvider {
  name: string;
  getConnectionStatus(): Promise<"ready" | "not_configured" | "error">;
  fetchValuation(address: AddressInput): Promise<ValuationResult | null>;
  fetchTax(address: AddressInput): Promise<TaxResult | null>;
  fetchCharacteristics?(address: AddressInput): Promise<CharacteristicsResult | null>;
  fetchSaleHistory?(address: AddressInput): Promise<SaleHistoryItem[]>;
  fetchExteriorPhoto?(address: AddressInput): Promise<PhotoResult | null>;
  fetchPublicSnapshot(address: AddressInput): Promise<PropertyPublicSnapshot>;
}
