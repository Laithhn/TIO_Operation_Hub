# 05 — UI/UX design audit (build 2.60.0)

Assessed against Nielsen's heuristics, WCAG 2.2 AA and enterprise patterns, independently of VITRONIC conventions. Evidence: 316 crawl screenshots (`screenshots/{desktop|laptop|tablet|mobile}-<page>.png`), probe screenshots (`screenshots/probe-*.png`), `traces/ui-crawl-results.json`. For the 2.29.0 state see `tio-development-audit/05-UI-UX-DESIGN-AUDIT.md`.

## Overall judgement

**A clear step forward.** The interface is now built on the real VITRONIC framework, text is readable, navigation fits every screen width, lists have one search and a sensible action hierarchy, and error states offer recovery. Most usability findings of the first audit were addressed through two documented usability reviews (A102, A105, A110). What remains: colour contrast (now worse, because of the framework's link colour), dialog behaviour, low working density on laptops, residual wording and format inconsistencies, and one misleading error page.

## Finding-by-finding comparison

| 2.29.0 finding | 2.60.0 | Evidence |
|---|---|---|
| 016 Navigation clipped at 1366 px | **Fixed** — "More" menu holds sections that do not fit | `laptop-cases.png`; regression test |
| 017 Overflow on phone/tablet/laptop | **Fixed** — 0 of 79 routes overflow at 1366, 768, 390 px | crawl |
| 019 Three filter mechanisms | **Fixed** — quick views, basic + advanced filters, one server search, column chooser | `laptop-cases.png` |
| 020 Forms open without rights | **Fixed** | regression test |
| 021 Destructive actions prominent | **Mostly fixed** — row menu and "More" menu; "CANCEL / CANCEL TICKET" pair and confirmation ticks remain | `probe-row-menu.png`, `probe-cancel-dialog.png` |
| 022 Typography, dates, wording | **Partly** — body text 14.45 px; still 30 computed sizes, mixed date formats, stage names in messages, "Records :- 15 OF 40" | crawl `fonts` |
| 023 No recovery on errors | **Fixed** — "Try again" + trace id; guidance on missing records | `probe-api-500-case-list.png` |
| 025 Overloaded Command Center | **Mostly fixed** — audience dashboards, internal scrolling, counts beside rates | `laptop-dash-management.png` |
| 018 Accessibility | **Open, changed** — see report 12 | crawl |

## Visual quality

| Aspect | Assessment |
|---|---|
| Modernity | Consistent corporate look (navy header, square controls, uppercase buttons, underline inputs). Coherent and more current than 2.29.0, still conservative: no elevation, no rounded shapes, by framework decision (A103) |
| Typography | 17 px root, 14.45 px body: comfortable. Uppercase labels on all buttons reduce legibility for longer labels ("RETURN TO WORK", "ADVANCED FILTERS") |
| Colour and contrast | Framework link/attention blue `#007db3` on near-white is 4.42:1 — just under AA for normal text; this single token causes most of 243 contrast failures |
| Density | Reversed from "too dense" to **too little working area on laptops**: four ticket rows visible at 1366×768 (037) |
| Tables | Clear; row disclosure for secondary columns; bulk selection; sort buttons with spoken state |
| Ticket page | Good redesign: status strip (latest activity, next action, owner, SLA), primary step button, activity stream with filters, collapsible detail panel |
| Dashboards | Purposeful split by audience; KPI cards state composition and sample size |
| Dialogs | Semantics correct; focus not contained; ambiguous button pair on cancel |

## Remaining usability findings

| Heuristic | Finding | Issue |
|---|---|---|
| Match with real world | Messages name internal stages (Triaged, PendingValidation) while the screen shows configurable statuses (Opened, In-progress) | 022 |
| Error prevention | Past dates and duplicates still accepted | 007, 006 |
| Help users recognise errors | Unknown address shows "Access denied… ask an administrator" even to a TIO Manager | 036 |
| Consistency | Two "Export CSV" buttons on the ticket list; three date formats on the ticket page | 022 |
| Efficiency | Limited rows per screen on laptops; "I confirm this action" tick on routine actions | 037, 021 |
| Visibility of status | Successful saves still return silently to the record | — |

## Responsive results (79 routes per viewport)

| Viewport | Horizontal overflow | Observations |
|---|---|---|
| 1920×1080 | none | Good use of width; forms still stretch wide |
| 1366×768 | none | Header fits; about 430 px of chrome before the first table row |
| 768×1024 | none | Drawer with all sections; header shows the current section |
| 390×844 | none | Filters still stacked (five selects) before data; fixed two-line status bar remains; tables use row disclosure |

## Priority UX recommendations

1. Fix the link colour token and dialog focus handling (018).
2. Add a compact density for lists and remove the fixed status bar on small heights (037).
3. Separate "page not found" from "access denied" (036).
4. Finish wording clean-up: status names in messages, one date format, button labels in the cancel dialog (022, 021).
5. Add brief success confirmation after saves.
