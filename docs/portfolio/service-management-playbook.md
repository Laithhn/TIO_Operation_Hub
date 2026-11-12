# Service, Contract and Financial Operations Playbook

| Control field | Controlled value |
|---|---|
| Document ID | TIO-OPS-003 |
| Version / status | 1.1 / Advanced control framework - approval pending |
| Classification | Internal operating model; customer-specific schedules require agreement |
| Owner / approver | Service owner (proposed) / Product, Operations, Finance and Legal owners (pending) |
| Issue date / review | 24 October 2026 / 24 January 2027 or at material change |
| Source baseline | Repository working tree reviewed 24 October 2026; decisions A61-A66 and Reporting Center A62 |
| Supersedes | New controlled playbook |

## 1. Purpose, boundary and operating principles

This playbook defines a management control model for operating contract-linked service work in TIO Hub. It connects the contract record, applicable service terms, case work, commitments, escalations, indicative penalty assessment and operational reporting. It is a proposed procedure for local approval, not a customer SLA, legal interpretation, finance policy or proof of a control operating effectively.

TIO Hub is the operational system of record for records entered into it. People remain responsible for the accuracy and authorization of contract terms, work events, ownership, financial review and customer communications. A system status or report is not a substitute for validating source evidence or obtaining the approval required by the organization.

| Control principle | Operating rule |
|---|---|
| Contract before calculation | Verify the executed source, effective dates, covered service, support calendar, targets and penalty clause before linking eligible cases. |
| Case-level traceability | Link eligible client cases to a same-client contract; record a reason for later link changes and review the case timeline. |
| Preserve historical context | Case terms are snapshotted when linked and on priority change. Later contract edits do not rewrite the case snapshot. Reconcile amendments through a controlled review. |
| Separate service and money | SLA status measures recorded obligations; penalty assessments are indicative, capped and reviewable. They do not issue credits, invoices, payments or accounting entries. |
| Named accountability | Assign one accountable owner and a next action / due time where appropriate; use coverage and handover controls to keep work actionable. |
| Evidence before reporting | Reconcile report scope, definitions, access and data time before management decisions or customer disclosure. |

## 2. Capability map and boundaries

| Management need | TIO Hub support evidenced in the current baseline | Management control / external boundary |
|---|---|---|
| Contract register | Contract records, terms, dates, status and renewal tracking; contracts appear in governance reports. | Contract execution, legal interpretation, signature workflow, repository of record and amendment approval are external processes unless separately implemented. |
| SLA work | Case-to-contract association; response and resolution targets; support calendar, time zone, pause rule and case term snapshot; explicit first-response event and resolution transition; at-risk / breached / pending / not-measurable outcomes. | Contract must define the actual obligation. Verify case applicability, event evidence, timing basis, exclusions and disputes. The product does not prove customer receipt or external system availability. |
| Service work management | Cases, impact, priority, status, owner, affected records, event history, waiting periods, commitments, escalations, teams, coverage and handovers. | This is work-record management; it does not establish a complete ITIL service desk, monitoring/alerting, problem, change, release, CMDB discovery or major-incident process unless evidenced in the deployed release. |
| ITSM references | Manual Jira instance / issue references can associate external work context with cases. | No automatic Jira synchronization or bidirectional status, comment, identity, attachment or SLA exchange is established. Other ITSM integrations require separate design and approval. |
| Financial review | Contract-linked, indicative SLA penalty assessment and monthly review/reconciliation context, with recorded terms and cap behavior. | No general ledger, billing, invoicing, receivables/payables, tax, payment, credit-note issuance, settlement or finance-system posting is established. Finance owns determination and accounting. |
| Management information | Server-calculated SLA compliance, commitment performance, case aging/backlog, team workload and client health; CSV/Excel export and scheduled in-hub notifications. | Report definitions and accessible scope apply; schedules do not email files. Formatted PDF report export is unavailable in the documented baseline. |

## 3. Roles and decision rights

| Role | Accountabilities | Decisions reserved |
|---|---|---|
| Contract owner | Maintain authoritative contract reference, scope, effective dates, amendments and renewal decisions; identify applicable schedules. | Contract interpretation and acceptance of amendments with Legal / authorized signatory. |
| Service owner | Approve service workflow, SLA reporting cadence, escalation route and service review; ensure role coverage. | Customer-facing service commitments and exception acceptance with commercial authority. |
| Case owner | Maintain accurate priority, impact, affected records, response / resolution events, status, owner and next step. | Case resolution recommendation within delegated authority; no unilateral contractual waiver. |
| Team lead / duty manager | Review overdue and at-risk work, staffing, handovers and escalation; arrange backup owners. | Reallocation and escalation under local policy. |
| Finance reviewer | Reconcile eligible events, clause version, calculation, cap and currency; document variance and disposition. | Recognition, credit, invoice, accounting treatment and posting. |
| Legal / commercial reviewer | Validate executed terms, interpretation, exclusions, disputes and communications. | Legal position, waiver, settlement and contract amendment. |
| System administrator | Configure users, scopes, actions, reference data and settings; preserve audit and support controlled corrections. | No business approval by virtue of administrator role; data access remains separately granted. |

Local managers must name primary and backup role holders, delegated limits, response contacts, dispute authority and record-retention policy before adopting the playbook.

### Governance and segregation of duties

| Activity | Preparer / operator | Independent review | Final decision authority | Evidence record |
|---|---|---|---|---|
| Contract data entry | Contract administrator / owner | Contract owner or delegated checker | Authorized commercial/legal signatory | Executed source reference, field verification, effective date and reviewer |
| SLA case operation | Case owner | Duty lead / service manager | Service owner for operational exception; Legal for interpretation | Case timeline, qualifying response, status, wait interval, priority and contract snapshot |
| Monthly service review | Reporting analyst / service manager | Contract owner samples source cases | Service owner for corrective action and customer communication | Frozen filters, timezone, export ID, row count, sample reconciliation and action log |
| Penalty reconciliation | Finance preparer | Independent Finance reviewer | Authorized finance approver and commercial/legal owner as required | Candidate workpaper, clause and term cohort, calculation, cap, variances and disposition |
| Access and recipient change | Administrator | Business owner for role and scope | Access approver under local policy | Request, grants, test result and audit reference |
| Amendment / renewal | Contract owner | Legal, service and finance reviewers by impact | Authorized signatory | Approved change, effective date, impact review and transition plan |

One person must not prepare and approve the same material financial disposition. If staffing prevents separation, document a compensating manager review and retrospective independent review under a locally approved threshold. Do not invent approval thresholds in this playbook.

## 4. Contract lifecycle controls

![Service work context connects contract terms, the case and operational review](assets/case-workflow.png)

| Stage | Minimum control and evidence | Exit condition |
|---|---|---|
| 1. Intake | Obtain the executed agreement and schedules from the approved repository. Record contracting parties, service / product scope, client, reference, currency, start/end dates and accountable contract owner. | Source document and owner are identifiable. |
| 2. Verify | Legal / commercial owner confirms the support window, time zone, holidays or exclusions, severity mapping, response/resolution targets, pause conditions, penalty method, cap, renewal / notice period and precedence. Record unresolved interpretation as an exception. | Terms are approved for configuration; open questions are assigned. |
| 3. Configure | Authorized user creates or updates the contract record. A second reviewer compares key fields against the approved source and records review evidence outside or alongside the governed record as policy permits. | Required fields reconcile and status / effective dates are correct. |
| 4. Activate and associate | Confirm active coverage and same-client association. Link each eligible case to the intended contract. The form preselects the only Active contract; user verifies it. Historical cases are not automatically linked. | Case applicability is documented and link is correct. |
| 5. Operate | Case owner maintains priority, response and status events, affected records, pause context, owner and next action. Service lead reviews queues and escalations at the agreed cadence. | Work is current, owned and reviewable. |
| 6. Review performance | Use the SLA compliance report and case-level evidence. Separate pending, breached, at-risk and not-measurable records; investigate missing or disputed events. | Service review has a reconciled population and recorded exceptions. |
| 7. Reconcile financial exposure | Finance compares clause, relevant term snapshot, eligible case evidence, period, cap cohort and calculation; records challenged / excluded / approved dispositions under finance policy. | Authorized reviewer signs disposition; no product output is treated as a posting. |
| 8. Amend, renew or close | Capture approval and effective date; update contract terms through the authorized change route. Understand that existing case snapshots remain unchanged. Review open cases and any transition plan before expiry or closure. | Coverage transition, renewal or termination is approved and communicated by contract owner. |

Any contract link added, removed or changed after initial association requires a reason and creates a timeline event. Review the event history and downstream reporting before using the amended population. Do not use a priority change to reprice penalties: current decision A66 states priority changes refresh SLA targets without repricing recorded penalties.

### Contract control record minimum

| Attribute group | Minimum controlled attributes | Validation / evidence |
|---|---|---|
| Identity | Client, executed reference, service/product scope, parties, source repository locator | Stable reference; source access controlled; party/client mapping verified |
| Term | Effective dates, renewal, notice date, amendment reference, precedence, status and owner | Dates reconcile to signed instrument; overlapping or expired coverage flagged |
| Service | Covered environments, support hours/days, timezone, calendar basis, priority mapping, response/resolution targets | Owner verifies operational mapping; ambiguity routed to Legal/Commercial |
| Clock rules | Start, qualifying response, resolution, pause, exclusions and holiday handling | Case sample proves intended treatment; current baseline has no holiday calendar |
| Financial | Currency, clause, formula, cap basis/period, cohort, rounding, tax treatment and approval route | Finance validates independently; no ledger posting implied |
| Governance | Data owner, approver, review date, change history and retention class | Owner/checker and effective date traceable |

This is a management control specification. Verify which attributes are native fields in the target release; maintain missing evidence in the approved contract repository or workpaper. Do not imply a product field exists just because it is listed here.

## 5. SLA measurement and case controls

### 5.1 Verify the measurement basis

For each case, confirm the client, contract, covered service, priority, target, support calendar, time zone and pause rule. TIO Hub snapshots applicable targets and the support calendar when the contract is set and when priority changes. Later contract edits do not rewrite earlier case terms. Record the source clause and any exception in the approved contract repository or case evidence mechanism.

The documented baseline defines case creation as the clock start. First response is an explicit event recorded at the actual time sent, not the time somebody later enters it. Resolution is measured at the first move into Pending validation or Closed. Paused customer-waiting periods follow the configured pause rule. Support-window calculations observe configured days/times and IANA time zone; overnight support belongs to its starting support day. Holiday calendars are not modeled in the cited baseline unless a later release documents otherwise.

### 5.2 Operational state and action

| Result | Meaning in reporting | Management response |
|---|---|---|
| Met | Recorded obligation is complete within the applicable target. | Preserve event evidence; sample-check disputed or material cases. |
| Breached | Recorded obligation completed after its applicable deadline. | Validate applicability, timestamps, pauses and source terms; assign corrective follow-up and finance review if the clause may apply. |
| Pending | Obligation has not yet been completed and is not yet breached. | Track against its deadline and keep an owner / next action. |
| At risk | Pending obligation has a deadline within the next 24 hours under the documented report definition. | Prioritize operational review and confirm coverage; this is an operational warning threshold, not a contractual status. |
| Not measurable | No usable linked contract obligation / measurement basis is available. | Review missing contract linkage, incomplete terms or unsupported case context; do not count as met. |

Response and resolution rates are each **met ÷ (met + breached)**. Pending and not-measurable records are outside the denominator; cancelled cases are excluded from relevant performance reporting. Always state period, client/team/owner filters, time zone, population and data timestamp when presenting the rate. A rate with no measured cases is not a 0% failure; report it as no measured result.

### 5.3 Case-owner checklist

1. Confirm correct client, covered product/service and contract; state a reason for any later link correction.
2. Set priority and impact using approved policy; verify the effective targets shown after the change.
3. Record first response only when sent and at the actual send time; preserve the authoritative communication evidence under local policy.
4. Maintain status and waiting context; use only configured pause behavior and record relevant customer-wait start/end evidence.
5. Keep affected environment / asset, accountable owner, next action and due time current.
6. Reassess at-risk work, staffing and handover; use an escalation with chronology and intended response.
7. On resolution, set the supported resolution transition and document outcome; do not backdate events to improve performance.

### 5.4 SLA control decision path

| Decision gate | Pass condition | If not met |
|---|---|---|
| Applicability | Client case, correct same-client contract, covered service and effective term | Hold interpretation; correct association with reason or route contract dispute |
| Measurement completeness | Supported priority target and timing basis; required support calendar complete | Treat as not measurable as applicable; assign contract configuration owner |
| Event integrity | Case creation, actual response event, status history and allowed customer-wait interval are chronological and evidenced | Preserve history, open correction review and exclude unresolved dispute from external claims |
| Calculation | Snapshot matches applicable priority/calendar and deadline recomputes under approved rules | Escalate defect to Engineering or source-data issue to owner |
| Reporting | Population, date range, timezone, filters, denominator and refresh time are stated | Reissue with corrected scope; retain superseded export ID and explanation |
| Financial eligibility | Executed penalty clause applies and case outcome meets its definition | Finance disposition required; SLA breach alone does not establish an amount payable |

An operational SLA breach and a financial penalty candidate are separate decisions. Contract exclusions, cure periods, service credits, disputed events and cap application require authorized interpretation of the executed contract.

## 6. ITSM work-management operating rhythm

| Cadence | Review | Required evidence / action |
|---|---|---|
| Each working day / duty shift | At-risk SLA obligations, overdue cases and commitments, unassigned critical/high work, active escalations, expiring handovers and missing next actions. | Named owner, next action and due time; escalation or coverage decision; factual event updates. |
| Weekly | Case aging/backlog, repeated overdue work, team/owner workload, data-quality exceptions, contract coverage gaps and upcoming renewals. | Trend and exception list, actions with owners/dates, workload reassignment and contract owner follow-up. |
| Monthly service review | Response and resolution compliance by client/team/owner, breach causes, not-measurable population, commitments, escalations and service risks. | Agreed report filters/time zone, reconciled sample, minutes, decisions, disputes, action log and customer-safe summary. |
| Monthly finance review | Eligible penalty candidates by period and term cohort, cap, adjustments, corrections, disputes and carry-forward. | Finance-owned reconciliation worksheet or approved system; source links, reviewer, disposition and posting reference where applicable. |
| Renewal / material amendment | Scope, service hours, targets, pause/holiday basis, cap/currency, notice date, open work, integrations and transition. | Approved amendment / renewal decision and effective date; implementation task and communication plan. |

TIO Hub provides work-record fields and reports to support this rhythm. The organization must define duty schedules, major-incident command, problem management, change approval, release governance, monitoring/event intake, service catalog, CAB, customer communication, post-incident review and any statutory notification process separately unless the deployed release specifically implements them.

### 6.1 Escalation and handover

Escalate when an obligation approaches its deadline, an owner cannot make the next action, risk exceeds delegated authority, an incident affects multiple clients, or contract applicability is disputed. The service lead records why, recipient, response/resolution expectation and chronology. Acknowledgment, transfer and handover recipients must be authorized and valid at the time of action; a handover is not complete until the receiving owner accepts accountability under local policy. Team leads review missed or overdue escalations and correct coverage gaps.

## 7. Financial assessment and reconciliation controls

Indicative penalty assessment is a decision-support calculation using recorded contract/case evidence and the implemented rule set. It is not a receivable, payable, credit, refund, invoice, debit note or settlement instruction. The contract clause and applicable law remain authoritative. Current decision A66 specifies monthly assessment reconciliation for corrections and legacy keys; unchanged calculation terms share one cap cohort, while genuine monetary amendments retain their recorded case terms. Priority changes refresh SLA targets without repricing penalties.

### Monthly review procedure

1. Finance defines the reporting period, currency, client and contract population, and the authoritative rule version.
2. Extract candidate cases and assessments with the report filters, data time, access basis and source identifiers recorded.
3. Reconcile each case against executed terms, case snapshot, measured obligation, event chronology, exclusions and any approved dispute.
4. Group cases by the applicable unchanged monetary terms / cap cohort. Identify genuine monetary amendments separately and confirm which recorded case terms apply.
5. Recompute or independently check the implemented assessment; compare cap consumption, corrections, duplicate/legacy references, removed links, cancellations and any manual adjustment.
6. Record disposition per candidate: pending evidence, excluded with reason, disputed, accepted for further approval, or rejected. Identify preparer, independent reviewer, date and evidence location.
7. Route any approved credit, invoice, settlement or accounting entry through existing authorized finance and contract processes. TIO Hub does not perform that transaction.
8. Reconcile the next period's opening position and retain approved workpapers under finance retention rules.

Require separation of preparer and reviewer for material assessments. Any manual adjustment must include amount, currency, source authority, reason, approver, effective date and an auditable reference. Thresholds and accounting treatment are organization-specific and are not prescribed here.

### Monthly reconciliation workpaper schema

| Workpaper column | Required content |
|---|---|
| Population control | Period, client/contract filters, timezone, report key, export/job ID, extraction time, row count and preparer |
| Contract basis | Executed source, clause/version, dates, currency, formula, cap, term cohort or monetary-amendment cohort |
| Case basis | Case reference, contract-link history, priority snapshot, response/resolution status, deadlines/actuals, pause intervals and evidence locator |
| Calculation | Candidate amount/unit, independent recomputation, cohort total before/after cap, rounding and variance |
| Disposition | Approved for further review, excluded, pending evidence, disputed, corrected or rejected; rationale, owner and due date |
| Authorization | Preparer, independent reviewer, approver, timestamp, workpaper version and any separate transaction reference |

The workpaper is an external controlled finance artifact unless an approved implementation establishes an equivalent. Reconcile export population to case sources, explain additions/removals from the prior period, and retain superseded calculations rather than overwrite them.

## 8. Management reporting and metric dictionary

![Fictional operational record-count snapshot](assets/demo-operations-chart.png)

*Illustrative local development counts only; not a performance result or benchmark.*

Use Reporting Center reports as operational views over accessible records. The server validates filters; date ranges are calendar days in the selected time zone and the end day is inclusive. Keep the exact filters, columns, zone and export/job identity with management packs. CSV/Excel exports are access-controlled and audited; scheduled runs create a separate file for each recipient using that recipient's directly assigned roles and provide in-hub notifications. Files expire after the configured retention (14 days by documented baseline); row limit defaults to 100,000. Do not send a scheduled file by email based on a product assumption.

| KPI | Documented definition | Interpretation guardrail |
|---|---|---|
| Response SLA rate | Met response obligations ÷ (met + breached response obligations). | Excludes pending and not measurable; show denominator and period. |
| Resolution SLA rate | Met resolution obligations ÷ (met + breached resolution obligations). | Same denominator caveat; completion point follows the documented case transition. |
| SLA at risk | Pending obligation with deadline within 24 hours. | Warning population; not a forecast of breach probability. |
| SLA breach | Recorded response or resolution outcome is breached. | Validate terms and event evidence before financial or customer determination. |
| Commitment on-time rate | Completed by deadline in force ÷ completed, for non-cancelled commitments. | Distinct from case SLA; report cancellations separately. |
| Case aging | Open case age buckets 0-7, 8-30, 31-90 and over 90 days, plus overdue/unassigned. | Aging is not severity or contractual lateness by itself. |
| Team workload | Open/overdue cases and commitments per team / owner; critical/high work. | Counts need staffing, complexity and period context; not a productivity score. |
| Client health | Open/overdue cases, commitments, escalations, data quality and SLA measures. | Composite view is attention-oriented; do not describe as an objective customer score. |

### Monthly management pack standard

1. **Control cover:** release/environment, reporting period, timezone, extraction time, report/export IDs, preparer/reviewer and distribution classification.
2. **Portfolio view:** contract population by active/expiring/expired status, notice dates, cases without a measurable obligation and unresolved high-impact exceptions.
3. **Service performance:** response/resolution rates with denominators, pending/at-risk/breached/not-measurable counts, trend by opened period, client, team and owner.
4. **Operational execution:** case aging, unassigned/high-priority queue, overdue commitments, escalations, duty coverage and handover exceptions.
5. **Financial reconciliation:** candidate population, clause/cap cohort, amount/currency only after independent validation, variances, disputes and approval state.
6. **Decisions and actions:** root-cause themes, affected controls, owners/due dates, escalation authority, decision log and next review.

Store the pack under approved access controls. A screenshot or chart without population, definition and extraction timestamp is not decision evidence.

### Metric interpretation and assurance checks

| Check | Reconciliation test | Failure response |
|---|---|---|
| Population integrity | Report count reconciles to the accessible query for frozen filters; sample cases match | Stop distribution; capture export ID and compare implementation and scope |
| Denominator integrity | Measured denominator equals met + breached; pending/not-measurable excluded as defined | Correct interpretation and issue superseding report with explanation |
| Time integrity | Inclusive date boundary uses selected timezone; deadlines align with stored calendar snapshot | Recompute sample and route DST/calendar discrepancy to Engineering/Service Owner |
| Coverage integrity | Eligible cases are linked; historical unlinked population shown separately | Assign owner to verify linkage; never bulk-link based on assumption |
| Financial lineage | Each amount traces to clause, snapshot, case evidence and cap cohort | Hold financial disposition and open reconciliation exception |

Do not use a KPI as an individual productivity measure without a separately approved context-aware policy. Complexity, staffing, customer waits, severity mix and data completeness affect interpretation.

## 9. Exceptions, disputes and correction management

Open a review when the wrong contract was linked, terms were amended, priority or event chronology is challenged, a pause is unsupported, an SLA is not measurable, a report population differs from source cases, or a financial assessment fails reconciliation. Preserve the original record and audit history. Assign an independent reviewer, scope affected cases / period, record root cause and determine whether a permitted correction is required. Do not silently overwrite history, delete evidence, backdate response events or treat a report export as an approved finance workpaper.

When a correction is authorized, record the reason, evidence, decision owner, affected identifiers, effective date, resulting recalculation scope, reviewer and customer / finance communication decision. Escalate product defects through the release process. A dispute about contract interpretation goes to Legal/Commercial; a posting question goes to Finance; a process or coverage issue goes to the Service Owner.

## 10. Access, records and quality controls

Access is based on business role and scope plus resource/action permissions; administrative role alone does not imply access to client records, audit, exports or restore. Restrict contract, technical detail, audit and export grants to approved roles. Review user and recipient access before scheduled reporting; each scheduled recipient gets a separately scoped file. Protect exported spreadsheets as operational and potentially commercial records, keep them only under approved retention, and do not include secrets or unnecessary personal data in notes or attachments.

Contract, case and report records must have accountable owners, source evidence references where permitted, accurate dates, clear aliases in customer-facing material and review dates for source data. Apply approved retention, legal hold, privacy, backup, restoration and data-subject procedures for the actual deployment. This playbook does not set legal retention periods or data residency.

## 11. Implementation readiness and approval checklist

Before adopting this playbook, owners must approve: contract record schema and mandatory fields; authoritative document repository; clause interpretation route; calendar and holiday treatment; response/resolution definitions; pause evidence; priority mapping; escalation thresholds and duty coverage; dispute handling; penalty formula, cap cohort, rounding and currency; finance reconciliation authority and materiality; report period/time zone and recipient policy; retention; ITSM integration scope; customer communication; record security; and pilot acceptance measures.

### Source references

- `docs/DECISIONS.md` A61 (contract-linked SLA snapshot and measurement), A62 (Reporting Center definitions and controls), A63 (resource/action rights and indicative penalties), A66 (monthly penalty reconciliation and term cohort rules).
- `docs/DECISION-A63-PERMISSIONS-PENALTIES-WORKFLOWS.md` and `docs/STAGE-2-BUSINESS-ACCURACY.md`.
- `src/TioHub.Api/Modules/Contracts/` and `src/TioHub.Api/Modules/Reporting/` implementation; `docs/REQUIREMENTS-COVERAGE.md`; release and operations documents listed in the controlled register.
- Validate every statement against the deployed version and approved local policy before use.

### Adoption maturity path (proposed)

| Stage | Operating condition | Evidence to advance |
|---|---|---|
| 1. Controlled records | Named owners, executed-source references, minimum contract fields and case ownership | Sampled records reconcile; access/audit paths verified |
| 2. Repeatable service review | Agreed report pack, duty cadence, definitions, handovers and exception log | Two consecutive review cycles reconcile to source records |
| 3. Independent financial control | Finance workpaper, cohort/cap method, separation of duties and dispositions | Independent recomputation and approvals complete for a representative period |
| 4. Optimized governance | Trend/root-cause review, renewal controls, quality indicators and integration design | Approved measures show stable data quality; integration/security design accepted |

These stages are an internal adoption sequence, not a product rating, certification, customer result or promise of elapsed time.

## Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | New operating model for SLA, contract, finance and ITSM work management | Draft; approval pending |
| 1.1 | 24 Oct 2026 | Added segregation of duties, contract field controls, SLA decision gates, finance workpaper schema, pack assurance and maturity path | Draft; approval pending |
