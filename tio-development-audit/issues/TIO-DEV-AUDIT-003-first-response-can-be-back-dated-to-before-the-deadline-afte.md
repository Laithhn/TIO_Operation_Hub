# TIO-DEV-AUDIT-003 — First response can be back-dated to before the deadline after the breach was recorded

| Field | Value |
|---|---|
| Module | Cases / Contractual SLA |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases/{id} (POST /api/v1/cases/{id}/first-response) |
| Category | Business logic defect |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | Product / Development |

## Business Impact

Response-time compliance depends on an unverified, user-entered timestamp; a breached response became Met by entering the case creation time.

## User Impact

Reported response performance may not reflect what customers experienced.

## Preconditions

Linked case whose response deadline has passed with no response recorded.

## Steps to Reproduce

1. As engineer POST /cases/{id}/first-response with respondedAt = case createdAt and any channel.

## Expected Result

A response time earlier than the moment of entry needs evidence (attachment/reference) and, once the deadline has passed, approval by the TIO Manager; the entry time is shown next to the claimed time.

## Actual Result

204; status Breached -> Met; only a timeline note records it.

## Evidence

traces/api-test-evidence.jsonl (tc SLA-06); test TIO-DEV-AUDIT-003; CaseEndpoints.cs:349-365.

## Root Cause

By design the time is manual (the hub has no mail/Jira integration); there is no control for late back-dated entries.

## Recommended Fix

Keep both "claimed" and "recorded at" times, flag back-dated responses in the SLA panel and report, require evidence text and manager confirmation when the claim flips a breach.

## Acceptance Criteria

Back-dated entry after the deadline is refused for engineers or stored as "claimed, awaiting confirmation" and counted as breached until confirmed.

## Regression Test

TIO-DEV-AUDIT-003
