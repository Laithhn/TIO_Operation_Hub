# TIO Operations Hub 2.66.0

Prepared 16 November 2026. **No database change in this release:** there is no new migration, and `database/01-schema.sql` is the same as in 2.65.0 (running it again is harmless). Deploy the application files as usual. It adds searchable dropdowns (decision A118), editing of commitments (A117) and an upgrade-script fix on top of 2.65.0.

- **Every dropdown can be searched** (A118). Click a dropdown, or focus it and start typing, and a filter box opens above the list: only the choices that contain every word typed are shown, in any order, ignoring capitals and accents (for long lists with headings, such as rights, the heading counts too). Arrow keys, Page Up/Down and Enter choose; Escape closes the list without changing anything, also inside a dialog. This applies to every dropdown in the application: forms, dialogs, table filters, page-size selectors and the administration pages.
- **Commitments can be edited** (A117). An open commitment shows **Edit** to those who may maintain it. The dialog changes the title, description, type, external party (External commitments), owner (only with *Commitments: Coordinate*; others see it read-only), next review and project link. Scope, client and direction stay fixed, and the deadline still moves only through *Revise deadline*, so its history is kept. Completed or cancelled commitments must be reopened first.
- **Upgrade script.** `deploy/Upgrade-TioHub.ps1` no longer reports a false health-check failure when `-Url` ends with a slash; on a real failure it now says what the health check answered.

**Rights, configuration and seed data.** None added or changed. Editing commitments uses the existing *Commitments: Maintain* right. No new setting, configuration list or API endpoint.
