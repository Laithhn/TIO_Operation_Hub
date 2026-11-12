# TIO-DEV-AUDIT-033 — API silently ignores unknown or invalid query parameters

| Field | Value |
|---|---|
| Module | API |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | lists, /admin/audit |
| Category | Functional defect |
| Priority | P4 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

Unknown filters (recordType/recordId on the audit list), sort=bogus and page=-1 return unfiltered data with 200, so a caller can believe a filter was applied; report endpoints, by contrast, reject unknown filters.

## User Impact

Integrations and deep links can show wrong data without warning.

## Preconditions

None.

## Steps to Reproduce

GET /admin/audit?recordType=Case&recordId=21 (returns all 652 entries).

## Expected Result

400/422 for unknown parameters.

## Actual Result

200 with all rows.

## Evidence

audit-trail run (total 652); misc run (bad sort 200, page -1 200).

## Root Cause

Minimal-API binding ignores extra query keys.

## Recommended Fix

Validate query keys centrally as the report registry does.

## Acceptance Criteria

Unknown parameter returns 422.

## Regression Test

API test
