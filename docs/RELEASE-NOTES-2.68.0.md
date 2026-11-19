# TIO Operations Hub 2.68.0

Prepared 19 November 2026. **No database change in this release:** there is no new migration, and `database/01-schema.sql` is the same as in 2.67.0 (running it again is harmless). If 2.67.0 has not been deployed yet, run the schema script first, because 2.67.0 changed the database. Then deploy the application files as usual.

- **Clearer icons** (owner request). In the Administration menu, **Users** now shows a people icon. It used to show two overlapping squares, a "group objects" shape from the icon set. **Roles** has its own ID-card icon instead of sharing the Users icon. The people icon is also used wherever the old one stood for people: the *Unassigned critical / high* card on the Operational dashboard, *Uploaders* in attachments, and the Jira *Missing user mappings* card. **Reassignment queue**, in the Teams menu, now shows a single person, so it no longer looks like *Teams & coverage* just above it.

**Rights, configuration and seed data.** None added or changed. No new setting, configuration list or API endpoint.
