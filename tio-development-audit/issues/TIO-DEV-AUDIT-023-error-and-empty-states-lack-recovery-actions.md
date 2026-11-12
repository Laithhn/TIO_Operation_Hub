# TIO-DEV-AUDIT-023 — Error and empty states lack recovery actions

| Field | Value |
|---|---|
| Module | Lists, record pages |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases (load error), /cases/{missing id} |
| Category | UX weakness |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | UX / Development |

## Business Impact

A failed list load shows "Something went wrong (trace ...)" with no Retry; a missing record shows a bare banner with no title, back link or search.

## User Impact

Users must reload the browser or navigate manually.

## Preconditions

None.

## Steps to Reproduce

1. Make the list request fail.
2. Open /cases/999999.

## Expected Result

Retry button; not-found page with heading and links.

## Actual Result

No recovery control.

## Evidence

screenshots/probe-api-500-case-list.png, laptop-case-missing.png.

## Root Cause

StateMessage component renders text only.

## Recommended Fix

Add Retry to the shared error state and a standard not-found panel for records.

## Acceptance Criteria

Error state offers Retry; missing record page has an h1 and a link to the list.

## Regression Test

03-cases-ui-crud.spec.ts
