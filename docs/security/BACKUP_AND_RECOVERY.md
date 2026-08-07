# Backup and Recovery Guide

## PostgreSQL

- Enable daily automated backups (provider snapshots or `pg_dump`).
- Retain at least 30 days in staging/production.
- Test restore quarterly.

### Manual dump

```bash
pg_dump "$DATABASE_URL" --format=custom --file=homefolio-$(date +%F).dump
```

### Restore

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" homefolio-YYYY-MM-DD.dump
```

## Document storage

- Production buckets should enable versioning and cross-region replication when available.
- Soft-deleted documents remain recoverable until a retention job runs.

## Application recovery steps

1. Restore database from the chosen backup.
2. Verify organization counts and a spot-check of properties.
3. Confirm document signed URLs still resolve (storage keys unchanged).
4. Reconnect OAuth integrations if tokens were rotated outside the restore.
5. Record the restore in the audit/ops log (not inside user financial records).
