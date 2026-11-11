# TIO-DEV-AUDIT-027 — Four in-process background jobs and local-disk files prevent safe scale-out

| Field | Value |
|---|---|
| Module | Hosting architecture |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | n/a |
| Category | Architecture risk |
| Priority | P3 |
| Status | Probable |
| Suggested Owner | Development / Operations |

## Business Impact

SLA sweep, notification scan, data-quality scan and the report scheduler run as hosted services inside the web process with no leader lock; exports and attachments are on the local disk. Two instances (or IIS overlapped recycling) would run schedules twice and send duplicate notifications or reports.

## User Impact

Limits availability options (no load-balanced pair) and makes recycling behaviour important.

## Preconditions

Two application instances.

## Steps to Reproduce

Code review.

## Expected Result

Jobs guarded by a database lock or run in a separate worker.

## Actual Result

No coordination found.

## Evidence

src/TioHub.Api/Modules/ModuleRegistration.cs:35-42; Modules/Work/CaseSla.cs:306; Modules/Reporting/ReportingEndpoints.cs:314.

## Root Cause

Single-server IIS deployment assumed (docs/OPERATIONS.md).

## Recommended Fix

Use sp_getapplock (or a job table with leases) around each run; document single-instance constraint until then.

## Acceptance Criteria

Two instances produce one scheduled export per recipient.

## Regression Test

Integration test with two hosts
