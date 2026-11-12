# TIO Operations Hub 2.58.0

Prepared 6 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.56.0? Read the earlier notes as well: 2.56.0, 2.54.1 and 2.52.0 have database changes.

## Ticket page redesign (A106)

The ticket page takes its layout from Jira's issue view and keeps the VITRONIC frame, colours and square corners. Every field and action of 2.57.0 is still there. Calculations, permissions, workflows, Jira synchronization and data are unchanged.

### Layout

- **Key facts.** Under the title, one band shows the latest activity, next action, owner, and SLA and deadline. A passed review date, or a breached or overdue SLA, marks its cell in red.
- **Details panel.** The collapsed "Supporting details" block is replaced by a panel on the right with six sections: Management summary, Age and waiting, Contractual SLA, SLA measurements, Indicative penalties and Jira details (imported). Each section folds, and the browser remembers which ones you folded. On screens 1181 px and wider the panel stays in view and scrolls on its own. On narrower screens it moves under the tabs.
- **Age and waiting** also shows the current waiting reason and the list of recorded waiting periods. Both were already in the ticket data.
- **Jira details** start with the connection, its state and the last and next sync times (formerly the Jira banner), then the imported values. Sync with Jira is in the section header.

### Tabs

- **Activity** (was Timeline). Comments are cards; changes are short lines with the value before → after. Each item is marked Jira or TIO. The comment box is at the top, and Ctrl+Enter adds the comment. Filters and "Show system activity" are unchanged.
- **Affected records.** Environments, assets and components in one table, with a type filter and search. A ticket without any says so.
- **Jira references.** One card per reference, marked as an imported source or a manual link. The synchronized source issue shows its sync state, Jira status and assignee. Removed references are listed with their removal date.
- **Documented impact.** The recorded impact statement next to the inferred installations, components, clients and firewall rules.
- **Commitments.** A table with a status filter.
- **Field history.** A timeline of who changed which field, from what to what. It can be searched, and older changes load on request (it used to stop at the newest 50).
- **Escalations and Attachments** work as before, inside the new layout.

### Deliberately not taken from the mockups

The header and left navigation stay the VtWebGuiFramework frame (A68). The mockups' lock, watchers, share, status dropdown, agents and comment templates are not features of the hub. Their outage counts and impact types on affected records, and the comments tab, describe data that tickets do not hold.

## For integrators

No API change.

## Not yet validated

No user has tried the new layout yet. The Jira and contractual SLA sections were checked with sample data, because the development data has no synchronized or contract-measured ticket. Look at one such ticket on the live site after deploying.

## Upgrade

1. From 2.56.0 or 2.57.0: no database change. Deploy the application.
2. From an earlier release: run `database\01-schema.sql` first, then deploy the application.
