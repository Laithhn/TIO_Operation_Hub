# TIO Operations Hub 2.55.0

Prepared 6 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.54.1? Read the earlier notes as well: 2.54.1 and 2.52.0 have database changes, and 2.54.0 changes priorities and SLA targets.

## Usability review (A102)

The tickets, dashboards and client pages were reworked after an expert review. Permissions, data scope and data are unchanged.

- **Overview.** It starts with the summary and the urgent work, including each item's next action. Critical or high now opens both priorities, with the same number of tickets as the figure.
- **Tickets.**
  - **Search:** one search covers every page and stays when you change pages. It also finds a ticket by its client or Jira key.
  - **Quick views:** My tickets, Overdue, Unassigned and Waiting for customer, each with a count.
  - **Filters:** the main ones are on show and the rest are under Advanced filters. Active filters appear as chips, with Clear all.
  - **Table:** it fits the screen. Expand a row to see the rest, or add columns under Columns.
- **A ticket.** It starts with its latest activity, next action, owner and SLA state, with the timeline straight below. The rest is under Supporting details.
- **My dashboard.** A compact row of figures and one queue of tickets and commitments, each with a next step.
- **Clients.**
  - **Search:** one search covers every page, as on Tickets.
  - **A client:** it opens on its risks and outstanding work. Its pages are grouped into Operational, Technical, Commercial and Records.
- **Delete.** It has moved into a small menu on each row, and under More on a record's page.

## Design (A103)

KPI cards are now square, like the panels and filters. This follows the A68 design (VtWebGuiFramework) and is an assumption you haven't confirmed yet.

## Not yet validated

No user has tried these changes yet. Run [USABILITY-VALIDATION-PLAN.md](USABILITY-VALIDATION-PLAN.md) on a restored copy of the live data before a wider rollout.

## Upgrade

1. From 2.54.1: no database change. Deploy the application.
2. From an earlier release: run `database\01-schema.sql` first, then deploy the application.
