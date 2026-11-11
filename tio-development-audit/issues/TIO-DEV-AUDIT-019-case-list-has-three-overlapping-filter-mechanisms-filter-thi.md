# TIO-DEV-AUDIT-019 — Case list has three overlapping filter mechanisms; "Filter this page" searches only the 15 loaded rows

| Field | Value |
|---|---|
| Module | Lists (shared DataTable) |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases and other server-paged lists |
| Category | UX weakness |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | UX |

## Business Impact

A user typing a case title into "Filter this page..." gets "no rows" for cases that exist on page 2. There are a filter bar (8 controls), a per-page text filter, a header filter row (search, client, status, priority) and two "Export CSV" buttons with different scope (all matching rows vs the page shown).

## User Impact

Missed records, wrong exports, slower triage. Violates consistency and error-prevention heuristics.

## Preconditions

More than 15 open cases.

## Steps to Reproduce

1. Open /cases.
2. Type the title of a case on page 2 into "Filter this page...".

## Expected Result

One search that queries the server and one export with an explicit scope.

## Actual Result

Zero rows; the header "Search title or ref" finds it.

## Evidence

screenshots/desktop-cases.png; src/web/src/ui/kit.tsx:285 (placeholder "Filter this page...").

## Root Cause

The generic DataTable adds client-side filter/export to tables that are already server-filtered (decision A37).

## Recommended Fix

Remove the per-page filter and second export on server-paged lists; merge header filters into the filter bar; show active filters as chips.

## Acceptance Criteria

Each list has one search box that searches all pages and one export button stating its row count.

## Regression Test

UI test: search finds a record on page 2
