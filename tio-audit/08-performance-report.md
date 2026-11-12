# Performance and technical reliability

**Performance readiness: Not Rated.** The audit obtained six native HTTP samples and three query durations displayed by the reporting UI. These establish successful sampled responses and completed previews; they do not establish browser loading budgets, tail latency, capacity or enterprise reliability. No load/stress test or production fault simulation occurred.

Assessment date: 10 November 2026, Asia/Dubai. Target: `https://nb01994.vitronic.de/`, live displayed version **2.59.0**. UI inspection used the existing TIO Manager session. Local code includes **2.60.0/A109**, so implementation review cannot be treated as a verified profile of the deployed binary. Browser engine/version and network throughput were not instrumented by the HTTP timing capture. [Live identity evidence](traces/001-executive-dashboard.txt), [source boundary](traces/source-security-review.md).

## Actual HTTP measurements

At **16:45:59 Asia/Dubai**, native PowerShell HttpClient issued one sequential anonymous GET per route with fresh handlers, no request cookies/default credentials, no redirect following and normal TLS validation. Elapsed time covers request completion and body buffering at the native client. It is not browser rendering time or server-only processing time. [Structured measurements](traces/anonymous-http-observations.json), [methodology](traces/anonymous-http-observations.md).

| Route | Status | Elapsed ms | Measured outcome |
|---|---:|---:|---|
| `/` | 200 | 267.1 | 609-byte HTML shell retrieved |
| `/api/v1/me` | 401 | 13.2 | Anonymous request denied, zero-byte body |
| `/api/v1/clients` | 401 | 9.2 | Anonymous list request denied, zero-byte body |
| `/api/health/live` | 200 | 9.5 | Liveness returned `live` |
| `/api/health/ready` | 200 | 30.7 | Readiness returned `ready` |
| `/api/v1/auth/config` | 200 | 67.2 | Forms configuration returned |

Sample size is **one per route**. The first request may include DNS/connection/TLS initialization. Later responses cannot be assumed to be equivalently cold. A 401 denial does not measure authenticated list-query performance. No percentile, sustained throughput, availability percentage or release SLO can be derived from these samples. The successful readiness response is a point-in-time signal, not a recovery or full-workflow test.

## Reporting preview durations displayed by the application

| Evidence | Preview scope and result | UI-displayed query duration | Limit of interpretation |
|---|---|---:|---|
| [061 — ticket report builder](traces/061-ticket-report-builder.txt) | No filters; first 25 of 1,949 matching tickets; UI data time 16:47 | **245 ms** | Application-reported server-side query duration, not measured click-to-render latency |
| [075 — mobile builder](traces/075-builder-mobile.txt) | No filters; first 25 of 1,949 matching tickets; UI data time 16:48 | **145 ms** | Separate preview under a mobile viewport; not a controlled desktop/mobile benchmark |
| [076 — critical/high template](traces/076-report-template-critical-high.txt) | Template preview; 23 of 23 matching tickets; UI data time 16:48 | **236 ms** | Different query/filter scope; not directly comparable with the unfiltered samples |

All three snapshots show a populated preview and exact matching count. No independent stopwatch or SQL trace verified the component boundaries of the displayed duration. The pages support useful evidence of functioning read previews at observed volume, but no complete export generation, file-download duration, scheduling latency or large-data benchmark was executed.

## Audit operation timings are not application performance

[browser-operation-timings.json](traces/browser-operation-timings.json) records `operationToSnapshotMs` for the auditor's automation. The interval includes browser/tool orchestration, snapshot processing and evidence/disk work. For example, evidence 061/075/076 has operation intervals of 1,457 / 1,127 / 1,446 ms, while the UI query labels are 245 / 145 / 236 ms. These are different measurements. **Do not report operation intervals as page-load, API latency, LCP, interactivity or a performance defect.**

The [evidence index](traces/evidence-index.json) supplies capture times, and the [responsive snapshot metadata](traces/responsive-results.json) supplies observed page states. They are evidence provenance, not a navigation timing trace, HAR, console capture or profiler session.

## Technical reliability observed

- SLA and Management routes initially exposed a Loading status, then produced populated settled snapshots. This shows a loading state followed by content in those visits; capture spacing does not provide a trustworthy exact load duration. [SLA loading](traces/006-sla-dashboard.txt), [SLA settled](traces/010-sla-settled.txt), [Management loading](traces/007-management-dashboard.txt), [Management settled](traces/011-management-settled.txt).
- Report builder previews populated during desktop/mobile and template inspection. The mobile layout issues belong to UI/usability review; successful preview computation does not prove the controls are usable at every viewport. [UI/UX audit](05-ui-ux-audit.md).
- Jira monitoring displayed `Failed records (24 h): 0`, two pending conflicts, last success at 16:46, Issues/Comments Healthy and Activity Warning, with a reported 2.4-second per-run figure. This is existing application telemetry, not an audit-triggered sync or independently timed integration test. Historical rows include successful runs; the Activity warning/conflicts still require operational triage. [Monitoring snapshot](traces/059-jira-monitor.txt), [conflict snapshot](traces/058-jira-conflicts.txt).
- No HTTP 5xx, transport exception or redirect occurred in the six explicit native requests. This does not cover authenticated API requests, all route calls or every resource request made by the browser.
- The final browser warning/error checkpoint returned no captured entries. This limited retained log window is not a complete session console, exception or network record. [Final checkpoint](traces/final-console-check.json).
- Existing Completed export entries with unavailable metadata were investigated through source. Access-fingerprint masking can intentionally hide a retained export. The evidence does not prove generation/storage/retention failure or establish download reliability. [History](traces/064-export-history.txt), [details](traces/066-export-details.txt), [source analysis](traces/exports-source-review.md).

## Source patterns that need runtime validation

The local code has readiness checks, sanitized problem responses/trace IDs, request-duration logging, retryable queued reporting jobs, reporting duration/queue metrics and background SLA/quality/notification/Jira services. These patterns can support operations, but no collector, alert routing, SLO threshold, production retry behavior, queue recovery or multi-instance capacity was demonstrated by this audit. Source locations and historic operational-guide caveats are in the [supplemental review](traces/source-security-review.md).

Starting the local API would run reference seeding/backfills and hosted services; it was not started for audit measurement. No database migration, data reset, external service or workload generator was launched.

## Unexecuted performance/reliability coverage

| Area | Evidence gap |
|---|---|
| Initial browser loading | No navigation/resource timing, TTFB/FCP/LCP, cache-controlled cold/warm sequence or bundle download profile |
| Route responsiveness and rendering | No controlled click-to-ready or interaction latency, long-task profile, CPU/heap trace or reproducible freeze measurement |
| API reliability | No complete authenticated network/error log, repeated-request baseline, duplicate-call analysis or percentile latency distribution |
| Failure handling | No approved offline/timeout/dependency failure, retry, error-boundary or interrupted-session test |
| Reporting scale | No approved large-data query benchmark, export generation/download, scheduler/worker throughput or recovery test |
| Capacity and recovery | No concurrency, soak, stress, failover, production-like restore or infrastructure saturation test |
| Browser errors and resources | No complete console/JavaScript-exception/broken-resource capture; absence of a visible error banner cannot prove their absence |

## Recommendations and interpretation cautions

1. Establish approved page/API/query SLOs and a production-like isolated dataset. Measure cold/warm browser navigation and authenticated API queries separately, including scope/filter changes and report previews. Retain raw timing/network evidence and specify browser/device/network/cache conditions.
2. Collect the existing reporting queue/export counters and request timings into an agreed monitoring system; define owners and alerts for failures, stale sync, sustained queue wait and readiness loss. Verify retry/recovery in the isolated environment before relying on source intent.
3. Triage the observed Jira Activity warning/pending conflicts through the normal operational process; do not run live synchronization merely to produce an audit pass.
4. Separate data-definition concerns from performance: the executive commitment KPI deliberately uses a documented 14-day window while the chart uses `Dashboard.UpcomingDays` (observed 7). Their difference alone is not slow/stale data or a calculation defect. [Window analysis](traces/dashboard-window-and-holiday-analysis.md).
5. Do not treat fast SLA queries as evidence of contractual accuracy. CT1001's reported holiday exclusion conflicts with the calculator's disclosed lack of a holiday model at a capability level; validating an affected case/calendar is still required before claiming a wrong deadline/breach/penalty. [Contractual-risk analysis](traces/dashboard-window-and-holiday-analysis.md).

No confirmed performance defect or numeric performance score is assigned from these samples. The resulting release decision must use the broader functional findings and explicitly retain the untested reliability/capacity scope.
