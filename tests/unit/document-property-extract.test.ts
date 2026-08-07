import { describe, expect, it } from "vitest";
import { mapPropertyFieldsFromText } from "@/lib/document-property-extract";

describe("mapPropertyFieldsFromText", () => {
  it("extracts address, beds, baths, value, and tax fields from a sample closing summary", () => {
    const text = `
      CLOSING STATEMENT
      Property Address: 544 Saddlewood Lane, Montgomery, AL 36109
      Purchase Price: $285,000
      Closing Date: March 15, 2021
      Estimated Market Value: $310,000
      Assessed Value: $103,400
      Annual Property Taxes: $1,240
      Bedrooms: 3
      Bathrooms: 2.5
      Living Area: 1,850 sq ft
      Year Built: 1998
      This is a residential single-family dwelling.
    `;

    const result = mapPropertyFieldsFromText(text);
    expect(result.filledCount).toBeGreaterThan(8);
    expect(result.fields.streetAddress).toMatch(/544 Saddlewood/i);
    expect(result.fields.city).toBe("Montgomery");
    expect(result.fields.state).toBe("AL");
    expect(result.fields.zipCode).toBe("36109");
    expect(result.fields.purchasePrice).toBe("285000");
    expect(result.fields.estimatedValue).toBe("310000");
    expect(result.fields.assessedValue).toBe("103400");
    expect(result.fields.annualTaxes).toBe("1240");
    expect(result.fields.bedrooms).toBe("3");
    expect(result.fields.bathrooms).toBe("2.5");
    expect(result.fields.squareFootage).toBe("1850");
    expect(result.fields.yearBuilt).toBe("1998");
    expect(result.fields.propertyType).toBe("RESIDENTIAL");
    expect(result.fields.dateAcquired).toBe("2021-03-15");
  });

  it("extracts rent and lease details from a lease snippet", () => {
    const text = `
      RESIDENTIAL LEASE AGREEMENT
      Premises: 123 Oak Street, Austin, TX 78702
      Monthly Rent: $2,400 per month
      Lease Term: 12 months
      Lease Expiration Date: December 31, 2026
      Property Manager: Jordan Lee
    `;
    const result = mapPropertyFieldsFromText(text);
    expect(result.fields.monthlyRent).toBe("2400");
    expect(result.fields.leaseLengthMonths).toBe("12");
    expect(result.fields.leaseExpiresAt).toBe("2026-12-31");
    expect(result.fields.managerName).toMatch(/Jordan Lee/i);
  });

  it("returns a helpful warning when text is too short", () => {
    const result = mapPropertyFieldsFromText("hi");
    expect(result.filledCount).toBe(0);
    expect(result.warnings[0]?.toLowerCase()).toContain("enough text");
  });
});
