# Release validation — 2.44.0

Prepared 2 November 2026. The application and migration source are in the existing working tree. Pre-existing uncommitted authorization changes were preserved and are included in the build. `BUILD-INFO.txt` identifies the base commit and dirty-tree state.

| Check | Result |
|---|---|
| API and test compilation | Passed |
| Full SQL-backed .NET suite | 309 passed, 0 failed |
| TypeScript check | Passed |
| Frontend Vitest | 71 passed |
| Production Vite build | Passed |
| SQL generation and EF model/snapshot consistency | Passed |
| Deployment SQL on an isolated database | Applied successfully twice (idempotent); 31 migrations and 330 hierarchy definitions verified |
| Read-only migration review SQL on an isolated database | Passed |
| Production SPA Playwright with intercepted HTTP | 5 passed |
| Playwright against a real API/SQL database | 149 passed, 0 failed on a clean rerun |
| Shared or production database changes | None |
| Production service deployment | None |

The owner approved isolated test databases and services. Validation used uniquely named temporary databases only; all were deleted after their runs, and the deployment SQL was never applied to a shared or production database. The final package is built with the repository's release script and its own SQL-backed test pass.

Warnings: the NuGet vulnerability feed was unreachable; existing xUnit and EF1002 dynamic-SQL analyzer warnings remain. The cascade SQL builds identifiers from the EF model, but its raw-SQL paths should receive a separate security review. The production entry JavaScript is 898.45 kB, below the browser test's 900 kB budget but with little headroom. Dependency vulnerability validation and production UAT still require operator checks.

The package contains the idempotent deployment SQL, a read-only role-mapping preview and the implementation/migration report. A DBA must review and apply schema changes under the deployment procedure; package creation never applies them.
