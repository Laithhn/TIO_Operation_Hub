# 04 — Business logic and workflow audit

Findings are split into **implemented logic that is wrong or unsafe** (defects) and **process design that should be reconsidered** (improvements). Evidence references are in the issue files.

## 1. Rules tested

| Rule family | Checks run | Verdict |
|---|---|---|
| Mandatory data and formats | 30+ | Enforced consistently on the server |
| Case status transitions | 39 | Enforced; no way found to skip or repeat a step |
| Ownership before work starts | 4 | Enforced (active owner needed to start; deactivated users refused) |
| Closure evidence | 3 | Enforced (evidence, or manager exception with follow-up owner and date) |
| Concurrency | 4 | Enforced (version required, one winner) |
| Dependencies before archive/delete | 5 | Enforced (active contract blocks project archive; servers block environment delete; open work needs manager exception) |
| State after closure/completion | 8 | **Not enforced for edits** (004, 008) |
| SLA measurement integrity | 6 | **Not protected** (001, 002, 003) |
| Deadline integrity | 5 | **Not protected** (005, 007, 012) |
| Uniqueness | 8 | Partly (009) |
| Ownership as access control | 3 | **Not enforced** (010) |

## 2. Defects in implemented logic

### 2.1 The measured SLA can be rewritten after the fact (P1)

Demonstrated on synthetic Critical cases with a 1-minute response and 2-minute resolution target:

| Step | Response | Resolution | Breached cases for the client |
|---|---|---|---|
| Three cases after the deadlines passed | Breached | Breached | 3 |
| Case B: engineer records first response dated at case creation | **Met** | Breached | 3 |
| Case A: manager changes priority Critical → Low | **Met** | **Pending** (new deadline 23 Dec) | 2 |
| Case C: engineer unlinks the contract ("wrong contract") | Not applicable | Not applicable | **1** |

After these three ordinary user actions the Command Center showed *Response compliance 100 %*. None of the actions needed approval; each leaves only a timeline line. A further route is hard deletion of the case (011). **Until this is closed, the SLA band, the SLA compliance report and the client-health report cannot be used as contractual evidence.**

### 2.2 Finished records are not frozen (P1/P2)

Closed and cancelled cases accept changes to title, impact, priority and due date; completed commitments accept changes to description, type, owner and links. Sibling endpoints already contain the correct guard (owner change and progress update are refused on closed cases; revise and cancel are refused on completed commitments), so this is an omission, not a design choice.

### 2.3 "Completed on time" follows the deadline in force (P1)

An overdue commitment (due 1 Nov) was revised by its owner to June 2027 and completed: result *Completed on time*. The original-deadline result (*Late*) is stored but the headline, the dashboard and the performance KPI use the revised date. A commitment's value is the promise made to the customer; a KPI the promiser can reset is not a control.

### 2.4 Clocks start at data entry (P2)

SLA start is the creation time of the hub record, first responses earlier than that are refused, and a commitment cannot be completed at a time before it was typed in. In an operation where incidents arrive by phone, e-mail or Jira and are logged later, this biases every duration in TIO's favour and prevents truthful retrospective logging (015).

### 2.5 Other logic defects

- Past due dates at creation and revision; payment "paid" in the future (007); escalation targets before receipt (012).
- Duplicate records through repeated requests (006) and missing uniqueness for contract references, client names and firewall rules (009).
- Reopened cases keep the previous outcome and evidence as current values (032).

## 3. Workflow design assessment

| Question | Assessment |
|---|---|
| Is each step necessary? | *Triage* and *Pending validation* are valuable for incidents but are compulsory for every type, including low-priority requests. Minimum five actions per case |
| Is responsibility clear? | Owner, backup, coordinator, responsible party and team are recorded and displayed well. But ownership does not restrict who may act (010) |
| Can users see the next step? | Mostly: every open case requires a next action and next review time. On the case page the next step is one of nine equal buttons (021) |
| Are approvals justified? | Triage, reopen, priority, team change and assignment are all reserved for the **Manage** right, held only by the TIO Manager role by default. This concentrates routine coordination in one or two people |
| Can work get stuck? | **Yes.** A case stays *New* until a manager triages it; an engineer cannot start work on a Critical incident without that step (403 confirmed). No timer or alert exists for "New for more than x minutes" apart from the generic stale-review rule |
| Is validation independent? | **No.** The engineer who requests validation can close with a line of evidence text; no customer contact or second person is recorded |
| Is automation missing? | No intake (mail/Jira), no automatic escalation when an SLA is about to breach (only a dashboard count and in-app notices), no reminder outside the application, no automatic priority-based routing |
| Unnecessary manual effort? | Environment condition, first response, Jira keys and waiting periods are all typed by hand; "I confirm this action" tick on routine actions adds clicks without adding safety |

### Inconsistencies in authority

| Action | Case | Commitment | Escalation |
|---|---|---|---|
| Reopen | Manager only | Any engineer | Any engineer (status back to In progress with note) |
| Cancel/withdraw | Any engineer | Any engineer | Any engineer |
| Change deadline | Any engineer, with reason | Any engineer, with reason | Edit |
| Hard delete | Delete right | Delete right | Delete right |

## 4. Business rules to reconsider (recommendations, not defects)

1. **SLA evidence model** — obligations become immutable once Met or Breached; changes create a visible override with approver.
2. **Reported time** — add "reported at" and "resolved at (claimed)" with entry time kept beside them.
3. **Commitment revisions** — distinguish *customer-agreed* revisions (reference required) from internal re-planning; report both on-time rates.
4. **Triage authority** — delegate to team leads/on-call engineers; auto-triage Critical cases.
5. **Short path** — allow Low/Normal requests to go New → In progress → Closed.
6. **Validation** — record who confirmed (customer contact or colleague) instead of free text only.
7. **Deletion** — archive, do not delete, any work record with history.
8. **Ownership** — decide whether it is a control or a label and implement it accordingly.
9. **Not-measurable cases** — treat a missing target or calendar on an Active contract as a data-quality item (031).
