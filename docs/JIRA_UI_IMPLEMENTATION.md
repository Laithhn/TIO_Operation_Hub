# Jira integration: UI implementation and mockup comparison (A76)

The four approved mockups set layout and hierarchy; the VtWebGuiFramework and the existing screens set geometry and behavior.

**How this was checked:** screenshots at the mockups' width (1672 px) in headless Edge, against the real API on a throwaway database holding fictional Jira rows. No data came from a real Jira site. The database was dropped afterwards. Browser-level assertions are in `tests/e2e/jira-integration.spec.ts`.

## Screens

| # | Screen | Route | Source |
|---|---|---|---|
| 1 | Jira Connections | `/admin/integrations/jira` | `pages/jira/JiraConnections.tsx` |
| 2 | Client Jira integration | `/clients/:id?tab=jira` | `pages/jira/ClientJira.tsx` |
| 3 | Cases list extension | `/cases` | `pages/Cases.tsx` |
| 4 | Case details: Jira summary and details | `/cases/:id` | `pages/jira/CaseJira.tsx` |
| 5 | Case activity and comments | Timeline tab of `/cases/:id` | `pages/jira/CaseJira.tsx` |
| 6 | Jira import review | `/admin/integrations/jira/review` | `pages/jira/JiraAdminPages.tsx` |
| 7 | Jira conflict resolution, user and workflow mappings | `/admin/integrations/jira/conflicts` | `pages/jira/JiraAdminPages.tsx` |
| 8 | Synchronization monitoring | `/admin/integrations/jira/monitoring` | `pages/jira/JiraAdminPages.tsx` |

## Comparison with the four approved mockups

### Mockup 1: Jira Connections

All nine panels are present: summary cards, configured connections, connection details, credentials and security, test results, discovery configuration, sync health, discovered spaces, client usage.

| Deviation | Why |
|---|---|
| Cards and both tables span the full width, with the detail panels in three columns between them. The mockup has a wide left column of tables. | At the framework's text size, the mockup's column cut off Spaces, Sync health, Last test and Status. |
| Hub sidebar instead of the mockup's Overview / Integrations / Audit Logs / System Health list. | You asked to preserve existing navigation. Jira entries were added to the Administration sidebar. |
| No Jira Data Center connection type. | The brief is Jira Cloud only, and connections are limited to Cloud hosts. |
| Secret store shows "Encrypted on the server" or "Server environment variable", not Azure Key Vault. | Key Vault is not implemented (open decision 4). |
| Discovery mode shows "On demand", not "Automatic + On Demand". | Discovery runs when requested; only synchronization is scheduled. |
| "Run Health Check" is not a separate button. | *Run test* does this. |

### Mockup 2: Client Jira Integration

Summary cards, settings, assigned spaces, add space with validation, ownership checks, history, recent issues and imported data behavior are present.

| Deviation | Why |
|---|---|
| A tab on the client page, not the mockup's nested Client Configuration sidebar. | The client page already works by tabs, and the sidebar's other entries (General, Data & Sync, Access & Roles) do not exist as such. |
| The client page's existing header and Management panel stay above the tab. | Existing layout preserved; the Jira content starts lower than in the mockup. |
| Assigned spaces and history are full width. | Same text-size reason; Status was cut off otherwise. |
| Extra required settings: team, case type, priority, first review, import start. | A case needs them and Jira cannot supply them. |
| Checkboxes instead of toggles for the same settings. | The hub's existing control. |

### Mockups 3 and 4: Case details and activity

Jira summary, Jira details, "from Jira" owner label, unified activity with filter chips, source labels, the "Show system activity" switch and the local comment composer are present. Mockups 3 and 4 differ from each other in places; this follows mockup 3's banner and details panel and mockup 4's composer.

| Deviation | Why |
|---|---|
| Existing action buttons stay as they are, including Set waiting and Request validation. | Case actions preserved. |
| Jira references remain in their tab, not repeated in a side panel. | The tab already shows them with their type, and a second copy adds nothing. |
| Case status has no dropdown in the header (mockup 4). | A dropdown would bypass the case's required steps. Status changes through the existing actions. |
| Square corners and framework colors. | Framework tokens are the owner's decision (A68). |
| The Contractual SLA panel stays below the summaries. | Preserved; the mockups omit it, but the brief requires it. |

## Issues found by this comparison and fixed

- Jira links were in the Dashboard sidebar instead of Administration.
- Status and action columns were cut off on the connections, client and conflict screens.
- The cases list's Jira column was off-screen at this width, so it now follows Priority.
- Activity text sat against its source border.

## Not checked visually

The real Jira path: connection test, discovery, preview and sync-now were not clicked against a live site. The server side of these flows is covered through the API with the fake Jira, and the add-space panel and preview dialog are covered in the browser with intercepted, fictional responses.
