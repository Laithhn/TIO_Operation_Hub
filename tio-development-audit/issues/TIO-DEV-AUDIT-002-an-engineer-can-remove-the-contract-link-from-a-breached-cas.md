# TIO-DEV-AUDIT-002 — An engineer can remove the contract link from a breached case and the breach disappears from all SLA figures

| Field | Value |
|---|---|
| Module | Cases / Contractual SLA |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases/{id} (POST /api/v1/cases/{id}/contract) |
| Category | Business logic defect |
| Priority | P1 |
| Status | Confirmed |
| Suggested Owner | Development / Product |

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
