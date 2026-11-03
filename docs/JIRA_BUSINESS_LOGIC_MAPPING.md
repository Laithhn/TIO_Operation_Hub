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
| First response, progress summary, last review | **Never** set by imported comments or activity |
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
| → Closed | **Not allowed as a mapping target** |
| → Cancelled | **Not allowed as a mapping target** |

### Deviation from the request: Jira cannot close or cancel a case

The request asks that Jira status updates the mapped case status, and also that case rules and SLA logic are preserved. These conflict for the last two statuses:

- **Closed** requires an outcome and validation evidence, or a Manager's exception. The code states that an engineer's reason alone can never waive evidence, and a Jira status carries neither.
- **Cancelled** makes both SLA obligations *Not applicable*, so a Jira action could erase a breach and its indicative penalty.

So a done Jira status should map to **Pending validation**, and people close from there. See open decision 1.

## SLA and penalties

No SLA or penalty code changed. These tests hold it in place: `Imported_comments_are_never_a_first_response_or_progress`, `A_contract_linked_later_is_measured_from_the_hub_case_not_from_jira_history`, `An_issue_becomes_a_real_case_with_a_source_reference_and_no_contract`.

### Onboarding policy for historical imports

1. Imported cases have no contract, so both obligations are *Not applicable*. No breach or penalty can arise from an import.
2. The clock starts at the case's hub creation time, as for every case. Jira's creation date is kept as external detail and never backdates a case.
3. A person links a contract when the case should be measured, with the existing action.
4. The resolution time of an imported case is when it reached Pending validation in the hub, not when Jira resolved it.

**Known limit:** if a contract's clock legally starts when the customer raised the Jira ticket, a linked imported case is measured from later than that, which understates elapsed time. See open decision 2.

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
| 1 | Should any Jira status close or cancel a case? | No; done maps to Pending validation |
| 2 | Do contracts start the SLA clock at Jira ticket creation or at hub creation? | Hub creation |
| 3 | Which Jira statuses map to which case statuses, per space? | Nothing mapped; needs real workflows |
| 4 | Azure Key Vault for tokens, as the mockup shows? | Encrypted on the server or an environment variable (see security guide) |
| 5 | Who may read restricted Jira comments? | Case coordinators |
