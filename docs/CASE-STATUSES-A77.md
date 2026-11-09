# Configurable case statuses (A77)

Reverses the label-only rule for case statuses in `DECISION-A63-PERMISSIONS-PENALTIES-WORKFLOWS.md`. Condition values stay label-only.

## How it works

Each case has two values:

| Value | Who uses it | Stored in |
|---|---|---|
| **Status** | People: screens, filters, reports. Configured under *Administration › Configuration › Contracts & Cases › Case statuses*. | `work.Case.StatusCode`, a code of the `CaseStatusLabel` list |
| **Stage** | Rules: SLA clocks, penalties, open and closed counts, case actions. Not configurable. | `work.Case.Status` |

A status's **behavior** is chosen when it is created and cannot change afterwards, because history depends on it.

| Behavior | Stage | Effect |
|---|---|---|
| Initial | New | Where a new case starts |
| Opened | Triaged | Ready for work |
| Active | InProgress | Work under way |
| Waiting for customer | Unchanged | Shown while the case waits on the customer. The SLA pauses only if the contract says so |
| Resolved | PendingValidation | Stops the resolution SLA clock. While one is active, closing needs this step first |
| Closed | Closed | Needs an outcome and evidence |
| Reopened | Triaged | Shown after a closed case is reopened |

When an action moves a case to another stage, it takes the first active status of that behavior, by the list's order. **Change status** on the case moves between statuses of the same stage. Moving to another stage always uses that stage's action, so its rules still apply.

## Adding and removing

- **Add:** choose a name and behavior.
- **Delete:** only when no case and no Jira mapping uses it. Otherwise retire it: existing cases keep it, and it stops being offered.
- **Protected:** the last active status of Initial, Opened, Active or Closed cannot be retired or deleted, because case actions need one.
- Deleted statuses do not come back at startup. The seeder fills the list only when it is empty.

## Effects on existing results

- **Resolution SLA:** with the initial list there is no Resolved status, so the clock stops at closing. Today it stops when validation is requested, so **future resolution times get longer and more cases may breach or incur penalties.** Earlier results are not recalculated. To keep today's measure, keep or add a Resolved status.
- **Cancelled:** no longer a status. Cancelling still excludes the case from SLA and penalties. The case shows as Closed with a Cancelled tag. The *Closed* report filter now includes cancelled cases.
- **Jira:** any active status can be a mapping target. A status with Closed behavior closes the case and records the Jira issue and status as its outcome and evidence. A closed case reopens when Jira moves it back to an open status (A78).

## Upgrading

Migration `ConfigurableCaseStatuses`, in `database/01-schema.sql`, changes existing data. Back up first and review it.

| Before | After |
|---|---|
| List value Triaged | Code and label become Opened |
| List value InProgress | Label becomes In-progress |
| List value PendingValidation | Kept as a Resolved status if any case is in that stage; otherwise deleted |
| List value Cancelled | Deleted, **including any custom label** |
| Not present | Waiting for customer and Re-opened are added |
| Cases | `StatusCode` is set from the stage; a reopened case in Triaged becomes Re-opened, and an open case waiting on the customer becomes Waiting for customer |
| Jira mappings | `TargetStatus` moves to `TargetStatusCode` and the old column is dropped |

Other custom labels are kept. Saved reports naming Triaged, PendingValidation or Cancelled keep working.

## Not done

- Moving every case from one status to another in one step. Retire the status instead.
- Showing the configured status on every screen. Dashboards and classic reports group by stage and use the first matching label, so two statuses of the same stage count together there.
