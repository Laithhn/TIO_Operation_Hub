# 08 — Dashboard and KPI validation

## Conclusion

**The arithmetic is correct; the inputs to three KPI families are not protected.** Every count that could be recomputed independently matched exactly, and every tile leads to a list of the same size. The contractual SLA rates, the commitment on-time rate and anything derived from priority or due date can however be changed after the fact by ordinary user actions (TIO-DEV-AUDIT-001 to 005), so those figures are *accurate summaries of data that is not trustworthy enough for contractual or performance reporting*.

## 1. Independent recalculation (SQL against the audit database vs API)

Taken at the same moment (11 Nov 2026 12:05 UTC, synthetic records present). SQL was written by the auditor directly against tables `work.Case`, `work.Commitment`, `work.CaseWaitingInterval`; "open" = status not Closed/Cancelled.

| KPI | Formula used by the auditor | Expected (SQL) | Observed (API/UI) | Match |
|---|---|---|---|---|
| Open cases | open | 25 | 25 | ✔ |
| Overdue cases | open and due < now | 3 | 3 | ✔ |
| Open cases without deadline | open and due is null | 20 | 20 | ✔ |
| Unassigned cases | open and no owner | 4 | 4 | ✔ |
| Waiting cases | open and waiting reason set | 4 | 4 | ✔ |
| Next review passed | open and next review < now | 2 | 2 | ✔ |
| Critical or high (Command Center) | open and priority Critical/High | 15 | 15 | ✔ |
| Deadline risk: past due / no date | as above | 3 / 20 | 3 / 20 | ✔ |
| Opened in last 30 days | created ≥ now − 30 d | 12 | 12 | ✔ |
| SLA population: client cases opened in period, not cancelled | — | 11 | 11 | ✔ |
| …of which linked to a contract | — | 4 | 4 (7 without) | ✔ |
| Open commitments | status Open | 19 | 19 | ✔ |
| Overdue commitments | open and due < now | 8 | 8 | ✔ |
| Commitments due in 7 days | open, due in [now, now+7d) | 2 | 2 | ✔ |
| Average age of open cases | mean(now − created) | 41.7 d | 41.7 d | ✔ |
| Total recorded waiting | Σ interval lengths, open cases | 3,840 h | 3,840.6 h | ✔ |

16 of 16 match. "Stale cases" (2) was not recomputed because it depends on the review-policy configuration.

## 2. Tile → list consistency

All 10 tiles of `/dashboard` (7 case, 3 commitment) returned a `drilldown` whose list `totalCount` equals the tile value (automated: "every dashboard KPI equals the size of its drill-down list").

## 3. Reaction to known synthetic records

| Action | Open | Overdue | Unassigned |
|---|---|---|---|
| Before | n | m | k |
| Create one unassigned case due 1 Jan 2026 | n+1 | m+1 | k+1 |
| Cancel it | n | m | (k) |

Automated test "a new overdue synthetic case moves Open, Overdue and Unassigned by exactly one" passes; data refresh is immediate (no caching delay observed).

## 4. Contractual SLA band — demonstration of the integrity problem

Synthetic contract: Critical 1 min / 2 min, High 60 / 240 min, Low 6,000 / 60,000 min, calendar hours.

| Moment | Response met / breached | Rate shown |
|---|---|---|
| Cases A, B, C (Critical) past their deadlines; H (High) answered in time | 1 / 3 (from the four case states; list filter `sla=breached` returned 3) | 25 % (calculated, tile not captured at this moment) |
| After back-dated response on B, priority change on A, contract unlink on C | **3 / 0** (Command Center API) | **100 %** (observed) |

State definitions themselves behave as documented: Pending past its deadline is shown as Breached at once; a case whose priority has no target is *Not measurable* and excluded; unlinked cases are *Not applicable*.

## 5. Reports and exports

| Check | Expected | Observed |
|---|---|---|
| Cases report preview total vs case list (client filter, all statuses) | equal | 6 = 6 |
| CSV export row count vs preview | equal | 6 = 6 |
| CSV header block | report, time, zone, user, filters, column definitions | present |
| Formula injection | cell text neutralised | `'=HYPERLINK(…`, `'@SUM(…` |
| All 13 report previews | 200 with rows, summary, columns | 13 of 13, 22–125 ms |
| Unknown filter key / PDF format / unknown report | 422 / 422 / 404 | as expected |
| Download by another user | refused | 404 |

Excel export was generated (201, Completed) but its content was not opened and compared.

## 6. Observations on KPI design (professional assessment)

| Observation | Why it matters | Recommendation |
|---|---|---|
| Rates are shown from very small samples (100 % from n = 3; "Overall 0 %" from n = 1) | Misleading swings | Show n beside every rate; grey out below a minimum sample |
| "Targets met (period)" mixes escalation response, escalation resolution and case due dates in one tile | One number, three populations | Split or label the composition on the tile |
| SLA rates exclude *Not measurable* and unlinked cases (7 of 11 unlinked in the seed) | Coverage of the KPI is unknown to the reader | Show "measured x of y client cases" |
| On-time completion uses the deadline in force | See 005 | Report original and agreed deadline separately |
| Case age is time since creation, not since report | See 015 | Add "reported at" |
| No comparison with the previous period (documented as not done) | Managers cannot see direction | Store daily snapshots |
| Environment health is manually reported; "Unknown" for 10 of 19 seeded environments | Health tile mostly reflects missing reports | Integrate monitoring or show report age prominently |
| 77 action-list items for 15 clients | Queue too long to act on | Tune severity rules with the TIO Manager (documented as "first proposal") |

## 7. Not validated

Chart geometry versus values (charts were only viewed), trend buckets across time-zone boundaries, payments band (no payments in seed), escalation "targets met" arithmetic, scheduled reports, Excel content, map counts.
