# Integration Setup Guide

## Adapter pattern

All external systems are accessed through interfaces in `src/adapters/`:

- `accounting` — QuickBooks (read-only v1; stub today)
- `email` — Gmail / Microsoft Graph (stub today)
- `storage` — local or S3-compatible
- `notifications` — reminder delivery

Property values, taxes, and physical details are **manual entry only**. Pachtfolio does not scrape websites or pull third-party property data feeds.

Mock adapters are used for QuickBooks and email when credentials are missing. The UI labels sample/not-connected states clearly.

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

## File storage

- Development: `FILE_STORAGE_DRIVER=local`
- Production: S3-compatible bucket, private ACL, short-lived signed download URLs
- Uploads validated by MIME allowlist + size limit + malware scan job
- **Add Property → Import from a document** can read a user-uploaded PDF/scan/text file on the server (OCR for images) and suggest form fields. It does not scrape Zillow, Redfin, or other listing sites. Always review autofilled values.

## Token storage

OAuth refresh/access tokens are stored encrypted (`ENCRYPTION_KEY`) via vault references. Tokens are never logged.
