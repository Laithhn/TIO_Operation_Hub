# TIO Operations Hub 2.67.0

Prepared 18 November 2026. **This release changes the database:** run `database/01-schema.sql` (idempotent) before deploying the application files. It applies one new migration, `20261118072809_ClientStatusFreeText`, which widens `clients.ClientStatusReport.Summary` from `nvarchar(1000)` to `nvarchar(max)`. Widening only: no data is changed or removed. The application refuses to start until the migration is applied.

- **Client status takes free-text comments / feedback** (A119). In Client 360 → *Update client status*, the field "Reason — what is behind this status" (limited to 1,000 characters) is now **Comments / feedback**: free text with no length limit. It is still required, and text that looks like a password or token is still refused. Line breaks are shown as typed, in the status line at the top of the page and in the status history, whose column is renamed *Comments / feedback*. The API field keeps its name (`summary`).
- **Test housekeeping.** The Playwright end-to-end runs now drop their temporary `TioHub_E2E_*` database after every run. This does not affect the application.

**Rights, configuration and seed data.** None added or changed. Recording a client status still needs *Client structure: Maintain* (A109). No new setting, configuration list or API endpoint.
