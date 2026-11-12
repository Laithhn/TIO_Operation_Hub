# TIO-DEV-AUDIT-007 — Illogical dates are accepted: due dates in the past, deadlines revised into the past, payment paid in the future

| Field | Value |
|---|---|
| Module | Cases, Commitments, Contracts |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases/new, /commitments/new, /contracts/{id}/edit |
| Category | Business logic defect |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

Records are born overdue (a case due 01 Jan 2020 appeared at the top of "Needs immediate attention" as 2,506 days overdue) and payment history can state a future paid date.

## User Impact

Attention queues and overdue KPIs contain artefacts; users lose confidence in the list.

## Preconditions

None.

## Steps to Reproduce

1. Create a case or commitment with dueLocal 2020-01-01.
2. Revise a commitment to 2021.
3. Save a contract payment with status Paid and paidOn 2031-01-01.

## Expected Result

Refused, or accepted only with an explicit "logged after the fact" confirmation.

## Actual Result

201 / 204 / 201.

## Evidence

traces/api-test-evidence.jsonl (tc CASE-03, COM-02, COM-09, CON-09); screenshot screenshots/desktop-dashboard.png; test TIO-DEV-AUDIT-007.

## Root Cause

Missing lower-bound checks on due dates and upper-bound check on PaidOn.

## Recommended Fix

Validate due >= now (with an explicit override flag for retrospective logging) and paidOn <= today.

## Acceptance Criteria

Past due dates return 422 unless the override flag and a reason are supplied.

## Regression Test

TIO-DEV-AUDIT-007
