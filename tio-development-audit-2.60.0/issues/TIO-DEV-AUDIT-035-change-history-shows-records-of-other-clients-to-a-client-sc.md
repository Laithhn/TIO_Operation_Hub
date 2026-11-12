# TIO-DEV-AUDIT-035 — Change history shows records of other clients to a client-scoped user

| Field | Value |
|---|---|
| State in 2.60.0 | **New in 2.60.0** |
| Priority in 2.60.0 | P2 |
| Priority in 2.29.0 | - |
| Module | Change history / data scope |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /admin/audit |
| Category | Security observation |
| Suggested Owner | Development / Security |

## Observation on 2.60.0

First found in this audit.

## Business Impact

The per-client data scope introduced after 2.29.0 is bypassed in one place: audit entries of child records that carry no client id (SLA targets, project-product links, team members, handovers) are listed for every holder of the change-history right. A scoped engineer read the SLA targets of a contract belonging to a client outside the scope and a handover summary between two other people. The export log also shows other users' filter text, including the alias of a client outside the scope.

## User Impact

Contract terms and staffing information of other clients are visible to users who are otherwise restricted to one client.

## Preconditions

Operation Engineer with scope on one client only.

## Steps to Reproduce

1. Sign in as the scoped engineer.
2. Open Change history (GET /admin/audit).
3. Look for SlaTarget, ProjectProduct, Handover entries by other users.
4. GET /admin/exports.

## Expected Result

Only entries of records inside the caller's scope; child records inherit the scope of their parent.

## Actual Result

Of 214 entries visible to the engineer, about 165 had no client id and were written by "system" (seed) or the manager, including SlaTarget rows of contract 16 (another client) and handover HO-103.

## Evidence

Run output summarised in 11-SECURITY-OBSERVATIONS.md; automated test "@defect change history does not show child records of clients outside the scope" (automated-tests/specs/08-scope-and-penalties.spec.ts).

## Root Cause

Probable: the audit query filters by AuditEntry.ClientId and lets rows with a null client through; child entities do not record their parent's client.

## Recommended Fix

Stamp the owning client (and team) on audit entries of child records at write time, or resolve it through the parent in the query; apply the same rule to the export log.

## Acceptance Criteria

A scoped user sees no audit or export-log entry whose parent record is outside the scope.

## Regression Test

08-scope-and-penalties.spec.ts @defect

