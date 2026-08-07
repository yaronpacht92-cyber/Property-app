# Testing Instructions

## Unit & integration

Requires a migrated + seeded database for integration tests.

```bash
npm run db:migrate
npm run db:seed
npm test
```

Coverage today:

- Role permission matrix
- Encryption helpers
- Login rate limiting
- Organization tenant isolation queries

## End-to-end

```bash
npm run dev
# elsewhere
npx playwright install chromium
npm run test:e2e
```

Smoke scenario: login page readability. Expand with authenticated flows as Phase 2–4 land.

## Manual pilot checklist

1. Sign in as administrator and add a property.
2. Assign/view property manager contact.
3. Sign in as family member and record a water heater replacement.
4. Upload an insurance policy document.
5. Confirm insurance renewal reminders appear.
6. Open Settings → Integrations (QuickBooks/email stubs).
7. Attempt edits as read-only user (denied).
8. Confirm another organization cannot see seeded properties (isolation test).
9. Manually override an estimated property value.
