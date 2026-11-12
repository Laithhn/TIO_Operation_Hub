# TIO Operations Hub 2.50.0

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **Not yet run against a real Jira site.** Upgrading from before 2.49.0? Read [RELEASE-NOTES-2.49.0.md](RELEASE-NOTES-2.49.0.md) and [RELEASE-NOTES-2.49.1.md](RELEASE-NOTES-2.49.1.md) as well.

## New Jira cases take priority and case type from Jira (A86)

- A Jira value with the same name as a case value is used directly.
- Any other value is listed under **Jira priorities and issue types to map** on the client's Jira tab, per client. **Preview import** fills the list too, so you can map before the first import.
- Until a value is mapped, or when Jira gives none, new cases use the client's default: **Priority when Jira has no match** and **Case type when Jira has no match**.
- **New cases only.** After a case is created, Jira changes neither value, and a later mapping does not change existing cases.
- A contract's SLA target now follows the Jira priority. If the contract has no target for that priority, the SLA cannot be measured, so check the targets of contracts linked to Jira spaces.

## Sync with Jira on a case (A86)

**Sync with Jira** in *Jira details* on a case reads only that case's issue, at once, with its comments and activity. It needs the right to maintain the case, and works only while Jira is enabled on the server and for the client.

## Failed imports state the reason (A86)

*Jira conflict resolution* now shows why an issue could not be imported, instead of pointing to the log. Text that looks like a credential stays in the log only. The reason can include database wording.

## The case Timeline tab (A86)

The tab no longer needs Case History view and Change history, which it required without saying so. It needs **Case details** and shows the case's events, status changes and reasons. **People who hold the tab and Case details now see this without Change history.** Field history keeps its own rights. Review your roles if that is not what you want.

## Smaller changes

- Permission messages and the sign-in hint say "Ask the System Administrator".
- The Client Map lists countries with flag images. The package gains about 270 small image files from `flag-icons` (MIT), fetched only when a country is shown.

## Upgrade

1. Back up the database and the data-protection keys.
2. Review and apply `database/01-schema.sql`. `JiraValueMapping` only adds the table `jira.JiraValueMapping`.
3. Deploy, then run **Preview import** for each client and map the listed values before relying on new cases' priorities.

Going back to 2.49.1: the new table stays unused. Restoring the backup is not required for this release alone.
