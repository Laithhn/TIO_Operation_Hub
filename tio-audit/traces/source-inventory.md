# Local source inventory supporting the live audit

Review date: 10 November 2026 (Asia/Dubai). Local commit: `3d6a6b5`.

**This is a read-only source review. It does not confirm that the deployed application contains this revision, that any route is accessible to the auditor, or that any function passes.** The live inventory and scenario matrix must retain independent tested/partial/blocked statuses.

Required project documents reviewed: `README.md`, `docs/DECISIONS.md`, `docs/DESIGN-RULES.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/OPERATIONS.md`. No services, tests, SQL commands, migrations or application mutations were run by this source-review agent.

The shell declares **10 primary navigation sections**. This inventory groups capabilities into **29 source domains**, and lists **114 route entries including patterns, redirect aliases, child-route expansions and configuration pages**. These counts are source counts, not discovered/tested live module counts.

## Source of navigation and permission intent

- `src/web/src/App.tsx`: main route registry, mandatory password change, no-access states, aliases and administrative wrappers.
- `src/web/src/ui/Shell.tsx:27`: primary navigation and sidebars; links are pruned through `canAccessPath`. Tablet/mobile drawer starts at 900 px; desktop overflow sections move into More.
- `src/web/src/rights.ts:61`: explicit fail-closed route permissions and catalog prerequisites. Record visibility still depends on server scope, and UI canEdit/permissions flags are hints.
- `src/web/src/configRegistry.ts:13`: 17 lookup pages, six categories, plus review policies, Jira instances and settings.
- `src/web/src/pages/Reports.tsx:708`: seven Reporting Center areas; report library entries themselves come from the server registry.
- `src/web/src/pages/Dashboards.tsx:959`: four audience dashboards; legacy Project dashboard redirects to Client.

## Safety caveats for live testing

1. **Opening Notes may write data.** `GET /api/v1/notes/tree` calls `EnsureStarterAsync` (`src/TioHub.Api/Modules/Notes/Notes.cs:184–187`); helper lines 132–139 create My notebook and Quick notes if the account has none. Do not open an unprovisioned production account as a pure read. Existing note edits autosave after typing; do not type into existing notes.
2. **Notification record actions mark the notice read before navigation.** `src/web/src/pages/Notifications.tsx:264` calls `act.read` and then navigates. The popover has the same behavior. Use a record direct URL to preserve current read state; opening the notice center or expanding a group is distinct from its record action.
3. **Rights matrix changes save immediately.** Do not toggle checkboxes to inspect their behavior on production roles. Access exceptions, incompatible roles, users, group mappings, settings and configuration are outside authorized live mutation scope.
4. **Exports are persistent operations.** Report generation creates jobs, audit entries and files; downloads are audited. Saved filters/reports/favorites and schedule actions write state. Preview/filtering can be assessed separately; exports require approved test data/authorization consistent with the audit boundaries.
5. **Jira test/discovery/preview/sync/recalculate/retry controls can contact an external service and update local records.** Do not execute them during this live read-only scope. Read monitoring/history instead. Case-level Sync with Jira is not a passive refresh.
6. **Condition reports are manually recorded observations**, explicitly not live service monitoring. Missing live monitoring, holiday calendars, capacity planning or a full change/release/CAB workflow are business capability gaps to assess, not automatic defects.
7. **Source and documentation are versioned history.** Some plan and design sections retain old Windows-auth, project-status or rounded-card assumptions; later A20/A68/A103/A109 decisions supersede them. Compare current behavior against the latest applicable decision.

## Primary navigation and source capabilities

| Source domain | Intended persona | Read assessment candidates | Mutation controls to leave unexecuted without approved test data |
|---|---|---|---|
| Authentication | All approved users; first administrator setup only on a new installation | Sign-in mode and login screen; Validation labels and change-password screen | Submit credentials; First administrator setup; Change password; Sign out |
| Dashboard | TIO managers and permitted business users | Operations Command Center KPIs, current risks and record drilldowns; Client/team/product/country/show/period filters; Chart/table toggles and refresh | None identified in this domain |
| My dashboard | Individual engineers and managers | Own tickets and commitments; Prioritized personal work queue; Last 30 days results and latest ticket comments | None identified in this domain |
| Operational dashboard | Engineers and team leads | My work/My team/Everything filters; At-risk SLA clocks and due/overdue work queue; Production environment board; Owner workload; Next seven days and personal hygiene; 60-second refresh | None identified in this domain |
| SLA and Contracts dashboard | Contract owners and service managers | Period/client/contract/type/priority filters; SLA rates with previous-period change; Priority breaches and unmeasurable reasons; 12-month rate trend; Active contract compliance; Renewal and notice timelines; Payments grouped per currency | None identified in this domain |
| Management dashboard | TIO managers | Quarter/month/year-to-date comparison; Backlog, closure median, SLA, commitment timeliness; Monthly opened/closed trend; Team load and coverage gaps; Client portfolio with recorded statuses/signals; Risk follow-up, contract decisions, data-trust panel | None identified in this domain |
| Client dashboard | Client/project managers | Client selection; Recorded client status and history; Seven rule-based operational signals; Project, milestone, payment, ticket, escalation, commitment, environment and team summaries | Update client status with reason and optional next review |
| Client map | TIO managers and permitted business users | Five map layers; Client/region/team/product filters; Country/client explorer search and sort; Country details: Clients, Servers, Tickets, Contracts; Map zoom, overlays, full screen and filtered overview links | None identified in this domain |
| Action list | Engineers, leads and managers | Grouped reason filters; Due/overdue, owner, environment and contract action queues; Search/sort/paging; Linked record drilldowns | Export action list (creates export/audit records) |
| Notifications | Assigned users and managers | Bell popover and counts; All/Unread/Critical/Payments tabs; Severity/state/search/page filters; Grouped alerts; Payment watchlist and per-currency figures | Opening a notice marks it read; Mark read / mark all read; Delete notice; Payment CSV export |
| Data quality | Record coordinators and TIO managers | Open items by rule; Affected record links; Client/owner/rule filters | Re-evaluate rules; Coordinate item: coordinator, next action, review date; Export report |
| Clients and regions | Client/project managers; scoped business readers | All-client search across pages; Status/country/structure filters; Client/sub-client hierarchy; Client 360 areas and tabs; Region facts and environment list; Contact and responsibility cards; Optional organization graph; Logo display | Create/edit client and logo; Add/edit region/project/contact/boundary; Edit client project team; Archive/delete/cascade; Organization graph changes; Attachments; Jira integration controls |
| Projects | Project managers and scoped business users | Project register with active contracts and renewal attention; Project facts, products, environments and contracts; Personal note link panel; Attachments and history | Add/edit project dialogs; New contract; Archive/delete project; Notes and files |
| Contracts | Contract owners, engineers and managers | Contract register with client/type/status/renewal filters; Terms and support calendar; Priority SLA targets; Delivery schedule; Fees and payments; Indicative penalty clauses/assessments; Covered products/environments; Attachments and history | Create/edit contract; Renew into draft form; Payment/milestone/fee changes; Penalty recalculation/confirmation; Archive/delete; Attachments |
| Environments | Operation engineers and environment owners | Environment register and filters; Ownership/backup/operation engineer; Manually reported condition and review freshness; Applications, servers, work, firewall, condition history, quality, files and history tabs | Create/edit environment; Report condition; Add server/installation; Copy servers or environment; Archive/delete; Attachments |
| Installations and versions | Operation engineers and product support | Installation facts and components/hosts; Explicit version history; Microservice deployment matrix; Version matrix and product coverage | Add/edit installation; Choose microservices/server deployment; Confirm version change; Add/edit/delete components; Copy/archive/delete; Attachments |
| Servers and components | Infrastructure engineers | Asset register filters and aggregate CPU/RAM/storage totals; Server specification, volumes, technical owner; Hosted components/microservice versions; Firewall links; Component facts; Files and history | Add/edit server; Add/delete volume; Update hosted microservices; Copy/archive/delete; Edit components; Attachments |
| Firewall rules | Network/infrastructure engineers | Client/environment/server-filtered rules; Source/destination/protocol/ports/direction/purpose; Rules embedded on server/environment pages | Add/edit/delete firewall rule; Export |
| Products and microservices | Product owners, developers and support engineers | Product register; Product overview/technology/developers; Versions and release notes; Microservices, modules, features; Installations/projects/contracts; Microservice versions and where deployed; Files | Create/edit/delete product; Add/edit/delete versions/modules/features/microservices; Retire active entries; Developer changes; Attachments |
| Tickets | Operation engineers, incident coordinators and managers | All-ticket search including client and Jira key; Quick views and multi-filter list; Column selection, sorting and paging; Management summary, next action, SLA/deadline/ownership; Activity, affected records, Jira references, documented impact, commitments, escalations, files, field history | Create/edit; Triage/assign/start/progress/wait/validate/return/close/reopen/cancel/status/due-date actions; First response and contract linking; Activity comments; Manual Jira references; Sync with Jira (external read and local writes); Delete and attachments |
| Commitments | Accountable delivery/operation owners | Client/internal-team filtered register; Owner/deadline/status/timeliness; Original and revised deadline history; Related record links; Files and history | Create; Revise deadline; Complete with completion time; Cancel/reopen; Delete; Attachments |
| Personal notes | Signed-in permitted users; own notes only | Notebook/section/page tree; Search and pinned/linked/personal/recycle-bin views; Rich page editor; Client/project links | GET /notes/tree creates starter notebook/section when absent; Autosave after typing; Create/rename/recolor/reorder/move notebook/section/page; Files/images/paste; Delete/restore/permanent delete/empty bin |
| Escalations | Client managers and escalation owners | Register with search/channel/level/status/owner/overdue filters; Direction and contact details; Response/resolution targets; Linked client/project/contract/ticket; Communication/status timeline; Files and history | Create/edit escalation; Log communication; Change status; Raise level; Delete; Attachments |
| Teams and handovers | Team leads, managers and receiving owners | Teams and coverage; Members, skills, product familiarity; Assignments, unassigned tickets, coverage gaps; Handover register/detail and affected records; Reassignment queue for inactive owners; Files and history | Create team; Add/edit/remove member; Create handover; Acknowledge and take ownership; Manager exception; Cancel handover; Delete and attachments |
| Reporting Center | Permitted report consumers and managers with Export | Overview; Server-defined report library and preview; Tickets builder filters/columns/sort/group/preview; Saved reports; Schedule and export history/details; Templates; Date/time-zone validation | Generate/download exports (jobs/audit and files); Save/delete presets; Create/update/delete/duplicate/favorite saved reports; Create/edit/pause/resume/delete schedules; Cancel export jobs |
| Users, roles and access | Authorized administrators | Users and lifecycle/sign-in state; Roles and comparison matrix; Rights catalog and grants; Effective user access and sources/scopes; Access checks; Individual exceptions; Incompatible roles; Windows group mappings | Create/edit/deactivate/reactivate/delete users; Issue/reset passwords; Grant/remove sign-in; Create/edit/delete/clone roles; Rights ticks save immediately; Scope/exception/incompatible-role changes; Group mapping edits |
| Configuration and settings | Authorized configuration administrators | Configuration home/category/list pages; Usage counts and labels/categories; Review policies; Approved Jira hosts; Settings groups including attachment storage | Add/rename/describe/reorder/retire/delete configurable values; Edit fixed condition labels; Configure ticket statuses/behavior; Review policy changes; Jira instance changes; Settings and storage migration |
| Jira integrations | Authorized integration administrators | Connections overview; Client space assignment view; Import review; Integration issues; Unmapped Jira users/mapping history; Workflow mappings; Sync monitoring/runs/failures | Add/edit connection and rotate credentials; Test connection/discover spaces/preview import (external calls); Assign/reassign spaces/contracts; Import/sync/retry/recalculate; Enable/pause client integration; Map users/statuses/types/priorities; Resolve conflicts |
| Change history and archive | Audit readers; scoped restore coordinators | Business/access audit history; People/system/account/date filters; Expanded before/after changes; Archived register by type/client; Deletion dependency preview | Restore archived record; Delete/cascade operations via shared dialogs; Audit/export generation |

## Explicit tab inventories

- **Client 360:** default Overview; Operational → Tickets, Commitments, Escalations, Contacts & responsibilities; Technical → Regions & environments, Infrastructure, Jira integration; Commercial → Contracts & SLAs, Projects, Organizations; Records → Attachments, My notes, History. Query links use `?tab=cases|commitments|escalations|contacts|structure|infra|jira|contracts|projects|organizations|files|notes|history` (permitted tabs only).
- **Environment:** `?tab=apps|assets|work|network|conditions|files|quality|history`: Applications, Servers & assets, Work, Firewall rules, Condition history, Attachments, Data quality, History.
- **Ticket:** `?tab=timeline|affected|jira|impact|commitments|escalations|files|history`: Activity, Affected records, Jira references, Documented impact, Commitments, Escalations, Attachments, Field history.
- **Notifications:** All, Unread, Critical, Payments. Payment subfilters: Overdue and due, Overdue, Due within configured window, All open, Paid.
- **Jira conflicts:** Issues, Jira users, Workflow mappings. Selected connection scopes the view.
- **Reporting Center:** Overview, Report library, Tickets report builder, My reports, Scheduled reports, Export history, Templates.
- **Products:** section navigation for Overview, Versions, Microservices, Installations, Modules, Features, Documents; technology and developers sit under Overview. Contract sections include Details, SLA targets, Delivery, Fees and payments, Penalties, Coverage, Documents, History.

## Business rules that change expected tests

- Tickets are labelled Tickets in the UI but retain `/cases` routes and Cases right keys (A95). Incident is one configurable ticket category; no separate incident module is expected.
- Jira-synchronized tickets follow Jira status/priority and contractual due-date rules; manual lifecycle and first-response actions are intentionally restricted (A78/A82/A93/A96). Ordinary hub tickets use the manual workflow.
- First-response and resolution compliance is met ÷ (met + breached); pending/not measurable are excluded; no measured rows means Not available. Overall compliance requires both completed obligations. Do not infer dashboard accuracy solely from percentages.
- One contract belongs to exactly one project; a project may hold multiple contracts. Fees and payments are contract records and currencies must never be summed together.
- Latest A109 stores one recorded status per client. Seven rule-based signals do not change that status. `/dashboards/project` is a legacy alias; historical project-status data remains unused.
- Project team membership is recorded per client, not per project; Teams manages separate internal teams. Future capacity/absence planning is explicitly identified as deferred.
- Handover completes with receiving-owner acknowledgement or an authorized manager exception; no automatic reassignment when an owner is deactivated.
- Formal change/release approvals, separate go-live gates, public-holiday calendars, external notifications and full ITSM/CMDB integration are not demonstrated by these route sources. Classify them as requirements/gaps pending stakeholder review, not source-confirmed live defects.

## Route inventory

| Route pattern or expansion | Source domain | Source location |
|---|---|---|
| `/login` | Authentication | `src/web/src/App.tsx:150` |
| `/account/password` | Authentication | `src/web/src/App.tsx:151` |
| `/` | Dashboard (redirect/alias) | `src/web/src/App.tsx (index route)` |
| `/overview` | Dashboard | `src/web/src/App.tsx:155` |
| `/map` | Client map | `src/web/src/App.tsx:156` |
| `/dashboards/*` | Dashboard | `src/web/src/App.tsx:157` |
| `/actions` | Action list | `src/web/src/App.tsx:158` |
| `/notifications` | Notifications | `src/web/src/App.tsx:159` |
| `/data-quality` | Data quality | `src/web/src/App.tsx:160` |
| `/reporting-center/*` | Reporting Center | `src/web/src/App.tsx:162` |
| `/reports` | Reporting Center (redirect/alias) | `src/web/src/App.tsx:163` |
| `/reports/*` | Reporting Center (redirect/alias) | `src/web/src/App.tsx:164` |
| `/clients` | Clients and regions | `src/web/src/App.tsx:165` |
| `/clients/new` | Clients and regions | `src/web/src/App.tsx:166` |
| `/clients/:id` | Clients and regions | `src/web/src/App.tsx:167` |
| `/clients/:id/edit` | Clients and regions | `src/web/src/App.tsx:168` |
| `/regions/:id` | Clients and regions | `src/web/src/App.tsx:169` |
| `/projects` | Projects | `src/web/src/App.tsx:170` |
| `/projects/:id` | Projects | `src/web/src/App.tsx:171` |
| `/products` | Products and microservices | `src/web/src/App.tsx:172` |
| `/products/new` | Products and microservices | `src/web/src/App.tsx:173` |
| `/products/:id` | Products and microservices | `src/web/src/App.tsx:174` |
| `/products/:id/edit` | Products and microservices | `src/web/src/App.tsx:175` |
| `/microservices/:id` | Products and microservices | `src/web/src/App.tsx:176` |
| `/contracts` | Contracts | `src/web/src/App.tsx:177` |
| `/contracts/new` | Contracts | `src/web/src/App.tsx:178` |
| `/contracts/:id` | Contracts | `src/web/src/App.tsx:179` |
| `/contracts/:id/edit` | Contracts | `src/web/src/App.tsx:180` |
| `/environments` | Environments | `src/web/src/App.tsx:181` |
| `/environments/new` | Environments | `src/web/src/App.tsx:182` |
| `/environments/:id` | Environments | `src/web/src/App.tsx:183` |
| `/environments/:id/edit` | Environments | `src/web/src/App.tsx:184` |
| `/installations/:id` | Installations and versions | `src/web/src/App.tsx:185` |
| `/components/:id` | Servers and components | `src/web/src/App.tsx:186` |
| `/versions` | Installations and versions | `src/web/src/App.tsx:187` |
| `/assets` | Servers and components | `src/web/src/App.tsx:188` |
| `/assets/:id` | Servers and components | `src/web/src/App.tsx:189` |
| `/firewall-rules` | Firewall rules | `src/web/src/App.tsx:190` |
| `/my-dashboard` | My dashboard | `src/web/src/App.tsx:191` |
| `/cases` | Tickets | `src/web/src/App.tsx:192` |
| `/cases/new` | Tickets | `src/web/src/App.tsx:193` |
| `/cases/:id` | Tickets | `src/web/src/App.tsx:194` |
| `/cases/:id/edit` | Tickets | `src/web/src/App.tsx:195` |
| `/commitments` | Commitments | `src/web/src/App.tsx:196` |
| `/commitments/new` | Commitments | `src/web/src/App.tsx:197` |
| `/commitments/:id` | Commitments | `src/web/src/App.tsx:198` |
| `/notes` | Personal notes | `src/web/src/App.tsx:199` |
| `/escalations` | Escalations | `src/web/src/App.tsx:200` |
| `/escalations/new` | Escalations | `src/web/src/App.tsx:201` |
| `/escalations/:id` | Escalations | `src/web/src/App.tsx:202` |
| `/escalations/:id/edit` | Escalations | `src/web/src/App.tsx:203` |
| `/teams` | Teams and handovers | `src/web/src/App.tsx:204` |
| `/teams/:id` | Teams and handovers | `src/web/src/App.tsx:205` |
| `/handovers` | Teams and handovers | `src/web/src/App.tsx:206` |
| `/handovers/:id` | Teams and handovers | `src/web/src/App.tsx:207` |
| `/reassignment` | Teams and handovers | `src/web/src/App.tsx:208` |
| `/admin` | Users, roles and access (redirect/alias) | `src/web/src/App.tsx:209` |
| `/admin/access` | Users, roles and access | `src/web/src/App.tsx:210` |
| `/admin/users` | Users, roles and access | `src/web/src/App.tsx:211` |
| `/admin/groups` | Users, roles and access | `src/web/src/App.tsx:212` |
| `/admin/config` | Configuration and settings | `src/web/src/App.tsx:214` |
| `/admin/config/category/:category` | Configuration and settings | `src/web/src/App.tsx:215` |
| `/admin/config/:slug` | Configuration and settings | `src/web/src/App.tsx:216` |
| `/admin/reference` | Configuration and settings (redirect/alias) | `src/web/src/App.tsx:217` |
| `/admin/network-zones` | Configuration and settings (redirect/alias) | `src/web/src/App.tsx:218` |
| `/admin/roles` | Users, roles and access | `src/web/src/App.tsx:219` |
| `/admin/rights` | Users, roles and access | `src/web/src/App.tsx:220` |
| `/admin/products` | Products and microservices (redirect/alias) | `src/web/src/App.tsx:221` |
| `/admin/policies` | Configuration and settings | `src/web/src/App.tsx:222` |
| `/admin/jira` | Configuration and settings | `src/web/src/App.tsx:223` |
| `/admin/integrations/jira` | Jira integrations | `src/web/src/App.tsx:224` |
| `/admin/integrations/jira/review` | Jira integrations | `src/web/src/App.tsx:225` |
| `/admin/integrations/jira/conflicts` | Jira integrations | `src/web/src/App.tsx:226` |
| `/admin/integrations/jira/monitoring` | Jira integrations | `src/web/src/App.tsx:227` |
| `/admin/settings` | Configuration and settings | `src/web/src/App.tsx:228` |
| `/admin/audit` | Change history and archive | `src/web/src/App.tsx:229` |
| `/admin/archived` | Change history and archive | `src/web/src/App.tsx:230` |
| `/*` | Dashboard | `src/web/src/App.tsx:231` |
| `/dashboards` | Dashboard | `src/web/src/pages/Dashboards.tsx` |
| `/dashboards/operational` | Operational dashboard | `src/web/src/pages/Dashboards.tsx` |
| `/dashboards/sla` | SLA and Contracts dashboard | `src/web/src/pages/Dashboards.tsx` |
| `/dashboards/management` | Management dashboard | `src/web/src/pages/Dashboards.tsx` |
| `/dashboards/client` | Client dashboard | `src/web/src/pages/Dashboards.tsx` |
| `/dashboards/project` | Client dashboard (redirect/alias) | `src/web/src/pages/Dashboards.tsx` |
| `/reporting-center` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/reporting-center/library` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/reporting-center/builder/cases` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/reporting-center/my-reports` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/reporting-center/schedules` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/reporting-center/history` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/reporting-center/templates` | Reporting Center | `src/web/src/pages/Reports.tsx` |
| `/admin/config/reported-conditions` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/organization-relationship-types` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/environment-types` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/responsibility-areas` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/team-roles` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/server-types` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/server-roles` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/network-zones` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/operating-systems` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/project-phases` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/component-roles` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/contract-types` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/case-types` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/case-statuses` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/escalation-channels` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/team-member-roles` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/priority-guidance` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/category/clients-environments` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/category/servers` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/category/products-installations` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/category/contracts-cases` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/category/teams` | Configuration and settings | `src/web/src/configRegistry.ts` |
| `/admin/config/category/system` | Configuration and settings | `src/web/src/configRegistry.ts` |

## Permission assessment caveats

- `hasRightKey` recursively requires registered prerequisite rights; unknown keys fail closed. Knowing a direct URL is not permission to bypass a guard.
- `/`, `/overview`, `/map`, `/actions` and `/data-quality` combine several business resources and therefore require broad View prerequisites. A reader can legitimately see individual lists while these pages are denied.
- `/clients` and direct client detail use ClientStructure:Access plus at least one permitted tab/attachments/history permission. Client tabs additionally declare the underlying module rights. An auditor should capture actual assigned rights and account scope before interpreting a hidden tab as a bug.
- Reporting visibility needs Platform:Export and the relevant area right. An administrator without business roles/scope may legitimately have no business records.
- `/admin/audit` and `/admin/archived` are intentionally not wrapped in AdminRoute; dedicated audit/archive/restore authorization controls access. This is not evidence of an access-control flaw.
- `AdminRoute`, `canAccessPath`, per-control rights, API endpoint rights, and data scope require separate verification with approved accounts; source mapping cannot prove API enforcement in deployment.

## Evidence classification

This file is **supporting source evidence**. It may justify targeted live checks or clearly labelled architectural observations. It must never be counted as an executed browser scenario, observed production failure, performance measurement, or passed feature. All suggested safety boundaries above are based on the cited code, not a claim about an action executed on the live service.

## Additional route-load safety review

The following reviewed source paths use query/read projections without a business-record save on route opening: Reporting Center summary/catalog/history/schedule list and details; saved-report list/detail; Templates; archive listing; global search; client/region/project/product/detail views and blank create forms. This is source inspection, not proof that every possible request is side-effect-free.

- `pages/reporting/MyReports.tsx:68`: Templates renders static definitions; Use template routes to the builder with `?template=` and sets an unsaved local definition.
- `pages/reporting/CasesBuilder.tsx:449–478`: opening a saved report/template automatically previews after a 500 ms debounce. Preview uses POST `/reporting/reports/cases/preview`; `Modules/Reporting/BuilderEndpoints.cs:133` validates and runs a scoped query and records a duration metric. It does not save business data in the reviewed handler. The HTTP verb alone therefore does not identify a mutation.
- `Modules/Reporting/BuilderEndpoints.cs:194`: saved-report detail sanitizes its stored definition in memory and returns warnings, without persisting the sanitized result.
- `Modules/Reporting/ReportingEndpoints.cs:189` and `BuilderEndpoints.cs:404`: schedule lists are read-only; PATCH/create/pause/resume/delete controls are separate.
- `Modules/Admin/AdminEndpoints.cs:450`: archive listing reads archived rows; restore is a separate POST.
- `Modules/Reporting/SearchExportEndpoints.cs:20`: global search queries scoped records, without save. Its legacy GET `/export/{report}` at line 56 calls `ExportAsync`, generates a stored export and is not a passive read.
- `Modules/Reporting/ReportingEndpoints.cs:252`: GET report download audits the download and saves it; missing/expired files may have their job marked Expired and stored file removed. Do not test existing export downloads merely to assess navigation if preservation of all state is required.
- `Modules/Attachments/Attachments.cs:297–323`: attachment download/preview resolves rights and streams content without saving in the reviewed handlers; attachment upload/description/delete are separate mutations.
- Client/product/environment create forms prepare local form state and use GET option/duplicate reads; opening them does not submit. No typing into Personal notes is safe for this audit because of autosave.

## Source support for parent auditor's reported ticket-status discrepancy

The parent auditor reported the same ticket showing a configured customer-waiting status in `/cases` and an internal In-progress stage in the client's Tickets area. This source agent did not execute or independently confirm that live observation.

The local source provides a concrete explanation to pair with the parent's screenshots:

1. `Modules/Reporting/OverviewEndpoints.cs:70` projects the client Tickets sublist with `x.Status` (internal enum stage), but not `x.StatusCode` (configured customer-facing status).
2. `pages/Clients.tsx:474` renders that `k.status` through `StatusBadge` with `enumName="CaseStatus"`.
3. `pages/Cases.tsx:144` renders the main ticket list from `r.statusCode` instead.
4. `Modules/Work/CaseEndpoints.cs:707` includes `StatusCode` and Jira/internal-assignee fields in its main-list row. A waiting-for-customer code can therefore differ from the internal lifecycle stage by design, while the client sublist displays the wrong layer of that state.

A recommended correction is to use the same configured `StatusCode` projection and status label helper in both displays, preserving the internal stage for workflow logic. Acceptance: on the same unchanged ticket, client Tickets, ticket register, detail and report preview display the same current configured status, including customer waiting and renamed/custom statuses.

The ownership difference needs careful wording: client overview uses the accountable hub owner (`x.Owner`, otherwise Unassigned), while `pages/Cases.tsx:145` also falls back to internal/Jira assignee and labels Client contact based on `JiraAssigneeKind` enriched at `CaseEndpoints.cs:53–58`. This proves different display semantics, not an incorrect ownership write. A clear Owner versus Jira assignee distinction is a UX correction candidate to evaluate with the live evidence.

## Follow-up: mobile navigation exposure versus keyboard behavior

The parent auditor's mobile snapshots listed the closed off-canvas Navigation and its links. The local source does not by itself establish an accessibility failure:

- `ui/Shell.tsx:367–368` always mounts the mobile aside, assigns `inert={!navOpen}`, and adds dialog/aria-modal attributes only while open. No `hidden` or `aria-hidden` is set.
- `styles/frame.scss:212–214,235–241` keeps the drawer displayed and shifts it outside the viewport with `translateX(-105%)` when closed. A DOM inventory can therefore list its nodes even when browser focus/accessibility behavior honors inert.
- The local dependency is React/ReactDOM 19.3.0, whose bundled DOM implementation recognizes inert (`node_modules/react-dom/cjs/react-dom-client.production.js:14574`). The package version cannot establish the deployed bundle revision.
- `ui/Shell.tsx:243–271` returns focus to Menu on Escape/close, focuses the active section on opening, and wraps Tab/Shift+Tab between first/last focusable drawer controls while open. Route navigation from the drawer attempts to focus main content.

**Safe manual test proposed to parent (not executed by this agent):** at 390 × 844 open Menu, press Escape, and press Tab repeatedly without activating anything. Record whether focus remains visible in the header/main or enters the off-screen Close menu/section links. Expected: closed drawer links never receive sequential keyboard focus. Reopen Menu and verify Tab from its last focusable item wraps to Close menu; Shift+Tab from Close menu wraps to its last focusable item. A true keyboard or accessibility-tree exposure in the live browser, rather than DOM inventory alone, is needed to confirm a defect.

## Follow-up: table leading-column order discrepancy

**Local source corroboration, not independent live execution:** `ui/kit.tsx:679–681` renders the Details header before the Select-all header. In the same shared DataTable, lines 708–713 render each row's selection checkbox before its Details disclosure. Thus the leading header/body order is reversed whenever both `hasDetails` and `canSelect` are true.

`pages/Cases.tsx:126–128` supplies the details renderer, while selection remains enabled by default; `ui/kit.tsx:531` enables selection outside the phone layout. This supports the parent auditor's desktop Tickets observation. On phones selection is disabled, so the two-column mismatch does not apply.

Recommended correction: emit selection TH first, then Details TH, matching the existing TD order. Acceptance: at desktop width each leading header aligns with its own cell/control and native table header association; at phone width the remaining Details header stays aligned. Regression: render a selectable table with details enabled and assert the semantic leading-column order in both header and body. Explicit aria-labels on the two controls mitigate but do not correct the structural association.
