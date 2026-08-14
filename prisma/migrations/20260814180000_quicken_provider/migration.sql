-- prisma:disable-transaction
-- PostgreSQL cannot use a newly added enum value in the same transaction that creates it.

ALTER TYPE "AccountingProvider" ADD VALUE IF NOT EXISTS 'QUICKEN';

UPDATE "AccountingConnection"
SET "provider" = 'QUICKEN'
WHERE "provider" = 'QUICKBOOKS';
