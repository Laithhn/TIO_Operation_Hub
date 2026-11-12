# TIO-DEV-AUDIT-004 — Closed and cancelled cases remain editable (title, impact, priority, due date)

| Field | Value |
|---|---|
| State in 2.60.0 | **Open** |
| Priority in 2.60.0 | P1 |
| Priority in 2.29.0 | P1 |
| Module | Cases |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/{id}/edit (PUT /api/v1/cases/{id}, POST /cases/{id}/due) |
| Category | Data integrity defect |
| Suggested Owner | Development |

## Observation on 2.60.0

Reproduced: title/impact edit, priority change and due-date change all accepted on a Closed ticket (tc CASE-31..33; two automated tests).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

The record of a finished case can be rewritten: priority was changed High -> Low and a due date set to 2030 on a Closed case. Priority changes also re-trigger SLA evaluation (see 001). Title and impact edits do not appear in the case timeline (only in field history).

## User Impact

Closed-case reports, case aging and SLA history are not stable; reviewers cannot rely on what was agreed at closure.

## Preconditions

A case in status Closed or Cancelled.

## Steps to Reproduce

1. Close a case through the normal workflow.
2. PUT /cases/{id} with a new title/impact/priority.
3. POST /cases/{id}/due with a new date and reason.

## Expected Result

422 "Reopen the case before changing it" (as already implemented for owner changes and progress updates).

## Actual Result

204 for all three; timeline shows PriorityChanged and DueChanged after Closed.

## Evidence

traces/api-test-evidence.jsonl (tc CASE-31, CASE-32, CASE-33 and the printed timeline); tests TIO-DEV-AUDIT-004 (two); CaseEndpoints.cs:175-216 and 507-523.

## Root Cause

Confirmed: PUT and /due have no IsOpen(status) check, unlike /assign (line 253) and /progress (line 300).

## Recommended Fix

Add the open-status guard to PUT, /due, /contract, /jira and /first-response (except documented corrections by a manager with a reason).

## Acceptance Criteria

All edits on Closed/Cancelled cases return 422 unless performed through an explicit, audited manager correction.

## Regression Test

TIO-DEV-AUDIT-004

