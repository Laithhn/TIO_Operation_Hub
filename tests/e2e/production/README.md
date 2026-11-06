# Production read-only validation

Run from `tests/e2e`:

```powershell
$env:TIO_PROD_RESULTS = '<absolute evidence directory>'
$env:NODE_USE_SYSTEM_CA = '1' # Node 24: use the Windows organization CA trust store
npx playwright test --config production/playwright.config.ts
```

This separate configuration starts no services and performs no database setup or migrations. It runs serially, without retries, using anonymous requests and a fresh Edge browser. TLS verification stays enabled. It checks live/ready, HTTP upgrade, security headers, protected API rejection and sign-in rendering. JSON, JUnit, failure screenshots and failure traces are saved under the evidence directory. These results do not establish authenticated workflow or role coverage.

Authenticated production CRUD must use an explicitly approved account and records registered to a unique `TIO-PROD-TEST-YYYYMMDD-HHMMSS` run. Never reuse the development suite against production: it assumes seeded users, writes many shared entities and starts a database-backed development server. Do not put credentials or exported sessions into the repository.

The isolated lifecycle test is skipped by default. After explicit approval for the account, writes and permanent deletion of this run's own records, set `TIO_PROD_WRITE_APPROVED=YES` and `TIO_PROD_STORAGE_STATE` to an approved Playwright session file stored outside the repository. It creates its own client and commitment, verifies duplicate/stale-update/future-completion rejection and completion, and cleans up only the IDs returned to that process. It records IDs and cleanup status on failure. Authenticated traces are disabled to keep session cookies out of artifacts. The test has not been executed against production without those prerequisites; discovery alone is not validation.
