# 10 — Performance and reliability review

**Conditions:** application, SQL Server container and headless Chromium on the same 4-core / 15 GB sandbox; demo data volume (15 clients, 18–90 cases, 19 environments); one user; debug build of the API. These are development observations, **not** load or capacity results. No stress or volume test was run.

## Measurements

| Measure | Value | Source |
|---|---|---|
| Page load to network idle, 64 routes at 1920 px | median 672 ms; slowest: dashboard 1,806 ms, notes 1,096 ms, map 988 ms | `traces/ui-crawl-results.json` (`loadMs`; includes Playwright's 500 ms idle wait) |
| API calls per page | 4–10; dashboard 8, escalation edit 10 | crawl `api` |
| Duplicate GET requests within one page load | none found | crawl |
| List endpoints (page of 1) | 51–194 ms; first call after start slower (182–194 ms) | harness timings |
| Report previews (13 reports) | 22–125 ms | harness timings |
| CSV export (6 rows) | job completed in about 180 ms | export job timestamps |
| Console errors / JavaScript exceptions over 256 page loads | 0 exceptions; console errors only for the two deliberate 404 pages | crawl |
| Unexpected failed requests | 0 | crawl |
| Application script | 788.6 KB (224 KB gzip) + 77.8 KB CSS; map chunk 164.9 KB and atlas 756.5 KB loaded on demand | build output |
| API start-up (migrate + seed + SLA backfill on an empty database) | about 20–30 s | launch log |

## Reliability behaviour observed

| Situation | Behaviour | Verdict |
|---|---|---|
| Server returns 500 for a list | Red message with trace id; page chrome stays usable; no Retry control | Adequate (023) |
| Network offline during save | "The request failed. Check your connection and try again."; entered values kept; second attempt succeeds | Good |
| Two users save the same record | One succeeds, the other gets a clear 412 message and keeps the form values | Good |
| Expired antiforgery token | Client silently refreshes the token once and retries (`api.ts`) | Good (code review) |
| Double click on submit | One request | Good |
| Parallel identical API requests | Duplicates created | Weak (006) |
| Refresh / back / forward | State and URL filters restored | Good |
| Background jobs (SLA sweep, notifications, data quality, scheduler) | Ran without logged errors during the session; behaviour on failure and with several instances not tested | Not verified (027) |
| Database unavailable | `/api/health/ready` returns 503 by design; not exercised | Not tested |

## Risks (professional assessment)

1. **Unknown behaviour at volume.** Several screens compute aggregates per request (Command Center: 8 calls; client health report 125 ms for 15 clients). Scaling to hundreds of clients and tens of thousands of cases needs a measured test with production-like data and indexes reviewed.
2. **Dashboard weight.** The landing page is the slowest and largest page; every visit loads all bands (025).
3. **Single bundle.** Every user downloads all pages' code on first visit (028).
4. **Start-up tasks** run before the site listens (R7 in report 09).
5. **Export limit** of 100,000 rows generated inside the web request; large exports will hold a request thread and memory.

## Recommendations

- Define performance budgets (for example list ≤ 500 ms and dashboard ≤ 2 s at the 95th percentile with 10× expected data) and run a controlled load test in an isolated environment.
- Lazy-load dashboard bands below the fold and split the bundle by route.
- Add Retry to error states and idempotency to create endpoints.
- Add job health to the readiness endpoint.
