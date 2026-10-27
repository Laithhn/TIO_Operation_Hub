# TIO Operations Hub 2.31.0

Production package release, 26 October 2026.

## Included changes

- Tables now provide per-column filters in the header area and sortable column headers throughout the shared table UI. Existing server-side sort and filter behavior is preserved where the API supports it; other columns sort the currently loaded page.

## Database and deployment

This release contains no database schema changes. No database migration or production database operation is required for the table UI update. Deploy the application package using the standard backup and rollback procedure in `docs/OPERATIONS.md`.

## Validation

- Frontend production build passed.
- .NET Release test suite passed: 245 passed, 0 failed.
- Playwright full run: 62 passed and 5 failed. Three failures were caused by ambiguous labels on the new column filters; after correcting those labels, all three affected journeys passed in a focused rerun. Two organization-structure journeys remain failing: initial client save reports a missing/expired security token, and project-context relationships render one extra row. These failures are in existing organization workflows and are not caused by the table filter change, but need resolution before those workflows are considered release-validated.
- Release build emits existing analyzer warnings in `DataQualityEngine.cs` and `Cascade.cs`.

The package is built from the current working tree. `BUILD-INFO.txt` records the source commit and notes that the working tree is dirty; review the included source changes before production deployment.
