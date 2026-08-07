import { MockPropertyDataProvider } from "@/adapters/property-data/mock";
import type { PropertyDataProvider } from "@/adapters/property-data/types";

export function getPropertyDataProvider(): PropertyDataProvider {
  // Licensed providers (ATTOM, CoreLogic, MLS feeds, etc.) plug in when configured.
  // Never scrape consumer websites. Manual entry remains available when not configured.
  const configured = process.env.PROPERTY_DATA_PROVIDER || "mock";
  if (configured !== "mock" && process.env.PROPERTY_DATA_API_KEY) {
    // Real adapters register here. Fall back to mock until a licensed client is wired.
    return new MockPropertyDataProvider();
  }
  return new MockPropertyDataProvider();
}

export type {
  PropertyDataProvider,
  PropertyPublicSnapshot,
} from "@/adapters/property-data/types";
