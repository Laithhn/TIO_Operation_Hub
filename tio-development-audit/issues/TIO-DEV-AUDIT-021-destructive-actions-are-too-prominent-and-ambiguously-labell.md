# TIO-DEV-AUDIT-021 — Destructive actions are too prominent and ambiguously labelled

| Field | Value |
|---|---|
| Module | Lists and record pages |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases, /cases/{id}, /clients/{id} |
| Category | UX weakness |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | UX |

## Business Impact

Every table row shows a red "Delete" (hard delete with dependents) as its only visible action; the case page shows nine flat buttons with "Close" (primary), "Cancel case" (red) and "Delete" side by side; the cancel dialog offers "Cancel" and "Cancel case" next to each other.

## User Impact

High risk of irreversible mistakes; the common next step is hard to find among rare ones.

## Preconditions

TIO Manager.

## Steps to Reproduce

1. Open /cases.
2. Open a case.
3. Press "Cancel case".

## Expected Result

Primary next step first; rare and destructive actions in an overflow menu; unambiguous dialog buttons ("Keep case" / "Cancel case").

## Actual Result

As described.

## Evidence

screenshots/desktop-cases.png, desktop-case-detail.png, mobile-case-detail.png, probe-delete-dialog.png.

## Root Cause

DataTable DeleteAction is rendered for every row for Delete holders (A37); action grouping (A33) not applied to cases.

## Recommended Fix

Move Delete to a row/record overflow menu, prefer Archive, order case actions by workflow, rename dialog buttons.

## Acceptance Criteria

No list shows a one-click Delete per row; case page shows at most three primary actions.

## Regression Test

Visual regression
