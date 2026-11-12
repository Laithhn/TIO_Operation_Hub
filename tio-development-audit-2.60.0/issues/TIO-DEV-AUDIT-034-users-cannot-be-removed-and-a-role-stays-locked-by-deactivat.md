# TIO-DEV-AUDIT-034 — Users cannot be removed and a role stays locked by deactivated users

| Field | Value |
|---|---|
| State in 2.60.0 | **Fixed** |
| Priority in 2.60.0 | - |
| Priority in 2.29.0 | P4 |
| Module | Administration |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /admin/users, /admin/roles |
| Category | Enhancement opportunity |
| Suggested Owner | Development |

## Observation on 2.60.0

Users can be deleted with a reason (DELETE /admin/users/{id}); used by the audit cleanup.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

Accounts created by mistake can only be deactivated; a role held only by deactivated users cannot be deleted. Three synthetic audit users and two roles therefore remain in the audit database.

## User Impact

Administration lists accumulate dead entries.

## Preconditions

None.

## Steps to Reproduce

Deactivate a user, then delete its role.

## Expected Result

Delete unused accounts without history, or allow role deletion when only deactivated users hold it.

## Actual Result

422 "1 user(s) still hold ...".

## Evidence

cleanup run output.

## Root Cause

No delete endpoint for users.

## Recommended Fix

Add user deletion for accounts with no activity; let role deletion reassign deactivated users.

## Acceptance Criteria

Role with only deactivated holders can be deleted.

## Regression Test

Admin test

