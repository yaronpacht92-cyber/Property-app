# Phased Implementation Plan — Pachtfolio

## Architecture Choices

| Choice | Decision | Why |
|--------|----------|-----|
| Framework | Next.js App Router + TypeScript | One deployable unit, Server Actions, strong DX |
| UI | Tailwind + accessible primitives (Radix/shadcn-style) | Large, consistent, accessible controls |
| DB/ORM | PostgreSQL + Prisma | Strong typing, migrations, tenant-safe queries |
| Auth | Auth.js (NextAuth v5) | Session security, credentials + MFA extensibility |
| Storage | Adapter: local disk (dev) / S3-compatible (prod) | Private files + signed URLs |
| Jobs | In-process queue abstraction (BullMQ-ready) | Idempotent jobs without blocking Phase 1 |
| Integrations | Adapter interfaces + mock implementations | Core app works without external APIs |
| Hosting | Vercel-ready | Secure HTTPS edge, env-based secrets |
| Monitoring | Sentry hook (optional env) | Error tracking without PII |

## Phase 1 — Foundation (this release)

- [x] Design docs
- Auth, RBAC, org isolation
- Schema + seed (5 sample properties)
- Home, Properties, Add Property, Property Profile
- Contacts, Notes, Maintenance, Documents, Reminders
- Audit log (admin)
- Search
- Security baselines (validation, rate limit stubs, CSRF via Auth.js)
- Tests for authz + tenant isolation + core flows
- Documentation

## Phase 2 — Manual portfolio depth

- Manual valuation, tax, and property detail entry
- Manual override of estimated values

## Phase 3 — Quicken (read-only file import)

- Enable Quicken on Settings → Integrations
- Import OFX / QFX / QIF / CSV exports from Quicken
- Map properties to Quicken account names or categories/tags
- Match transactions; assign unmatched manually
- No write-back to Quicken (no public Quicken OAuth API)

## Phase 4 — Email

- Gmail + Microsoft OAuth adapters
- Matching rules + manual assignment
- Property email tab

## Phase 5 — Notifications & Hardening

- Email reminders, integration alerts
- Accessibility, security, performance, backup drills

## Integration Dependencies & Limits

| Integration | Dependency | Limitation |
|-------------|------------|------------|
| Property data | None | Manual entry only; no scraping or third-party feeds |
| Quicken | Exported OFX/QFX/QIF/CSV | File import only; no Quicken cloud OAuth |
| Gmail | Google Cloud OAuth | Import references only, not full mailbox dump |
| Microsoft | Azure app registration | Same as Gmail |
| S3 | Bucket + IAM | Private; malware scan async |
| Email send | Out of scope v1 | `mailto:` only for Contact Manager |

## Folder Structure

```
/
├── docs/                    # PRD, security, architecture, wireframes
├── prisma/                  # schema, migrations, seed
├── public/
├── src/
│   ├── app/                 # Next.js routes (UI + API)
│   ├── components/          # UI + domain components
│   ├── lib/                 # auth, db, rbac, validation, crypto
│   ├── server/              # server actions, services
│   ├── adapters/            # storage, valuation, tax, qb, email, notify
│   ├── jobs/                # background job handlers
│   └── styles/
├── tests/                   # unit, integration, e2e, a11y
├── .env.example
└── README.md
```
