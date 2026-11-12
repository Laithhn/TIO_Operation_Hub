# TIO-DEV-AUDIT-002 — An engineer can remove the contract link from a breached case and the breach disappears from all SLA figures

| Field | Value |
|---|---|
| State in 2.60.0 | **Open** |
| Priority in 2.60.0 | P1 |
| Priority in 2.29.0 | P1 |
| Module | Cases / Contractual SLA |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/{id} (POST /api/v1/cases/{id}/contract) |
| Category | Business logic defect |
| Suggested Owner | Development / Product |

## Observation on 2.60.0

Reproduced with an Operation Engineer scoped to the client (tc SLA-10, PEN-03). Breached-list count 3 -> 1; Command Center response rate 25 % -> 100 % (both captured). Penalty preview for the case becomes empty.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

Any user with the Edit right can take a breached case out of SLA measurement with a free-text reason. Breach count for the audit client fell from 3 to 1 after two such manipulations.

## User Impact

SLA dashboard, case list filter "sla=breached" and the SLA compliance report under-report breaches.

## Preconditions

Case linked to a contract, at least one obligation Breached.

## Steps to Reproduce

1. Sign in as DEV\engineer.
2. POST /cases/{id}/contract with contractId null and a reason.

## Expected Result

Unlinking or changing the contract of a case with a completed or breached obligation is refused, or needs the TIO Manager, and the earlier measurement is retained.

## Actual Result

204; case shows Not applicable for both obligations and is no longer counted.

## Evidence

traces/api-test-evidence.jsonl (tc SLA-09, SLA-10 and the two "list sla=breached" counts); test TIO-DEV-AUDIT-002; src/TioHub.Api/Modules/Work/CaseEndpoints.cs:368-386.

## Root Cause

Confirmed: the endpoint only calls RequireMaintain (Edit right) and has no rule on SLA state; Snapshot() with no contract clears the measurement.

## Recommended Fix

Restrict contract changes after the first SLA event to holders of Manage, require a reason, keep the superseded measurement as history and report "contract changed after breach" separately.

## Acceptance Criteria

An engineer receives 403/422 when unlinking a contract from a case with a Met/Breached obligation; a manager override is listed in the SLA report.

## Regression Test

TIO-DEV-AUDIT-002

