# Integration Setup Guide

## Adapter pattern

All external systems are accessed through interfaces in `src/adapters/`:

- `accounting` — Quicken (file import: OFX / QFX / QIF / CSV)
- `email` — Gmail / Microsoft Graph (OAuth + sync implemented)
- `storage` — local or S3-compatible
- `notifications` — reminder delivery

Property values, taxes, and physical details are **manual entry only**. Pachtfolio does not scrape websites or pull third-party property data feeds.

Quicken has **no public third-party OAuth API**, so Pachtfolio does not connect to Quicken Online like QuickBooks Online. Families export from Quicken and import the file into Pachtfolio. Email uses real OAuth adapters when credentials are present, plus a **demo mailbox** in non-production.

## Quicken (replaces QuickBooks stub)

1. Admin opens **Settings → Integrations** and clicks **Enable Quicken** (or **Import sample Quicken file** in development).
2. In Quicken, export the rental account register as **OFX**, **QFX**, **QIF**, or **CSV**.
3. Import the file on the Integrations page.
4. Map each property to a Quicken **account name** or **category/tag**.
5. Matching priority: mapped account → mapped category → nickname in payee/memo → street address.
6. Unmatched transactions can be assigned manually. Re-imports are idempotent by transaction ID (`FITID` / hash).
7. Pachtfolio is **read-only** toward Quicken — it never writes back to the Quicken file.

Supported formats:

| Extension | Notes |
|-----------|--------|
| `.ofx` / `.qfx` | Bank-style statement download / Web Connect export |
| `.qif` | Classic Quicken exchange format |
| `.csv` | Register export with Date + Amount columns (Payee/Category/Memo/Account optional) |

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

When `APP_ENV` is not `production`, Integrations shows **Connect demo mailbox**. This stores encrypted demo tokens and syncs sample threads without Google/Microsoft apps. The same environment also offers **Import sample Quicken file**.

## File storage

- Development: `FILE_STORAGE_DRIVER=local` (server disk under `FILE_STORAGE_LOCAL_DIR`)
- Production / deployed: `FILE_STORAGE_DRIVER=s3` with `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (AWS S3, MinIO, R2, etc.)
- Property photos and documents are uploaded through the storage adapter and saved as `Document.storageKey` on the property (`photoDocumentId`). Downloads are authenticated via `/api/files/download`.
- There is no Supabase Storage in this project; do not introduce a second provider.
- Uploads validated by MIME allowlist + size limit + malware scan job
- **Property photo:** Choose Photo → preview → Save Photo (JPG/JPEG/PNG/WebP/HEIC, max 10 MB). HEIC is converted to JPEG on upload when possible.
- **Add Property → Import from a document** can read a user-uploaded PDF/scan/text file on the server (OCR for images) and suggest form fields. It does not scrape Zillow, Redfin, or other listing sites. Always review autofilled values.

## Token storage

OAuth refresh/access tokens (email) are stored encrypted (`ENCRYPTION_KEY`) in `EmailConnection.tokenVaultRef` via `src/lib/token-vault.ts`. Tokens are never logged. OAuth `state` is HMAC-signed in `src/lib/oauth-state.ts`. Quicken uses file import only and does not store Quicken credentials.
