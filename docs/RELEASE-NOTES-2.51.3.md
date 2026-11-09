# TIO Operations Hub 2.51.3

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. No 2.51.2 package was released, so read [the 2.51.2 notes](RELEASE-NOTES-2.51.2.md) as well: its figures change on upgrade. If you are on 2.51.0, read the 2.51.1 notes too: its database script changes SLA results.

## Commitments recorded after the fact (A91, owner decision)

A completion time can now be earlier than the moment the commitment was recorded, with an optional reason kept in its history. Only a future time is refused. The on-time or late result still comes from the deadline. This replaces the 2.51.2 rule that refused such times.

## Upgrade

Deploy the application. This release has no database change of its own.
