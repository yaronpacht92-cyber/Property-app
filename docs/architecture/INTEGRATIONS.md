# Integration Setup Guide

## Adapter pattern

All external systems are accessed through interfaces in `src/adapters/`:

- `accounting` — QuickBooks (read-only v1; stub today)
- `email` — Gmail / Microsoft Graph (OAuth + sync implemented)
- `storage` — local or S3-compatible
- `notifications` — reminder delivery

Property values, taxes, and physical details are **manual entry only**. Pachtfolio does not scrape websites or pull third-party property data feeds.

Mock adapters are used for QuickBooks when credentials are missing. Email uses real OAuth adapters when credentials are present, plus a **demo mailbox** in non-production for local testing.

## QuickBooks Online (Phase 3)

1. Create an Intuit developer app.
2. Set redirect URI to `${AUTH_URL}/api/integrations/quickbooks/callback`.
3. Configure `QUICKBOOKS_CLIENT_ID`, `QUICKBOOKS_CLIENT_SECRET`, `QUICKBOOKS_REDIRECT_URI`, `QUICKBOOKS_ENVIRONMENT`.
4. Admin connects from Settings → Integrations.
5. Map each property to Class / Customer / Project / Location / Account / Custom field.
6. Sync is idempotent and read-only; Pachtfolio does not change QuickBooks records in v1.

## Gmail

1. Create a Google Cloud OAuth client (Web application).
2. Authorized redirect URI: `${AUTH_URL}/api/integrations/gmail/callback` (or set `GOOGLE_REDIRECT_URI`).
3. Scopes requested: `openid`, `email`, `https://www.googleapis.com/auth/gmail.readonly`.
4. Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally `GOOGLE_REDIRECT_URI`.
5. Admin connects from **Settings → Integrations → Connect Gmail**, then **Sync now**.
6. Matching uses property manager email, parcel number, street address, and nickname (in that order). Ambiguous hits stay unmatched for manual assign.
7. Users may manually assign unmatched threads on the Integrations page. Pachtfolio does not send mail.

## Microsoft Outlook

1. Register an Azure app with Microsoft Graph delegated permissions: `User.Read`, `Mail.Read`, plus `offline_access`.
2. Redirect URI: `${AUTH_URL}/api/integrations/microsoft/callback` (or set `MICROSOFT_REDIRECT_URI`).
3. Configure `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` (default `common`), and optionally `MICROSOFT_REDIRECT_URI`.
4. Admin connects from Settings → Integrations → Connect Microsoft, then Sync now.

## Demo mailbox (development)

When `APP_ENV` is not `production`, Integrations shows **Connect demo mailbox**. This stores encrypted demo tokens and syncs sample threads without Google/Microsoft apps.

## File storage

- Development: `FILE_STORAGE_DRIVER=local`
- Production: S3-compatible bucket, private ACL, short-lived signed download URLs
- Uploads validated by MIME allowlist + size limit + malware scan job
- **Add Property → Import from a document** can read a user-uploaded PDF/scan/text file on the server (OCR for images) and suggest form fields. It does not scrape Zillow, Redfin, or other listing sites. Always review autofilled values.

## Token storage

OAuth refresh/access tokens are stored encrypted (`ENCRYPTION_KEY`) in `EmailConnection.tokenVaultRef` via `src/lib/token-vault.ts`. Tokens are never logged. OAuth `state` is HMAC-signed in `src/lib/oauth-state.ts`.
