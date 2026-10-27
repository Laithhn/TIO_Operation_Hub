# TIO Hub User and Operator Guide

| Control field | Controlled value |
|---|---|
| Document ID | TIO-OPS-001 |
| Version / status | 2.1 / User-guide draft |
| Classification | Internal; customer issue requires service-owner approval |
| Owner / approver | Service owner (proposed) / Operations and Product (pending) |
| Issue date / review | 24 October 2026 / On each deployed release or workflow change |
| Source baseline | Repository working tree reviewed 24 October 2026; illustrative screenshots from local fictional-data build 2.30.0 |
| Supersedes | Initial portfolio user manual dated 24 October 2026 |

## 1. About this guide

This guide explains common user workflows. Navigation, available fields, reports and actions depend on the deployed release, user identity, role, scope and resource/action grants. Follow the organization’s local instructions where they are stricter. If the screen differs from this guide, do not infer permission or product behavior; ask the service administrator and identify the installed version.

TIO Hub stores operational records. Environment condition is reported by people; it is not live monitoring. Jira tickets are manual references. The hub does not send email or retrieve secrets. Never enter passwords, keys, tokens or connection strings into notes, attachments, cases or Jira fields.

## 2. Sign in and confirm your access

1. Open the organization-provided HTTPS address and use the configured sign-in method (Forms or Windows, depending on deployment).
2. Confirm the signed-in account and selected working time zone where shown.
3. If access is denied, ask the administrator to verify account status, assigned roles, scope, resource/action grants and whether the requested record is in scope.
4. Do not use Development sign-in against a production service. Development and test accounts are not production identities.

An administrative role alone may not grant business-record access. Access is evaluated at protected API operations; visible navigation is not a substitute for authorization.

## 3. Find the right client and environment

![Clients register with fictional demonstration records](assets/screenshots/clients.png)

*Fictional development screenshot. Names, organizations, counts and references are examples, not customer records.*

1. Open Clients and search by approved name or alias. Confirm country, status, project or region before editing.
2. Open the client record and review related projects, contacts and responsibility boundaries that your permission allows.
3. Select the relevant environment and verify its purpose, type, owner and evidence date.
4. Review installed products, versions, assets, components, storage and dependencies where technical-detail access is granted.
5. Treat reported condition as an observation. Check the evidence date and review status; confirm the state with the responsible technical owner before relying on it operationally.
6. Add or correct a record only with appropriate rights and reliable evidence. Record the source, date or reason in the designated field/history.

Do not create a duplicate environment merely because a search did not match. Confirm aliases, archive state and client/project scope first.

## 4. Work and review a case

![Cases register with fictional demonstration records](assets/screenshots/cases.png)

*Fictional development screenshot. Example references and case details are not operational evidence.*

1. Find the case under the correct client and scope. Check status, priority, owner, affected records, due date, waiting reason, next action and history.
2. For a new case, use the approved intake path and record a concise title, impact, priority and affected client/environment/asset as appropriate.
3. Assign or accept ownership through the supported workflow. If unassigned or ownership is unclear, use the escalation path in the local SOP.
4. Link a contract only when the applicable customer agreement and case are confirmed. Review the case's recorded SLA snapshot; a later contract edit does not automatically rewrite historic case terms.
5. Record customer response through the explicit response action or a qualifying customer-facing progress event. Internal notes alone do not count as a customer response.
6. Use waiting states only for the supported reason and record the required evidence. Recheck the due time and status when the dependency clears.
7. Review event history before closing or reopening. Confirm customer-facing resolution and any required handover.

Jira values are manual references. A status change in Jira does not update the TIO Hub case automatically.

## 5. Manage a commitment and handover

For commitments, verify owner, due date/time, time zone, status, completion/cancellation and change history. Keep the expected outcome and next update clear. Do not mark work complete solely because a related ticket changed status.

For handovers, provide current status, impact, next action, due time, relevant linked records, outstanding risks and customer communication context. The receiving person should acknowledge according to local policy. Use the manager/coverage process when the recipient is unavailable or no backup is assigned.

## 6. Review contracts and service measures

Confirm the executed contract source, covered service, effective period, renewal, support calendar, priority targets, pause rules and exclusions before using a service measure. Eligible client cases may be linked to a same-client contract; internal work has no contract. Case terms are snapshotted when linked and when priority changes; later contract edits do not rewrite the existing case snapshot. Record first response at the actual time sent through the explicit action. Resolution is the first move to Pending validation or Closed. Verify event chronology and pause evidence before interpreting a result. Public holidays are not modeled in the cited baseline. “At risk” means a pending obligation is within 24 hours of its deadline; it is not a prediction. “Not measurable” must not be counted as met.

Penalty assessments are indicative calculations for review. During monthly review, Finance reconciles candidates to executed clauses, case evidence, recorded term/cap cohorts and corrections. A priority change refreshes SLA targets but does not reprice penalty terms. These records do not create credits, invoices, receivables/payables, payments or accounting entries. Finance and authorized commercial/legal owners determine and approve any external action.

For ITSM work management, keep case owner, priority, affected records, status, event history and next action current. Review commitments, escalations, team coverage and handovers at the agreed service cadence. Jira issue keys are manual references; TIO Hub does not synchronize Jira state. Do not treat these workflows as monitoring, alert intake, complete problem/change management or major-incident command unless your deployed release and separate local procedure establish that capability.

## 7. Use the Reporting Center

![Reporting Center catalog from a fictional development build](assets/screenshots/reporting-center.png)

*Catalog availability and counts depend on role and deployment configuration.*

1. Choose the report that matches the question. Read its description, category and available dimensions.
2. Set the date range and time zone. Confirm whether the end date is inclusive and which event dates the report measures.
3. Set only valid filters you are authorized to use. Preview the result, summary, breakdown, row total and data timestamp before export.
4. Select CSV or Excel, choose permitted columns and ordering, then generate the file. Formatted PDF export is not currently documented as available.
5. Download only exports generated for your account. Export files expire under configured retention; the history record remains. Do not share a file outside the approved business purpose.
6. Create schedules only where authorized. Each recipient receives a result generated under that recipient’s own access. Schedules produce in-hub notifications; they do not send email.
7. If the result seems wrong, record report key, filters, time zone, date/time and export ID and report through the approved support route. Do not forward sensitive data to an unapproved channel.

## 8. Data quality and administration

Data-quality items identify records needing review under configured rules and policies. Assign an accountable coordinator, next action and review date where permitted. Resolve an item only after the source record is corrected or the rule is otherwise satisfied. Users must not bypass the rule evaluator by manually closing the alert.

Administrators should use least privilege, confirm the target resource before changing access, review audit history, and follow the approved backup/restore and release procedures. Archive/restore and deletion can affect linked records and are governed by resource/action permissions; request review if the effect is unclear.

## 9. Troubleshooting quick guide

| Symptom | First checks | Escalate with |
|---|---|---|
| Sign-in rejected | Address, account status, configured auth mode, lockout notice | Approximate time, account identifier (never password), trace ID if shown |
| Record missing | Client/project scope, filters, archive state, alias | Record key, page, filters and permission context |
| Save rejected | Required fields, validation message, concurrent edit/version conflict | Record key, exact field error and time |
| Report empty or unexpected | Report description, date range/time zone, filters, role/scope | Report key, filters, row count, export ID |
| Attachment unavailable | Ownership/access, expiration/configured path, file-missing message | Record key, attachment name, trace ID; do not send the file unless approved |
| Dashboard differs from expectations | Reporting period, definition, role, data freshness and source record | KPI name, selected period, source examples and time zone |

## 10. Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | Initial user manual | Draft |
| 2.0 | 24 Oct 2026 | Rebuilt as role-aware workflow and troubleshooting guide | Draft; service owner approval pending |
| 2.1 | 24 Oct 2026 | Expanded contract/SLA steps and financial/ITSM operating limits | Draft; service owner approval pending |

