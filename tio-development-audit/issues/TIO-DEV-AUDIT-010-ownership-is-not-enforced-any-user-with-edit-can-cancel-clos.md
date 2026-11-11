# TIO-DEV-AUDIT-010 — Ownership is not enforced: any user with Edit can cancel, close or change any case or commitment

| Field | Value |
|---|---|
| Module | Cases, Commitments, shared access service |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /cases/{id}, /commitments/{id} |
| Category | Security observation |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | Product / Security |

## Business Impact

Accountability controls are weaker than the screens suggest. A second engineer cancelled a commitment owned by a colleague; the same check guards case close, cancel, waiting, due date and contract link.

## User Impact

Work can be closed or cancelled by someone who is not responsible for it; only the audit trail reveals it afterwards.

## Preconditions

Two engineer accounts; record owned by the first.

## Steps to Reproduce

1. As DEV\engineer2 POST /commitments/{id}/cancel on a commitment owned by DEV\engineer.

## Expected Result

403 unless the caller is owner, backup, coordinator, team lead or TIO Manager.

## Actual Result

204.

## Evidence

traces/api-test-evidence.jsonl (tc COM-19, COM-29); test TIO-DEV-AUDIT-010; src/TioHub.Api/Modules/Shared/Services.cs:76-81 (RequireMaintain ignores its responsibleUserIds parameter).

## Root Cause

Confirmed: after decision A22 (two roles, everyone edits everything) the method returns for any Edit holder; the owner arguments passed by 20+ call sites are dead.

## Recommended Fix

Decide the intended rule. Either enforce owner/backup/coordinator/lead for state changes (cancel, close, due, contract) or remove the dead parameters and document that ownership is advisory.

## Acceptance Criteria

A non-owner engineer gets 403 on cancel/close of another person's record, or the product documentation states that ownership is not an access control.

## Regression Test

TIO-DEV-AUDIT-010
