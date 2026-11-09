# TIO Operations Hub 2.35.1

Production package release, 27 October 2026. This is a fix release for 2.35.0 (VtWebGuiFramework 4.0.0-rc.5).

## Fixed

- **"Leave site?" prompt after signing in.**
  - **Problem:** after a successful sign-in, the browser asked whether to leave the page. The form still counted itself as changed at the moment the page moved on.
  - **Fix:** a successful save or sign-in now clears that state immediately. This also covers every other form that moves to a new page right after saving.
- **Filter and Columns buttons on tables.**
  - **Problem:** both panels opened, but they were placed below the visible screen, so the buttons appeared to do nothing.
  - **Fix:** the hub now gives the framework the window size and page-change signals that its pop-ups position themselves against. Both panels open directly under their button. Other framework pop-ups (menus, cards) benefit in the same way.
- **Collapsing the left navigation panel.**
  - **Problem:** collapsed, the panel kept its full 180 px width and covered the left edge of the page.
  - **Fix:** collapsed, it is now a 50 px column of icons and the page starts right after it.
  - **Also fixed:** on screens narrower than 900 px the panel is again a slide-in drawer.
- **Missing background and line colours.**
  - **Problem:** the page canvas, table and panel divider lines, and the dashboard's sticky section bar had no colour. Under the new framework, three grey colour names were not found.
  - **Fix:** the colours are restored. The sticky section bar is solid again, with a light shadow, so it no longer blends into the boxes scrolling beneath it.

## Changed

- **Colourful KPI boxes** on the Operations Command Center and the Reporting Center. Each box carries a framework accent colour: a tinted ground, a coloured band on its leading edge and a filled icon tile. The colours used are primary, attention, calming green, attention-high, signal error and structure silver. Boxes flagged critical or warning take the signal colours.

## Database and deployment

There are no database schema changes, and no migration is needed when upgrading from 2.33.x, 2.34.0 or 2.35.0. Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

The browser support and known limitations of 2.35.0 still apply (see `RELEASE-NOTES-2.35.0.md`).

## Validation

- TypeScript and production build: passed.
- Playwright end-to-end suite: 72/72 passed.
- .NET test suite: the release script reruns it, and `BUILD-INFO.txt` records the source commit.
- The sign-in prompt fix was verified by code path and the end-to-end suite. The test instance uses development sign-in, so it was not exercised with a password sign-in.
