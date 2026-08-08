export type PropertyMatchInput = {
  id: string;
  nickname: string;
  streetAddress: string;
  city: string;
  zipCode: string;
  parcelNumbers: string[];
  managerEmails: string[];
};

export type EmailMatchInput = {
  subject: string;
  snippet: string;
  sender: string;
};

export type EmailMatchResult = {
  propertyId: string | null;
  matchMethod: string | null;
  ambiguous: boolean;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s@.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmail(sender: string) {
  const match = sender.match(/<([^>]+)>/) || sender.match(/([^\s<>]+@[^\s<>]+)/);
  return match?.[1]?.toLowerCase() || sender.toLowerCase().trim();
}

function containsPhrase(haystack: string, phrase: string) {
  const needle = normalize(phrase);
  if (!needle || needle.length < 3) return false;
  return haystack.includes(needle);
}

/**
 * Match an email to at most one property.
 * Priority: manager email → parcel → street address → nickname.
 * Ambiguous multi-property hits leave the thread unmatched for manual assign.
 */
export function matchEmailToProperty(
  email: EmailMatchInput,
  properties: PropertyMatchInput[],
): EmailMatchResult {
  if (!properties.length) {
    return { propertyId: null, matchMethod: null, ambiguous: false };
  }

  const haystack = normalize(`${email.subject} ${email.snippet}`);
  const senderEmail = extractEmail(email.sender);

  const byManager = properties.filter((property) =>
    property.managerEmails.some((addr) => addr.toLowerCase() === senderEmail),
  );
  if (byManager.length === 1) {
    return { propertyId: byManager[0].id, matchMethod: "manager_email", ambiguous: false };
  }
  if (byManager.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  const byParcel = properties.filter((property) =>
    property.parcelNumbers.some((parcel) => containsPhrase(haystack, parcel)),
  );
  if (byParcel.length === 1) {
    return { propertyId: byParcel[0].id, matchMethod: "parcel_number", ambiguous: false };
  }
  if (byParcel.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  const byAddress = properties.filter((property) => {
    const street = normalize(property.streetAddress);
    const cityZip = normalize(`${property.city} ${property.zipCode}`);
    return containsPhrase(haystack, street) || (street.length > 5 && containsPhrase(haystack, street.split(" ").slice(0, 2).join(" ")) && containsPhrase(haystack, cityZip));
  });
  if (byAddress.length === 1) {
    return { propertyId: byAddress[0].id, matchMethod: "street_address", ambiguous: false };
  }
  if (byAddress.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  const byNickname = properties.filter((property) => containsPhrase(haystack, property.nickname));
  if (byNickname.length === 1) {
    return { propertyId: byNickname[0].id, matchMethod: "nickname", ambiguous: false };
  }
  if (byNickname.length > 1) {
    return { propertyId: null, matchMethod: null, ambiguous: true };
  }

  return { propertyId: null, matchMethod: null, ambiguous: false };
}
