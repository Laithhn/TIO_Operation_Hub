# ITSM assessment package

**5 November 2026 · Limited observed scope · Non-production**

This package records the evidence gathered so far and identifies the testing needed for a broader readiness decision. It is an ITIL 4 alignment assessment using a custom scoring rubric, not an official certification or a formal maturity assessment. The eight reports are:

1. [Executive assessment and executive questions](01-executive-assessment.md)
2. [ITIL 4 practice assessment matrix](02-itil-matrix.md)
3. [Functional inventory and detailed UAT results](03-uat-and-inventory.md)
4. [Functional and business gap register](04-gap-register.md)
5. [Continuous improvement backlog](05-improvement-backlog.md)
6. [Role and permission assessment](06-role-permissions.md)
7. [KPI and reporting assessment](07-kpi-reporting.md)
8. [Prioritized improvement roadmap](08-roadmap.md)

The inventory and test results distinguish tested behavior from discovered but untested screens. The current evidence does not establish complete module coverage, exhaustive authorization enforcement, deployed SLA calculation accuracy or production readiness. Recommendations outside the observed product scope are conditional on owner decisions. The records created for UAT remain in the non-production application; their final observed states and impact are in the executive assessment.


**User clarification, 5 November 2026:** The user stated that everyone can authorize case closure without evidence; Engineers should receive operational notifications but not contract or finance notifications; public holidays should be configurable per client, with one calendar for the whole client and no project override; the product boundaries for service requests, problem management, change, monitoring and knowledge remain undecided; and internal cases should be eligible for linked escalations. Additional clearly labeled non-production test clients, contracts and cases are authorized, without changing existing contract terms or triggering external integrations. These statements define desired direction, not proof of current functionality or exclusion enforcement.


**Controlled SLA fixture, 5 November 2026:** The non-production test client UAT_SLA_20261105, its project, [contract CT-1005](https://nb01994.vitronic.de/contracts/5) and [case CS-1298](https://nb01994.vitronic.de/cases/9498) used support hours 09:00–17:00 every day in Asia/Dubai, a 40-support-hour response and resolution target, and customer-wait pause off. The contract notes described fictional 6 November as an excluded holiday. From the displayed clock start of 5 November 10:27, the application displayed 10 November 10:27 for both deadlines. Independent arithmetic gives 10 November 10:27 when 6 November is counted, and 11 November 10:27 when it is excluded. The note-only exclusion was therefore not applied in this fixture. No holiday-date input appeared in the inspected contract form; a free-text note is not a configured holiday. The client edit form showed no holiday/calendar field, and Administration searches for “holiday” and “calendar” each returned zero pages. This confirms a gap in the inspected UI against the user-requested client calendar, not that configuration is impossible through every route; uninspected routes and configured holiday enforcement remain unverified. The client, project and contract remain active and the case remains open; these persistent test records can affect non-production metrics.
