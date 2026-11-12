# TIO Operations Hub 2.57.0

Prepared 6 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.56.0? Read the earlier notes as well: 2.56.0, 2.54.1 and 2.52.0 have database changes.

## Second usability review (A105)

All 18 findings of the review were applied. Permissions, data scope and data are unchanged.

### Defects

- **Escalations.** With the default Active filter and no active escalation, the list says "No active escalations" and offers View all.
- **Empty lists.** A list with nothing in it says "0 records" and has no page controls. It used to say "Records: 1 OF 0".
- **Component owner.** A component without an owner says "Not assigned", as Data quality does, and explains that the environment owner coordinates it until one is assigned. An installation says its owner is inherited from the environment.

### Pages

- **Commitments and My dashboard.** Long descriptions show a short title and a two-line preview. Expand the row or open the record for the full text.
- **Contracts.** A contract opens with its term, renewal, SLA targets and payments in one row, then links to each section. Long coverage and obligations text shows a few lines, with Show more.
- **Products.** Section links: Overview, Versions, Microservices, Installations, Modules, Features and Documents. Technology and developers are under the overview.
- **Action list.** The 14 categories are in four groups with counts. Reason, due date and next action come first in the table.
- **Users.** Name, role, sign-in state, scope and last sign-in come first. The account name is under the name and in the expanded row. Account actions are in the row menu.
- **Settings.** Readable names in groups, formatted dates and expandable descriptions. The stored key is still shown.
- **Jira Connections.** An overview at the top: connection, client spaces, mappings, then health and errors, each with links.
- **Jira monitoring.** It starts with the next action, failed records, pending conflicts and the last success. The run table fits the screen; expand a run for its counts.
- **Change history.** It opens on changes made by people. Background work, such as Jira synchronization, is one choice away. Search by person and by date. More than two changes open on request.
- **Attachments.** A record with no files shows one line and one Upload button.
- **Reporting.** The builder is a guided flow: Filters, Columns, Sort and group, then Preview. One step is open at a time. On narrow screens a Show preview button stays by the controls.
- **Administration menu.** One configuration category is open at a time, and the menu says where you are.
- **Words and dates.** SLA states read "First response" and "Resolution" instead of "R" and "X". Review policies and change history say Ticket and Server. Dates in change history and settings are in your time zone.
- **Delete.** On product, microservice, role and user pages it is under More or the row menu, as on the other pages. Confirmations are unchanged.
- **New environment.** The Region field says "Select a client first" until a client is chosen.

## For integrators

`GET /api/v1/admin/audit` takes two optional parameters: `actor=people|system` and `user=<part of an account name>`. Without them it returns what it did before.

## Not yet validated

No user has tried these changes yet. Run [USABILITY-VALIDATION-PLAN.md](USABILITY-VALIDATION-PLAN.md) on a restored copy of the live data before a wider rollout.

## Upgrade

1. From 2.56.0: no database change. Deploy the application.
2. From an earlier release: run `database\01-schema.sql` first, then deploy the application.
