# Safe audit regression automation

Prepared on 10 November 2026. **No application tests in this directory have been executed against the target.** Local syntax, test discovery and request-policy checks are separate from actual application validation. See `../traces/automation-validation.md`.

This suite uses the repository's installed Playwright 1.55.0 from `tests/e2e/node_modules`. It deliberately has its own configuration with **no `webServer`, seeding, migrations, development authentication headers or credentials**. Do not substitute the normal development Playwright configuration: that configuration starts an API and database-backed development environment.

## Validate locally without target traffic

Run from the repository root in PowerShell; the bundled Node executable can be replaced by an existing supported Node installation.

```powershell
& '.\.tools\node\node.exe' --test tio-audit/test-automation/safety-policy.test.mjs
Get-ChildItem tio-audit/test-automation/*.mjs | ForEach-Object {
  & '.\.tools\node\node.exe' --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw "Syntax check failed: $($_.Name)" }
}
& '.\.tools\node\node.exe' tests/e2e/node_modules/@playwright/test/cli.js test --config=tio-audit/test-automation/playwright.audit.config.mjs --list
```

`--list` discovers 298 tests across four files; it does not launch a browser or test the application. Its JSON reporter lists the cases as skipped, which must not be reported as application passes or an attempted live run. Discovery creates `results/playwright-results.json` and can replace an earlier run's result, so preserve earlier evidence before running discovery again. The pure policy tests use `node:test` and no network.

## Run against an explicitly selected application

Use an approved existing user session supplied by the environment owner. Keep its Playwright storage-state file outside the repository and all evidence directories. This suite never signs in, creates a user, changes a password, exports state or prints the state file. An anonymous run needs no state file.

```powershell
$env:TIO_AUDIT_READ_ONLY_APPROVED = 'YES'
$env:TIO_AUDIT_BASE_URL = 'https://nb01994.vitronic.de'

# Anonymous login surface and protected deep links only (6 tests):
& '.\.tools\node\node.exe' tests/e2e/node_modules/@playwright/test/cli.js test --config=tio-audit/test-automation/playwright.audit.config.mjs login.audit.spec.mjs

# Set the actual absolute location of an approved session outside the repository:
$env:TIO_AUDIT_STORAGE_STATE = 'C:\PrivateAuditSession\approved-session.json'

# Start with one narrow scope, then select further modules as needed:
& '.\.tools\node\node.exe' tests/e2e/node_modules/@playwright/test/cli.js test --config=tio-audit/test-automation/playwright.audit.config.mjs routes.audit.spec.mjs --grep 'Authenticated desktop.*Tickets /cases:'
& '.\.tools\node\node.exe' tests/e2e/node_modules/@playwright/test/cli.js test --config=tio-audit/test-automation/playwright.audit.config.mjs journeys.audit.spec.mjs

# Full prepared suite: serial, no retries, 298 cases. Each route makes normal UI read requests.
& '.\.tools\node\node.exe' tests/e2e/node_modules/@playwright/test/cli.js test --config=tio-audit/test-automation/playwright.audit.config.mjs
```

No browser or package installation is performed by this suite. It expects Microsoft Edge and the existing Playwright dependency to be installed. Certificate errors remain enabled as failures; it never disables TLS validation. Approval/base URL missing => tests skip before navigation. Authenticated session missing, expired, requiring a password change, or denied access => affected coverage skips with an explicit reason. An access-denied result is not an application functional pass and does not prove role enforcement against a matrix of roles.

## Prepared scope

- Anonymous sign-in surface at 1920 × 1080, 1366 × 768, 768 × 1024 and 390 × 844; labels, password masking, autocomplete, disabled empty submission and account-to-password keyboard order. No field values or form submissions.
- Anonymous protected deep links for Tickets and Administration.
- 70 source-grounded route entries at all four viewport sizes (280 definitions): 69 permitted read routes × four sizes, plus four **statically skipped Notes** definitions. Notes is blocked because GET `/api/v1/notes/tree` can create a starter notebook/section. Other route checks cover navigation, document heading/main structure, whole-page overflow, visible application errors, observed server errors and unhandled JavaScript exceptions. Tables may scroll inside their containers. Heading/main checks are narrow structural checks, **not a WCAG conformance audit**.
- Four source-defined legacy redirects. `/reports` is excluded because the repository documents a possible external SSRS reservation for that address.
- Three read journeys: own dashboard → action list → an existing rendered detail link → refresh → back; reporting overview → library → history; mobile navigation drawer and Escape/focus restoration.
- Five finding-regression definitions: fixture-dependent configured-status consistency across three views, Tickets header/body semantics, visible labeled audit user-ID integrity, catalog configured-status choice parity, and one explicitly skipped export-guidance proposal. See [REGRESSION.md](REGRESSION.md) for scope and approved fixture inputs.

Catalog sources: `src/web/src/App.tsx`, `src/web/src/ui/Shell.tsx`, `src/web/src/pages/Dashboards.tsx`, `src/web/src/pages/Reports.tsx` and `src/web/src/configRegistry.ts`. Source routes may differ from the deployed release. No detail IDs are invented or enumerated. The action journey only follows an already-rendered permitted detail link and skips when no such record is available.

## Request restrictions and interpretation

All browser requests are intercepted. Only same-origin GET/HEAD/OPTIONS are allowed; POST/PUT/PATCH/DELETE and other methods, cross-origin requests, and export/download/logout/sync-like action URLs are blocked. `/notes` navigation and the entire `/api/v1/notes/` API family are also blocked **even for GET**, independently of the four static Notes skips, to prevent starter-data initialization by a future test. Service workers are disabled so they cannot bypass routing. No submit, create, edit, delete, restore, notification read/acknowledge, export, schedule, sync, integration test or permission-changing action is performed. The suite does not use Playwright's API request fixture.

Some legitimate reads use POST: the Tickets report builder sends a POST preview on load (`pages/reporting/CasesBuilder.tsx`). This suite intentionally blocks it and marks affected coverage skipped. Do not count the resulting preview error or blocked request as a product defect. Same-origin paths containing `/exports/` are also blocked conservatively, so an export-history section may become partial. Cross-origin map tiles are blocked; map visual fidelity and external connectivity remain untested. No external integrations are triggered by the harness.

Request-method guards cannot prevent server-side bookkeeping performed by normal GET requests, such as session last-seen or access audit. Use the approved role and environment appropriate for normal read-only browsing.

This is a regression scaffold. A passing route case establishes only its listed checks. KPI correctness, data integrity, complete lifecycle transitions, validation, authorization across multiple approved roles, imports/exports, attachments, charts, contrast, screen-reader behavior, session expiry, concurrent updates and network-failure recovery require additional approved testing.

## Evidence and privacy

Results are written under the ignored `results/` directory. JSON observations contain method/status/path metadata, counts, reflow dimensions, navigation timing and structural counts; no response bodies, request headers, cookie values, session state, query values or console message text are attached. JavaScript exception names are recorded, not potentially sensitive exception messages.

Screenshots are off by default. If the owner has approved storing the visible business data, set `TIO_AUDIT_CAPTURE_SCREENSHOTS=YES`; screenshots are then attached to each executed test result. Review and restrict access to those images before sharing. Network traces and videos stay disabled because they can contain authentication cookies and business payloads. The suite's timing values describe the current browser navigation only; they are not load-test or enterprise performance benchmarks.
