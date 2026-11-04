# Jira integration: business logic mapping (A76)

How Jira data reaches a case, what is preserved, and which decisions the owner still has to make.

## What Jira changes on a case

| Case field | Effect of Jira |
|---|---|
| Title | Set once at creation from the summary; later Jira edits appear under Jira details only |
| Client | From the space's validated owner; never from issue content |
| Status | Through a validated mapping and legal steps only (below) |
| Owner | From the assignee through a user mapping (below) |
| Priority | **Never.** New cases take the client's configured default; Jira priority is shown as external detail |
| Backup owner, team, coordinator, responsible party | **Never.** The team of a new case comes from the client's settings |
| Operational due date | **Never.** Jira's due date is shown as external detail |
| Contract | **Never linked automatically** |
| First response | **A82:** the time of the earliest public Jira comment by someone mapped as a hub user or a Vitronic team member. Internal notes, customer comments and unmapped authors do not count, so map your team before relying on response SLAs. People cannot record it on these cases |
| Progress summary, last review | **Never** set by imported comments or activity |
| Waiting | **Never** |

## Creating a case

The required values a Jira issue cannot supply are configured per client, and a missing one produces a review item instead of a guess:

| Case value | Source |
|---|---|
| Responsible team, case type, priority | Client's Jira settings |
| Impact summary | "Not yet assessed. Imported from Jira TAH-1." The team replaces it at triage |
| Next action, next review | "Review the case imported from Jira.", now + configured hours (default 48) |

Issues already done in Jira do not become open cases unless the client switches on *Import issues already done*.

## Existing case reconciliation

Before creating a case, in this order:

1. **Synchronized mapping:** update that case.
2. **Same-site manual reference, one case of this client:** no case is created. A *Duplicate case candidate* offers **Adopt**, **Create new** or **Ignore**, and each needs a reason.
3. **Several candidates:** queued for review.
4. **Candidate on another client's case:** *Client ownership conflict*; nothing is created.
5. **Nothing found:** create the case.

Titles are never compared. Adoption requires that the case already references the issue and belongs to the space's client. Manual references stay, and their reason text is kept. For example, CS-1001 referencing TAH-2355 produces an adoption offer, not a second case; its PSPJ-5211 on-prem reference is unaffected.

## Workflow

No status is mapped by name or category. An unmapped status raises *Unknown workflow status*, and cases keep their status.

| From → to | Automatic? |
|---|---|
| New → Triaged → In progress → Pending validation | Yes, one legal step at a time |
| Into In progress without an active owner | **No.** Stays Triaged and raises a review item (WRK-04); retried each run |
| Pending validation → In progress | Yes (validation rejected); clears the resolution time like *Return to work* |
| Anything backwards otherwise | **No**, review item |
| Reopening a closed or cancelled case | **No**, review item; reopening needs a Manager |
| → Closed | **Yes, if the owner maps a status to it** (A77). Records the Jira issue and status as outcome and evidence |
| → Cancelled | **Not allowed as a mapping target** |

### Jira closing a case (owner decision A77; cancelling stays with people)

The request asks that Jira status updates the mapped case status, and also that case rules and SLA logic are preserved. These conflict for the last two statuses. The risks below were accepted for closing:

- **Closed** requires an outcome and validation evidence, or a Manager's exception. The code states that an engineer's reason alone can never waive evidence, and a Jira status carries neither.
- **Cancelled** makes both SLA obligations *Not applicable*, so a Jira action could erase a breach and its indicative penalty.

**Owner decision (A77):** a Jira status may close a case, with the issue and status recorded as its outcome and evidence. Cancelling and reopening stay with people. See `CASE-STATUSES-A77.md`.

## SLA and penalties

No SLA or penalty code changed. These tests hold it in place: `The_first_jira_comment_is_the_first_response_and_never_progress`, `With_a_contract_the_sla_and_due_date_count_from_the_jira_creation_time`, `An_issue_becomes_a_real_case_with_a_source_reference_and_no_contract`.

### Onboarding policy for historical imports

1. Imported cases have no contract, so both obligations are *Not applicable*. No breach or penalty can arise from an import.
2. **A78:** the clock starts at the Jira creation time. Cases not from Jira still start at their hub creation time.
3. A person links a contract when the case should be measured, with the existing action. **An old issue can be breached the moment its contract is linked,** because its clock started in Jira.
4. The resolution time of an imported case is when it reached a Resolved status in the hub or, without one, when it closed. It is not when Jira resolved it.

**Known limit:** Jira gives no resolution time here, so a case closed from Jira counts as resolved when the synchronization sees it, up to one sync interval late.

## Owner

| Situation | Result |
|---|---|
| Mapped, active, has access to the client | Owner changes through the same checks as *Assign owner*; a timeline event and an assignment notice follow |
| Not mapped | Owner kept, external assignee shown, *Missing user mapping* raised; applied once mapped |
| Mapped person is the backup owner | Owner kept, review item (owner and backup must differ) |
| Unassigned in Jira | Owner kept (a case in progress must keep an owner) |
| Closed or cancelled case | Owner kept |
| A person reassigns in the hub | That holds until the Jira assignee changes again; the "from Jira" label clears |

## Comments and activity

- Imported comments are read-only and idempotent by Jira id. An edit replaces the text; a comment deleted in Jira leaves the timeline.
- **Restricted comments:** Jira's roles and groups do not exist in the hub, so the text is returned only to people with Cases Coordinate. Others see that a restricted comment exists.
- **Credential check:** a comment or description that looks like a credential is not stored (IAM-03); the timeline says to read it in Jira.
- Activity import covers status, assignee, resolution, priority, due date, labels, component, issue type, summary, key and project. Descriptions are not imported as changes.
- TIO comments are stored locally and have no path to Jira.

## References

Existing manual references and the Internal On-prem mechanism are unchanged. References now carry an origin: *Manual*, *Imported source* or *Source (adopted case)*. Source references cannot be removed while the case is synchronized.

## Permissions

| Capability | Rule |
|---|---|
| Administration → Integrations | New area `AdminIntegrations` (View, Create, Maintain) plus the Administration right |
| Client Jira tab | New tab `tab.ClientStructure.jira:View` |
| Changing client settings | Also Client structure Coordinate in that client's scope |
| Resolving a review item | Also Cases Coordinate in that client's scope |

The locked TIO Manager holds the new permissions automatically. **Other roles hold none until an administrator grants them**, as with every new key since 2.43.

## Open owner decisions

| # | Decision | Current behavior |
|---|---|---|
| 1 | Should any Jira status close or cancel a case? | **Decided (A77):** it may close, recording Jira as evidence; it cannot cancel. **A78:** every mapped status applies, including reopening |
| 2 | Do contracts start the SLA clock at Jira ticket creation or at hub creation? | **Decided (A78):** Jira creation |
| 3 | Which Jira statuses map to which case statuses, per space? | Nothing mapped; needs real workflows |
| 4 | Azure Key Vault for tokens, as the mockup shows? | Encrypted on the server or an environment variable (see security guide) |
| 5 | Who may read restricted Jira comments? | Case coordinators |
