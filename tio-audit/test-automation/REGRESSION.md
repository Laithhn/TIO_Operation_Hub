# Prepared regressions for observed audit findings

Status: **not executed against the application**. These definitions were added after the primary auditor observed behavior in the live browser. The primary audit's defect records and live evidence remain the source of truth; adding a test does not reproduce a defect by itself. All tests use the same serial, HTTPS-only, mutation-blocking harness described in `README.md`.

Run only with the approved read session and target explicitly configured:

```powershell
& '.\.tools\node\node.exe' tests/e2e/node_modules/@playwright/test/cli.js test --config=tio-audit/test-automation/playwright.audit.config.mjs findings-regression.audit.spec.mjs
```

## Configured ticket status across views

The observed sample was existing ticket ID `12203`, client ID `1`, reference `CS-4003`, with the ticket register showing `Waiting for customer`, client Operational → Tickets showing `In progress`, and global search showing the raw enum `InProgress`. These values are documentation examples, not default test inputs. The deployed data may change. Reconfirm the current expected configured label and the sample's client membership before running; prefer a stable approved UAT fixture.

```powershell
$env:TIO_AUDIT_SAMPLE_TICKET_ID = '12203'
$env:TIO_AUDIT_SAMPLE_CLIENT_ID = '1'
$env:TIO_AUDIT_SAMPLE_TICKET_REFERENCE = 'CS-4003'
$env:TIO_AUDIT_SAMPLE_STATUS_LABEL = 'Waiting for customer'
```

All four variables are required. Missing fixtures => explicitly skipped. Invalid IDs/control characters => configuration failure before navigation. The test reads the filtered global ticket register, opens the existing client's `?tab=cases` Operational view, then opens the global search dialog and enters only the approved ticket reference. It checks the same configured display label in all three places. It neither submits a record form nor modifies the ticket/client. An inaccessible or absent fixture is blocked coverage, not a pass. The global search is debounced normally; no API enumeration is performed.

**Owner fields are not compared.** A client contact, internal owner or Jira assignee can carry distinct meanings; status consistency does not establish owner consistency.

## Tickets leading-column semantics

At 1920 × 1080, the test obtains the actual Tickets table and compares each leading selection/disclosure header's cell index with its matching row control's cell index. This detects the observed `Details / Select all` header order opposite the row's `checkbox / Details` order. It checks DOM semantics, not pixel guesses or arbitrary row text. It uses the first available existing row, performs no selection/disclosure action and skips if no rows or the required controls are available. Cell counts must also agree. Local browser column preferences can alter visible data columns; both leading control columns must still align.

## Audit TIO user reference integrity

The test reads the first accessible `/admin/audit` page and inspects **visible before/after cells explicitly labeled `Tio user id:`**. Negative values in that particular persisted user-reference field, including the observed `-9223372036854775000`, fail the regression. It does not interpret amounts, counters, other entity IDs or arbitrary negative business values as errors. No ID conversion uses JavaScript Number, avoiding loss of precision for 64-bit sentinels.

The scenario skips if the visible page has no such field. It does not scan all audit pages, expand every change, create a Jira user, run sync or change audit history. A result applies only to the visible fields actually checked. Fixing future audit serialization may leave historical invalid values; the expected treatment of historical rows must be agreed without rewriting append-only audit evidence silently.

## Catalog configured-status choices (TIO-BUG-006)

The test reads the Tickets register's Status options whose values start with `code:` and treats their existing configured codes and labels as the expected choices. It then opens `/reporting-center/library?report=cases` and compares its Configure Status choices by **both code and label**. A broad aggregate Open or a legacy Triaged stage labeled Open cannot substitute for the configured Opened status. The test accepts a configured value with or without the existing `code:` prefix; it does not dictate how the server implementation must encode the repaired selection.

This is a read-only UI metadata test. It does not click `Apply filters and preview`, later `Apply changes`, Generate, Save preset or Schedule. It skips when configured choices are inaccessible or a blocked browser request prevents the observation. It verifies choice availability, not preview row counts or export equivalence. Root's live test of Pending validation returning zero does not establish that it should equal the configured Resolved cohort; that assertion is deliberately absent.

## Export unavailability explanation proposal

The export-guidance definition is statically skipped with a note. Source review established deliberate export masking after an access-fingerprint mismatch; Completed plus hidden metadata does not prove generation or file-store failure. A UX regression should be activated only after agreed acceptance criteria and an approved pre-existing masked export fixture are available. Proposed criteria: explain current access unavailability and navigation to regenerate a report while keeping masked metadata hidden. No export, retry or download action is permitted by this scaffold.

## Local validation

Eight local Node policy tests check origins, session-path isolation, request blocking, safe links, catalog validity, explicit status fixture validation, field-specific sentinel matching and the Notes GET side-effect block. JavaScript syntax checks and Playwright `--list` validate parsing and discovery only. The full harness defines **298 cases in four files**, including four statically skipped Notes route definitions and one skipped export-UX proposal; these are prepared cases, not additional executed audit coverage.
