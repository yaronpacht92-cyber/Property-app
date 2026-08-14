export type QuickenMatchProperty = {
  id: string;
  nickname: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  /** Quicken account names mapped to this property. */
  accountNames: string[];
  /** Quicken categories / tags mapped to this property. */
  categories: string[];
};

export type QuickenMatchInput = {
  payee: string;
  memo: string;
  category: string;
  accountName: string;
};

export type QuickenMatchResult = {
  propertyId: string | null;
  matchMethod: string | null;
  ambiguous: boolean;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(haystack: string, phrase: string) {
  const needle = normalize(phrase);
  if (!needle || needle.length < 3) return false;
  return haystack.includes(needle);
}

/**
 * Match a Quicken transaction to at most one property.
 * Priority: mapped account → mapped category → nickname → street address.
 */
export function matchQuickenTransaction(
  txn: QuickenMatchInput,
  properties: QuickenMatchProperty[],
): QuickenMatchResult {
  if (!properties.length) {
    return { propertyId: null, matchMethod: null, ambiguous: false };
  }

  const account = normalize(txn.accountName);
  const category = normalize(txn.category);
  const haystack = normalize(`${txn.payee} ${txn.memo} ${txn.category}`);

  const byAccount = properties.filter((property) =>
    property.accountNames.some((name) => normalize(name) === account),
  );
  if (byAccount.length === 1) {
    return { propertyId: byAccount[0].id, matchMethod: "quicken_account", ambiguous: false };
  }
  if (byAccount.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  const byCategory = properties.filter((property) =>
    property.categories.some((name) => {
      const mapped = normalize(name);
      return mapped && (category === mapped || category.includes(mapped) || mapped.includes(category));
    }),
  );
  if (byCategory.length === 1) {
    return { propertyId: byCategory[0].id, matchMethod: "quicken_category", ambiguous: false };
  }
  if (byCategory.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  const byNickname = properties.filter((property) => containsPhrase(haystack, property.nickname));
  if (byNickname.length === 1) {
    return { propertyId: byNickname[0].id, matchMethod: "nickname", ambiguous: false };
  }
  if (byNickname.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  const byAddress = properties.filter((property) => containsPhrase(haystack, property.streetAddress));
  if (byAddress.length === 1) {
    return { propertyId: byAddress[0].id, matchMethod: "street_address", ambiguous: false };
  }
  if (byAddress.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  return { propertyId: null, matchMethod: null, ambiguous: false };
}
