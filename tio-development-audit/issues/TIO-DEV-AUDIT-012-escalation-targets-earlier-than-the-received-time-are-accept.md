# TIO-DEV-AUDIT-012 — Escalation targets earlier than the received time are accepted

| Field | Value |
|---|---|
| Module | Escalations |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /escalations/new |
| Category | Business logic defect |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

An escalation can be created already "30 days past response target", producing a Critical attention item on the dashboard from inconsistent input.

## User Impact

Escalation attention list shows artefacts.

## Preconditions

None.

## Steps to Reproduce

1. POST /escalations with receivedAt = now-1h, responseDueAt = now-30d, resolutionDueAt = now-29d.

## Expected Result

422 "Targets cannot be before the escalation was received".

## Actual Result

201 (ESC-1002).

## Evidence

traces/api-test-evidence.jsonl (tc ESC-04); screenshots/desktop-dashboard.png (row "ESC-1002 ... 30 d 0 h overdue"); test TIO-DEV-AUDIT-012; src/TioHub.Api/Modules/Escalations/Escalations.cs:288-289.

## Root Cause

Only "received not in future" and "resolution not before response" are checked.

## Recommended Fix

Add responseDueAt >= receivedAt.

## Acceptance Criteria

Request returns 422 with the field named.

## Regression Test

TIO-DEV-AUDIT-012
