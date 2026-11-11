# TIO-DEV-AUDIT-004 — Closed and cancelled cases remain editable (title, impact, priority, due date)

| Field | Value |
|---|---|
| Module | Cases |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases/{id}/edit (PUT /api/v1/cases/{id}, POST /cases/{id}/due) |
| Category | Data integrity defect |
| Priority | P1 |
| Status | Confirmed |
| Suggested Owner | Development |

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
