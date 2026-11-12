# TIO-DEV-AUDIT-014 — Case workflow depends on the TIO Manager at triage and reopen, forces five steps for every case, and lets one person validate their own work

| Field | Value |
|---|---|
| State in 2.60.0 | **Partly fixed** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | P2 |
| Module | Cases workflow |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/{id} |
| Category | Workflow defect |
| Suggested Owner | Product / Operations |

## Observation on 2.60.0

Short path exists: with the default status list a ticket closes from In progress (A77). Triage and reopen still need Cases:Coordinate (TIO Manager by default); the person who did the work still closes with free-text evidence — recorded as an explicit owner decision (A75).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

Every case must pass New -> Triaged -> In progress -> Pending validation -> Closed. Only holders of Manage can triage or reopen; an engineer who logs a Critical incident cannot start work until a manager acts. The engineer who requests validation can also close the case, so "validation" is not an independent check.

## User Impact

Out of hours or during manager absence urgent work is blocked in New; simple requests cost five actions; the validation step gives false assurance.

## Preconditions

Engineer account; no manager available.

## Steps to Reproduce

1. As engineer create a case.
2. Try triage (403) and start (422: needs Triaged).
3. After manager triage: start, request validation and close as the same engineer.

## Expected Result

Engineers can triage their own team's cases (or Critical cases auto-triage); low-priority requests have a short path; the closer differs from the requester of validation or the customer confirmation is recorded.

## Actual Result

Triage 403 for engineers; self-validation accepted.

## Evidence

traces/api-test-evidence.jsonl (tc CASE-12, CASE-14, CASE-24, CASE-27, CASE-30); CaseEndpoints.cs:219-246,389-425,444-472.

## Root Cause

Design decision A22/A61 (manager-only coordination) applied to a mandatory step.

## Recommended Fix

Allow team leads/engineers to triage within their team, add a "resolve directly" path for Low/Normal requests, and record who validated (customer contact or second person).

## Acceptance Criteria

An engineer can move a Critical case of their team to In progress without a manager; closure stores a validator different from the resolver or an explicit customer confirmation.

## Regression Test

New workflow tests in 04-business-rules.spec.ts

