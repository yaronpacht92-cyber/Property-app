# Troubleshooting Guide

## Cannot sign in

- Confirm the user exists and membership status is `ACTIVE`.
- After repeated failures the account may be temporarily locked — wait for the rate-limit window.
- If MFA is enabled, enter the current 6-digit authenticator code.

## Property not visible

- Read-only users only see assigned properties.
- Archived properties are hidden from normal lists.
- Confirm you are signed into the correct family organization.

## Document download fails

- Signed links expire quickly by design — open the document again from Homefolio.
- Seeded sample documents may not have binary files on disk; upload a new file to test downloads.
- Infected scan status blocks download.

## Integration shows “Not configured”

- Expected until OAuth client IDs/secrets are added to the environment.
- Core property workflows continue to work with manual entry.

## Prisma / database errors locally

```bash
# ensure Postgres is running, then:
npm run db:migrate
npm run db:seed
```

## Friendly errors only

Users should never see stack traces. If a technical error appears in the UI, treat it as a bug and replace it with a plain-English message.
