# TIO Operations Hub — Shared AI Engineering Rules

## Project
TIO Operations Hub is a .NET backend and React/TypeScript
frontend application for software operations management.

## Important paths
- src/TioHub.Api: ASP.NET Core API
- src/web: React and TypeScript frontend
- tests/TioHub.Tests: .NET automated tests
- tests/e2e: Playwright end-to-end tests
- database: Database scripts
- docs: Requirements, decisions, and architecture guidance

## Read before developing
1. README.md
2. docs/DECISIONS.md
3. docs/DESIGN-RULES.md
4. docs/IMPLEMENTATION-PLAN.md
5. docs/OPERATIONS.md

## Architecture
- Respect the existing modular architecture.
- Preserve existing business behavior.
- Use existing API, security, and validation patterns.
- Avoid introducing unnecessary packages.
- Maintain compatibility between backend and frontend.

## Rights, configuration and seed data for new features (default)
Every new page, feature, module, action or configuration list is wired
into roles & rights, configuration and seed data in the same change,
without being asked. A feature is not complete until all of these apply:
1. Right: reuse an existing right if it fits; otherwise add a new one:
   - `Right` enum in `src/TioHub.Api/Common/Enums.cs` (next power of two).
   - `BuiltInRoles.Catalog` (label + description) and `BuiltInRoles.All`
     in `src/TioHub.Api/Security/Roles.cs`; decide `EngineerDefault`.
   - `RightKey` in `src/web/src/hooks.ts`, so it shows on
     Administration → Rights.
2. Enforcement: the server checks the right on every endpoint
   (`me.HasRight(...)` / `RequireAdministrator()`); the UI hides nav
   items, routes, buttons and menu entries with `useCan(...)`
   (`ui/Shell.tsx`, `App.tsx`, the page itself). UI checks are hints only.
3. Configuration: new choice lists become configuration lists
   (`LookupLists` + Administration → Configuration), and new tunables
   become settings (`SettingKeys`), not hard-coded values.
4. Seed data: idempotent defaults in `src/TioHub.Api/Data/ReferenceData.cs`
   (lookups, settings, policies). Demo records go in `DevelopmentData.cs`
   / `PortfolioData.cs` (Development/Testing only). Existing databases
   must get the defaults on upgrade (seed only what is missing; never
   overwrite administrator changes). If an existing role, such as
   Operation Engineer, should receive a new right, do it in an explicit,
   reviewed upgrade step and state it in the completion report.
5. Schema: update `database/01-schema.sql` (idempotent) and add an EF
   migration if needed; follow "Database protection" below.
6. Tests and docs: test that the right allows and denies access, add an
   entry to `docs/DECISIONS.md`, and update `docs/API.md` when endpoints
   change.
If a right or default is a business decision (who gets it), propose a
default, implement it, and flag it under "Known issues and risks".

## Database protection
- Never modify shared or production databases.
- Never execute database migrations without approval.
- Never delete or reset database data without approval.
- Use separately configured development databases for
  Claude and Codex.
- Do not assume Git worktrees isolate SQL Server databases.

## Security
- Never expose passwords, tokens, or connection strings.
- Never bypass authentication or authorization.
- Never commit secrets or machine-specific configuration.
- Review migrations and schema changes before execution.

## Testing
- Run relevant .NET tests for backend changes.
- Run frontend checks for TypeScript changes.
- Run Playwright tests when browser behavior changes.
- Report test results and any tests not executed.
- Do not start external services without approval.

## Git collaboration
- Never commit directly to main from an AI worktree.
- Each agent owns its own branch and working directory.
- Never edit the other agent's worktree.
- Never merge branches automatically.
- Never force push, hard reset, or discard user changes.
- Keep changes focused on the assigned task.

## Completion report
For every task, provide:
1. Summary of changes
2. Files changed
3. Tests executed and results
4. Known issues and risks
5. Database impact
6. Rights, configuration and seed data added (or why none were needed)
7. Suggested next action
