# Pachtfolio — Family Property Portfolio

A calm, accessible web application for families who own and manage real estate. Built for older adults first: large text, plain English, obvious actions, and no clutter.

Pachtfolio replaces scattered paper files and disconnected tools with one property-by-property home for contacts, finances, insurance, maintenance, documents, reminders, and notes.

## Product docs (start here)

| Document | Path |
|----------|------|
| Product requirements | [`docs/product/PRD.md`](docs/product/PRD.md) |
| Sitemap | [`docs/product/SITEMAP.md`](docs/product/SITEMAP.md) |
| Assumptions | [`docs/product/ASSUMPTIONS.md`](docs/product/ASSUMPTIONS.md) |
| Data model | [`docs/architecture/DATA_MODEL.md`](docs/architecture/DATA_MODEL.md) |
| Implementation plan | [`docs/architecture/IMPLEMENTATION_PLAN.md`](docs/architecture/IMPLEMENTATION_PLAN.md) |
| Security plan | [`docs/security/SECURITY_PLAN.md`](docs/security/SECURITY_PLAN.md) |
| Wireframes | [`docs/wireframes/LOW_FI.md`](docs/wireframes/LOW_FI.md) |
| Roles matrix | [`docs/security/ROLE_PERMISSION_MATRIX.md`](docs/security/ROLE_PERMISSION_MATRIX.md) |
| Integrations | [`docs/architecture/INTEGRATIONS.md`](docs/architecture/INTEGRATIONS.md) |
| Backup & recovery | [`docs/security/BACKUP_AND_RECOVERY.md`](docs/security/BACKUP_AND_RECOVERY.md) |
| Troubleshooting | [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) |

## Stack

- **Front end:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **UI:** Accessible Radix-based components, large targets, WCAG-oriented patterns
- **Back end:** Next.js Server Actions + Route Handlers
- **Database:** PostgreSQL + Prisma
- **Auth:** Auth.js (credentials + optional TOTP MFA)
- **Storage:** Private local adapter (dev) / S3-compatible interface (prod)
- **Jobs:** Idempotent local job handlers (BullMQ/Inngest-ready)
- **Integrations:** Adapter interfaces with clearly labeled mock providers until OAuth/API keys are configured

## Phase status

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Auth, RBAC, org isolation, properties, maintenance, documents, reminders, notes, audit, search | Implemented |
| 2 | Licensed property valuation/tax providers | Adapter + mock ready |
| 3 | Quicken file import (OFX/QFX/QIF/CSV) | Implemented |
| 4 | Gmail / Microsoft email matching | Implemented |
| 5 | Email reminders, hardening, a11y/security validation | Foundation in place |

## Local setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Set at least:

- `DATABASE_URL`
- `AUTH_SECRET` (e.g. `openssl rand -base64 32`)
- `ENCRYPTION_KEY` (64 hex chars)

### 3. Migrate and seed

```bash
npm run db:migrate
npm run db:seed
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sample logins (development only)

| Role | Email | Password |
|------|-------|----------|
| Family Administrator | `admin@pachtfolio.local` | `ChangeMe!Pachtfolio1` |
| Family Member | `member@pachtfolio.local` | `ChangeMe!Pachtfolio1` |
| Read-Only User | `readonly@pachtfolio.local` | `ChangeMe!Pachtfolio1` |

All seeded properties and related records are labeled **Sample data**.

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # start production server
npm run lint         # ESLint
npm test             # unit + integration tests
npm run test:e2e     # Playwright (app must be running)
npm run db:migrate   # create/apply migrations
npm run db:seed      # load sample portfolio
npm run db:deploy    # apply migrations in staging/production
```

## Real vs mock integrations

| Feature | Development default | Production path |
|---------|---------------------|-----------------|
| Property valuation/tax/details | Manual entry only | Manual entry only |
| Quicken | File import (OFX/QFX/QIF/CSV) | Same — no Quicken cloud OAuth |
| Gmail / Microsoft | Demo mailbox / OAuth when configured | OAuth matching |
| File storage | Local disk under `storage/uploads` | Private S3-compatible bucket + signed URLs |
| Malware scan | Local job marks SKIPPED/CLEAN | AV scanner workflow |
| Notifications | Mock adapter | Email provider |

Property details are entered by hand. The core app never depends on live Quicken or email connections.

## Security highlights

- Organization-scoped queries on every portfolio record
- RBAC permission checks on mutations and sensitive reads
- Login rate limiting + account lockout
- Encrypted sensitive fields / OAuth token vault pattern
- CSRF-safe Auth.js sessions (HTTP-only cookies)
- Zod validation on server actions
- Private document downloads via short-lived signed URLs
- Append-only audit log without financial amounts or secrets
- Security headers in middleware (CSP, frame deny, nosniff)

## Deployment

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set production secrets (`AUTH_SECRET`, `ENCRYPTION_KEY`, OAuth credentials as needed).
3. Configure `FILE_STORAGE_DRIVER=s3` and bucket credentials for private storage.
4. Run `npm run db:deploy`.
5. Deploy to Vercel (or equivalent) with HTTPS enforced.
6. Optional: set `SENTRY_DSN` for error monitoring without PII.

See [`docs/architecture/DEPLOYMENT.md`](docs/architecture/DEPLOYMENT.md).

## Testing notes

- Unit tests cover permissions, crypto, rate limits, and adapters.
- Integration tests verify organization isolation against the seeded database.
- Playwright smoke test covers the login experience.
- Expand coverage as Phase 2–4 OAuth callbacks and sync jobs land.

## Pilot definition of done (checklist)

- [x] Administrator can securely add users and properties
- [x] Every property has a clear profile
- [x] Maintenance and improvement history
- [x] Document upload and search
- [x] Insurance policies and renewal reminders
- [x] Tax/valuation storage with manual override
- [x] Quicken file import and email connection surfaces
- [x] Property manager contact in one click
- [x] Cross-organization access denied
- [x] Audit log for important actions
- [x] Older-adult-friendly UI patterns
- [ ] Full production OAuth apps configured
- [ ] Formal accessibility / security pen-test sign-off
