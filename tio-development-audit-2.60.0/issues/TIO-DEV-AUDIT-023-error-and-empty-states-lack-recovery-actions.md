# TIO-DEV-AUDIT-023 — Error and empty states lack recovery actions

| Field | Value |
|---|---|
| State in 2.60.0 | **Fixed** |
| Priority in 2.60.0 | - |
| Priority in 2.29.0 | P3 |
| Module | Lists, record pages |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases (load error), /cases/{missing id} |
| Category | UX weakness |
| Suggested Owner | UX / Development |

## Observation on 2.60.0

Error state has "Try again" and the trace id; missing record page gives guidance. A new problem with unknown addresses is recorded as 036.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

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

