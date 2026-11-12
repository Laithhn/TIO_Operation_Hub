# TIO-DEV-AUDIT-015 — SLA and completion clocks start at data entry: there is no "reported at" time and events before the record was created are refused

| Field | Value |
|---|---|
| State in 2.60.0 | **Partly fixed** |
| Priority in 2.60.0 | P2 |
| Priority in 2.29.0 | P2 |
| Module | Cases, Commitments |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/new, /commitments/{id} |
| Category | Business logic defect |
| Suggested Owner | Product / Development |

## Observation on 2.60.0

Synchronized tickets use the Jira creation time as Opened and SLA start (A91). Manually created tickets still start at data entry and refuse an earlier first response. Commitment completion lost its lower bound entirely (see 007).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

A case logged 3 hours after the customer reported it starts its SLA clock at creation, so measured response/resolution times are systematically too good. A commitment fulfilled yesterday and recorded today cannot be completed with the true time ("cannot be before the commitment was created"); a first response sent before the case was typed in is refused.

## User Impact

Users must falsify times or lose the true history; SLA figures are biased in TIO's favour.

## Preconditions

None.

## Steps to Reproduce

1. Create a commitment.
2. Complete it with completedAt one minute before creation.
3. Record a first response earlier than case creation.

## Expected Result

Cases carry "reported at" (default now, editable, audited) used as SLA start; completion/response times may precede record creation when justified.

## Actual Result

422 in both cases; SLA start = CreatedAt.

## Evidence

traces/api-test-evidence.jsonl (tc COM-20 first run, COM-12); CommitmentEndpoints.cs:204; CaseEndpoints.cs:360; DECISIONS A61 ("Start = case creation").

## Root Cause

Simplification in A61; the hub has no intake integration.

## Recommended Fix

Add Case.ReportedAt and use it as the SLA clock start; relax the lower bound for completion and first response to the reported time.

## Acceptance Criteria

A case with reportedAt 2 h ago shows a response deadline 2 h earlier than one created now.

## Regression Test

New SLA tests (reportedAt)

