# Product Requirements Document — Family Property Portfolio

**Product name:** Pachtfolio  
**Version:** 1.0 (Phase 1 Foundation)  
**Audience:** Older adults managing a family real estate portfolio  
**Primary priority:** Ease of use

## 1. Problem

The family currently tracks property information on paper and across disconnected systems. Important deadlines (insurance, taxes, maintenance) are easy to miss. Financial and contact details are hard to find. There is no single place that answers: “What do we own, and what needs attention?”

## 2. Goal

Provide one calm, centralized web application where the family can view, organize, update, and track all information related to every property — without technical training.

## 3. Success Metrics (Pilot)

- An administrator can add a property in under 5 minutes.
- Common tasks (add maintenance, upload document, complete reminder) take ≤ 3 clicks after login.
- Zero cross-organization data access in security tests.
- Pilot users report they can use the app without training.
- Critical deadlines appear on Home and Reminders without searching.

## 4. Users & Roles

| Role | Purpose |
|------|---------|
| Family Administrator | Full management: users, properties, integrations, settings, audit |
| Family Member | Day-to-day updates: notes, maintenance, documents, reminders |
| Read-Only User | View assigned properties and summaries only |

Permissions are role + organization scoped. Additional roles can be added without schema redesign.

## 5. Primary Navigation (max 5)

1. Home  
2. Properties  
3. Reminders  
4. Documents  
5. Settings  

Prominent **Add Property** on Home and Properties.

## 6. Core Features (Phase 1)

- Secure authentication with session expiration and MFA support hooks
- Organization-scoped multi-tenant data
- Home dashboard with attention items and large summary cards
- Properties list with type filters and large cards
- Guided Add Property workflow (5 steps, skippable sections)
- Property profile with sections: Overview, Financials, Maintenance, Insurance, Documents, Emails, Contacts, Notes
- Maintenance records with category buttons
- Documents with secure download (signed URLs)
- Reminders with single-click complete/dismiss
- Notes and administrator-only audit log
- Global search
- Confirmation dialogs before destructive actions
- Friendly success/error messages (no technical jargon)

## 7. Later Phases (not blocking Phase 1)

- Phase 2: Licensed property valuation & tax data providers (adapter layer)
- Phase 3: QuickBooks Online read-only OAuth sync
- Phase 4: Gmail / Microsoft Graph email matching
- Phase 5: Email reminders, hardening, accessibility & security validation

## 8. Non-Goals (v1)

- Sending email from the app
- Writing/deleting QuickBooks records
- Scraping Zillow or any site in violation of terms
- Dense charts or analytics dashboards
- Mobile-first native apps (responsive web is required)

## 9. UX Principles

- Large text (≥18px body), large buttons, high contrast
- Plain-English labels
- Always-visible Back button
- Important actions always visible
- No icon-only controls
- Status communicated with text + icon, not color alone
- Optional “What does this mean?” helper text
- WCAG 2.2 AA

## 10. Assumptions

1. One organization (family) per pilot; multi-org is supported in the data model.
2. Auth.js credentials + optional TOTP MFA for Phase 1; SSO can be added later.
3. Local/dev uses mock adapters for S3, property data, QuickBooks, and email until secrets are configured.
4. PostgreSQL is the system of record; soft deletes archive important records.
5. Desktop and tablet are primary devices; phone remains usable.
6. Sample seed data is clearly labeled “Sample data”.

## 11. Definition of Done (Pilot)

See repository root README — pilot checklist. Phase 1 must deliver a usable core experience even when external integrations are not configured.
