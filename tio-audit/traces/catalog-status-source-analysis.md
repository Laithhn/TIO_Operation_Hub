# Catalog Tickets report status filter — source analysis

Date: 10 November 2026. Scope: read-only inspection of the current local checkout and the primary auditor's saved live DOM traces. No target request, POST preview, export, database connection, application change or additional browser test was executed by this subtask. Source version may differ from the deployed 2.59.0 application shown in the live traces.

## Live evidence already collected by the primary auditor

`traces/114-report-configure-dialog.txt:94–106`, `traces/115-tickets-catalog-preview.txt:129–141` and the primary auditor's trace 116 confirmation show the Tickets report Configure Status dropdown at `/reporting-center/library?report=cases`:

`Any`, `Open`, `All`, `Closed or Closed (cancelled)`, `New`, `Open`, `In progress`, `Pending validation`, `Closed`, `Closed (cancelled)`.

`traces/084-case-statuses.txt` shows active configured ticket statuses including `Waiting for customer`, `Resolved` and `Re-opened`, all absent from that report dropdown. Two options are displayed as `Open`: the broad open-ticket aggregate and the label of an internal stage. The primary auditor confirmed this as **P2 TIO-BUG-006**. Applying Pending validation returned zero in the primary auditor's live test; this review does not claim it should equal the 15 configured Resolved records, since internal stage and configured status behavior can differ.

## Confirmed code path

| Source | Finding |
|---|---|
| `src/TioHub.Api/Common/Enums.cs:51–53` | Internal `CaseStatus` stages are New, Triaged, InProgress, PendingValidation, Closed and Cancelled. Configurable `CaseStatusBehavior` also has WaitingForCustomer, Resolved and Reopened. These are distinct models. |
| `src/TioHub.Api/Modules/Reporting/ReportCatalog.cs:153–170` | The catalog Tickets report declares Status `Options: ["open", "all", "done", .. Names<CaseStatus>()]`. It never reads the configured status lookup list for this filter. Its output column nevertheless declares “Configured ticket status, as in the ticket list” and selects `StatusCode`. The filter and output therefore use different status concepts. |
| `src/TioHub.Api/Modules/Reporting/ReportingEndpoints.cs:38–49` | `/reports/catalog` returns each report's filter options directly from the static registry, with no configured status substitution. |
| `src/web/src/pages/Reports.tsx:44–52,89` | The UI translates each supplied option with `useEnumLabel('CaseStatus')`, but it cannot add omitted configured codes. Aggregate `open` becomes Open; the configured label/fallback for Triaged may also become Open. PendingValidation falls back to Pending validation when no configured label exists. |
| `src/TioHub.Api/Modules/Reporting/ExportService.cs:93–98` | Select validation accepts only an item already in the report definition's `Options`. A configured code or `code:<configured code>` absent from that static list fails validation. This affects the shared preview/export/preset/schedule filter-validation path; actual individual API responses were not exercised here. |
| `src/TioHub.Api/Modules/Reporting/ReportCatalog.cs:140–142` | The selected string is passed to `CaseFilter.Status`, then the shared `CaseQuery`. |
| `src/TioHub.Api/Modules/Work/CaseQuery.cs:51–60` | `code:<value>` filters `Case.StatusCode` exactly. Enum strings filter `Case.Status` internal stage. Thus catalog `InProgress` selects every ticket in that stage, potentially including a ticket whose configured status is Waiting for customer. PendingValidation filters its internal stage; it is not inherently the configured label Resolved. |
| `src/TioHub.Api/Modules/Work/CaseStatuses.cs:9–10,27–41` | Configured status codes are deliberately separate from internal stages. Waiting behavior can preserve a ticket's current stage; resolved behavior normally maps to PendingValidation. Legacy stage aliases remain for compatibility with older links and saved reports. |
| `src/web/src/pages/Cases.tsx:54` | The ticket register offers configured status choices with values `code:${s.code}` and the configured labels, avoiding this catalog mismatch. |
| `src/TioHub.Api/Modules/Reporting/BuilderEndpoints.cs:97–109` | The separate Tickets Report Builder loads active configured status codes from `LookupValues` and supplies those as status metadata. This is an existing implementation pattern the catalog can reuse. It does not prove the live builder was tested successfully. |

## Classification and scope

The local source corroborates the live missing-choice observation: the catalog filter still exposes internal stages despite the established configured-status model. This supports a **P2 functional/reporting defect**, subject to the primary auditor's final issue ID and business-impact assessment. Managers cannot directly choose the configured waiting, resolved or reopened bucket using this catalog flow. Selecting a familiar display label such as In progress can also represent a wider internal-stage cohort than the ticket register's identically labeled configured-status filter.

The latter result-set discrepancy is a source-based implication, not a new live-confirmed count. Do not claim a particular wrong total, that all reporting is broken, that the Report Builder shares the defect, or that configured Resolved must map to PendingValidation in this deployment. The live configuration trace labels its Resolved entry's behavior as Waiting for customer, demonstrating why a stage-name substitution cannot safely infer the administrator's intended business status.

Following the primary auditor's confirmation, a prepared GET-only regression was added to `test-automation/findings-regression.audit.spec.mjs`. It compares actual configured code/label options from the register against catalog choices without clicking Apply filters and preview/Apply changes. The prepared harness now contains **298 tests in four files**, all unexecuted against the target by this subtask.

## Recommended correction

Build catalog Status choices from the same configured status list and label source as the ticket register and Report Builder. Preserve aggregate Open/All/Closed choices with explicit, distinct labels. Pass configured selections using the existing `code:<StatusCode>` convention, or a documented equivalent that filters `StatusCode` exactly. Update shared validation, filter summaries and preset/schedule compatibility in the same change. Keep legacy stage aliases accepted only as compatibility values and label them explicitly as stage-based when encountered; they should not replace current configured choices.

No new role/right or database table appears necessary for this correction; it reuses existing report access checks and lookup configuration. This is an implementation recommendation, not an executed change.

Acceptance criteria:

1. Every permitted configured status available in the ticket register is selectable in the catalog Tickets report with its current display label, including waiting, resolved, reopened and any administrator-defined additional status.
2. Selecting one configured status filters exactly the same ticket cohort as the register with that status, given identical scope, time and other filters; waiting tickets retained in an active internal stage must not leak into a different configured-status bucket.
3. Aggregate and configured choices have distinct names; users can tell all open tickets from the configured Open status.
4. Preview, export, presets and schedules accept and preserve the selected code and do not fall back to an unfiltered cohort. Old stage-based saved values remain safe and explicit.
5. Label changes in Configuration update the report filter and applied-filter summary without code changes. Retired-status visibility follows the existing record/report policy rather than silently dropping historical data.

Recommended regression: with approved isolated data, use two tickets sharing one internal stage but carrying different configured codes, plus a custom active configured status. Verify catalog metadata, UI choices, preview row identities, exported rows, preset round-trip and schedule definition validation. The existing live harness can safely check choice parity without applying a POST preview; result equivalence needs an explicitly approved read-preview method or isolated test environment. No live generation or schedule execution is needed to inspect choices.
