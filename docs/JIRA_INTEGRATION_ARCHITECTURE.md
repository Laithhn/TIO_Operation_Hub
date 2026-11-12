# Jira integration: architecture (A76, release 2.46.0)

```
System-level Jira connections → Client-level space configuration → Jira synchronization → Existing case rules → Existing cases
```

The integration is one-way: Jira Cloud to the hub. The hub never writes to Jira. **It has not yet run against a real Jira site**; see [JIRA_SYNC_OPERATIONS_GUIDE.md](JIRA_SYNC_OPERATIONS_GUIDE.md).

## Where the code is

| Part | File |
|---|---|
| Entities | `src/TioHub.Api/Modules/Jira/JiraEntities.cs` |
| Jira REST client, read-only guard, ADF conversion | `Modules/Jira/JiraApi.cs` |
| API token storage, site validation | `Modules/Jira/JiraSecrets.cs` |
| Issue classification, case creation, status and owner application, comments and activity | `Modules/Jira/JiraCaseBridge.cs` |
| Run engine, checkpoints, lease, dry run, 15-minute worker | `Modules/Jira/JiraSync.cs` |
| API | `Modules/Jira/JiraAdminEndpoints.cs`, `JiraClientEndpoints.cs`, `JiraCaseEndpoints.cs` |
| Model configuration and migration | `Data/HubDbContext.cs` (`ConfigureJira`), `Data/Migrations/*_JiraIntegration.cs` |
| Screens | `src/web/src/pages/jira/` |

## Findings from the repository audit that shaped the design

| Finding | Consequence |
|---|---|
| The case rules live in the minimal-API handlers; there is no service layer. | The synchronization calls the same `CaseEndpoints.Transition` and `AddEvent` helpers and `SaveChanges` path, so SLA evaluation, audit and assignment notices run as they do for a person. No status column is written directly. |
| `SaveChanges` re-evaluates the SLA of every touched case. | External Jira values live in `jira.JiraCaseMapping`, not on the case row. A Jira edit that changes nothing for the case does not touch the case, its row version or its SLA. |
| Enums are stored as strings by a model convention. | Filtered indexes and defaults use the string value (`[Status] = N'Open'`, `Origin` default `Manual`). |
| Foreign keys are `NO ACTION` by convention. | Case deletion removes comments and activity explicitly and clears the mapping's case id. The mapping stays, so a deleted case is not imported again. |
| A background scope has a system `UserContext`. | The worker needs no impersonation. Its changes are audited as `system`, and events have no person. |

## Data model

New schema `jira`, plus `work.CaseComment` and the `work.JiraReference.Origin` column. The migration only adds objects.

| Table | Purpose | Key rule |
|---|---|---|
| `JiraConnection` | One Jira Cloud site | Unique name and site |
| `JiraCredential` | Encrypted token | Not audited, never selected by a read API |
| `JiraDiscoveredSpace` | Spaces found by discovery | Discovery never assigns |
| `ClientJiraSettings` | Per-client settings and defaults | One per client |
| `ClientJiraSpace` | Space ownership | **Unique active `JiraConnectionId + JiraProjectId`** (filtered index) |
| `JiraSpaceSyncState` | Checkpoints and lease | One per assigned space |
| `JiraCaseMapping` | Issue to case, external values | **Unique `JiraConnectionId + JiraIssueId`**; one mapping per case |
| `JiraUserMapping` | Jira account to hub user | **Unique `JiraConnectionId + JiraAccountId`** |
| `JiraWorkflowStatusMapping` | Jira status to case status | Unique per connection, project and status; a null target means unmapped |
| `JiraComment`, `JiraActivity` | Imported, read-only | Unique external identity, so imports are idempotent |
| `CaseComment` | Local comments | No code path to Jira |
| `JiraSyncRun` | Run history | Scope-filtered by client |
| `JiraIntegrationIssue` | Review and conflict queue | One open row per fingerprint |

The spec's `JiraCommentMapping` and `JiraActivityMapping` are `JiraComment` and `JiraActivity`: the mapping and the content are one row.

## Jira API use

| Purpose | Request |
|---|---|
| Site reachability, Cloud ID | `GET /_edge/tenant_info` |
| Authentication, account time zone | `GET /rest/api/3/myself` |
| Space discovery | `GET /rest/api/3/project/search` |
| Workflow discovery | `GET /rest/api/3/project/{id}/statuses` |
| Custom field names | `GET /rest/api/3/field` |
| Issues | `POST /rest/api/3/search/jql` with `nextPageToken` |
| Moved or deleted issues | `GET /rest/api/3/issue/{id}` |
| Comments and changelog | `GET /rest/api/3/issue/{id}/comment`, `/changelog` |

- **Authentication:** Basic with e-mail and token. Unscoped tokens call the site; scoped tokens call `https://api.atlassian.com/ex/jira/{cloudId}`.
- **Read-only guarantee, three layers:** the `IJiraApiClient` interface has no writing operation; `JiraReadOnlyHandler` refuses everything except GET and the search POST before it leaves the server; tests cover both.
- **Queries:** the dry run uses `project = "TAH" ORDER BY updated DESC`. Runs use `ORDER BY updated ASC`, because the checkpoint must advance oldest to newest to resume after a stop or failure. JQL dates are converted to the API account's time zone, since JQL dates carry no zone.
- **Failures:** 429 honours `Retry-After` (capped at 5 minutes); 5xx and timeouts use bounded exponential backoff. Error text comes from the status only, never from headers or bodies.

## A run

1. Claim the space's lease by conditional update, so several servers run a space once. Abandoned runs are marked failed.
2. Read the account, field ids and credentials. A credential failure ends the run with no case touched.
3. Reapply pending owner and status changes, which needs no Jira request.
4. Page through issues. Each issue is read from Jira first, then applied in its own transaction.
5. Advance the checkpoint only up to the last issue before a failure, so failed issues are read again.
6. On a full reconciliation, check mapped issues the search no longer returned.
7. Record the run and release the lease.

Run types: `Initial` (first success), `Incremental`, `FullReconciliation` (default every 7 days, or after an adoption or a create-new decision). Manual runs are requested through the state row and picked up by the worker.
