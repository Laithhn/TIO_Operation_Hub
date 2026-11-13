# TIO Operations Hub 2.63.0

Prepared 13 November 2026. **This release has no database change:** deploy the application only. It redesigns the Client dashboard as Client 360 (decision A113) on top of 2.62.0.

- **Client 360.** `/dashboards/client` (menu *Client 360*) shows one client in seven numbered sections: 1.1 Projects, 1.2 Contracts, 1.3 Payments (Paid, Upcoming, Overdue totals per currency), 1.4 SLA, 1.5 Tickets, 1.6 Escalations, 1.7 Commitments, under seven summary tiles that jump to them.
- **Several years at once.** A Years filter takes any set of calendar years (adjacent or not) or All years; the default is this year and the choice is kept in the address (`years=2024,2026`). Each section still states what is open or overdue from other years.
- **Client status.** The recorded status, Update status and Status history stay at the top; the seven signals are behind *Signals behind the status*, and a disagreeing or stale status is still stated.
- **No longer on this page:** the milestone timeline, environments, team and recent activity (still on the client record).
- **API.** `GET /dashboard/clients/{id}` accepts `years` and returns the per-year sections (see `API.md`).

No new right, setting, configuration list or seed data. Owner to confirm: calendar years rather than a fiscal year, and dropping the panels listed above.
