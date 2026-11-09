# TIO Operations Hub 2.54.0

Prepared 5 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. This release has no database change of its own. Upgrading from before 2.52.0? Read the earlier notes as well: 2.52.0 has a database script.

## Ticket priority follows Jira (A96)

Tickets imported before now could all show Normal, because Jira could set the priority only when a ticket was created. Now the priority always follows Jira and cannot be changed in the hub.

**SLA results, deadlines and penalties can change when the application next starts:** existing tickets take the priority already read from Jira, and each priority has its own SLA target. On a restored copy of real data this moved 2 tickets to Critical, 21 to High and 3 to Low. Review any assessments you have already confirmed.

A Jira priority with no mapping and no matching word leaves the ticket as it is until you map it.

## Tables: select several rows (A97)

Tick rows, or the box in the heading for all rows shown, to **Export selected** or **Delete selected**. Delete appears where a row can be deleted, with the same rights and rules as deleting one record. Related records are listed first. If one is refused, the rest go ahead and it says why.

## Other changes

- **Ticket timeline:** grouped by day, with comments as cards showing their author, and changes as short lines (A97).
- **My dashboard:** only your own tickets, commitments and results, first under Dashboard (A98).
- **Executive overview:** opens with At a glance, compared with the previous period, and its sections can be folded away (A98).
- **Team KPI report:** under Reporting Center: response and resolution times, SLA breaches, replies written, reopened and overdue tickets for each person (A98).
- **What's new** in the footer lists recent versions (A98).

## Corrected

**"Not mapped" on tickets** appeared whenever a ticket had no hub owner, even when its Jira assignee was mapped, because client contacts and closed tickets have no hub owner. It now shows the real mapping: Client contact, the person's name, or Not mapped only when they are not in Jira users (A99). The Team KPI report credits the mapped person with their closed tickets.

**Deleting a ticket in 2.53.0** skipped the list of related records and could be refused. This is corrected. If you have not deployed 2.53.0, deploy this release instead.

## Upgrade

Deploy the application. Apply `database/01-schema.sql` if you are coming from before 2.52.0.
