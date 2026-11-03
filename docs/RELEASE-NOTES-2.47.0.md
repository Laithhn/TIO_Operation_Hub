# TIO Operations Hub 2.47.0

Prepared 3 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **Not yet run against a real Jira site.**

## Configurable case statuses (A77)

- *Administration › Configuration › Contracts & Cases › Case statuses* now adds, renames, reorders, retires and deletes statuses. Each status has a fixed behavior, which decides the SLA, penalty and case action rules.
- New lists start with New, Opened, In-progress, Waiting for customer, Closed, Re-opened.
- **Resolution SLA:** with no status that behaves as Resolved, the clock stops at closing instead of when validation is requested. Resolution times get longer, and more future cases may breach or incur penalties. Add a Resolved status to keep today's measure.
- Cancelling now shows as Closed with a Cancelled tag, and stays out of SLA and penalties.

Details: [CASE-STATUSES-A77.md](CASE-STATUSES-A77.md).

## Jira controls synchronized cases (A78)

- People can only view the status of a case synchronized from Jira. Every mapped Jira status applies, including closing, going back and reopening, and a case can be In-progress with no owner.
- A Jira status mapped to Closed closes the case and records the issue and status as its outcome and evidence.
- **The SLA clock starts at the Jira creation time.** With a contract linked, the response and resolution due dates follow from it, and the case's due date is the resolution due date. Linking a contract to an old issue can breach it at once.
- **The first response is the earliest Jira comment,** of any author or visibility. People cannot record it on these cases.

Cases created by hand keep their actions and rules.

## Jira user mappings (A79, A80)

A Jira user maps to one of:

- **A TIO user or project team member,** who becomes the case owner.
- **A client contact.** The TIO owner stays, and the case waits on the customer until Jira reassigns it. The SLA pauses if the contract allows it.
- **A Vitronic team member,** with no TIO account. The case shows the Jira name. An owner taken from Jira is cleared, so the case counts as unassigned and no one receives its notifications.

## Other changes

- **`DataProtection:KeysFolder`:** an optional fixed folder for data-protection keys, so stored Jira tokens survive a moved site, a restored database or a new identity. See [JIRA_SECURITY_AND_DEPLOYMENT.md](JIRA_SECURITY_AND_DEPLOYMENT.md).
- **Fixed:** assigning someone to a case, moving it away and assigning them back within one minute failed on a duplicate notification.

## Upgrade

1. Back up the database and the data-protection keys.
2. Review and apply `database/01-schema.sql`, and try it on a restored UAT backup first. **These migrations change existing data:**
   - `ConfigurableCaseStatuses` rewrites the case status list and sets a status on every case. It removes the Cancelled list value, including any custom label, and drops `jira.JiraWorkflowStatusMapping.TargetStatus` after copying it.
   - `JiraSlaClockStart` moves synchronized cases to the Jira creation time and fills their first response from imported comments. **SLA results of synchronized cases under a contract can change** when the application next starts.
   - `JiraClientRepresentative` and `JiraInternalMember` only add columns.
3. Deploy with `Jira__Enabled=false`, map every Jira status and user, then enable it. A status with no mapping leaves the case unchanged and raises a conflict, and people cannot fix the status by hand.

Rollback: the application rollback in [JIRA_SYNC_OPERATIONS_GUIDE.md](JIRA_SYNC_OPERATIONS_GUIDE.md) **no longer applies to this release, because the previous version needs the dropped column. Restore the database backup to go back to 2.46.0.**
