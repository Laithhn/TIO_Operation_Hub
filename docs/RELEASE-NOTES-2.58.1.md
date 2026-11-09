# TIO Operations Hub 2.58.1

Prepared 9 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Coming from 2.57.0 or earlier? Read [RELEASE-NOTES-2.58.0.md](RELEASE-NOTES-2.58.0.md) as well: it describes the ticket page redesign.

## Jira details above the tabs (A106, owner request)

On a ticket synchronized from Jira, **Jira details (imported)** is now a main section of the ticket, directly under the overview (latest activity, next action, owner, SLA and deadline) and above the tabs. In 2.58.0 it was the last section of the details panel on the right.

- It starts with the Jira connection, its state and the last and next sync times, then the imported values in up to three columns, then the Jira description.
- **Sync with Jira** is in the section header, as before.
- The section folds, and the browser remembers it. On a laptop screen, fold it to bring the tabs up.
- The details panel keeps Management summary, Age and waiting, Contractual SLA, SLA measurements and Indicative penalties.

Tickets that are not synchronized from Jira look as in 2.58.0. No value, calculation, permission or Jira behaviour changed.

## Rights, configuration and seed data

None needed: the change moves an existing section and adds no page, action, list or setting.

## For integrators

No API change.

## Upgrade

1. From 2.56.0, 2.57.0 or 2.58.0: no database change. Deploy the application.
2. From an earlier release: run `database\01-schema.sql` first, then deploy the application.
