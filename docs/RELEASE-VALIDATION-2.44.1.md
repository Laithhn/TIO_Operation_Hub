# Release validation — 2.44.1

Prepared 2 November 2026. This patch adds the Roles comparison UI and no database migration. The package is built from the existing uncommitted working tree; `BUILD-INFO.txt` identifies the base commit and build time.

| Check | Result |
|---|---|
| TypeScript check | Passed |
| Frontend Vitest | 71 passed |
| Production Vite build | Passed |
| Focused real API/SQL browser checks | 4 passed (Roles matrix desktop/phone, existing Roles layout and role editing) |
| Full real API/SQL Playwright suite | 151 passed against isolated LocalDB |
| Final Roles matrix browser regression | 2 passed after final rebuild |
| Full SQL-backed .NET suite in package build | 309 passed; 0 failed, 0 skipped |
| Shared or production database changes | None |

Browser validation used uniquely named temporary LocalDB databases and dedicated test services. Both databases were removed after testing. Screenshots of the final desktop and phone views are in `docs/evidence/roles-matrix-2.44.1/`. The prior 2.44.0 release validated the unchanged idempotent deployment SQL twice against an isolated database; installations upgrading from before 2.44.0 must still follow the DBA migration procedure.

The Roles matrix is a comparison and navigation surface. Permission writes remain in the existing Rights editor, with server-side privilege checks. Existing dynamic cascade SQL emits EF1002 analyzer warnings; the NuGet vulnerability feed was unavailable during earlier validation. Production directory integration and deployment UAT remain operator checks.
