# 09 — Technical architecture review

Scope: static review of `src/TioHub.Api` (about 10,300 lines without migrations), `src/web/src` (about 10,000 lines), tests and build scripts, supported by runtime observation. **Code-review risks** are separated from **defects confirmed at run time**. No source file was modified.

## Architecture as built

| Layer | Implementation | Assessment |
|---|---|---|
| API | ASP.NET Core 10 minimal APIs, one static `*Endpoints` class per module, `/api/v1`, OpenAPI | Simple and explicit; too much logic inside route lambdas |
| Persistence | EF Core 10, SQL Server, global query filters for scope and archive, audit written in the save hook in the same transaction, row-version concurrency | Solid core: audit and concurrency are centralised and worked in every test |
| Security | Fallback policy "authenticated", per-request `UserContext`, rights flags, antiforgery on every non-GET, CSP and security headers, Problem Details errors with trace id | Good baseline |
| Front end | React 18, React Router 7, TanStack Query, hand-written CSS kit, thin `api.ts` (ETag → If-Match, XSRF header, error mapping) | Clean and small; no state library needed |
| Background work | Four `BackgroundService` loops in the web process | Single-instance assumption |
| Tests | 140 xUnit tests against a real SQL Server, 44 Playwright journeys | Good breadth for the time spent; not portable, no CI |

## Strengths (verified)

- One error model (`Common/Errors.cs`): 404 for missing *and* inaccessible records, 409/412/422/428 used consistently, no stack traces or SQL in responses.
- Optimistic concurrency on every state change tested.
- Audit trail produced centrally, with before/after values, user and reason.
- Input hardening: secret detection in free text, HTML sanitiser for notes, CSV formula neutralisation, attachment allow-list, file names never used on disk.
- Development sign-in refuses to start outside Development/Testing (`Program.cs`), development settings are excluded from publish (`TioHub.Api.csproj`).
- Query strings are not logged.

## Confirmed at run time (see issue register)

| Finding | Location | Issue |
|---|---|---|
| SLA snapshot recomputed on priority change without protecting completed obligations | `Modules/Work/CaseSla.cs:119, 228–236` | 001 |
| Contract link, first response, edit and due-date endpoints lack state rules | `Modules/Work/CaseEndpoints.cs:175–216, 349–386, 507–523` | 002–004 |
| Commitment edit lacks status guard; timeliness uses the deadline in force | `Modules/Commitments/CommitmentEndpoints.cs:141, 172, 204, 267` | 005, 008, 015 |
| `RequireMaintain` ignores the responsible-user arguments | `Modules/Shared/Services.cs:76–81` | 010 |
| Cascade delete without version check | `Modules/Shared/Cascade.cs:295–296` | 011 |
| Escalation date validation incomplete | `Modules/Escalations/Escalations.cs:288–289` | 012 |
| Tests bound to Windows authentication | `tests/TioHub.Tests/HubFactory.cs:21, 47` | 026 |

## Code-review risks (not reproduced as failures)

| # | Risk | Location | Assessment |
|---|---|---|---|
| R1 | **Workflow rules are scattered.** Each endpoint decides its own allowed statuses; siblings disagree (assign/progress check "open", edit/due do not). There is no transition table or domain object | `CaseEndpoints.cs`, `CommitmentEndpoints.cs`, `Escalations.cs` | Root cause of 004 and 008; will recur with every new action |
| R2 | **Raw SQL built by string interpolation** in the cascade delete (compiler warning EF1002 ×5) | `Cascade.cs:262–284` | Values come from the EF model (table, column and entity names), not from user input, so no injection path was found. It bypasses the audit save hook and the SLA hook (compensated by an explicit call) and will silently miss future hooks |
| R3 | **In-process schedulers without coordination** | `ModuleRegistration.cs:35–42` | Duplicate runs with more than one instance (027) |
| R4 | **Vestigial access model.** Client/project/team scopes, grants and group-mapping scopes are stored, returned by the admin API and evaluated by query filters, but every role now receives full scope (`AccessCalculator`, `Security/SignIn.cs`). 115 `IgnoreQueryFilters()` calls | `Security/`, `Data/HubDbContext.cs` | Dead complexity that reviewers must still reason about; easy to re-enable wrongly |
| R5 | **Source density.** 446 back-end and 670 front-end lines longer than 200 characters (maximum 342); 60 KB endpoint files; 837-line dashboard component | whole code base | Hard to review and diff; no formatter or linter configured |
| R6 | **Migration churn.** 41 migration files for 29 releases in about four days, including destructive ones (dropped network tables, removed roles) | `Data/Migrations` | Acceptable before first production data; squash to a baseline before go-live |
| R7 | **Start-up work.** Migration, seeding, SLA backfill and settings load run synchronously before the site listens | `Program.cs` | Long or failing start on large data; no health signal during backfill |
| R8 | **Bundle size.** One 789 KB application script (224 KB gzip) and a 757 KB country atlas; only the map is lazy-loaded | `src/web` build output | Fine on a LAN; slow first load on poor links |
| R9 | **Time handling.** Server uses `DateTimeOffset.UtcNow` directly in several GET handlers while writes use the injected `TimeProvider` | `CaseEndpoints.cs:41, 60` | Harder to test time-dependent reads |
| R10 | **No observability beyond logs.** Serilog to console and file; no metrics, tracing export or alerting hooks; health endpoint checks the database only | `Program.cs`, `appsettings.json` | Operations cannot see job failures (SLA sweep, scheduler) without reading logs |
| R11 | **Dependencies.** Few and current; `npm ci` reported audit advisories in development dependencies (not analysed); `System.Security.Cryptography.Pkcs` pinned for an advisory | `package.json`, `.csproj` | Add automated dependency scanning |
| R12 | **Front-end tests.** `vitest` configured, zero test files; UI logic (formatting, time zones, filters) covered only through e2e | `src/web` | — |

## Recommendations

1. **Domain layer for work records** — `CaseWorkflow`, `CommitmentWorkflow`, `EscalationWorkflow` with an explicit transition/permission table and unit tests; endpoints become thin.
2. **Immutable measurement records** — store SLA evaluations as append-only rows per obligation instead of overwriting fields on the case.
3. **Portable test configuration and CI** — full connection string from configuration, Chromium for e2e, pipeline with SQL Server service container, lint and formatting gates.
4. **Job coordination** — application lock or a separate worker.
5. **Decide the access model** — remove scopes or restore them; delete dead parameters.
6. **Front end** — route-level code splitting, ESLint + Prettier, component tests for the kit.
7. **Observability** — health checks per background job, metrics endpoint, structured job logs with outcome counters.
