# Reporting and configuration consistency — stage 3

Stage 3 addresses the reporting and configuration findings from the application business-logic review. Stages 1 and 2 remain in place. Existing permissions, workflow transitions and database schema are preserved.

## Configuration and display

- Administration → Configuration has dedicated **Reported conditions** and **Case statuses** pages. Administrators can change display labels. Add, delete, reorder, category, description and retirement controls are unavailable for these fixed workflow lists; the existing API restrictions remain authoritative.
- Condition and case-status labels apply explicitly to their own domains. Renaming a case's Closed or Cancelled label does not rename an escalation or commitment with the same code. Conditions without an observation use the configured Unknown label.
- Type filters include active and retired configuration values, identified by their stored codes. Creation forms continue to offer active types; editing retains the current historical type. No new record can select a retired type merely because it is filterable.
- Reporting Center type selections, status selections, filter chips and preview cells display the appropriate configured labels. CSV/Excel data retains existing stable codes and column definitions.

## Reporting correctness

- Team assignment counters restrict commitments to the record's responsible team, rather than counting all work owned by a team member across other teams.
- Workload rows and team/owner performance breakdowns retain identity when different teams or people have identical names. Workload's average per owner divides total assigned work by distinct owner IDs, including an owner serving several teams; a person named Unassigned is still an assigned owner.
- The SLA summary calls its population **Contract-linked cases**, since it also contains pending and not-measurable obligations. Compliance denominators remain met plus breached.
- Environment and version-matrix CSV buttons pass all active screen filters. Their report definitions apply the same placement, condition, freshness, text, environment type and country rules as their corresponding lists.
- `waiting=false` remains a real non-waiting filter across list, preview, export and saved filters. Report controls expose both waiting and not-waiting selections.
- List-only report filters also validate record IDs, boolean flags, evaluation times, scope/type values and SLA/deadline selections. Invalid values cannot quietly turn into an unfiltered query. The commitments **Completed or cancelled** selection excludes open work.
- Date and timestamp ranges are compared using the execution time zone and effective boundaries. A date-only end includes its whole local day; full timestamps retain their exact instants. Reversed and unsupported calendar bounds produce validation errors. Client-side checks compare calendar-day inputs; the server handles mixed timestamps and offsets.

## Saved exports and schedules

- Retrying an export or running a schedule revalidates all persisted filters. Unknown obsolete filters fail instead of being discarded and broadening the result.
- A nonempty assets network-zone filter requires Technical detail permission, including for each scheduled recipient's current access. A recipient without that right receives a failed run rather than a wider masked report. Export revocation also remains enforced per recipient.
- Numeric values outside Daily, Weekly and Monthly are refused when creating or editing a schedule.
- Scheduled-report notification keys use the persisted export-job ID. A repeated run within one minute cannot collide with the preceding run's notification.
- Due schedules acquire a database application lock and recheck the current active/due state before generating files. Overlapping scheduler workers do not generate the same due occurrence concurrently.

The scheduler still uses each recipient's directly assigned roles and scopes. Directory-group access is not inferred in background processing. Schedule ownership/lifecycle policy is unchanged. File generation and occurrence advancement are separate transactions: after an abrupt process failure, a partially delivered occurrence can be retried, so this is not an exactly-once delivery guarantee.

## Changed files

- API: `Modules/Reporting/ExportService.cs`, `ReportingEndpoints.cs`, `SearchExportEndpoints.cs`, `ReportCatalog.cs`; `Modules/Teams/TeamEndpoints.cs`; `Modules/Commitments/CommitmentEndpoints.cs` (additive team identity and completed-status filter).
- Frontend: `hooks.ts`, `ui/kit.tsx`, `ui/Shell.tsx`; pages `Configuration.tsx`, `Cases.tsx`, `Clients.tsx`, `Environments.tsx`, `Inventory.tsx`, `Contracts.tsx`, `Reports.tsx`, `Dashboard.tsx`.
- Tests: `Stage3ReportingTests.cs`, `Stage3WorkloadTests.cs`, `Stage3ReportParityTests.cs`; `stage3-configuration.spec.ts`, `stage3-reporting.spec.ts`; the existing dashboard assertion in `journeys.spec.ts` now reads the configured status label.
- Decisions: A67 in `docs/DECISIONS.md` and these notes.

## Validation and database impact

Executed on 25 October 2026:

- Full Release .NET suite: **245 passed, 0 failed, 0 skipped**, including **32 new stage 3 regressions**. Result file: `.local/stage3-test-results/stage3-all.trx`.
- Frontend `npm run build` (TypeScript and Vite): **passed**.
- Playwright: **all 67 journeys verified**, including **10 new stage 3 scenarios**. The full run passed 66 and exposed one legacy dashboard assertion that expected a hardcoded status label. Updated the assertion to use the configured label; its focused rerun passed **1/1**. No application code changed after the full .NET/build checks.

Commands: `dotnet test tests/TioHub.Tests -c Release --no-restore --logger 'trx;LogFileName=stage3-all.trx' --results-directory .local/stage3-test-results`; `npm run build` in `src/web`; `npx playwright test --config=../../.local/stage3.playwright.config.mts --reporter=list` in `tests/e2e` with `TIOHUB_E2E_PORT=5097`. The ignored override uses Release binaries without restarting the existing development application. Existing compiler/EF/analyzer warnings remain; the changed tracked files pass the whitespace check.

No schema migration is required. Tests use isolated temporary databases under the existing approved test harness. Production and shared development databases are not modified. No production package or deployment is part of this stage.

Previously generated exports remain historical artifacts; regenerate them to obtain corrected filters and totals. Identical display names can still appear in separate output rows, but their identities and counts are no longer merged.
