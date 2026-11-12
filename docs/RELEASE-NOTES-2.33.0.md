# TIO Operations Hub 2.33.0

Production package release, 26 October 2026.

## Included changes

- Administration can delete a user account when no retained business or audit history refers to it. Deletion requires a reason and cannot target the signed-in administrator; referenced accounts can be deactivated to preserve history.
- Case, commitment, escalation, contract renewal and payment alerts recur until their source condition is resolved. The background scan defaults to every 15 minutes and can be changed with `Notifications__ScanMinutes`.
- The Executive overview shows upcoming commitments due within 14 days, highlighted in red and bold. Its link opens the matching 14-day commitment list.

## Database and deployment

These updates add no database schema changes. No migration is required for these changes when upgrading from 2.32.0. Production startup migrations and development data remain disabled; follow the standard backup and rollback procedure in `docs/OPERATIONS.md`.

## Validation

The release script runs the full .NET test suite, builds the production front end, and publishes the Windows x64 API package. `BUILD-INFO.txt` records the source commit and whether the working tree contains uncommitted changes.
