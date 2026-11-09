# Business integrity — stage 1

Scope: resource-specific authorization, safe deletion of project organization contexts, and deployment/schema compatibility. Financial/SLA corrections and later workflow policy changes are separate stages.

## Authorization

- Shared delete and restore handlers resolve the record's owning resource through `ResourcePermissions.ForRecord`. Unknown types are refused. Configuration deletion uses Administration; fixed condition/status values cannot be deleted.
- A cascade needs the root's Delete permission, Delete for every independent business resource actually removed, and Maintain for retained business resources whose optional references are cleared. This applies to preview and execution. History, attachment and link cleanup inherit the owning record's authorization.
- Create, Maintain, Coordinate and ArchiveRestore are checked independently for base records, owner changes, teams, attachments and inventory copies. Owned child edits (for example adding a volume or product module) retain the parent's Maintain policy.
- An inventory copy checks every resource it creates, including a new environment, selected servers/installations and generated components. Modifying an existing component's hosts requires Servers Maintain. The transaction rolls back when any required permission is missing.
- API capability flags and browser action controls use resource/action permissions. Legacy broad rights remain compatibility output, not authorization for these operations. Existing commitment workflow transitions retain Maintain pending a separate business decision.

## Organization graphs

Project-specific relationships are owned by their project even though ProjectId is nullable. Direct and cascade project deletion remove those edges while preserving organizations and client-wide/other-project edges. Deletion takes the existing graph context transaction locks before collecting edges. Serializable transactions protect authorization and mutation from concurrent additions or changes to dependent records and optional links.

## Deployment

Startup checks required migration IDs against EF's configured `[admin].[__EFMigrationsHistory]` before reference seeding, setup, storage loading or backfills. Missing intermediate entries and missing history fail with an actionable DBA message. The read-only probe has a 15-second bound; unavailable/history-access failures produce a sanitized error. No database is created or migrated by the check.

Readiness is 200 only when the database is accessible and all required migrations are recorded; otherwise 503 without migration or connection details. Newer additive migration entries do not prevent an older application from starting during rollback. This checks migration history, not arbitrary manual schema drift.

Release building rejects schema SQL that omits an application migration. Install and upgrade scripts exit with failure if the application never becomes ready. Production deployment and DBA migration remain separately approved operations.

## Validation

Focused .NET coverage: cross-resource delete/restore denial, dependent cascade authorization (including handovers and installation components), create versus maintain, owner/team coordination, API capability flags, attachment deletion, clone permissions and rollback, project-context cleanup, fixed workflow deletion protection, and current/missing/unavailable schema checks. A command-interceptor regression pauses deletion after authorization and proves that a concurrent optional-link update is blocked until the protected transaction finishes. Browser coverage checks custom role action visibility and authorized copy choices.

Results on 23 October 2026:

- Full Release .NET suite: **177 passed**, including **17 new focused regressions**. Report: `tests/TioHub.Tests/TestResults/stage1-full.trx`.
- Full Microsoft Edge Playwright suite: **55 passed**, including **6 new permission regressions**. Existing journeys were updated for the configurable status label, resource matrix, alternate test port and an unambiguous page action selector.
- Frontend production build: **passed** (`tsc -b` and Vite).
- Vitest: no test files are present; its command exits 1 for that reason. Browser behavior is covered by Playwright.
- PowerShell AST syntax checks: **passed** for build/install/upgrade scripts. Deployment SQL coverage: **all 24 current migrations present**.

The existing development API holds the Debug DLL open, so Playwright used the already-tested Release build on port 5097 through the ignored `.local/stage1.playwright.config.mts`; its own uniquely named test database remained separate. The running development API was not stopped or replaced. Generated .NET reports remain in their original folder after automatic approval review blocked report cleanup.

Database impact: no new migration and no production/shared database changes. Tests use uniquely named disposable databases.

## Remaining scope and limits

- Stage 2 remains: penalty cap/reconciliation/snapshot corrections, overnight SLA calendars, inventory category copying and operational transition invariants from the review.
- Later configuration/reporting usability and business policy decisions remain separate work. This stage adds fixed-workflow deletion protection but does not add the missing label configuration screens.
- Readiness verifies migration history, not manually damaged tables or columns when the history claims they are present.
- Serializable deletion can wait for concurrent writers. Production-sized cascade contention and deployment on IIS were not exercised; no production package was built or deployed in this stage.

## Files touched in this stage

- Backend: `Security/ResourcePermissions.cs`, `Data/HubDbContext.cs`, `Data/DatabaseReadiness.cs`, `Program.cs`; module handlers under Admin, Attachments, Catalogue, Clients, Commitments, Contracts, Environments, Escalations, Inventory, Quality, Shared, Teams and Work.
- Browser: `src/web/src/permissions.ts`; action controls in Admin, Attachments, Cases, Clients, Commitments, Contracts, Environments, Escalations, Firewall, Inventory, OrganizationStructure, Products, Quality and Teams; `pages/common.tsx`, `ui/Shell.tsx` and `ui/kit.tsx`.
- Deployment: `build/Build-Release.ps1`, `deploy/Install-TioHub.ps1`, `deploy/Upgrade-TioHub.ps1`.
- Regression coverage: `tests/TioHub.Tests/Stage1IntegrityTests.cs`, `tests/e2e/resource-permissions.spec.ts`, and existing journeys in `tests/e2e/journeys.spec.ts` updated for configurable labels, resource permissions, alternate test ports and specific action selectors.
- Guidance: `docs/DECISIONS.md`, `docs/OPERATIONS.md` and this file.
