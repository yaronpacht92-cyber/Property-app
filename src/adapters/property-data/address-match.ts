/** Normalize street text for loose comparison against assessor GIS fields. */
export function normalizeStreet(value: string): string {
  return value
    .toUpperCase()
    .replace(/[.,#']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(STREET|STR)\b/g, "ST")
    .replace(/\b(AVENUE|AVE)\b/g, "AVE")
    .replace(/\b(BOULEVARD|BLVD)\b/g, "BLVD")
    .replace(/\b(DRIVE|DR)\b/g, "DR")
    .replace(/\b(LANE|LN)\b/g, "LN")
    .replace(/\b(ROAD|RD)\b/g, "RD")
    .replace(/\b(COURT|CT)\b/g, "CT")
    .replace(/\b(CIRCLE|CIR)\b/g, "CIR")
    .replace(/\b(PLACE|PL)\b/g, "PL")
    .replace(/\b(TERRACE|TER)\b/g, "TER")
    .replace(/\b(HIGHWAY|HWY)\b/g, "HWY")
    .replace(/\b(NORTH)\b/g, "N")
    .replace(/\b(SOUTH)\b/g, "S")
    .replace(/\b(EAST)\b/g, "E")
    .replace(/\b(WEST)\b/g, "W");
}

export function parseHouseNumber(streetAddress: string): string | null {
  const match = streetAddress.trim().match(/^(\d+[A-Z]?)\b/i);
  return match ? match[1]!.toUpperCase() : null;
}

/** Significant street tokens excluding house number and common directionals/suffixes. */
export function streetNameTokens(streetAddress: string): string[] {
  const normalized = normalizeStreet(streetAddress);
  const skip = new Set([
    "N",
    "S",
    "E",
    "W",
    "ST",
    "AVE",
    "BLVD",
    "DR",
    "LN",
    "RD",
    "CT",
    "CIR",
    "PL",
    "TER",
    "HWY",
    "UNIT",
    "APT",
    "SUITE",
    "STE",
  ]);
  return normalized
    .split(" ")
    .filter((token, index) => {
      if (index === 0 && /^\d+[A-Z]?$/.test(token)) return false;
      if (skip.has(token)) return false;
      return token.length >= 3;
    });
}

/**
 * Score how well a GIS property address matches the portfolio address.
 * Higher is better; 0 means no usable match.
 */
export function scoreAddressMatch(inputStreet: string, gisStreet: string): number {
  const input = normalizeStreet(inputStreet);
  const candidate = normalizeStreet(gisStreet);
  if (!input || !candidate) return 0;

  const house = parseHouseNumber(input);
  if (house && !candidate.startsWith(house)) return 0;

  let score = house ? 50 : 0;
  for (const token of streetNameTokens(input)) {
    if (candidate.includes(token)) score += 20;
  }
  if (input === candidate) score += 40;
  return score;
}

/** Escape a value for use inside a single-quoted ArcGIS SQL literal. */
export function escapeArcGisLiteral(value: string): string {
  return value.replaceAll("'", "''");
}
