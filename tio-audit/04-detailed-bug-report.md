# Detailed confirmed defect report

Audit evidence: 10 November 2026, target https://nb01994.vitronic.de/, deployed 2.59.0, existing TIO Manager account. Seven confirmed findings: **0 P0, 0 P1, 4 P2, 3 P3**. Severity describes the observed business impact; it does not rate unexecuted workflows as passed.

These records consolidate repeated observations rather than counting the same symptom multiple times. Live screenshots/DOM/geometry are the confirmation evidence. Local source explains likely causes and may be a different release; no code fix, database query/migration, production record change, mapping change, role/configuration change or export generation was performed to author these records.

For 001/003/004/006, Always is bounded by the stated sampled conditions. For 002/005, repeated viewing confirms existing-data display, while data creation/masking triggers were not reproduced. Record 002 does not prove a negative actual mapping FK; 005 is an explanation/recovery defect with intentional authorization masking. Record 006 does not claim Pending validation should match the configured Resolved count. Record 007 is bounded to a single observed list/detail type-hint comparison, with source corroboration. Governance data risks and potential capability gaps are separate in [06-business-process-gaps.md](06-business-process-gaps.md).

| Issue | Severity | Module | Confirmed symptom | Suggested owner |
|---|---|---|---|---|
| [TIO-BUG-001](issues/TIO-BUG-001.md) | P2 | Clients / Tickets / Global search | Client ticket summaries and global search expose internal stage instead of configured status | Backend Work/Reporting engineer with frontend Clients/Search owner |
| [TIO-BUG-002](issues/TIO-BUG-002.md) | P2 | Administration / Change history / Jira user mappings | Jira user-mapping audit displays a large negative TIO user identifier | Backend data/EF and audit owner with Jira integration engineer |
| [TIO-BUG-003](issues/TIO-BUG-003.md) | P3 | Shared tables / Tickets | Selectable ticket table reverses Details and selection column headers | Frontend shared-component/accessibility owner |
| [TIO-BUG-004](issues/TIO-BUG-004.md) | P2 | Notifications | Mobile notification badge and action overlap grouped alert title | Frontend Notifications/CSS owner |
| [TIO-BUG-005](issues/TIO-BUG-005.md) | P3 | Reporting Center / Export history | Masked completed exports lack an explanation and regeneration guidance | Reporting frontend UX owner with export/API metadata owner |
| [TIO-BUG-006](issues/TIO-BUG-006.md) | P2 | Reporting Center / Report library / Tickets report | Catalog Tickets report omits configured waiting, resolved and reopened status choices | Backend Reporting engineer with report-filter frontend owner |
| [TIO-BUG-007](issues/TIO-BUG-007.md) | P3 | Tickets / Overdue drilldown | Ticket-list type hint differs from the configured type shown in detail | Frontend Tickets/shared configuration-label owner |

All seven are **Open; no remediation implemented**. The full mandatory records follow and are also available individually in `issues/`. Safe regression fixtures and any required mutations must use an approved isolated environment.


## TIO-BUG-001

**Issue ID:** TIO-BUG-001

**Title:** Client ticket summaries and global search expose internal stage instead of configured status

**Module:** Clients / Tickets / Global search

**Page URL:** https://nb01994.vitronic.de/clients/1?tab=cases; https://nb01994.vitronic.de/cases; https://nb01994.vitronic.de/ (global Search dialog)

**Category:** Business Logic / Data / UX

**Severity:** P2

**Business Impact:** An operator sees different current statuses for the same ticket across routine navigation, which can confuse customer-waiting versus active-work decisions and weaken incident/queue review. No incorrect status write was demonstrated.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Desktop viewport 1920 × 1080.

**Preconditions:** Existing client TAH (client 1) and ticket CS-4003, CCC: RRM Integration (ticket 12203), visible to this account; the ticket retains an internal InProgress stage while its configured status is Waiting for customer. No test record or status change is required.

**Steps to Reproduce:**

1. Open /clients/1, choose Operational → Tickets, and locate CS-4003.
2. Open /cases, set Status to All, and search CS-4003; read its displayed Status.
3. Open global Search using the header search button or / shortcut, enter CS-4003, and read the result subtitle without activating a record action.
4. Compare the three displayed statuses for the unchanged ticket.

**Expected Result:** Every user-facing current-status summary uses the same configured ticket status and current display label. If an internal workflow stage is shown for a special purpose, it is explicitly labelled separately.

**Actual Result:** The client Tickets area shows In progress plus Waiting: Customer for CS-4003. The ticket register shows Waiting for customer. Global search shows the raw stage InProgress in the result subtitle. The same record links to /cases/12203. Owner labels also differ because the client summary uses the hub owner and the register may fall back to Jira assignee; that separate semantic difference is not claimed as an incorrect assignment here.

**Reproducibility:** Always for the unchanged sampled ticket under the recorded status/stage conditions; client/register comparison was repeated and global search was directly observed.

**Evidence:**

- [Client status repeated snapshot](./traces/107-client-ticket-status-reproduced.txt)
- [Client repeated screenshot](./screenshots/107-client-ticket-status-reproduced.png)
- [Ticket register comparison](./traces/108-register-ticket-status-comparison.txt)
- [Register comparison screenshot](./screenshots/108-register-ticket-status-comparison.png)
- [Global search result](./traces/098-global-search-settled.txt)
- [Source explanation](./traces/source-inventory.md)

**Likely Root Cause:** Local code corroborates different models: Modules/Reporting/OverviewEndpoints.cs:70 projects x.Status rather than x.StatusCode; pages/Clients.tsx:474 renders that stage. The register renders statusCode (pages/Cases.tsx:144). SearchExportEndpoints.cs:40–43 also projects/renders c.Status in search subtitles. These local code paths are confirmed by inspection; matching the deployed binary to this checkout was not verified.

**Recommended Fix:** Use the shared configured StatusCode projection/label source for client ticket summaries and search results, while retaining internal stages for workflow logic. Audit other user-facing ticket summaries for the same stage/status distinction; preserve scope and rights checks.

**Acceptance Criteria:**

1. For a customer-waiting ticket whose internal stage remains InProgress, client summary, register, detail and global search show the same configured status.
2. Renaming a configured status changes all those labels consistently; raw enum tokens such as InProgress are not presented as the current business status.
3. Any separately exposed internal stage is explicitly named and cannot be mistaken for configured status; record ownership and access remain unchanged.

**Regression Test:** In an approved isolated fixture, create tickets sharing an internal stage but carrying different configured statuses (including customer waiting and a custom/renamed status). Assert status labels across client summary API/UI, register, detail and global search. Existing read-only sampled records may support observation, but fixture creation/renaming must not run against production.

## TIO-BUG-002

**Issue ID:** TIO-BUG-002

**Title:** Jira user-mapping audit displays a large negative TIO user identifier

**Module:** Administration / Change history / Jira user mappings

**Page URL:** https://nb01994.vitronic.de/admin/audit

**Category:** Data / Functional

**Severity:** P2

**Business Impact:** The before/after audit value cannot be used as a trustworthy user association, impairing mapping traceability and investigation. Evidence does not establish a negative actual business-table foreign key, failed synchronization, lost user or access escalation.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Desktop viewport 1920 × 1080.

**Preconditions:** Existing audit rows include the 10 November 2026 13:45 update of Jira user mapping 552 for Ngirababo and the associated User creation entry. The account may view Change history. No mapping creation is performed.

**Steps to Reproduce:**

1. Open Administration → Change history (/admin/audit).
2. Keep Changes by people and inspect the existing recent rows; use the table Filter rows text Ngirababo to locate the sampled update.
3. Read Changes (before → after) for Jira user mapping 552 and compare the nearby User creation audit entry.
4. Revisit the same existing entry to confirm the displayed value persists.

**Expected Result:** A user-association audit records and displays the final real user identifier losslessly, or an explicit safely resolvable reference; it must not show a temporary identity sentinel as a completed association.

**Actual Result:** The existing mapping update displays Tio user id: — → -9223372036854775000. A nearby entry records creation of a named user/team member. The invalid-looking number is confirmed in the audit UI only; the raw stored audit string and current mapping foreign key were not inspected in a database.

**Reproducibility:** Always when viewing the existing sampled entry in the repeated read-only observations; the mapping/user creation trigger was not reproduced, so frequency for new mappings is unknown.

**Evidence:**

- [Initial Change history observation](./traces/054-admin-audit.txt)
- [Focused repeated audit evidence](./traces/113-audit-user-mapping-evidence.txt)
- [Focused screenshot](./screenshots/113-audit-user-mapping-evidence.png)
- [Source and precision analysis](./traces/audit-mapping-source-analysis.md)

**Likely Root Cause:** Hypothesis supported by local code: the existing mapping is assigned a new User navigation and saved once; modified scalar audit values are captured before the database save resolves generated IDs (HubDbContext.cs:1575–1593). A temporary EF identity may therefore be frozen in the audit snapshot. Subsequent native JSON number parsing can round very large 64-bit values. Neither exact production stored value nor that production creation path was reproduced; the local numerical demonstration only explains the displayed number shape.

**Recommended Fix:** Preserve original audit values intentionally, then resolve generated/fixed-up current identifier values after successful business save and before audit serialization, within the same transaction. Transport/render large identifiers losslessly. Investigate historical affected entries through an approved append-only correction process; do not silently rewrite audit history.

**Acceptance Criteria:**

1. An isolated mapping-to-new-user operation produces an audit target identifier equal to the final saved User ID, with no temporary negative value.
2. Large supported identifiers survive serialization/rendering without precision loss; original before-values and atomic audit/data persistence are preserved.
3. The existing sampled history has an approved traceable explanation/correction without an unauthorized rewrite of production audit records.

**Regression Test:** Use an approved isolated SQL fixture for mapping an existing unmapped Jira user to a newly created hub user/team member through the one-save path. Assert business FK and audit after-value equal the final User ID; cover contact creation, rollback/failure and preserved original values. Add lossless frontend ID rendering coverage if identifiers beyond the JS safe integer range remain supported. Do not reproduce by creating live users/mappings.

## TIO-BUG-003

**Issue ID:** TIO-BUG-003

**Title:** Selectable ticket table reverses Details and selection column headers

**Module:** Shared tables / Tickets

**Page URL:** https://nb01994.vitronic.de/cases

**Category:** Accessibility / UI

**Severity:** P3

**Business Impact:** The first two native table headers do not describe the controls in their corresponding cells. This creates misleading visual/assistive table-column associations. Individual controls retain explicit accessible labels, limiting the demonstrated impact.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Desktop viewport 1920 × 1080, selection and row details both enabled.

**Preconditions:** Ticket table has at least one row and both selection checkboxes and Details disclosures. The sampled search CS-4003 yields a simple single-row example. Phone layout disables selection, so that layout is outside the demonstrated mismatch.

**Steps to Reproduce:**

1. Open /cases at desktop width and search CS-4003 with Status All.
2. Inspect the first two table headers: Details, then Select all rows shown checkbox.
3. Inspect the corresponding first-row cells: row-selection checkbox, then Details disclosure.
4. Compare their DOM/semantic order; no checkbox or record action needs activation.

**Expected Result:** The leading header order matches the row-cell order: selection header over selection controls, Details header over details disclosures, with correct native table associations.

**Actual Result:** Headers are Details → selection, while body cells are selection → Details. The saved DOM geometry/structure records both orders for the same table.

**Reproducibility:** Always for the desktop selectable Tickets table when both hasDetails and canSelect are true; the sampled row was inspected repeatedly.

**Evidence:**

- [Repeated ticket table snapshot](./traces/109-ticket-table-header-alignment.txt)
- [Repeated table screenshot](./screenshots/109-ticket-table-header-alignment.png)
- [Header/cell structural capture](./traces/ticket-table-header-alignment.json)
- [Source corroboration](./traces/source-inventory.md)

**Likely Root Cause:** Confirmed in local JSX: ui/kit.tsx:679–681 emits Details TH before selection TH; :708–713 emits selection TD before Details TD. pages/Cases.tsx:126–128 supplies details, and selection defaults on outside phone layout (:531). The live captured DOM shows the same order; deployed source revision was not independently matched.

**Recommended Fix:** Render the selection TH before the Details TH to match the existing body order (or consistently change both). Preserve accessible labels, scope and responsive behavior.

**Acceptance Criteria:**

1. When selection and details are enabled, the first two TH and TD columns have matching selection/Details meaning.
2. Tables with either control absent remain aligned; mobile details-only behavior remains intact.
3. Select all, row selection, expansion and keyboard labels preserve their established behavior.

**Regression Test:** Render the shared table with isolated in-memory rows under desktop and phone breakpoints. Assert leading TH/TD semantic order for selection+details, each alone and neither. Expand/select only synthetic rows; no live record mutation is required.

## TIO-BUG-004

**Issue ID:** TIO-BUG-004

**Title:** Mobile notification badge and action overlap grouped alert title

**Module:** Notifications

**Page URL:** https://nb01994.vitronic.de/notifications

**Category:** UI / UX

**Severity:** P2

**Business Impact:** The first urgent grouped alert becomes difficult to scan on a representative phone viewport: its severity badge collides with the alert title and crowds its action. This reduces clarity during daily operational triage; no notification-state or delivery failure was demonstrated.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Mobile viewport 390 × 844; tablet comparison 768 × 1024. Existing All view with the 4 overdue payments group.

**Preconditions:** Existing grouped notifications contain the first Critical / overdue card titled 4 overdue payments and action View payments (4). Keep existing read state; do not click notification actions or Mark all as read.

**Steps to Reproduce:**

1. Open /notifications at 390 × 844 with All selected.
2. View the first Critical / overdue grouped card, titled 4 overdue payments.
3. Inspect the title, outlined Overdue badge and View payments (4) action.
4. Repeat the same mobile view, then compare the 768 × 1024 capture without activating notice actions.

**Expected Result:** At mobile width, title, badge and action occupy non-overlapping readable areas; the action may wrap or stack below the text.

**Actual Result:** The Overdue badge overlays the first title line; the action occupies the same cramped horizontal band. The repeated mobile screenshot reproduces the collision, while the tablet sample has separate title/badge/action areas. Measured rectangles place title at x86–213.05/y611.41–654.76 and badge at x133.91–204.58/y613.41–636.14, confirming intersection.

**Reproducibility:** Always in the repeated sampled 390 × 844 grouped-card condition; wider/tablet comparison did not show the same collision. This does not claim every notification text/viewport fails.

**Evidence:**

- [Initial mobile snapshot](./traces/102-notifications-mobile-overlap.txt)
- [Initial mobile screenshot](./screenshots/102-notifications-mobile-overlap.png)
- [Repeated mobile snapshot](./traces/104-notifications-mobile-reproduced.txt)
- [Repeated mobile screenshot](./screenshots/104-notifications-mobile-reproduced.png)
- [Tablet comparison](./screenshots/103-notifications-tablet-comparison.png)
- [Measured element geometry](./traces/notification-mobile-geometry.json)
- [Screenshot/CSS review](./traces/visual-review-observations.md)

**Likely Root Cause:** Source-supported hypothesis: Notifications.css page-specific .ntf-page .ntf-side max-width:40% overrides the less-specific phone max-width:none rule. Phone layout changes this non-shrinking side area to width100% with non-wrapping badge/action content, which can overflow its constrained width toward the text. Saved live geometry confirms the 40% maximum and collision; the deployed stylesheet revision was not independently matched to the checkout.

**Recommended Fix:** At the phone breakpoint give page-specific badge/actions an explicit full-width flex basis or independent grid row and remove the inherited maximum; allow action content to wrap when required. Verify individual/grouped cards and the bell popover independently.

**Acceptance Criteria:**

1. At 390 × 844, the sampled group title, badge and action have no intersecting rectangles and remain independently readable.
2. Long titles and action labels, grouped/individual alerts and expanded groups fit at mobile/tablet widths without hidden actions or document-wide overflow.
3. Existing keyboard labels, focus and notification read/delete/navigation behavior remain unchanged.

**Regression Test:** Use isolated/synthetic notification fixtures with grouped overdue payments, long titles and long actions. Capture 390 × 844 and 768 × 1024 and assert nonintersection of title/badge/action; keyboard-check the visible actions. Do not mark live notices read, delete them or send notifications merely to test layout.

## TIO-BUG-005

**Issue ID:** TIO-BUG-005

**Title:** Masked completed exports lack an explanation and regeneration guidance

**Module:** Reporting Center / Export history

**Page URL:** https://nb01994.vitronic.de/reporting-center/history

**Category:** UX / Functional

**Severity:** P3

**Business Impact:** A user sees a historical Completed export with a future retention date but cannot understand why metadata/download is unavailable or how to recover. This invites unnecessary reporting/storage support investigation. Evidence does not establish failed generation, missing storage, a retention failure or a security bypass.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Existing own-export history and Export details dialog, desktop view.

**Preconditions:** The inspected account has six existing history entries with masked details; five are labelled Completed and retained until 19 November. Sample report-builder PDF requested/completed 5 November 2026 15:19, audit reference fe9858c3-c9fa-470d-9535-55e1011c46b8. No new export is generated or downloaded.

**Steps to Reproduce:**

1. Open Reporting Center → Export history with Generated by Me.
2. Inspect an existing Completed entry displaying Details unavailable, missing row/file metadata and a future retention date.
3. Open its Details dialog (the sample PDF requested 5 November 15:19).
4. Read status, retention, Filters, Columns and available actions without downloading or retrying generation.

**Expected Result:** Keep restricted metadata/download masked, but provide a safe reason or availability category and explicit guidance to generate a new report under current access. Unknown/hidden column metadata must not be presented as a known standard selection.

**Actual Result:** History shows Details unavailable, Completed and future expiry with no Download. The detail dialog repeats Rows —, File — and Filters Details unavailable, offers only Close, and labels Columns All, standard order. It supplies no explanation that current access/legacy metadata may require regeneration and no recovery navigation.

**Reproducibility:** Always on repeated viewing of the existing sampled masked entries; the original generation and masking trigger were not reproduced. It is not asserted for every completed export.

**Evidence:**

- [History observation](./traces/064-export-history.txt)
- [Export details observation](./traces/066-export-details.txt)
- [Export details screenshot](./screenshots/066-export-details.png)
- [Masking/source analysis](./traces/exports-source-review.md)

**Likely Root Cause:** Intentional local access-fingerprint policy explains masking: BuilderEndpoints.cs:34–54 returns Details unavailable and canDownload=false when current access cannot see job details. Reports.tsx renders this without a safe masking reason/recovery message and defaults null columns to All, standard order. Why the specific live saved/current fingerprints differ was not established. The defect is UX explanation/recovery, not the masking policy.

**Recommended Fix:** Retain fail-closed masking. Return a safe metadata-availability category and render explanatory regeneration guidance plus navigation to an authorized report configuration; generation requires an explicit user action. Display hidden columns as Unavailable. Keep Completed as historical generation status and distinguish retention date from current accessibility.

**Acceptance Criteria:**

1. An accessible retained export remains downloadable to its authorized owner.
2. An access-changed/legacy/other-owner masked entry keeps sensitive metadata hidden, explains unavailability safely and provides permitted recovery guidance.
3. Hidden columns read Unavailable rather than All, standard order; no hidden filters/rows/file names leak.
4. Recovery navigation does not automatically queue an export or notification.

**Regression Test:** In an approved isolated fixture, generate one export for an authorized owner, then test unchanged access, changed access, another viewer and a legacy null fingerprint. Assert masking and guidance together; retain existing ownership/fingerprint denial tests. Live audit must not change roles or generate/download files to manufacture the condition.

## TIO-BUG-006

**Issue ID:** TIO-BUG-006

**Title:** Catalog Tickets report omits configured waiting, resolved and reopened status choices

**Module:** Reporting Center / Report library / Tickets report

**Page URL:** https://nb01994.vitronic.de/reporting-center/library?report=cases

**Category:** Functional / Business Logic

**Severity:** P2

**Business Impact:** Managers cannot directly select active configured waiting/resolved/reopened status buckets in the catalog report flow. Internal-stage labels and duplicate Open options make the filter ambiguous. A particular wrong preview/export count, or failure of the separate Report Builder, was not proved.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Existing active ticket-status configuration, report Configure and preview views. Desktop browser view; no export/schedule/preset created.

**Preconditions:** Administration → Configuration → Ticket statuses has active Waiting for customer, Resolved and Re-opened values. The account can view/run the catalog Tickets report. Configuration is inspected only; no status is renamed or added.

**Steps to Reproduce:**

1. Read the active status labels at /admin/config/case-statuses.
2. Open Reporting Center → Report library → Tickets → Configure, or /reporting-center/library?report=cases.
3. Open Status and compare its choices with the configured list and ticket register.
4. The captured follow-up selected Pending validation and applied/refreshed the read preview; inspect the resulting applied filter and row state without generating a file.

**Expected Result:** Catalog status choices include the permitted configured ticket statuses with their current labels, and filter by configured status code consistently with the ticket register. Aggregate Open/All/Closed choices are distinguishable from configured labels.

**Actual Result:** Configure offers Any, Open, All, Closed or Closed (cancelled), New, another Open, In progress, Pending validation, Closed and Closed (cancelled). Active Waiting for customer, Resolved and Re-opened choices are absent. The Pending validation preview returns 0 matching rows. Zero is recorded as an observation only: it is not claimed that it should equal the 15 configured Resolved records, because internal stage and configured behavior differ.

**Reproducibility:** Always when opening the catalog Tickets report with the captured active configuration; choices were observed in Configure and the subsequent preview/filter views.

**Evidence:**

- [Configured active statuses](./traces/084-case-statuses.txt)
- [Configure dialog](./traces/114-report-configure-dialog.txt)
- [Configure screenshot](./screenshots/114-report-configure-dialog.png)
- [Catalog preview choices](./traces/115-tickets-catalog-preview.txt)
- [Pending-validation preview](./traces/116-catalog-pending-validation-filter.txt)
- [Follow-up screenshot](./screenshots/116-catalog-pending-validation-filter.png)
- [Source analysis and limitations](./traces/catalog-status-source-analysis.md)

**Likely Root Cause:** Confirmed local path: ReportCatalog.cs:153–170 builds Status options from open/all/done plus the internal CaseStatus enum; ReportingEndpoints returns those static options and ExportService validates against them. Configured StatusCode is a distinct model. Cases.tsx and the separate builder already obtain configured choices. Local source corroborates the missing-choice failure; deployed binary equivalence and particular result-set differences were not proved.

**Recommended Fix:** Use the same configured status registry/labels as the ticket register and builder, passing selections through code:<StatusCode> or an explicit equivalent. Update shared validation/filter summaries/preset/schedule compatibility. Keep legacy stage aliases safe and clearly stage-labelled; do not substitute them for current configured choices.

**Acceptance Criteria:**

1. Every permitted active configured status selectable in the register is available in the catalog, including waiting/resolved/reopened/custom values.
2. At equal scope/time/other filters, a selected configured code yields the same row identities as the register; shared internal stages do not merge distinct configured buckets.
3. Aggregate and configured Open choices have distinct names; configuration label changes propagate.
4. Preview/export/preset/schedule validation preserves configured codes; historical/retired status handling follows the existing policy, without silent unfiltered fallback.

**Regression Test:** In an approved isolated fixture, use two tickets sharing an internal stage with different configured codes, plus a custom active status. Compare catalog metadata/UI choices, preview row identities, export rows, preset round-trip and schedule validation. Choice-parity can be checked read-only against existing approved data; result/export/schedule fixtures require explicit isolated authorization.

## TIO-BUG-007

**Issue ID:** TIO-BUG-007

**Title:** Ticket-list type hint differs from the configured type shown in detail

**Module:** Tickets / Overdue drilldown

**Page URL:** https://nb01994.vitronic.de/cases?due=overdue; https://nb01994.vitronic.de/cases/10795

**Category:** UX / UI

**Severity:** P3

**Business Impact:** An operator inspecting an overdue ticket receives an Incident type hint in the list but sees Bug on the same ticket detail, creating avoidable terminology ambiguity. The demonstrated mismatch is the tooltip/title/accessibility-snapshot hint, not a visible type column or a stored type change.

**Environment:** 10 November 2026, Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser ID 2, exact engine/build not recorded; existing TIO Manager account lmh; desktop 1920×1080 captures.

**Preconditions:** Existing overdue ticket CS-2595 (/cases/10795) is visible. The current configuration includes a ticket type labelled Bug whose built-in behavior is Incident. No ticket/type configuration is changed.

**Steps to Reproduce:**

1. From the Executive dashboard, follow the 73 overdue-ticket link to /cases?due=overdue.
2. Locate CS-2595 and inspect the ticket-entry title/type hint in the rendered list/DOM snapshot.
3. Open that ticket at /cases/10795 and read the type next to Client-related.
4. Compare with the read-only Bug entry under Administration → Configuration → Ticket types.

**Expected Result:** The list type hint and record-detail type use the same current configured display label. If built-in behavior is exposed, it is explicitly labelled Behavior rather than presented ambiguously as the ticket type.

**Actual Result:** The list entry containing the CS-2595 link has an Incident title/generic hint, while the detail displays Bug · Client-related. Configuration shows Bug with Incident behavior. The exact deployed raw stored code was not independently read from an API/DB; no actual type mutation or Jira import error was demonstrated.

**Reproducibility:** Once observed for the existing unchanged ticket in the saved overdue-list/detail journey; local source corroborates the presentation mismatch. A configuration rename/type-change creation scenario was not executed.

**Evidence:**

- [Overdue-list title/type hint](./traces/119-journey-overdue-drilldown.txt)
- [Overdue-list screenshot](./screenshots/119-journey-overdue-drilldown.png)
- [Same-ticket detail](./traces/120-journey-ticket-detail.txt)
- [Detail screenshot](./screenshots/120-journey-ticket-detail.png)
- [Configured ticket types](./traces/084-case-types.txt)
- [Source distinction and limitations](./traces/ticket-type-tooltip-source-analysis.md)

**Likely Root Cause:** Local source confirms inconsistent label resolvers: pages/ticket/TicketTable.tsx:47 uses label(r.type) in the title span, while Cases.tsx:265 uses T.name('CaseType',c.type). The optional Type column also uses the generic helper at TicketTable.tsx:62, a source-only extension of the risk. Both API projections use c.Type and keep TypeCategory separate. This supports a raw-token/configured-label presentation hypothesis; the precise deployed code and raw value were not independently verified. No type icon exists in that specific title-span expression.

**Recommended Fix:** Resolve list type hints through the shared configured CaseType name helper, consistently with detail. Apply the same helper to the optional Type column when present; label built-in behavior separately if needed. Preserve stored codes, categories, rights and Jira mapping behavior.

**Acceptance Criteria:**

1. For CS-2595-equivalent isolated data, list title/type hint and detail show Bug consistently.
2. Renamed/custom/retired configured types follow the same established label-resolution policy across hint and optional Type column.
3. Any displayed category is explicitly labelled as behavior; no record type/category value is mutated by the rendering correction.

**Regression Test:** Use approved isolated or in-memory fixtures where the type code differs from its configured label (for example a code humanized as Incident labelled Bug). Assert the list title attribute and detail text resolve the configured label; cover a rename and historical/retired type policy. Do not rename live configuration or trigger Jira imports for this regression.
