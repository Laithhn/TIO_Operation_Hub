# TIO Operations Hub 2.49.0

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **Not yet run against a real Jira site.**

## First response on synchronized cases (A82, A83)

- The first response is the earliest public Jira comment by someone mapped to a TIO user or a Vitronic team member. Internal notes, customer comments and unmapped authors, such as automation accounts, do not count.
- Comment authors now appear in the Jira users list, so they can be mapped.
- **A changed mapping no longer changes results already calculated.** 2.48.0 rechecked first responses on every run; this release does not. Synchronization only fills a first response that is still open, from comments arriving in that run.
- **Recalculate first responses** on the Jira users tab applies today's mappings to stored comments, with a reason. It can change SLA results, including on closed cases. Use it after mapping your team, and once after upgrading to correct values taken from any comment by 2.47.0.

## Jira users: mapping, classification and sign-in (A83)

*Administration › Jira conflict resolution › Jira users* lists unmapped Jira users until they are resolved. An administrator can:

- map to an existing TIO user or client contact;
- create a client contact;
- create a Vitronic team member;
- create a standard TIO user.

**A Vitronic team member is now a real user record with no sign-in and no password.** They own cases through Jira and count as the team for SLA rules. Sign-in is granted or removed separately on the Users page, with a reason, and does not change their classification or SLA records.

Duplicates are refused by name or email, and one person maps to one Jira user per connection. Mapping changes are audited and shown under **History**. Assignment to a client contact pauses the SLA only if the contract allows it.

## Jira space linked to a contract (A84)

- Choose a contract when assigning a Jira space to a client, or later with **Change** in the Contract column. Only active contracts of that client are offered.
- New cases from the space link to it, so its SLA targets, support calendar, pause rule and penalty terms apply from the Jira creation time.
- Cases that already have a contract keep it. Open cases with no contract join only when you ask, with a reason, because they can breach at once. Closed cases never join.
- If the contract is no longer active, new cases have no contract and an integration issue says so.

**Limit:** a case's priority still comes from the client's Jira default, not from Jira, so every case of a space uses the contract's target for that one priority. If the contract has no target for it, the SLA cannot be measured.

## Upgrade

1. Back up the database and the data-protection keys.
2. Review and apply `database/01-schema.sql`, and try it on a restored UAT backup first. **`JiraUserClassification` changes existing data:**
   - it adds `iam.User.Classification` and `iam.User.LoginEnabled`;
   - it creates a user with no sign-in for every Jira user marked as a Vitronic team member, with a `jira-team-` account name and the UTC time zone;
   - it maps those Jira users to the new records, clears the name shown on their cases and applies the owner again at the next run, so those cases gain an owner;
   - it drops `jira.JiraUserMapping.IsInternalMember`.

   `JiraSpaceContract` only adds a column.
3. Deploy, review the Jira users tab, then run **Recalculate first responses** once.

Rollback: **restore the database backup to go back to 2.48.0,** because the previous version needs the dropped column. The migration's `Down` does not restore team member mappings.
