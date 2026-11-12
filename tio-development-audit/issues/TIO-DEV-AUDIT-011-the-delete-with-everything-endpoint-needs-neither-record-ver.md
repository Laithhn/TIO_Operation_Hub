# TIO-DEV-AUDIT-011 — The delete-with-everything endpoint needs neither record version nor server-side confirmation, and hard-deletes operational history

| Field | Value |
|---|---|
| Module | Shared deletion (all modules) |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /clients/{id}, list rows (DELETE /api/v1/dependents/{kind}/{id}) |
| Category | Security observation |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | Development / Security |

## Business Impact

One request by a holder of Delete removed a client with 107 dependent records. The "I understand" tick is enforced only in the browser. Cases, commitments and escalations (including breached ones) can be hard-deleted and then vanish from every KPI and report.

## User Impact

A mis-click or stale tab can remove a client tree; performance history can be removed rather than archived.

## Preconditions

User with the Delete records right (TIO Manager by default).

## Steps to Reproduce

1. DELETE /api/v1/dependents/clients/{id} without If-Match.

## Expected Result

428/412 without the current version; a server-validated confirmation (for example the record code); work records with SLA history can only be archived.

## Actual Result

200; everything deleted in one transaction; one audit entry with counts.

## Evidence

Preview GET /dependents/clients/16 returned total 107; cleanup run (client TIO_AUDIT_TEST_C1 -> 200); test TIO-DEV-AUDIT-011; src/TioHub.Api/Modules/Shared/Cascade.cs:262-284,295-296; screenshots/probe-delete-dialog.png.

## Root Cause

The endpoint takes only kind and id; ExpectVersion is not called; deletes run as raw SQL that bypasses the audit save hook (one summary entry is written).

## Recommended Fix

Require If-Match and a typed confirmation token validated on the server; restrict hard delete of cases/commitments/escalations to records without history, otherwise archive; keep a tombstone for KPI periods.

## Acceptance Criteria

DELETE without the current version returns 428; deleting a case that has SLA results is refused with "archive instead".

## Regression Test

TIO-DEV-AUDIT-011
