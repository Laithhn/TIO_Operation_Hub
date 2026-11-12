# TIO-DEV-AUDIT-025 — Operations Command Center is overloaded

| Field | Value |
|---|---|
| State in 2.60.0 | **Mostly fixed** |
| Priority in 2.60.0 | P4 |
| Priority in 2.29.0 | P3 |
| Module | Dashboard |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | / |
| Category | UX weakness |
| Suggested Owner | UX / Product |

## Observation on 2.60.0

Four audience dashboards and My dashboard split the content; rates now state how many tickets were measured; a previous-period comparison exists. The Command Center itself is unchanged in scope.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

The landing page is 5,376 px tall at 1920 px (about five screens) with roughly 60 tiles, charts and tables, eight requests and the slowest load of the application (1.8 s locally). Headline rates are shown from very small samples ("Contractual SLA met 75 %", "100 %" from 3 cases) without a sample-size warning.

## User Impact

The answer to "what needs me now" competes with reference charts; percentages can mislead.

## Preconditions

None.

## Steps to Reproduce

Open / at 1920x1080.

## Expected Result

One screen of decision-relevant figures with drill-in pages per topic; rates show n and are suppressed below a minimum sample.

## Actual Result

As described.

## Evidence

screenshots/desktop-dashboard.png; traces/ui-crawl-results.json (dashboard loadMs 1806, 8 API calls).

## Root Cause

Successive owner requests (A39, A50, A51, A59-A61) added bands to one page.

## Recommended Fix

Keep KPI band + attention queue on the landing page; move bands to tabs/pages; show "n = 3" beside rates.

## Acceptance Criteria

Landing page fits within two screens at 1920x1080; every rate displays its denominator.

## Regression Test

Visual regression

