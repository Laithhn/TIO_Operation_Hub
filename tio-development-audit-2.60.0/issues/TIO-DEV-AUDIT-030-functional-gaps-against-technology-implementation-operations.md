# TIO-DEV-AUDIT-030 — Functional gaps against Technology Implementation & Operations practice

| Field | Value |
|---|---|
| State in 2.60.0 | **Partly fixed** |
| Priority in 2.60.0 | P4 |
| Priority in 2.29.0 | P4 |
| Module | Product scope |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | n/a |
| Category | Enhancement opportunity |
| Suggested Owner | Product |

## Observation on 2.60.0

Added since 2.29.0: read-only Jira synchronisation, ticket comments, client status reports with rule-based signals, contract renewal, penalties, organisation structure. Still absent: change, problem and knowledge management, go-live readiness, hypercare, risk register, outbound notification.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

The hub has no change-management record, no problem record (root cause / known error), no shift-handover log, no knowledge base, no implementation plan with milestones-dependencies-go-live readiness-hypercare (only contract delivery-schedule rows and a "project phase" label), no risk register, no monitoring or ticket integration and no e-mail or chat notification. Environment health is entered manually.

## User Impact

TIO still needs Jira, spreadsheets and e-mail beside the hub; the hub cannot yet be the single operational view it aims to be.

## Preconditions

None.

## Steps to Reproduce

Inventory in 02-APPLICATION-INVENTORY.md.

## Expected Result

See 07-TIO-OPERATIONS-ASSESSMENT.md.

## Actual Result

Not present.

## Evidence

docs/openapi-v1.json (194 paths, none for changes/problems/milestones); README ("The hub never calls Jira, vaults, client systems or messaging").

## Root Cause

Scope decision (BRD MVP).

## Recommended Fix

Prioritise: outbound notifications, change calendar, go-live checklist/milestones, problem records linked to cases.

## Acceptance Criteria

Roadmap agreed with owners.

## Regression Test

n/a

