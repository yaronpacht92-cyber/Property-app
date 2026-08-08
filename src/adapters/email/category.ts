import type { EmailCategory } from "@prisma/client";

const RULES: Array<{ category: EmailCategory; patterns: RegExp[] }> = [
  {
    category: "PROPERTY_MANAGER",
    patterns: [/property\s*manager/i, /management\s*company/i, /leasing/i],
  },
  {
    category: "INSURANCE",
    patterns: [/insurance/i, /policy\s*#?/i, /claim/i, /premium/i],
  },
  {
    category: "TAXES",
    patterns: [/property\s*tax/i, /assessor/i, /tax\s*bill/i, /parcel/i],
  },
  {
    category: "MAINTENANCE",
    patterns: [/repair/i, /maintenance/i, /hvac/i, /plumber/i, /roof/i, /warranty/i],
  },
  {
    category: "TENANT",
    patterns: [/tenant/i, /renter/i, /lease/i, /rent\s*payment/i],
  },
  {
    category: "LEGAL",
    patterns: [/attorney/i, /lawyer/i, /legal/i, /eviction/i],
  },
  {
    category: "ACCOUNTING",
    patterns: [/invoice/i, /quickbooks/i, /accounting/i, /bookkeep/i],
  },
  {
    category: "VENDOR",
    patterns: [/vendor/i, /contractor/i, /estimate/i, /quote/i],
  },
];

export function categorizeEmail(subject: string, snippet: string, sender: string): EmailCategory {
  const haystack = `${subject}\n${snippet}\n${sender}`;
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.category;
    }
  }
  return "OTHER";
}
