# TIO Operations Hub 2.40.1

Production package release, 29 October 2026. This is a fix release for 2.40.0 with the UX audit remediation UX-001 to UX-005
(details in `docs/UX-AUDIT-REMEDIATION-2026-10-27.md`). Every finding was reproduced on 2.40.0 before it was changed.

## Fixed

- **Section name cut on phones (UX-001).**
  - **Problem:** at 360 and 390 px the menu button's section label was cut ("Commitm…", "Administr…").
  - **Fix:** on phones the menu button shows its icon only (its accessible name still says the current section), and the section is shown in full above the page title.
- **Record identifier scrolled out of view in wide tables (UX-002).**
  - **Problem:** on tablets and desktops, a table wider than its panel scrolled the identifier column away, so a row no longer said which record it was.
  - **Fix:** the identifier column stays pinned at the left edge while the table scrolls sideways (wider than 600 px). Phones keep the row details layout. Filters, sorting, column chooser, paging and export are unchanged.
- **Start-up script over its size budget (UX-003).**
  - **Problem:** the main script had grown to 907 kB, over the 900 kB limit; the budget test measured in the wrong unit and let it pass.
  - **Fix:** the notifications pop-up and the sign-in screens load on demand, so the main script is now 882 kB. A page part that cannot be downloaded or fails to render now shows a message with *Reload* (and *Try again*) inside the shell instead of a blank page.
- **Small and unnamed controls (UX-004).** The tab bar's scroll arrows have names, a hidden file input on the client form is no longer a Tab stop, and record links in tables have larger click areas.
- **Access denials and errors without a next step (UX-005).** An access denial says where access is granted; error states offer *Try again* and explain the trace ID.

## Database and deployment

- **No database change** (no new migration). The `database/01-schema.sql` script is unchanged since 2.39.0; running it again is harmless.
- **No new settings.**
- Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

The deployment notes and known limitations of 2.40.0 still apply (see `RELEASE-NOTES-2.40.0.md`).

## Validation

- Before packaging (source, isolated `(localdb)\TioHubQALocalDB`): typecheck and production build clean; Vitest **42/42**; Playwright **141/141** (16 new tests in `ux-remediation.spec.ts`); .NET **268/268**, three consecutive full runs after the order-dependent `A73_ClientMap` test was fixed.
- The release script reruns the .NET suite, and `BUILD-INFO.txt` records the source commit. Results of the package build are in `docs/TEST-RESULTS.md`.
- Not covered: IIS installation and `Upgrade-TioHub.ps1` on a real server, Windows (Negotiate) and forms sign-in against the package, a touch-device test, a screen-reader session, and the actual UAT environment and its database.
