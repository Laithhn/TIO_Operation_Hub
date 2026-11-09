# TIO Operations Hub 2.54.1

Prepared 5 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.54.0? Read the earlier notes as well: 2.54.0 changes priorities and SLA targets, and 2.52.0 has a database script.

## Engineers start on My dashboard (A100)

Anyone who holds the My dashboard right and can't coordinate clients now lands on **My dashboard**. Managers stay on the executive overview. Engineers can still open the overview under **Dashboard**, and links to it with filters work as before.

## Every page is in the rights (A101)

- **My dashboard has its own right.** It shows on the Rights page under Dashboard, so it can be given or taken away for each role. It also needs ticket access.
- **Who gets it.** The database script gives it to every role that already holds Tickets View, so nobody loses the page. Nothing else changes for any role.
- **New pages.** The release build now fails if a page isn't connected to a right. Each new right still goes only to the TIO Manager until it is given to other roles.

## Upgrade

1. Run `database\01-schema.sql`. It adds the one right and its grants, and changes no tables.
2. Deploy the application.

If the script is skipped, only the TIO Manager can open My dashboard, and everyone else starts on the executive overview as before.
