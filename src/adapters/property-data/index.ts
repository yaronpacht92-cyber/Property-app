import { CountyOpenDataProvider } from "@/adapters/property-data/county-open-data";
import { MockPropertyDataProvider } from "@/adapters/property-data/mock";
import { RoutingPropertyDataProvider } from "@/adapters/property-data/routing";
import type { PropertyDataProvider } from "@/adapters/property-data/types";

/**
 * Resolve the active property-data provider.
 *
 * - `auto` (default): public county GIS when the address is covered, else mock
 * - `county` / `county-open-data`: same routing (county first)
 * - `mock`: sample data only
 *
 * Licensed commercial adapters register here when API keys are present.
 * Never scrape consumer websites.
 */
export function getPropertyDataProvider(): PropertyDataProvider {
  const configured = (process.env.PROPERTY_DATA_PROVIDER || "auto").toLowerCase();
  const mock = new MockPropertyDataProvider();
  const county = new CountyOpenDataProvider();

  if (configured === "mock") {
    return mock;
  }

  if (
    configured === "auto" ||
    configured === "county" ||
    configured === "county-open-data"
  ) {
    return new RoutingPropertyDataProvider([county], mock);
  }

  // Future licensed providers (ATTOM, CoreLogic, etc.) when key is configured.
  if (process.env.PROPERTY_DATA_API_KEY) {
    return new RoutingPropertyDataProvider([county], mock);
  }

  return new RoutingPropertyDataProvider([county], mock);
}

export type {
  PropertyDataProvider,
  PropertyPublicSnapshot,
} from "@/adapters/property-data/types";
export { CountyOpenDataProvider } from "@/adapters/property-data/county-open-data";
export { COUNTY_PARCEL_LAYERS } from "@/adapters/property-data/county-layers";
