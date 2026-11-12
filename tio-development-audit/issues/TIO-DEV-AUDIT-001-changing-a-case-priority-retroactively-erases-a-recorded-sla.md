# TIO-DEV-AUDIT-001 — Changing a case priority retroactively erases a recorded SLA breach

| Field | Value |
|---|---|
| Module | Cases / Contractual SLA |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases/{id} (PUT /api/v1/cases/{id}) |
| Category | Business logic defect |
| Priority | P1 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

Contractual SLA compliance reported to management and customers can be improved after the fact. A breached Critical case became "Met" (response) and "Pending" (resolution) once its priority was lowered; the dashboard response rate moved to 100 %.

## User Impact

Managers cannot trust breach counts; engineers and customers see different histories for the same case.

## Preconditions

Active contract with SLA targets Critical 1/2 min and Low 6000/60000 min (calendar hours); case linked to it.

## Steps to Reproduce

1. Create a Critical client case linked to the contract.
2. Wait until response and resolution show Breached.
3. Record a late first response.
4. As TIO Manager edit the case and set priority Low.

## Expected Result

Obligations already breached stay Breached; the new target applies only to obligations still running, or the change is refused/needs an audited override.

## Actual Result

Response Breached -> Met, resolution Breached -> Pending; applied target replaced by the Low target with the original start time.

## Evidence

traces/api-test-evidence.jsonl (tc SLA-07, SLA-08); automated test TIO-DEV-AUDIT-001 in automated-tests/specs/05-known-defects.spec.ts; source src/TioHub.Api/Modules/Work/CaseSla.cs:119,228-236.

## Root Cause

Confirmed: the save hook re-runs Snapshot() whenever Priority is modified on a linked case and recomputes both obligations from case creation with the new targets; no terminal-state protection.

## Recommended Fix

Freeze an obligation once it is Met or Breached; on priority change keep a history of applied targets and measure each interval against the target in force; require a reason and show the override in the SLA panel.

## Acceptance Criteria

Given a case whose response is Breached, when priority changes, then response status and breach time are unchanged and the timeline shows the target change; SLA report counts are unchanged.

## Regression Test

TIO-DEV-AUDIT-001 (Playwright, currently failing)
