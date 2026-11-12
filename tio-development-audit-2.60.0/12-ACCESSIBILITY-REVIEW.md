# 12 — Accessibility review (build 2.60.0)

Method as in the first audit: axe-core 4 (WCAG 2.0/2.1/2.2 A and AA rule tags) on **79 routes** at 1920×1080 as TIO Manager, DOM measurements, keyboard probes. No screen-reader session. Raw data: `traces/ui-crawl-results.json`.

## Automated results and comparison

| Rule | Impact | 2.29.0 (64 routes) | 2.60.0 (79 routes) | Example on 2.60.0 |
|---|---|---|---|---|
| color-contrast (1.4.3) | serious | 81 nodes / 26 screens | **243 nodes / 38 screens** | Link `#007db3` on `#fafbfc` = 4.42:1 at 17 px |
| link-in-text-block (1.4.1) | serious | 55 / 9 | **1 / 1** | Link inside text on the contract page |
| target-size (2.5.8) | serious | 19 / 3 | 17 / 3 | Map markers; configuration list controls |
| scrollable-region-focusable (2.1.1) | serious | 1 / 1 | 1 / 1 | Escalation trend panel |
| nested-interactive (4.1.2) | serious | 0 | **1 / 1** | SLA trend chart: focusable elements inside an interactive SVG |

No critical violations; no missing labels, alternatives or titles.

## Measurements and probes

| Check | 2.29.0 | 2.60.0 |
|---|---|---|
| Interactive elements under 24 px in one dimension | 38 % (1,356 / 3,569) | **21 %** (1,159 / 5,544) |
| Dominant text size | 11–12.5 px (89 %) | **14.45 px (62 %)**, 12.75 px (18 %), 17 px (10 %) |
| Horizontal overflow at 390 px (reflow 1.4.10) | 7 pages | **0 pages** |
| Skip link, visible focus ring | Yes | Yes |
| One `h1` per page | 3 exceptions | 1 exception (missing-ticket state) |
| Form labels / `aria-invalid` on errors | Yes | Yes |
| Focus moved to error summary after failed submit | No | **No** (focus stays on `body`) |
| Dialog: role, `aria-modal`, Esc | Yes | Yes |
| Dialog: focus contained | No | **No** |
| Sortable headers | Buttons | Buttons with `aria-sort` and spoken sort (A69) |
| Tables | Native | Native (the framework grid was removed for accessibility reasons) |
| Row selection and disclosure controls | — | Named ("Select CS-1028 …", "Details for CS-1028 …") |
| Header controls | Named | Named ("Notifications, 15 unread", "Menu, current section Tickets") |

## Assessment

Structure, naming, reflow, text size and target size improved markedly; the team clearly tests for accessibility (the project's own UX audit and remediation documents are in `docs/`). **WCAG 2.2 AA is still not met**, now mainly for one reason: the framework's link colour. Fixing that token, containing focus in dialogs and moving focus to the error summary would remove nearly all remaining automated and probed failures (issue 018).

## Recommended fixes

1. Override or fix upstream the `#007db3` attention colour to at least 4.5:1 on the light surfaces (about `#00719f` or darker).
2. Add a focus trap and focus return to the hub's dialog wrapper.
3. Give the error summary `role="alert"` and move focus to it.
4. Make the scrollable chart panel focusable; remove nested focusable elements from the SLA chart or expose them as a list.
5. Run axe in the regression suite and fail on serious violations.
6. Screen-reader walkthrough of the ticket workflow before release.
