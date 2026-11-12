# End-to-end user journey results

**Assessment:** 10 November 2026, Asia/Dubai. **Application:** `https://nb01994.vitronic.de/`, live version **2.59.0**. **Role:** existing TIO Manager session. Tests used representative existing records and safe read interactions; no business forms were submitted, export generated, notification acknowledged or integration action triggered.

The daily review below is a recorded continuous read journey. Other journeys assemble **linked read checks performed across the audit**; they are not presented as a single uninterrupted click sequence. The evidence index supplies actual URLs and capture timestamps. A screenshot showing a link does not establish that the link was clicked. [Evidence provenance](traces/evidence-index.json).

**Status definitions:** Pass means the explicit limited expected result was observed; Fail means a confirmed discrepancy; Partial means some relevant behavior was observed but an expected state or complete workflow was not established; Blocked means a prerequisite/authorization boundary prevented execution. These statuses do not supply whole-audit scenario totals; use the final coverage matrix for its reconciled counts.

## Journey 1 — Continuous daily operations review

**Scope:** existing session → dashboard → actual overdue KPI link → overdue ticket → reload → browser Back to list → browser Back to dashboard. Recorded around **22:04–22:06 Asia/Dubai**, including a repeated drilldown/back path to capture settled return states after the initial snapshots were still loading. No assignment, state transition or other record action was submitted.

| Step | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|
| 1. Open Operations Command Center in the existing session | Dashboard renders actionable current work. | Dashboard rendered; the KPI linked 73 past-due tickets out of 183 open tickets. This is a displayed count check, not a complete KPI recalculation. | Pass for read view | [118 — dashboard](traces/118-journey-dashboard.txt) |
| 2. Click the actual overdue KPI | The linked list opens with the overdue filter and a compatible total. | `/cases?due=overdue` opened with Deadline: Overdue and 73 matching rows. | Pass | [119 — overdue drilldown](traces/119-journey-overdue-drilldown.txt) |
| 3. Follow the existing CS-2595 link | The selected ticket opens with the same identity and operational details. | `/cases/10795` displayed CS-2595, R3 Backoffice Slowess issue, its Jira-controlled status, deadline and read details. | Pass | [120 — ticket detail](traces/120-journey-ticket-detail.txt) |
| 4. Reload the ticket detail | The same deep link resolves and the selected ticket remains readable. | Reload displayed the same ticket ID/reference and detail content. This does not test persistence of a change, because no record was changed. | Pass | [121 — refresh](traces/121-journey-ticket-refresh.txt) |
| 5. Browser Back to the overdue list | Return to the overdue URL and restore a usable settled list. | Initial immediate capture showed Loading. The repeated drilldown/back path produced a settled `/cases?due=overdue` list with the overdue filter and 73 matching rows. | Pass with settled follow-up | [122 — initial transition](traces/122-journey-return-overdue-list.txt), [122b — settled Back result](traces/122b-journey-overdue-back-settled.txt) |
| 6. Browser Back to the dashboard | Return to the dashboard and restore usable current widgets. | Initial capture was Refreshing/Loading. Settled follow-up and repeated Back result displayed the dashboard with 73 past due of 183 open. | Pass with settled follow-up | [123 — initial transition](traces/123-journey-return-dashboard.txt), [123b — settled dashboard](traces/123b-journey-dashboard-settled.txt), [123c — settled Back result](traces/123c-journey-dashboard-back-settled.txt) |

**Overall: Pass for this bounded continuous read journey.** Dashboard → overdue-list → ticket → reload and settled Back navigation succeeded. Initial transition captures were retained and supplemented with actual settled follow-up evidence; their temporary Loading states are not reported as defects. Fresh login was not part of the executed journey and remains blocked separately. This navigation result does not resolve the independently recorded ticket presentation defects or establish mutation, SLA-math or all-record correctness.

Initial afternoon and later evening snapshots have different status cohorts while the recorded open/overdue totals remain 183/73. The system continued operating during the audit; changes in those historical cohorts are not automatically defects. No simultaneous frozen-data comparison was established.

## Journey 2 — Technology implementation and commercial review

These are linked read checks across the audit, **not a claimed continuous click sequence**.

| Check | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|
| Review projects register | Identify projects and associated contract/status information. | Project register displayed existing projects and links. | Pass for register read | [030 — projects](traces/030-projects.txt) |
| Inspect a representative project | Show identity, ownership, service dates, scope, products/environments and contracts. | Project 117992-AE displayed its owner and contracts; service dates/scope were Unknown and no environments were linked. Missing recorded values limit readiness evidence, not proof of a failed form. | Partial for implementation assessment | [048 — project detail](traces/048-project-detail.txt) |
| Review recorded project status and signals | Make known/unknown status and delivery risks explicit. | Project dashboard rendered Not recorded and rule-based signals; delivery was Unknown because no dated milestone was recorded on an Active contract. | Pass for honest display; Partial for readiness evidence | [012 — project dashboard](traces/012-project-settled.txt) |
| Review obligations and support terms | Expose contract dates, targets, support interpretation and commercial obligations. | Representative contract detail and client contract register rendered recorded terms. Contract-specific SLA/calendar correctness was not independently recalculated. | Partial | [049 — contract](traces/049-contract-detail.txt), [046 — client contracts](traces/046-client-contracts.txt) |
| Review technical estate supporting implementation | Expose relevant environments, condition and ownership. | Client Technical view and a representative environment displayed estate/ownership and manually reported condition. No live availability or deployment-readiness test occurred. | Pass for read view | [044 — client Technical](traces/044-client-technical.txt), [070 — environment](traces/070-environment-detail.txt) |
| Create/update milestones, dependencies, acceptance or go-live status | Persist approved implementation decisions with history. | No approved disposable implementation record or mutation authorization. | Blocked | [Limitations](11-test-blockers-and-limitations.md) |
| Demonstrate go-live approval, rollback and operations handover | Trace an approved complete implementation into operations. | No complete sample with these decisions was executed. Handover/commitment views were inspected separately; their existence does not establish this lifecycle. | Partial / unexecuted lifecycle | [036 — handovers](traces/036-handovers.txt), [process gaps](06-business-process-gaps.md) |

**Overall: Partial.** Useful project/contract/estate review is demonstrated. Complete implementation readiness, acceptance, rollback and handover remain unproven.

## Journey 3 — Ticket / incident lifecycle

Incident-like work uses the configurable ticket model. The observed type labels were Task, Improvement, Bug, Epic and Deployment; Bug has Incident behavior in configuration, and the sampled list hint exposes the raw Incident token rather than the configured Bug label. The inspected existing sample CS-4003 is an Epic imported from Jira; **its inspection is not an executed incident lifecycle**. The checks below combine representative ticket/form/tab evidence across the audit.

| Check | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|
| Find existing work using the ticket register | Search, filter, sort and page the recorded work. | Exact/partial/empty searches, overdue filtering, pagination and both sort directions have individual saved results. They are selected checks, not every filter combination. | Pass for recorded interactions | [018 — overdue](traces/018-ticket-overdue-filter.txt), [019 — exact](traces/019-ticket-exact-search.txt), [020 — partial](traces/020-ticket-partial-search.txt), [021 — empty](traces/021-ticket-empty-search.txt), [022 — page](traces/022-ticket-pagination.txt), [023](traces/023-ticket-sort-ascending.txt), [024](traces/024-ticket-sort-descending.txt) |
| Read selected ticket identity, status, responsibility, next action and SLA | Explain operational state and Jira control boundaries. | CS-4003 detail rendered Waiting for customer, Jira/customer-assignee context, internal owner Unassigned, next action and response/resolution/deadline information. Different owner concepts were not asserted equal. | Pass for detail read; SLA math unverified | [067 — ticket](traces/067-ticket-detail.txt) |
| Reconcile status across operational views | The same configured status should be used for the same sampled ticket. | Register/detail displayed Waiting for customer while client Operational tickets/global search exposed the underlying progress stage. This is a confirmed cross-view status finding. | Fail | [107 — client status](traces/107-client-ticket-status-reproduced.txt), [108 — register comparison](traces/108-register-ticket-status-comparison.txt), [098 — search](traces/098-global-search-settled.txt), [defect records](04-detailed-bug-report.md) |
| Reconcile ticket-type wording for CS-2595 | List type hint and detail should use the same configured display label. | List hint displayed the raw type token Incident, while the same ticket detail displayed configured label Bug. The reviewed list code humanizes `r.type`; it does not read the separate behavior/category field. This is a display inconsistency, not evidence that its saved type was changed. | Fail | [119 — register hint](traces/119-journey-overdue-drilldown.txt), [120 — detail](traces/120-journey-ticket-detail.txt), [source analysis](traces/ticket-type-tooltip-source-analysis.md) |
| Inspect eight ticket tabs | Each opened tab should select and expose its corresponding content/empty state. | Activity plus seven non-default tabs were inspected; details are in the tab table below. This does not exercise actions inside the tabs. | Pass for tab selection/read scope | [Tab evidence below](#ticket-tab-read-checks) |
| Inspect the new-ticket surface | Show required operational inputs and ticket types. | Form presentation was inspected without submission. | Partial | [087 — new ticket](traces/087-new-ticket.txt) |
| Create, assign, classify priority and record first response | Save an approved test incident and verify persistence/audit. | No approved disposable incident/account. No existing ticket was modified. | Blocked | [Mutation boundaries](11-test-blockers-and-limitations.md) |
| Transition, escalate, resolve, close and reopen | Enforce lifecycle rules, SLA effects, permissions and audit trace. | Actions were not executed. Existing SLA/history display cannot validate transition behavior. | Blocked | [067 — action presentation](traces/067-ticket-detail.txt), [limitations](11-test-blockers-and-limitations.md) |
| Trigger notifications/synchronization and verify lifecycle history | Confirm real approved recipient/integration outcomes. | No notification or Jira control triggered. Existing activity/reference history was read only. | Blocked | [059 — monitoring](traces/059-jira-monitor.txt), [105 — references](traces/105-ticket-tab-jira-references-.txt) |

**Overall: Partial with confirmed read-view defects; write lifecycle Blocked.** No create-to-close/reopen incident journey passed.

### Ticket tab read checks

Representative record: `/cases/12203` (CS-4003). Default Activity was visible in the detail capture; each of the seven other tabs has its own selected-tab snapshot.

| Tab | Actual read result | Status within tab-only scope | Evidence |
|---|---|---|---|
| Activity (default) | Activity/comments controls and existing activity rendered. No comment or workflow action submitted. | Pass | [067](traces/067-ticket-detail.txt) |
| Affected records | Selected; explicit zero-record message. | Pass for empty state | [105](traces/105-ticket-tab-affected-records-.txt) |
| Jira references | Selected; one imported source reference with synchronization context. External issue link was not an integration test. | Pass | [105](traces/105-ticket-tab-jira-references-.txt) |
| Documented impact | Selected; impact explanation and documented relationship counts rendered. It explicitly describes inferred/documented impact, not outage detection. | Pass | [105](traces/105-ticket-tab-documented-impact.txt) |
| Commitments | Selected; zero linked commitments with explanatory empty state. No commitment created. | Pass for empty state | [105](traces/105-ticket-tab-commitments-.txt) |
| Escalations | Selected; escalation area and read filters rendered. No escalation submitted. | Pass for tab rendering | [105](traces/105-ticket-tab-escalations.txt) |
| Attachments | Selected; no files attached. Upload/download/delete unexecuted. | Pass for empty state | [105](traces/105-ticket-tab-attachments.txt) |
| Field history | Selected; existing before/after history and field/person/value search rendered. Historical completeness and every row were not independently reconciled. | Pass for display | [105](traces/105-ticket-tab-field-history.txt) |

## Journey 4 — Management reporting

This combines actual report-library/configuration/preview checks across the audit. **It is not a completed generate/export/schedule journey.** Fourteen catalog reports were actually previewed; the separate Report Builder and template previews were additional read checks.

| Check | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|
| Open Reporting Center and library | Discover usable report categories and definitions. | Overview and categorized library rendered. | Pass for discovery | [028 — center](traces/028-reporting-center.txt), [060 — library](traces/060-report-library.txt) |
| Inspect Tickets catalog Configure | Select current configured ticket statuses. | Dropdown omitted configured Waiting for customer, Resolved and Re-opened while exposing legacy stages; confirmed TIO-BUG-006. | Fail | [114 — Configure](traces/114-report-configure-dialog.txt), [116 — applied stage filter](traces/116-catalog-pending-validation-filter.txt), [analysis](traces/catalog-status-source-analysis.md) |
| Apply catalog preview for Tickets and thirteen further definitions | Produce a populated preview and matching-count display. | All fourteen have populated preview evidence, listed below. Pass is for preview computation/rendering; row/KPI correctness was not fully reconciled. | Pass for fourteen sampled previews | [115](traces/115-tickets-catalog-preview.txt), [117 series below](#actual-catalog-preview-results) |
| Apply Pending validation to Tickets catalog preview | Apply the selected legacy stage filter and display its result. | Selected Pending validation was retained and returned zero. This does not imply it should equal the configured Resolved cohort. | Pass for applied-filter/empty-result behavior; status-choice defect remains | [116](traces/116-catalog-pending-validation-filter.txt) |
| Inspect Report Builder and template | Preview existing authorized tickets with chosen columns/filter/template. | Builder preview showed 1,949 matching tickets; critical/high template showed 23 matching tickets. These differ from the default catalog's open-ticket scope. | Pass for sampled read previews | [061 — builder](traces/061-ticket-report-builder.txt), [075 — mobile builder](traces/075-builder-mobile.txt), [076 — template](traces/076-report-template-critical-high.txt) |
| Inspect saved reports, schedules and existing history | Explain saved/recurring outputs and recorded export outcomes. | Saved reports/schedules were empty for this account; existing export history/details rendered, including unavailable metadata. Empty lists do not prove absent capability. | Partial | [062](traces/062-my-reports.txt), [063](traces/063-scheduled-reports.txt), [064](traces/064-export-history.txt), [066](traces/066-export-details.txt) |
| Generate/download an export and compare its contents | Produce an approved file, verify permissions and reconcile rows against preview. | Not executed; persistent export/audit/file effects were outside approved test-data scope. Existing Completed entries are not a new export test. | Blocked | [Export interpretation](traces/exports-source-review.md), [limitations](11-test-blockers-and-limitations.md) |
| Save/preset/schedule and verify recipient result | Preserve configuration and run a report under recipient rights. | No saved definition, preset, favorite or schedule changed; no scheduled run/notification triggered. | Blocked | [Limitations](11-test-blockers-and-limitations.md) |

**Overall: Partial.** Broad actual preview coverage was achieved; the catalog status-choice defect affects report selection. Export consistency, scheduling and recipient delivery remain unexecuted.

### Actual catalog preview results

Counts below are **displayed matching rows at the recorded preview time**, not independently recomputed totals. Large previews show only the first page. The export-options text/button visible afterwards does not mean a file was generated.

| Catalog report / key | Displayed matching rows | Expected / actual result | Status | Evidence |
|---|---:|---|---|---|
| Tickets / `cases` | 183 | Preview should render authorized matching rows; populated first page and count rendered. | Pass for preview | [115](traces/115-tickets-catalog-preview.txt) |
| Commitments / `commitments` | 6 | Populated preview and count rendered. | Pass for preview | [117-01](traces/117-catalog-preview-01.txt) |
| Action list / `actions` | 780 | Populated first page and count rendered; action reasons/rows are not assumed equivalent to distinct-record dashboard counts. | Pass for preview | [117-02](traces/117-catalog-preview-02.txt) |
| Environments / `environments` | 9 | Populated preview and count rendered. | Pass for preview | [117-03](traces/117-catalog-preview-03.txt) |
| Version matrix / `versions` | 8 | Populated preview and count rendered. | Pass for preview | [117-04](traces/117-catalog-preview-04.txt) |
| Assets inventory / `assets` | 153 | Populated first page and count rendered. | Pass for preview | [117-05](traces/117-catalog-preview-05.txt) |
| Data quality / `data-quality` | 263 | Populated first page and count rendered. | Pass for preview | [117-06](traces/117-catalog-preview-06.txt) |
| Contracts / `contracts` | 9 | Populated preview and count rendered. | Pass for preview | [117-07](traces/117-catalog-preview-07.txt) |
| SLA compliance / `sla-compliance` | 677 | Populated first page and count rendered; contractual calculation not fully recalculated. | Pass for preview | [117-08](traces/117-catalog-preview-08.txt) |
| Commitment performance / `commitment-performance` | 8 | Populated preview and count rendered. | Pass for preview | [117-09](traces/117-catalog-preview-09.txt) |
| Ticket aging & backlog / `case-aging` | 183 | Populated first page and count rendered. | Pass for preview | [117-10](traces/117-catalog-preview-10.txt) |
| Team KPI / `team-kpis` | 36 | Populated first page and count rendered; KPI arithmetic not comprehensively reconciled. | Pass for preview | [117-11](traces/117-catalog-preview-11.txt) |
| Team workload / `team-workload` | 21 | Populated preview and count rendered. | Pass for preview | [117-12](traces/117-catalog-preview-12.txt) |
| Client health / `client-health` | 20 | Populated preview and count rendered. | Pass for preview | [117-13](traces/117-catalog-preview-13.txt) |

## Journey 5 — User and access review

These are independent read checks in the existing manager session plus separately executed anonymous HTTP samples. They are **not a multi-role access certification**.

| Check | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|
| Inspect administrator user/role/right/access surfaces | Approved manager can inspect available access administration. | Existing Users, Roles, Rights and Access review screens were accessible. No grants/roles/users were changed. | Pass for this account's visibility | [029 — administration](traces/029-administration.txt), [050 — roles](traces/050-admin-roles.txt), [051 — rights](traces/051-admin-rights.txt), [052 — access review](traces/052-admin-access-review.txt) |
| Inspect audit history | Show trustworthy identifiers and before/after values. | Existing user-mapping entries displayed an invalid-looking negative temporary TIO user identifier; confirmed audit/governance defect. Actual mapping foreign keys were not queried. | Fail | [111](traces/111-audit-invalid-user-identifiers-settled.txt), [112](traces/112-audit-negative-identifiers-filtered.txt), [113](traces/113-audit-user-mapping-evidence.txt) |
| Inspect public sign-in/password surface | Show inputs/policy without altering the current working account. | Sign-in and password pages were inspected without credential submission or password change. | Partial | [094 — sign-in](traces/094-login-with-existing-session.txt), [093 — password](traces/093-password-form.txt) |
| Anonymous GET protected user/client resources | Unsigned requests must not disclose those payloads. | `/api/v1/me` and `/api/v1/clients` returned 401 with empty bodies in the two samples. | Pass for these endpoints only | [Native HTTP results](traces/anonymous-http-observations.md) |
| Test alternate roles and scoped forbidden records | Permitted views/actions work and unauthorized direct routes/API requests fail. | No second approved role/account or scoped dataset supplied. | Blocked | [Security boundaries](07-security-observations.md) |
| Test revocation, logout, expiry and password invalidation | Sessions and cached access react correctly to lifecycle changes. | Not executed; the existing working session was preserved. | Blocked | [Limitations](11-test-blockers-and-limitations.md) |

**Overall: Partial with an audit-display defect; multi-role/session lifecycle coverage Blocked.**

## Supplementary client and environment read coverage

### Client areas

Representative client `/clients/1` (TAH) was inspected across all five areas. This does not mean every subtab, graph action, linked record or client was tested.

| Area | Expected / actual read result | Status | Evidence |
|---|---|---|---|
| Overview | Client identity, summary and operational review entry points rendered. | Pass for display | [043](traces/043-client-detail.txt) |
| Operational | Tickets and related operational navigation rendered; sampled ticket status inconsistency was reproduced separately. | Partial; confirmed status defect | [044](traces/044-client-operational.txt), [107](traces/107-client-ticket-status-reproduced.txt) |
| Technical | Estate/environment read content rendered. No environment/provisioning/configuration changed. | Pass for display | [044](traces/044-client-technical.txt) |
| Commercial | Organizations settled to one organization/no relationships; Contracts & SLAs and Projects were separately opened and rendered. | Pass for sampled area/subtabs | [045](traces/045-client-commercial-settled.txt), [046](traces/046-client-contracts.txt), [047](traces/047-client-projects.txt) |
| Records | Attachments selected and explicit empty state rendered. My notes/History selection and file operations were not established by this area capture. | Partial area; attachment empty-state pass | [044](traces/044-client-records.txt) |

### Environment tab read checks

Representative environment `/environments/3` (Production, TAH R2). Default Applications was visible; each of seven non-default tabs was selected and captured. No condition, asset, firewall, attachment or history mutation was submitted.

| Tab | Expected / actual result | Status within tab-only scope | Evidence |
|---|---|---|---|
| Applications (default) | Installation/component content rendered, including an Unknown version. Display does not verify actual deployed software. | Pass for display | [070](traces/070-environment-detail.txt) |
| Servers & assets | Selected; recorded server/asset rows and specifications rendered. | Pass for display | [106](traces/106-env-tab-servers-assets-.txt) |
| Work | Selected; explicit empty open-ticket and commitment lists plus responsibility area rendered. | Pass for empty/read state | [106](traces/106-env-tab-work.txt) |
| Firewall rules | Selected; initial capture was Loading, then a settled follow-up displayed table headers and No records entered for this environment. No rule created. | Pass for settled empty state | [106 — transition](traces/106-env-tab-firewall-rules-.txt), [106b — settled](traces/106b-env-firewall-settled.txt) |
| Condition history | Selected; existing condition report row rendered. No new report created. | Pass for display | [106](traces/106-env-tab-condition-history.txt) |
| Attachments | Selected; no files attached. File operations unexecuted. | Pass for empty state | [106](traces/106-env-tab-attachments.txt) |
| Data quality | Selected; existing findings rendered. No coordination/re-evaluation action submitted. | Pass for display | [106](traces/106-env-tab-data-quality.txt) |
| History | Selected; Change history content rendered. Complete historical accuracy was not independently reconciled. | Pass for display | [106](traces/106-env-tab-history.txt) |

## Automation and release interpretation

The reusable Playwright scaffold defines **298 prepared cases in four files**, including four statically skipped Notes cases and a skipped export-UX proposal. **None of these application test definitions ran against the live target.** Its local JavaScript syntax checks, **8 pure policy tests** and test discovery passed. These local results must not be counted as additional successful live journeys. [Automation validation](traces/automation-validation.md), [usage and restrictions](test-automation/README.md).

Actual live browser checks and fourteen catalog previews are separate from that unexecuted scaffold. A report preview may use a safe POST read in the application; the prepared harness conservatively blocks POST and therefore cannot reproduce those previews without an approved change in execution strategy. No source-only test or earlier repository result is presented as fresh deployed validation.

Read workflows demonstrate useful daily investigation, technical/commercial review and broad reporting previews. Confirmed view/report/audit defects require correction, while full record lifecycles, generated-file consistency, different-role enforcement, notifications/integrations and session/recovery behavior remain incomplete. The final release recommendation must retain these boundaries and the [explicit blockers](11-test-blockers-and-limitations.md).
