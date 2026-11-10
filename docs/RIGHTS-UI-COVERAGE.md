# Rights coverage: screens and controls

Every screen and its controls, the right each needs in the browser, and the server operations behind it. The API operations themselves are in [RIGHTS-COVERAGE-MATRIX.md](RIGHTS-COVERAGE-MATRIX.md), where each one has its own decision. The browser checks here only decide what to show: **the server checks every request again.**

Route guards are in `src/web/src/rights.ts` (`canAccessPath`). Navigation in `ui/Shell.tsx` is built from the same function, so a menu item appears only when its page can open. An address typed by hand is refused the same way.

All record screens also depend on data scope (client, project or team). A record outside it answers 404.

## Public and session

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/login` | Sign-in page | Public | None. The page holds no data |
| `/account/password` | Change own password | Signed in | None. Own account only |

## Dashboard

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/my-dashboard` | My dashboard. Start page for anyone who holds this right and can't coordinate clients | `MyDashboard:View` (requires `Cases:View`) | Only the person's own work |
| `/` | Executive overview | `Dashboard:View` (requires every business module's View) | Dashboard API |
| `/overview` | Executive overview, at its own address for those who start on My dashboard | As `/` | Dashboard API |
| `/map` | Client map | `ClientMap:View`, `Dashboard:View` | Dashboard API |
| `/dashboards/operational` | Operational dashboard (A108) | `OperationalDashboard:View` (requires `Dashboard:View`) | Dashboard API; scope-filtered |
| `/dashboards/sla` | SLA & Contracts dashboard (A108) | `SlaContractsDashboard:View` (requires `Dashboard:View`) | Dashboard API; scope-filtered |
| `/dashboards/management` | Management dashboard (A108) | `ManagementDashboard:View` (requires `Dashboard:View`) | Dashboard API; scope-filtered |
| `/dashboards/project` | Project dashboard (A108). *Update status* is shown with `Projects:Maintain` in the client's scope | `ProjectDashboard:View` (requires `Dashboard:View`); recording needs `Projects:Maintain` | Project and status-report API; scope-filtered |
| `/actions` | Action list | `ActionList:View`, `Dashboard:View` | Actions API |
| `/notifications` | Notifications; bell in the top bar | `Notifications:View`. Mark read `Notifications:Maintain`, dismiss `Notifications:Delete` | Own notices, filtered by source record |
| `/data-quality` | Data quality | `DataQuality:View`, `Dashboard:View`. Accept or dismiss `DataQuality:Maintain` | Findings filtered by scope |
| `/admin/audit` | Change history | `AdminAudit:View` (requires `Platform:Audit`) | Filtered by scope. Access entries also need `Platform:Administration` |

## Clients

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/clients` | Client list | `ClientStructure:Access`, plus a tab right or attachments or history | List filtered by scope. Columns per module View |
| `/clients/new` | New client | `ClientStructure:View`, `ClientStructure:Create` |  |
| `/clients/:id` | Client page shell | As the client list; tab chosen from those held | `GET /clients/{id}/overview` checks the tab's right |
| `/clients/:id?tab=structure` | Regions & environments tab | `tab.ClientStructure.structure:View` | Create, edit, archive, delete: `tab.ClientStructure.structure:*` and the matching `ClientStructure:*` |
| `/clients/:id?tab=organizations` | Organizations tab | `tab.ClientStructure.organizations:View` | `tab.ClientStructure.organizations:*`; relationships also `ClientStructure:Coordinate` |
| `/clients/:id?tab=projects` | Projects tab | `tab.ClientStructure.projects:View` | `Projects:*` |
| `/clients/:id?tab=contracts` | Contracts & SLAs tab | `tab.ClientStructure.contracts:View` | `Contracts:*` |
| `/clients/:id?tab=cases` | Cases tab | `tab.ClientStructure.cases:View` | `Cases:*` |
| `/clients/:id?tab=commitments` | Commitments tab | `tab.ClientStructure.commitments:View` | `Commitments:*` |
| `/clients/:id?tab=escalations` | Escalations tab | `tab.ClientStructure.escalations:View` | `OtherOperations:*` |
| `/clients/:id?tab=contacts` | Contacts & responsibilities tab | `tab.ClientStructure.contacts:View` | `tab.ClientStructure.contacts:*`, `OtherOperations:*` |
| `/clients/:id?tab=infra` | Infrastructure tab | `tab.ClientStructure.infra:View` | `Servers:*` |
| `/clients/:id?tab=jira` | Jira integration tab | `tab.ClientStructure.jira:View` | Changes also need `ClientStructure:Coordinate` for this client. CSV also `Platform:Export` |
| `/clients/:id?tab=notes` | My notes tab | `tab.ClientStructure.notes:View` | Own notes only |
| `/clients/:id?tab=files` | Attachments tab | `ClientStructure:AttachmentsView` | Upload, delete own, delete any: `ClientStructure:Attachments*` |
| `/clients/:id?tab=history` | History tab | `ClientStructure:HistoryView` (requires `Platform:Audit`) |  |
| `/clients/:id/edit` | Edit client | `ClientStructure:DetailsView`, `ClientStructure:Maintain` |  |
| `/regions/:id` | Region | `tab.ClientStructure.structure:View`, `ClientStructure:DetailsView` |  |
| `/projects, /projects/:id` | Projects | `Projects:View`; detail `Projects:DetailsView` | Actions `Projects:*` |
| `/contracts, /contracts/new, /contracts/:id, /contracts/:id/edit` | Contracts, payments, penalties | `Contracts:View`; `:Create`; `:DetailsView`; `:Maintain` (may be limited to a scope) | Penalty review `Contracts:Coordinate`, full client scope |
| `/environments, /environments/new, /environments/:id, /environments/:id/edit` | Environments and their tabs | `Environments:View`; `:Create`; `:DetailsView`; `:Maintain` (may be limited to a scope) | Tabs `tab.Environments.*:View`. Condition report `tab.Environments.conditions:Create` |
| `/installations/:id, /components/:id` | Installations and components | `Installations:DetailsView`, `Servers:DetailsView` | `Installations:*`, `Servers:*` |
| `/versions` | Version matrix | `Installations:View`, `Products:View` |  |
| `/assets, /assets/:id` | Servers and assets | `Servers:View`; `:DetailsView` | `Servers:*`. Network zone field `Platform:TechnicalDetail` |
| `/firewall-rules` | Firewall rules | `OtherOperations:View`, `Platform:TechnicalDetail` | Create `OtherOperations:Create`; edit, delete `OtherOperations:Maintain`; both endpoint servers visible |
| `/admin/archived` | Archived records | Any `*:ArchiveRestore` | Reads per record type; restore `<module>:ArchiveRestore` and full client scope |

## Products

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/products, /products/new, /products/:id, /products/:id/edit, /microservices/:id` | Products, modules, features, versions, microservices, developers | `Products:View`; `:Create`; `:DetailsView`; `:Maintain` | Delete buttons `Products:Delete` |

## Cases and commitments

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/cases, /cases/new, /cases/:id, /cases/:id/edit` | Cases and their tabs | `Cases:View`; `:Create`; `:DetailsView`; `:Maintain` | Tabs `tab.Cases.*:View`. Triage, assign, reopen `Cases:Coordinate`. Jira references `tab.Cases.jira:*`. Workflow buttons come from the record's `permissions` flags, decided on the server |
| `/commitments, /commitments/new, /commitments/:id` | Commitments | `Commitments:View`; `:Create`; `:DetailsView` | Revise, complete, cancel, reopen: `Commitments:Maintain` (may be limited to a scope). Assign someone else `Commitments:Coordinate` |
| `/escalations, /escalations/new, /escalations/:id, /escalations/:id/edit` | Escalations | `OtherOperations:View`; `:Create`; `:DetailsView`; `:Maintain` | Change owner `OtherOperations:Coordinate` |

## Teams

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/teams, /teams/:id` | Teams and coverage | `Teams:View`; `:DetailsView` | Create `Teams:Create`; members and coverage `Teams:Coordinate` |
| `/handovers, /handovers/:id` | Handovers | `Handovers:View`, `Teams:View` | Create `Handovers:Create`; acknowledge, cancel, exception `Handovers:Maintain`; source module Coordinate and full scope |
| `/reassignment` | Reassignment queue | `Reassignment:View`, `Teams:View` | Rows filtered by source module |

## Notes

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/notes` | Personal notes | `PersonalNotes:View` | `PersonalNotes:Create`, `:Maintain`, `:Delete`, `:Download`. Own notes only |

## Reporting Center

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/reporting-center` | Overview | `Platform:Export`, `ReportOverview:View` | Stricter than the API, which needs only the View rights. Reports hold nothing without an export right |
| `/reporting-center/library` | Report library | `Platform:Export`, `ReportLibrary:View` | Run `ReportLibrary:Export` and each source's `:View`, `:Export`. Presets `ReportLibrary:Create`, `:Delete` |
| `/reporting-center/builder/cases` | Cases report builder | `Platform:Export`, `ReportBuilder:View` | Export `ReportBuilder:Export`, `ReportHistory:Create`, `Cases:Export` |
| `/reporting-center/my-reports` | My reports | `Platform:Export`, `SavedReports:View` | `SavedReports:Create`, `:Maintain`, `:Delete`. Owner only |
| `/reporting-center/schedules` | Scheduled reports | `Platform:Export`, `ReportSchedules:View` | `ReportSchedules:Create`, `:Maintain`, `:Delete`. Recipients are re-checked at run time |
| `/reporting-center/history` | Export history | `Platform:Export`, `ReportHistory:View` | Download `ReportHistory:Download` and a current access fingerprint. Everyone's exports `Platform:Audit` |
| `/reporting-center/templates` | Templates | `Platform:Export`, `ReportTemplates:View` |  |
| `Export CSV button on any list` | List export | `Platform:Export` and the module's `:Export` |  |

## Administration

| Screen or address | What it is | Browser needs | Controls and server |
|---|---|---|---|
| `/admin/users` | Users: list, create, edit, roles, data scope, deactivate, reactivate, delete, password options | `AdminUsers:View`. Buttons `AdminUsers:Create`, `:Maintain`, `:Delete` | Grant ceiling, self-change, last-administrator checks. Password reset needs every active right and all scope |
| `/admin/roles` | Roles: list, create, clone, edit, activate, delete, holders, comparison | `AdminRoles:View`. Buttons `AdminRoles:Create`, `:Maintain`, `:Delete`. Holders also `AdminUsers:View` | Protected role, self-change, grant ceiling |
| `/admin/rights` | Rights: catalog and role grants | `AdminRoles:View`. Editing `AdminRoles:Maintain` | Reviewed before saving; optimistic concurrency |
| `/admin/access` | Access review: effective rights and their sources, individual exceptions, check access, incompatible roles | `AdminUsers:View` or `AdminRoles:View`. Exceptions `AdminUsers:Maintain` and every active right | Check access never runs an operation |
| `/admin/groups` | Directory group mappings. Hidden in Forms mode | `AdminGroups:View`. Buttons `AdminGroups:Create`, `:Maintain` | Own group refused; all active rights to change roles |
| `/admin/config, /admin/config/:slug, /admin/config/category/:category, /admin/policies, /admin/jira` | Configuration lists, review policies, Jira instances | `AdminConfig:View`. Buttons `AdminConfig:Create`, `:Maintain`, `:Delete` |  |
| `/admin/settings` | Settings and attachment storage | `AdminSettings:View`, `:Maintain` |  |
| `/admin/integrations/jira, /review, /conflicts, /monitoring` | Jira connections, import review, conflicts, monitoring | `AdminIntegrations:View`, `:Create`, `:Maintain` | Reassign a space also `ClientStructure:Coordinate`; resolve an issue also `Cases:Coordinate` |

## Background work

| Work | Identity | How rights apply |
|---|---|---|
| SLA sweep, notification scan, data quality scan, Jira synchronization | System. No user | Holds no right and exposes nothing by itself. Notices it creates are filtered by the reader's rights when read |
| Report scheduler and export worker | Runs for the requester or recipient | Resolves that person's current rights and scope again before each run, and refuses a run if access changed. Direct roles only for scheduled exports: a directory role that could change the result refuses the run |
| Startup | System | Synchronizes `iam.RightDefinition` from the catalog. Never changes a role's grants |

## Every right check in the browser code

Generated from the source on 3 November 2026, to check that nothing above was missed. Each line is a control or a section that reads a right.

| File | Rights read |
|---|---|
| `App.tsx` | `Platform:Administration` |
| `configRegistry.ts` | `Platform:Administration` |
| `exportRights.ts` | `Platform:Export`, `ReportHistory:Create`, `ReportHistory:Download`, `ReportHistory:View`, `Reporting:View` |
| `pages/AccessControl.tsx` | `AdminUsers:Maintain` |
| `pages/AccessRoleConflicts.tsx` | `AdminRoles:Maintain` |
| `pages/Admin.tsx` | `AdminConfig:Create`, `AdminConfig:Maintain`, `AdminGroups:Create`, `AdminGroups:Maintain`, `AdminRoles:Create`, `AdminRoles:Delete`, `AdminRoles:Maintain`, `AdminSettings:Maintain`, `AdminUsers:Create`, `AdminUsers:Delete`, `AdminUsers:Maintain`, `AdminUsers:View`, `Platform:Administration`, `Platform:Audit` |
| `pages/Cases.tsx` | `Cases:Coordinate`, `Cases:Create`, `Commitments:Create`, `OtherOperations:Create`, `tab.Cases.jira:Create`, `tab.Cases.jira:Delete` |
| `pages/Clients.tsx` | `Cases:View`, `ClientStructure:ArchiveRestore`, `ClientStructure:Create`, `ClientStructure:Maintain`, `ClientStructure:View`, `Commitments:View`, `Contracts:Create`, `Environments:Create`, `Environments:View`, `Installations:View`, `OtherOperations:Create`, `OtherOperations:Maintain`, `Platform:Audit`, `Products:View`, `Projects:Create`, `Servers:View`, `Teams:View`, `tab.ClientStructure.contacts:Create`, `tab.ClientStructure.contacts:Maintain`, `tab.ClientStructure.structure:ArchiveRestore`, `tab.ClientStructure.structure:Create`, `tab.ClientStructure.structure:Maintain` |
| `pages/Commitments.tsx` | `Commitments:Coordinate`, `Commitments:Create` |
| `pages/Configuration.tsx` | `AdminConfig:Create`, `AdminConfig:Maintain`, `Platform:Administration` |
| `pages/Contracts.tsx` | `Contracts:Coordinate`, `Contracts:Create`, `Environments:View`, `Products:View` |
| `pages/Dashboard.tsx` | `ClientStructure:Coordinate` |
| `pages/Environments.tsx` | `Environments:ArchiveRestore`, `Environments:Create`, `Installations:Create`, `Projects:Coordinate`, `Projects:View`, `Servers:Create`, `tab.Environments.conditions:Create` |
| `pages/Escalations.tsx` | `OtherOperations:Coordinate`, `OtherOperations:Create` |
| `pages/Firewall.tsx` | `OtherOperations:Create`, `OtherOperations:Maintain`, `Platform:TechnicalDetail` |
| `pages/Inventory.tsx` | `Environments:Create`, `Installations:ArchiveRestore`, `Installations:Create`, `Installations:Maintain`, `Platform:Administration`, `Platform:TechnicalDetail`, `Servers:ArchiveRestore`, `Servers:Create`, `Servers:Maintain` |
| `pages/Notes.tsx` | `PersonalNotes:Create`, `PersonalNotes:Delete`, `PersonalNotes:Maintain` |
| `pages/Notifications.tsx` | `Notifications:Delete`, `Notifications:Maintain` |
| `pages/OrganizationStructure.tsx` | `ClientStructure:Coordinate`, `tab.ClientStructure.organizations:Create`, `tab.ClientStructure.organizations:Maintain` |
| `pages/Products.tsx` | `Products:Create`, `Products:Delete` |
| `pages/Quality.tsx` | `DataQuality:Maintain`, `OtherOperations:Maintain` |
| `pages/Reports.tsx` | `Platform:Audit`, `Platform:Export`, `ReportBuilder:View`, `ReportHistory:Maintain`, `ReportLibrary:Create`, `ReportSchedules:Create`, `ReportSchedules:Delete`, `ReportSchedules:Maintain` |
| `pages/Teams.tsx` | `Handovers:Create`, `Teams:Coordinate`, `Teams:Create` |
| `pages/common.tsx` | `ClientStructure:View`, `Platform:Audit`, `Products:View`, `Teams:View` |
| `pages/jira/ClientJira.tsx` | `Cases:View`, `Platform:Export` |
| `pages/jira/JiraAdminPages.tsx` | `AdminIntegrations:Maintain` |
| `pages/jira/JiraConnections.tsx` | `AdminIntegrations:Create`, `AdminIntegrations:Maintain` |
| `pages/reporting/MyReports.tsx` | `SavedReports:Create`, `SavedReports:Delete`, `SavedReports:Maintain` |
| `ui/ClientLogo.tsx` | `ClientStructure:DetailsView`, `ClientStructure:View` |
| `ui/Shell.tsx` | `AdminIntegrations:View`, `Cases:Create`, `ClientStructure:Create`, `Commitments:Create`, `Environments:Create`, `Notifications:View`, `OtherOperations:Create`, `Platform:Administration`, `Platform:Audit`, `Platform:Export`, `Platform:TechnicalDetail`, `Products:Create` |
| `ui/kit.tsx` | `Platform:Export` |
