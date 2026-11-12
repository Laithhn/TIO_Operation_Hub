**Issue ID:** TIO-BUG-001

**Title:** Client ticket summaries and global search expose internal stage instead of configured status

**Module:** Clients / Tickets / Global search

**Page URL:** https://nb01994.vitronic.de/clients/1?tab=cases; https://nb01994.vitronic.de/cases; https://nb01994.vitronic.de/ (global Search dialog)

**Category:** Business Logic / Data / UX

**Severity:** P2

**Business Impact:** An operator sees different current statuses for the same ticket across routine navigation, which can confuse customer-waiting versus active-work decisions and weaken incident/queue review. No incorrect status write was demonstrated.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Desktop viewport 1920 × 1080.

**Preconditions:** Existing client TAH (client 1) and ticket CS-4003, CCC: RRM Integration (ticket 12203), visible to this account; the ticket retains an internal InProgress stage while its configured status is Waiting for customer. No test record or status change is required.

**Steps to Reproduce:**

1. Open /clients/1, choose Operational → Tickets, and locate CS-4003.
2. Open /cases, set Status to All, and search CS-4003; read its displayed Status.
3. Open global Search using the header search button or / shortcut, enter CS-4003, and read the result subtitle without activating a record action.
4. Compare the three displayed statuses for the unchanged ticket.

**Expected Result:** Every user-facing current-status summary uses the same configured ticket status and current display label. If an internal workflow stage is shown for a special purpose, it is explicitly labelled separately.

**Actual Result:** The client Tickets area shows In progress plus Waiting: Customer for CS-4003. The ticket register shows Waiting for customer. Global search shows the raw stage InProgress in the result subtitle. The same record links to /cases/12203. Owner labels also differ because the client summary uses the hub owner and the register may fall back to Jira assignee; that separate semantic difference is not claimed as an incorrect assignment here.

**Reproducibility:** Always for the unchanged sampled ticket under the recorded status/stage conditions; client/register comparison was repeated and global search was directly observed.

**Evidence:**

- [Client status repeated snapshot](../traces/107-client-ticket-status-reproduced.txt)
- [Client repeated screenshot](../screenshots/107-client-ticket-status-reproduced.png)
- [Ticket register comparison](../traces/108-register-ticket-status-comparison.txt)
- [Register comparison screenshot](../screenshots/108-register-ticket-status-comparison.png)
- [Global search result](../traces/098-global-search-settled.txt)
- [Source explanation](../traces/source-inventory.md)

**Likely Root Cause:** Local code corroborates different models: Modules/Reporting/OverviewEndpoints.cs:70 projects x.Status rather than x.StatusCode; pages/Clients.tsx:474 renders that stage. The register renders statusCode (pages/Cases.tsx:144). SearchExportEndpoints.cs:40–43 also projects/renders c.Status in search subtitles. These local code paths are confirmed by inspection; matching the deployed binary to this checkout was not verified.

**Recommended Fix:** Use the shared configured StatusCode projection/label source for client ticket summaries and search results, while retaining internal stages for workflow logic. Audit other user-facing ticket summaries for the same stage/status distinction; preserve scope and rights checks.

**Acceptance Criteria:**

1. For a customer-waiting ticket whose internal stage remains InProgress, client summary, register, detail and global search show the same configured status.
2. Renaming a configured status changes all those labels consistently; raw enum tokens such as InProgress are not presented as the current business status.
3. Any separately exposed internal stage is explicitly named and cannot be mistaken for configured status; record ownership and access remain unchanged.

**Regression Test:** In an approved isolated fixture, create tickets sharing an internal stage but carrying different configured statuses (including customer waiting and a custom/renamed status). Assert status labels across client summary API/UI, register, detail and global search. Existing read-only sampled records may support observation, but fixture creation/renaming must not run against production.
