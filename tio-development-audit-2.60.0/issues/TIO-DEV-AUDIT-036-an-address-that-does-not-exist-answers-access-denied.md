# TIO-DEV-AUDIT-036 — An address that does not exist answers "Access denied"

| Field | Value |
|---|---|
| State in 2.60.0 | **New in 2.60.0** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | - |
| Module | Routing |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | any unknown route |
| Category | UX weakness |
| Suggested Owner | Development |

## Observation on 2.60.0

First found in this audit.

## Business Impact

A mistyped or outdated link tells the user — including a TIO Manager holding every right — that their roles do not grant permission and that an administrator should review their access.

## User Impact

Users raise needless access requests; real permission problems become harder to recognise.

## Preconditions

None.

## Steps to Reproduce

1. Open /this/route/does-not-exist as TIO Manager.

## Expected Result

A "Page not found" page (as in 2.29.0).

## Actual Result

Heading "Access denied" with the permissions text.

## Evidence

screenshots/laptop-not-found.png; automated test "@defect unknown route says the page does not exist".

## Root Cause

Side effect of A101 ("no page can exist outside the rights"): unknown routes are treated as pages without a right.

## Recommended Fix

Distinguish unknown routes from known routes without the right.

## Acceptance Criteria

Unknown route shows "Page not found"; a known route without the right shows "Access denied".

## Regression Test

02-navigation.spec.ts @defect

