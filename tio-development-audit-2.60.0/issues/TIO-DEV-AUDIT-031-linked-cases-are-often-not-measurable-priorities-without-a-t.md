# TIO-DEV-AUDIT-031 — Linked cases are often "Not measurable": priorities without a target and support hours kept only as free text

| Field | Value |
|---|---|
| State in 2.60.0 | **Mostly fixed** |
| Priority in 2.60.0 | P4 |
| Priority in 2.29.0 | P3 |
| Module | Contracts / SLA |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /contracts/{id}/edit |
| Category | Business process improvement |
| Suggested Owner | Product / Operations |

## Observation on 2.60.0

The SLA & Contracts dashboard lists not-measurable tickets with reasons ("No target recorded for the priority"). No data-quality rule for contracts without targets; holidays still not modelled.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

A Normal-priority case on a contract with targets for other priorities is Not measurable and silently excluded from compliance rates; seeded contracts keep support hours in "Support notes" (for example "Mon-Fri 07:30-15:30") while the structured days and times are empty. Public holidays are not modelled.

## User Impact

Compliance percentages cover an unknown share of cases.

## Preconditions

Contract without a target for a priority.

## Steps to Reproduce

Create a Normal case on the audit contract.

## Expected Result

Data-quality rule "active contract without target for a priority / without support calendar"; coverage ratio shown beside every SLA rate.

## Actual Result

Not measurable, no data-quality item.

## Evidence

SLA run output (case D: NotMeasurable, applied (Normal, None, None)); screenshots/laptop-contract-edit.png; DECISIONS A61.

## Root Cause

Targets are optional per priority; migration left legacy text.

## Recommended Fix

Add the data-quality rule and a holiday calendar; show measured/total on SLA tiles.

## Acceptance Criteria

Dashboard shows "measured n of m linked cases".

## Regression Test

SLA tests

