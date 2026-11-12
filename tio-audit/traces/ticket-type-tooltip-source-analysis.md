# Ticket type tooltip versus configured label

Read-only follow-up, 10 November 2026. No browser action, record mutation or test execution was performed for this analysis. No additional defect record is created here.

## Actual evidence supplied

- [119 overdue drilldown](119-journey-overdue-drilldown.txt) shows CS-2595 linking to `/cases/10795`; the containing generic node has the accessible/title text `Incident`.
- [120 detail](120-journey-ticket-detail.txt) shows that same ticket with `Bug · Client-related` beneath its heading.
- [084 configured ticket types](084-case-types.txt) shows a type labelled `Bug`, with built-in behavior/category `Incident`. Its other displayed labels include Task, Improvement, Epic and Deployment.

## Source distinction

- `src/web/src/pages/ticket/TicketTable.tsx:47` renders the ticket link/title inside `<span title={label(r.type)}>`. There is no type icon in this specific expression. The generic node's Incident text is consistent with the span's title attribute.
- The optional Type column at `TicketTable.tsx:62` also applies the generic enum `label(r.type)` helper.
- Ticket detail at `src/web/src/pages/Cases.tsx:265` renders `T.name('CaseType', c.type)`.
- `src/web/src/hooks.ts:58–68` documents configured type handling: `name` looks up the matching configured code's label; `category` is the separate built-in behavior. The generic `format.ts:60` label function only humanizes the input token; it does not resolve configuration.
- Both the list projection and detail handler use `c.Type` (`src/TioHub.Api/Modules/Work/CaseEndpoints.cs:697` and `:110`). The entity separately retains `TypeCategory` for behavior (`Modules/Work/WorkEntities.cs:17–19`).

## Interpretation

This is source-supported raw-code-versus-configured-label presentation, consistent with a record whose configured type code is Incident and current display label is Bug. The screenshot of configuration confirms Bug's Incident behavior, but the exact raw code was not independently obtained from the deployed API/DB in this subtask. The live 2.59/local 2.60 version difference also remains.

Do not infer an actual type change between list/detail, failed Jira import or Incident-only record classification. The list's generic title should not be counted as an independent visible icon, nor should the presence of Incident in that title be used to claim an active user-selectable type named Incident in the current configuration.

If the lead auditor chooses to record this as a display inconsistency after confirming its intended semantics, a focused correction is to use the shared configured type-name resolver in both tooltip and optional Type column. If built-in behavior is useful, explicitly label it as such. Verify code/label renames and historical/retired configured types in approved fixtures. No such implementation change was performed.
