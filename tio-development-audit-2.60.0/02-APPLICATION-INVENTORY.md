# 02 — Application inventory (build 2.60.0)

Sources: router (`src/web/src/App.tsx`), navigation (`ui/Shell.tsx`), running API description (**374 operations; 270 in 2.29.0, none removed**), crawl of **79 routes** at four viewports (`traces/ui-crawl-results.json`, `screenshots/`).

Coverage: **Full** = positive and negative tests; **Partial** = loaded, inspected, some functions tested; **Viewed** = rendered and checked for errors, layout and accessibility only. Issue numbers refer to `MASTER-ISSUE-REGISTER.csv`.

## What changed since 2.29.0

| Area | Change | Decision |
|---|---|---|
| Access | Granular rights (249 for TIO Manager, 172 for Operation Engineer), **per-client data scope enforced**, scoped exceptions, role cloning, role conflicts, access review and simulation, user deletion | A63, A65, A75, A81, A101 |
| Tickets | "Cases" renamed **Tickets**; configurable statuses with fixed behaviours; close from In progress when no Resolved status exists; comments and activity stream; quick views; bulk selection; redesigned ticket page | A77, A95, A97, A106 |
| Jira | Read-only synchronisation from Jira Cloud (connections, spaces, status/user/value mappings, import review, conflicts, sync monitor) — **disabled in this build** | A76–A93, A96 |
| Contracts | Penalty clauses and monthly penalty assessments, contract renewal, payment status action | A63, A66, A94 |
| Clients | Organisation structure, client logos, client status reports, Client dashboard | A64, A71, A109 |
| Dashboards | My dashboard, Operational, SLA & Contracts, Management, Client dashboards beside the Command Center | A98, A100, A108, A109 |
| Reporting | Reporting Center as its own section: library, tickets report builder, my reports, schedules, export history, templates; queued exports | A70 |
| UI | Rebuilt on the vendored VtWebGuiFramework 4.0.0-rc.5; native tables; per-route loading; "More" navigation; drawer below 900 px | A68, A69, A102, A105, A110 |
| Notifications | Read state separated from business resolution | A72 |

## Modules

| # | Module | Route(s) | Roles | Behaviour observed on 2.60.0 | Coverage | Issues |
|---|---|---|---|---|---|---|
| 1 | Sign-in | `/login`, `/account/password` | all | Render; not usable in Development mode | Viewed | 029 |
| 2 | My dashboard | `/my-dashboard` | all | Landing page for engineers; own tickets, commitments, 30-day figures | Partial | — |
| 3 | Operations Command Center | `/` , `/overview` | dashboard rights | Figures match SQL; drill-downs consistent | Full (KPIs) | 001, 002, 005, 025 |
| 4 | Audience dashboards | `/dashboards/operational`, `/sla`, `/management`, `/client` | per-dashboard rights | Render with scope applied; rates show measured counts; previous-period comparison | Partial | 005 |
| 5 | Client map, Action list, Notifications, Data quality | `/map`, `/actions`, `/notifications`, `/data-quality` | all | Render; global data-quality scan needs all-client scope (403 for a scoped engineer) | Viewed | — |
| 6 | Reporting Center | `/reporting-center/*` (7 pages) | export rights | Preview = list = export; owner-only download; formulas neutralised | Full (API), Viewed (UI) | 035 |
| 7 | Clients, regions, organisation structure, logos, status reports | `/clients…`, `/regions/:id` | Client structure rights | Alias unique, name not; status report rules enforced | Full (API), Viewed (UI) | 009, 011 |
| 8 | Projects & contracts, payments, penalties, renewal | `/projects…`, `/contracts…` | Contracts rights | Date, SLA-target and payment rules enforced; penalty preview follows SLA state | Full (API), Viewed (UI) | 001–003, 007, 009 |
| 9 | Environments, version matrix, assets, components, installations, firewall rules | `/environments…`, `/versions`, `/assets…`, `/installations/:id`, `/components/:id`, `/firewall-rules` | Inventory rights | Rules as in 2.29.0; server now records IP address, VLAN and notes | Partial | 009 |
| 10 | Products | `/products…`, `/microservices/:id` | Catalogue rights | Render | Viewed | — |
| 11 | Tickets | `/cases`, `/cases/new`, `/cases/:id`, `/cases/:id/edit` | Cases rights | Transitions enforced; closed tickets editable; SLA and penalties rewritable | Full | 001–004, 006, 007, 010, 014, 015, 032 |
| 12 | Commitments | `/commitments…` | Commitments rights | On-time result still engineerable; completion accepted for any past time | Full | 005–008, 010 |
| 13 | Escalations | `/escalations…` | Escalations rights | Status path enforced; targets before receipt accepted | Full (API), Viewed (UI) | 012, 013 |
| 14 | Notes | `/notes` | all | Private; sanitised | Partial | — |
| 15 | Teams, handovers, reassignment | `/teams…`, `/handovers…`, `/reassignment` | Teams rights | Render; scoped lists | Viewed | — |
| 16 | Attachments | workspace tab on records; preview endpoint | per-record rights | Type rules, forced download, own-delete | Full (API) | 029 |
| 17 | Search | header | all | Scoped: no hits outside the caller's clients | Partial | — |
| 18 | Administration — users, roles, rights, access review, group mappings | `/admin/users`, `/roles`, `/rights`, `/access`, `/groups` | Admin rights | 403 for engineers; self-escalation refused; role clone and user delete work | Full (API), Viewed (UI) | — |
| 19 | Administration — configuration (incl. case statuses), settings, review policies | `/admin/config…`, `/admin/settings`, `/admin/policies` | Admin rights | Render | Viewed | — |
| 20 | Administration — Jira | `/admin/integrations/jira`, `/review`, `/conflicts`, `/monitoring` | AdminIntegrations rights | Pages render in the disabled state; health reports NotConfigured | Viewed (disabled) | 029 |
| 21 | Change history, archived records | `/admin/audit`, `/admin/archived` | audit / archive rights | Field-level history; **leaks child records of other clients to scoped users** | Partial | 035 |
| 22 | Delete with dependents | dialogs | Delete rights per record | Scope-aware; still no version or server confirmation | Full (API) | 011 |
| 23 | Shell | all | all | "More" menu, drawer, What's new; no overflow | Full | 037 |
| 24 | Error pages | `*`, missing ids | all | Missing record: guidance. Unknown address: "Access denied" | Full | 036 |

## Still not present

Change management, problem management, shared knowledge base, shift log, go-live readiness, hypercare, risk register, outbound notification (e-mail/chat), monitoring integration, imports, PDF export. See issue 030.
