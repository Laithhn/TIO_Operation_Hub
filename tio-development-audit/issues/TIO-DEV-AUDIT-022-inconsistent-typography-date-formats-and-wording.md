# TIO-DEV-AUDIT-022 — Inconsistent typography, date formats and wording

| Field | Value |
|---|---|
| Module | Design system |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | all pages |
| Category | UI defect |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | UX / Development |

## Business Impact

14 font sizes are in use (10, 10.5, 11, 11.4, 11.5, 12, 12.5, 13, 13.5, 14, 18, 22, 24, 28 px; 163 font-size declarations in app.css); most text is 11-12.5 px. One case page shows three date formats ("12 Nov 2026, 15:56", "2026-11-10 15:56 +04:00 (Asia/Dubai)", native "11/13/2026, 09:00 AM"). Messages expose internal names ("This step needs status PendingValidation", "the title can be at most 200 characters."), the SLA column uses unexplained "R"/"X", pager reads "Records :- 15 OF 25", pending values show "Unknown".

## User Impact

Lower readability and perceived quality; users must learn several conventions.

## Preconditions

None.

## Steps to Reproduce

1. Open /cases and a case page.

## Expected Result

One type scale (4-5 sizes, body >= 13-14 px), one date format with time zone on hover, sentence-case messages using labels.

## Actual Result

As described.

## Evidence

traces/ui-crawl-results.json (field fonts); screenshots/desktop-cases.png, desktop-case-detail.png; traces/api-test-evidence.jsonl (tc CASE-06, CASE-13).

## Root Cause

Sizes are set per component instead of from tokens (tokens.css defines only 5); several formatting helpers; enum names interpolated into messages.

## Recommended Fix

Reduce to the token scale, centralise date formatting, map enums to labels in error text, label SLA chips "Response"/"Resolution".

## Acceptance Criteria

Computed font sizes on any page come from the token set; no message contains a PascalCase enum name.

## Regression Test

Lint rule on font-size; message snapshot test
