# TIO Operations Hub 2.36.1

Production package release, 28 October 2026. This is a fix release for 2.36.0, with a redesigned KPI area on the Operations Command Center.

## Fixed

- **Notifications behind the dashboard's section bar.**
  - **Problem:** with the notifications list open on the Operations Command Center, the sticky section bar (Overview, Attention, Cases …) was drawn across the list.
  - **Fix:** the header and everything that opens from it (notifications, **+ New**, **More**) now always lie above the page. The map's own buttons can no longer cover the header either.
- **Collapsed left navigation showed one entry.**
  - **Problem:** after collapsing the left panel to icons, only the first entry was visible; the others were squeezed into a small scrolling strip at the top.
  - **Fix:** collapsed, the panel shows every entry of the section as an icon, from top to bottom.
- **Filter panel jumped to the top-left corner (every table).**
  - **Problem:** after entering a filter, the Filter panel moved to the top-left corner of the window. While the list reloaded, or when nothing matched, the table toolbar disappeared, and with it the button the panel is attached to.
  - **Fix:** a table keeps its toolbar while it reloads and when nothing matches. The panel stays under its button, and the row count shows *Loading…* while the list reloads.

## Changed

- **KPI cards on the Operations Command Center in two tiers.**
  - **Main figures:** one row of five large cards, in this order: Active contracts, Overdue payments, Upcoming commitments, Active escalations, Open cases. Each card shows its icon beside the number, a progress bar where there is one, and two short detail lines.
  - **Supporting figures:** Clients, Targets met, Contractual SLA met and Environment health, in a row of smaller tiles with one detail line; hover a tile for its full details.
  - Colours, warning and critical marks, and the click-through to each list are unchanged. At 1440 px the KPI area takes about 270 px instead of 675 px, so *Needs immediate attention* is visible without scrolling. On phones the cards show two per row, with Active contracts across the full width.
- The Reporting Center's KPI row uses the same compact card style.

## Database and deployment

There are no database schema changes, and no migration is needed when upgrading from 2.33.x, 2.34.0, 2.35.x or 2.36.0. Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

The deployment notes and known limitations of 2.36.0 still apply (see `RELEASE-NOTES-2.36.0.md`), including the Reporting Center address `/reporting-center`.

## Validation

- TypeScript and production build: passed.
- Unit tests (Vitest): 9/9 passed.
- Playwright end-to-end suite: 94/94 passed, including regression tests for the four changes above. The one KPI test assertion corrected after the full run was re-run and passed.
- .NET test suite: the release script reruns it, and `BUILD-INFO.txt` records the source commit.
