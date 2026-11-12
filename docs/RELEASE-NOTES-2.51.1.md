# TIO Operations Hub 2.51.1

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.51.0? Read the earlier notes as well.

## SLA results of Jira cases are corrected (A90)

A restored copy of real data showed every contract-linked case breached. Two causes are fixed:

- **Resolution time.** A case closed from Jira recorded the time of the import as its resolution, so an old issue always looked late. It now uses Jira's resolution date, or the issue's last update when Jira has none. The upgrade corrects existing cases from their last imported status change, and later syncs refine it.
- **Work opened before the contract.** A case opened before the contract's start date is not measured against that contract. It shows Not applicable with a note, and the contract stays linked.

**SLA results and penalty figures will change when the application next starts.** Review any assessments you have already confirmed. If you want older cases measured after all, correct the contract's start date and link the contract again.

## Smaller changes

- **SLA pause (BR-02):** while a ticket assigned to a client contact moves to an unmapped person or to nobody, the SLA stays paused. It resumes when the ticket reaches the team, so an issue left unassigned stays paused.
- **Jira priorities:** a name containing one case priority as a word now matches by itself, such as `P3 - Normal`. Issue types still need mapping.
- **Contacts:** editing a contact that has neither email nor phone no longer asks for one.
- **API document:** `docs/openapi-v1.json` is regenerated.

## Upgrade

1. Back up the database.
2. Review and apply `database/01-schema.sql`. `JiraResolutionTime` adds `jira.JiraCaseMapping.JiraResolvedAt` and `work.Case.SlaContractStart`, **changes existing resolution and closing times of Jira cases** and fills the contract start date. Try it on a restored copy, started with `Jira__Enabled=false`.
3. Deploy the application.

Going back to 2.51.0: restore the database backup, because resolution times have changed.
