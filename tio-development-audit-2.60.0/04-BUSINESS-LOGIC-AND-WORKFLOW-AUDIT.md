# 04 — Business logic and workflow audit (build 2.60.0)

## Headline

Between 2.29.0 and 2.60.0 the product gained a rights model, data scope, Jira synchronisation, penalties and new dashboards. **The rules that protect recorded history were not changed**: every business-logic finding of the first audit that could be re-tested is still reproducible, and one of them now moves a monetary figure.

## 1. Rules tested

| Rule family | Verdict on 2.60.0 | vs 2.29.0 |
|---|---|---|
| Mandatory data and formats | Enforced | Same |
| Ticket stage transitions, incl. configurable statuses | Enforced; change-status cannot cross a stage | Same, extended |
| Ownership before work starts; closure evidence | Enforced | Same |
| Concurrency | Enforced | Same |
| Dependencies before archive/delete | Enforced; cascade now checks rights per affected record | Improved |
| Data scope per client | Enforced on every route tested except change history | **New** |
| State after closure/completion | **Not enforced** (004, 008) | Unchanged |
| SLA measurement integrity | **Not protected** (001–003) | Unchanged |
| Penalty basis | **Follows the unprotected SLA results** | New exposure |
| Deadline integrity | **Not protected** (005, 007, 012) | Unchanged |
| Uniqueness | Partly (009) | Unchanged |
| Ownership as a control inside a scope | Not enforced (010) | Narrowed |

## 2. Defects in implemented logic

### 2.1 SLA results and penalties can be rewritten (P1)

Synthetic contract: Critical 1 min response / 2 min resolution; penalty clause "EUR 1,000 per breached response".

| Step | Breached responses | Indicative penalty (ticket preview) |
|---|---|---|
| Four Critical tickets after their deadlines | 4 | **EUR 4,000** ("NeedsReview", breachCount 4) |
| Ticket A: manager changes priority to Low | not read between steps | — |
| Ticket B: engineer unlinks the contract | not read between steps | — |
| Ticket C: engineer records a first response dated at creation | not read between steps | — |
| Ticket D: manager deletes the ticket with dependents | 0 after all four actions | **EUR 0** (preview empty) |

In the parallel SLA-only test the Command Center response rate for the client moved from **25 % (1 met, 3 breached) to 100 % (3 met, 0 breached)**; both values were captured from the API.

Two of the four actions need only the engineer's Maintain right. None needs approval. `docs/DECISIONS.md` A66 says priority changes refresh targets "without repricing penalties"; the preview did reprice. Monthly assessments must be confirmed by a holder of `Contracts:Coordinate` (A75), but the confirmation is computed from the same mutable data. Whether a *confirmed* assessment survives later manipulation was not tested.

### 2.2 Finished records are not frozen (P1/P2)

Unchanged: closed tickets accept title, impact, priority and due-date changes; completed commitments accept edits.

### 2.3 "Completed on time" follows the deadline in force (P1)

Unchanged, and now more visible: the Management dashboard tile *Commitments on time* showed **100 %** ("1 completed in the period") while the only commitment completed in that period was the synthetic one that had been overdue and re-dated by its owner.

### 2.4 Clocks and time bounds (P2/P3)

- Synchronised tickets now start their clock at the Jira creation time (A91) — a real improvement for those tickets. Manually created tickets still start at data entry.
- The lower bound on commitment completion was removed rather than tied to a reported time: completion on 1 January 2019 was accepted for a commitment created the same day in 2026. Past due dates, escalation targets before receipt and future paid dates are still accepted.

### 2.5 Other

Duplicate submissions (006), missing uniqueness (009, now also organisation names), previous outcome kept after reopen (032) — unchanged.

## 3. Workflow design

| Question | 2.60.0 assessment | Change |
|---|---|---|
| Is each step necessary? | Minimum path is now New → Opened → In progress → Closed; a Resolved step is optional per configuration | Improved (A77) |
| Can work get stuck at triage? | Yes: triage and reopen need `Cases:Coordinate`, held by the TIO Manager role by default. Rights are now granular, so an administrator *can* grant Coordinate to leads without making them managers — a configuration answer exists | Improved by configurability |
| Is validation independent? | No. The person who did the work closes it with free-text evidence. Now an explicit owner decision (A75: no four-eyes rule) | Documented, unchanged |
| Is responsibility clear? | Yes; ownership still does not restrict who may act within a client scope (010) | Narrowed |
| Automation | Jira synchronisation can create and update tickets, set priority, type, status and first response (not testable here). Nothing leaves the hub: no e-mail or chat notice | Improved (if enabled) |
| Manual effort | "I confirm this action" ticks on routine actions remain; health and (for manual tickets) responses are typed by hand | Unchanged |
| Consistency of authority | Reopen: tickets need Coordinate, commitments and escalations do not | Unchanged |

### New design questions raised by 2.60.0

1. **Jira may close a ticket** and its status text becomes outcome and evidence (A77). This removes the human evidence rule for synchronised tickets; acceptable only if Jira's own workflow enforces verification.
2. **Status versus stage.** People see configurable statuses; rules and error messages use fixed stages. Messages such as "This step needs status PendingValidation" or "…only to Triaged tickets" name stages that are no longer in the status list (022).
3. **Resolution SLA stops at closing** when no Resolved status is configured, so measured resolution times are longer than under 2.29.0 rules (stated in `CASE-STATUSES-A77.md`). Contracts written around "resolved" need a Resolved status.
4. **Penalties are "indicative"** yet carry amounts, currencies and a confirmation step. Until the basis is immutable they should not be shared outside TIO.

## 4. Business rules to reconsider

Unchanged from the first audit and now more urgent because of penalties: (1) immutable SLA results with visible overrides; (2) a "reported at" time for manual tickets; (3) approval for post-due commitment revisions and both on-time rates reported; (4) archive instead of delete for records with history; (5) decide whether ownership is a control; (6) grant Coordinate to team leads by default, or auto-triage Critical tickets.
