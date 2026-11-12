# 02 — Application inventory

Source: router (`src/web/src/App.tsx`), navigation (`src/web/src/ui/Shell.tsx`), the running API description (194 paths, 270 operations) and a crawl of 64 routes at four viewports (`traces/ui-crawl-results.json`, `screenshots/`).

Roles: **M** = TIO Manager, **E** = Operation Engineer (Edit), **R** = role without Edit (read-only). Coverage: **Full** = positive and negative tests executed; **Partial** = loaded, inspected and some functions tested; **Viewed** = rendered, checked for errors, layout and accessibility only.

## Modules

| # | Module | Route(s) | Business purpose | Main functions | Roles | Actual behaviour observed | Coverage | Related issues |
|---|---|---|---|---|---|---|---|---|
| 1 | Sign-in | `/login`, `/account/password` | Forms sign-in, password change | Sign in, change password | all | Pages render; not usable in Development mode (identity comes from the account selector) | Viewed | 029 |
| 2 | Operations Command Center | `/` | Management overview | 9 KPI tiles, attention queue, 8 chart bands, filters, period, drill-downs | M E R | Figures match independent SQL; very long page | Full (KPIs), Partial (charts) | 025, 001, 002 |
| 3 | Client map | `/map` | Geographic view of clients | Leaflet map, country panel | M E R | Renders with tiles blocked | Viewed | 029 |
| 4 | Action list | `/actions` | Operational to-do queue | Categories, filters, export | M E R | 77 items for seed data; export works | Partial | — |
| 5 | Notifications | `/notifications`, header bell | In-app notices, payment reminders | List, mark read, delete, payments tab | all | Unread badge updates | Partial | 030 |
| 6 | Data quality | `/data-quality` | Rule-based data gaps | Scan, assign coordinator, next action | M E | Scan opened 3 items for synthetic servers/installation | Partial | 031 |
| 7 | Reporting Center | `/reports` | 13 reports, exports, schedules, presets | Preview, CSV/Excel, history, schedules | Export right | Preview = list = export counts; owner-only download | Full (API), Viewed (UI) | — |
| 8 | Clients | `/clients`, `/clients/new`, `/clients/:id`, `/clients/:id/edit` | Client master data, Client 360 | CRUD, sub-clients, project team, contacts, boundaries, archive, delete with dependents | M (create), E (edit parts) | Alias unique; name not unique | Full (API), Partial (UI) | 009, 011, 021 |
| 9 | Regions | `/regions/:id` | Regional structure | CRUD, environments per region | M | Renders | Viewed | — |
| 10 | Projects & contracts | `/projects`, `/projects/:id`, `/contracts`, `/contracts/new`, `/contracts/:id`, `/contracts/:id/edit` | Projects, contracts, SLA terms, fees, payments, milestones | CRUD, renewal state, SLA targets, payments | M (projects), E (contracts) | Date and payment rules enforced; reference not unique | Full (API), Partial (UI) | 009, 007, 031 |
| 11 | Environments | `/environments`, `/environments/new`, `/environments/:id`, `/environments/:id/edit` | Environment 360, reported condition | CRUD, condition reports, copy, archive | E | Out-of-order condition reports handled correctly | Full (API), Partial (UI) | 017 |
| 12 | Version matrix | `/versions` | Product versions per installation | Matrix, filters | M E R | Overflows below 1920 px | Viewed | 017 |
| 13 | Assets & totals | `/assets`, `/assets/:id`, `/components/:id`, `/installations/:id` | Servers, volumes, components, deployment | CRUD, volumes, hosted microservices, copy | E | Quantity and uniqueness rules enforced | Partial | — |
| 14 | Firewall rules | `/firewall-rules` | Recorded allowed communications | CRUD | Technical detail right | Port and same-client rules enforced; duplicates allowed | Partial | 009 |
| 15 | Products | `/products`, `/products/new`, `/products/:id`, `/products/:id/edit`, `/microservices/:id` | Product catalogue | Modules, features, microservices, versions, release notes | E | Renders; `/microservices/1` does not exist in seed | Viewed | — |
| 16 | Cases | `/cases`, `/cases/new`, `/cases/:id`, `/cases/:id/edit` | Incidents, requests and follow-ups; contractual SLA | Lifecycle, assign, waiting, due date, Jira refs, first response, contract link, impact | E (work), M (triage, reopen, priority) | Transitions enforced; closed cases editable; SLA can be rewritten | Full | 001–004, 006, 007, 010, 014, 015, 019, 021 |
| 17 | Commitments | `/commitments`, `/commitments/new`, `/commitments/:id` | Promises with deadlines | Create, revise, complete, cancel, reopen | E | Completion rules enforced; on-time result can be engineered | Full | 005–008, 010, 015, 032 |
| 18 | Escalations | `/escalations`, `/escalations/new`, `/escalations/:id`, `/escalations/:id/edit` | Client escalations and channels | Status path, communications, raise level | E | Status path enforced; target dates not validated against receipt | Full (API), Viewed (UI) | 012, 013 |
| 19 | Notes | `/notes` | Private notebooks | Notebooks, sections, pages, files, recycle bin | all | Private per user (404 for others, including the manager); HTML sanitised | Partial | — |
| 20 | Teams | `/teams`, `/teams/:id`, `/handovers`, `/handovers/:id`, `/reassignment` | Teams, coverage, ownership handover | Members, handover with acknowledgement, reassignment queue | M, team lead | Render with seed data | Viewed | 030 |
| 21 | Attachments | tab on 13 record types | Files on records | Upload, download, describe, delete | E upload, all read | Dangerous types refused; forced download; uploader-only delete | Full (API) | 029 |
| 22 | Search | header (`/` or Ctrl+K) | Global search | Clients, projects, cases, … | all | Finds synthetic records; safe with special characters | Partial | — |
| 23 | Administration — users, roles, rights, group mappings | `/admin/users`, `/admin/roles`, `/admin/rights`, `/admin/groups` | Access administration | Users, custom roles, rights matrix | Administer right | 403 for engineers; one role per user enforced | Full (API), Viewed (UI) | 034 |
| 24 | Administration — configuration | `/admin/config`, `/admin/config/:slug` (13 lists) | Configurable lists | Add, rename, order, retire | Administer | Renders | Viewed | — |
| 25 | Administration — system | `/admin/settings`, `/admin/policies`, `/admin/jira` | Settings, review policies, Jira instances | Edit | Administer | Renders | Viewed | — |
| 26 | Change history | `/admin/audit` | Audit trail | Field-level before/after | Audit right | Every tested change recorded with user and values | Partial | 033 |
| 27 | Archived records | `/admin/archived` | Restore | Restore with reason | Archive right | Archive and restore-reason rule verified | Partial | — |
| 28 | Deletion with dependents | dialog on records and rows | Remove a record tree | Preview, delete everything | Delete right | Works; weak safeguards | Full (API) | 011, 021 |
| 29 | Shell | all | Header, side menu, status bar, New menu, account selector (dev) | Navigation, drawer below 900 px | all | Clipped at 1366 px | Full | 016, 017 |
| 30 | Error pages | `*`, missing ids | Not found, forbidden | — | all | "Page not found" page; bare banner for missing records | Full | 023 |

## Not present in the product (searched for, not found)

Change management, problem management, knowledge base, shift log, implementation milestones/dependencies/go-live checklist, risk register, time tracking, customer portal, e-mail/chat delivery, monitoring integration, import functions (only exports exist), PDF export (declared "not available"). See TIO-DEV-AUDIT-030.

## Legacy routes

`/admin/reference`, `/admin/products` and `/admin/network-zones` remain in the router as redirects to newer pages; they were not tested individually.
