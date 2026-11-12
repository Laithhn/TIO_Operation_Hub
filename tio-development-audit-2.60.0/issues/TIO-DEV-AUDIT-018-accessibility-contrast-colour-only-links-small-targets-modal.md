# TIO-DEV-AUDIT-018 — Accessibility: contrast, colour-only links, small targets, modal focus not contained, no focus move to errors

| Field | Value |
|---|---|
| State in 2.60.0 | **Open (changed)** |
| Priority in 2.60.0 | P2 |
| Priority in 2.29.0 | P2 |
| Module | All pages |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | all pages |
| Category | Accessibility issue |
| Suggested Owner | UX / Development |

## Observation on 2.60.0

Contrast failures rose to 243 nodes on 38 of 79 screens: the framework link colour #007db3 on #fafbfc is 4.42:1. Small targets fell from 38 % to 21 % (1,159 of 5,544). Dialog focus is still not contained; focus still stays on body after a failed submit. New: nested-interactive on the SLA chart.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

axe-core (WCAG 2.2 A/AA rules) reports 81 contrast failures on 26 of 64 screens (muted text #6b7487 on #f5f5f6 = 4.3:1 at 12 px), 55 links distinguishable by colour only on 9 screens, 19 undersized targets; 1,356 of 3,569 interactive elements (38 %) are smaller than 24 px in one dimension. Keyboard focus leaves the delete dialog while it is open, and after a failed submit focus stays on the page body.

## User Impact

Users with low vision, motor impairment or keyboard-only use are disadvantaged; WCAG 2.2 AA is not met.

## Preconditions

None.

## Steps to Reproduce

1. Run axe on each route.
2. Open a delete dialog and press Tab 12 times.
3. Submit an empty case form.

## Expected Result

No serious axe violations; focus stays inside modal dialogs; focus moves to the error summary.

## Actual Result

See counts above; positives: skip link, visible 2 px focus ring, labels on all 15 case-form controls, aria-invalid on failed fields, role=dialog with aria-modal.

## Evidence

traces/ui-crawl-results.json (field axe, small); probe output in 12-ACCESSIBILITY-REVIEW.md; screenshots/probe-delete-dialog.png, probe-case-new-empty-submit.png.

## Root Cause

Token --muted is tuned for white, not for the grey strip; row height token 26 px and 11-12 px text make targets small; Dialog component focuses the first field but has no focus trap.

## Recommended Fix

Darken --muted to >= #5c6577 on grey surfaces, underline inline links, raise minimum control height to 28-32 px, add a focus trap to Dialog, focus the error summary (role=alert) after failed submits.

## Acceptance Criteria

axe reports 0 serious/critical violations on all routes; Tab never leaves an open modal.

## Regression Test

Add axe check to the regression suite

