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

export interface PropertyDataProvider {
  name: string;
  getConnectionStatus(): Promise<"ready" | "not_configured" | "error">;
  fetchValuation(address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  }): Promise<ValuationResult | null>;
  fetchTax(address: {
    streetAddress: string;
    city: string;
    state: string;
    zipCode: string;
  }): Promise<TaxResult | null>;
}
