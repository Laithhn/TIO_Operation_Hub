# TIO Operations Hub

One dependable operational view of TIO's clients (with or without regions), their environments, application installations, supporting infrastructure, contracts and recorded SLA terms, cases, commitments, teams and data quality — built from the standalone BRD v1.0 (16 Oct 2026), MVP scope plus contracts (CLI-04, brought forward).

| Layer | Technology |
|---|---|
| Back end | C# / ASP.NET Core 10 minimal APIs, modular monolith (`src/TioHub.Api/Modules/*`), versioned REST `/api/v1`, OpenAPI at `/openapi/v1.json` |
| Database | SQL Server via EF Core 10 (migrations `InitialMvp`, `Contracts`; idempotent script `database/01-schema.sql`) |
| Front end | React 18 + TypeScript + Vite + TanStack Query (`src/web`), built into the API's `wwwroot` |
| Tests | xUnit unit + SQL Server acceptance tests (`tests/TioHub.Tests`), Playwright browser journeys in Microsoft Edge (`tests/e2e`) |

The hub never calls Jira, vaults, client systems or messaging: Jira tickets are stored as manual references only. SLA targets are recorded from contracts, and client cases linked to a contract are measured against them (response and resolution, A61). The Reporting Center (A62) previews and exports reports as CSV or Excel, keeps an export history and runs scheduled reports inside the hub.

## Documents

| Document | Content |
|---|---|
| [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md) | Plan, architecture, technology choices |
| [docs/REQUIREMENTS-COVERAGE.md](docs/REQUIREMENTS-COVERAGE.md) | All 105 BRD requirements with status and evidence |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Implementation assumptions and open business decisions |
| [docs/DESIGN-RULES.md](docs/DESIGN-RULES.md) | Design rules from the reference screenshot, tokens, components, visual comparison |
| [docs/API.md](docs/API.md) / [docs/openapi-v1.json](docs/openapi-v1.json) | API conventions and full OpenAPI document |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | Deployment (IIS + SQL Server), configuration, backup, restore, rollback |
| [docs/TEST-RESULTS.md](docs/TEST-RESULTS.md) | Actual test results and known gaps |

## Run locally

Requirements: Windows, .NET SDK 10.0.4xx, SQL Server LocalDB, Node.js 22 (or the copy in `.tools/node`, which is git-ignored).

```bash
cd src/web && npm ci && npm run build
```

```bash
dotnet run --project src/TioHub.Api --launch-profile http
```

Open http://localhost:5094. Development mode creates and migrates a LocalDB database and loads demo data. Two profiles exist (`Database:DevelopmentDataProfile`):

| Profile | Database (dev) | Content |
|---|---|---|
| `Portfolio` (dev default) | `TioHub_PortfolioDev` | Modelled on the Q2 2026 resource/load workbook: 15 client organizations in 11 countries (Dubai Police, Tahakom with 3 regions, SEWAR, Madar Dijla, Rwanda EV, NARSA, SAPOL, …), their projects, products, support scope, monthly delivery items as commitments, workbook remarks as cases, product teams and the coverage plan as handovers. **All people are fictional personas**; environments, versions, servers and outcomes are mocked. Source: `src/TioHub.Api/Data/PortfolioData.cs`. |
| `Fictional` (tests, e2e) | `TioHub_MvpDev` / per-test DB | DEMO-NTA (regional: R1 North, R2 Coast, plus a direct environment), DEMO-HCP (no regions) and DEMO-ONB (country unknown). |

**Real names (optional, local only).** Fill `displayName`/`email` in `.local/demo-people.json` (git-ignored, never packaged; each entry lists the persona's role) and restart — the names replace the personas on start-up (`Database:LocalPeopleFile`, Portfolio profile, Development only). Clearing a value does not restore the persona in an existing database; drop `TioHub_PortfolioDev` to reseed.

Development sign-in uses fictional accounts; switch user with the selector in the top bar:

| Account | Access (Portfolio profile / Fictional profile) |
|---|---|
| `DEV\manager` | TIO Manager (also administers users and settings) |
| `DEV\lead` | TIO Manager in the Fictional profile; Operation Engineer in Portfolio (`lead2`, `lead3` too) |
| `DEV\engineer`, `DEV\engineer2`, `DEV\viewer` | Operation Engineers |
| `DEV\admin` | TIO Manager |

Two roles only (DECISIONS A22): both see every client, technical detail and change history, and can export.

Development sign-in is refused at start-up in any environment other than Development and Testing.

Front-end hot reload (API running): `cd src/web && npm run dev` → http://localhost:5173.
On networks that block `registry.npmjs.org`, the committed `.npmrc` files use `registry.npmjs.com` (same official registry).

## Tests

```bash
dotnet test tests/TioHub.Tests
```

Uses LocalDB by default; set `TIOHUB_TEST_SQL` to another SQL Server instance. Browser journeys (start nothing else on port 5096):

```bash
cd tests/e2e && npm ci && npx playwright test
```

## Release package

```powershell
.\build\Build-Release.ps1
```

Produces `release\TioHub-<version>.zip` (API + UI, database scripts, docs, deployment template) and its SHA-256.

## Database changes

```bash
dotnet tool run dotnet-ef migrations add <Name> --project src/TioHub.Api --output-dir Data/Migrations
```

```bash
dotnet tool run dotnet-ef migrations script --idempotent --project src/TioHub.Api --output database/01-schema.sql
```

Then re-add the `SET QUOTED_IDENTIFIER ON …` header at the top of the script (see the current file).

## Repository layout

```
src/TioHub.Api        API: Common (errors, guards, CSV, paging), Data (DbContext, migrations, seeds), Security, Modules/*
src/web               React UI: styles (tokens, components), ui (shell, kit, pickers), pages per module
tests/TioHub.Tests    unit, acceptance (AC-01..AC-15), restore drill, performance smoke
tests/e2e             Playwright journeys in Microsoft Edge
database              01-schema.sql (idempotent), 02-app-login.sql (least privilege, append-only audit)
deploy                appsettings.Production.example.json
build                 Build-Release.ps1
docs                  plan, coverage, decisions, design, API, operations, test results
```
