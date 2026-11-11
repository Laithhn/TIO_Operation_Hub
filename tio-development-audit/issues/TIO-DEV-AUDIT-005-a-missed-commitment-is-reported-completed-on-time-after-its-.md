# TIO-DEV-AUDIT-005 — A missed commitment is reported "Completed on time" after its owner moves the deadline

| Field | Value |
|---|---|
| Module | Commitments / Commitment performance report |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /commitments/{id} |
| Category | Business logic defect |
| Priority | P1 |
| Status | Confirmed |
| Suggested Owner | Product / Development |

## Business Impact

On-time delivery (KPI "on-time completion = completed by the deadline in force / completed") can be raised by the accountable owner alone: an already overdue commitment was revised to a future date with a one-word reason and then completed "on time".

## User Impact

Delivery performance shown to management overstates reliability; customers experience late delivery that the hub reports as on time.

## Preconditions

Open commitment past its due date, owned by an engineer.

## Steps to Reproduce

1. As the owner POST /commitments/{id}/revise with a future date and reason "moved".
2. Complete it.

## Expected Result

Revising a deadline that has already passed needs approval (manager or customer reference), and the headline timeliness/KPI uses the original or last approved deadline.

## Actual Result

timeliness = "Completed on time"; originalDeadlineResult = "Late" is kept but is not the reported KPI.

## Evidence

traces/api-test-evidence.jsonl (tc COM-26, COM-27, COM-28); test TIO-DEV-AUDIT-005; src/TioHub.Api/Modules/Commitments/CommitmentEndpoints.cs:172,267; docs/DECISIONS.md A62 (KPI definition).

## Root Cause

Design decision: the KPI is defined on the deadline in force and revisions need only a reason from any Edit holder.

## Recommended Fix

Report both rates (vs original and vs agreed deadline); allow post-due revisions only with manager approval; show revision count in the performance report.

## Acceptance Criteria

A commitment revised after its due date by its owner is not counted on time unless a manager approved the revision.

## Regression Test

TIO-DEV-AUDIT-005
