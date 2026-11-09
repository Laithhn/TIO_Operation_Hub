# Reporting Center redesign and Cases Report Builder (A70, 28 Oct 2026)

Implements the "TIO Reporting Center + Cases Report Builder" handoff (stages A–D). Decision record: [DECISIONS.md](DECISIONS.md) A70; operations: [OPERATIONS.md](OPERATIONS.md) "Report Builder exports, saved reports and schedules".

## Navigation

The Reporting Center is a first-level header section, between Teams and Administration. It is no longer an entry of the Dashboard section menu. Like every section, it moves into the header's *More* list when the header is too narrow for all sections (GUI-10) and is listed in the phone/tablet drawer with all its areas. It is shown to users with a business role and the Export permission (unchanged access rule); a deep link without the permission shows the hub's access-denied page.

| Route | Area |
|---|---|
| `/reporting-center` | Overview: the caller's report usage (exports per day, success rate, failures, report categories, recent exports, schedules, quick actions). Never case or SLA performance. |
| `/reporting-center/library` | Report library: the 13 A62 reports in four categories, unchanged (configure, preview, CSV/Excel). `?report=<key>` opens one. The Cases report card adds *Build report*. |
| `/reporting-center/builder/cases` | Cases Report Builder; `?report=<id>` opens a saved report, `?template=<key>` a template. |
| `/reporting-center/my-reports` | Saved reports: all I can see, mine, shared with me, favorites. |
| `/reporting-center/schedules` | Schedules of catalog reports (A62) and of saved builder reports. |
| `/reporting-center/history` | Export history; `?export=<id>` opens one export's details. Queued and running exports update live. |
| `/reporting-center/templates` | Built-in Cases Report Builder templates. |

Old links still work: `/reports…` → `/reporting-center…`; `?tab=history&export=…`, `?tab=schedules`, `?tab=catalog&report=…` → the matching area.

## API (`/api/v1/reporting`, all need a business role and the Export permission)

| Method and path | Purpose |
|---|---|
| `GET report-types`, `GET report-types/cases` | Builder report types; Cases metadata: allowlisted fields (type, category, sortable, groupable, operators), date fields and presets, SLA states, limits, formats. |
| `GET report-types/cases/filters` | Authorized option values: clients and environments through the scope filters, teams, products, owners, case types, the caller's teams. |
| `POST reports/cases/preview` | `{ definition, page, pageSize (25/50/100), timeZone }` → exact total, page rows, breakdowns by status/priority/SLA, groups, applied-filter summary, warnings, cutoff (evaluation time), resolved UTC date range. 422 with field paths for invalid definitions; 504 after 30 s. |
| `GET/POST report-definitions`, `GET/PUT/DELETE report-definitions/{id}` | Saved reports. PUT needs the current `revision` (409 otherwise); only the owner may change or delete (403 for viewers, 404 for others). GET returns the definition without fields that no longer exist, with warnings. |
| `POST report-definitions/{id}/duplicate`, `PUT/DELETE report-definitions/{id}/favorite` | Private copy; favorite mark. |
| `POST exports` | `{ definition \| savedReportId, format: xlsx\|pdf, options: { fileName, includeSummary, includeFilters, includeMetadata, pdfMode: summary\|detailed }, timeZone, cutoff }` and header `Idempotency-Key` → **202** with the queued job (200 with the first job for a repeated key). 422 when nothing or more than `Reporting:MaxRows` rows match, or a detailed PDF exceeds `Reporting:PdfMaxRows`; 429 when the user has too many exports in progress. |
| `GET exports/{id}`, `GET exports/{id}/download`, `POST exports/{id}/cancel`, `POST exports/{id}/retry` | Job status (owner, or Audit permission for details); download (owner only, audited, 410 when expired); cancel (queued: at once; running: at the next checkpoint); retry (a new job). |
| `GET/POST schedules`, `PATCH schedules/{id}` | Schedules of saved reports (pause/resume/delete/runs use the A62 `/reports/schedules/{id}/…` endpoints). |
| `GET overview?days=7\|30\|90` | Usage figures of the Overview. |

The A62 endpoints under `/api/v1/reports` are unchanged; their job DTO now reports a queued job as `Queued`, and Report Builder jobs are retried with `POST /reporting/exports/{id}/retry`.

## Definition (schema version 1)

```json
{ "schemaVersion": 1,
  "filters": { "dateField": "createdAt", "datePreset": "last30", "clientIds": [12], "statuses": ["New","InProgress"], "priorities": ["Critical","High"],
               "slaStatuses": ["Breached","AtRisk"], "ownerIds": [3], "unassigned": true, "teamIds": [], "productIds": [], "environmentIds": [], "types": [],
               "due": "overdue", "ageMin": 7, "ageMax": 90, "jira": "linked", "jiraKey": "OPS-12", "q": "import", "scope": "Client", "waiting": false,
               "conditions": { "op": "or", "rules": [ { "field": "priority", "operator": "in", "value": ["Critical"] },
                                                       { "op": "and", "rules": [ { "field": "title", "operator": "contains", "value": "import" } ] } ] } },
  "columns": ["caseId","clientCode","title","priority","status","owner","slaStatus","dueAt"],
  "sort": [ { "field": "priority", "direction": "asc" }, { "field": "caseId", "direction": "asc" } ],
  "groupBy": "clientCode" }
```

`dateRange` accepts calendar days in the report time zone (`fromDay`, `toDay` inclusive) or UTC instants (`from`, `toExclusive`). SLA status is the combined contractual state (Breached, AtRisk = due within 24 h, OnTrack, Met, NotMeasurable, NotApplicable) using the A61 rule that a pending obligation past its deadline is breached. Product filters use the Cases-list semantics (installed in an affected environment, or an affected component). The export uses the preview's cutoff (when it is at most 24 hours old) for derived values and leaves out cases created after it; status changes made between preview and export are reflected in the file.

## Security checklist

- [x] Every endpoint requires a business role and the Export permission (server side; the UI only hides).
- [x] Row scope from the global query filters; client ids in a definition outside the caller's access are refused (never silently dropped); environment ids hidden by the scope fail validation.
- [x] Fields, operators, sorts and groupings are allowlisted; values reach SQL only as parameters (expression trees, no SQL text); nesting and list sizes are bounded; definition size ≤ 32 000 characters.
- [x] Field-level permission hook (`CaseField.Visible`) enforced in metadata, validation and saved-report sanitizing (no case field is restricted in today's access model).
- [x] Jobs re-resolve the requester's access when they run; schedules re-check each recipient's account and Export permission at run time; a refused run is recorded as failed, never widened.
- [x] Files: private storage under `Reporting:Path`, random names, download only by the requester, every download audited, 410 after expiry, cleanup by the scheduler.
- [x] Excel text is written as inline strings (never formulas); dates as real date cells; PDF text is escaped.
- [x] Audit: export requested, cancelled, completed/failed and downloaded; saved reports through the generic change audit.
- [x] No case content in logs or metrics (references, counts and timings only).

## Delivered and later stages

Delivered: A (header navigation and Reporting Center areas), B (builder with secure preview), C (asynchronous Excel and PDF jobs), D (saved reports with sharing, favorites, revisions; schedules of saved reports).

Not delivered (later stages):

- The twelve other catalog reports keep their A62 forms and synchronous CSV/Excel export; moving them onto the builder and job model is a later stage. Templates exist for the Cases builder only.
- No query token: export re-runs the validated definition with the preview's cutoff instead (see above). Counts are exact (no approximate-count mode).
- PDF uses the built-in Helvetica fonts (WinAnsi): characters outside Latin-1 (for example Arabic) are printed as "?"; Excel has the full text.
- Scheduled reports notify recipients in the hub (no e-mail delivery, as A62).
- Preview cancellation relies on the browser aborting the stale request; the server stops at the next database round trip.
