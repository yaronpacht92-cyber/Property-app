# Phased Implementation Plan — Homefolio

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

## Phase 2 — External Property Data

- ValuationProvider + TaxProvider adapters
- Manual override + refresh history UI
- Source attribution on all external fields

## Phase 3 — QuickBooks (read-only)

- OAuth connection, mapping UI, financial summary
- Sync history, idempotent sync, reconnect

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
| Property data | Licensed API key | Never scrape; manual entry always available |
| QuickBooks | Intuit OAuth app | v1 read-only; mapping varies by household |
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
