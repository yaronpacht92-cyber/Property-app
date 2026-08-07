import { MockPropertyDataProvider } from "@/adapters/property-data/mock";
import type { PropertyDataProvider } from "@/adapters/property-data/types";

export function getPropertyDataProvider(): PropertyDataProvider {
  // Licensed providers (ATTOM, etc.) plug in when PROPERTY_DATA_PROVIDER + API key are set.
  return new MockPropertyDataProvider();
}

export type { PropertyDataProvider } from "@/adapters/property-data/types";
