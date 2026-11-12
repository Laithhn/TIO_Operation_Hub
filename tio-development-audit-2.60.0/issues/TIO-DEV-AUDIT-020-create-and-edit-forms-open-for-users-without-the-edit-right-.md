# TIO-DEV-AUDIT-020 — Create and edit forms open for users without the Edit right; refusal text is misleading

| Field | Value |
|---|---|
| State in 2.60.0 | **Fixed** |
| Priority in 2.60.0 | - |
| Priority in 2.29.0 | P3 |
| Module | Routing / permissions |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/new and other /new, /edit routes |
| Category | UX weakness |
| Suggested Owner | Development |

## Observation on 2.60.0

Routes are guarded by right (A101); a role without the right gets "Access denied". Refusal texts now name the missing right.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

A read-only role can open the full "New case" form by address and only learns on submit that it is not allowed; the API message says "Your account has no role in the hub" although the account has a role.

## User Impact

Wasted effort and confusing guidance for read-only stakeholders.

## Preconditions

Custom role without Edit.

## Steps to Reproduce

1. Sign in with a role without Edit.
2. Open /cases/new.

## Expected Result

A clear "This page needs the Edit records right" page (as /admin/users does).

## Actual Result

Form is shown; submit returns 403.

## Evidence

screenshots/probe-role-DEV_tio_audit_test_ro-cases-new.png; traces/api-test-evidence.jsonl (tc RO-02..RO-06); test "@defect read-only route guard"; Services.cs:80.

## Root Cause

Routes are guarded only for administration; message text predates configurable roles (A31).

## Recommended Fix

Guard create/edit routes by right in the router; change the message to name the missing right.

## Acceptance Criteria

A user without Edit sees a refusal page on every /new and /edit route.

## Regression Test

03-cases-ui-crud.spec.ts @defect

