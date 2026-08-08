export function appBaseUrl() {
  return (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function gmailConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${appBaseUrl()}/api/integrations/gmail/callback`;
  return {
    clientId,
    clientSecret,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export function microsoftConfig() {
  const clientId = process.env.MICROSOFT_CLIENT_ID || "";
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI || `${appBaseUrl()}/api/integrations/microsoft/callback`;
  return {
    clientId,
    clientSecret,
    tenant,
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}
