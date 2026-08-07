export type ExtractedPropertyFields = {
  nickname?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: "RESIDENTIAL" | "COMMERCIAL" | "VACANT_LAND" | "OTHER";
  dateAcquired?: string;
  purchasePrice?: string;
  monthlyRent?: string;
  leaseLengthMonths?: string;
  leaseExpiresAt?: string;
  monthlyManagementFee?: string;
  otherMonthlyExpenses?: string;
  estimatedValue?: string;
  assessedValue?: string;
  annualTaxes?: string;
  taxJurisdiction?: string;
  bedrooms?: string;
  bathrooms?: string;
  squareFootage?: string;
  lotSizeSqFt?: string;
  yearBuilt?: string;
  insuranceCarrier?: string;
  insurancePolicyNumber?: string;
  insuranceRenewalDate?: string;
  managerName?: string;
  managerCompany?: string;
  managerPhone?: string;
  managerEmail?: string;
};

export type ExtractionResult = {
  fields: ExtractedPropertyFields;
  filledCount: number;
  warnings: string[];
  previewText: string;
};

function cleanMoney(raw: string) {
  const n = Number(raw.replace(/[,$]/g, ""));
  return Number.isFinite(n) ? String(Math.round(n)) : undefined;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function normalizeWhitespace(text: string) {
  return text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Heuristic mapper from closing statements, tax bills, leases, listings, etc. */
export function mapPropertyFieldsFromText(rawText: string): ExtractionResult {
  const text = normalizeWhitespace(rawText);
  const lower = text.toLowerCase();
  const fields: ExtractedPropertyFields = {};
  const warnings: string[] = [];

  if (text.length < 40) {
    return {
      fields,
      filledCount: 0,
      warnings: [
        "We could not read enough text from that file. Try a clearer scan or a text PDF.",
      ],
      previewText: text.slice(0, 400),
    };
  }

  const addressBlock = firstMatch(text, [
    /(?:property address|subject property|premises|located at|address)[:\s]+([^\n]{8,120})/i,
    /(\d{1,6}\s+[A-Za-z0-9.'\- ]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Place|Pl)\.?[^\n]{0,40})/i,
  ]);

  if (addressBlock) {
    const cleaned = addressBlock.replace(/\s+/g, " ").trim();
    const cityStateZip = cleaned.match(
      /^(.+?)[,\n]\s*([A-Za-z .'-]+)\s*,?\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/i,
    );
    if (cityStateZip) {
      fields.streetAddress = cityStateZip[1]!.replace(/,$/, "").trim();
      fields.city = cityStateZip[2]!.trim();
      fields.state = cityStateZip[3]!.toUpperCase();
      fields.zipCode = cityStateZip[4]!;
    } else {
      const loose = cleaned.match(
        /(\d{1,6}\s+[^,\n]+)\s*,\s*([^,\n]+)\s*,\s*([A-Z]{2})\s+(\d{5})/i,
      );
      if (loose) {
        fields.streetAddress = loose[1]!.trim();
        fields.city = loose[2]!.trim();
        fields.state = loose[3]!.toUpperCase();
        fields.zipCode = loose[4]!;
      } else {
        fields.streetAddress = cleaned.split(",")[0]?.trim();
      }
    }
  }

  if (fields.streetAddress && !fields.nickname) {
    fields.nickname = fields.streetAddress
      .replace(/^\d+\s+/, "")
      .replace(/\b(Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr)\b\.?/gi, "")
      .trim()
      .slice(0, 80);
  }

  const beds = firstMatch(text, [
    /(?:bedrooms?|beds?)\s*[:=]\s*(\d+)/i,
    /(?:^|[^\d$,])(\d{1,2})\s*(?:bedrooms?|beds?|br)\b/i,
  ]);
  if (beds) fields.bedrooms = beds;

  const baths = firstMatch(text, [
    /(?:bathrooms?|baths?)\s*[:=]\s*(\d+(?:\.\d+)?)/i,
    /(?:^|[^\d$,])(\d{1,2}(?:\.\d+)?)\s*(?:bathrooms?|baths?|ba)\b/i,
  ]);
  if (baths) fields.bathrooms = baths;

  const sqft = firstMatch(text, [
    /(?:living area|heated|finished|square footage|sq\.?\s*ft\.?|sf)[:\s]*([\d,]+)/i,
    /([\d,]+)\s*(?:sq\.?\s*ft\.?|square feet)\b/i,
  ]);
  if (sqft) fields.squareFootage = sqft.replace(/,/g, "");

  const lot = firstMatch(text, [
    /(?:lot size|lot area)[:\s]*([\d,]+)\s*(?:sq\.?\s*ft\.?|sf)?/i,
    /([\d,]+)\s*(?:sq\.?\s*ft\.?)\s*(?:lot)\b/i,
  ]);
  if (lot) fields.lotSizeSqFt = lot.replace(/,/g, "");

  const year = firstMatch(text, [
    /(?:year built|built in|yr\.?\s*built)[:\s]*(\d{4})/i,
    /\b(19\d{2}|20[0-2]\d)\s*(?:year built|construction)/i,
  ]);
  if (year) fields.yearBuilt = year;

  const purchase = firstMatch(text, [
    /(?:purchase price|sale price|sales price|consideration)[:\s]*\$?\s*([\d,]+)/i,
  ]);
  if (purchase) fields.purchasePrice = cleanMoney(purchase);

  const rent = firstMatch(text, [
    /(?:monthly rent|base rent|rent amount)[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]+(?:\.\d{2})?)\s*(?:per month|\/\s*mo(?:nth)?)/i,
  ]);
  if (rent) fields.monthlyRent = cleanMoney(rent);

  const estimated = firstMatch(text, [
    /(?:estimated (?:market )?value|market value|appraised value)[:\s]*\$?\s*([\d,]+)/i,
  ]);
  if (estimated) fields.estimatedValue = cleanMoney(estimated);

  const assessed = firstMatch(text, [
    /(?:assessed value|assessment value|total assessed)[:\s]*\$?\s*([\d,]+)/i,
  ]);
  if (assessed) fields.assessedValue = cleanMoney(assessed);

  const taxes = firstMatch(text, [
    /(?:annual (?:property )?tax(?:es)?|property taxes?|tax amount)[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (taxes) fields.annualTaxes = cleanMoney(taxes);

  const acquired = firstMatch(text, [
    /(?:date acquired|closing date|settlement date|purchase date)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|\w+ \d{1,2},? \d{4})/i,
  ]);
  if (acquired) {
    const parsed = Date.parse(acquired);
    if (!Number.isNaN(parsed)) {
      fields.dateAcquired = new Date(parsed).toISOString().slice(0, 10);
    }
  }

  const leaseEnd = firstMatch(text, [
    /(?:lease (?:end|expiration|expiry)(?: date)?|expires(?: on)?)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|\w+ \d{1,2},? \d{4})/i,
  ]);
  if (leaseEnd) {
    const parsed = Date.parse(leaseEnd);
    if (!Number.isNaN(parsed)) {
      fields.leaseExpiresAt = new Date(parsed).toISOString().slice(0, 10);
    }
  }

  const leaseMonths = firstMatch(text, [
    /(?:lease term|term of lease)[:\s]*(\d+)\s*months?/i,
    /(\d+)\s*month(?:s)?\s*lease/i,
  ]);
  if (leaseMonths) fields.leaseLengthMonths = leaseMonths;

  const mgmt = firstMatch(text, [
    /(?:management fee|property management)[:\s]*\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ]);
  if (mgmt) fields.monthlyManagementFee = cleanMoney(mgmt);

  const carrier = firstMatch(text, [
    /(?:insurance (?:carrier|company)|insured by|carrier)[:\s]+([A-Za-z0-9 &.'-]{3,60})/i,
  ]);
  if (carrier) fields.insuranceCarrier = carrier.replace(/\s+/g, " ").trim();

  const policy = firstMatch(text, [
    /(?:policy(?:\s*number|#)|policy no\.?)[:\s#]*([A-Za-z0-9-]{4,40})/i,
  ]);
  if (policy) fields.insurancePolicyNumber = policy;

  const renewal = firstMatch(text, [
    /(?:renewal date|policy expires|expiration date)[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4}|\w+ \d{1,2},? \d{4})/i,
  ]);
  if (renewal) {
    const parsed = Date.parse(renewal);
    if (!Number.isNaN(parsed)) {
      fields.insuranceRenewalDate = new Date(parsed).toISOString().slice(0, 10);
    }
  }

  const manager = firstMatch(text, [
    /(?:property manager|managing agent|manager)[:\s]+([A-Za-z .'-]{3,60})/i,
  ]);
  if (manager && !/company|llc|inc/i.test(manager)) {
    fields.managerName = manager.trim();
  }

  if (/commercial|office|retail|warehouse/i.test(lower)) {
    fields.propertyType = "COMMERCIAL";
  } else if (/vacant land|unimproved|lot only/i.test(lower)) {
    fields.propertyType = "VACANT_LAND";
  } else if (/single[- ]family|residential|dwelling|condo|townhome|apartment/i.test(lower)) {
    fields.propertyType = "RESIDENTIAL";
  }

  if (fields.state && fields.city) {
    fields.taxJurisdiction = `${fields.city}, ${fields.state}`;
  }

  const filledCount = Object.values(fields).filter((v) => Boolean(v)).length;
  if (filledCount === 0) {
    warnings.push(
      "We read the document, but could not match familiar property fields. You can still fill the form by hand.",
    );
  } else {
    warnings.push(
      "Please review every autofilled field. Scanned documents can misread numbers.",
    );
  }

  return {
    fields,
    filledCount,
    warnings,
    previewText: text.slice(0, 500),
  };
}
