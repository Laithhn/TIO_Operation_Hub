# 06 — VITRONIC GUI framework review

## Direct answer

**Does the current GUI framework help or limit the quality of the TIO Operations Hub? — It limits it.**

Two reasons, in order of importance:

1. **There is no framework in this product.** The repository contains no VITRONIC component library, package or design-system dependency (`src/web/package.json` lists only React, React Router, TanStack Query, Leaflet, d3-geo and a font). What is called the VITRONIC look is 919 lines of application-specific CSS (`styles/tokens.css`, `styles/app.css`) and one 572-line component file (`ui/kit.tsx`) written to imitate a single screenshot of another product ("Wanted Plate Management"); `docs/DESIGN-RULES.md` states that the colours are "visual estimates" and that the logo is a stand-in. The application therefore carries the cost of a house style without the benefits of a shared framework: no reuse, no central fixes, no accessibility baseline, no documentation.
2. **The reference style itself constrains usability.** Where the application follows the screenshot faithfully it is weakest; where the team deviated (larger text, left-aligned cells, darker grey, the card-based dashboard) it improved. The documented deviations are all corrections of the reference.

I could not inspect the real VITRONIC framework, if one exists. Statements below about "the reference style" concern what is reproduced here.

## Assessment by criterion

| # | Criterion | Rating | Observations | Origin |
|---|---|---|---|---|
| 1 | Visual design quality | Weak–adequate | Flat navy bars, grey canvas, square panels; serious and uncluttered but dated; no elevation or grouping cues, so dense pages look uniform | Reference convention |
| 2 | Typography | Weak | Reference rows are about 10.5 px; the app raised this to 12–13 px yet still renders 14 sizes; titles 18 px | Reference convention + page implementations |
| 3 | Spacing system | Adequate | One gap token (16 px); no vertical rhythm scale; 24–26 px row height forces small targets | Reference convention |
| 4 | Component consistency | Adequate | `kit.tsx` gives consistent tables, panels, dialogs, badges and pagers. The dashboard introduces a second style (8 px radius, shadows, pills) | Page implementation (owner request A51) |
| 5 | Navigation pattern | Weak | Top tabs **and** a 168 px side menu **and** a title strip **and** a fixed status bar consume about 150 px of height and 168 px of width on every page; the tab bar cannot hold nine sections at 1366 px | Reference convention |
| 6 | Form design | Adequate | Labels above fields, required markers, hints, field errors; no maximum width, native date/time inputs, no inline validation | Shared components |
| 7 | Data tables | Adequate | Sort, server paging, clickable rows, status chips. Filter row + filter box + filter bar overlap; pager wording "Records :- n OF n" copied from the reference; no column chooser, density switch or sticky header | Reference convention + shared component |
| 8 | Dashboard components | Good | Purpose-built charts with table views, keyboard-reachable bars, definitions and drill-downs — the most modern part, and the part that departs from the reference | Page implementation |
| 9 | Dialogs and notifications | Adequate | Modal semantics present; no focus trap; no toast/snackbar component, so successful actions are silent; confirmation tick on routine actions | Shared component |
| 10 | Responsiveness | Weak | Desktop-first fixed chrome; drawer below 900 px was added as an "extension"; overflow on phones; fixed status bar wastes mobile height | Reference convention (desktop only) + page implementations |
| 11 | Accessibility | Weak–adequate | Good intent (skip link, focus ring, labels, text with colour) but 81 contrast failures, 38 % of targets under 24 px, colour-only links | Tokens and geometry taken from the reference |
| 12 | Interaction efficiency | Adequate | Search palette and "+ New" help; small targets and long pages slow pointer use; no bulk actions | Mixed |
| 13 | Maintainability | Weak | Styles are global class names in one file; 163 font-size declarations bypass the 5 tokens; no component tests, no visual regression baseline, no Storybook-style catalogue | Implementation |

## Recurring weaknesses and where they come from

| Weakness (seen across modules) | Shared components | Design convention (reference) | Page implementation | Misuse |
|---|---|---|---|---|
| Small text and controls | ✔ tokens | ✔ | | |
| Header overflow at 1366 px | ✔ Shell | ✔ four layers of chrome | | |
| Duplicate filter and export controls | ✔ DataTable | ✔ filter row | | ✔ client-side features on server-paged data |
| Delete on every row | ✔ DataTable | | | |
| Silent success, no retry | ✔ no toast/error component | | | |
| Mixed date formats, enum names in text | | | ✔ | |
| Dashboard length | | | ✔ | |

## Options

| Option | Effort | Risk | Outcome |
|---|---|---|---|
| A. Keep and patch (fix contrast token, header, focus trap, target size) | 1–2 sprints | Low | Removes defects; look stays dated; still no shared library |
| **B. Formalise the kit as a small design system** on accessible primitives (for example Radix UI or React Aria for dialog, menu, tabs, select), keep brand colours, new type and spacing scale, documented tokens, component tests and visual baselines | 4–8 weeks for about 25 components, incremental page by page | Medium | **Recommended.** Fixes structure, keeps brand, no big-bang rewrite; can later be shared with other TIO tools |
| C. Adopt a full third-party suite (MUI, Ant Design, Fluent) with a VITRONIC theme | 8–12 weeks, every page touched | Medium–high (regressions on every page, bundle growth, licence and theme review) | Fast access to rich tables and date pickers; weaker brand fidelity |
| D. Wait for an official VITRONIC library | Unknown | Dependency on another team | Only sensible if such a library exists, is maintained and meets WCAG 2.2 AA — to be confirmed by the owner |

A complete replacement is **not** recommended now: the application's main risks are in business rules, not in the UI, and option B delivers most of the benefit at a fraction of the migration cost.

## Components to redesign first

1. **Shell** — one navigation level on the left with collapsible groups; slim header; status information moved into the header; no fixed footer on small screens.
2. **DataTable** — single server search, filter chips, column priorities, sticky header, row overflow menu, density option.
3. **Dialog** — focus trap, clear primary/secondary labels, confirmation only for destructive actions.
4. **Feedback** — toast for success, error panel with Retry, record not-found panel.
5. **Form layout** — maximum width, sections, consistent date/time control with explicit time zone.
6. **Tokens** — type scale 12/14/16/20/24, control height 32 px, contrast-checked greys.
