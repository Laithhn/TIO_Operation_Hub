# TIO Hub Knowledge Base

| Control field | Controlled value |
|---|---|
| Document ID | TIO-KB-001 |
| Version / status | 2.1 / Support-article draft |
| Classification | Internal support material |
| Owner / approver | Support lead (proposed) / Service owner (pending) |
| Issue date / review | 24 October 2026 / Review at every release and quarterly |
| Source baseline | Repository working tree reviewed 24 October 2026 |
| Supersedes | Initial portfolio knowledge base dated 24 October 2026 |

## Purpose and support boundary

Use this article set for initial triage of common TIO Hub questions. Check the deployed version and local procedure before giving a definitive answer. Support should request only the minimum information needed and must never ask users to send passwords, authentication tokens, production connection strings or unapproved client data.

## I cannot sign in

Confirm that the user is opening the approved HTTPS address and using the configured authentication mode. Ask an administrator to check account status, lockout, identity resolution and the required role/grant. Windows sign-in depends on IIS and organization identity configuration; Forms sign-in depends on an active hub credential. Development sign-in must not be enabled in Production. Never request or reset a user's password through an unapproved channel.

## I can sign in but cannot see a record

Business-data access may require an appropriate business role and scope in addition to an account. An administrator role alone does not automatically grant client record access. Confirm selected client/project context, filters, archive state and assigned resource/action grants. The documented business visibility policy may be shared across the authorized team; do not promise customer-level tenant isolation. Escalate a suspected unauthorized disclosure immediately through the security incident route.

## A save failed or asks me to reload

Read the validation response and correct required or invalid fields. If the record changed while the user was editing, reload and compare the latest record with the draft before applying the change again. Do not repeatedly resubmit a potentially destructive operation. Capture the record key, time, trace ID and message; omit sensitive content.

## A case SLA is missing, not applicable or unexpected

Confirm the case is linked to the intended same-client contract and that the contract applies for the service and date. Check the copied target, support basis/calendar, pause rule, priority and status history. First response must be an explicitly qualifying customer-facing response at actual send time; resolution is the first move to Pending validation or Closed. Only customer waits can pause the clock when the contract says so; vendor/internal waits do not. Public holidays are not modeled. Later contract changes do not rewrite a case snapshot. Pending obligations within 24 hours are at risk, not forecast breaches; missing measurement is never met. See the user guide and TIO-OPS-003 before interpreting a result.

## A penalty assessment does not match Finance

Treat the assessment as indicative. Finance should define the month and term/cap cohort, compare each candidate to the executed clause and case snapshot, reconcile corrections/legacy references and the cap, and record independent review and disposition. Under the documented A66 decision, unchanged monetary terms share a cap cohort, genuine monetary amendments retain recorded case terms, and a priority change refreshes SLA targets without repricing the penalty. Route any credit, invoice, payment or accounting posting through the authorized finance process; TIO Hub does not issue or settle it.

## Does TIO Hub replace our ITSM tool or sync Jira?

TIO Hub manages case and commitment records, ownership, history, escalations, team coverage and handovers. Jira issue links are manual references; automatic synchronization is not documented. The product does not establish monitoring/event intake or a complete problem, change, release or major-incident management suite. Follow local ITSM procedures and verify any integration against the deployed release.

## How should managers review contracts and service performance?

Use the SLA compliance report with a defined period, client/team/owner filters and time zone. Response and resolution rates use met ÷ (met + breached); pending and not measurable are outside that denominator. Reconcile sample cases and contract terms before a service review. Finance owns the separate monthly assessment reconciliation. Use the [service management playbook](service-management-playbook.md) for suggested cadences and controls; local approval is required.

## A report is empty or does not match another screen

Check selected report, date semantics, time zone, filters, access scope, report refresh/data timestamp and whether the report counts the same statuses/events as the screen. Report filters are validated and may be refused when invalid for the user. Compare a small permitted record sample with the report definition. Capture report key, filters, time zone and export ID; do not send a full dataset to support unless approved.

## A scheduled report did not run

Confirm that the schedule is active, local time and zone are valid, recipients are active and retain Export permission, and filters remain valid for each recipient. Review the run history and service logs under the local operating procedure. A paused or disabled scheduler does not perform catch-up runs. Scheduled report results create in-hub notifications; the product does not send email in the documented design.

## I cannot download an attachment or export

Confirm the current user is authorized and, for exports, is the user who generated that file. Exports expire according to configured retention; generate a new export when permitted. A missing attachment may indicate that file storage was not restored with the database or that the configured path is unavailable. Report the trace ID, record key and file name; never copy the attachment into an unapproved location.

## The environment health or version looks wrong

TIO Hub does not poll customer systems to confirm current infrastructure state. Review the condition evidence date, version record, source and accountable owner. Ask the technical owner to validate the source system. Update the record with current evidence through the normal permission-controlled workflow.

## What information to include in a support request

Include deployed version/build, page or feature, approximate time and time zone, a non-sensitive record key, steps to reproduce, expected vs observed behavior, trace/correlation ID and whether the issue repeats. For report problems, include report key and filters. Exclude credentials, secrets, full case notes, personal data not needed for triage, and unapproved exports.

## Escalation matrix

| Category | Route |
|---|---|
| Account or permission | TIO Hub administrator; security owner for suspected overexposure |
| Data correctness or contract/SLA | Record owner and contract/service owner |
| Application defect or outage | Approved service desk; on-call route per local service schedule |
| Attachment/export exposure | Security incident route immediately |
| Backup, restore, database or release | DBA and application operations under change control |
| Financial assessment / contract dispute | Finance reviewer for calculation; Legal/Commercial for interpretation; service owner for operational evidence |

Local contacts, severity, response objectives and incident-notification requirements are deployment-specific and must be inserted by the service owner before customer issue.

## Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | Initial FAQ set | Draft |
| 2.0 | 24 Oct 2026 | Rebuilt with diagnostic workflows, evidence capture and escalation boundaries | Draft; pending |
| 2.1 | 24 Oct 2026 | Added SLA interpretation, finance reconciliation and ITSM integration boundary guidance | Draft; pending |
