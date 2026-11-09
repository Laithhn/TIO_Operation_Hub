# TIO Operations Hub 2.39.0

Production package release, 28 October 2026. This release adds client logos (decision A71), redesigns the notifications (A72) and
reorganizes Administration → Configuration navigation. Details: `docs/CLIENT-LOGOS-A71.md`, `docs/NOTIFICATIONS-A72.md`.

## New and changed

- **Client logos (A71).**
  - *Add / edit client* has an optional logo: upload with an instant preview, replace, remove, undo before saving. PNG, JPG/JPEG or WebP, up to 2 MB and 5000 px.
  - SVG is not accepted (an SVG can carry scripts). Files are checked by their content, not their name.
  - The logo, or the client's initials on a coloured tile when there is none, is shown wherever a client appears: client list and page, dashboard tables and client map, cases, commitments, escalations, contracts, projects, environments, servers, firewall rules, products, data quality, organization structure, notifications, the search palette and the Cases report builder.
  - Cases report builder files: a one-client report carries the logo in the PDF header and next to the client in the detailed table, and on the Excel Summary sheet.
  - Changing a logo needs the right to edit the client; the change is in the client's history.
- **Notifications (A72).**
  - The bell's pop-up is new: unread badge and *Mark all as read*, tabs **All / Unread / Critical**, sections *Critical / overdue*, *Action required*, *Informational* and *Resolved*.
  - Each card shows an icon, the status in words, how long ago (exact time on hover) and the action, e.g. *Review payment*, *Review contract*, *View commitment*, *View client*.
  - Related alerts are grouped, e.g. *2 overdue commitments – CM-1006 and CM-1004 require attention*; expanding shows each one.
  - **Read and resolved are now separate.** When the cause of an alert is cleared (payment made, commitment completed, end date recorded), the alert is marked *Resolved* instead of being marked read; reading an alert never resolves it. Resolved alerts no longer count as unread.
  - Reminders are unchanged: a read alert whose cause is still open shows as unread again at the next check (every 15 minutes). The new setting `Notifications:RemindAfterHours` can space this out (default 0 = every check).
  - The notifications page uses the same cards and adds a *Critical* tab, importance and open/resolved filters and search. The *Payments* tab is unchanged.
- **Configuration navigation.**
  - Administration → *Configuration* opens as a tree in the side menu: search, an Overview and six collapsible categories.
  - The Overview shows one card per category, and each category has its own page with its lists.
  - The three former *Administration → System* pages (Review policies, Jira instances, Settings) are now under *Configuration → System*.
  - List pages and the System pages have full breadcrumbs.
  - All earlier addresses still work.

## Database and deployment

- **Two additive migrations**:
  - `ClientLogo`: three nullable columns on `clients.Client` (`LogoPath`, `LogoContentType`, `LogoVersion`).
  - `NotificationResolution`: one nullable column `notify.Notification.ResolvedAt`.
- **Upgrading:** the DBA runs the included `database/01-schema.sql` (idempotent) before the new application files are deployed. The application refuses to start on the old schema. No data is changed.
  - Existing notifications start as open. The first notification check marks those whose cause is already gone as resolved.
- **Logo files** are stored with the attachments, in a `logos` folder under `Attachments:Path`, so the existing daily file-system backup covers them. No new folder permissions are needed.
- **New optional settings** (defaults in brackets; see `docs/OPERATIONS.md`): `ClientLogos:MaxFileKB` (2048), `ClientLogos:MaxPixels` (5000), `Notifications:RemindAfterHours` (0).
- Follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

## API (additions only; existing calls unchanged)

- `GET /api/v1/clients/logo-rules`, `GET /api/v1/clients/logos`, `GET|PUT|DELETE /api/v1/clients/{id}/logo`; `logoUrl` on client list rows, the client, its parent and sub-clients; `clientId` on Cases builder preview rows.
- `GET /api/v1/notifications`: optional `severity`, `state`, `q`, `sort=severity`; items carry `severity`, `entityType`, `resolvedAt`; the response carries `criticalCount`. New `POST /api/v1/notifications/read` with `{ ids }`.
- Changed meaning: `unread=true` and `/notifications/unread-count` leave resolved alerts out.

## Known limitations

- Drop-down lists (`<select>`) cannot show pictures; client pickers show alias and name only (the Cases builder's client filter shows logos).
- CSV files and the 12 other Report library reports carry no logos. WebP logos are not embedded in PDF or Excel.
- Escalating unresolved alerts to a manager is not implemented (no business rule defines it); the recommended design is in `docs/NOTIFICATIONS-A72.md`.
- The notification pop-up shows up to 50 notices; older ones are on the notifications page.

## Validation

- Release script `build/Build-Release.ps1`: front-end build, `dotnet test` (Release) **267 passed, 0 failed**, publish, `release/TioHub-2.39.0.zip`. Built from uncommitted changes on top of `a09cc3f` (`BUILD-INFO.txt` says so).
- Before packaging: Vitest **33/33**; typecheck and production build clean; Playwright on the source build **118/118** (new: `client-logos.spec.ts` 4, `notifications-redesign.spec.ts` 7).
- Local UAT of the package (throwaway LocalDB databases, dropped afterwards; Development sign-in, fictional data; no shared or UAT database was used):
  - **Schema script, empty database:** `database/01-schema.sql` applied twice without errors; 27 migrations, last `20261028130133_NotificationResolution`; the three logo columns and `ResolvedAt` exist.
  - **Upgrade with data:** a database created with the 2.38.0 script and filled by the 2.38.0 package (3 clients, 6 cases, 37 notifications); the 2.39.0 script applied twice without errors; every row kept, new columns empty.
  - **Package on the upgraded database** with `Database:ApplyMigrationsOnStartup=false`: the readiness gate accepted the schema, the API answered ready, no errors in the log.
  - **Acceptance suite against the running package** (`tests/e2e/playwright.uat.config.ts`): **117 of 118 passed** (7.4 min). The one failure (*a project holds its contracts*) was a timing race in the test — it checked the *Project* field before the click on *+ Contract* had opened the form (2 of 3 repeats passed). The test now waits for the contract form; afterwards it passed 5 of 5 against the package. No product change was needed.
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, a screen-reader session, and the actual UAT environment and its database.
