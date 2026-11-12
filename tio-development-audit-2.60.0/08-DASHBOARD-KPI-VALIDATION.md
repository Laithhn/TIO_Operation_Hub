# 08 — Dashboard and KPI validation (build 2.60.0)

## Conclusion

Same as for 2.29.0, with higher stakes: **the arithmetic is correct and every tile equals its list; the inputs to SLA, penalty and on-time figures are not protected.** Five dashboards now present those figures to different audiences, one of them to management with period comparisons.

## 1. Independent recalculation (SQL vs API, same moment, synthetic records present)

| KPI | Expected (SQL) | Observed (API) | Match |
|---|---|---|---|
| Open tickets | 30 | 30 | ✔ |
| Overdue tickets | 3 | 3 | ✔ |
| Open without deadline | 25 | 25 | ✔ |
| Unassigned | 9 | 9 | ✔ |
| Waiting | 4 | 4 | ✔ |
| Next review passed | 2 | 2 | ✔ |
| Critical or high (Command Center) | 17 | 17 | ✔ |
| Opened in last 30 days | 19 | 19 | ✔ |
| Open commitments | 17 | 17 | ✔ |
| Overdue commitments | 9 | 9 | ✔ |
| Commitments due in 7 days | 2 | 2 | ✔ |
| Active escalations | 2 | 2 | ✔ |
| Clients (Management dashboard) | 18 | 18 | ✔ |
| Average age of open tickets | 34.7 d | 34.8 d | ✔ (rounding; queries seconds apart) |

14 of 14 match. Not recomputed: stale tickets (policy-dependent), environment health, contract tiles, payment tiles.

## 2. Consistency checks

| Check | Result |
|---|---|
| 10 Command Center tiles vs their drill-down lists | 10 of 10 equal (automated) |
| One synthetic overdue unassigned ticket | Open, Overdue, Unassigned each +1; back after cancel (automated) |
| Overview page figure vs API | Equal (automated; tile label "Open tickets: n") |
| Scoped engineer's dashboard | Open tickets = tickets visible to that engineer (5 = 5); all five dashboard payloads smaller than the manager's |
| Report preview vs list vs CSV export | Equal; formulas neutralised; download owner-only |

## 3. Demonstrated distortion of figures

| Figure | Before | After ordinary user actions | Issue |
|---|---|---|---|
| Command Center response compliance (client filter) | 25 % (1 met / 3 breached) | **100 %** (3 met / 0 breached) | 001–003 |
| Breached tickets in list (`sla=breached`) | 3 | 1 | 001, 002 |
| Indicative penalty for the month | EUR 4,000 | **EUR 0** | 001–003, 011 |
| Management dashboard "Commitments on time" | — | 100 % ("1 completed in the period": the re-dated synthetic commitment) | 005 |

## 4. New dashboards — observations

| Dashboard | Strengths | Concerns |
|---|---|---|
| My dashboard | Clear personal queue; correct landing page for engineers | — |
| Operational | Workload, hygiene, "at risk" threshold stated | Not validated against SQL |
| SLA & Contracts | Shows measured, pending and *not measurable* counts with reasons; 90 % objective; previous-period delta | Rates from very small samples still shown as headline percentages ("0 %" from 1 measured); depends on mutable SLA data |
| Management | Period-to-date compared with the same number of days of the previous period; "data trust" section | "Median time to resolve 0 d" and "+108.3 %" backlog on seed data show how volatile small numbers are; status badges ("ATTENTION" beside 100 %) are hard to interpret |
| Client | Recorded status per client plus rule-based signals with the rule text shown | No seeded client has a recorded status (16 of 17 without one; the seventeenth was set by the audit): the page is only as good as manual reporting |

Improvements since 2.29.0 that address earlier observations: measured-count shown beside SLA rates, previous-period comparison, reasons for not-measurable tickets, internal page scrolling instead of one very long page.

## 5. Not validated

Chart geometry, trend buckets across time zones, payments and contract tiles, penalty monthly assessments and caps, operational/management dashboard arithmetic beyond the figures above, Excel export content, scheduled and queued exports, figures for synchronised Jira tickets.
