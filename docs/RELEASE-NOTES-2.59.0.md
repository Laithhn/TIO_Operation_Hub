# TIO Operations Hub 2.59.0

Prepared 10 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **This release has a database change:** run `database\01-schema.sql` before deploying the application. Coming from 2.57.0 or earlier? Read [RELEASE-NOTES-2.58.0.md](RELEASE-NOTES-2.58.0.md) and [RELEASE-NOTES-2.58.1.md](RELEASE-NOTES-2.58.1.md) as well.

## Audience dashboards and project status reports (A108)

Four dashboards sit under **Dashboard** in the side menu, beside the Operations Command Center and My dashboard. Each answers one question for one audience. The full rules are in DECISIONS.md, A108.

- **Operational** (engineers and leads: what must I or my team act on today?). Show *My work*, *My team* or *Everything*, with team, client and product filters, as of now and refreshed every minute. A work queue lists SLA clocks at risk, breached or ending within 24 hours and items due or overdue, earliest first. It also shows production environments, workload by owner and priority, the next 7 days and a personal hygiene list.
- **SLA & Contracts** (contract owners). Compliance per period, client, contract, type and priority, with the previous period for comparison. It also shows why tickets are not measurable, a 12-month trend, compliance per contract, a contract term timeline, the renewal watchlist, and overdue and upcoming payments per currency. Currencies are never added together.
- **Management** (TIO Manager). This quarter, month or year to date against the same span before: projects, backlog, closure time, SLA compliance, commitments on time, escalations and overdue payments. It also shows 12 months of opened and closed tickets, load per team member, the project portfolio and a **Data trust** panel.
- **Project** (project managers). A project's **recorded status** (On track, At risk or Off track, with a reason and an optional next-review date) is kept as history. Record it with *Update status*. Seven signals worked out from the records (delivery, SLA, escalations, commitments, commercial, environments, status review) are shown beside it. The page says when they disagree with the recorded status. It never changes the status itself. Missing data reads *Unknown*, never *On track*.

The ticket list takes a project filter (`/cases?projectId=`), so a project's ticket count opens the same list.

## Rights and settings

- Four new rights in the Dashboard module: `OperationalDashboard:View`, `SlaContractsDashboard:View`, `ManagementDashboard:View`, `ProjectDashboard:View`. Each also needs `Dashboard:View`.
- The upgrade grants the four to every role that already holds `Dashboard:View`, and changes no other role. **To confirm:** whether the Operational dashboard should need only `Cases:View`, as My dashboard does.
- Recording a project status needs the existing `Projects:Maintain` right for the client.
- Three new settings (Administration → Settings): `Dashboard.SlaAtRiskPercent` (25), `Dashboard.SlaComplianceTargetPercent` (90) and `Dashboard.ProjectStatusMaxAgeDays` (14).

## For integrators

New endpoints: `GET /dashboard/operational`, `/dashboard/sla-contracts`, `/dashboard/management`, `/dashboard/projects`, `/dashboard/projects/{id}`, and `GET`/`POST /projects/{id}/status-reports`. `GET /cases` takes `projectId`. See API.md and `openapi-v1.json`.

## Not yet validated

No user has tried the dashboards yet. They have not been run against live data.

## Upgrade

1. Run `database\01-schema.sql` (migration `AudienceDashboards`: one new table, `clients.ProjectStatusReport`, plus the right grants above). No existing row is changed.
2. Deploy the application.
3. Ask project managers to record a status for their running projects. The Management dashboard's Data trust panel counts the projects without one.
