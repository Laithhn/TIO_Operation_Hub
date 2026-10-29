# Test results

Recorded on 16 October 2026 on a Windows 11 developer machine (SQL Server LocalDB 15.0, .NET SDK 10.0.401, Node 22.23.3, Microsoft Edge).
Re-run with the commands in the README; results below are from actual runs, not expectations.

## Automated .NET tests — `dotnet test tests/TioHub.Tests`

**77 passed, 0 failed** (about 20 s). Each test class gets a throwaway SQL Server database, migrated and seeded with the fictional data.

| Group | Tests | Covers |
|---|---|---|
| Unit — guards | 34 | Secret detection, approved links, Jira key + URL rules, IP/subnet and port validation, placeholder notation |
| Unit — time zones | 4 | IANA conversion, DST gap refused, DST overlap needs offset, Windows IDs refused |
| Unit — CSV | 6 | Formula-injection protection, header block (time, zone, filters, column definitions) |
| Unit — freshness | 4 | No policy, max age, next-review date, current |
| Unit — infrastructure totals | 1 | VM vs logical endpoint, vCPU vs physical cores, unknown ≠ zero, shared storage once |
| Structural | 3 | No credential fields; no outbound HTTP/Jira dependency; production refuses development sign-in |
| AC-01 Client hierarchy | 2 | Regional and direct clients, distinct Production per region, cross-client region refused, duplicate names refused, region archive gate, audited reassignment |
| AC-02 Onboarding | 2 | Unknown country + follow-up, contact channel, scope-limited visibility, neutral duplicate warning |
| AC-03 Installations & hosts | 1 | Two named instances, many-to-many hosting, foreign host refused, version only via evidence, matrix counts environments once, host link removal |
| AC-04 Resource quality | 1 | VM/physical/logical, units, unknowns, shared storage once, provenance and placeholder flags |
| AC-05 Dependencies | 1 | Context-scoped duplicates, NAT, unresolved without address, port validation, cross-client refused, no group expansion, documented impact |
| AC-06 Case lifecycle | 2 | Triage by lead, owner gate, waiting intervals without status/due change, outcome + evidence, engineer cannot waive, Manager exception, reopen/cancel history; internal scope |
| AC-07 Jira references | 1 | Instance + key identity, reuse reason, hidden cases counted only, unapproved host / credentials / mismatched key refused |
| AC-08 Commitments | 1 | Riyadh/Berlin conversion, DST gap, revision keeps original, future completion refused, late = Completed + late result, reopen/cancel events |
| AC-09 Assignments & handover | 1 | Deactivation queue without reassignment, sign-in refused, acknowledgment by receiver only, Manager exception with follow-up, prior owner kept |
| AC-10 Verification | 1 | Condition report ≠ inventory review, unrelated edit/view do not refresh, scoped review, missing-policy and stale gaps |
| AC-11 Dashboard reconciliation | 4 | Every measure = drilldown total for 3 different users at a fixed time; category counts = items; restricted rows excluded; strict overdue boundary; cancelled leaves open count; no deferred measures |
| AC-12 Access & export | 3 | Administrator without business role sees no client data; summary/technical/export/no-scope users; revoked access applies at once; no self-escalation |
| AC-13 History & conflict | 1 | 412 on stale save, 428 without version, archive gate + Manager exception, restore by scoped lead only, codes reserved, audit read-only |
| AC-14 Security & usability | 2 | Secrets refused and not echoed, safe errors, antiforgery required, unmapped accounts refused |
| AC-15 Restore drill | 1 | Backup → restore into an isolated DB → sign-in, scope, record and audit counts verified. **Backup + restore: 0.3 s** |
| AC-15 Performance smoke | 1 | 8 concurrent users, 800 reads, 80 saves, in-process: **p95 reads 95 ms (max 965 ms), p95 saves 181 ms** — targets 3 s / 2 s |

AC-16 (scope independence) is covered by the structural no-integration test and by every journey above working without any Next module.

## Browser end-to-end — `tests/e2e` (Playwright, Microsoft Edge)

**8 passed, 0 failed**, two consecutive runs (≈ 21 s each) against the real API + built UI + LocalDB.

| Test | Result |
|---|---|
| Shell: header/sidebar/title/table/pager/status bar; computed colours | Passed; screenshots saved |
| Keyboard: skip link first with visible focus, “/” opens search, Enter navigates, Escape closes | Passed |
| Tablet 820 px: sidebar becomes a drawer | Passed |
| Onboarding a client without regions + direct environment (errors beside fields, entries kept, Unknown country follow-up, coverage gap) | Passed |
| Case UI lifecycle: create, triage, start refused without owner (message shown), assign, start | Passed |
| Unsaved-change warning; stale save keeps the draft and offers Reload latest | Passed |
| Administrator without business role is redirected and sees no client data | Passed |
| Read-only stakeholder: no create/export controls; technical detail restricted | Passed |

## Defects found by the tests and fixed

1. Removing link rows (scopes, hosts, addresses, affected records) failed because the global no-cascade rule also blocked EF from deleting detached link rows → link relationships now use client-side cascade only (database stays NO ACTION). Regression assertion added (AC-03).
2. Duplicate-address warnings listed one endpoint twice when it held the address as internal and NAT → deduplicated per endpoint.
3. Ctrl+K is reserved by Edge → “/” added as a search shortcut; the button also opens search.
4. Lifecycle gate messages for fields not shown in a dialog (e.g. owner required on Start) were hidden → now listed in the dialog's error summary.

## Other checks

- `database/01-schema.sql` applied twice to an empty LocalDB database: both runs succeeded (53 tables, migration `InitialMvp` recorded).
- `dotnet ef migrations has-pending-model-changes`: no changes.
- TypeScript strict type check: no errors.

## Not yet verified (environment or decision blockers)

- Windows/IIS deployment and real AD sign-in (no target server available in this session).
- Performance at agreed pilot volume and concurrency (volume not yet decided).
- Restore drill on the production-like server with production-like volume (RTO evidence).
- Formal UAT by users who did not build the system (BRD Section 8).

## Update 19 Oct 2026 — dashboard charts and country map

- `dotnet test tests/TioHub.Tests`: **80 passed, 0 failed**. New `AC11_DashboardInsights` (3 tests): for the manager and a single-client engineer, status/priority/age breakdowns sum to the open-case tile, deadline buckets sum to open commitments, every linked bar equals its drilldown list total, map client counts equal the authorized client list (no out-of-scope client codes), administrator without business role gets 403.
- `tests/e2e`: **9 passed, 0 failed**. New journey: the map loads, clicking Saudi Arabia filters the dashboard (URL and Country filter), the table view toggles with `aria-pressed`. Screenshot: `test-results/visual-dashboard-map-1600.png`.
- Found and fixed while testing (later on 19 Oct, Portfolio demo data): the “Client countries” map frame wrapped past ±180° when a client is in Australia, hiding it → longitudes clamped, antimeridian-crossing bounds fall back to the world view. After adding the Portfolio profile: `dotnet test` 80 passed; e2e 9 passed (e2e pinned to the Fictional profile).
- Found and fixed while testing: country labels collided for neighbouring countries (now count badges, names only when isolated); trend end-labels overlapped when equal (now one combined label); charts unmounted during filter refetch, losing their view state (previous data now stays on screen); map buttons were hidden from assistive tech inside `role="img"` (now `role="group"`).

## Update 19 Oct 2026 — navigation and executive overview

- `dotnet test tests/TioHub.Tests`: **86 passed, 0 failed** (new `MapTileTests`, 6 cases: only https `{z}/{x}/{y}` templates reach `/me` and the CSP; `{s}` becomes a wildcard origin; empty = offline map).
- `tests/e2e`: **9 passed, 0 failed**. Updated journeys: no Environments tab and Clients stays active on environment pages (breadcrumb Clients › …); Cases and Commitments are separate sections; Executive overview — Open-cases KPI number equals its drilldown total, OpenStreetMap attribution shown, keyboard Enter on the Saudi Arabia badge filters the overview, Table view toggle, Action list page. OSM tile requests are answered by a local stub in tests (no external calls).
- Found and fixed while testing: map badges were announced only as their count (now a full aria-label); Enter on a focused badge did nothing (keyboard handler added); country ranking bars misaligned (fixed column width).

## Update 19 Oct 2026 — dependency security upgrade

- `npm audit` (incl. dev) in `src/web`: **0 vulnerabilities**. Was: 2 high in production (react-router 6.0.0–7.17.0, open-redirect/XSS advisories) plus dev-only vite 7.1.4 (dev-server `server.fs` bypasses), vitest 3.2.4 (`@vitest/mocker` path traversal, `tinypool` prototype pollution).
- Upgraded (exact pins, all published ≥ 2 weeks earlier): `react-router-dom` 7.8.2 → **7.18.4**, `vite` 7.1.4 → **7.3.6**, `vitest` 3.2.4 → **4.1.11** (no longer uses tinypool), `@vitejs/plugin-react` 5.0.2 → **5.2.0**. Vite stays on the 7.x line (7.3.7 was too new; 8.x not needed).
- npm 10.9.9 crashes (`Cannot read properties of null (reading 'edgesOut')`) resolving vitest 4's optional peer set; the lockfile was written once with `npm install --legacy-peer-deps`. Plain `npm install` and `npm ci` work against the updated lockfile.
- `npm run build`: OK. `dotnet test tests/TioHub.Tests`: **86 passed, 0 failed**. `tests/e2e`: **9 passed, 0 failed** (including the unsaved-edits/`useBlocker` journey).

## Update 19 Oct 2026 — contracts and SLAs

- `dotnet test tests/TioHub.Tests`: **87 passed, 0 failed**. New `AC20_ContractsAndSla`: secrets in the contract reference refused and not echoed; foreign-client environment, duplicate priority, resolution shorter than response and end-before-start refused; notice deadline and renewal state derived; stale save 412 with nothing saved; action-list `ContractRenewal` includes renewal-due and missing-end-date contracts but not drafts; every renewal bar equals its contract list total; on-site staffing total; out-of-scope engineer gets 404 / empty list; read-only cannot create or export; Active cannot be archived, Ended can and appears in archived records; CSV export has the renewal state and no compliance column.
- `tests/e2e`: **10 passed, 0 failed**. New journey: contract list under Clients with Renewal-due badge; new contract form keeps values on error (resolution shorter than response), saves, detail shows "End date unknown" and the recorded SLA row "Critical · 1 h · 4 h".
- `database/01-schema.sql` regenerated (adds schema `contracts`, 4 tables, sequence `ContractNumbers`); `has-pending-model-changes`: none. `openapi-v1.json` refreshed.

## Release 2.0.1 — 19 Oct 2026 (UAT finding fixed)

- Finding from the first UAT deployment of 2.0.0: an administrator could create or edit a **group mapping for a directory group they belong to**, and so give themselves a business role at the next sign-in (contradicts BRD Section 3 "nobody grants their own access"). Fixed: create, edit and rename are refused (422, field `groupName`) when the old or new group is one of the caller's own groups; another administrator must do it.
- New test `AC12_NoSelfGrantThroughGroups`: a group-mapped second administrator cannot map an own group (case-insensitive), cannot edit the mapping of their own group, cannot rename another mapping to their own group, can map a group they are not in, and still has no business role afterwards.
- `dotnet test tests/TioHub.Tests`: **88 passed, 0 failed**; `tests/e2e`: **10 passed, 0 failed**.

## Release 2.1.0 — 19 Oct 2026 (forms sign-in)

- `dotnet test tests/TioHub.Tests`: **96 passed, 0 failed**. New `FormsSignInTests` runs the API in Forms mode on an **empty database** (as a fresh installation): setup required and nothing reachable without a session; setup refuses a wrong code and weak password, accepts the code once (file deleted, second setup 409); the administrator creates a Manager and issues a temporary password (policy enforced, never for themselves); wrong password and unknown account give the same message; a temporary password allows only `/me` and password change; wrong current / unchanged new password refused; a password change ends the account's other sessions; sign-in without the antiforgery token refused; 3 failures lock the account even for the right password and are audited; an administrator reset clears the lock and ends sessions; sign-out ends the session; a deactivated account cannot sign in; no hash or password in the audit, user APIs or sign-in status. New `PasswordTests`: salted PBKDF2 hashes, refusal of wrong/missing/malformed/weakened hashes, policy cases, and a structural check that `UserCredential.PasswordHash` is the only password field and is excluded from automatic audit.
- `tests/e2e` (development sign-in): **10 passed, 0 failed**.
- Browser check of the published 2.1.0 build on a throwaway forms instance (empty database): setup page → first administrator → new Manager with a temporary password (list shows *Temporary*) → sign out → wrong password shows the generic message → temporary password → forced change → Executive overview as Manager. Found and fixed: deep links (`/clients`, `/login`) returned 401 before the sign-in page could load (the SPA shell is now anonymous; it holds no data — regression test added to `FormsSignInTests`); password fields' accessible names included their hint text (labels now name only the field).

## Release 2.2.0 — 19 Oct 2026 (UAT feedback: client and environment forms)

- `dotnet test tests/TioHub.Tests`: **97 passed, 0 failed**. Rewritten `AC02 Clients_need_a_listed_country_a_project_manager_and_an_opportunity_or_active_status` (no country / unlisted country / no project manager / Archived refused; statuses and >190 countries offered; country spelling normalized; old responsibility fields ignored and stored as TIO). New `AC01b_EnvironmentRules` (regional client refuses an environment without region; engineers optional without a gap reason; hosting On-prem/Cloud/Unknown, old values refused; a Critical environment without backup is still a coverage gap).
- `tests/e2e`: **11 passed, 0 failed**. Updated: client form (alias, status options, country list, project manager, no responsibility fields), environment form (hosting options, optional engineers), new journey "a client with regions cannot have an environment outside them".
- Migration `UatClientEnvironmentRules` maps existing data (Onboarding → Opportunity, Suspended → Active, hosting → Cloud/OnPrem/Unknown) and removes the old Hosting reference list.

## Release 2.3.0 — 20 Oct 2026 (two roles; Products section)

- `dotnet test tests/TioHub.Tests`: **96 passed, 0 failed**. Access tests rewritten for the two-role model (A22): `Two_roles_both_see_everything_technical_detail_history_and_export`, `Operation_engineers_do_day_to_day_work_but_not_structure_assignment_archive_or_users` (engineer creates environment, contract, product with module and feature, case; is refused client and region creation, archive, triage, assigning someone else, handovers and user administration), `Removing_a_role_takes_effect_at_once_and_nobody_changes_their_own_role`; scope-isolation assertions in AC02/AC06/AC07/AC11/AC20 and the restore drill replaced by "same picture for both roles" checks (the restore drill now proves a deactivated account stays refused).
- `tests/e2e`: **12 passed, 0 failed**. New: TIO Manager sees Administration with a single Role choice; an Operation Engineer works on all clients without Administration or client creation; Products journey (create product, add module and feature).
- Found and fixed: the product version list returned HTTP 500 because the version label and its concurrency token serialized to the same JSON name (`version`); the token is now `rowVersion`.

## Release 2.4.0 — 20 Oct 2026 (microservices)

- `dotnet test tests/TioHub.Tests`: **97 passed, 0 failed**. New `AC03b_MicroserviceDeployment`: an Operation Engineer defines three microservices on a product (duplicate name refused), deploys Importer + PlateLookup on the application server and Workflow on the workflow server, adds Importer to a second server (one component, two hosts, role taken from the microservice), unticks PlateLookup (server removed, reported as "not running on any server"), and is refused another product's microservice, a logical endpoint and a server of another environment; the product page counts installations and servers per microservice.
- `tests/e2e`: **13 passed, 0 failed**. New journey: add two microservices to PSOP, open the PSOP Main installation, choose both on the application server, see them on the server row.

## Release 2.5.0 — 20 Oct 2026 (microservice versions, application developers)

- `dotnet test tests/TioHub.Tests`: **97 passed, 0 failed**. `AC03b_MicroserviceDeployment` extended: three versions with release notes (newest first with numeric ordering — 1.10.0 above 1.2.0), duplicate number refused, secrets in release notes refused, notes editable, renaming a version refused, latest version shown on the product; application developers saved in order with Lead/Developer roles, an unknown role refused, developers listed on the product list.
- `tests/e2e`: **13 passed, 0 failed**. Products journey extended: no Owning team field, add a lead developer, add a microservice, add version 1.0.0 with two lines of release notes and see them on the microservice page.

## Release 2.40.0 — 29 Oct 2026 (Client Map redesign; local UAT of the package)

- Release script `build/Build-Release.ps1`: front-end build, `dotnet test` (Release) **268 passed, 0 failed**, publish, `release/TioHub-2.40.0.zip` (SHA-256 `9863fcbea780dec5ee334df40b8473d048a844e5f5f6d8b216448733779e44ce`, after the release notes and test results were added to the package). Built from uncommitted changes on top of `930643a` (`BUILD-INFO.txt` says so). No migration: `database/01-schema.sql` is byte-identical to 2.39.0.
- Before packaging: typecheck and production build clean; Vitest **40/40** (new `clientMapModel.test.ts`: per-country sums, region filter, sorting, search, layers, client status, and an ISO code and region for every country in `Common/Countries.cs`); .NET **268/268** (new `A73_ClientMap`: products and project manager on map clients, `/assets?country=`); Playwright on the source build **125/125** (new `client-map.spec.ts` 6 tests; `frame-smoke`, `journeys` and `client-logos` adapted to the full-width map).
- Local UAT of the package (throwaway LocalDB database created with the 2.39.0 schema script, dropped afterwards; Development sign-in, fictional data):
  - **Package on the 2.39.0 schema** with `Database:ApplyMigrationsOnStartup=false`: the readiness gate accepted it, the API answered ready, no errors in the log.
  - **Acceptance suite against the running package** (`tests/e2e/playwright.uat.config.ts`): first package build **125/125**. After a CSS-only fix (the chevron of the details panel's bottom links wrapped), the rebuilt package ran **122 passed, 1 failed, 2 not run**: on the reused database the logo test's client sat below the fold of the details table and its lazily loaded logo had not loaded. The test now scrolls the row into view. The logo and map specs (10 tests) then passed against the package.
- Screenshots compared with the target design at 1600, 1280 and 820 px (dark toolbar and layers, country explorer, dark map with blue shading and numbered badges, country details tabs, drawers on tablets).
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, a screen-reader session, and the actual UAT environment and its database.

## Release 2.39.0 — 28 Oct 2026 (client logos, notification redesign, Configuration navigation; local UAT of the package)

- Release script `build/Build-Release.ps1`: front-end build, `dotnet test` (Release) **267 passed, 0 failed**, publish, `release/TioHub-2.39.0.zip` (SHA-256 `9d82ea668be2cc22dac91bcdd4893ac54b9e5e20691eb8f37d34a87d2a12a96c`, after the release notes and test results were added to the package). Built from uncommitted changes on top of `a09cc3f` (`BUILD-INFO.txt` says so).
- Before packaging: Vitest **33/33**; typecheck and production build clean; Playwright on the source build **118/118** (new: `client-logos.spec.ts` 4, `notifications-redesign.spec.ts` 7).
- Local UAT of the package (throwaway LocalDB databases, dropped afterwards; Development sign-in, fictional data; no shared or UAT database was used):
  - **Schema script, empty database:** `database/01-schema.sql` applied twice without errors; 27 migrations, last `20261028130133_NotificationResolution`; the three logo columns and `ResolvedAt` exist.
  - **Upgrade with data:** a database created with the 2.38.0 script and filled by the 2.38.0 package (3 clients, 6 cases, 37 notifications); the 2.39.0 script applied twice without errors; every row kept, new columns empty.
  - **Package on the upgraded database** with `Database:ApplyMigrationsOnStartup=false`: the readiness gate accepted the schema, the API answered ready, no errors in the log.
  - **Acceptance suite against the running package** (`tests/e2e/playwright.uat.config.ts`): **117 of 118 passed** (7.4 min). The one failure (*a project holds its contracts*) was a timing race in the test — it checked the *Project* field before the click on *+ Contract* had opened the form (2 of 3 repeats passed). The test now waits for the contract form; afterwards it passed 5 of 5 against the package. No product change was needed.
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, a screen-reader session, and the actual UAT environment and its database.

## Release 2.38.0 — 28 Oct 2026 (Reporting Center redesign, Cases Report Builder; local UAT of the package)

- Release script `build/Build-Release.ps1`: front-end build, `dotnet test` (Release) **256 passed, 0 failed**, publish, `release/TioHub-2.38.0.zip` (SHA-256 `f4ae667b0571e381a0a18d928fef22536a8338777ea664cb27c67075349054b6`). Built from uncommitted changes on top of `a09cc3f` (`BUILD-INFO.txt` says so).
- Before packaging: Vitest **9/9**; Playwright on the source build **96/99** in the full run, the 3 failures (an ambiguous "More" button selector once the header got its own *More* list) fixed and re-run with the builder and GUI specs (27/27).
- Local UAT of the package (scratch LocalDB databases, Development sign-in, fictional data; no shared or UAT database was used):
  - **Schema script, empty database:** `database/01-schema.sql` applied twice without errors; 25 migrations, last `20261028080005_ReportBuilder`; the `reporting` schema holds the three new tables.
  - **Upgrade with data:** a database created with the 2.37.0 script and filled by the 2.37.0 package (6 cases, a catalog Excel export, a weekly schedule); the 2.38.0 script applied twice without errors; the rows were kept (the export and the schedule stay catalog items), and `IX_Case_CreatedAt` exists.
  - **Package on the upgraded database** with `Database:ApplyMigrationsOnStartup=false`: the readiness gate accepted the schema, the API answered ready, and the 2.37.0 schedule and export appear in the new Scheduled reports and Export history areas.
  - **Acceptance suite against the running package** (`tests/e2e/playwright.uat.config.ts`, new): **99 passed, 0 failed** (7.2 min), including the A70 navigation, builder, saved report, background Excel/PDF export, schedule and template journeys, and every earlier journey.
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, a screen-reader session, and the actual UAT environment and its database.

## Release 2.28.0 — 22 Oct 2026 (Measured SLA compliance)

- `dotnet test tests/TioHub.Tests`: **134 passed, 0 failed**. New `SlaClockTests` / `CaseSlaTests` (18, no database): calendar hours; Sun–Thu 08:00–17:00 Asia/Dubai across the weekend and a case opened on Friday; the Berlin daylight-saving change; overlapping pauses counted once; incomplete calendars give no deadline; response and resolution one minute before, exactly at (met) and one minute after the deadline; pending turning breached; missing contract, target, basis or support hours never met; internal and cancelled not applicable; customer waiting pauses only with the contract option (vendor waiting never), an open wait moves the deadline; cases opened before first-response tracking are not measurable unless a response is recorded, closed before resolution times were recorded not measurable; snapshot business hours; idempotent evaluation. New `AC61_ContractualSla`: contract of another client and on internal work refused; snapshot and deadlines at creation; no contract → not applicable with a reason; editing the contract keeps earlier snapshots, new cases take the new target; first response not in the future / before the case / without a channel, refused for an account without a role, recorded once (409), timeline event; progress *sent to the customer* records it, internal progress does not; validation resolves, rejection clears, close and reopen keep the first resolution; customer waiting pauses (≈180 min); a breached response shows at once and the sweep stores it with the overrun; contract change rules and removal; list filters `contractId`, `sla`; dashboard counts, rates, overall, open-and-breached, by contract and priority, each equal to its drill-down; narrowing to another contract gives no rate; deleting a contract with everything that belongs to it unlinks its cases and clears their measurement. `AC20` updated for the new contract SLA note.
- `tests/e2e`: **43 passed, 0 failed**. New journey *Measured SLA compliance*: create a case with the contract chosen, the Contractual SLA panel, record the first response once, the timeline, contract page → its cases, the SLA list filter, the dashboard band with its definition and a tile opening the filtered cases. Command Center journey: nine figures and the SLA band instead of the not-available statement; contract journey: new note. *Copy a server from R1 to R2* now filters the growing server table first (failed once on page size, not on SLA).
- Schema script regenerated (migration `CaseContractualSla`, additive only) and run three ways: copy of the UAT database (re-run is a no-op), empty database, 2.10 backup; new case and contract columns present, existing cases *Not applicable* until the start-up backfill.
- Checked with screenshots on the development data at 1920×1080, 1366×768 and 768×1024 (dashboard band, case panel, filtered list): no horizontal overflow, no console errors. Found in review and fixed: a contract removed by *Delete everything* left its cases' earlier results in place (the unlink bypasses the save hook) — they are now cleared at once and by every sweep.

## Release 2.27.0 — 22 Oct 2026 (Operations Command Center)

- `dotnet test tests/TioHub.Tests`: **115 passed, 0 failed**. New `AC60_OperationsCommandCenter`: an account without a role is refused; an unknown or incomplete period is refused; a new client shows zero open cases and nothing measured (no invented rates), a 7-day period gives daily buckets; with a case due in 3 hours, an escalation past its response target (level 2, linked to that case) and an Unavailable condition report: one case approaching, one active and overdue escalation with highest level 2, response measured 1 / met 0, resolution not yet measured, the attention row names the missed response and the case, the environment is listed; the action list gives CaseDueSoon High (High priority), EscalationOverdue Critical and EnvironmentCondition Critical, every item has a severity; `/cases?due=24h` returns the case; *my work* for the escalation owner shows it, for someone else not.
- `tests/e2e`: **42 passed, 0 failed**. New journey *Operations Command Center*: the eight figures are links; the queue's first row has a severity and an issue-type filter shows only that kind; a custom period shows its dates and renames the trend; *My work* and *Reset filters*; six contract health tiles; the *Measured SLA compliance is not yet available.* statement; environments not reported healthy; data quality with severity and a working link. Earlier dashboard journeys updated for the new title, the attention queue, *Reset filters* and *Overdue payments*.
- Checked with screenshots on the development data at 1920×1080, 1366×768 and 768×1024: no horizontal overflow, no console errors. Fixed after review: the period hint made the filter bar uneven (moved to one line under it), *Targets met* showed *Not available* although a resolution target was measured (now all measured targets together), the record priority ran into the severity badge, the *Show* toggle wrapped at 1366 px.
- No database change; the schema script is unchanged from 2.25.0.

## Release 2.26.0 — 22 Oct 2026 (Executive overview and Client map on separate pages)

- `dotnet test tests/TioHub.Tests`: **114 passed, 0 failed** (no server change).
- `tests/e2e`: **41 passed, 0 failed**. The dashboard journeys now start on the Client map (keyboard on the Saudi Arabia badge, the side panel, *Show the overview for Saudi Arabia* → the overview filtered to it, then the figure switch on the map) and check that the overview's section bar has no *Map* and that its *Client map* button opens the map with layers, scale, full screen and client markers.
- Defects found and fixed: map badges left at the positions of the previous zoom (first fit animated, markers drawn during the animation; diagnosed with temporary logging in the journey); a client popup closing when a flight ended. The marker journey was run three times in a row without failure.
- Test upkeep: six journeys looked for a newly added row in tables that grow with every run of the persistent E2E database (escalation channels, server types, sub-clients, project team roles, teams, the client's escalations, a copied environment's servers) or in a row whose name became empty; they now filter the table first or find the row by its link.
- No database or API change.

## Release 2.25.0 — 22 Oct 2026 (version release notes and features; teams into project teams)

- `dotnet test tests/TioHub.Tests`: **114 passed, 0 failed**. New `AC57_VersionReleaseNotesAndFeatures`: a feature of another product and a new name that already exists are refused; a version is created with release notes, an existing feature and a new one (blank names ignored), and both features show it as *introduced in*; editing the list leaves the dropped feature on the product without a version; a feature names a version itself, and a version of another product is refused; deleting a version keeps its features.
- `tests/e2e`: **41 passed, 0 failed**. New journeys: a version with release notes, a picked and a new feature, shown in the table and the notes view, and the feature's *Introduced in*; a new client takes the TIO Operations team into its project team, and single members can still be added.
- Checked in the browser: the version dialog on PSOP (notes, new-feature input); the client form adding ITD (one active member, role to choose). Fixed while testing: a team without active members was reported as *already on the team*.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (upgraded, re-run with no change: 18 migrations), an empty database and the 2.10.0 backup; the new column exists in each.

## Release 2.24.0 — 22 Oct 2026 (edit and delete product modules, microservices, features and versions)

- `dotnet test tests/TioHub.Tests`: **113 passed, 0 failed**. New `AC56_ProductPartsEditAndDelete`: an unused product version label is corrected, a used one cannot be renamed or deleted (409 with *used by installations*), the unused one is deleted; a microservice version number is corrected while no server runs it, deleted, and the microservice is deleted with its remaining version; deleting a module unlinks its feature; the feature is deleted and the deletion is audited. `AC03b` now expects a duplicate microservice version number to be refused (renaming an unused number is allowed since A56).
- `tests/e2e`: **39 passed, 0 failed**. New journeys: on a new product, add a module, feature, microservice and version, correct the version label, then delete all four from their rows; on PSOP, deleting a version that installations use is refused and the dialog says why. The access journey's *Module* field lookup was made exact (the new row buttons are also named after modules).
- Checked in the browser: the PSOP versions table with Edit and Delete per row.
- Not covered by an automated test: the refusal for a microservice that is deployed (same check pattern as the versions).
- No database change.

## Release 2.23.0 — 22 Oct 2026 (reviews and references removed; team members; time zones; deployment package)

- `dotnet test tests/TioHub.Tests`: **112 passed, 0 failed**. New `AC52_ReviewsAndDocumentReferencesRemoved` (`/reviews` and `/documents` answer 404; adding a server refreshes the environment's inventory review) and `AC53_TeamMembersRolesAndProducts` (the list holds the default roles; a role outside the list and an unknown product are refused; an engineer cannot change members; a member is added with a new listed role and a product given in lower case is stored as its code; edited to another role, no products and inactive; removal is refused for an engineer and works for the manager, leaving the user). Updated: the environment review test now expects a save to confirm the environment, and the secrets test that the document endpoint is gone. The restore drill caught an extra audit row from importing typed team roles; the sample data now uses listed roles.
- `tests/e2e`: **37 passed, 0 failed**. New journeys: a team is created, a member added with a listed role and a product chip, edited to another role without products, and removed; the role list is under Configuration; the new-case due time zone is a list (Asia/Dubai chosen); DEMO-NTA's tabs contain no review or reference section.
- Defects found and fixed while testing: the member dialog stayed open after a successful edit (an empty 204 answer was taken as failure); dashboard client markers could cover the country badges when the test data concentrated many clients in one country (markers now appear only for the opened country or from zoom 6).
- Deployment scripts: PowerShell syntax check of all three scripts; `Install-TioHub.ps1 -CheckOnly` on the build machine (correctly reports what is missing and changes nothing); `-DatabaseOnly -CreateDatabase` against a scratch LocalDB database (database created, schema applied, application login for `NT AUTHORITY\NETWORK SERVICE` with the audit deny), re-run as a no-op; `Backup-TioHub.ps1` against the same scratch database; the scratch database and login were dropped afterwards. The IIS steps and `Upgrade-TioHub.ps1` were not run here (no changes to this machine's IIS); their first real run is on the target server.
- Defects found by these runs and fixed: `database/02-app-login.sql` never compiled (`DB_NAME()` inside `EXEC(...)` is not allowed; now read into a variable) — it had not been exercised because the local UAT uses LocalDB with the developer's own identity; and `sqlcmd -v` cannot pass an identity containing a space (the default `IIS APPPOOL\TioHub`), so the installer now fills the identity into a temporary copy of the script. The dashboard client-marker and team-dialog fixes above were found in the browser.
- First run on a real target (owner, 22 Oct 2026): `-CheckOnly` reported the ASP.NET Core Module missing although the Hosting Bundle 10.0.13 was installed — the check looked in `System32\inetsrv`, but the bundle installs it under `Program Files\IIS\Asp.Net Core Module\V2` and records it in the registry. Fixed; the package was rebuilt.
- Second real run: with the default pool identity the SQL login step failed (`IIS APPPOOL\TioHub` not found), because the login was created before IIS had created the pool that brings that identity into existence. The login step now runs after the pool is created; a rerun after an interrupted installation continues (existing pool reused, files copied again); SQL output shows only errors. Re-tested on scratch LocalDB with an explicit identity, without one (login deferred) and with an unknown account (error shown, script stops); scratch database and login dropped.
- No database schema change (`has-pending-model-changes`: none); the schema script is unchanged from 2.22.0.

## Release 2.22.0 — 21 Oct 2026 (modernized dashboard, Leaflet map)

- `dotnet test tests/TioHub.Tests`: **110 passed, 0 failed** (no server change).
- `tests/e2e`: **35 passed, 0 failed**. New journey *modern overview*: the section bar marks Overview, a click on *Contracts & SLAs* scrolls the heading into view and marks it; the *Needs attention* strip links to lists (or says all clear); the Leaflet layer control holds Muted, Standard, No base map, Country shading and Clients; the scale is shown; full screen opens and Esc closes it; opening Saudi Arabia shows a marker per client, a marker's popup opens the client inside the app. The existing dashboard journey (KPI drilldown, keyboard on the country badge, side panel, filter, figure switch, table view) passes unchanged.
- Checked by hand in the browser at 1280 px and 375 px: attention chips, icon cards, three chart columns per band, the sticky section bar under the top bar, the muted base map, UAE with its three client markers and the Qatar and Oman neighbours, a popup and its link, full screen, no horizontal overflow on a phone.
- Defects found and fixed while testing: the section bar slid under the top bar; the highlighted section could jump to a neighbour after a click (now follows the scroll position); a country with 27 clients made the marker ring wider than the map (grid layout for more than 8), and neighbouring countries' markers overlapped (only the opened country's clients are shown); the currency table was cut off in narrow columns.
- No database or API change; the schema script and OpenAPI document are unchanged from 2.21.0.

## Release 2.21.0 — 21 Oct 2026 (payments on the dashboard and in the notifications center)

- `dotnet test tests/TioHub.Tests`: **110 passed, 0 failed**. New `AC50_PaymentsOnDashboardAndNotifications`: a contract with an overdue (invoiced), a due, a later and a paid payment in EUR — an unknown state is refused; the default list holds the overdue and due ones in date order (overdue 5 days late); the summary gives 1,000 overdue and the due amount in EUR and one later payment; *paid*, *open* and *mine* (the contract owner sees 3, the manager none) work; the dashboard has the overdue bucket first, seven month columns, the EUR amounts and the next three payments; the action list counts 2 *PaymentDue* items linked to the contract; after the scan the Payments category holds a *PaymentDue* and a *PaymentOverdue* notice for the owner and nothing that is not a payment reminder; an unknown category is refused.
- `tests/e2e`: **34 passed, 0 failed**. The contract terms journey continues: the new payment is found under Notifications → Payments → *Due within 14 days* (57,500.00 AED, *Due soon*, *in 5 day(s)*), the reminders section is shown, and the dashboard has the *Payments due* figure, the *Contract payments* band and *Next payments*.
- Checked by hand in the browser: the *Payments due* figure (1, 60,000.00 AED due within 14 days), the band with the month chart, the AED amounts table and CT-1001 in *Next payments*; the Payments tab with its figures, state buttons, table and the reminder. A layout fault (date and contract title running into their second line) was fixed.
- No database change (`has-pending-model-changes`: none); the schema script is unchanged from 2.20.0.

## Release 2.20.0 — 21 Oct 2026 (editable attachment storage; contract terms and payments)

- `dotnet test tests/TioHub.Tests`: **109 passed, 0 failed**. New `AC48_AttachmentStorageSettings`: an engineer cannot read the storage settings; a blocked type (.exe), a size over the limit and a folder inside the web folder are refused; moving to a new folder moves an uploaded file (gone from the old folder, same bytes downloaded), the new files-per-upload limit applies at once, the attachment keys are not in the general settings and the move is audited; moving back restores the configured folder. New `AC49_ContractTermsAndPayments`: an unknown time zone, amounts without a currency, payment percentages over 100, a paid row without a date and a completion over 100 % are refused field by field; Sun–Thu 08:00–17:00 (Asia/Dubai), two phases, fees totalling 150,000 and three payments are saved (the past one flagged overdue); 24 × 7 replaces days and hours, an edited fee keeps its row, removed rows go; the scanner raises *Payment overdue* (45,000.00 AED) and *Payment due* (60,000.00 AED) for the owner and managers but nothing for the payment 200 days out.
- `tests/e2e`: **34 passed, 0 failed**. New journeys: a contract with Sun–Thu support (presets, 24 × 7 on and off), time zone from the list, a phase, two fee lines in AED (total 115,000.00 AED), a payment due in five days, shown on the detail page; the attachment storage dialog refuses .exe and saves a new files-per-upload value, then restores it. The project-contracts journey now filters its table first (earlier runs had filled the first page).
- Checked by hand in the browser: CT-1001 edited to Sun–Thu 08:00–17:00 (Asia/Dubai) with a 60 % phase, 120,000.00 AED of fees and a payment due (its old text "Mon–Fri 07:30–15:30" kept as support notes); the storage dialog saving a new limit.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (upgraded, re-run with no change: 17 migrations), an empty database and the 2.10.0 backup; the three contract term tables exist in each and the existing 24×7 contract was marked.

## Release 2.19.0 — 21 Oct 2026 (personal notes)

- `dotnet test tests/TioHub.Tests`: **107 passed, 0 failed**. New `AC47_PersonalNotes`: a notebook and section are created on first use; saved content loses scripts, `onclick`, `javascript:` links and an outside image while keeping bold text, a to-do item and an https link; a project link carries its client; the TIO Manager and an administrator cannot list, search, open, change, delete or add pages to the owner's section (404 / refused) and the change history does not contain the note; search and client filters find it for the owner; a stale save is refused with 412; the link can be made personal; a pasted image is stored under the attachment folder, served to the owner and 404 for others, and kept in the page; a sub-page goes to the recycle bin with its page and comes back with it; restore and permanent delete work and remove the file from disk; deleting a linked client clears the link (page kept, *link gone*) and the delete preview mentions no note; notebook and section validation, and the last notebook cannot be deleted.
- `tests/e2e`: **32 passed, 0 failed**. New journey *Notes*: write a page with bold text and a to-do list (autosaved), add a sub-page from the page menu, link the page to DEMO-NTA and find it on the client's *My notes* tab, search by its text, sign in as another user (the page is "not yours" and search finds nothing), delete it to the recycle bin and restore it.
- Checked by hand in the browser: the three-pane workspace at 1440 px (no side menu; notebooks › sections, page list, editor with toolbar and save state), a picture inserted through the toolbar and saved in the page, the client link, the client's *My notes* tab, a sub-page saved under its page, and the API as another user (404, empty searches).
- Defect found and fixed: restoring a page left its sub-pages in the recycle bin.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (upgraded, re-run with no change: 16 migrations), an empty database and the 2.10.0 backup; the four `notes` tables exist in each.

## Release 2.18.0 — 21 Oct 2026 (attachments stored on disk)

- `dotnet test tests/TioHub.Tests`: **106 passed, 0 failed**. New `AC46_Attachments` (files in a per-run temporary folder, 1 MB limit): an executable, an empty file, a file over the limit and an unknown record are refused; two files are attached to a case and listed with size and SHA-256 (a name like `..\..\notes.txt` is stored as `notes.txt`); the content is a file under the configured folder; another engineer downloads identical bytes as an attachment with its name; that engineer cannot remove it, the uploader can, and the file leaves the disk; a server, a contract and a client take files; deleting the case removes its files; *delete everything* on the client lists Attachments and removes their files.
- `tests/e2e`: **31 passed, 0 failed**. New journey: on a server page a refused `.exe` is explained before upload, two files are uploaded with a description, one is downloaded under its name, both are removed; a letter is attached to an escalation and removed.
- Checked by hand in the browser: a contract's *Contract and SLA documents* panel (refused `.exe`, upload, download of the same text, removal — the file left the disk folder; the database held only the metadata columns), and the storage folder shown under Settings.
- Defect found and fixed during testing: the file store was first kept in a static field, which a second test host replaced; it is now passed to each delete endpoint.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (upgraded, re-run with no change: 15 migrations), an empty database and the 2.10.0 backup; the `files.Attachment` table exists in each.

## Release 2.17.0 — 21 Oct 2026 (copy servers to several environments, and within an environment)

- `dotnet test tests/TioHub.Tests`: **105 passed, 0 failed**. New `AC45_CopyServerToManyEnvironments`: no target, the same target twice, the same environment without a rename and another client's environment are refused, and a refusal copies nothing anywhere; one request copies PSOP-APP1 into the same region's Staging (same name), the other region's Production (renamed) and its own environment as PSOP-APP2; the duplicate keeps its CPU and volume and runs the same component of the same installation, without a second installation; a clash in one target names it ("R1 / Staging") and rolls everything back. The earlier copy test now expects a same-environment copy without a new name to be refused as a name clash.
- `tests/e2e`: **30 passed, 0 failed**. New journey: from a server page, copy it next to itself and into the other region's Production in one go, with per-target renames and preview. The two earlier copy journeys use the new target list. Two journeys were made independent of data left by earlier runs (filter the table before looking for a new row).
- Checked by hand in the browser on the dev data: copying a server into its own environment, another environment of its region and two other regions at once — suggestions R1 → R2/R3 and app01 → app03 (app02 existed), a deliberate clash refused with the environment named, then a successful copy with notes about a component whose installation is missing in the targets; the four test copies were deleted afterwards.
- No database change (`has-pending-model-changes`: none); the schema script is unchanged.

## Release 2.16.0 — 21 Oct 2026 (delete with dependencies; time zone list)

- `dotnet test tests/TioHub.Tests`: **104 passed, 0 failed**. New `AC43_DeleteWithDependents`: a client with a region, environment, two servers, a volume, a firewall rule, a project and contract, a case, a commitment, an escalation, a boundary and a sub-client — the plain delete is refused; the preview needs the Delete right and counts each kind exactly, with links for the environment; the sub-client is listed as *kept, unlinked*; an item deleted on its own disappears from the preview; *delete everything* removes the client, servers, case and contract, leaves the sub-client as a main client and another client untouched, and writes an audit entry; the same works for one environment. The forms-setup test now checks that the computer's zone becomes the administrator's and the hub default.
- `tests/e2e`: **29 passed, 0 failed**. New journeys: delete a client from its page — the dialog lists the groups, one escalation is deleted from the list, the servers open to their links, *Delete everything* stays disabled until confirmed, then client and environment are gone; the default time zone list (over 300 zones, *Use this computer's time zone*, saved and shown with its offset) and the commitment form's zone list.
- Checked by hand in the browser: the dialog for a real-size client (98 related records: main groups first, details summarised, cancel leaves everything), the DefaultTimeZone dialog preselecting the computer's zone (Asia/Dubai) and saving it.
- No database change in this release (`has-pending-model-changes`: none); the schema script is unchanged from 2.15.0.

## Release 2.15.0 — 21 Oct 2026 (escalation management)

- `dotnet test tests/TioHub.Tests`: **103 passed, 0 failed**. New `AC41_Escalations`: an unknown channel, someone else as owner (engineer), a future receipt and a case of another client are refused; the escalation gets an `ESC-` reference and is overdue while unacknowledged past its response target; a logged e-mail reply without a note is refused, with a note it acknowledges the escalation and clears the overdue flag; levels go 1 → 3 and no further; closing straight from Acknowledged is refused, resolving needs the resolution, reopening a closed escalation needs a reason; the timeline holds 8 entries; a new channel is accepted at once and cannot be deleted while used; the owner assigned by the manager is notified; the dashboard counts escalations by channel; deletion needs the Delete right and removes the timeline.
- `tests/e2e`: **27 passed, 0 failed**. New journey *Escalations*: add a channel on Configuration → Escalation channels, record an escalation through it with a contact, log an e-mail reply (acknowledged), raise to level 2, resolve with a resolution, find it on the client's Escalations tab, and see the used channel refused for deletion. The firewall-rule journey now uses *Find server* (the e2e client has 255 servers after many runs, more than the 200 the list loads — the reason for that fix).
- Checked by hand in the browser: new escalation form, detail page with timeline, log communication, raise level, resolve (missing resolution refused), edit, list, dashboard KPI and Escalations band, Escalation channels page with usage counts.
- Defects found and fixed (A42): default times on a directly opened form were saved as UTC; `index.html` served for deep links could be cached across an upgrade; the firewall rule server lists stopped at 200 servers.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (upgraded, re-run with no change: 14 migrations, 70 configuration values), an empty database and the 2.10.0 backup; in each, the `Escalation` table exists and the 4 channels are seeded.

## Release 2.14.0 — 20 Oct 2026 (firewall rules, contacts, deletion, notifications, tables, dashboard)

- `dotnet test tests/TioHub.Tests`: **102 passed, 0 failed**. New `AC37_DeleteContactsNotifications`: a server owner's contact details are stored field by field (an invalid phone is refused); a boundary names a person who is not a hub user, and a typed person together with a hub user is refused; deleting needs the Delete right (403 for the engineer); a server still used by a firewall rule is refused (409 naming firewall rules), then deleted with its volume once the rule is gone; an environment that still has a server is refused; an unused configuration value is deleted and a used one refused; an unused team is deleted; an unknown team role is refused; the engineer is notified of joining a project team and of a case the manager assigned, mark read and read-all work, and the manager gets no notice for their own action. `AC05_FirewallRules` replaces the dependency test: same server, another client's server, an invalid port and missing ports for TCP are refused, as is a missing purpose; ports are normalised ("443,8080 - 8090" → "443, 8080-8090"); ICMP needs no ports; the list filters by client, server and text; the server page lists its rules; update with version and delete without; the case impact lists the rule of an affected server and reaches the installation on the other side; the old `/network/endpoints` route returns 404. AC04/AC12 updated for the removed provenance and network endpoints; team-role errors now point at `team[n].role`.
- `tests/e2e`: **26 passed, 0 failed**. New journeys: firewall rule recorded, searched, shown on the server page and deleted; table filter, row count, header sort and CSV download, a configuration value deleted from its table and an in-use one refused; a team deleted from the Teams table; a boundary with a typed responsible person (invalid e-mail refused, contact shown); a server owner typed with e-mail and mobile (mail link, no provenance panel); notifications bell and page. Updated: Roles and Rights pages (tick saves at once, TIO Manager locked, unused role deleted), team role dropdown, dashboard map (a country click shows its clients; filtering is a separate button; the figure switch; Contracts & SLAs band).
- Defects found while testing and fixed: the Rights tick waited for the server before showing (now immediate, undone on failure); the table filter label repeated the table name and clashed with form labels; obsolete data-quality findings of removed rules stayed open (the migration now clears them).
- Checked by hand in the browser: dashboard at 1440 px (KPI band, map with figure switch, fly-to and country panel, all chart bands), firewall rule dialog, configuration delete (unused value deleted, Production refused with "used by 15 record(s)"), notifications page, Rights matrix, team role dropdown, server owner and boundary contact cards.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (upgraded, then re-run with no change: 13 migrations, 66 configuration values both times), an empty database and the 2.10.0 backup; in each, the network tables are gone, `FirewallRule` exists and the 6 project team roles are seeded.

## Release 2.13.0 — 20 Oct 2026 (configuration per list, configurable types)

- `dotnet test tests/TioHub.Tests`: **101 passed, 0 failed**. New `AC34_ConfigurableTypes`: a type value without a category is refused; "Pre-production" gets the code `PreProduction…`; an environment with it stores the configured type; an "Other"-category type needs a description; an unknown type is refused and built-in names still work; a server type in the Logical-endpoint category refuses CPU and is counted as a logical endpoint, not a VM; the asset list filters by the configured type; a contract takes a configured type; usage counts, reordering (seen in /reference) and retiring work, and a retired type stays valid on its record but is refused for a new one. All earlier tests pass unchanged (the API stays compatible).
- `tests/e2e`: **20 passed, 0 failed**. New journey *Configuration*: overview, Server types page, add "Container host" behaving as Physical server, the old /admin/reference address leads to the overview, the server form offers the new type and the server list shows it.
- Schema script verified three ways before the UAT upgrade: a copy of the current UAT database (run twice, no errors), an empty database and the 2.10.0 backup; every server, environment, contract and case got its category and the 20 type values were seeded.

## Release 2.12.0 — 20 Oct 2026 (ease of use)

- `dotnet test tests/TioHub.Tests`: **100 passed, 0 failed** (no server change).
- `tests/e2e`: **19 passed, 0 failed**. New journey *Ease of use*: a click on a client row's country cell opens the client; "+ New" lists Case and closes with Escape; the header search opens the search dialog. Updated journeys use the "+ Add" and "More" menus and the renamed server form ("Server name", "Add server").
- Reviewed at 1440, 768 and 390 px wide: header, menus and the server form fit; on a phone the dialog body scrolls and Cancel / Add server stay visible.
- Found and fixed during the UAT upgrade: re-running the idempotent schema script on an up-to-date database failed, because the 2.3.0 migration's data SQL named the `UserRole.Role` column that 2.11.0 removed (SQL Server compiles the whole batch even when the step is skipped). All raw migration SQL now runs through `EXEC`; the script was verified on the up-to-date UAT copy (no-op), an empty database (full create) and the 2.10.0 backup (upgrade). The first attempt stopped before any change; UAT was then upgraded normally.

## Release 2.11.0 — 20 Oct 2026 (configurable roles and rights; UAT list)

- `dotnet test tests/TioHub.Tests`: **100 passed, 0 failed**. New `AC31_RolesAndRights`: eight rights listed, the TIO Manager role locked with all of them; an engineer cannot open Roles & rights; a new role without rights lets its holder view a client but not create an environment or export; after ticking Edit and Export the same signed-in user can do both at once; removing a right from the TIO Manager role, deleting a built-in role and deleting a role still held are refused, an unused role is deleted; a product with a free-text owner is created, an engineer cannot delete it, a product with an installation is refused, the unused product (with module, microservice and version) is deleted; a server gets a named external technical owner with contact details, both kinds at once is refused, no owner still needs a coordinator. Updated for the new rules: roles are reported by name (`TIO Manager`), version evidence is optional on creation, version confirmation and copying (the history is still written).
- `tests/e2e`: **18 passed, 0 failed**. New journeys: Roles & rights (create a role, untick Edit, tick Change history, see the matrix, the TIO Manager's Administration right cannot be unticked); creating an environment from the R2 region page with client and region preselected. Updated: the Role list comes from the roles (built-in first).
- Upgrade path: the 2.11.0 schema script applied to a restored copy of the UAT database (8 users, 2 products) kept every user's role (2 TIO Manager, 6 Operation Engineer) and copied the product owner's name. Found and fixed while testing: the data steps of this migration failed to compile in the idempotent script (one batch per migration); they now run through `EXEC`.

## Release 2.10.0 — 20 Oct 2026 (copy a whole environment to another region)

- `dotnet test tests/TioHub.Tests`: **99 passed, 0 failed**. `AC03c_CloneAcrossRegions` extended: copying into the same region with the same name is refused; into R2, which already has Production, is a name conflict; into a new region R3 creates "Production" with the source criticality, the renamed server `cl-r3-app01` and installation `R3 Main`, with the server's microservice attached.
- `tests/e2e`: **16 passed, 0 failed**. New journey: from NTA R1 Production, "Copy to another region" opens on *a new environment* with every server and installation ticked, region R2 suggests the R1→R2 rename, the copy opens as the new environment in R2 with the renamed servers. The existing-environment journey now checks that choosing *an existing environment* clears the preselection.
- Found and fixed while testing: switching the dialog to *an existing environment* kept every server ticked from the whole-environment mode.

## Release 2.9.0 — 20 Oct 2026 (sub-clients, project teams, copy to another region)

- `dotnet test tests/TioHub.Tests`: **99 passed, 0 failed**. New `AC01b_SubClients`: a main client with two sub-clients; a sub-client of a sub-client, a duplicate team member, a team member without role and turning a main client with sub-clients into a sub-client are refused; each sub-client keeps its own regions, environments and servers, counted on the main client; the team keeps its order and roles; filters by main client, main only and sub only; an engineer edits the team; the main client cannot be archived while a sub-client is active. New `AC03c_CloneAcrossRegions`: R1 → R2 copy renames `cl-r1-app01` to `cl-r2-app01` and `R1 Main` to `R2 Main`, copies are Planned with specification and volumes but no provenance or versions, the hosted microservice is attached; same environment, another client, empty selection and versions without evidence are refused; a second copy clashes on names and saves nothing; with evidence the product version (with history) and microservice version are copied; copying only a server attaches it to the target's existing installation.
- Found and fixed: environments of an archived client were counted in the dashboard condition chart but not in the environment list it links to (`AC11_DashboardInsights` caught it once a test archived a client that still had an environment).
- `tests/e2e`: **15 passed, 0 failed**. New journeys: from DEMO-NTA, "+ Sub-client" with the main client preselected and country suggested, a project team member, the sub-client on the main client page and in the list; from NTA R1 Production, "Copy to another region" to R2 / Production with the R1→R2 rename suggested, preview of the new name, the copy opened in R2 as Planned.

## Release 2.8.0 — 20 Oct 2026 (projects hold their contracts)

- `dotnet test tests/TioHub.Tests`: **97 passed, 0 failed**. `AC20_ContractsAndSla` reworked: a contract without a project, or with another client's project, is refused; the contract takes its client and covered products (PSOP) from the project and the product filter finds it; moving it to another client's project is refused; the project page lists its three contracts with renewal state and SLA targets; the project list reports 3 contracts, 2 active, 2 needing renewal attention; a project with an Active contract cannot be archived; the CSV export has a Project column. `AC12` engineers create contracts on an existing project.
- `tests/e2e`: **13 passed, 0 failed**. Contracts journey rewritten: Projects & contracts page with renewal attention, contract register tab (project link, renewal due), open project HCP rollout, "+ Contract" with the project preselected and its client and products shown, SLA validation, save, covered products from the project, back on the project the new contract with "End date unknown" and its SLA target.
- Upgrade path: the 2.8.0 schema script applied to the end-to-end database at 2.7.0 (14 contracts without a project, 2 contract products) created 14 projects, linked every contract and kept the products.
- Found and fixed while testing: after saving a contract, the project page could show the previous contract list for up to 15 seconds (cached); saving now refreshes it.

## Release 2.7.0 — 20 Oct 2026 (deployed microservice version per server)

- `dotnet test tests/TioHub.Tests`: **97 passed, 0 failed**. `AC03b_MicroserviceDeployment` extended: a server created with Importer at 1.10.0 and PlateLookup with no recorded version shows both in its options; the microservice page reports 1.10.0 on that server and nothing on another; the server page changes it to 1.2.0; the installation page's "Choose microservices" keeps 1.2.0; a version of another microservice is refused and nothing changes.
- `tests/e2e`: **13 passed, 0 failed**. Microservices journey extended: two Importer versions added; on the new server the version defaults to the latest (2.2.0) and is set to 2.1.0; the installation view shows "· 2.1.0"; on the server page the Hosted microservices panel shows 2.1.0, is edited to 2.2.0 and shows it.

## Release 2.6.0 — 20 Oct 2026 (hosted microservices on the server form)

- `dotnet test tests/TioHub.Tests`: **97 passed, 0 failed**. `AC03b_MicroserviceDeployment` extended: a server created with two hosted microservices in one request appears with them on the installation's deployment view and in the server's options (pre-ticked); editing the server replaces its microservices; a selection for an installation of another environment refuses the whole request and no server is created.
- `tests/e2e`: **13 passed, 0 failed**. Microservices journey extended: from the environment page, add a server, tick a microservice of "PSOP Main" (installations are labelled groups, so two PSOP installations are unambiguous), save, and see it on the installation's deployment view.
