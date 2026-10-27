# TIO Operations Hub 2.36.0

Production package release, 27 October 2026. Fixes the 13 findings of the GUI bug-fix brief of 27 Oct 2026 (GUI-01 … GUI-13). Details,
root causes and measurements: `docs/GUI-FIXES-2026-10-27.md`; decision A69 in `docs/DECISIONS.md`.

## Fixed

- **Reporting Center opened the SSRS Report Manager** (GUI-01).
  - **Problem:** on a server that also runs SQL Server Reporting Services, opening, refreshing or bookmarking `/reports` showed "Error - Report Manager" (`/Reports/Pages/Folder.aspx`). SSRS reserves the `/Reports/` address for itself at the Windows level, ahead of IIS.
  - **Fix:** the Reporting Center is now at **`/reporting-center`**. Old `/reports` links (bookmarks, earlier notifications) are redirected inside the hub. Users without the Export permission see the hub's own message with a link back to the dashboard.
- **Tables for keyboard and screen-reader users** (GUI-05). Tables are real HTML tables again: rows, column headers and cells are announced; each sortable column header is a button that works with Enter or Space, shows and announces the sort direction, and keeps the focus after the list reloads.
- **Tables on phones** (GUI-06, GUI-07).
  - The record name, its status and its row actions stay in the row; the other columns open under the record with the arrow button at the start of the row.
  - The table toolbar wraps instead of cutting off **Columns** and **Export CSV**.
  - When a table is wider than its panel, a shadow at the edge shows that it scrolls sideways.
- **Row actions far off-screen on Roles** (GUI-11). A role's rights show as a count ("21 rights") that opens the full list. On every table, the Edit / Delete column stays at the right edge while the table scrolls.
- **Filter panel** (GUI-03, GUI-04, GUI-09).
  - The value field keeps a usable width on narrow screens (it was 14–40 px wide).
  - **Clear** and **Close** always stay visible, above the status bar.
  - Escape closes the panel and returns to the Filter button.
  - The **Filter (n)** count now counts only filters that actually filter: choosing an operator without a value shows "Not applied until a value is entered." and is not counted.
- **Column chooser** (GUI-08). The search field is labelled **Search columns**; each column is a labelled tick box; **Show all** brings every column back.
- **Navigation** (GUI-10).
  - **Phones and tablets (up to 900 px):** the menu button shows the current section and opens a panel with **every** section, each with its pages. Escape or ✕ closes it.
  - **Wider screens:** section names that do not fit in the header move into **More**. Nothing is cut off, and the current section always stays visible.
- **Notes on phones** (GUI-02). One pane at a time — notebooks, pages, page — with back buttons. The page no longer extends past the screen.
- **Small click targets** (GUI-12). The sidebar collapse button, pager buttons, row actions and the tick boxes on the Rights page are larger, and larger again on touch screens.

## Changed

- **Faster first load** (GUI-13). Each page now loads when it is first opened. The initial JavaScript drops from 1,415 kB to 880 kB (gzip 433 kB → 292 kB). The map and its country shapes still load only on the map page.
- Tables keep the framework look (header labels, sort arrows, row height) but are no longer the framework DataTable. This reverses the table part of 2.35.0; the 2.35.0 limitations "not announced as a table" and "sorting by mouse only" are resolved.

## Database and deployment

There are no database schema changes, and no migration is needed when upgrading from 2.33.x, 2.34.0 or 2.35.x. Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

- Notifications created by report schedules now link to `/reporting-center`; notifications created before the upgrade still work.
- If the server also hosts SSRS, see the new troubleshooting row in `DEPLOYMENT-GUIDE.md`. Do not remove the SSRS address reservation.
- The browser support of 2.35.0 still applies (Edge or Chrome 111+, Firefox 151+, Safari 18+).

## Known limitations

- The fix for the Report Manager page was verified on a development machine that has the SSRS reservation, not on an IIS server sharing its port with SSRS.
- No screen-reader (NVDA, JAWS, Narrator) or real touch-device test was done; keyboard behaviour, names and target sizes are covered by automated tests.
- At 320 px the client list is about 22 px wider than the screen and scrolls sideways.
- Load times on slow networks were not measured; the bundle size is checked by the tests.
- VtWebGuiFramework 4.0.0-rc.5 is still a release candidate (as in 2.35.0).

## Validation

- TypeScript and production build: passed.
- Unit tests (Vitest): 9/9 passed.
- Playwright end-to-end suite: 90/90 passed (72 existing and 18 new GUI regression tests).
- .NET test suite: 246/246 passed; the release script reruns it, and `BUILD-INFO.txt` records the source commit.
