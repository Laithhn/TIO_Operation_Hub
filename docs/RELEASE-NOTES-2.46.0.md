# TIO Operations Hub 2.46.0

Prepared 3 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **Not yet run against a real Jira site.**

## Jira Cloud integration (A76, off by default)

One-way, from Jira Cloud to the hub. The hub never writes to Jira.

- **Administration → Jira Connections:** sites, credentials, connection tests, space discovery, sync health.
- **Client → Jira integration tab:** several spaces per client, ownership validation, dry-run preview, sync history.
- **Cases:** imported issues become ordinary cases. The list shows the Jira source, and the case page shows a Jira summary, Jira details and one timeline of Jira and TIO activity with a local-only comment box.
- **Review:** import review, conflict resolution, and user and workflow mappings. Nothing is mapped or decided automatically.
- **Monitoring:** synchronization history, health and errors.

Decisions to read before enabling it are in [JIRA_BUSINESS_LOGIC_MAPPING.md](JIRA_BUSINESS_LOGIC_MAPPING.md). Most importantly, a Jira status cannot close or cancel a case.

## Upgrade

1. Back up the database and the data-protection keys.
2. Apply `database/01-schema.sql`. The `JiraIntegration` migration only adds objects.
3. Deploy. Nothing calls Jira until a connection is created, and no case changes until `Jira__Enabled=true`.

**New permissions:** `AdminIntegrations` and `tab.ClientStructure.jira`. The TIO Manager holds them automatically; other roles hold them only when granted.

**Changed behavior for existing users:** the case Timeline tab is now *Activity & comments*, with filters and a local comment box. Its events are unchanged. The Jira references tab shows a type column and no longer says the hub never synchronizes.

Rollback: [JIRA_SYNC_OPERATIONS_GUIDE.md](JIRA_SYNC_OPERATIONS_GUIDE.md).
