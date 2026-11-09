# TIO Operations Hub 2.35.0

Production package release, 27 October 2026.

## Included changes

- **VtWebGuiFramework 4.0.0-rc.5.** The frontend moves from VtWebGuiFramework 3.6.1 to the framework's 4.0 release candidate (owner decision of 27 Oct 2026). The visual changes are:
  - a 50 px header;
  - a glass "lens" behind the active top-menu item and a glass "drop" beside the active sidebar entry (the framework's own components);
  - rounded framework controls.

  The colours stay the framework's: primary `#001e46`.
- **Tables follow the framework DataTable standard.** All tables now use the framework DataTable:
  - **Toolbar:** each table has a toolbar above it with the row search, the row count, a **Filter** card holding all column filters, a **Columns** card to show or hide columns, and **Export CSV**.
  - **Filters:** the column filters keep their operators and suggestions; they move out of the column headers into the Filter card.
  - **Sorting:** clicking a column header sorts it and shows the framework's sort arrow. Lists sorted by the server keep their server-side sort.
  - **Rows:** clicking a row still opens its record.
  - **Empty tables:** an empty table still shows its column headers above the "no records" message.
- **Header fix.** The top-menu items are centred vertically in the header.
- **Technology.** React 19.3 (was 18.3); React Router 8.3 (was `react-router-dom` 7); Redux Toolkit and react-redux for the framework's own store.

No functionality, route, permission, API or database behaviour changed.

## Database and deployment

This release adds no database schema changes, and no migration is needed when upgrading from 2.33.x or 2.34.0. Production startup migrations and development data remain disabled.

Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`.

The package includes a new static file, `wwwroot/vt-i18n/en.xml`: the framework's English language table, which the browser loads at startup.

Users may need a hard refresh (Ctrl+F5) the first time.

## Browser support

VtWebGuiFramework 4 needs **Edge or Chrome 111+, Firefox 151+ or Safari 18+**. Older browsers show dark areas with dark lettering.

## Known limitations

- VtWebGuiFramework 4.0.0-rc.5 is a release candidate. Re-vendor the final 4.0.0 when it ships.
- The framework asks for VtWebGuiIcons 4.0, but 2.4.0 is bundled because 4.0 was not supplied. Every icon the framework uses exists in 2.4.0.
- The framework DataTable is a virtualized grid of div elements:
  - screen readers do not announce it as a table;
  - column sorting is by mouse or touch only.

  The owner accepted this when choosing the framework table.
- The contract form's editable SLA and payment-term grids remain plain form tables.
- `docs/FRONTEND-*.md` still describe the 3.6.1 adoption. `src/web/vendor/VENDOR.md` describes the 4.0.0-rc.5 integration.

## Validation

- TypeScript and production build: passed.
- Playwright end-to-end suite: 72/72 passed, run with the HTML report.
- .NET test suite: the release script reruns it, and `BUILD-INFO.txt` records the source commit.
