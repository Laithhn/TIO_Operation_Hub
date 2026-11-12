# TIO-DEV-AUDIT-008 — A completed commitment can still be edited

| Field | Value |
|---|---|
| State in 2.60.0 | **Open** |
| Priority in 2.60.0 | P2 |
| Priority in 2.29.0 | P2 |
| Module | Commitments |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /commitments/{id} (PUT) |
| Category | Data integrity defect |
| Suggested Owner | Development |

## Observation on 2.60.0

Reproduced (tc COM-23).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

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

