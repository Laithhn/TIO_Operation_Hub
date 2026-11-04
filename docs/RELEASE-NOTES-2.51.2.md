# TIO Operations Hub 2.51.2

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. Upgrading from before 2.51.1? Read the 2.51.1 notes as well: its upgrade changes SLA results and has a schema change.

## Case dates and statuses are explicit and consistent (A91)

**Figures change on upgrade. This release has no schema change.**

- **Opened and Added to hub are different dates.** Opened is the Jira creation time of a synchronized case, otherwise the hub creation time. Added to hub is when the record was created, which for an imported case is the import.
- **Age and period figures use Opened.** This covers the case page, case list, dashboard, command center, SLA and aging reports and the report builder. An import no longer counts as newly opened work, so "opened" counts move to the periods when the work was raised. Saved reports on the Created date now read the opening; the report builder also offers Added to hub.
- **Age stops at closing or cancelling.** It used to keep growing on the case page. A reopened case runs on.
- **The SLA clock start on a case shows the time its deadlines use.** Deadlines, elapsed time, breaches and penalties already used the Jira creation time; only the display was wrong.
- **A case that stops being measured loses the due date taken from its old deadline,** so it no longer counts as overdue. Review overdue counts after the upgrade.
- **Open cases by status on the dashboard counts the status shown on each case,** the same as the case list and report builder. Waiting for customer has its own bar and the drilldowns follow. Other waiting reasons keep the status and appear under Waiting cases. Case and aging exports show the same status.

## Other corrections from testing 2.51.0

- **Commitments can be completed before the deadline.** The time must fall between the commitment's creation and now. A completion time before creation, which was accepted when the deadline was also earlier, is now refused.
- **Global search returns focus** to where it was after Escape or a click outside. Escape also works from a result, and choosing a result moves focus to the new page.
- **The new-case form** mentions a risk type only when one is active, by its configured name.
- **The case list has a visible Search all cases field.** The table's own filter and text conditions say they cover this page only, including for screen readers. The Ref field under Filter now searches the whole list; before, it filtered only the current page.

- **The notifications icon is a plain outline bell,** in the header, the menu and the notification list.

## Upgrade

Deploy the application. No database script is needed beyond those of earlier releases. The SLA sweep, which runs soon after start and then every few minutes, clears due dates left on work opened before its contract, 500 cases at a time.

Going back to 2.51.1: redeploy it. Cleared due dates stay cleared, which is correct for those cases.
