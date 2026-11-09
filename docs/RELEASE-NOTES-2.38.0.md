# TIO Operations Hub 2.38.0

Production package release, 28 October 2026. This release redesigns the Reporting Center and adds the Cases Report Builder (decision A70; details in `docs/REPORTING-CENTER-A70.md`).

## New and changed

- **Reporting Center in the header.**
  - It is a first-level section between Teams and Administration and is no longer an entry of the Dashboard menu.
  - Its own menu has seven areas: Overview, Report library, Cases report builder, My reports, Scheduled reports, Export history and Templates.
  - When the header is too narrow for every section it moves into *More* like any other section. On phones and tablets it is in the drawer with all its areas.
  - Access is unchanged: a business role and the Export permission.
  - Old addresses (`/reports…`, `?tab=history`, `?tab=schedules`) still open the right area.
- **Overview.** Your own report usage for 7, 30 or 90 days: reports generated, success rate, failed exports, active schedules, exports per day, report categories, recent exports, upcoming schedules and quick actions. These are report-usage figures, not case or SLA performance.
- **Report library.** The 13 existing reports, filters, CSV/Excel exports, presets and schedules work as before. The Cases report card adds **Build report**.
- **Cases Report Builder.**
  - **Filters:** client, date (created, updated, due, resolved or closed; presets or custom days in your time zone), status, priority, SLA status, owner or unassigned, team, product, environment, case type, scope, waiting, due date, age, Jira reference and text search.
  - **Advanced conditions:** nested AND/OR rules (up to 30 conditions, 3 levels).
  - **Columns:** choose from 29 fields, reorder by drag or with Alt+↑/↓. Sort by up to three fields and group by client, status, priority, owner, team, type, scope or SLA status.
  - **Live preview:** computed on the server, with the exact number of matching cases, breakdowns by status, priority and SLA status, and 25/50/100 rows per page. Case IDs link to the case.
- **Exports in the background.**
  - Excel and PDF files are generated as jobs (Queued → Processing → Completed, Failed or Cancelled), so the page never waits on a long request. Running jobs can be cancelled, and failed ones retried.
  - **Excel** has four sheets: Cases Data (real dates, filters, frozen header), Summary, Applied Filters and Metadata.
  - **PDF** has a one-page management summary and, optionally, the case table (up to 2,000 rows).
  - The limit of 100,000 rows per export and the 14-day file retention are unchanged. A larger result is refused with an explanation, never cut short.
- **Saved reports.**
  - Visibility is private, team (the members of one of your teams) or shared with named people.
  - Anyone who can see a report can run, duplicate and favorite it; only the owner can change or delete it.
  - A report opened after a field was removed shows a warning and drops that field.
- **Schedules of saved reports.** Each run makes one file per recipient, generated with that recipient's own access at run time, and announces it in the hub's notifications.
- **Templates.** Six ready-made cases reports, for example open critical and high cases, SLA breaches in the last 30 days and overdue cases by owner.

## Database and deployment

- **Migration `ReportBuilder`** (additive only):
  - new columns on `reporting.ExportJob` and `reporting.ReportSchedule`;
  - new tables `reporting.SavedReport`, `reporting.SavedReportShare` and `reporting.SavedReportFavorite`;
  - one new index on `work.Case.CreatedAt`.
- **Upgrading:** the DBA runs the included `database/01-schema.sql` (idempotent) before the new application files are deployed. The application refuses to start on the old schema. No data is changed.
- **New optional settings** (defaults in brackets; see `docs/OPERATIONS.md`): `Reporting:ExportWorkerSeconds` (5), `Reporting:ExportConcurrency` (2), `Reporting:MaxActiveExportsPerUser` (5), `Reporting:MaxAttempts` (3), `Reporting:PdfMaxRows` (2000).
- Follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

## Known limitations

- The other 12 reports keep their existing synchronous CSV/Excel export; there are templates for the Cases builder only.
- The PDF uses built-in fonts: characters outside Latin-1 (for example Arabic) print as "?". The Excel file has the full text.
- Scheduled reports notify in the hub only; there is no e-mail.
- An export uses the preview's evaluation time and leaves out cases created later. Status changes made between the preview and the export are included in the file.

## Validation

- TypeScript and production build: passed. Unit tests (Vitest): 9/9 passed.
- .NET test suite: 256/256 passed, including 10 new Report Builder tests (validation, scope, asynchronous jobs, idempotency, cancellation, retry, Excel and PDF content, saved-report sharing and revisions, schedule permission re-checks). The release script runs the suite again.
- Playwright end-to-end suite: 96 of 99 passed in the full run. The three failures were tests whose "More" button selector became ambiguous once the header got its own *More* list. After that fix they passed, and the builder and GUI specs (27 tests) were re-run and passed. The full suite was not run again after the fix.
- No screen-reader session was run; accessible names and keyboard reordering were checked by the tests.
