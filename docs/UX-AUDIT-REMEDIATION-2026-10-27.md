# UX audit remediation — UX-001 … UX-005

**Source:** [UX-AUDIT-2026-10-27.md](UX-AUDIT-2026-10-27.md) (audited commit `fbbb3e3`).
**Remediated revision:** branch `claude/ux-audit-remediation`, based on release 2.40.0 (`66bc071`). **Work date:** 29 October 2026.
**Environment:** Windows, local Development build, Microsoft Edge (Playwright, Chromium engine), isolated LocalDB instance `(localdb)\TioHubQALocalDB` with a new database per run. The default `MSSQLLocalDB` instance, its databases and the running Claude application were not touched.

Between the audit and this work, the GUI fixes GUI-01 … GUI-13 (release 2.36.0, [GUI-FIXES-2026-10-27.md](GUI-FIXES-2026-10-27.md)) addressed most of what the audit saw, and releases 2.37–2.40 added the Reporting Center redesign, Configuration navigation, client logos, notifications and the Client Map. Every finding was therefore **reproduced on 2.40.0 first**, with a measuring probe over 46 routes × 6 viewport sizes (276 measurements, `ux-probe-before.json`), before anything was changed.

## Summary

| Finding | Original status | On 2.40.0 | Status after this work |
|---|---|---|---|
| UX-001 Narrow navigation | Verified | **Reproduced (regression)** at 360/390 px: the menu button's section label cut in 30 of 92 phone measurements ("Commitm…", "Administr…", "Dashbo…"). 768 px and desktop: not reproduced | Fixed and verified |
| UX-002 Narrow tables | Verified | Phones: not reproduced (GUI-06 row details). Tablets/desktop: 78 table views scroll sideways with a signposted, focusable scroll area, but the record identifier scrolled out of view | Fixed and verified (identifier pinned); phone layout verified unchanged |
| UX-003 Loading cost | Build size verified; impact suspected | **Reproduced (regression):** entry chunk 907.43 kB, over the 900 kB limit; the budget test let it pass (unit error) | Fixed and verified (881.99 kB); user-perceived impact still requires field measurement |
| UX-004 Target size | Suspected | Mostly not reproduced (GUI-12). Remaining: unnamed TabBar scroll arrows (21 route/size combinations), an invisible 1 px Tab stop on the client form, table record links 19–22 px high closer than 24 px to the next target | Fixed and verified by geometry check; touch-device test requires external verification |
| UX-005 Contextual guidance | Requires further testing | Guidance inventory: strong on cases/contracts/SLA and reports; denials inconsistent and without a next step; error states without retry or trace guidance | Partially fixed (denials and error recovery); the audit's acceptance criterion (pilot users can explain …) requires user research |

## UX-001 — Narrow-screen navigation

- **Reproduction (2.40.0):** at 360 px the header leaves 67 px for the section label (logo 116 px, search/notifications/account 110 px); "Commitments" needs 99 px, "Administration" 105 px, "Reporting Center" 119 px. 390 px leaves 97 px. Clipped in 30 measurements (`/commitments`, `/escalations`, `/reporting-center`, all `/admin/*`, `/` at 360 …). No header control overlapped another; no document overflow. 601–900 px: label complete (154 px room). Desktop: active link complete, *More* holds the rest (GUI-10).
- **Root cause:** GUI-10's menu button carries the section name with `max-width: 10rem; text-overflow: ellipsis`, which does not fit the room left on phones; there is no other place where the section is shown.
- **Solution (smallest effective change):** on phones (≤ 600 px) the menu button shows the icon only — its accessible name stays *Menu, current section X* — and the section is shown in full above the page title in the main toolbar (`SectionLabel`, part of `PageHead`; the Client Map toolbar places it too). The rule applies only on pages that show that line (`:has(.page-section)`), so the Notes workspace, which has no main toolbar, keeps its short "Notes" label in the header. The logo and the framework header are unchanged. The Notes workspace also gained its missing level-1 heading (screen-reader only).
- **Files:** `ui/kit.tsx` (`SectionContext`, `SectionLabel`, `PageHead`), `ui/Shell.tsx`, `styles/kit.scss`, `styles/frame.scss`, `pages/ClientMap.tsx`, `pages/Notes.tsx`.
- **Verification:** `ux-remediation.spec.ts › UX-001` for four access profiles (TIO Manager, Operation Engineer, restricted custom role, Administration right without resource permissions): every section in the drawer, at 360, 390 and 768 px — menu name, readable section text, no header overlap; desktop 1366 px active link readable; Administration listed only with the Administration right; Escape returns focus to the menu button. Coverage ledger: 45 routes × 6 sizes, current section readable everywhere. Drawer focus containment and Escape remain covered by `gui-fixes.spec.ts › GUI-10`.
- **Evidence** (in `docs/evidence/ux-remediation-2026-10-29/`): `ux-001-360-before.png` / `ux-001-360-after.png`, `ux-001-768-after.png`.

## UX-002 — Narrow operational tables

- **Reproduction:** phones (≤ 600 px): every populated list keeps identifier, status and actions in the row and lists the other columns in the row details (GUI-06); three tables scroll slightly (Users 558/366 px, Settings 603/366, Escalations 375/366) with edge shadows and a focusable, named scroll area. Ten tables reported "hidden columns, no details" — all were empty (no rows, hence no toggles); not a defect. Tablets/desktop: 78 table views wider than their panel (for example Cases 2,330 px in a 744 px panel at 768 px) scroll with edge shadows and a focusable area, and the action column is pinned (GUI-11); the identifier scrolled away, so a row scrolled sideways no longer said which record it was.
- **Root cause:** only the action column was sticky.
- **Solution:** the first named column (the identifier) is marked `col-identity` in the shared `DataTable` and stays at the left edge while a table overflows, on screens wider than 600 px (phones keep the details layout). On tablets (601–1199 px) the identifier is capped at 14rem; long identifiers wrap instead of being cut. The cap does not depend on the overflow state: a first version applied it only while the table overflowed, which narrowed the table, ended the overflow and re-applied it in a loop (React error #185 on the Rights and team detail pages, caught by the full suite and the new `LoadBoundary`); the coverage ledger now fails on any stopped page. No column was removed; filters, sorting, column chooser, paging, export (filtered rows, all columns) and permissions are unchanged because the change is presentation only.
- **Files:** `ui/kit.tsx`, `styles/kit.scss`.
- **Verification:** `UX-002 tablet` (768 px Cases: scroll area named *Cases: scroll sideways for more columns*, arrow keys scroll it, identifier stays within 1 px, last column reachable); `UX-002 phone` (360 px Cases: identifier inside the screen width, every hidden column listed in the details, no document overflow, sorting, CSV export with every column). Existing GUI-05/06/07/11 tests unchanged and passing.
- **Evidence** (same folder): `ux-002-768-before.png` / `ux-002-768-after.png`, `ux-002-360-before.png` / `ux-002-360-after.png`.

## UX-003 — Loading cost

- **Baseline (2.40.0, `npm run build`):** entry `index-*.js` **907.43 kB** (gzip 301.00 kB) — Vite warned again. Country geometry 756.54 kB and Leaflet 165.81 kB are dynamic and are not requested by `/clients` (GUI-13, still true). Composition of the entry chunk (rendered module bytes before minification): react-dom 654 kB, vendored framework 302 kB, framework icon set `icons.json` 272 kB, react-router 243 kB, hub shell and kit 104 kB, TanStack Query 72 kB, and — eager without need — the notifications pop-up and center (25 kB) and the sign-in screens (11 kB).
- **Why the regression passed the tests:** `gui-fixes.spec.ts` compared the entry file with `900 × 1024` bytes (921,600), while Vite's kB is 1,000 bytes; a 907 kB chunk passed. Corrected to `900 × 1000`.
- **Solution:** the bell's pop-up (and with it the notifications center) loads when the bell is first opened, prefetched on hover/focus; `signOut` moved to `api.ts` so the shell no longer imports the sign-in screens, which are lazy routes. A new `LoadBoundary` gives page chunks (around the outlet, reset on navigation), the bell pop-up and the sign-in screens a recoverable state: a chunk that cannot be downloaded says so and offers *Reload*, a page that fails while rendering offers *Reload* and *Try again*; the shell stays usable. No threshold was raised, no warning suppressed, no chunks were merely renamed.
- **After:** entry **881.99 kB** (gzip 293.29 kB), no warning; `Notifications-*.js` 18.58 kB and `SignIn-*.js` 6.99 kB load on demand.
- **Not reduced further:** react-dom, react-router and the framework's complete icon JSON (imported by the vendored framework's `Icon`) are 85 % of the entry chunk; trimming the icon set would need a framework change (vendored sources stay unmodified).
- **Cold-load lab measurement** (`ux-003-cold-load-*.json`): see the table below. Lab data from one developer machine against the local server — not real-user data; INP and task times were not measured and no claim about them is made.
- **Files:** `ui/NotificationBell.tsx` (new), `pages/Notifications.tsx`, `ui/LoadBoundary.tsx` (new) + `LoadBoundary.test.ts`, `App.tsx`, `api.ts`, `pages/SignIn.tsx`, `ui/Shell.tsx`, `styles/kit.scss`, `tests/e2e/gui-fixes.spec.ts`.
- **Verification:** `UX-003` tests — `/clients` requests neither the notifications, sign-in, map nor geometry chunks; the bell loads its pop-up, focus moves in, Escape returns focus; an aborted page chunk shows the message inside the shell, navigation clears it, a reload recovers. Vitest: chunk-error recognition for Chromium, Firefox and Safari messages.

| `/clients`, cold (lab) | Before (2.40.0) | After | Change |
|---|---:|---:|---:|
| Entry chunk transferred | 907,431 B | 881,990 B | −25,441 B (−2.8 %) |
| All scripts transferred | 1,077,598 B | 1,057,684 B | −19,914 B (−1.8 %) |
| All requests transferred | 1,402,983 B | 1,385,204 B | −17,779 B (−1.3 %) |
| First contentful paint | 6,540 ms | 6,408 ms | −132 ms |
| Clients table visible | 9,799 ms | 9,395 ms | −404 ms |

Profile: Edge, cache disabled, 1.6 Mbit/s down / 750 kbit/s up / 150 ms round trip, CPU slowed 4×, local development server — one run each, so the timing differences are within run-to-run noise and are **not** claimed as an improvement; the byte reductions are deterministic. The development server sends scripts uncompressed (no response compression is configured; IIS compresses static files in production), so these byte counts are close to the minified sizes, not production transfers. Evidence: `docs/evidence/ux-remediation-2026-10-29/ux-003-cold-load-{before,after}.json`, `vite-build-{before,after}.txt`.

| Chunk (`npm run build`) | Before | After |
|---|---:|---:|
| Entry `index-*.js` | 907.43 kB (gzip 301.00 kB), **warning** | 881.99 kB (gzip 293.29 kB), no warning |
| `Notifications-*.js` | in the entry chunk | 18.58 kB, on first bell opening or the notifications center |
| `SignIn-*.js` | in the entry chunk | 6.99 kB, sign-in and password pages only |
| `countries-50m-*.js`, `LeafletMap-*.js` | 756.54 kB / 165.81 kB, map only | unchanged, map only |

## UX-004 — Target size and names

- **Reproduction:** geometry check of every visible target against SC 2.5.8 (24 × 24 px, or a 24 px circle that touches no other target) on 276 route/size combinations. Remaining on 2.40.0: (1) the framework TabBar's scroll arrows (`helpers/scrollButton`) are `role="button"` elements **without an accessible name** (21 combinations, e.g. `/actions`, client detail); (2) the client form's logo file input was a **1 × 1 px Tab stop**, invisible when focused (also a 2.4.7 problem), duplicating the *Upload logo…* button; (3) record links in table cells were 19–22 px high and closer than 24 px to the next target (Commitments client links, the dashboard's environment links at 768 px). The sidebar collapse button, pager, row actions and details toggles meet the size since GUI-12.
- **Solution:** the hub's `Tabs` wrapper names the arrows *Scroll tabs left / right* (vendored source unmodified); the file input is `tabIndex=-1` and `aria-hidden`, the button carries the hint as its description; table cell links get 3 px vertical padding (6 px on touch screens) — hit area, not layout, so rows keep their density.
- **Files:** `ui/kit.tsx`, `pages/Clients.tsx`, `styles/kit.scss`.
- **Verification:** `UX-004` — 12 representative routes at 1366, 768 and 390 px: no undersized target without the spacing exception, no unnamed control, no overlapping table-link hit areas (links scrolled under a sticky column excluded, they are covered by design); the logo picker is one Tab stop with its hint as description. Focus visibility: hub focus styles unchanged (2 px outline, offsets kept inside table scroll areas).
- **Open:** real touch-device testing (misfires) — requires external verification.

## UX-005 — Contextual guidance

- **Inventory (existing help, reused):** short hints are present across the application (about 180 `hint` texts in the pages): case and contract linking explain which SLA applies and what removing a contract does; first-response recording; operational vs contractual due dates; the penalty totals; report filters (*No filters: all rows you are authorized to see*), the export history and schedules (*generated with the recipient's own access*, *the hub sends no e-mail*); configuration pages carry *about* and *used by* texts; empty states distinguish *No records entered*, *No matching records. Change or clear the filters*, *Unknown*, *Access restricted*.
- **Gaps found:** access denials named different people (*Ask an Application Administrator*, *Ask a TIO Manager*) or nobody, and never said where access is changed; server and connection failures said what failed but offered no next step (no retry; the trace ID without explanation).
- **Solution:** `Restricted` + `ACCESS_HELP` — a denial says what is needed and where it is granted: rights come with the role (*Administration › Roles*), roles and client/team scopes with the account (*Administration › Users*), changed by a user with the Administration right — which is what `UserContext.RequireAdministrator` enforces. It names no person and shows no record. Used by the Reporting Center, Firewall rules, Administration and Configuration pages, change history, client contacts and the no-business-role page, and by every 403 shown through `ErrorBox`. `ErrorBox` adds *Try again* (refetches the failed queries on the screen) to server and connection failures and explains the trace ID (*give the hub administrator the trace ID …*); a 404 suggests checking the address or opening the record from its list. No support channel, access-request workflow or business rule was invented; no help link was added because the hub serves no maintained help pages (the operations guide is a repository document).
- **Files:** `ui/kit.tsx`, `App.tsx`, `pages/Admin.tsx`, `pages/Configuration.tsx`, `pages/Firewall.tsx`, `pages/Reports.tsx`, `pages/Clients.tsx`, `pages/common.tsx`.
- **Verification:** `UX-005` — a role without rights sees the need and *Administration › Roles* on Firewall rules and Administration, and no table; a 500 with a trace ID shows *Try again* and the trace sentence, and retrying recovers once the server answers; a lost connection says so and recovers. Messages are plain text in the page (keyboard and screen-reader reachable; errors use `role="alert"`).
- **Open:** the audit's acceptance criterion — pilot users can explain report filters, scope denial and SLA actions — needs moderated sessions (script below).

## Coverage ledger

| Area | Routes | Profiles | Sizes | How |
|---|---|---|---|---|
| Dashboard | `/`, `/map`, `/actions`, `/notifications`, `/data-quality` | M | 6 | ledger, probe, UX-004 (`/`) |
| Clients | list, create, detail, projects, contracts (list, create, detail), environments (list, create, detail), assets (list, detail), versions, firewall rules | M; firewall denial: custom | 6 | ledger, probe, UX-002, UX-004, UX-005 |
| Products | list, create, detail | M | 6 | ledger, probe, UX-004 |
| Cases | list, create, detail | M | 6 | ledger, probe, UX-002 (tablet, phone), UX-005 (failure, retry) |
| Commitments | list, create, detail | M | 6 | ledger, probe, UX-001 evidence, UX-004 |
| Notes | workspace | M | 6 | ledger, probe (GUI-02 tests cover the panes) |
| Escalations | list, create, detail | M | 6 | ledger, probe, UX-004 |
| Teams | teams (list, detail), handovers, reassignment | M | 6 | ledger, probe, UX-003 (chunk failure) |
| Reporting Center | overview | M; denial: custom (GUI-01) | 6 | ledger, probe, UX-004 |
| Administration | users, roles, rights, configuration, policies, settings, audit, archived | M; denial: custom | 6 | ledger, probe, UX-004, UX-005 |
| Navigation, all sections | drawer and header | M, E, custom, admin-only | 360, 390, 768, 1366 | UX-001 |

M = TIO Manager (`DEV\manager`), E = Operation Engineer (`DEV\engineer`), custom = a new role with one resource permission, admin-only = a new role with the Administration right and no resource permissions. Sizes: 1920×1080, 1440×900, 1366×768, 768×1024, 390×844, 360×800. Dialogs, validation, unsaved changes, stale edits, duplicate submissions, report exports and schedules remain covered by the existing journeys (`journeys.spec.ts`, `reporting-builder.spec.ts`, `stage3-*.spec.ts`), which all ran.

## Accessibility checks

| WCAG 2.2 | Checked | Result |
|---|---|---|
| 1.3.1 Info and relationships | Native tables with captions and `scope` (GUI-05); Notes level-1 heading added | Pass on checked routes |
| 1.4.3 / 1.4.11 Contrast | No new colours; the section line uses the framework label type set | Not recalculated in this work (no colours changed) |
| 1.4.10 Reflow | No document overflow on 45 routes × 6 sizes (down to 360 px) | Pass; 320 px: see GUI-FIXES (Clients table scrolls 22 px) |
| 2.1.1 Keyboard | Table scroll areas by arrow keys; drawer, bell, More by keyboard | Pass |
| 2.4.7 Focus visible | Invisible 1 px Tab stop removed | Pass on checked routes |
| 2.4.11 Focus not obscured | Sticky identifier/action columns can cover a focused cell scrolled beneath them | Partially: the browser scrolls a focused cell into view, but it can sit under a sticky column; not measured — open |
| 2.5.8 Target size | Geometry check, 12 routes × 3 sizes in tests, 276 measurements in the probe | Pass (automated) |
| 3.3.1 / 3.3.2 | Unchanged form validation (existing journeys) | Not re-audited |
| 4.1.2 Name, role, value | Unnamed TabBar arrows named | Pass on checked routes |
| 4.1.3 Status messages | Errors `role="alert"`, loading `role="status"` | Pass on checked states |

No axe-core run (no new dependency was needed for these fixes, and an automated scan would not establish conformance). No screen reader (NVDA, JAWS, Narrator), forced-colours/high-contrast mode, browser zoom/text-spacing or real touch device was tested. Reduced motion: the existing global rule (`prefers-reduced-motion`) applies; not re-tested.

## Tests executed

All runs on 29 Oct 2026 from the worktree `TIO-Hub-Claude-UX`, with `TIOHUB_TEST_SQL` / `TIOHUB_E2E_SQL` = `(localdb)\TioHubQALocalDB`, `TIOHUB_E2E_PORT=5196`, `DOTNET_PROCESSOR_COUNT=4` (process-scoped). Port 5196 was free; the baseline measurements of the unchanged 2.40.0 code ran from a temporary detached worktree on port 5197.

| Check | Result |
|---|---|
| `dotnet build TioHub.slnx` | passed, 0 errors |
| `dotnet test tests/TioHub.Tests` | 268 / 268 passed (a first run: 267 passed, 1 failed — the intermittent A73 test, see gaps; it passed alone and in the next full run) |
| `npm run typecheck` | passed |
| `npm test` (Vitest) | 42 / 42 passed (40 existing + 2 new in `ui/LoadBoundary.test.ts`) |
| `npm run build` | passed, no chunk-size warning (entry 881.99 kB) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npx playwright test --list` | 141 tests in 15 spec files (125 existing + 16 new in `ux-remediation.spec.ts`) |
| `npx playwright test` (Edge) | **141 / 141 passed**, 0 skipped, 14.6 min. An earlier full run had 8 failures: 7 journeys plus the ledger stopped on the identifier-width loop described under UX-002, partly also slowed by a concurrent baseline run; after the fix all passed |
| Reproduction probe (46 routes × 6 sizes) | before → after: clipped section labels 30 → 0; header overlaps 0 → 0; document overflow 0 → 0; unnamed controls 21 → 6; 2.5.8 failures 11 → 6. The remaining 6 are the client form's hidden logo file input, which the probe's selector still counts although it is now out of the focus order and the accessibility tree (`ux-probe-{before,after}.json`) |

The original 125 Playwright tests are unchanged except one assertion in `gui-fixes.spec.ts` (GUI-13 budget: `900 × 1024` → `900 × 1000`), which makes it stricter. No test was skipped, no assertion weakened, no visual baseline regenerated (the suite has none). Lint: the repository has no lint script or ESLint configuration — not run. Browsers: Edge only; Chrome, Firefox, Safari and mobile browsers not run.

## Remaining gaps and external verification

1. **User research (UX-005 acceptance, task metrics):** moderated sessions with 2–3 each of managers, engineers and administrators. Script: (a) export last month's cases for one client and explain which rows the file contains; (b) open Firewall rules with an account without Technical detail and say what to do next; (c) link a contract to a case and explain which SLA now applies; (d) recover from a failed list (server stopped). Record success, time, errors and the explanation given.
2. **Real devices and assistive technology:** iOS Safari and Android Chrome phones/tablets (touch misfires, drawer, row details), NVDA + Edge/Firefox and Narrator (section line, denials, retry, table scroll area), Windows high contrast.
3. **Browsers:** only Edge (Chromium) was run. Chrome, Firefox and Safari were not tested.
4. **Performance in the field:** throttled lab timings only; production serves compressed static files through IIS, so transfer sizes there are smaller than the development measurement. Real-user LCP/INP need monitoring on the target network.
5. **Production identity:** Windows sign-in and group mapping were not tested (development cookie identities only).
6. **Intermittent .NET test:** `A73_ClientMap.Map_clients_carry_products_and_project_manager_and_assets_filter_by_country` failed once in a full run (line 20, owner vs project manager) and passed alone and in the next full run — it depends on data changed by other tests in the shared fixture. Not caused by this work (no backend change); left for the owner of A73.
7. **2.4.11 with sticky columns:** a focused cell scrolled beneath the pinned identifier or action column can be covered; consider `scroll-padding-inline` on the scroll area after a screen-magnifier review.

## Database impact

None. No schema, migration or data change. Tests used `(localdb)\TioHubQALocalDB` (recreated for this work after it was found missing) with a new database per run created by the existing harnesses; `MSSQLLocalDB`, `TioHub_PortfolioDev`, `TioHub_PortfolioDev_Claude` and the running Claude application were not touched.
