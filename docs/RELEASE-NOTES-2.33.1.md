# TIO Operations Hub 2.33.1

Production package release, 27 October 2026.

## Included changes

- The colour palette returns to the navy theme (#0c1b37). The palette change that shipped in the 2.33.0 package was rolled back at the owner's request.
- Dashboard, Products, Cases and Commitments show their section sidebar again. Reporting Center and Data quality have navigation entries again.
- Table filter and export controls sit above the table again instead of inside the table header.
- Administration > Rights shows the whole permission matrix on one page.

## Database and deployment

This update adds no database schema changes. No migration is required when upgrading from 2.33.0. Production startup migrations and development data remain disabled; follow the standard backup and rollback procedure in `docs/OPERATIONS.md`.

## Validation

The release script runs the full .NET test suite, builds the production front end, and publishes the Windows x64 API package. `BUILD-INFO.txt` records the source commit and whether the working tree contains uncommitted changes. The Playwright end-to-end suite passed 68/68 against these changes.
