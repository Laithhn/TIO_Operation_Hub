# TIO-DEV-AUDIT-034 — Users cannot be removed and a role stays locked by deactivated users

| Field | Value |
|---|---|
| Module | Administration |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /admin/users, /admin/roles |
| Category | Enhancement opportunity |
| Priority | P4 |
| Status | Confirmed |
| Suggested Owner | Development |

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
