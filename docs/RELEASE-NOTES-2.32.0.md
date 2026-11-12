# TIO Operations Hub 2.32.0

Production package release, 26 October 2026.

## Included changes

- Table column filters offer autocomplete suggestions from values in the loaded rows and apply case-insensitive partial matches as the user types. For example, entering `OM` matches `OMAN`.
- Sortable table headers now show `SORT` before sorting and display `ASC` or `DESC` after selection. Clicking the header changes the sort direction.

## Database and deployment

No database schema changes are included. No database migration or production database operation is required for these UI changes. Deploy using the standard backup and rollback procedure in `docs/OPERATIONS.md`.

## Validation

Frontend production build passed. The .NET Release suite passed 245 tests. Focused Playwright journeys for table filtering, sorting, and the table header passed (2/2). A previous full Playwright run had two remaining failures in organization-structure journeys; see 2.31.0 release notes for details.

The package is built from the current working tree. `BUILD-INFO.txt` records the source commit and working-tree status; review the included changes before production deployment.
