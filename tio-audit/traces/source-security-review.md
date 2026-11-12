# Supplemental source review: security, metrics and operational readiness

Audit date: 10 November 2026 (Asia/Dubai). This file records read-only inspection of the local repository. It is **not evidence that this checkout matches the deployed application**. No database was queried or changed, no service was started, and no migration or automated test was executed. Subsequent authorized anonymous HTTP observations are recorded separately in `anonymous-http-observations.json` and `.md`. Source presence and existing test names are not test passes. No live defect is confirmed by this source-review file. The lead auditor observed deployed version 2.59.0; this checkout contains A109/2.60.0 client-dashboard changes, so those must not be projected onto the deployed UI.

## Sources inspected

Required project guidance: `README.md`, `docs/DECISIONS.md`, `docs/DESIGN-RULES.md`, `docs/IMPLEMENTATION-PLAN.md`, `docs/OPERATIONS.md`. Focused code: `Program.cs`, security endpoint/policy/context/credential implementations, `HubDbContext`, error handling and readiness, audience dashboard handlers/calculators, SLA clocks, reporting export access, frontend sign-in/API handling. References below use repository-relative paths and one-based lines.

## Verified source facts — authentication and session behavior

| ID | Source fact | Evidence | What remains to test on deployment |
|---|---|---|---|
| SRC-SEC-01 | Forms, Windows and Development authentication modes exist. Development mode refuses startup outside Development/Testing. | `src/TioHub.Api/Program.cs:41` | Which mode is deployed; production environment guard configuration. |
| SRC-SEC-02 | Forms session cookie is named `TioHub.Session`, HttpOnly, SameSite Strict, Secure when the request is HTTPS, nonpersistent; sliding expiry defaults to 480 minutes, minimum 5. | `Program.cs:66`; `Security/AuthEndpoints.cs:257` | Actual Set-Cookie attributes, proxy HTTPS awareness, idle expiry and browser-session restoration behavior. Do not record cookie values. |
| SRC-SEC-03 | Session validation compares an account's active/login-enabled state and DB session stamp; password changes/resets rotate the stamp. | `Security/AuthEndpoints.cs:242`, `:276` | Approved test account reset/deactivation invalidates all sessions; not authorized on existing live users. |
| SRC-SEC-04 | Login uses one generic failure message and configurable account lockout; known unlocked credentials increment failed attempts and eventually lock. | `Security/AuthEndpoints.cs:27`, `:48` | No credential attacks or deliberate live lockout were performed. Approved isolated test accounts are needed. |
| SRC-SEC-05 | Passwords use PBKDF2-HMAC-SHA256 with 600,000 iterations, random 16-byte salt and fixed-time comparison. Policy checks length 12–128, outer whitespace, account-name inclusion and character diversity. | `Security/Passwords.cs:31`, `:58` | Storage/deployment handling and reset journey; source hashing code is not verification of current stored credentials. |
| SRC-SEC-06 | First-administrator setup writes a random one-time server-local file when needed; source logs the path, not its code. The file is consumed after setup. | `Security/Passwords.cs:77`; `Security/AuthEndpoints.cs:90` | File ACLs and disaster recovery procedure need authorized infrastructure review. Never read or expose the setup code. |
| SRC-SEC-07 | Temporary-password users are limited by middleware to `/me` and `/auth/password`, in addition to anonymous auth routes. | `Security/AuthEndpoints.cs:24`; `Security/SignIn.cs:312` | Approved temporary-account journey, deep link denial and mandatory-change UI. |
| SRC-SEC-08 | Public `/api/v1/auth/config` issues antiforgery tokens and reports auth mode, setup-required flag and password policy. Every non-GET/HEAD/OPTIONS `/api` request requires antiforgery validation. | `Security/AuthEndpoints.cs:40`; `Program.cs:184` | GET auth/config is a suitable read-only discovery action. POST login/logout/password/setup remain gated by task authorization. |
| SRC-SEC-09 | Frontend reads XSRF cookie into a request header and sends same-origin credentials; expired protected requests redirect to sign-in preserving the route. Sign-out posts to the server then navigates to sign-in. | `src/web/src/api.ts:37`, `:48`, `:61`, `:84` | Logout, browser Back, session expiry and cache behavior require an approved session. |

## Verified source facts — authorization and data boundaries

| ID | Source fact | Evidence | Test implication |
|---|---|---|---|
| SRC-RBAC-01 | Fallback policy requires authentication. All mapped `/api/v1` operations share `EndpointRightsFilter`; a route with no registered policy is refused. | `Program.cs:83`, `:201`; `Security/EndpointRights.cs:424` | Compare anonymous protected GETs with public auth/health; then compare approved user roles. |
| SRC-RBAC-02 | Fixed endpoint rights are checked before the handler. Record-specific checks add rights/scope constraints in handlers. Denied rights are logged and an access-denied audit event is attempted; audit failure cannot convert denial to permission. | `Security/EndpointRights.cs:435` | UI hiding alone cannot prove server enforcement. Do not claim endpoint coverage from table presence. |
| SRC-RBAC-03 | Roles are unioned; active direct exceptions, prerequisites, role-conflict rules and expiry affect effective rights. Data scope is independent. Scoped allow does not add visibility. | `Security/UserContext.cs:20`, `:95`; `Security/SignIn.cs:353` | Need approved accounts with different scopes, denied module rights and expired exceptions. Never change production permissions for testing. |
| SRC-RBAC-04 | EF entities use named scope filters and separate archive filters. Project scope exposes a client summary and linked records; full client scope is distinct. | `Data/HubDbContext.cs:309`, `:340`, `:424`, `:696`, `:1239`; `Security/UserContext.cs:129` | Validate list/detail/search/export consistency on approved scoped data. No ID enumeration is justified by this review. |
| SRC-RBAC-05 | Business-module views constrain report readability; resource export rights supplement report visibility. Export worker re-resolves requester access and verifies an access fingerprint for queued requests. | `Security/RightChecks.cs:11`, `:53`; `Modules/Reporting/ExportWorker.cs:122`; `ExportAccessFingerprint.cs:10` | Existing report preview/download can be assessed read-only only when approved; creating an export job changes history and requires safe data authorization. |
| SRC-RBAC-06 | Access administration mutations acquire a DB lock and re-resolve/re-check the administrator and endpoint rights. | `Security/AuthorizationAdministrationFilter.cs:9` | Concurrent administrative safety requires isolated test data; no production mutation was attempted. |
| SRC-RBAC-07 | New audience dashboard routes exist. Client status reporting requires `Projects:Maintain` in full client scope. Code explicitly calls this an owner-reviewable A109 business decision. | `Modules/Reporting/AudienceDashboardEndpoints.cs:82`; `Modules/Reporting/ClientInsight.cs:354`; `docs/DECISIONS.md` A109 | Confirm whether Projects maintainers are the intended client-status owners; classify as business decision, not defect. |

## Verified source facts — data integrity and error handling

Entity row versions are EF concurrency tokens (`Data/HubDbContext.cs:1229`). Error handling maps missing versions to 428, concurrent edits to 412, duplicates to neutral 409, field validation to 422, missing/out-of-scope records to 404, and access denial to 403 (`Common/Errors.cs:8`, `:115`). Problem responses include a trace identifier (`Common/Errors.cs:105`). Generic unhandled failures return a short support message, while full exceptions are sent to the logger (`Common/Errors.cs:164`). These are code paths, not executed live assertions.

Credentials are excluded from automatic business change-history serialization (`Data/HubDbContext.cs:1487`). Password operations use explicit event names without password values (`Security/AuthEndpoints.cs`). Record-level audit creation is in the save pipeline (`Data/HubDbContext.cs:1576`). The operating guide specifies SQL permissions denying UPDATE/DELETE on audit records (`docs/OPERATIONS.md:31`); actual application-login permissions were not inspected.

## Metric definitions useful for live reconciliation

| Metric or signal | Definition verified in source | Evidence and live validation constraint |
|---|---|---|
| SLA compliance | `met / (met + breached) * 100`, rounded to one decimal. Zero measured obligations returns null, not 0 or 100. Pending/not measurable are excluded from the denominator. | `Modules/Reporting/ClientInsight.cs:78`; reconcile with response/resolution obligations, not ticket count. |
| SLA comparison | SLA & Contracts groups client tickets with contracts by opening time (`SlaClockStartAt ?? CreatedAt`), excludes cancelled cases, compares prior period of equal elapsed length, uses current states and treats overdue Pending as breached. | `SlaContractsDashboard.cs:46`; `Modules/Work/CaseSla.cs:253`. This is a current-state cohort comparison, not a historical snapshot of each period's result. |
| SLA clocks | Calendar windows in the contract time zone, selected weekdays/overnight support windows, union of overlapping pauses and windows; holidays are explicitly not modelled. Deadlines consume counted minutes; snapshots preserve terms at assignment/priority change. | `Modules/Work/CaseSla.cs:9`, `:18`, `:77`, `:105`, `:134`. Actual contract calendars/data still need review. |
| Resolution definition | First move into Pending validation/Closed; rejected validation clears resolution; later reopen preserves first resolution. | `Modules/Work/CaseSla.cs:134`. Distinguish this contractual policy from final closure elapsed time. |
| Management time to closure | Median days from opening to recorded closing time for currently Closed tickets closed in the selected period; null with no records. | `ManagementDashboard.cs:41`, `:69`. Do not call this arithmetic-mean MTTR or MTTA. |
| Backlog history | Uses current status plus creation/closure/cancellation times; explicitly does not replay close/reopen history and cannot date closed tickets without a closing time. Latest point equals current open backlog. | `ManagementDashboard.cs:65`, `:188`. This is a disclosed reporting limitation, not proof of a live defect. |
| Commitment timeliness | Of completed commitments in the period, counts `CompletedLate != true` as on time. | `ManagementDashboard.cs:97`. Validate whether any completed records have unknown lateness before judging this treatment. |
| Commercial amounts | Open payments are grouped per currency; no addition across currencies in this dashboard. | `SlaContractsDashboard.cs:138`. Check visible UI/export currency labels. |
| Client status | Human-recorded status remains separate from seven rule-based signals; absent facts can be Unknown and do not automatically imply On track. Manual environment condition is not live monitoring. | `ClientInsight.cs:64`, `:108`, `:188`. Check stale/not-reported treatment and drilldown counts using visible records. |

## Operational readiness facts and unresolved evidence

- Health live and ready routes are public. Readiness checks DB reachability and all application migration IDs, uses a 15-second cancellation, returns sanitized state and never applies migrations (`Program.cs:192`; `Data/DatabaseReadiness.cs:26`). Health success alone would not establish workflow readiness.
- Startup can apply migrations if explicitly configured; then it checks schema, synchronizes rights metadata, seeds reference data and runs SLA/Jira reconciliation backfills (`Program.cs:110`). **Starting this API is not a read-only audit action.** No local API was started for this review.
- Hosted services include data quality, notifications, SLA sweep, report scheduler/export worker and Jira synchronization (`Modules/ModuleRegistration.cs:41`). Jira sync is gated by enabled configuration and spaces (`Modules/Jira/JiraSync.cs:366`). `docs/OPERATIONS.md:88` says the shipped global Jira setting is now on and restored copies must explicitly set `Jira__Enabled=false`.
- Normal API responses are assigned no-store plus CSP, nosniff, same-origin referrer, frame denial and restrictive Permissions-Policy (`Program.cs:234`). HSTS/HTTPS redirection are enabled outside Development/Testing (`Program.cs:162`). Actual proxy headers, TLS certificate validity and deployment response headers still need inspection.
- Request log template uses path, method, status and duration rather than query/body (`Program.cs:153`). Operational guide documents 31-day rolling logs (`docs/OPERATIONS.md:188`). Retention, access control, collection and alerting in production are unverified.
- Reporting instrumentation includes preview, queue-wait and export duration histograms, and job/download counters (`Modules/Reporting/ExportWorker.cs:26`). No evidence here establishes a metrics collector, SLO alert, performance baseline or production response time.
- The guide leaves RPO/RTO/retention/hosting decisions with owners and calls for a production-like restore drill (`docs/OPERATIONS.md:192`, `:216`). The recorded 0.3-second development drill is historical documentation, not an audit result or a production recovery estimate.
- The same guide's access-control upgrade section states that listed migrations were not DB-verified as part of that historic change (`docs/OPERATIONS.md:74`). This should prompt release-evidence reconciliation, not an assumption that the deployed database is currently unverified.
- There are time-layered guide statements: the general rollback table says migrations are additive (`docs/OPERATIONS.md:223`), while specific releases explicitly update existing Jira times/data and require a pre-deployment backup (`:84`, `:108`, `:116`). Use release-specific recovery evidence; do not interpret the generic additive sentence as assurance of zero data transformation.

## Suspected source risks — not confirmed live defects

| Reference | Observation/hypothesis | Safe verification or next action |
|---|---|---|
| SRC-RISK-01 | `ProblemWriter.WriteAsync` calls `Response.Clear()` (`Common/Errors.cs:96`) after the security middleware normally assigns headers. Framework response clearing may remove CSP, no-store and related headers from handled API error responses. | Capture headers from an ordinary safely observable error/denial and compare with a successful API GET. Do not induce service failure or invalid live writes. If verified, preserve/reapply security headers using response-start callbacks and add a focused regression test. |
| SRC-RISK-02 | Session cookies use SecurePolicy SameAsRequest, depending on correct HTTPS recognition. | Inspect actual HTTPS Set-Cookie attributes and proxy configuration; do not claim unsafe cookies from source alone. |
| SRC-RISK-03 | Error logger is passed the full exception despite a nearby comment about avoiding input in messages (`Common/Errors.cs:164`). Exceptional dependency messages can include sensitive values. | Authorized server-log/config review and isolated crafted errors; never expose connection strings or induce production faults. |
| SRC-RISK-04 | Historical backlog is intentionally approximate for reopened cases; cohort compliance uses current outcomes, so previous-period values may change as obligations finish. | Confirm labels/disclosures and whether leadership needs an immutable as-of report. Treat additional reporting as enhancement unless an approved requirement says otherwise. |

## Prioritized safe live checks for the lead auditor

1. Identify auth requirements using the actual browser and GET `/api/v1/auth/config`; record browser/network blockers before assuming an application defect.
2. Compare anonymous GET `/api/v1/me` and one representative protected list with public health/auth endpoints. Expect no business payload to an unsigned user. A 401/403 is not a UI defect by itself.
3. Record safe response metadata: status, content type, security headers, caching, timing and cookie attribute names/flags. Redact cookie/token values. Separate transport failure from HTTP server errors.
4. Use only an existing authorized session to inspect modules, visible read-only details, audit history, report previews and source-of-truth list totals. Do not create export/schedule jobs, mark notifications read, run scan/sync, download restricted files or change settings merely to improve coverage.
5. With approved scoped accounts/data, compare navigation and deep-link denial, list/detail/search results and export access. With no such accounts, mark role comparison and scope isolation Blocked.
6. Compare each KPI with its matching filtered list and denominator. Distinguish contractual first resolution from median creation-to-final-closure, and manual health reports from monitoring.
7. If target cannot be reached or authentication unavailable, preserve scope as source-supported hypotheses, mark operational dimensions Not Rated and release decision Insufficient Evidence.

## Existing test assets found, not executed

`tests/TioHub.Tests/AudienceDashboardTests.cs`, `SlaTests.cs`, `SlaAcceptanceTests.cs`, `DataScopeTests.cs`, `GranularAuthorizationTests.cs`, `ScheduledExportAccessTests.cs`, `PasswordResetAuthorizationTests.cs`, `AuthorizationBoundarySqlIntegrationTests.cs`, `ExportHistoryScopeTests.cs` and other scope tests exist. Some use SQL integration fixtures. Their presence is useful for future approved regression work and does not substantiate current live behavior. No test count or pass claim should be derived from these filenames.

## Review completion

This reviewer changed only supplemental files under `tio-audit/traces/`. Application source, production configuration, roles, seed data and schema are unchanged. No database impact. Suggested next action: combine this source context with actual browser/HTTP evidence, then schedule approved test accounts/data and recovery evidence where live coverage is blocked.
