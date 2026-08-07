# Security & Permissions Plan — Pachtfolio

## Threat Model (summary)

Sensitive assets: property finances, insurance, contacts, documents, OAuth tokens.  
Primary threats: account takeover, IDOR/cross-tenant access, XSS, CSRF, malicious uploads, token leakage, insecure integrations.

## Authentication

- Auth.js (NextAuth v5) with credentials provider for Phase 1
- Password policy: min 12 chars, complexity check, bcrypt/argon2 hashing
- Session: HTTP-only, Secure, SameSite=Lax cookies; sliding expiration (default 8 hours idle / 7 days absolute configurable)
- Login rate limiting (IP + email): lockout after repeated failures
- MFA: TOTP optional; required path stubbed for admin enforcement later
- No credentials in source control; secrets via environment variables

## Authorization (RBAC)

Permissions are string keys checked server-side on every mutation and sensitive read.

| Permission | Admin | Member | Read-Only |
|------------|:-----:|:------:|:---------:|
| org.manage | ✓ | | |
| users.manage | ✓ | | |
| properties.read | ✓ | ✓ | ✓ (assigned) |
| properties.write | ✓ | | |
| properties.delete | ✓ | | |
| financials.read | ✓ | ✓ | ✓ |
| maintenance.write | ✓ | ✓ | |
| documents.read | ✓ | ✓ | ✓ |
| documents.write | ✓ | ✓ | |
| documents.delete | ✓ | | |
| reminders.write | ✓ | ✓ | |
| notes.write | ✓ | ✓ | |
| integrations.manage | ✓ | | |
| audit.read | ✓ | | |
| settings.manage | ✓ | | |

Read-only users may be limited to assigned properties via `PropertyAssignment` (or Membership metadata). Admins/Members see all org properties in Phase 1.

**IDOR protection:** every query filters by `organizationId` from the session membership. Never trust client-supplied org IDs.

## Application Security Controls

| Control | Approach |
|---------|----------|
| HTTPS | Enforced at hosting edge |
| CSRF | Auth.js + SameSite cookies; Server Actions origin checks |
| XSS | React encoding; sanitize any rich text; CSP headers |
| SQLi | Prisma parameterized queries only |
| Input validation | Zod schemas on all server actions / API routes |
| Output encoding | Default React escaping |
| Rate limiting | Middleware + action-level limiters |
| File uploads | MIME/extension allowlist, size limits, virus-scan job stub, private storage |
| Signed URLs | Short-lived download URLs; no permanent public object URLs |
| Audit log | Append-only for sensitive actions |
| Logging policy | No PII/financial values in logs; IDs and action names only |
| Secrets | Env vars; encrypted token vault for OAuth refresh tokens |

## Integration Security

- OAuth 2.0 with least-privilege scopes
- Tokens encrypted at rest; automatic refresh in background jobs
- Adapter interfaces isolate providers
- Failed integrations never block core CRUD; friendly user messages only
- QuickBooks v1: read-only

## Environments

- `development` / `staging` / `production` separate databases and secrets
- Seed data only in development/staging

## Backup & Restore

- Daily automated PostgreSQL backups (provider or `pg_dump`)
- Document storage versioning / replication
- Documented restore drill (see `docs/security/BACKUP_AND_RECOVERY.md`)

## Data Provider Policy

- No scraping of consumer real-estate websites
- Property valuation, tax, and physical details are manual entry only
- Always show source, last updated, and estimated vs exact
