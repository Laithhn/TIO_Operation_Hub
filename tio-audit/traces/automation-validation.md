# Audit automation validation — 10 November 2026

Scope: local harness preparation and validation only. No target HTTP requests, browser navigation, services, database connections or migrations were executed by this subtask. Application tests remain **not executed**.

| Check | Actual result | Interpretation |
|---|---|---|
| Node syntax checks for all `tio-audit/test-automation/*.mjs` files | Exit 0 | Files parse successfully. |
| `node --test tio-audit/test-automation/safety-policy.test.mjs` | Exit 0; 8 passed, 0 failed, 0 skipped | Pure local request-policy, origin/session-path validation, safe detail-link, route catalog, explicit fixture validation, field-specific sentinel and Notes GET-side-effect assertions passed. |
| Playwright `test --config=tio-audit/test-automation/playwright.audit.config.mjs --list` | Exit 0; 298 tests in 4 files | Dependency resolution, config loading and test discovery passed. No browser launched and no application assertion ran. |

Prepared cases: 280 route/viewport definitions (69 permitted read routes × 4 viewports plus 4 statically skipped Notes definitions), 4 source-defined redirects, 6 anonymous login/deep-link cases, 3 read-only journeys, and 5 findings-regression definitions. The latter include fixture-dependent configured ticket-status consistency, deterministic leading header/body alignment, field-specific visible audit user-ID validation, catalog configured-status choice parity and one statically skipped export-UX proposal. These counts describe test definitions, not tested modules or live coverage. They must not be included among executed audit scenarios.

The initial discovery command generated JSON output under `traces/playwright-results.json`. Its config path and stats identified it as this audit harness's discovery output: 0 expected passes, 293 skipped, 0 unexpected failures. It was relocated under `test-automation/results/discovery-only.json`; subsequent output uses `test-automation/results/` to avoid colliding with other audit evidence. This discovery JSON is not a live execution report.

No new package was installed. Existing `tests/e2e/node_modules/@playwright/test` version 1.55.0 and the repository's `.tools/node/node.exe` were used. The existing development Playwright configuration was inspected but never invoked. It includes an API `webServer` and database configuration and is unsuitable for this live read-only audit.

Request guard tests cover rejection of browser mutation methods, external origins, action-like GET URLs, credential-bearing/non-HTTPS base URLs, repository-local session files and unsafe detail links. Legitimate POST read previews are intentionally blocked, so report-builder runtime coverage remains partial even with an approved session. The preparation does not validate browser guard behavior against a live server or prove access control.

Notes safety correction: source review established that GET `/api/v1/notes/tree` may create an empty account's starter notebook/section. The four Notes definitions are now statically skipped before navigation, and the default request guard independently denies `/notes` navigation and the entire `/api/v1/notes/` family, including GET. The earlier scaffold was never executed against the target, so this pre-run correction caused no target data change. Default prepared count remains 298; Notes is blocked coverage, never a pass.
