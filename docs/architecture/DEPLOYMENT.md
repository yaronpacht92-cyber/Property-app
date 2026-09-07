# Personal production deployment (Vercel)

Pachtfolio is a **login-required** personal family portfolio app. Authentication stays on. Public signup is **off** in production unless you set `ALLOW_PUBLIC_SIGNUP=true`.

## What you need (cloud, not your laptop)

| Need | Why | Suggested free/personal options |
|------|-----|----------------------------------|
| PostgreSQL | All properties, users, docs metadata | [Neon](https://neon.tech), [Supabase](https://supabase.com), Vercel Postgres |
| S3-compatible object storage | Property photos & document files (Vercel disk is ephemeral) | [Cloudflare R2](https://www.cloudflare.com/products/r2/), AWS S3, MinIO |
| Vercel project | Hosts the Next.js app | [vercel.com](https://vercel.com) |

Local `FILE_STORAGE_DRIVER=local` is for development only. Production refuses local disk storage.

## Required environment variables (Vercel → Project → Settings → Environment Variables)

Set these for **Production** (and Preview if you use previews):

```bash
DATABASE_URL=postgresql://...          # cloud Postgres, include ?sslmode=require if required
AUTH_SECRET=...                        # openssl rand -base64 32
AUTH_URL=https://YOUR-DOMAIN.vercel.app
AUTH_TRUST_HOST=true
ENCRYPTION_KEY=...                     # openssl rand -hex 32  (64 hex chars)
APP_ENV=production
ALLOW_PUBLIC_SIGNUP=false
FILE_STORAGE_DRIVER=s3
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_REGION=auto                         # or your region
S3_ENDPOINT=https://...                # required for R2 / MinIO; leave empty for AWS
S3_FORCE_PATH_STYLE=true               # true for R2/MinIO
```

Do **not** commit real secrets. Keep them only in Vercel (or your secret manager).

## First-time data

1. Point `DATABASE_URL` at your cloud database.
2. Deploy once (migrations run via `vercel.json` build command).
3. Seed or create your admin user against the **cloud** database:

```bash
# From your machine, with DATABASE_URL set to the cloud DB:
npm run db:seed
# or add yourself via SQL / temporary ALLOW_PUBLIC_SIGNUP=true once, then turn it off
```

Demo seed logins (`admin@pachtfolio.local`) only exist after seeding that database.

## Auth behavior (unchanged)

- Middleware redirects unauthenticated users to `/login`.
- Credentials + optional MFA remain as implemented.
- `/signup` is blocked when `ALLOW_PUBLIC_SIGNUP` is false / production.

## Build

```bash
npm run build          # local production compile
# On Vercel: prisma generate && prisma migrate deploy && next build
```
