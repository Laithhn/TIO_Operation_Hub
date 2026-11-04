# TIO Operations Hub 2.50.1

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. This release also contains everything in [RELEASE-NOTES-2.50.0.md](RELEASE-NOTES-2.50.0.md); read it when upgrading from an earlier version.

## Fixed: notifications stopped by a long commitment description

A commitment description longer than 500 characters made the whole notification scan fail, so overdue, due-soon, renewal and payment alerts from that scan were not created or updated. The application log shows this as "Notification scan failed".

Long notification text is now shortened to fit. The commitment itself keeps its full description.

**People may receive a batch of alerts** at the first scan after installing, for everything held back while the scan was failing.

## Upgrade

No database change compared with 2.50.0. From an earlier version, apply `database/01-schema.sql` as described in the 2.50.0 notes.
