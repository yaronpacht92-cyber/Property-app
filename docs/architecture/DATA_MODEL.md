# Database Schema Proposal — Homefolio

PostgreSQL + Prisma. All portfolio records are scoped by `organizationId` (tenant isolation). Primary keys are UUIDs. Soft deletes via `deletedAt` where restoration matters.

## Entity Overview

```
Organization ──< Membership >── User
      │              │
      │           Role / Permission
      │
      ├── OwnershipEntity
      ├── Property ── PropertyOwnership
      │      ├── PropertyContact > Contact
      │      ├── PropertyValuation
      │      ├── PropertyTaxRecord
      │      ├── Mortgage
      │      ├── InsurancePolicy
      │      ├── MaintenanceRecord > Contractor
      │      ├── Document
      │      ├── Reminder
      │      ├── Note
      │      ├── EmailThreadReference
      │      └── AccountingPropertyMapping
      │
      ├── EmailConnection
      ├── AccountingConnection
      ├── IntegrationSyncLog
      └── AuditLog
```

## Key Tables

### Identity & Access
- **User** — id, email, name, passwordHash, mfaSecretEnc, mfaEnabled, failedLoginAttempts, lockedUntil, lastLoginAt
- **Organization** — id, name, settings (json)
- **Membership** — userId, organizationId, roleId, status
- **Role** — id, organizationId (null = system role), key, name
- **Permission** — id, key, description
- **RolePermission** — roleId, permissionId

### Property Core
- **Property** — organizationId, nickname, type, address fields, ownershipEntityId, dateAcquired, purchasePrice, photoDocumentId, status, timestamps, soft delete
- **OwnershipEntity** — organizationId, name, entityType, taxIdEnc (encrypted sensitive)
- **PropertyOwnership** — propertyId, ownershipEntityId, ownershipPercent, startDate, endDate
- **Contact** — organizationId, name, company, phone, email, notes
- **PropertyContact** — propertyId, contactId, role (MANAGER, INSURANCE_AGENT, …), isEmergency

### Financial / Tax / Insurance
- **PropertyValuation** — propertyId, estimatedValue, source, sourceUpdatedAt, isEstimated, isManualOverride, notes
- **PropertyTaxRecord** — propertyId, assessedValue, annualTax, authority, parcelNumber, dueDate, paymentStatus, source, sourceUpdatedAt, isManualOverride
- **Mortgage** — propertyId, lender, accountNumberEnc, monthlyPayment, interestRate, maturityDate, status
- **InsurancePolicy** — propertyId, carrier, policyNumber, policyType, coverageAmount, premium, effectiveDate, renewalDate, cancellationDate, status, agentContactId

### Operations
- **Contractor** — organizationId, name, phone, email, specialty
- **MaintenanceRecord** — propertyId, category, workType (ROUTINE|REPAIR|CAPITAL), description, completedAt, cost, warrantyExpiresAt, nextServiceAt, contractorId
- **Document** — organizationId, propertyId?, category, name, storageKey, mimeType, sizeBytes, expiresAt, uploadedById, scanStatus
- **Reminder** — organizationId, propertyId?, type, title, description, dueDate, status, assignedToId, scheduleOffsets
- **Note** — propertyId, authorId, category, body, attachmentDocumentId

### Integrations
- **EmailConnection** — organizationId, provider (GMAIL|MICROSOFT), status, tokenVaultRef, lastSyncAt
- **EmailThreadReference** — organizationId, propertyId?, connectionId, externalThreadId, subject, snippet, sender, receivedAt, category, isImportant, matchMethod
- **AccountingConnection** — organizationId, provider (QUICKBOOKS), status, tokenVaultRef, lastSyncAt, realmId
- **AccountingPropertyMapping** — propertyId, connectionId, mappingType (CLASS|CUSTOMER|PROJECT|LOCATION|ACCOUNT|CUSTOM), externalId, externalName
- **FinancialTransactionReference** — organizationId, propertyId?, connectionId, externalTxnId, amount, txnDate, category, memo, matched
- **IntegrationSyncLog** — organizationId, connectionType, connectionId, status, startedAt, finishedAt, message (non-sensitive), recordsProcessed

### Audit
- **AuditLog** — organizationId, actorUserId, action, entityType, entityId, summary, metadata (redacted), ipHash, createdAt  
  Append-only; no update/delete from application layer.

## Indexes

- All tenant queries: `(organizationId, …)`
- Property search: GIN/trigram or application-level ILIKE on nickname + address
- Reminder due dates: `(organizationId, status, dueDate)`
- Soft-delete filters: `WHERE deletedAt IS NULL`

## Encryption at Rest

- Application-level AES-GCM for highly sensitive columns (`taxIdEnc`, `accountNumberEnc`, OAuth tokens in vault)
- Database disk encryption recommended in production (cloud provider)
- OAuth tokens stored encrypted; never logged
