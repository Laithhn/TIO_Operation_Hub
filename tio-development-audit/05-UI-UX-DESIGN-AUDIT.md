# 05 — UI/UX design audit

Assessed independently of VITRONIC conventions, against Nielsen's heuristics, WCAG 2.2 AA and common enterprise patterns. Evidence: 256 crawl screenshots (`screenshots/{desktop|laptop|tablet|mobile}-<page>.png`), probe screenshots (`screenshots/probe-*.png`), measurements in `traces/ui-crawl-results.json`.

## Overall judgement

The interface is **coherent, calm and information-rich, but dense, small and dated**. Its strongest parts are content design (plain-language hints, explicit definitions under KPIs, distinct empty states) and feedback on forms. Its weakest parts are scale (text and targets too small), action hierarchy (destructive actions in the foreground), list filtering, and behaviour below 1500 px.

## Visual quality

| Aspect | Assessment | Evidence |
|---|---|---|
| Modernity | Flat navy/grey chrome with 2 px radii and no elevation reads as a mid-2010s desktop tool. The dashboard uses a different, more current card style, so the product has two visual languages | `desktop-cases.png` vs `desktop-dashboard.png` |
| Typography | 14 distinct font sizes; 89 % of text nodes are 11–12.5 px; fractional sizes (11.4, 11.5, 12.5, 13.5) signal ad-hoc tuning. Titles are only 18 px, so hierarchy is weak | crawl `fonts` |
| Colour and contrast | Restrained palette; status colours always paired with text and a dot (good). Muted grey on the grey strip is 4.3:1 (fails AA for 12 px); inline links differ from text by colour only | axe results |
| Spacing | Consistent 16 px gaps; forms stretch to full width at 1920 px (title field about 1,700 px wide), which hurts scanning | `desktop-case-new.png` |
| Density | High. Rows wrap owner and team names over two or three lines because 12 columns compete for width | `desktop-cases.png` |
| Icons | Custom outline set, consistent; few icons carry meaning alone | — |
| Tables | Clear header, zebra-free, good status chips; weak column prioritisation; cryptic "R / X" SLA chips | `desktop-cases.png` |
| Forms | Logical grouping in newer forms (contract, server); required marker and hints good; native date inputs show the browser locale while the rest of the page uses "12 Nov 2026" | `laptop-contract-edit.png` |
| Dialogs | Proper modal semantics; routine actions require an "I confirm" tick; "Cancel" beside "Cancel case" | probe output |

## Usability findings (heuristic)

| Heuristic | Finding | Issue |
|---|---|---|
| Visibility of system status | Loading text, last-refreshed time, environment badge and "Server Online" are present. Saves return to the record without a success message | — |
| Match with the real world | Mostly plain language. Exceptions: "PendingValidation" in messages, "Records :- 15 OF 25", "Unknown" for values that are simply not yet due | 022 |
| User control and freedom | Unsaved-changes prompt (native dialog), Esc closes dialogs. Hard delete is one click from every row | 021 |
| Consistency | Three filter models on one list; two export buttons; three date formats on one page; reopen rules differ by record type | 019, 022, 032 |
| Error prevention | Good server validation; weak for dates and duplicates; destructive actions prominent | 007, 021 |
| Recognition over recall | Definitions under each KPI and report column are exemplary | — |
| Flexibility and efficiency | Global search (`/`, Ctrl+K), "+ New" menu, clickable rows, URL-backed filters. No saved list views, no bulk actions, no keyboard shortcuts for workflow steps | — |
| Minimalist design | Command Center has about 60 widgets; case page has nine equal buttons | 025, 021 |
| Error recovery | Field errors are specific and kept with the values. List load errors and missing records offer no way forward | 023 |
| Help | Inline hints are good; there is no help page, glossary or onboarding | — |

## Responsive results (64 routes per viewport)

| Viewport | Horizontal overflow | Observations |
|---|---|---|
| 1920 × 1080 | none | Forms and text lines too wide |
| 1366 × 768 | `/versions` (1,744 px) | **Top navigation clipped on every page** (016); filter bar wraps to two rows; 11 client tabs wrap |
| 768 × 1024 | `/versions` | Side menu becomes a drawer (works); tables scroll inside panels |
| 390 × 844 | 7 pages (dashboard 693 px, reports 540, client 733, contract edit 579, environments 610, environment 458, versions 1,576) | Eight stacked filters fill the first screen before any data; status bar wraps to two lines and stays fixed; case table needs sideways scrolling for 12 columns |

The product is usable on tablets, marginal on a 1366 px laptop and not designed for phones.

## Priority UX recommendations

1. Fix the header at 1366 px and the overflow pages (016, 017).
2. One search and one export per list; filters as chips; saved views (019).
3. Re-order actions by workflow; move Delete into an overflow menu; rename ambiguous buttons (021).
4. Adopt a five-step type scale with 14 px body text and 32 px controls; cap form width at about 960 px (022).
5. Split the Command Center into a one-screen summary plus topic pages (025).
6. Add success toasts, Retry on errors and a proper not-found panel (023).
