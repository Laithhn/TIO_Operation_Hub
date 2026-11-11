# TIO-DEV-AUDIT-031 — Linked cases are often "Not measurable": priorities without a target and support hours kept only as free text

| Field | Value |
|---|---|
| Module | Contracts / SLA |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /contracts/{id}/edit |
| Category | Business process improvement |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | Product / Operations |

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
