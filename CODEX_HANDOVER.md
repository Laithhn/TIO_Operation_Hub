# Codex Handover

Updated: 2026-10-30

## Current development objective

Resolve intermittent failures when a user's first API requests run in parallel and concurrently record sign-in state. The current working-tree implementation retries user-row concurrency conflicts and handles a duplicate user provisioned by a competing first request.

This objective is inferred from the current uncommitted code comments and `SignInConcurrencyTests`; no Claude session transcript or handover note was available.

## Completed tasks

- Synchronized repository state and reviewed project instructions, architecture documents, recent history, and the complete current working-tree diff.
- Compile-only API build: `dotnet build src/TioHub.Api --no-restore` succeeded with 0 warnings and 0 errors.
- Frontend production build: `npm run build` succeeded.
- Frontend unit tests: `npm test -- --run` passed (7 files, 47 tests).
- Added concurrency coverage for parallel first requests to existing and newly mapped accounts.
- Added test-host isolation for background workers and restore-drill file paths.

## Remaining tasks

- Run SQL-backed `SignInConcurrencyTests` and the relevant operational tests after migration execution is approved or a safe test database setup that does not violate the repository's database rules is provided.
- Review test stability and any concurrency failures, then report final results.

## Architecture and important decisions

- .NET 10 ASP.NET Core modular monolith, EF Core, SQL Server; React 19/TypeScript/Vite frontend.
- Preserve existing architecture and permissions behavior. Sign-in bookkeeping conflicts should not turn ordinary API reads into 412 responses.
- Test hosts apply migrations at startup and use SQL Server/LocalDB. Do not run them without approval under the repository's database protection rules.
- No schema change is present in the current task diff.

## Known issues and risks

- SQL-backed concurrency behavior remains unverified because the tests start a host configured to apply migrations.
- Private Claude conversation history was not available. The task objective is reconstructed from code and tests, so its broader intended scope is uncertain.
- The current retry helper makes up to three attempts; sustained contention should be evaluated by the new tests.

## Last validation results

- `dotnet build src/TioHub.Api --no-restore`: passed, 0 warnings, 0 errors.
- `npm run build` in `src/web`: passed.
- `npm test -- --run` in `src/web`: passed, 7 files / 47 tests.
- SQL-backed .NET tests: not run; would apply EF migrations to a test database.

## Files currently being worked on

- `src/TioHub.Api/Security/SignIn.cs`
- `tests/TioHub.Tests/HubFactory.cs`
- `tests/TioHub.Tests/OperationalTests.cs`
- `tests/TioHub.Tests/SignInConcurrencyTests.cs`

## Recommended next action

Authorize or provide a test SQL environment for the migration-enabled test host, then run `dotnet test tests/TioHub.Tests --filter FullyQualifiedName~SignInConcurrencyTests` and the affected restore-drill test. Review the final working-tree diff after results.
