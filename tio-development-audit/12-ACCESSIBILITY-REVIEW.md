# 12 — Accessibility review

Method: axe-core 4 (rule tags wcag2a, wcag2aa, wcag21aa, wcag22aa) on 64 routes at 1920×1080 as TIO Manager; DOM measurements; keyboard probes with Playwright. No screen-reader session and no user testing were performed. Target: WCAG 2.2 AA. Raw data: `traces/ui-crawl-results.json`.

## Automated results

| Rule | Impact | Nodes | Screens | Example |
|---|---|---|---|---|
| color-contrast (1.4.3) | serious | 81 | 26 | Muted text `#6b7487` on strip `#f5f5f6` = 4.3:1 at 12 px (needs 4.5:1) |
| link-in-text-block (1.4.1) | serious | 55 | 9 | Link `#1d4e9e` inside hint text: 1.69:1 against surrounding text, no underline |
| target-size (2.5.8) | serious | 19 | 3 | Chart legend links 38 × 18 px |
| scrollable-region-focusable (2.1.1) | serious | 1 | 1 | Escalation trend panel on the dashboard |

No critical violations. No missing form labels, image alternatives, document language or page titles were reported; every route has a specific `<title>`.

## Measurements and manual probes

| Check | Result |
|---|---|
| Interactive elements smaller than 24 px in one dimension | 1,356 of 3,569 (38 %) across the 64 screens — mostly 20–22 px buttons, selects and row links |
| Text size | 89 % of text nodes at 11–12.5 px; smallest 10 px |
| Skip link | Present, first in tab order |
| Focus indicator | 2 px solid outline on all 14 elements sampled |
| Landmarks | one `main`, three `nav` ("Main", "Section menu", "Dashboard sections"), one `header` |
| Headings | One `h1` per page, except Notes, the missing-record state and the missing-microservice state |
| Form labels | New-case form: 15 of 15 controls have a programmatic label; failed fields get `aria-invalid="true"` and a text message |
| Error identification (3.3.1) | Summary + field messages in text. **Focus is not moved** to the summary or first invalid field (focus stays on `body`) |
| Dialogs | `role="dialog"`, `aria-modal="true"`, initial focus inside, Esc closes. **Tab leaves the dialog** into the page behind (2.4.3 / modal pattern) |
| Colour independence | Status chips carry text and a dot; charts offer a table view |
| Sort state | Sortable headers are buttons; the shared table sets `aria-sort` (`ui/kit.tsx:303`). Not verified with a screen reader on server-sorted lists |
| Reflow (1.4.10) | Fails at 390 px on seven pages (see 05) |
| Session timing, captions, motion | Not applicable / not tested |

## Assessment

The team clearly designed for accessibility (documented in `DESIGN-RULES.md`) and the semantic basis is sound. Conformance with WCAG 2.2 AA is **not** reached because of contrast on grey surfaces, colour-only links, target size, reflow, and focus management in dialogs and after errors. All are fixable in shared tokens and three shared components (TIO-DEV-AUDIT-018, 017).

## Recommended fixes

1. Darken `--muted` for use on `--strip`/`--bg` or use `--fg-2` there; underline links inside text.
2. Minimum control height 28 px (32 px preferred) and 24 px minimum for inline links in tables.
3. Add a focus trap and focus return to `Dialog`; give the error summary `role="alert"` and focus it.
4. Make scrollable chart panels focusable; verify sort announcements on server-sorted lists.
5. Add an axe run to the regression suite and fail the build on serious violations.
6. Commission a screen-reader walkthrough (NVDA/JAWS) of the case workflow before release.
