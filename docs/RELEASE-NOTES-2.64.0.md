# TIO Operations Hub 2.64.0

Prepared 13 November 2026. **This release changes the database:** apply the included `database/01-schema.sql` before deploying the application files (migration `20261113053901_CommitmentDependencies`). It adds commitments from external parties and dependencies between commitments (decision A114) on top of 2.63.0.

- **Title and description.** Every commitment now has a title (required) and a description (optional). The schema script gives existing commitments the first line of their description as title (up to 200 characters) and keeps the full description. This changes existing data; going back needs the database backup.
- **External commitments.** *Who delivers*: we do (Ours, as before) or an external party, to us (External). An External commitment names its external party, picked from a list shared by every client; people who may add organizations can add a new one from the form. The owner of an External commitment is the person in our team who follows it up, and is reminded 5 days before its due date (setting *Commitments.ExternalReminderDays*).
- **Dependencies.** On a commitment, *Add dependency* links a commitment it waits for, with a lead time in calendar days (for example 7 days of integration and SIT). The page shows the forecast delivery, the date each dependency is needed by, the buffer and a health: On track, At risk (less than 2 days of buffer, setting *Commitments.DependencyWarningDays*, or a dependency overdue), Will be late, or Blocked (a dependency was cancelled). Removing a dependency needs a reason. Loops and links to other clients are refused.
- **The deadline never moves by itself.** *Revise deadline* suggests the forecast date and can name the dependency as the cause. A commitment completed late records the dependency that made it late.
- **Notifications.** The owner and the project manager are told when a commitment becomes at risk (action required), forecast late or blocked (critical).
- **Lists and reports.** The Commitments list shows the title, direction, external party and health, with filters for direction, external party and health. *External reliability* (Commitments menu) shows each external party's on-time record. The Commitments report adds Title, Direction and External party columns.
- **API.** See `API.md` (Commitments).

**Rights, configuration and seed data.** No new right: the existing Commitments rights apply; adding an external party also needs *Client structure: Create*. Two new settings, seeded on upgrade without changing existing values: `Commitments.DependencyWarningDays` (2) and `Commitments.ExternalReminderDays` (5). The portfolio demo data gains one external party and one dependency; nothing is added to a production database.

**Owner to confirm (proposed defaults):** calendar days for lead times; one Completed step for external commitments; external parties shared across clients; who may add external parties; no link to supplier contracts yet.
