# 00 — Development environment verification (build 2.60.0)

Audit dates: 11–12 November 2026. Second audit; the first covered build 2.29.0 (`tio-development-audit/`). No application source, test or configuration file was changed.

## Result

**Verified: an isolated, disposable development instance built from branch `main` was used for all testing.**
The reference URL `https://nb01994.vitronic.de/` was again **not contacted and not tested**: its development status and data isolation cannot be verified from the repository, and it is not reachable from the audit sandbox.

| Item | Verified value | Evidence |
|---|---|---|
| Source under test | `origin/main`, commit `fa71ace` ("Record the 2.60.0 test and package results"), checked out as a detached work tree outside the audit branch | `git log origin/main` |
| Version | **2.60.0** (`Directory.Build.props`; `/api/v1/me` → `app.version` 2.60.0, `environmentName` Development, `authMode` Development) | API response |
| Audit deliverables | Branch `claude/tio-operations-hub-audit-i1m7h0`, folder `tio-development-audit-2.60.0/` (the branch itself still carries 2.29.0 source; nothing was merged) | — |
| Application URL under test | `http://127.0.0.1:5094` (loopback only) | launch log |
| Back end | ASP.NET Core 10, built with .NET SDK 10.0.115: 0 errors, 18 warnings | build log |
| Front end | React 19 + Vite 7, vendored VtWebGuiFramework 4.0.0-rc.5; `tsc` and `vite build` clean | build log |
| Database | SQL Server 2022 Developer in a local container on `127.0.0.1:14333`; database `TioHub_Audit260` created by the application's migrations (104 migration files) and the Portfolio demo seed (fictional personas) | — |
| Sign-in | Development mode with fictional `DEV\…` accounts (refused by the application outside Development/Testing) | `Program.cs` |
| **Jira integration (new since 2.29.0)** | **Switched off**: `Jira:Enabled=false` in `appsettings.Development.json` and again through the environment for the audit instance. `/admin/jira-sync/health` → `syncEnabled: false`, `issueSync: NotConfigured`; no connection has credentials. No call to Atlassian was made | API response |
| Other external calls | None found. Map tiles (`tile.openstreetmap.org`) are requested by the browser only and were blocked or stubbed in every run | crawl network log: same-origin requests only |
| Notifications | In-application only; no e-mail or chat delivery exists | DECISIONS A72 |
| File storage | Attachments and exports redirected to a scratch folder outside the repository | launch log |
| Secrets | Database password generated for the run, kept outside the repository, absent from all reports (scanned) | — |

## Deviations from the documented developer set-up

1. Linux host instead of Windows/LocalDB; `dotnet` started from outside the work tree so `global.json` (SDK 10.0.401) did not block SDK 10.0.115.
2. Connection string, storage paths and `Jira__Enabled=false` supplied through environment variables.
3. `npm ci` used `registry.npmjs.org` through command-line options (the committed `.npmrc` host is blocked by the audit network policy).
4. The project's .NET tests ran **unmodified** this time: 2.60.0 accepts `TIOHUB_TEST_SQL_AUTH` for a SQL login (this closes part of finding 026 of the first audit).

## Test identities

| Account | Role / scope | Use |
|---|---|---|
| `DEV\manager` | TIO Manager, 249 rights, all clients | Manager workflows, administration, cleanup |
| `DEV\engineer`, `DEV\engineer2` | Operation Engineer, 172 rights, **scoped** to client DP + team OPS, and to client TAH | Rules on seeded data; "outsider" in isolation tests |
| `DEV\former` | Deactivated | Refusal and deactivated-owner rules |
| `DEV\tio_audit_test_e1`, `…_e2` | **Created by the audit**: Operation Engineer, scope = synthetic audit clients + team OPS | All engineer-level tests on synthetic data |
| `DEV\tio_audit_test_noedit`, `…_del` | Created by the audit: role with one view right / deletion probe | Route guard, user deletion |
| Unknown `DEV\…` account | No hub user | Refusal (403) |

2.60.0 enforces a per-client data scope, so the seeded engineers cannot see new clients. Rather than widen their scope, the audit created its own scoped engineers.

## Test data strategy

- Prefix `TIO_AUDIT_TEST_` (or `TIOAUDIT…` for short fields) on every record.
- Synthetic clients, one project each, SLA and penalty contracts, tickets, commitments, escalations, one environment with two servers, attachments, notes, organisations, roles and users.
- Four tickets were created on the seeded client DP to test rules (first run, before the database was rebuilt); no seeded record was edited or deleted.
- The database is a disposable container. **It was lost once during the audit** (worker restart on 11 November, after the API test batteries had been logged) and was rebuilt from the seed; fixtures were recreated and part of the batteries repeated. Both runs are kept (`traces/api-test-evidence.jsonl`, `traces/api-test-evidence-rerun.jsonl`).
- Cleanup: the automated suite removes its own client and users. Records of the manual batteries were left in the disposable database, which is discarded with the container.

## Limitations of this environment

- Jira synchronisation, Forms and Windows sign-in, IIS hosting and the installer were not exercised.
- Demo data volume only; the project's own test suite ran on the same four-core machine during the UI crawl, so page-timing figures are pessimistic and not comparable with the first audit.
- The project's browser journeys (`tests/e2e`, about 212 tests) were not run: they default to the Microsoft Edge channel and their own database.
