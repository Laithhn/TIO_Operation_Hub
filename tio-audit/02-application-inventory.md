# Application inventory and coverage boundaries

**Target:** https://nb01994.vitronic.de/. **Audit date:** 10 November 2026 (Asia/Dubai). **Live footer:** 2.59.0. **Observed role:** existing TIO Manager account lmh. **Browser:** ChatGPT in-app browser ID 2; exact engine/build not recorded.

**29 functional groups: 28 Partial, 1 Blocked, 0 fully tested.** Partial means accessible features were inspected/read-tested, with mutation, data, permission or visual scenarios still unexecuted. It is not a module pass. Notes is Blocked because its tree GET can create starter data and no approved test account/data was available.

**91 distinct captured live routes** are indexed below, with four capture/DOM families per route (desktop 1920 × 1080, laptop 1366 × 768, tablet 768 × 1024, mobile 390 × 844). These 364observations are not 364workflow passes. Selected manual screenshot reviews and Loading/capture limitations are recorded in the [visual review](traces/visual-review-observations.md) and [remaining review](traces/visual-review-remaining.md). [Exact route list](traces/responsive-route-list.json).

The separate [source inventory](traces/source-inventory.md) maps 29 domains and 114 entries including patterns, aliases and expanded children; it does not prove 114 live pages were accessed. Local 2.60.0 uses Client dashboard, whereas the inspected 2.59.0 deployment uses Project dashboard. The matrix below preserves the 29 source groups but names that group with its live Project label.

Ten observed main sections: Dashboard, Clients, Products, Tickets, Commitments, Notes, Escalations, Teams, Reporting Center, Administration. Shared Search, New menu, notification bell and account controls supplement them. Visible actions were mapped without treating them as executed; no credentials were submitted or sign-out triggered.

## Module matrix

Intended/inferred personas come from the UI context and source, not separate-role execution. Only TIO Manager was observed. Defect counts use primary ownership to avoid duplicate counting; cross-module 001is linked separately. Risk is a coverage/operational-impact judgment, not a new defect severity or confirmed security failure.

| Module | URL(s) | Purpose | Features actually inspected | User role (intended/inferred) | Status | Confirmed defects | Risk |
|---|---|---|---|---|---|---|---|
| Authentication | /account/password; /login | Sign-in and credential lifecycle | Login and Change password form layout; public auth discovery and anonymous denial observations. No credential submission, logout, password change or session-expiry execution. | All approved users; first administrator setup only on a new installation (intended/inferred) | Partial | 0 | High |
| Executive dashboard | / | Cross-cutting operational management | Executive KPIs, attention queue, charts/filter controls, selected drilldowns and return/refresh observations; not every aggregate recomputed. | TIO managers and permitted business users (intended/inferred) | Partial | 0 | High |
| My dashboard | /my-dashboard | Personal work review | Own-work counts, personal queue, last 30 days and latest-comment displays; no record actions. | Individual engineers and managers (intended/inferred) | Partial | 0 | Medium |
| Operational dashboard | /dashboards/operational | Immediate operations triage | Show/client/product controls, work queue, SLA-clock displays, production board, owner workload and hygiene panels. | Engineers and team leads (intended/inferred) | Partial | 0 | High |
| SLA and Contracts dashboard | /dashboards/sla | Contractual measurement and lifecycle decisions | Period/filter controls, compliance/trends, contract/renewal and payment views, holiday disclaimer; no independent full SLA recalculation. | Contract owners and service managers (intended/inferred) | Partial | 0 | High |
| Management dashboard | /dashboards/management | Portfolio/trend oversight | Period comparisons, backlog/closure/SLA, project portfolio, workload, risks/decisions and Data trust. | TIO managers (intended/inferred) | Partial | 0 | High |
| Project dashboard (live 2.59.0) | /dashboards/project?projectId=1 | Recorded project status and explainable signals | Live Project selector/status/signals/facts/delivery/payment/work panels; Update status only observed. Local 2.60 calls this Client dashboard; live 2.59 uses Project. | Client/project managers (intended/inferred) | Partial | 0 | High |
| Client map | /map | Geographical operational navigation | Settled map/country explorer, country selection and links; some responsive captures show Loading and cannot establish settled layout. | TIO managers and permitted business users (intended/inferred) | Partial | 0 | Medium |
| Action list | /actions | Exception/follow-up work queue | Reason groups, severity/deadline/owner/next-action rows and linked records; no export generation. | Engineers, leads and managers (intended/inferred) | Partial | 0 | High |
| Notifications | /notifications | Assignments and operational reminders | All/Unread/Critical/Payments controls, grouped text/counts/actions; repeated mobile/tablet comparison. No read/delete action activated. | Assigned users and managers (intended/inferred) | Partial | 1 — TIO-BUG-004 | Medium |
| Data quality | /data-quality | Record completeness/review obligations | Rule totals, filters, sampled rows and record links; re-evaluate/coordinate controls observed, not executed. | Record coordinators and TIO managers (intended/inferred) | Partial | 0 | High |
| Clients and regions | /clients; /clients/1; /clients/new | Client organization and context | Client list/detail Overview/Operational/Technical/Commercial/Records areas and sampled subviews; new form opened. No standalone region detail in 91-route sample. Shared global Search inspected. | Client/project managers; scoped business readers (intended/inferred) | Partial | 1 — TIO-BUG-001; also affects global search | High |
| Projects | /projects; /projects/1 | Project delivery/support register | Project register/detail facts, products/environments/contracts and note/file/history affordances; no writes. | Project managers and scoped business users (intended/inferred) | Partial | 0 | High |
| Contracts | /contracts; /contracts/1; /contracts/new | Commercial/service obligations | Register/detail term, renewal, support, SLA targets, delivery, fees/payments, indicative penalties, coverage/documents/history; new form only. | Contract owners, engineers and managers (intended/inferred) | Partial | 0 | High |
| Environments | /environments; /environments/3; /environments/new | Environment ownership and evidence | Register/detail ownership/freshness; Applications/Servers/Work/Firewall/Condition history/Files/Quality/History tabs; new form dependencies. No condition/copy/archive/save. | Operation engineers and environment owners (intended/inferred) | Partial | 0 | High |
| Installations and versions | /versions; /installations/3 | Installed product/version evidence | Version matrix/coverage and sampled installation facts/components/hosts/version history; confirmation/deployment controls not executed. | Operation engineers and product support (intended/inferred) | Partial | 0 | High |
| Servers and components | /assets; /assets/27; /components/27 | Recorded infrastructure | Asset list/totals, sampled server specification/volumes/owner/hosted components/firewall and component facts/files; no live provisioning/utilization validation. | Infrastructure engineers (intended/inferred) | Partial | 0 | High |
| Firewall rules | /firewall-rules | Recorded communication requirements | Recorded source/destination/protocol/ports/direction/purpose rows; add/edit/delete/export not executed. | Network/infrastructure engineers (intended/inferred) | Partial | 0 | High |
| Products and microservices | /products; /products/1; /microservices/2; /products/new | Software catalogue and releases | Product list/detail sections, modules/features/releases/developers/deployments and sampled microservice versions/where-it-runs; new form only. | Product owners, developers and support engineers (intended/inferred) | Partial | 0 | Medium |
| Tickets | /cases; /cases/12203; /cases/new | Operational ticket lifecycle | Exact/partial/empty search, overdue filter, sort/pagination, quick views, sampled detail Activity/Affected/Jira/Impact/Commitments/Escalations/Files/History; new form and table structure. No lifecycle/comments/uploads/sync. | Operation engineers, incident coordinators and managers (intended/inferred) | Partial | 2 primary — TIO-BUG-003,007 (001 cross-reference) | High |
| Commitments | /commitments; /commitments/6; /commitments/new | Owned promises and deadlines | List/detail deadline/outcome/history and new form; revise/complete/cancel/reopen not executed. | Accountable delivery/operation owners (intended/inferred) | Partial | 0 | High |
| Personal notes | /notes — deliberately not opened | Private personal knowledge | Not opened live: source tree GET may initialize starter data and editor autosaves; no approved test account/data. | Signed-in permitted users; own notes only (intended/inferred) | Blocked | 0 | Medium |
| Escalations | /escalations; /escalations/new | Escalated client matters | Register/filter/empty-state displays and new form; no status/communication/notification changes. | Client managers and escalation owners (intended/inferred) | Partial | 0 | High |
| Teams and handovers | /teams; /handovers; /reassignment; /handovers/1; /teams/1 | Assignments/coverage/ownership transfer | Team/member/workload/coverage displays, one cancelled handover detail and reassignment empty state; no transfer/acknowledgement/exception. | Team leads, managers and receiving owners (intended/inferred) | Partial | 0 | High |
| Reporting Center | /reporting-center +library/builder/cases/my-reports/schedules/history/templates | Management reports and delivery | All seven areas, library Configure/preview, builder/template preview, current status choices, existing export history/details and empty saved/schedule views. No generation/download/save/schedule. | Permitted report consumers and managers with Export (intended/inferred) | Partial | 2 — TIO-BUG-005,006 | High |
| Users, roles and access | /admin/users; /admin/roles; /admin/rights; /admin/access; /admin/groups | Identity/grants/scope governance | Users/roles/rights/access-review displays and directory mapping empty state; no account/password/role/scope/rights edits or second-role isolation test. | Authorized administrators (intended/inferred) | Partial | 0 | High |
| Configuration and settings | /admin/config; 6 category routes; 17 lookup routes ; /admin/policies ; /admin/jira ; /admin/settings | Reference values and tunables | Overview + six categories + 20 child pages:17 lookups and Review policies/Jira instances/Settings. Labels/order/usage/behavior inspected; no edit/reorder/retire/storage move. | Authorized configuration administrators (intended/inferred) | Partial | 0 | High |
| Jira integrations | /admin/integrations/jira; /admin/integrations/jira/review; /admin/integrations/jira/conflicts; /admin/integrations/jira/monitoring | One-way integration oversight | Connections/import-review/conflicts/monitor and run history, including 2 pending conflicts. No external test/discovery/import/sync/retry/recalculate/mapping mutation. | Authorized integration administrators (intended/inferred) | Partial | 0 | High |
| Change history and archive | /admin/audit; /admin/archived | Auditability and archived records | History filters/before-after values, mapping 552 focused view and existing export log; archive listing. No restore/delete/cascade. | Audit readers; scoped restore coordinators (intended/inferred) | Partial | 1 — TIO-BUG-002 | High |

Primary counts total **seven confirmed records: four P2 and three P3**. TIO-BUG-007 is limited to the ticket-list type hint versus configured detail label; it is separate from the status field inconsistency in 001. No governance data condition is a defect by default. [Detailed records](04-detailed-bug-report.md), [business-process assessment](06-business-process-gaps.md).

## Configuration, forms and boundaries

Configuration is one functional group: home plus **six category pages and 20 child pages**. R055–R060 are Clients & Environments, Servers, Products & Installations, Contracts & Tickets, Teams and System. R061–R077 are 17 lookup lists; R078–R080 are the three System pages Review policies, Jira instances and Settings. All were read; none was added/renamed/reordered/retired/deleted or saved.

The17 lookups are Reported conditions, Organization relationship types, Environment types, Responsibility areas, Project team roles, Server types, Server roles, Network zones, Operating systems, Project phases, Component roles, Contract types, Ticket types, Ticket statuses, Escalation channels, Priority guidance and Team member roles.

**New forms R081–R087 were opened without submission:** client, product, ticket, commitment, escalation, contract and environment. Visible labels/dependencies are not a save/validation/persistence/concurrency pass. Record-detail tabs were read on sampled client 1, ticket 12203 and environment 3; opening Personal Notes, writing attachments/comments, changing condition/status, and running Jira/export/notification actions were excluded where they could mutate production state. Standalone region/detail routes, legacy aliases, hidden dialogs, other record instances and every rights combination were not exhausted.

## Exhaustive 91-route index

For each Rnnn, exact evidence names are `traces/Rnnn-{desktop,laptop,tablet,mobile}.txt` and `screenshots/Rnnn-{desktop,laptop,tablet,mobile}.png`. Desktop links below identify the four-viewport family. Every route is **Partial**, including empty views and unsaved forms. Notes has no R-ID because it was not opened.

| Route ID | Exact captured path | Functional group | Coverage | Evidence family |
|---|---|---|---|---|
| R001 | `/` | Executive dashboard | Partial | [Trace](traces/R001-desktop.txt), [screenshot](screenshots/R001-desktop.png) |
| R002 | `/dashboards/operational` | Operational dashboard | Partial | [Trace](traces/R002-desktop.txt), [screenshot](screenshots/R002-desktop.png) |
| R003 | `/dashboards/sla` | SLA and Contracts dashboard | Partial | [Trace](traces/R003-desktop.txt), [screenshot](screenshots/R003-desktop.png) |
| R004 | `/dashboards/management` | Management dashboard | Partial | [Trace](traces/R004-desktop.txt), [screenshot](screenshots/R004-desktop.png) |
| R005 | `/my-dashboard` | My dashboard | Partial | [Trace](traces/R005-desktop.txt), [screenshot](screenshots/R005-desktop.png) |
| R006 | `/clients` | Clients and regions | Partial | [Trace](traces/R006-desktop.txt), [screenshot](screenshots/R006-desktop.png) |
| R007 | `/products` | Products and microservices | Partial | [Trace](traces/R007-desktop.txt), [screenshot](screenshots/R007-desktop.png) |
| R008 | `/cases` | Tickets | Partial | [Trace](traces/R008-desktop.txt), [screenshot](screenshots/R008-desktop.png) |
| R009 | `/commitments` | Commitments | Partial | [Trace](traces/R009-desktop.txt), [screenshot](screenshots/R009-desktop.png) |
| R010 | `/escalations` | Escalations | Partial | [Trace](traces/R010-desktop.txt), [screenshot](screenshots/R010-desktop.png) |
| R011 | `/teams` | Teams and handovers | Partial | [Trace](traces/R011-desktop.txt), [screenshot](screenshots/R011-desktop.png) |
| R012 | `/reporting-center` | Reporting Center | Partial | [Trace](traces/R012-desktop.txt), [screenshot](screenshots/R012-desktop.png) |
| R013 | `/admin/users` | Users, roles and access | Partial | [Trace](traces/R013-desktop.txt), [screenshot](screenshots/R013-desktop.png) |
| R014 | `/projects` | Projects | Partial | [Trace](traces/R014-desktop.txt), [screenshot](screenshots/R014-desktop.png) |
| R015 | `/contracts` | Contracts | Partial | [Trace](traces/R015-desktop.txt), [screenshot](screenshots/R015-desktop.png) |
| R016 | `/environments` | Environments | Partial | [Trace](traces/R016-desktop.txt), [screenshot](screenshots/R016-desktop.png) |
| R017 | `/versions` | Installations and versions | Partial | [Trace](traces/R017-desktop.txt), [screenshot](screenshots/R017-desktop.png) |
| R018 | `/assets` | Servers and components | Partial | [Trace](traces/R018-desktop.txt), [screenshot](screenshots/R018-desktop.png) |
| R019 | `/firewall-rules` | Firewall rules | Partial | [Trace](traces/R019-desktop.txt), [screenshot](screenshots/R019-desktop.png) |
| R020 | `/handovers` | Teams and handovers | Partial | [Trace](traces/R020-desktop.txt), [screenshot](screenshots/R020-desktop.png) |
| R021 | `/reassignment` | Teams and handovers | Partial | [Trace](traces/R021-desktop.txt), [screenshot](screenshots/R021-desktop.png) |
| R022 | `/actions` | Action list | Partial | [Trace](traces/R022-desktop.txt), [screenshot](screenshots/R022-desktop.png) |
| R023 | `/data-quality` | Data quality | Partial | [Trace](traces/R023-desktop.txt), [screenshot](screenshots/R023-desktop.png) |
| R024 | `/map` | Client map | Partial | [Trace](traces/R024-desktop.txt), [screenshot](screenshots/R024-desktop.png) |
| R025 | `/clients/1` | Clients and regions | Partial | [Trace](traces/R025-desktop.txt), [screenshot](screenshots/R025-desktop.png) |
| R026 | `/projects/1` | Projects | Partial | [Trace](traces/R026-desktop.txt), [screenshot](screenshots/R026-desktop.png) |
| R027 | `/contracts/1` | Contracts | Partial | [Trace](traces/R027-desktop.txt), [screenshot](screenshots/R027-desktop.png) |
| R028 | `/admin/roles` | Users, roles and access | Partial | [Trace](traces/R028-desktop.txt), [screenshot](screenshots/R028-desktop.png) |
| R029 | `/admin/rights` | Users, roles and access | Partial | [Trace](traces/R029-desktop.txt), [screenshot](screenshots/R029-desktop.png) |
| R030 | `/admin/access` | Users, roles and access | Partial | [Trace](traces/R030-desktop.txt), [screenshot](screenshots/R030-desktop.png) |
| R031 | `/admin/config` | Configuration and settings | Partial | [Trace](traces/R031-desktop.txt), [screenshot](screenshots/R031-desktop.png) |
| R032 | `/admin/audit` | Change history and archive | Partial | [Trace](traces/R032-desktop.txt), [screenshot](screenshots/R032-desktop.png) |
| R033 | `/admin/archived` | Change history and archive | Partial | [Trace](traces/R033-desktop.txt), [screenshot](screenshots/R033-desktop.png) |
| R034 | `/admin/integrations/jira` | Jira integrations | Partial | [Trace](traces/R034-desktop.txt), [screenshot](screenshots/R034-desktop.png) |
| R035 | `/admin/integrations/jira/review` | Jira integrations | Partial | [Trace](traces/R035-desktop.txt), [screenshot](screenshots/R035-desktop.png) |
| R036 | `/admin/integrations/jira/conflicts` | Jira integrations | Partial | [Trace](traces/R036-desktop.txt), [screenshot](screenshots/R036-desktop.png) |
| R037 | `/admin/integrations/jira/monitoring` | Jira integrations | Partial | [Trace](traces/R037-desktop.txt), [screenshot](screenshots/R037-desktop.png) |
| R038 | `/reporting-center/library` | Reporting Center | Partial | [Trace](traces/R038-desktop.txt), [screenshot](screenshots/R038-desktop.png) |
| R039 | `/reporting-center/builder/cases` | Reporting Center | Partial | [Trace](traces/R039-desktop.txt), [screenshot](screenshots/R039-desktop.png) |
| R040 | `/reporting-center/my-reports` | Reporting Center | Partial | [Trace](traces/R040-desktop.txt), [screenshot](screenshots/R040-desktop.png) |
| R041 | `/reporting-center/schedules` | Reporting Center | Partial | [Trace](traces/R041-desktop.txt), [screenshot](screenshots/R041-desktop.png) |
| R042 | `/reporting-center/history` | Reporting Center | Partial | [Trace](traces/R042-desktop.txt), [screenshot](screenshots/R042-desktop.png) |
| R043 | `/reporting-center/templates` | Reporting Center | Partial | [Trace](traces/R043-desktop.txt), [screenshot](screenshots/R043-desktop.png) |
| R044 | `/cases/12203` | Tickets | Partial | [Trace](traces/R044-desktop.txt), [screenshot](screenshots/R044-desktop.png) |
| R045 | `/commitments/6` | Commitments | Partial | [Trace](traces/R045-desktop.txt), [screenshot](screenshots/R045-desktop.png) |
| R046 | `/handovers/1` | Teams and handovers | Partial | [Trace](traces/R046-desktop.txt), [screenshot](screenshots/R046-desktop.png) |
| R047 | `/environments/3` | Environments | Partial | [Trace](traces/R047-desktop.txt), [screenshot](screenshots/R047-desktop.png) |
| R048 | `/products/1` | Products and microservices | Partial | [Trace](traces/R048-desktop.txt), [screenshot](screenshots/R048-desktop.png) |
| R049 | `/teams/1` | Teams and handovers | Partial | [Trace](traces/R049-desktop.txt), [screenshot](screenshots/R049-desktop.png) |
| R050 | `/notifications` | Notifications | Partial | [Trace](traces/R050-desktop.txt), [screenshot](screenshots/R050-desktop.png) |
| R051 | `/assets/27` | Servers and components | Partial | [Trace](traces/R051-desktop.txt), [screenshot](screenshots/R051-desktop.png) |
| R052 | `/installations/3` | Installations and versions | Partial | [Trace](traces/R052-desktop.txt), [screenshot](screenshots/R052-desktop.png) |
| R053 | `/components/27` | Servers and components | Partial | [Trace](traces/R053-desktop.txt), [screenshot](screenshots/R053-desktop.png) |
| R054 | `/microservices/2` | Products and microservices | Partial | [Trace](traces/R054-desktop.txt), [screenshot](screenshots/R054-desktop.png) |
| R055 | `/admin/config/category/clients-environments` | Configuration and settings | Partial | [Trace](traces/R055-desktop.txt), [screenshot](screenshots/R055-desktop.png) |
| R056 | `/admin/config/category/servers` | Configuration and settings | Partial | [Trace](traces/R056-desktop.txt), [screenshot](screenshots/R056-desktop.png) |
| R057 | `/admin/config/category/products-installations` | Configuration and settings | Partial | [Trace](traces/R057-desktop.txt), [screenshot](screenshots/R057-desktop.png) |
| R058 | `/admin/config/category/contracts-cases` | Configuration and settings | Partial | [Trace](traces/R058-desktop.txt), [screenshot](screenshots/R058-desktop.png) |
| R059 | `/admin/config/category/teams` | Configuration and settings | Partial | [Trace](traces/R059-desktop.txt), [screenshot](screenshots/R059-desktop.png) |
| R060 | `/admin/config/category/system` | Configuration and settings | Partial | [Trace](traces/R060-desktop.txt), [screenshot](screenshots/R060-desktop.png) |
| R061 | `/admin/config/reported-conditions` | Configuration and settings | Partial | [Trace](traces/R061-desktop.txt), [screenshot](screenshots/R061-desktop.png) |
| R062 | `/admin/config/organization-relationship-types` | Configuration and settings | Partial | [Trace](traces/R062-desktop.txt), [screenshot](screenshots/R062-desktop.png) |
| R063 | `/admin/config/environment-types` | Configuration and settings | Partial | [Trace](traces/R063-desktop.txt), [screenshot](screenshots/R063-desktop.png) |
| R064 | `/admin/config/responsibility-areas` | Configuration and settings | Partial | [Trace](traces/R064-desktop.txt), [screenshot](screenshots/R064-desktop.png) |
| R065 | `/admin/config/team-roles` | Configuration and settings | Partial | [Trace](traces/R065-desktop.txt), [screenshot](screenshots/R065-desktop.png) |
| R066 | `/admin/config/server-types` | Configuration and settings | Partial | [Trace](traces/R066-desktop.txt), [screenshot](screenshots/R066-desktop.png) |
| R067 | `/admin/config/server-roles` | Configuration and settings | Partial | [Trace](traces/R067-desktop.txt), [screenshot](screenshots/R067-desktop.png) |
| R068 | `/admin/config/network-zones` | Configuration and settings | Partial | [Trace](traces/R068-desktop.txt), [screenshot](screenshots/R068-desktop.png) |
| R069 | `/admin/config/operating-systems` | Configuration and settings | Partial | [Trace](traces/R069-desktop.txt), [screenshot](screenshots/R069-desktop.png) |
| R070 | `/admin/config/project-phases` | Configuration and settings | Partial | [Trace](traces/R070-desktop.txt), [screenshot](screenshots/R070-desktop.png) |
| R071 | `/admin/config/component-roles` | Configuration and settings | Partial | [Trace](traces/R071-desktop.txt), [screenshot](screenshots/R071-desktop.png) |
| R072 | `/admin/config/contract-types` | Configuration and settings | Partial | [Trace](traces/R072-desktop.txt), [screenshot](screenshots/R072-desktop.png) |
| R073 | `/admin/config/case-types` | Configuration and settings | Partial | [Trace](traces/R073-desktop.txt), [screenshot](screenshots/R073-desktop.png) |
| R074 | `/admin/config/case-statuses` | Configuration and settings | Partial | [Trace](traces/R074-desktop.txt), [screenshot](screenshots/R074-desktop.png) |
| R075 | `/admin/config/escalation-channels` | Configuration and settings | Partial | [Trace](traces/R075-desktop.txt), [screenshot](screenshots/R075-desktop.png) |
| R076 | `/admin/config/priority-guidance` | Configuration and settings | Partial | [Trace](traces/R076-desktop.txt), [screenshot](screenshots/R076-desktop.png) |
| R077 | `/admin/config/team-member-roles` | Configuration and settings | Partial | [Trace](traces/R077-desktop.txt), [screenshot](screenshots/R077-desktop.png) |
| R078 | `/admin/policies` | Configuration and settings | Partial | [Trace](traces/R078-desktop.txt), [screenshot](screenshots/R078-desktop.png) |
| R079 | `/admin/jira` | Configuration and settings | Partial | [Trace](traces/R079-desktop.txt), [screenshot](screenshots/R079-desktop.png) |
| R080 | `/admin/settings` | Configuration and settings | Partial | [Trace](traces/R080-desktop.txt), [screenshot](screenshots/R080-desktop.png) |
| R081 | `/clients/new` | Clients and regions | Partial | [Trace](traces/R081-desktop.txt), [screenshot](screenshots/R081-desktop.png) |
| R082 | `/products/new` | Products and microservices | Partial | [Trace](traces/R082-desktop.txt), [screenshot](screenshots/R082-desktop.png) |
| R083 | `/cases/new` | Tickets | Partial | [Trace](traces/R083-desktop.txt), [screenshot](screenshots/R083-desktop.png) |
| R084 | `/commitments/new` | Commitments | Partial | [Trace](traces/R084-desktop.txt), [screenshot](screenshots/R084-desktop.png) |
| R085 | `/escalations/new` | Escalations | Partial | [Trace](traces/R085-desktop.txt), [screenshot](screenshots/R085-desktop.png) |
| R086 | `/contracts/new` | Contracts | Partial | [Trace](traces/R086-desktop.txt), [screenshot](screenshots/R086-desktop.png) |
| R087 | `/environments/new` | Environments | Partial | [Trace](traces/R087-desktop.txt), [screenshot](screenshots/R087-desktop.png) |
| R088 | `/admin/groups` | Users, roles and access | Partial | [Trace](traces/R088-desktop.txt), [screenshot](screenshots/R088-desktop.png) |
| R089 | `/account/password` | Authentication | Partial | [Trace](traces/R089-desktop.txt), [screenshot](screenshots/R089-desktop.png) |
| R090 | `/login` | Authentication | Partial | [Trace](traces/R090-desktop.txt), [screenshot](screenshots/R090-desktop.png) |
| R091 | `/dashboards/project?projectId=1` | Project dashboard (live 2.59.0) | Partial | [Trace](traces/R091-desktop.txt), [screenshot](screenshots/R091-desktop.png) |

## Remaining coverage

- Authentication/session/logout, approved alternate roles/scopes, CRUD/transitions/audit creation, uploads, export/download/scheduling, notifications and integrations need approved isolated accounts/data and explicit test results.
- A visible metric/chart is verified mathematically only where an executed scenario reconciles it. Empty saved-report/schedule/reassignment views are observed states, not proof the feature works or is absent.
- Manual visual inspection covered selected initial-view images. DOM widths and capture presence do not establish every lower section, dialog, focus state or WCAG condition.
- No new rights/configuration/seed/schema changes are needed for this audit-only inventory. No application service, database migration or production record mutation was performed to write it.
