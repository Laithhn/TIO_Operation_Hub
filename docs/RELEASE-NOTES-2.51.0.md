# TIO Operations Hub 2.51.0

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.50.2? Read the earlier notes as well.

## Jira synchronization is on by default (A88)

`Jira:Enabled` is true in the shipped settings, so upgrading no longer switches it off. Nothing synchronizes until a client's integration is enabled. It stays off in the Development and Testing environments.

**Start any restored copy or test server with `Jira__Enabled=false`,** or it can synchronize against the real Jira site. To stop synchronization on a server, set the same value and restart.

## Cases table columns

The default columns are now: Client / scope, Work, Assignee, Reporter, Priority, Status, Resolution, Created, Updated, Due date, Jira and Contractual SLA.

**Columns** adds or removes any column, including Ref, Title, Type, Team, Next action / review, Flags, Jira assignee, Jira priority and Jira issue type. The choice is remembered in this browser, and **Reset** returns to the default. The new table setting is used by the Cases page only.

- **Work** shows the case reference and title together. Its link opens the case.
- **Assignee** is the case owner; a Jira assignee who is not mapped shows as "Not mapped".
- **Reporter** and **Resolution** come from Jira. A case not from Jira shows no reporter, and Resolved or Unresolved.
- **Status** stays read-only in the list. Changing it stays on the case, and a synchronized case follows Jira.

## Creating a client contact from an unmapped Jira user (A89)

Only the client is needed. It is preselected from the client whose Jira spaces the person appears in most. The name falls back to Jira's, and email and phone are optional. The ordinary contact form keeps its rule, so editing such a contact there asks for an email or phone.

## Upgrade

No database change compared with 2.50.2. From an earlier version, apply `database/01-schema.sql`.
