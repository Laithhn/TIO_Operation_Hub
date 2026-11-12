# 09 — Technical architecture review (build 2.60.0)

Scope: targeted static review of `main` at `fa71ace`, supported by runtime observation. Given the growth of the code base (below), a smaller share was read than in the first audit; findings are examples, not an exhaustive list. No source file was modified.

## Size and shape

| Measure | 2.29.0 | 2.60.0 |
|---|---|---|
| API operations | 270 | 374 |
| Back-end lines (without migrations) | 10,300 | 28,300 |
| Front-end lines (own code) | 10,000 | 23,100 |
| Vendored front-end framework | none | 1,000 files, 7.4 MB |
| Migration files | 41 | 104 |
| Back-end tests | 140 | 755 |
| Front-end unit tests | 0 | 268 |
| Browser journeys (project) | 44 | about 212 |
| Hosted background services | 4 | 6 |
| Entry script | 789 kB | 901 kB (per-route chunks added) |
| Releases | 29 in about 4 days | 60+ in about 4 weeks |

## Improvements since the first audit

- **Authorization re-engineered**: granular rights catalogue, data scope first (hidden records answer 404) then right check (`Modules/Shared/Services.cs:96-101`), scope-aware cascade deletion, staged access review, role conflicts. Verified at run time on 34 foreign-record routes.
- **Tests are portable** (`tests/TioHub.Tests/HubFactory.cs:22-23`, `TIOHUB_TEST_SQL_AUTH`) and far more numerous; front-end unit tests exist; the project records its own Linux container run.
- **Front end**: per-route lazy loading, framework imports isolated behind a facade (`src/web/src/vt/index.ts`), page-rights tests.
- **Error handling**: query-string enum errors mapped to field errors.
- **Database readiness check** verifies migration history before start-up initialisation and never migrates on its own (A65).

## Confirmed at run time (issue register)

| Finding | Location | Issue |
|---|---|---|
| SLA snapshot recomputed on priority/contract change without protecting completed obligations; penalties follow | `Modules/Work/CaseSla.cs`, `CaseEndpoints.cs:250-295, 437-479` | 001–003 |
| Edit and due-date endpoints lack a closed-state guard | `CaseEndpoints.cs:250, 621` | 004 |
| Commitment edit lacks status guard; timeliness uses deadline in force | `Modules/Commitments/CommitmentEndpoints.cs` | 005, 008 |
| `RequireMaintain` still ignores its `responsibleUserIds` argument | `Modules/Shared/Services.cs:90-94` | 010 |
| Cascade delete endpoint takes no version | `Modules/Shared/Cascade.cs:421` | 011 |
| Audit query lets child-record entries without a client id through the data scope | `/admin/audit` (location not traced) | 035 |

## Code-review risks

| # | Risk | 2.60.0 status |
|---|---|---|
| R1 | Workflow rules scattered across endpoint lambdas; siblings disagree | **Open and larger**: `CaseEndpoints.cs` is 78 kB; statuses are configurable while rules use fixed stages, adding a second vocabulary |
| R2 | Raw SQL in cascade delete bypasses save hooks | Open (now scope-aware) |
| R3 | In-process background jobs without coordination | **Open, six services** incl. `JiraSyncWorker` and `ExportWorker` (`ModuleRegistration.cs:41-62`) — duplicate synchronisation or exports with two instances |
| R4 | Vestigial access model | **Resolved**: scopes are enforced again |
| R5 | Source density | Open: 882 back-end lines over 200 characters; still no formatter or linter configuration in the repository |
| R6 | Migration churn | Open: 104 files; `ConfigurableCaseStatuses` and others rewrite data on upgrade (documented with back-up advice). **An upgrade from a 2.29-era database was not tested** |
| R7 | Start-up work before listening | Open |
| R8 | Bundle size | Open: entry chunk at 99.8 % of a budget that was raised to accommodate it |
| R10 | Observability | Partly: Jira sync has a monitor page and health endpoint; other jobs still log only |
| R12 | Front-end tests | Resolved (268 tests) |
| R13 (new) | **Unreleased, vendored UI framework** (4.0.0-rc.5) with mismatched icon package and a custom Vite plugin emulating webpack | New delivery risk (issue 024) |
| R14 (new) | **Outbound integration** (Jira Cloud): credentials, secret providers, network egress, rate limits and failure modes now exist in the web process; enabled by default in a deployed hub (A88) | Not testable here; needs its own review before production |
| R15 (new) | **Process**: no CI definition in the repository; test results are recorded by hand in `docs/TEST-RESULTS.md`; releases average several per day | The good test suite is not an enforced gate |
| R16 (new) | One project test fails for a non-environment reason on Linux (`AC60_OperationsCommandCenter`: expected 1, actual 0) | Needs triage — possibly time-dependent |

## Recommendations

1. Workflow domain layer with one transition/permission table per record type, expressed in **stages**, with status labels resolved at the edge — and messages generated from labels.
2. Append-only SLA and penalty evaluation records.
3. CI pipeline that runs the existing 755 + 268 + browser tests and the audit suite on every change; add lint and format gates.
4. Job coordination (database application lock or a worker process) before running more than one instance — more important now that a job calls an external system.
5. Move to the released framework version; keep the facade; add an accessibility gate.
6. Rehearse the database upgrade path from the oldest supported version with production-like data.
