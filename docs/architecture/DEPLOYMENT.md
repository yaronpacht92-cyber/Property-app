# Deployment Instructions

## Environments

Maintain separate `development`, `staging`, and `production` databases and secrets. Never reuse production OAuth credentials in development.

## Vercel (recommended)

1. Import the GitHub repository.
2. Set environment variables from `.env.example`.
3. Attach a managed PostgreSQL instance.
4. Build command: `npm run build`
5. Install command: `npm install`
6. After deploy, run migrations: `npm run db:deploy` (via CI or one-off job).
7. Confirm HTTPS and Auth.js `AUTH_URL` match the production domain.

## Database migrations

```bash
npm run db:migrate   # development
npm run db:deploy    # staging/production
```

## Seed data

Seed only non-production environments:

```bash
npm run db:seed
```

## Monitoring

- Optional Sentry via `SENTRY_DSN`
- Application logs must avoid financial amounts, passwords, tokens, and personal document contents
