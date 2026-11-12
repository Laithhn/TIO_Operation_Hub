# TIO-DEV-AUDIT-005 — A missed commitment is reported "Completed on time" after its owner moves the deadline

| Field | Value |
|---|---|
| State in 2.60.0 | **Open** |
| Priority in 2.60.0 | P1 |
| Priority in 2.29.0 | P1 |
| Module | Commitments / Commitment performance report |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /commitments/{id} |
| Category | Business logic defect |
| Suggested Owner | Product / Development |

## Observation on 2.60.0

Reproduced (tc COM-26, COM-27): "Completed on time", original result "Late". The new Management dashboard shows "Commitments on time 100 %" from this data.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

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

