# 10 — Performance and reliability review (build 2.60.0)

**Conditions:** as in the first audit (single user, demo data, debug build, everything on one four-core sandbox) — **plus the project's 755-test suite running on the same machine during the crawl.** Page timings below are therefore pessimistic and must not be compared with the 2.29.0 figures as a regression measurement. No load test was run.

## Measurements

| Measure | 2.60.0 (under concurrent load) | 2.29.0 (idle machine) |
|---|---|---|
| Page load to network idle, median over routes at 1920 px | 1,115 ms (79 routes) | 672 ms (64 routes) |
| Slowest pages | contract edit 3,341 ms; Command Center 2,249 ms; projects 2,151 ms | Command Center 1,806 ms |
| API calls per page | 3–9 | 4–10 |
| Duplicate GETs within a page load | none | none |
| JavaScript exceptions / unexpected failed requests over all page loads | 0 / 0 (316 loads) | 0 / 0 (256 loads) |
| Entry script | 900.6 kB (297.8 kB gzip); pages in separate chunks (largest: Clients 145 kB); map atlas 756.5 kB on demand | 788.6 kB single script |
| Static assets in the build | 338 files, 5.2 MB | — |
| API start-up on an empty database (migrate 104 migrations + seed + backfill) | about 60–80 s | about 20 s |
| Project .NET suite | 19 min 54 s for 755 tests | 1 min 14 s for 140 |

## Reliability behaviour

| Situation | 2.60.0 | Change |
|---|---|---|
| Server error on a list | Message, trace id and **"Try again"** | Improved |
| Offline save | Message; values kept; retry works | Same |
| Concurrent saves | One wins, one 412 | Same |
| Double click on submit | One request | Same |
| Parallel identical API requests | Duplicates | Same (006) |
| Missing record | Guidance text | Improved |
| Background jobs | Six; ran without logged errors in the session; failure and multi-instance behaviour untested | More jobs (027) |
| Jira unavailable / slow | Not testable (disabled) | New risk |
| Environment restarts during the audit | The audit worker restarted three times; the application and database are a throwaway container and were rebuilt from the seed each time. This is a property of the audit sandbox, **not** of the application | — |

## Risks (professional assessment)

1. Volume behaviour remains unmeasured; the code base and the number of dashboard aggregates have grown substantially.
2. Start-up time grows with every migration; consider a baseline migration before production.
3. Entry bundle has no headroom.
4. An outbound integration worker inside the web process couples site availability to Jira behaviour.

## Recommendations

Performance budgets and a controlled load test with production-like volume on an isolated environment; idempotent create endpoints; job health in the readiness endpoint; squash migrations to a baseline; move synchronisation to a separate worker when more than one instance is planned.
