# TIO Operations Hub 2.62.0

Prepared 12 November 2026. **This release has no database change:** deploy the application only. It applies the audit remediation of deployed 2.59.0 (TIO-BUG-001 to 007, decision A112; see `TIO-AUDIT-REMEDIATION.md`) on top of 2.61.0.

- **Configured ticket status everywhere (001, 007).** Search, client and environment overviews and the ticket list show the configured status and type labels.
- **Change history (002).** A foreign key to a row added in the same save records the saved id; 64-bit values are written exactly. Entries written earlier are not rewritten.
- **Tables and phones (003, 004).** Select-all sits before the Details header; the notification badge and action take their own row on phones.
- **Exports (005).** The history explains why details are hidden (access changed, legacy export, other owner, schedule not completed).
- **Tickets report status filter (006).** Offers All open / All / All closed or cancelled and the active configured statuses; saved stage names keep their old meaning.

No new right, setting, configuration list or seed data.
