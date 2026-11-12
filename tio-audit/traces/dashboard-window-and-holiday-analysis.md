# Dashboard windows and holiday-calendar interpretation

10 November 2026. Supplemental read-only source review prompted by lead-auditor live evidence: executive dashboard card/help describes commitments due within 14 days; Administration settings shows `Dashboard.UpcomingDays=7`; chart buckets use 7/30 days. Separately, contract CT1001 reportedly has Support notes `Public Holidays Excluded`, while the SLA UI discloses that public holidays are not modelled. Screenshots are maintained by the lead auditor; no additional target requests, data changes or test execution were performed here.

## Executive commitment window: intentionally fixed at 14 days

The observed 14-day executive card has explicit release documentation:

- `docs/RELEASE-NOTES-2.33.0.md:9` says the Executive overview shows upcoming commitments within 14 days and opens the matching 14-day commitment list.
- `docs/RELEASE-NOTES-2.37.0.md:14` describes open-commitment parts as overdue, due within 14 days and later; `:19` repeats 14 days for the action section.
- `src/TioHub.Api/Modules/Reporting/DashboardEndpoints.cs:49` sets `commitmentWindowDays=14`; the response returns this as `upcomingDays` at `:66`, and the KPI definition/query/drilldown all use 14 at `:89`. The drilldown explicitly passes `upcomingDays=14`.
- The same file uses 14 for approaching commitments in the action list (`:112`, `:140`).
- `tests/TioHub.Tests/AcceptanceTests.cs:674` explicitly asserts that the dashboard returns `upcomingDays=14`; the test then reconciles measure counts with their drilldowns. This is existing test intent, not an executed audit pass.
- `src/web/src/pages/Dashboard.tsx:162` and `:165` use the response's `dash.upcomingDays` in the card labels; the rendered 14 is not independently guessed by the frontend.

The configurable setting still has other consumers:

- Seed description at `src/TioHub.Api/Data/ReferenceData.cs:40` says it is the upcoming window for commitments and defaults to 7.
- `Modules/Shared/Services.cs:33` reads the setting.
- `Modules/Reporting/InsightsEndpoints.cs:30` reads it for charts; `:76–78` builds the configured first bucket, configured+1 through day 30, and later. A value of 7 produces 7-day and 8–30-day buckets.
- `Modules/Commitments/CommitmentEndpoints.cs:73` uses an explicit route override when supplied, otherwise the setting; `:74` validates 1–90.

**Conclusion:** the 7-versus-14 observation alone does not prove a broken calculation or ignored requirement. There is documented intent for a fixed executive 14-day view. A useful **P4 usability/configuration improvement** is to explain the setting's scope and state that executive KPI/action windows remain 14 days, or obtain owner approval to unify the windows. Different explicitly labelled windows can legitimately produce different counts. The actual KPI value of 1 was not mathematically reconciled by this source review.

If the lead auditor observes a card drilldown opening a 7-day list despite the 14-day label, or a count differing from a 14-day list at the same evaluation time/scope, that would be separate live evidence of a defect. No such failure is asserted here.

## Holiday exclusions: disclosed implementation gap with possible contractual consequence

Verified source/doc facts:

- `docs/DECISIONS.md` A61, line 71 explicitly states public holidays are not modelled because there is no holiday calendar; it leaves holiday support as an open decision.
- `Modules/Work/CaseSla.cs:18–20` describes weekday/time-zone support windows and explicitly says public holidays are not modelled.
- `SlaCalendar` (`CaseSla.cs:11`) has round-the-clock, weekday flags, start/end time and time zone, with no holiday collection.
- Snapshot/calculate code copies structured support calendar fields (`CaseSla.cs:159–164`) and creates the calendar from those fields (`:179–184`). It does not interpret free-text support notes as a holiday calendar.
- `src/web/src/pages/Contracts.tsx:418` offers a Support notes placeholder of `e.g. Public holidays excluded`; `:183` displays that free-text value. Notes communicate the term to a person, but do not implement the exclusion.
- `docs/DECISIONS.md` A49, line 83 describes the earlier free-text support value becoming Support notes alongside the structured calendar.

**Conclusion:** the reported CT1001 note combined with a holiday disclaimer is an **unverified contractual measurement risk**, not proof that any specific SLA deadline, breach, compliance rate or penalty is wrong. Establishing an actual error requires the signed/approved contract calendar, relevant jurisdiction's holidays, a measured case whose counted interval crosses an excluded holiday, target basis and snapshot, and a manual or approved test comparison. These were not available to this source review.

Potential impact if the exclusion applies: a structured weekday calendar can count an excluded holiday, setting a deadline earlier and overstating elapsed support time/breaches; compliance or indicative penalties could then be misleading. This is conditional, not an observed outcome.

Suggested action: contract owner and service manager reconcile notes with supported measurement semantics and flag affected contracts/reports pending validation. If holiday exclusion is mandatory, add approved per-contract/jurisdiction calendar support, version/snapshot semantics and boundary regression tests before treating affected SLA output as contractual evidence. Preserve current historical snapshots and review existing results through an explicit owner-approved process; do not silently recalculate production records.
