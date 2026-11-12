# TIO Operations Hub 2.52.0

Prepared 5 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.51.4? Read the earlier notes as well.

## A Jira space can have several contracts, and the ticket's date decides (A93)

- **One contract per ticket, by date.** A Jira space can be linked to several contracts, such as yearly renewals. Each ticket belongs to the contract valid on the day it was created in Jira, whether it is open or closed. The day is read in the contract's support time zone.
- **Not measurable.** A ticket no linked contract covers has no contract and shows Not measurable, with no deadlines, breaches or penalties.
- **Renewals don't move old tickets.** Linking a new contract only affects tickets created in its dates.
- **No overlaps.** Contracts of one space cannot share a day. A contract with no end date runs on, so give it an end date before linking its renewal. A linked contract cannot be edited into another's dates or lose its start date.
- **The contract can't be chosen by hand** on a ticket from a space with linked contracts. **Change contract** is gone there, and existing hand choices are replaced. Spaces with no linked contract work as before.
- **Ended and terminated contracts still cover** the tickets of their dates. Drafts and contracts with no start date cannot be linked.

Under **Clients › Jira**, use **Change** on a space to choose its contracts.

**SLA results and penalty figures can change when the application next starts,** because existing tickets are matched to contracts once, at start-up:

- Closed tickets now join a contract that covers them. Before, they never did.
- Tickets that had a contract not covering their date lose it, and any penalty from it.
- Tickets created before their contract started change from Not applicable to Not measurable.

Review any assessments you have already confirmed.

## Upgrade

1. Back up the database.
2. Review and apply `database/01-schema.sql`. `JiraSpaceContracts` adds `jira.ClientJiraSpaceContract` and `work.Case.SlaNoCoveringContract`, moves each space's contract into the new table and **removes `jira.ClientJiraSpace.ContractId`**. Try it on a restored copy, started with `Jira__Enabled=false`.
3. Deploy the application.

Going back to 2.51.4: restore the database backup.
