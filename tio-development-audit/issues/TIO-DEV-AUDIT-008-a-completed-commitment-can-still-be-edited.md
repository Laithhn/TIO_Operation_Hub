# TIO-DEV-AUDIT-008 — A completed commitment can still be edited

| Field | Value |
|---|---|
| Module | Commitments |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /commitments/{id} (PUT) |
| Category | Data integrity defect |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

The description, type, owner and case/project links of a fulfilled commitment can be changed after completion, altering the historical delivery record.

## User Impact

Completed-work history is not reliable evidence.

## Preconditions

Commitment in status Completed.

## Steps to Reproduce

1. Complete a commitment.
2. PUT /commitments/{id} with a different description.

## Expected Result

422 (revise and cancel are already refused for completed commitments).

## Actual Result

204.

## Evidence

traces/api-test-evidence.jsonl (tc COM-23); test TIO-DEV-AUDIT-008; CommitmentEndpoints.cs:141.

## Root Cause

PUT has no status guard; /revise and /cancel do.

## Recommended Fix

Refuse edits unless the commitment is Open.

## Acceptance Criteria

PUT on a Completed or Cancelled commitment returns 422.

## Regression Test

TIO-DEV-AUDIT-008
