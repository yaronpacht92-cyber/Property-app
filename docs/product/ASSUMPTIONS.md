# Assumptions & Open Questions

## Assumptions

1. The pilot serves one family organization; the schema still supports multiple organizations.
2. Family Members can view all properties in their organization in Phase 1; property-level assignment is reserved for Read-Only users and future refinement.
3. Auth.js credentials are acceptable for the pilot; enterprise SSO is future work.
4. Document malware scanning is implemented as a job interface with a pass-through mock in development.
5. Currency is USD; localization can be added later.
6. “Archive” (soft delete) is preferred over hard delete for properties and documents.
7. Demo credentials from seed data are for development/staging only.
8. Integration UIs appear in Settings with clear “Not connected / Sample data” states until real OAuth apps are configured.

## Open Questions (non-blocking)

- Property valuation/tax/details remain manual entry (no third-party property data feeds)
- Whether Read-Only users should see financial detail or summaries only (currently: summaries allowed)
- MFA enforcement policy for administrators (optional vs required at pilot)
