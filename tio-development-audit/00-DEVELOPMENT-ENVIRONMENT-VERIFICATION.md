# 00 — Development environment verification

Audit date: 11 November 2026. Auditor role: independent external audit. No application source file was changed.

## Result

**Verified: an isolated, disposable development instance built from the repository was used for all testing.**
The reference URL `https://nb01994.vitronic.de/` was **not contacted and not tested**: nothing in the repository or the audit environment proves that it is a development system or that its database and data are isolated, and it is not reachable from the audit sandbox. It was not used as a fallback.

| Item | Verified value | Evidence |
|---|---|---|
| Repository / branch | `laithhn/tio_operation_hub`, branch `claude/tio-operations-hub-audit-i1m7h0` | `git status` |
| Build / commit | Version **2.29.0** (`Directory.Build.props`), commit `26b7cf8` ("Manual Commit") | `/api/v1/me` → `app.version` = 2.29.0 |
| Application URL under test | `http://127.0.0.1:5094` (loopback only, inside the audit sandbox) | launch log "Now listening on: http://127.0.0.1:5094", "Hosting environment: Development" |
| Back end | ASP.NET Core 10 (`src/TioHub.Api`), built with .NET SDK 10.0.115, 0 errors / 13 warnings | build log |
| Front end | React 18 + Vite 7 (`src/web`), built into `wwwroot` | `npm ci` + `npm run build` |
| Database | SQL Server 2022 Developer in a local container bound to `127.0.0.1:14333`; database `TioHub_AuditPortfolio` created by the application's own migrations and the **Portfolio demo seed** (fictional personas, mocked environments) | `sys.databases` listed only system databases and `TioHub_AuditPortfolio` |
| Sign-in | `Auth:Mode=Development` (cookie `tiohub-dev-user`, fictional `DEV\…` accounts). The application refuses this mode outside Development/Testing (`Program.cs`) | `/api/v1/me` → `authMode: Development`, `environmentName: Development` |
| External integrations | None exist: no Jira, mail, chat or monitoring calls (README; confirmed by code search and by the browser network log). The only external resource is map tiles from `tile.openstreetmap.org`, loaded by the browser; **blocked/stubbed in every audit run** | crawl network log: only same-origin requests |
| Notifications | In-application only (`notify.Notification` table); no e-mail or push | DECISIONS A38 |
| File storage | Attachments and exports redirected to a scratch folder outside the repository | launch log "Attachments are stored in …/scratchpad/run/…" |
| Secrets | The database password was generated randomly for this run, kept outside the repository and is not in any report | — |

## Deviations from the documented developer set-up

The README assumes Windows, LocalDB and .NET SDK 10.0.401. The audit host is Linux, so:

1. `dotnet` was started from outside the repository so `global.json` (SDK 10.0.401) did not block SDK 10.0.115. No file was edited.
2. The connection string, attachment path and log path were supplied through environment variables.
3. `npm ci` used `registry.npmjs.org` through command-line options because the committed `.npmrc` host (`registry.npmjs.com`) is blocked by the audit network policy.
4. The existing .NET tests hard-code Windows authentication (`HubFactory.cs:21`). They were run from a **copy outside the repository** with one line adapted (finding TIO-DEV-AUDIT-026).

## Test identities (no credentials exist in Development mode)

| Account | Role / rights | Use in the audit |
|---|---|---|
| `DEV\manager` | TIO Manager — all eight rights | Manager workflows, administration, cleanup |
| `DEV\engineer`, `DEV\engineer2` | Operation Engineer — Edit, Export, Technical detail, Change history | Day-to-day workflows, ownership and negative tests |
| `DEV\lead`, `DEV\viewer` | Operation Engineer in the Portfolio profile (despite the account names) | Identity check only |
| `DEV\former` | Deactivated account | Refusal (403) and "deactivated owner" rules |
| `DEV\tio_audit_test_ro`, `…_noedit`, `…_norole` | **Created by the audit**; custom roles without rights / no role | Read-only and route-guard tests |
| Unknown `DEV\…` account | No hub user | Refusal (403) |

## Test data strategy

- All records created by the audit carry the prefix `TIO_AUDIT_TEST_` (or alias `TIOAUDIT…` where the field is short).
- Created (approximate counts, several automated runs): 3 clients, 2 projects, 6 contracts, about 75 cases, 12 commitments, 3 escalations, 1 environment, 2 servers, 1 volume, 2 firewall rules, 1 installation, 4 attachments, 3 notes, 2 roles, 3 users, 3 export jobs.
- Four cases were created on the seeded client DP to test rules; they were deleted afterwards. **No seeded record was changed or deleted.**
- Cleanup: all synthetic business records were removed through the application; case and client counts returned to the seeded values (18 cases, 15 clients). Remaining by design of the product: 3 deactivated synthetic users and 2 synthetic roles (finding TIO-DEV-AUDIT-034).
- The container and its database are disposable. They stopped when the audit worker restarted after testing was complete; nothing outside the sandbox was touched.

## Testing permissions applied

State-changing tests were run only against the local instance. No high-volume, destructive-infrastructure, credential or exploitation tests were run.

## Limitations of this environment

- Forms sign-in (the production default) and Windows sign-in were not exercised in the browser; lockout, session expiry and password flows are covered only by the project's own tests (see 15-COVERAGE-LIMITATIONS.md).
- IIS hosting, the PowerShell installer and the production configuration were reviewed on paper only.
- Data volume is the demo seed (15 clients, 18 cases); performance figures are not load results.
- The Fictional seed profile used by the project's own tests was exercised only through those tests.
