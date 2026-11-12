# TIO-DEV-AUDIT-032 — Reopened case keeps the previous outcome and evidence; reopen rights differ between cases and commitments

| Field | Value |
|---|---|
| State in 2.60.0 | **Open** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | P3 |
| Module | Cases, Commitments |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/{id}, /commitments/{id} |
| Category | Workflow defect |
| Suggested Owner | Development / Product |

## Observation on 2.60.0

Reproduced: outcome and evidence of the earlier cycle are still returned after reopen.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

After reopening, the case page still shows the earlier outcome and validation evidence as current values; engineers may reopen completed commitments but only managers may reopen cases.

## User Impact

An open case appears to have an outcome; inconsistent authority model.

## Preconditions

Closed case.

## Steps to Reproduce

Reopen as manager and read the case.

## Expected Result

Outcome/evidence of the earlier cycle shown as history only; one rule for reopening.

## Actual Result

outcome "done" and evidence still returned on the Triaged case; commitment reopen 204 for engineer.

## Evidence

traces/api-test-evidence.jsonl (tc CASE-36 and following print, COM-25).

## Root Cause

Reopen clears ClosedAt only (CaseEndpoints.cs:466-468).

## Recommended Fix

Move closure fields to the cycle history on reopen; align reopen rights.

## Acceptance Criteria

Reopened case returns empty outcome and lists the earlier one under history.

## Regression Test

04-business-rules.spec.ts

