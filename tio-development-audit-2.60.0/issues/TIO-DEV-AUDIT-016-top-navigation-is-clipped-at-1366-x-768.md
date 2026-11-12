# TIO-DEV-AUDIT-016 — Top navigation is clipped at 1366 x 768

| Field | Value |
|---|---|
| State in 2.60.0 | **Fixed** |
| Priority in 2.60.0 | - |
| Priority in 2.29.0 | P2 |
| Module | Application shell |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | all pages |
| Category | UI defect |
| Suggested Owner | UX / Development |

## Observation on 2.60.0

Navigation moves sections that do not fit into a "More" menu; all links inside the viewport at 1366 px (automated regression test passes).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

On the most common laptop resolution the first tab reads "shboard" and "Administration" is cut off under the account selector.

## User Impact

Navigation labels are partly unreadable; the product looks unfinished on standard laptops.

## Preconditions

Viewport 1366 x 768, TIO Manager (9 tabs), development header (account selector present).

## Steps to Reproduce

1. Open any page at 1366 x 768.

## Expected Result

All tabs visible, or an overflow menu.

## Actual Result

Tabs scroll horizontally inside the header and are covered at both ends.

## Evidence

screenshots/laptop-cases.png, laptop-client-detail.png, laptop-contract-edit.png; test "@defect top navigation tabs are fully visible at 1366x768".

## Root Cause

Header uses a horizontally scrolling tab strip with fixed right-hand controls; 9 sections + search + New + account do not fit. Needs verification in Forms sign-in mode, where the development account selector is absent.

## Recommended Fix

Collapse sections into a "More" menu below ~1500 px or move primary navigation to the side bar; shorten the search box on small widths.

## Acceptance Criteria

At 1366 px every top-level section label is fully visible or reachable from a visible overflow control.

## Regression Test

02-navigation.spec.ts @defect

