# Integration Setup Guide

## Adapter pattern

All external systems are accessed through interfaces in `src/adapters/`:

- `property-data` — licensed valuation/tax providers
- `accounting` — QuickBooks (read-only v1)
- `email` — Gmail / Microsoft Graph
- `storage` — local or S3-compatible
- `notifications` — reminder delivery

Mock adapters are used when credentials are missing. The UI labels sample/not-connected states clearly.

## QuickBooks Online (Phase 3)

1. Create an Intuit developer app.
2. Set redirect URI to `${AUTH_URL}/api/integrations/quickbooks/callback`.
3. Configure `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REDIRECT_URI`, `QUICKBOOKS_ENVIRONMENT`.
4. Admin connects from Settings → Integrations.
5. Map each property to Class / Customer / Project / Location / Account / Custom field.
6. Sync is idempotent and read-only; Pachtfolio does not change QuickBooks records in v1.

## Gmail (Phase 4)

1. Create a Google Cloud OAuth client.
2. Scopes: read-only Gmail metadata/body as approved by the family.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`.
4. Matching uses property address, nickname, parcel, manager email, keywords.
5. Users may manually assign threads. Pachtfolio does not send mail in v1.

## Microsoft Outlook (Phase 4)

1. Register an Azure app with Microsoft Graph Mail.Read.
2. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`, `MICROSOFT_TENANT_ID`.

## Property data providers (Phase 2)

1. Default `PROPERTY_DATA_PROVIDER=auto` uses public county GIS when the address is covered (see `county-layers.ts`), otherwise the labeled mock provider.
2. Optional licensed commercial providers plug in with `PROPERTY_DATA_API_KEY` (never scrape Zillow or similar).
3. UI always shows source, last updated, estimated flag (for market estimates), refresh, and manual override.
4. Assessor totals from county GIS are shown as assessed value, not market estimates.

## File storage

- Development: `FILE_STORAGE_DRIVER=local`
- Production: S3-compatible bucket, private ACL, short-lived signed download URLs
- Uploads validated by MIME allowlist + size limit + malware scan job

## Token storage

OAuth refresh/access tokens are stored encrypted (`ENCRYPTION_KEY`) via vault references. Tokens are never logged.
