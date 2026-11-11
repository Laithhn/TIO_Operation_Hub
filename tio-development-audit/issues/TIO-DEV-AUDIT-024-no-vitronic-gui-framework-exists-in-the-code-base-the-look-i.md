# TIO-DEV-AUDIT-024 — No VITRONIC GUI framework exists in the code base: the look is a hand-written imitation of one reference screenshot

| Field | Value |
|---|---|
| Module | GUI framework |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | src/web/src/styles, src/web/src/ui |
| Category | GUI framework limitation |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | UX / Product |

## Business Impact

The "framework" is 919 lines of bespoke CSS and a 572-line component file reproducing a VITS screenshot (colours are "visual estimates"). There is no shared, versioned, tested component library, no documentation site, no theming and no accessibility baseline to inherit; every fix must be made in this application only.

## User Impact

Higher maintenance cost, visual drift from other VITRONIC products, and reference traits that limit usability (34 px bars, 24-26 px rows, 10.5-12 px text, dense flat panels).

## Preconditions

None.

## Steps to Reproduce

Review docs/DESIGN-RULES.md, src/web/src/styles/tokens.css, app.css, ui/kit.tsx.

## Expected Result

A maintained design system (tokens + accessible components) consumed as a package.

## Actual Result

Screenshot-derived custom CSS.

## Evidence

docs/DESIGN-RULES.md ("Colours ... visual estimates"); src/web/src/styles/tokens.css:1-2; src/web/src/ui/kit.tsx; see 06-VITRONIC-GUI-FRAMEWORK-REVIEW.md.

## Root Cause

Design decision: match a screenshot because no library or official assets were supplied (DECISIONS A15).

## Recommended Fix

Obtain the official VITRONIC library if one exists; otherwise formalise this kit as a small design system on accessible primitives and relax the reference geometry.

## Acceptance Criteria

Components come from a versioned package with documented tokens and automated accessibility tests.

## Regression Test

n/a
