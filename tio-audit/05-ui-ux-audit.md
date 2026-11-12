# UI/UX and accessibility audit

The hub generally provides a consistent enterprise shell, linked operational records, labelled status/unknown states and useful tabular alternatives. Confirmed productivity problems concern mobile notifications, misleading cross-view labels, table column associations and unavailable-export guidance. **No WCAG conformance rating or overall UI score is assigned.** This audit combines actual interactions, DOM observations and selected screenshot review; it is not a full assistive-technology assessment.

## Coverage and viewport method

All 91 selected entries in the [route list](traces/responsive-route-list.json) were opened at **1920×1080, 1366×768, 768×1024 and 390×844**. There are 364 canonical DOM snapshots and 364 canonical screenshot files (`R001`–`R091`, each four sizes). The [metric aggregate](traces/responsive-results.json) is rebuilt from 364 individual observations in `traces/responsive-metrics/`. Metrics for later routes were remeasured when an earlier aggregate retained only its first 144 rows. Each recovered metric is explicitly labelled; the original screenshot is retained. This separates lost aggregate bookkeeping from actual observed behavior.

The 364 narrow geometry checks passed: document scroll width did not exceed the requested viewport and no captured role=alert error was found. Those assertions do **not** detect every internal overlap, clipped container, unreadable chart, open drawer, offscreen button or failed workflow. The mobile Notifications defect exists despite no document-wide overflow.

Two independent visual-review passes inspected 72 original selected captures (15 representatives, then41 remaining mobile and16 tablet captures). The reviewer also inspected seven new recapture/follow-up images and reopened selected originals; root performed further spot checks. Review-only contact sheets preserve unmodified raw screenshots as evidence; they are not defect screenshots. All91 selected entries at all four sizes were **captured**, but not every pixel/state at every size was manually reviewed. [First visual review](traces/visual-review-observations.md), [remaining visual review and exact filenames](traces/visual-review-remaining.md).

### Capture limitations requiring careful interpretation

- Original Map and Audit sweep views included Loading states; separate `R024-*-settled` and `R032-*-settled` files show follow-up content. A temporary Loading capture alone is not a broken page.
- R057 mobile/tablet category screenshots have inconsistent raster dimensions/backing-buffer or drawer states relative to requested DOM viewport. Settled recaptures show populated content, but do not establish a clean closed-menu screenshot at the intended tablet dimensions. Preserve these as capture anomalies; no application clipping defect is confirmed from them.
- R060/R087/R088 tablet recaptures show readable settled content in their visible regions. Thin drawer remnants in earlier snapshots are not independently confirmed defects.
- Long forms and tables extend below the first viewport. No blanket claim is made about lower sections, sideways-scroll actions, touch dragging, validation dialogs or all submit controls.

## Confirmed defects affecting usability

| Issue | Category / severity | Observable user consequence | Correction |
|---|---|---|---|
| [001](issues/TIO-BUG-001.md) | Business Logic /P2 | Users see a different status in client summaries/search and ticket detail, making queue review inconsistent. | Reuse configured status projection/formatter; keep internal stage separate. |
| [003](issues/TIO-BUG-003.md) | Accessibility /P3 | Desktop table headers associate Details with selection cells and vice versa. Explicit button labels mitigate but do not repair column semantics. | Match header and body column order, with/without selection/expansion. |
| [004](issues/TIO-BUG-004.md) | UI /P2 | On390×844 Notifications, overdue badge/action content intersects the title. | Correct mobile specificity and let actions occupy a full wrapping row. |
| [005](issues/TIO-BUG-005.md) | UX /P3 | Completed export appears unavailable with no explanation or safe next step. | Explain availability/access change and offer regeneration subject to current rights. |
| [006](issues/TIO-BUG-006.md) | Business Logic /P2 | Report users cannot select configured statuses they see in the work queue. | Drive catalog choices and accepted filter values from configured statuses. |
| [007](issues/TIO-BUG-007.md) | UX /P3 | Type hint Incident conflicts with the configured Bug label in detail. | Use configured type label for the list hint and retain code only where useful. |

Audit identifier issue002 is primarily Data; it also makes operational history harder to interpret. It is counted once in the register. In primary UI/UX categories, confirmed counts are **UI1, UX2, Accessibility1**, with two additional Business Logic display/filter issues. No separate duplicate findings are added for their secondary usability impact.

## Actual interactions and observed strengths

| Area | Actual behavior tested/inspected | Bounded result |
|---|---|---|
| Navigation | Dashboard overdue KPI, global search result, selected record links, reload and browser Back | Correct selected destinations and settled return states; titles/breadcrumbs available. [Journey](09-end-to-end-test-results.md). |
| Mobile menu and keyboard | Menu open/close; actual Tab traversal after settling | Closed drawer links did not enter the observed sequence; visible header/content controls received focus. Not a full keyboard audit. [Settled sequence](traces/mobile-closed-menu-keyboard-settled.json). |
| Ticket tables | Exact/partial/empty search, overdue filter, next page, sort state | Selected behaviors returned explicit results; header/body mismatch remains separately failed. [Coverage](03-test-coverage-matrix.csv). |
| Chart interpretation | Dashboard textual legends, Table view controls and status/unknown explanations inspected | Text accompanies colour; manual condition is distinguished from live monitoring. Not every chart toggle or accessible description was exercised. |
| Empty states | Ticket no-match, reassignment, selected tabs, saved/scheduled reports | Meaningful empty-state wording was observed; emptiness is not proof of lifecycle correctness. |
| Forms | Seven blank new-record forms, login/password surfaces | Visible labels/layout inspected; no input submission or full validation/cancellation/persistence tests. |
| Report configuration | Fourteen previews applied and populated | Preview flow usable in tested scope; status-choice inconsistency and export guidance remain. |

## Accessibility findings and unverified criteria

**Automated accessibility engine findings: none collected.** Axe or an equivalent engine was not run. DOM snapshots and width checks are automation-assisted observations, not a WCAG scanner result. No claim of zero automated violations is made.

**Manually confirmed issue:** TIO-BUG-003 concerns table column semantics, relevant to WCAG2.2 information/relationships principles (1.3.1). A formal criterion-level conformance determination still requires assistive review. TIO-BUG-004 is a confirmed visual overlap; no additional unmeasured contrast/target-size failure is inferred.

| WCAG principle/area | Evidence available | Remaining verification |
|---|---|---|
| Keyboard/focus | Limited settled menu Tab traversal and search navigation | Full controls, modals, trap/escape behavior, focus visibility/occlusion and order on all pages |
| Labels/semantics | Form labels, tab names, headings, meaningful record links in snapshots; table association defect | Screen-reader output, field help/error associations, live-region announcements and complete heading hierarchy |
| Colour/contrast | Status text/glyphs and unknown labels accompany colour in inspected views | Measured text/nontext contrast under all states/themes; colour-only distinctions elsewhere |
| Reflow/zoom | Four requested viewport geometries and selected raw images | 200%/400% zoom, all horizontally scrolling data tables, below-fold actions and touch behavior |
| Target sizing | Buttons/links visible in selected captures | Measured targets/spacing under WCAG2.2 and touch testing |
| Error identification | Blank forms inspected, no safe submissions | Required/format/date/length validation, inline messages, server errors and screen-reader announcements |

## Improvements requiring a product decision

These are P4 suggestions, not defects: clarify hub owner versus Jira assignee labels where both appear; make the scope of14-day executive and configurable7-day chart windows easier to understand; prioritize current owner/next action/freshness on management review screens; agree which configuration actions must be practical on mobile versus a documented desktop workflow. Validate with TIO users before changing behavior. The app already discloses multiple measurement limits; preserve this useful distinction between Unknown, zero and Not available.

Recommended sequence: fix004 and003 with isolated responsive/semantic regressions, then correct shared configured-label rendering and unavailable-export guidance. Complete keyboard, screen-reader, contrast, zoom and below-fold testing in an approved environment before assigning a UI maturity score. [Roadmap](10-recommendations-roadmap.md).
