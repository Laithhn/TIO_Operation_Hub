# Remaining screenshot visual review (review-only evidence)

Date: 10 November 2026 (Asia/Dubai). This subtask inspected existing screenshot pixels only. No browser request, navigation, interaction, application edit, test execution or production write was performed.

**57 captures manually inspected:** all 41 mobile captures R051–R091 and 16 representative tablet captures, individually listed below. This is a selected initial-viewport visual review, not a claim that every page, scroll position, dialog, interaction, desktop/laptop view or WCAG requirement was manually verified. The lead auditor owns the wider capture inventory; DOM observations alone are not full visual verification.

## Method and preservation

Nineteen labelled contact sheets under `traces/visual-review/remaining-*.png` were composed with Windows System.Drawing. Source images were pasted unscaled and uncropped. Grey gutters and REVIEW ONLY labels are review additions; original PNGs were not modified or replaced. Cite raw captures for defect evidence. System Python had no Pillow; no package was installed.

`view_image` inspected every contact sheet and separately inspected raw R057-mobile.png to investigate its unusual capture. Images were not enhanced or retouched.

## Visible results and limits

| Area | Inspected captures | Pixel observations |
|---|---|---|
| Server, installation, component and microservice details | R051–R054 mobile | Visible headings, action groups and record panels fit the content column. Long microservice names are readable. Lower sections require vertical scrolling and were not reviewed here. No overlap established in captured region. |
| Configuration categories | R055–R060 mobile; R057/R060 tablet | Cards and description text wrap. R057 mobile has a capture anomaly; R060 tablet has a narrow drawer remnant, discussed below. |
| Configuration lists and policies | R061–R078 mobile; R061/R063/R074/R078 tablet | Mobile toolbars wrap; long row labels wrap. Some tables show horizontal scrollbars, including reported conditions, environment/ticket types and policies. This alone is not document-wide overflow or proof an action cannot be reached. Row menus and sideways scrolling were not exercised here. |
| Jira instances and settings | R079/R080 mobile; R080 tablet | Rows and setting groups render. Settings tables scroll horizontally on mobile; labels/values in the captured region are readable. No overlay established. Storage dialogs and lower groups were not opened. |
| New forms | R081–R087 mobile; R081/R084/R085/R086/R087 tablet | Visible fields stack on mobile and use two columns on tablet. Client, commitment and environment tablet captures show their Cancel/Save controls. Mobile submit controls for long forms lie below the captured fold; their reachability is not established. No values were entered or submitted. |
| Directory group mappings | R088 mobile/tablet | Empty state and New mapping action display. Tablet has a left-edge remnant caveat. No mapping dialog was opened. |
| Password and login | R089/R090 mobile/tablet | Cards and visible fields/buttons fit. Login has a masked password and disabled Sign in button; image alone does not prove authentication outcome or button-state correctness. No passwords were read or changed by this reviewer. |
| Project dashboard | R091 mobile/tablet | Status block fits. Signals form two columns on mobile and a broader grid on tablet; text/glyphs accompany status colour. The selected project text is shortened within its select; full option/touch/keyboard behavior was not tested here. Lower timeline sections are offscreen. |

No new **reproducible** overlap/clipping defect was established by this static-image review. This conclusion applies to inspected pixels, not all application states.

## Capture anomalies and unverified follow-ups

1. **R057-mobile.png:** raw PNG is 390 × 520, while the responsive metadata read at review start recorded a 390 × 844 viewport. The app frame appears reduced into the upper-left portion of the PNG with surrounding blank canvas. Viewing the original separately confirmed that composition did not introduce this. It shows rendered category content, not Loading. Repeat/live viewport verification is needed before attributing a stable layout failure to the application. [Raw capture](../screenshots/R057-mobile.png).
2. **Tablet drawer remnants:** R060-tablet.png shows a slim left strip with close icon/section arrows; R087-tablet.png and R088-tablet.png show a narrower strip. R057-tablet.png has a very thin left-edge strip. These may be animation/capture-timing states. Content remains readable in these images, but settled persistence and keyboard accessibility were not tested here. Pair any finding with the lead auditor's settled-menu evidence; do not classify the static remnants alone as a reproducible defect. [R060](../screenshots/R060-tablet.png), [R087](../screenshots/R087-tablet.png), [R088](../screenshots/R088-tablet.png).
3. **Loading:** none of these 57 reviewed captures is a Loading-only main view. This does not establish settled completion for every capture elsewhere in the audit.
4. **Viewport boundaries:** many long pages end at the fixed footer with a vertical scrollbar visible. That is not proof their lower content is permanently clipped. This subtask did not scroll to the end, open actions, test touch dragging or inspect modal bounds.

## Exact raw captures inspected and review sheets

| Review-only contact sheet | Exact raw source filenames inspected |
|---|---|
| [visual-review/remaining-mobile-01.png](visual-review/remaining-mobile-01.png) | `R051-mobile.png`, `R052-mobile.png`, `R053-mobile.png`, `R054-mobile.png` |
| [visual-review/remaining-mobile-02.png](visual-review/remaining-mobile-02.png) | `R055-mobile.png`, `R056-mobile.png`, `R057-mobile.png`, `R058-mobile.png` |
| [visual-review/remaining-mobile-03.png](visual-review/remaining-mobile-03.png) | `R059-mobile.png`, `R060-mobile.png`, `R061-mobile.png`, `R062-mobile.png` |
| [visual-review/remaining-mobile-04.png](visual-review/remaining-mobile-04.png) | `R063-mobile.png`, `R064-mobile.png`, `R065-mobile.png`, `R066-mobile.png` |
| [visual-review/remaining-mobile-05.png](visual-review/remaining-mobile-05.png) | `R067-mobile.png`, `R068-mobile.png`, `R069-mobile.png`, `R070-mobile.png` |
| [visual-review/remaining-mobile-06.png](visual-review/remaining-mobile-06.png) | `R071-mobile.png`, `R072-mobile.png`, `R073-mobile.png`, `R074-mobile.png` |
| [visual-review/remaining-mobile-07.png](visual-review/remaining-mobile-07.png) | `R075-mobile.png`, `R076-mobile.png`, `R077-mobile.png`, `R078-mobile.png` |
| [visual-review/remaining-mobile-08.png](visual-review/remaining-mobile-08.png) | `R079-mobile.png`, `R080-mobile.png`, `R081-mobile.png`, `R082-mobile.png` |
| [visual-review/remaining-mobile-09.png](visual-review/remaining-mobile-09.png) | `R083-mobile.png`, `R084-mobile.png`, `R085-mobile.png`, `R086-mobile.png` |
| [visual-review/remaining-mobile-10.png](visual-review/remaining-mobile-10.png) | `R087-mobile.png`, `R088-mobile.png`, `R089-mobile.png`, `R090-mobile.png` |
| [visual-review/remaining-mobile-11.png](visual-review/remaining-mobile-11.png) | `R091-mobile.png` |
| [visual-review/remaining-tablet-01.png](visual-review/remaining-tablet-01.png) | `R057-tablet.png`, `R060-tablet.png` |
| [visual-review/remaining-tablet-02.png](visual-review/remaining-tablet-02.png) | `R061-tablet.png`, `R063-tablet.png` |
| [visual-review/remaining-tablet-03.png](visual-review/remaining-tablet-03.png) | `R074-tablet.png`, `R078-tablet.png` |
| [visual-review/remaining-tablet-04.png](visual-review/remaining-tablet-04.png) | `R080-tablet.png`, `R081-tablet.png` |
| [visual-review/remaining-tablet-05.png](visual-review/remaining-tablet-05.png) | `R084-tablet.png`, `R085-tablet.png` |
| [visual-review/remaining-tablet-06.png](visual-review/remaining-tablet-06.png) | `R086-tablet.png`, `R087-tablet.png` |
| [visual-review/remaining-tablet-07.png](visual-review/remaining-tablet-07.png) | `R088-tablet.png`, `R089-tablet.png` |
| [visual-review/remaining-tablet-08.png](visual-review/remaining-tablet-08.png) | `R090-tablet.png`, `R091-tablet.png` |

Exact route mapping recorded at review start:

| Preserved raw capture | Route |
|---|---|
| [R051-mobile.png](../screenshots/R051-mobile.png) | `/assets/27` |
| [R052-mobile.png](../screenshots/R052-mobile.png) | `/installations/3` |
| [R053-mobile.png](../screenshots/R053-mobile.png) | `/components/27` |
| [R054-mobile.png](../screenshots/R054-mobile.png) | `/microservices/2` |
| [R055-mobile.png](../screenshots/R055-mobile.png) | `/admin/config/category/clients-environments` |
| [R056-mobile.png](../screenshots/R056-mobile.png) | `/admin/config/category/servers` |
| [R057-mobile.png](../screenshots/R057-mobile.png) | `/admin/config/category/products-installations` |
| [R058-mobile.png](../screenshots/R058-mobile.png) | `/admin/config/category/contracts-cases` |
| [R059-mobile.png](../screenshots/R059-mobile.png) | `/admin/config/category/teams` |
| [R060-mobile.png](../screenshots/R060-mobile.png) | `/admin/config/category/system` |
| [R061-mobile.png](../screenshots/R061-mobile.png) | `/admin/config/reported-conditions` |
| [R062-mobile.png](../screenshots/R062-mobile.png) | `/admin/config/organization-relationship-types` |
| [R063-mobile.png](../screenshots/R063-mobile.png) | `/admin/config/environment-types` |
| [R064-mobile.png](../screenshots/R064-mobile.png) | `/admin/config/responsibility-areas` |
| [R065-mobile.png](../screenshots/R065-mobile.png) | `/admin/config/team-roles` |
| [R066-mobile.png](../screenshots/R066-mobile.png) | `/admin/config/server-types` |
| [R067-mobile.png](../screenshots/R067-mobile.png) | `/admin/config/server-roles` |
| [R068-mobile.png](../screenshots/R068-mobile.png) | `/admin/config/network-zones` |
| [R069-mobile.png](../screenshots/R069-mobile.png) | `/admin/config/operating-systems` |
| [R070-mobile.png](../screenshots/R070-mobile.png) | `/admin/config/project-phases` |
| [R071-mobile.png](../screenshots/R071-mobile.png) | `/admin/config/component-roles` |
| [R072-mobile.png](../screenshots/R072-mobile.png) | `/admin/config/contract-types` |
| [R073-mobile.png](../screenshots/R073-mobile.png) | `/admin/config/case-types` |
| [R074-mobile.png](../screenshots/R074-mobile.png) | `/admin/config/case-statuses` |
| [R075-mobile.png](../screenshots/R075-mobile.png) | `/admin/config/escalation-channels` |
| [R076-mobile.png](../screenshots/R076-mobile.png) | `/admin/config/priority-guidance` |
| [R077-mobile.png](../screenshots/R077-mobile.png) | `/admin/config/team-member-roles` |
| [R078-mobile.png](../screenshots/R078-mobile.png) | `/admin/policies` |
| [R079-mobile.png](../screenshots/R079-mobile.png) | `/admin/jira` |
| [R080-mobile.png](../screenshots/R080-mobile.png) | `/admin/settings` |
| [R081-mobile.png](../screenshots/R081-mobile.png) | `/clients/new` |
| [R082-mobile.png](../screenshots/R082-mobile.png) | `/products/new` |
| [R083-mobile.png](../screenshots/R083-mobile.png) | `/cases/new` |
| [R084-mobile.png](../screenshots/R084-mobile.png) | `/commitments/new` |
| [R085-mobile.png](../screenshots/R085-mobile.png) | `/escalations/new` |
| [R086-mobile.png](../screenshots/R086-mobile.png) | `/contracts/new` |
| [R087-mobile.png](../screenshots/R087-mobile.png) | `/environments/new` |
| [R088-mobile.png](../screenshots/R088-mobile.png) | `/admin/groups` |
| [R089-mobile.png](../screenshots/R089-mobile.png) | `/account/password` |
| [R090-mobile.png](../screenshots/R090-mobile.png) | `/login` |
| [R091-mobile.png](../screenshots/R091-mobile.png) | `/dashboards/project?projectId=1` |
| [R057-tablet.png](../screenshots/R057-tablet.png) | `/admin/config/category/products-installations` |
| [R060-tablet.png](../screenshots/R060-tablet.png) | `/admin/config/category/system` |
| [R061-tablet.png](../screenshots/R061-tablet.png) | `/admin/config/reported-conditions` |
| [R063-tablet.png](../screenshots/R063-tablet.png) | `/admin/config/environment-types` |
| [R074-tablet.png](../screenshots/R074-tablet.png) | `/admin/config/case-statuses` |
| [R078-tablet.png](../screenshots/R078-tablet.png) | `/admin/policies` |
| [R080-tablet.png](../screenshots/R080-tablet.png) | `/admin/settings` |
| [R081-tablet.png](../screenshots/R081-tablet.png) | `/clients/new` |
| [R084-tablet.png](../screenshots/R084-tablet.png) | `/commitments/new` |
| [R085-tablet.png](../screenshots/R085-tablet.png) | `/escalations/new` |
| [R086-tablet.png](../screenshots/R086-tablet.png) | `/contracts/new` |
| [R087-tablet.png](../screenshots/R087-tablet.png) | `/environments/new` |
| [R088-tablet.png](../screenshots/R088-tablet.png) | `/admin/groups` |
| [R089-tablet.png](../screenshots/R089-tablet.png) | `/account/password` |
| [R090-tablet.png](../screenshots/R090-tablet.png) | `/login` |
| [R091-tablet.png](../screenshots/R091-tablet.png) | `/dashboards/project?projectId=1` |

## Assessment limits

- 57 existing image captures were manually inspected; not every route at all four sizes.
- Static images cannot verify sequential focus, inert behavior, actual accessibility-tree exposure, hover content, screen-reader associations, contrast ratios, target dimensions or form validation.
- No screenshot was fabricated, retouched, cropped or overwritten. Contact sheets are derived review aids.
- Application source, configuration, roles, records, integrations, database and services were unchanged.
