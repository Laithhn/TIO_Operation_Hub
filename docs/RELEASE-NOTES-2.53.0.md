# TIO Operations Hub 2.53.0

Prepared 5 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. This release has no database change of its own. Upgrading from before 2.52.0? Read the earlier notes as well: 2.52.0 has a database script.

## Renew a contract (A94)

**Renew contract** on a contract's page opens a new contract with every detail copied, ready to change. Nothing is saved, and the old contract stays as it is, until you press Save.

- The dates move to the next period: the day after the old end date, for the same length. A contract with no end date leaves them for you to enter.
- Milestone and payment dates move with them. Milestone completion is cleared, and payments return to Pending.
- It starts as Draft. To cover tickets, set it to Active, then add it to the Jira space's contracts under **Clients › Jira**.

## Cases are now Tickets (A95)

Screens, messages, notifications, reports, exports and the rights pages now say **Ticket**. Web addresses, the API, right keys, saved reports and `CS-` references stay the same, so links and integrations keep working. Text already stored, such as old notifications and timeline notes, keeps the old word.

Anything that reads report column headings by name needs updating: **Case** columns in exports are now **Ticket**.

## Upgrade

Deploy the application.
