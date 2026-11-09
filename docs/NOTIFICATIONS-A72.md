# Notifications redesign (A72, 28 Oct 2026)

Extends the A38 notifications center (one `notify.Notification` row per person and notice, written by assignment hooks and by the
background `NotificationScanner`). No parallel system, no new package, no new background job, no real-time channel.

## What changed

| Area | Before | Now |
|---|---|---|
| Pop-up | 380 px list of the latest 8, "Mark all read" | 460 px (full width on phones), header with unread badge and **Mark all as read**, tabs **All / Unread (n) / Critical (n)** (arrow keys, Home/End), sections **Critical / overdue → Action required → Informational → Resolved** (only non-empty ones), cards with type icon, title, description, source, relative time (exact time in the tooltip), status chip in words, unread dot and the action (*Review payment*, *Review contract*, *View commitment*, *View client*, …). Loading, empty ("You're all caught up…") and error (with *Try again*) states. Escape closes and returns focus to the bell. |
| Grouping | none | Open notices of the same kind about the same type of record (2 or more) show as one card, e.g. **2 overdue commitments — CM-1006 and CM-1004 require attention.** Expanding lists each notice with its own unread state and action; *Mark these n as read* marks only those. Unrelated kinds and resolved notices are never grouped. Presentation only (`pages/notificationModel.ts`). |
| Read vs resolved | Resolving a condition **marked the alert read**; a read alert that was still active became unread again at every scan. | `ResolvedAt` is a separate column. The scanner sets it when the condition clears (paid, completed, end date recorded…) and leaves the read state alone; it clears it (and the read time) if the condition returns. Reading never resolves anything; users cannot resolve business alerts by hand. **Reminders (owner choice, 28 Oct 2026):** a read alert that is still active becomes unread again at the next scan, as before — *Mark all as read* clears the list until then. `Notifications:RemindAfterHours` (default **0** = every scan) can space the reminders out, e.g. 24 for once a day. |
| Counters | unread = not read | unread = not read **and not resolved** (a resolved alert needs no attention). `criticalCount` = open critical alerts. One grouped query. |
| Center page | All / Unread / Payments, mark read, delete | Same cards and sections as the pop-up, plus **Critical** tab, **Importance** (critical / action required / informational) and **Business state** (open / resolved) filters, **search** (title and description), still paged on the server; Payments tab unchanged. |

Severity is derived from the kind on the server (`NotificationSeverity`), so every stored notice has one without a data migration:
critical = `Overdue`, `PaymentOverdue`; action required = `DueSoon`, `PaymentDue`, `Renewal` (including *has no end date*), `Handover`;
informational = `Assigned`, `Team`, `Report` and anything else. The record type comes from the link (payment reminders link to their contract,
so *Review payment* opens the contract with its payment terms).

## API (all existing fields and parameters kept)

- `GET /api/v1/notifications` — new optional `severity=critical|action|info`, `state=open|resolved`, `q` (≤ 100 chars), `sort=severity`;
  items gain `resolvedAt`, `severity`, `entityType`; response gains `criticalCount`. `unread=true` now excludes resolved alerts.
- `GET /api/v1/notifications/unread-count` — excludes resolved alerts.
- `POST /api/v1/notifications/read` — new, body `{ ids: [...] }` (1–500); marks only the caller's own unread rows; returns `{ marked }`.
- Unchanged: `POST /{id}/read`, `POST /read-all`, `DELETE /{id}` (all limited to the caller's rows, as before).

## Database

Migration `NotificationResolution`: `notify.Notification.ResolvedAt datetimeoffset NULL` (in the regenerated `database/01-schema.sql`).
Existing rows start open; the first scan resolves those whose condition is already gone. Clean-up now also removes alerts resolved more than 90 days ago.

## Security

Every query is filtered by the signed-in user id from the session (`UserContext`), never by a client-supplied id; batch read ignores ids of
other people. Opening a record still goes through that record's own scope checks. Titles and descriptions are the ones already stored (A38);
nothing new is exposed.

## Not done (recommended next steps)

- **Escalation to a manager** after a threshold: not built, because no business rule names who receives it or when. Recommended design: a
  configurable rule per kind (`Notifications:Escalation:{Kind}:AfterHours`, recipients = holders of a named right), evaluated by the existing
  scanner, written as notices with their own key (`escalation-…:{source key}`) so they are created once and resolved with the source alert.
- The pop-up shows up to 50 notices ordered by severity; older ones are in the center (a line says how many).
- Group cards link to their members, not to a pre-filtered list page (the list pages have no "overdue only" link that matches every kind).
- E-mail or real-time delivery remain out of scope (A38); the bell still checks the count every minute.
