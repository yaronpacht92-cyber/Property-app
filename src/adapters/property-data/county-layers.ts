import type { AddressInput } from "@/adapters/property-data/types";

/** Public ArcGIS MapServer/FeatureServer parcel layer configuration. */
export type CountyParcelLayer = {
  id: string;
  /** Display name shown in UI / source labels. */
  displayName: string;
  state: string;
  /** Optional county name for docs/labels. */
  county: string;
  /** ArcGIS layer query endpoint (…/MapServer/0 or …/FeatureServer/0). */
  queryUrl: string;
  /** Field mapping for this layer’s attribute schema. */
  fields: {
    parcelNumber: string;
    ownerName?: string;
    propertyAddress: string;
    propertyCity: string;
    propertyState: string;
    propertyZip: string;
    totalValue?: string;
    landValue?: string;
    improvementValue?: string;
    acres?: string;
    recordYear?: string;
  };
  /** Return true when this layer should be queried for the address. */
  matchesAddress: (address: AddressInput) => boolean;
};

function norm(value: string) {
  return value.trim().toUpperCase();
}

/**
 * Registry of public county / municipal parcel GIS layers.
 * Add new jurisdictions here — do not scrape consumer listing sites.
 */
export const COUNTY_PARCEL_LAYERS: CountyParcelLayer[] = [
  {
    id: "al-montgomery-parcels",
    displayName: "Montgomery County, AL public GIS parcels",
    state: "AL",
    county: "Montgomery",
    queryUrl:
      "https://gis.montgomeryal.gov/server/rest/services/Parcels/MapServer/0/query",
    fields: {
      parcelNumber: "ParcelNo",
      ownerName: "OwnerName",
      propertyAddress: "PropertyAddr1",
      propertyCity: "PropertyCity",
      propertyState: "PropertyState",
      propertyZip: "PropertyZip",
      totalValue: "TotalValue",
      landValue: "TotalLandValue",
      improvementValue: "TotalImpValue",
      acres: "Calc_Acre",
      recordYear: "RecordYear",
    },
    matchesAddress: (address) => {
      if (norm(address.state) !== "AL") return false;
      const city = norm(address.city);
      const zip = address.zipCode.trim();
      return (
        city.includes("MONTGOMERY") ||
        zip.startsWith("361") ||
        // Nearby Montgomery County ZIPs commonly used in the portfolio
        ["36043", "36064", "36069", "36013"].some((z) => zip.startsWith(z))
      );
    },
  },
];

export function layersForAddress(address: AddressInput): CountyParcelLayer[] {
  return COUNTY_PARCEL_LAYERS.filter((layer) => layer.matchesAddress(address));
}
