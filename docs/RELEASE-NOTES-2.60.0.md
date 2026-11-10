# TIO Operations Hub 2.60.0

Prepared 10 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **This release has a database change:** run `database\01-schema.sql` before deploying the application. Coming from before 2.59.0? Read [RELEASE-NOTES-2.59.0.md](RELEASE-NOTES-2.59.0.md) as well. It describes the four audience dashboards.

## The Project dashboard is now the Client dashboard (A109, owner request)

The status is recorded **per client**, not per project. Dashboard → **Client** replaces Dashboard → Project. A saved link to the old Project dashboard opens the Client dashboard.

- **Recorded status.** Choose a client and record On track, At risk or Off track, with a reason and an optional next-review date (*Update status*). Every report is kept as history. The newest one is the client's status.
- **Signals.** The seven rules of 2.59.0 are unchanged: delivery, SLA, escalations, commitments, commercial, environments and status review. They are now worked out across **all the client's projects**: the milestones and payments of all its contracts, all its tickets, its active escalations and open commitments, and all its environments. Each signal opens the client's list behind it. Missing data still reads *Unknown*, never *On track*. The page still says when the signals disagree with the recorded status.
- **Projects.** The page lists the client's projects with their status, manager, service dates and number of contracts. Each one links to its project record.
- **Tickets.** The page counts all the client's tickets, so the number matches the ticket list filtered by client. In 2.59.0 it counted only tickets linked to the project's contracts or environments.

## Management dashboard

- The portfolio lists **clients** instead of projects: Active clients, and any other client with a running project. Each row shows the recorded status, the signals, the number of running projects and the next milestone.
- The first figure is now *Clients in the portfolio*, with their status counts and the number of running projects.
- *Data trust* counts the clients without a status, with a status that needs review, or whose signals disagree with it.

## Other changes (A110, owner requests)

1. **What's new** is readable: dark text, and each version's changes are numbered.
2. **Client page → Tickets** shows the same table as the Tickets page: the same columns and column choices, row details, sorting, search and paging. It filters Open, All or Closed, and lists all the client's tickets, not only open ones.
3. **Servers** can record an optional **GPU**: the number of GPUs, the model and the GPU memory (GB or GiB). It shows in the server's specification and as an optional column of the server list.
4. The **contract register** (Clients › Projects & contracts › Contract register) has a **Client** column and a **Contract amount** column. Both can be sorted. The amount is the total of the contract's fee lines in its currency, and reads *Not recorded* when no fee line has a price.
5. Contract **Obligations** and **Support notes** have no length limit any more (they were 4,000 and 200 characters).
6. A **payment's status** changes from the contract page with *Change status* on its row: Pending, Invoiced, Paid (with the date) or Waived, with optional notes. The rest of the contract is not changed. It needs the same right as editing the contract.

## Rights and settings

- The right `ProjectDashboard:View` is renamed `ClientDashboard:View`. The upgrade gives it to exactly the roles and people who held the old right, so nobody gains or loses access.
- Recording a client status needs `ClientStructure:Maintain` for that client (owner decision).
- Changing a payment's status needs `Contracts:Maintain` for that contract, as editing its payment terms does. No new right.
- The setting `Dashboard.ProjectStatusMaxAgeDays` is renamed `Dashboard.ClientStatusMaxAgeDays` and keeps its value.

## For integrators

New endpoints: `GET /dashboard/clients`, `GET /dashboard/clients/{id}`, and `GET`/`POST /clients/{id}/status-reports`. They replace `GET /dashboard/projects`, `GET /dashboard/projects/{id}` and `GET`/`POST /projects/{id}/status-reports`, which are removed. Also new: `POST /contracts/{id}/payments/{paymentId}/status`. The contract list returns `currency` and `amount` and sorts by `client` and `amount`. Servers take and return `gpuCount`, `gpuModel`, `gpuMemoryQuantity` and `gpuMemoryUnit`. See API.md.

## Removed from 2.59.0

The project statuses recorded under 2.59.0 are **deleted** with their table (`clients.ProjectStatusReport`, owner approval). They are not converted into client statuses. Record each client's status after the upgrade.

## Not yet validated

No user has tried these changes yet, and they have not been run on live data.

## Upgrade

1. Run `database\01-schema.sql`. It adds two migrations. `ClientDashboard` adds the table `clients.ClientStatusReport` and makes the right and setting renames above. `ServerGpuContractText` adds the GPU columns, removes the length limit on the two contract fields and drops `clients.ProjectStatusReport`.
2. Deploy the application.
3. Ask whoever follows each client to record its status. The Management dashboard's Data trust panel counts the clients without one.
