# TIO-DEV-AUDIT-017 — Layout overflows on phone and tablet; version matrix overflows on laptop

| Field | Value |
|---|---|
| Module | Responsive layout |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /, /reports, /clients/{id}, /contracts/{id}/edit, /environments, /environments/{id}, /versions |
| Category | UI defect |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | UX / Development |

## Business Impact

At 390 px seven pages are wider than the screen (dashboard 693 px, version matrix 1,576 px). The version matrix also overflows at 1366 and 768 px. Filters take the whole first screen on a phone and the status bar wraps to two lines.

## User Impact

On-call engineers cannot use the hub comfortably from a phone or tablet.

## Preconditions

Viewports 390x844, 768x1024, 1366x768.

## Steps to Reproduce

1. Open the listed pages at the stated width.

## Expected Result

No horizontal page scroll; wide tables scroll inside their panel; filters collapse.

## Actual Result

document.scrollWidth exceeds the viewport on the listed pages.

## Evidence

traces/ui-crawl-results.json (fields docW, overflowX, wideEls); screenshots/mobile-dashboard.png, mobile-cases.png, mobile-versions.png, laptop-versions.png; test "@defect no horizontal page overflow at mobile".

## Root Cause

Chart panels, the SLA edit table and the matrix have fixed minimum widths outside a scroll container; no mobile filter pattern.

## Recommended Fix

Wrap wide tables/charts in overflow containers, collapse filters behind a "Filters" button below 900 px, hide the status bar on phones.

## Acceptance Criteria

scrollWidth <= viewport width on all routes at 390, 768 and 1366 px.

## Regression Test

07-responsive-journeys.spec.ts
