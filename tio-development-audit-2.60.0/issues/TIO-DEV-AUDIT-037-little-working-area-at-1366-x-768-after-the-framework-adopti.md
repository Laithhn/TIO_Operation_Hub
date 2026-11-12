# TIO-DEV-AUDIT-037 — Little working area at 1366 x 768 after the framework adoption

| Field | Value |
|---|---|
| State in 2.60.0 | **New in 2.60.0** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | - |
| Module | Lists, record pages |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases and other lists |
| Category | GUI framework limitation |
| Suggested Owner | UX |

## Observation on 2.60.0

First found in this audit.

## Business Impact

With the framework's header (46 px), toolbar strip, 180 px sidebar, quick views, filter row, table toolbar and fixed status bar, the first ticket row starts about 430 px down a 768 px screen; four rows are visible, noticeably fewer than the 2.29.0 list showed at the same size.

## User Impact

More scrolling for the people who work in lists all day; the uppercase buttons and 17 px root size add to the height.

## Preconditions

Viewport 1366 x 768.

## Steps to Reproduce

1. Open /cases.

## Expected Result

At least ten rows visible on the most common laptop size, or a compact density option.

## Actual Result

Four rows visible.

## Evidence

screenshots/laptop-cases.png (compare tio-development-audit/screenshots/laptop-cases.png from 2.29.0).

## Root Cause

Framework density adopted "as shipped" (A68) plus page-level filter and quick-view bands.

## Recommended Fix

Offer a compact density, collapse the filter band after use, and drop the fixed status bar on small heights.

## Acceptance Criteria

Ten or more rows visible at 1366 x 768 in the default list view.

## Regression Test

Visual regression

