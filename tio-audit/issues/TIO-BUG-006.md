**Issue ID:** TIO-BUG-006

**Title:** Catalog Tickets report omits configured waiting, resolved and reopened status choices

**Module:** Reporting Center / Report library / Tickets report

**Page URL:** https://nb01994.vitronic.de/reporting-center/library?report=cases

**Category:** Functional / Business Logic

**Severity:** P2

**Business Impact:** Managers cannot directly select active configured waiting/resolved/reopened status buckets in the catalog report flow. Internal-stage labels and duplicate Open options make the filter ambiguous. A particular wrong preview/export count, or failure of the separate Report Builder, was not proved.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Existing active ticket-status configuration, report Configure and preview views. Desktop browser view; no export/schedule/preset created.

**Preconditions:** Administration → Configuration → Ticket statuses has active Waiting for customer, Resolved and Re-opened values. The account can view/run the catalog Tickets report. Configuration is inspected only; no status is renamed or added.

**Steps to Reproduce:**

1. Read the active status labels at /admin/config/case-statuses.
2. Open Reporting Center → Report library → Tickets → Configure, or /reporting-center/library?report=cases.
3. Open Status and compare its choices with the configured list and ticket register.
4. The captured follow-up selected Pending validation and applied/refreshed the read preview; inspect the resulting applied filter and row state without generating a file.

**Expected Result:** Catalog status choices include the permitted configured ticket statuses with their current labels, and filter by configured status code consistently with the ticket register. Aggregate Open/All/Closed choices are distinguishable from configured labels.

**Actual Result:** Configure offers Any, Open, All, Closed or Closed (cancelled), New, another Open, In progress, Pending validation, Closed and Closed (cancelled). Active Waiting for customer, Resolved and Re-opened choices are absent. The Pending validation preview returns 0 matching rows. Zero is recorded as an observation only: it is not claimed that it should equal the 15 configured Resolved records, because internal stage and configured behavior differ.

**Reproducibility:** Always when opening the catalog Tickets report with the captured active configuration; choices were observed in Configure and the subsequent preview/filter views.

**Evidence:**

- [Configured active statuses](../traces/084-case-statuses.txt)
- [Configure dialog](../traces/114-report-configure-dialog.txt)
- [Configure screenshot](../screenshots/114-report-configure-dialog.png)
- [Catalog preview choices](../traces/115-tickets-catalog-preview.txt)
- [Pending-validation preview](../traces/116-catalog-pending-validation-filter.txt)
- [Follow-up screenshot](../screenshots/116-catalog-pending-validation-filter.png)
- [Source analysis and limitations](../traces/catalog-status-source-analysis.md)

**Likely Root Cause:** Confirmed local path: ReportCatalog.cs:153–170 builds Status options from open/all/done plus the internal CaseStatus enum; ReportingEndpoints returns those static options and ExportService validates against them. Configured StatusCode is a distinct model. Cases.tsx and the separate builder already obtain configured choices. Local source corroborates the missing-choice failure; deployed binary equivalence and particular result-set differences were not proved.

**Recommended Fix:** Use the same configured status registry/labels as the ticket register and builder, passing selections through code:<StatusCode> or an explicit equivalent. Update shared validation/filter summaries/preset/schedule compatibility. Keep legacy stage aliases safe and clearly stage-labelled; do not substitute them for current configured choices.

**Acceptance Criteria:**

1. Every permitted active configured status selectable in the register is available in the catalog, including waiting/resolved/reopened/custom values.
2. At equal scope/time/other filters, a selected configured code yields the same row identities as the register; shared internal stages do not merge distinct configured buckets.
3. Aggregate and configured Open choices have distinct names; configuration label changes propagate.
4. Preview/export/preset/schedule validation preserves configured codes; historical/retired status handling follows the existing policy, without silent unfiltered fallback.

**Regression Test:** In an approved isolated fixture, use two tickets sharing an internal stage with different configured codes, plus a custom active status. Compare catalog metadata/UI choices, preview row identities, export rows, preset round-trip and schedule validation. Choice-parity can be checked read-only against existing approved data; result/export/schedule fixtures require explicit isolated authorization.
