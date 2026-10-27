# TIO Hub Standard Operating Procedures

| Control field | Controlled value |
|---|---|
| Document ID | TIO-OPS-002 |
| Version / status | 2.1 / Procedure templates - local approval required |
| Classification | Internal operations |
| Owner / approver | Operations lead (proposed) / Service owner (pending) |
| Issue date / review | 24 October 2026 / At each release and after major incidents |
| Source baseline | Repository working tree reviewed 24 October 2026 |
| Supersedes | Initial SOP playbook dated 24 October 2026 |

## 1. Purpose and authority

These procedures define baseline checks for an organization operating TIO Hub. They do not replace the approved change policy, incident plan, DBA runbook, security policy, customer contract, or legal obligations. Before issue, the service owner must add named roles, contact routes, severity levels, approval thresholds, evidence locations, time windows, and retention rules.

## 2. Roles and separation of duties

| Role | Accountability | Control |
|---|---|---|
| Business record owner | Maintain client, environment, case, or contract records | Verify facts from approved sources; record review date |
| Case owner | Maintain state, next action, response, and handover | Use supported workflow and preserve event history |
| Operations lead | Review work, coverage, escalation, and data quality | Assign action owner and due date; review unresolved risks |
| Application administrator | Manage accounts, grants, settings, and reference data | Least privilege; admin rights do not imply business-data access |
| Release owner | Coordinate package, validation, approvals, and evidence | Cannot bypass DBA, security, or production change approval |
| DBA | Review/apply schema scripts; manage database backup and restore | Production changes follow the approved database change process |
| Security/privacy owner | Review access, incident, data handling, and assurance requests | Need-to-know evidence access and incident preservation |

## 3. SOP-01: Daily operational review

**Trigger:** Agreed service review or start-of-shift handover. **Owner:** Duty operations lead. **Inputs:** Executive overview, Action list, cases, commitments, escalations, renewals, and data-quality results. **Record:** Date/time zone, attendees, exceptions, actions, owners, due dates, and review evidence.

1. Sign in through the approved identity method. Confirm the account and reporting period/time zone.
2. Review urgent/overdue cases, escalations, unassigned work, commitments, and contract renewals. Follow each summary item to the source record; counts alone are not evidence.
3. Confirm owner, due time, next action, waiting reason, and latest event. Assign or escalate under local authority.
4. Review degraded or unknown environment reports with the technical owner. Treat condition as a recorded observation, not automated monitoring.
5. Review data-quality items, coordinator, next action, and review date. Route missing policy or ownership to the accountable lead.
6. Record material decisions and follow-up. Avoid secrets and unnecessary personal/client detail.
7. Handover unresolved critical work to a named recipient; record acknowledgment or exception.

**Completion:** Critical work has an owner or escalation; imminent due actions have a follow-up; data-quality gaps have accountable action; outstanding work is acknowledged at handover.

## 4. SOP-02: Case intake, triage, and closure

**Trigger:** New support request or material update through an approved channel. **Owner:** Intake/case owner. **Record:** Case and any approved external ticket reference.

1. Verify request authenticity and client/environment under local support rules. Do not collect secrets.
2. Create/update the correct case with concise summary, impact, priority, affected records, accountable owner, and time-bounded next action.
3. Link a contract only after confirming service coverage, effective dates, and applicable terms. Review the case's recorded SLA snapshot.
4. Record first response through the explicit response action or qualifying customer-facing event; internal notes alone do not count.
5. Use status and waiting transitions only under the supported workflow. Record the reason and recheck the due time when the dependency clears.
6. Preserve history. At transfer, provide a structured handover and obtain acknowledgment. At closure, verify outcome, customer communication, and related records.
7. Suspected wrong-client exposure or security/privacy incident: stop routine handling and follow SOP-07 immediately.

## 5. SOP-03: Contract and SLA review

**Trigger:** New/renewed contract, changed terms, customer dispute, or service review. **Owner:** Contract owner. **Approver:** Authorized commercial/legal owner. **Record:** Approved terms and controlled source reference.

Confirm executed source, legal parties, covered service, effective dates, renewal, notice period, priority targets, time zone, support window, pause conditions, exclusions, penalty clause and cap, currency, and authorized approval. Enter only agreed values and obtain an independent field check against the approved source. Link eligible same-client cases explicitly; historical cases are not auto-linked. Later contract edits do not rewrite existing case snapshots. Verify first response at actual time sent, resolution transition, customer-wait pause evidence, chronology and sample calculations. Public holidays are not modeled. Penalty assessments are indicative; they are not accounting instructions, credits, payments or legal conclusions. Obtain Finance and contract-owner review before external communication.

For monthly financial reconciliation, Finance defines the period and cohort, checks each candidate against the executed clause and recorded case terms, reconciles corrections and legacy keys, verifies cap consumption, separates genuine monetary amendments, documents exclusions/disputes/approvals and routes any actual credit, invoice or posting through the approved external finance process. Separate preparer and reviewer for material amounts. TIO Hub does not issue or settle a financial transaction.

The service-management cadence should review at-risk and overdue cases each duty shift, backlog/ownership and renewals weekly, and reconciled SLA measures and financial candidates monthly. Name owners, backups, escalation authority, report filters/time zone and evidence location locally. Jira entries are manual references; do not assume synchronization. Monitoring/event intake, problem/change, major incident, CAB and customer communication follow separate approved procedures unless specifically established for the deployed release.

## 6. SOP-04: Release and schema upgrade

**Trigger:** Approved release request. **Accountable:** Release owner. **Participants:** DBA, application operations, business approver, security as required. **Evidence:** Change record, source/version, package hash, backup, schema approval, validation, rollback decision.

1. Verify intended commit/tag, package version, build information, approved working-tree state, and SHA-256. Inspect the package for secrets and Development settings.
2. Review every migration and generated idempotent SQL script. Confirm migration coverage and assess data effects, compatibility, and rollback. Production startup migrations remain disabled.
3. Agree change window, user communication, stop/rollback criteria, and decision-maker. Confirm database and required file-storage backup.
4. DBA applies the reviewed schema using the approved process and records target, script hash, time, and result.
5. Deploy the matching application. Verify readiness, sign-in, authorization positive and negative paths, key workflows, reporting, storage, and logs.
6. Do not declare success while readiness or a critical check fails. Invoke the approved rollback and data reconciliation plan if thresholds are met.
7. Obtain approver acceptance and close the change with complete evidence.

## 7. SOP-05: Backup and restore exercise

**Owner:** DBA and service owner. **Target:** Isolated recovery environment. **Record:** Backup identity, restore times, integrity checks, scope, actual RPO/RTO, deviations, and approvals.

1. Confirm a consistent database backup and required attachments/application data are available.
2. Restore into an isolated database and file path; do not overwrite production or shared development data.
3. Verify readiness, sign-in, authorization, representative client/environment/case/commitment records, and audit history.
4. Test file-backed content, retention, and ownership without exposing data to unauthorized testers.
5. Record elapsed time, counts/checks, failures, corrective action owner, and sign-off. A development drill is not evidence of production-scale recovery.

## 8. SOP-06: Access changes and review

For joiner/mover/leaver, scope change, concern, or periodic review, confirm identity and business need; select minimum role, scope, resource/action rights, export/technical/audit grants, expiry, and segregation requirements. Obtain business-owner approval, apply the change, test allowed and denied paths, and retain audit/request evidence. Revoke access promptly on departure under local policy. Never broaden access to work around a missing record.

## 9. SOP-07: Security/privacy incident

For suspected unauthorized access, wrong-recipient file, lost storage, unexpected exposure, credential compromise, or integrity issue: immediately use the organization's incident route; contain exposure within authority; preserve logs, audit IDs, timestamps, and affected scope; avoid deleting evidence or sending sensitive samples over unapproved channels. Security/privacy/legal owners decide notification obligations, evidence hold, customer/regulator communications, and recovery. This procedure does not set legal notification deadlines.

## 10. Execution record and issue checklist

A procedure record should include procedure ID/version, operator, time zone, system version/environment, inputs, approvals, actions, outcome, exceptions, evidence links, and follow-up owner. Before local release, insert contact matrix, severity model, escalation window, change authority, recovery targets, backup/retention policy, incident process, evidence repository, and authorized signatures.

## 11. Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | Initial SOP set | Draft |
| 2.0 | 24 Oct 2026 | Rebuilt with triggers, role controls, evidence, and completion criteria | Pending local approval |
| 2.1 | 24 Oct 2026 | Added contract lifecycle, SLA measurement, monthly finance reconciliation and ITSM cadence controls | Pending local approval |
