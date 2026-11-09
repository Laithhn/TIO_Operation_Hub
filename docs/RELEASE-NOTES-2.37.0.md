# TIO Operations Hub 2.37.0

Production package release, 28 October 2026. This release redesigns the KPI cards of the Operations Command Center and the Reporting Center.

## Changed

- **New KPI card design.**
  - **Look:** white cards with a thin border, rounded corners and a light shadow, on a light dashboard background. The coloured card surfaces of 2.35–2.36 are gone.
  - **Layout of a card:** the icon and title are at the top, the large figure below them, then the supporting lines.
  - **State:** each card shows its state as a text badge — **Critical**, **Attention** or **OK** — as well as in the colour of its icon. Each supporting line has a dot in the colour of what it counts.
- **Operations Command Center.**
  - **Main cards (one row):** Active contracts, Overdue payments, Upcoming commitments, Active escalations, Open cases.
  - **Supporting cards (smaller):** Clients, Targets met (period), Contractual SLA met (period), Environment health and **Data quality** (new: open data-quality items and how many are of high severity).
  - **Bars only for real figures:** contracts due for renewal, escalations past a target, overdue cases, open commitments split into overdue / due within 14 days / later, and environments by reported condition.
  - **No trend arrows:** the hub keeps no history of these figures, so no comparison with a previous period is shown.
- **How the state is decided.** Each card uses its existing rules; no new thresholds were introduced.
  - **Critical:** something is overdue or past a target — an overdue case, commitment or payment, an escalation past a target, an unavailable environment, or an open case that breached its contractual SLA.
  - **Attention:**
    - commitments due within 14 days;
    - contracts due for renewal or needing review;
    - active escalations;
    - critical or high-priority cases;
    - degraded environments;
    - high-severity data-quality items;
    - cases approaching a deadline.
  - **OK:** none of these.
  - **Changes from 2.36:**
    - Upcoming commitments shows **Attention** (not Critical) when commitments are only due soon; it shows **Critical** when commitments are overdue.
    - Active escalations shows **Attention** whenever escalations are active.
- **Not available** figures, such as a rate with nothing measured in the period, are shown as a muted state with an explanation on hover, not as a number.
- **While loading**, the cards appear at their final size with placeholders, so the page no longer jumps when the figures arrive.
- **Cards per row:** five on large desktops (including 1366 × 768), three at 1024 px, two on tablets and one on phones. Text wraps instead of being cut off.
- **Keyboard:** each card that opens a list is a single tab stop with a visible focus ring; Enter opens the list. Screen readers read the figure, its state and every supporting line.

No figure, filter, link, permission or API changed. Cards that a user does not see today stay hidden (for example the contract figures in *My work*).

## Database and deployment

There are no database schema changes, and no migration is needed when upgrading from 2.33.x–2.36.x. Replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time.

The deployment notes and known limitations of 2.36.0 still apply (see `RELEASE-NOTES-2.36.0.md`).

## Validation

- TypeScript and production build: passed. Unit tests (Vitest): 9/9 passed.
- Playwright end-to-end suite: 93 of 94 passed in the full run. The one failure (the value colour) was fixed, and the two tests it affects were re-run and passed; the full suite was not run again after that fix.
- The new KPI test covers the card order, states, keyboard use, the loading state and the layout at 1366, 1024, 768 and 390 px.
- .NET test suite: the release script reruns it, and `BUILD-INFO.txt` records the source commit.
- No screen-reader session was run; the cards' accessible names were checked in the browser and by the tests.
