# Independent screenshot review

10 November 2026. This review inspected saved raster evidence only; it did not control a browser, run tests or change application state. The purpose was to inspect the **captured visible area** for clipping/overlap at mobile/tablet widths. It does not establish below-fold layout, scrolling behavior, interaction, complete keyboard access or WCAG compliance.

## Evidence inspected

The following **15 distinct raw screenshots** were manually viewed in unscaled labeled contact-sheet compositions:

| Contact sheet | Raw images included | Route coverage |
|---|---|---|
| [mobile A](visual-review/contact-mobile-a.png) | `R001-mobile.png`, `R008-mobile.png`, `R024-mobile.png` | Executive dashboard, Tickets list, Map |
| [mobile B](visual-review/contact-mobile-b.png) | `R025-mobile.png`, `R027-mobile.png`, `R029-mobile.png` | Client detail, Contract detail, Rights |
| [mobile C](visual-review/contact-mobile-c.png) | `R032-mobile.png`, `R039-mobile.png`, `R044-mobile.png` | Change history, Report builder, Ticket detail |
| [mobile D](visual-review/contact-mobile-d.png) | `R047-mobile.png`, `R050-mobile.png` | Environment detail, Notifications |
| [tablet A](visual-review/contact-tablet-a.png) | `R024-tablet.png`, `R029-tablet.png` | Map, Rights |
| [tablet B](visual-review/contact-tablet-b.png) | `R039-tablet.png`, `R050-tablet.png` | Report builder, Notifications |

These **five originals were also opened independently at original detail** to confirm composition findings:

- [R050 mobile](../screenshots/R050-mobile.png)
- [R039 mobile](../screenshots/R039-mobile.png)
- [R029 mobile](../screenshots/R029-mobile.png)
- [R024 tablet](../screenshots/R024-tablet.png)
- [R025 mobile](../screenshots/R025-mobile.png)

Contact sheets are review artifacts, not raw screenshots: labels and adjacent arrangement were added outside each image; raw screenshot pixels were pasted at scale 1 and originals were not altered. Pillow was unavailable, so composition used native System.Drawing. Dimensions/source membership are recorded in the [manifest](visual-review/contact-sheet-manifest.json). Most mobile originals are 390×843; the Map mobile original is 390×520. The requested viewport metadata is 390×844 or 768×1024; actual screenshot dimensions are documented without assuming a browser defect.

The review also read [responsive-results.json](responsive-results.json) for route/viewport/document-width/loading/error-alert metadata. Its absence of document-wide overflow or error flags is not an accessibility or layout pass. Local card overlap can exist while document width still equals viewport width.

## Visible issue confirmed

**Notifications: first overdue summary card has overlapping title and badge at mobile width.**

- Image: [R050-mobile.png](../screenshots/R050-mobile.png); route `/notifications`; requested mobile viewport 390×844, actual captured raster 390×843.
- In the Critical / Overdue section, the first card's title `4 overdue payments` wraps to two lines. The separate outlined `Overdue` badge occupies the same first-line area, overlapping the word `overdue` in that title. The right-side `View payments (4)` action is also on that horizontal band.
- This is true visible overlap inside the card, rather than content merely being outside the viewport. It impairs scanning the alert title. Suggested severity: **P2 mobile usability** if this is an intended operational viewport; calibrate against the parent audit's severity policy and avoid duplicate issue records.
- Comparison: [R050-tablet.png](../screenshots/R050-tablet.png) shows the same card title at left and a distinct right action/badge area without that overlap in the visible card.
- Recommended correction: allow title/body and badge/actions to occupy non-overlapping grid tracks or stack actions below the text on narrow cards. Acceptance: at 390px, the title, badge and action remain independently readable for long grouped alerts, including wrapped text.
- Screenshot-only reproducibility: once observed in the supplied mobile raster, with tablet comparison. This reviewer did not re-run the live interaction, resize the browser or establish repeated occurrence.

The Notifications Payments tab is also only partly visible at the right edge with a circular scroll affordance. This may be intended horizontal tab scrolling. Its accessibility/discoverability cannot be decided from the image alone and is **not recorded here as a separate confirmed defect**.

### Mobile/tablet comparison and source hypothesis

| Detail | Mobile — `R050-mobile.png` | Tablet — `R050-tablet.png` |
|---|---|---|
| Group title | `4 overdue payments` wraps into a narrow text area | Single readable title line at left |
| Status badge | Outlined `Overdue` overlaps the first title line | Separate right-side badge above action |
| Group action | `View payments (4)` shares the badge's row and crowds the text side | Button beneath badge with adequate separation |
| Conclusion | Visible collision confirmed in captured first card | No corresponding collision in captured card; not a full-page pass |

Read-only local source inspection suggests a CSS specificity interaction, subject to the live2.59/local2.60 version caveat:

- `src/web/src/pages/Notifications.tsx:71–99` (`GroupCard`) places icon, `.ntf-main` text and `.ntf-side` chip/action as siblings inside a flex `.ntf`.
- `src/web/src/pages/Notifications.css:23` makes `.ntf` flex; `.ntf-main` can shrink and has `min-width:0` (`:38`). Desktop `.ntf-side` is non-shrinking column layout with a percentage maximum (`:43`).
- The Notifications page declares `.ntf-page .ntf-side { max-width:40%; }` (`:62`), which is more specific than the later phone `.ntf-side { max-width:none; }` (`:65`). The phone rule switches the side to a row with width100% and right justification (`:67`), but does not override that more-specific page maximum. Non-wrapping chip/action content (`:44`, `:46`) can then exceed the constrained side area and crowd the adjacent text.
- No computed-style trace or deployed CSS revision was captured in this review, so this remains a source-supported **likely cause**, not a confirmed browser-computed explanation.

A focused correction is to override the page-specific maximum in the phone breakpoint (for example `.ntf-page .ntf-side { max-width:none; flex-basis:100%; width:100%; }`), and allow the badge/actions row to wrap when necessary. Alternatively use explicit non-overlapping grid areas. Verify grouped and individual notifications, long titles/action labels and the popover separately at390/768 widths; preserve keyboard semantics and action behavior. No CSS change was made by this reviewer.

## Capture limitations that prevent a visual verdict

| Images | Visible state | Consequence |
|---|---|---|
| [R024-mobile.png](../screenshots/R024-mobile.png), [R024-tablet.png](../screenshots/R024-tablet.png) | Only a pale canvas and Loading indicator; no map, application header or map controls rendered in these images | These two images do not provide mobile/tablet map visual coverage. The metadata row's `loadingOnly=false` does not change the pixels viewed. This can be capture timing/readiness; it is not proof of a stuck or broken map. A settled capture is needed. |
| [R032-mobile.png](../screenshots/R032-mobile.png) | Change history title and filters render; content panel below filters displays Loading | The title/filter layout can be inspected, but not audit rows, row actions or before/after-value wrapping. Do not infer a persistent loading defect or table correctness. |
| All inspected images | Top visible area only; page/body scrollbars and bottom status strip are present | Content cut at the captured lower boundary is not automatically inaccessible or clipped. No claims about the unviewed lower form, table, dialogs, footer overlap during scroll or hidden actions are made. |

## Other visible areas reviewed

| Images | Limited visual observation |
|---|---|
| R001-mobile | Dashboard title and filter blocks wrap within the width; the visible At a glance cards remain readable without obvious overlap. Lower KPI/chart layout is unviewed. |
| R008-mobile | Ticket title, description, quick-filter counts and stacked filter fields fit the visible width. Search/table start is near the lower boundary; table columns and paging are not visually established here. |
| R025-mobile | Client title/actions and section tabs wrap into readable lines. Visible risk counts and first table entries fit. Horizontal/vertical interaction and later client sections remain untested by this review. |
| R027-mobile | Long contract heading wraps; actions and term/renewal/SLA/payment-summary blocks fit the visible area. Tabs wrap. Detailed lower contract tables are not visible. |
| R029-mobile, R029-tablet | Rights role/comparison controls, status/count summary and missing-prerequisite warning are readable in the visible area. Tablet filters/module chips also fit. The lower permission matrix and save flow are not inspected from these captures. |
| R039-mobile, R039-tablet | Builder heading/actions and visible steps/filters adapt to width without an obvious collision. Mobile status chips wrap. Tablet shows more fields and the action bar without obvious overlap. Mobile lower save/export/preview sections remain outside this captured view. |
| R044-mobile | Ticket title/actions, informational notices and visible summary grid fit. Wrapped owner/SLA text remains readable in the visible area. This is not a validation of ticket workflow/state correctness. |
| R047-mobile | Environment heading/actions and ownership/coverage rows fit; long person names wrap. Only the start of condition/freshness is visible below. |
| R050-tablet | Notifications title, tabs, filters and visible alert groups fit, with separated title/badge/action areas. This does not assess behavior after expanding groups, marking read or changing filters. |

No contrast measurements, target-size measurements, screen-reader run or keyboard test was executed in this screenshot review. No full WCAG pass is claimed. A visually readable top area is narrower evidence than a passed module or user journey.

## Follow-up recapture review

Five further originals were manually opened at the lead auditor's request:

| Original viewed | Visible result | Limited conclusion |
|---|---|---|
| [R057-mobile-recapture.png](../screenshots/R057-mobile-recapture.png) | Pale canvas with Loading indicator only | Still insufficient for settled Products & Installations category visual coverage. Do not call persistent application loading from this screenshot alone. |
| [R057-tablet-recapture.png](../screenshots/R057-tablet-recapture.png) | The 768×1024 raster contains roughly a mobile-width Products & Installations page strip at left and black remainder to right/bottom; the row text is cut at that strip boundary | A possible resize/backing-buffer/capture mismatch. This image cannot distinguish a screenshot artifact from a layout issue and should not confirm application clipping without a clean settled recapture. |
| [R060-tablet-recapture.png](../screenshots/R060-tablet-recapture.png) | System configuration heading and three full-width category rows are populated/readable | No obvious overlap in the visible area. Links/actions were not exercised by this review. |
| [R087-tablet-recapture.png](../screenshots/R087-tablet-recapture.png) | New environment fields, helper text, description and Cancel/Save actions fit the visible tablet form | No obvious collision in the captured empty form. Validation, dependent choices, save/cancel and other input states remain unexecuted. |
| [R088-tablet-recapture.png](../screenshots/R088-tablet-recapture.png) | Directory group mappings heading, New mapping action and empty table render readably | Settled empty state has no obvious visual overlap; populated rows/dialogs and mapping behavior remain untested. |

This brings the independent visual sample to **20 distinct raw images**, with 10 of those also opened as individual originals. This is review-sample bookkeeping, not a complete responsive coverage count. The initial map/audit capture limitations remain historical statements about the exact images named; later settled evidence maintained by the lead auditor may supply that missing coverage.

### R057 second settled captures

Two additional originals were opened and their raster dimensions read from the PNG files:

| Original viewed | Actual raster bounds | Observed state and coverage limit |
|---|---|---|
| [R057-mobile-settled2.png](../screenshots/R057-mobile-settled2.png) | **390×843** | Products & Installations content and Component roles card are now populated. A Navigation drawer is visibly open in roughly the left 180px; content starts near x180 and wraps in the remaining width. The card itself remains readable in the visible strip. This is an open-menu state, not a clean closed-menu form/category comparison. The corresponding text snapshot describes a Section menu rather than the same visible All sections drawer, so screenshot/text state identity should not be assumed. |
| [R057-tablet-settled2.png](../screenshots/R057-tablet-settled2.png) | **474×1024**, rather than the requested 768×1024 | Populated category content appears beside visible navigation, but left navigation labels are clipped at the raster edge. The Component roles card occupies approximately x174–459 and its visible text fits. The actual 474px raster cannot substantiate a complete 768px tablet visual assessment; capture/pane/cropping state must be reconciled before treating this as an application defect. |

These demonstrate that the category can render settled content, but they do not repair the earlier missing closed-menu viewport evidence. The review now covers **22 distinct raw screenshots**, with 12 independently opened originals. Numbers here count only this review's images, not all audit states. No browser interaction was performed to dismiss a drawer, scroll horizontally or reproduce the capture geometry.

