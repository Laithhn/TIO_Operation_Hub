# TIO-DEV-AUDIT-010 — Ownership is not enforced: any user with Edit can cancel, close or change any case or commitment

| Field | Value |
|---|---|
| State in 2.60.0 | **Open (narrowed)** |
| Priority in 2.60.0 | P2 |
| Priority in 2.29.0 | P2 |
| Module | Cases, Commitments, shared access service |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/{id}, /commitments/{id} |
| Category | Security observation |
| Suggested Owner | Product / Security |

## Observation on 2.60.0

Within a client scope any holder of Maintain may still cancel a colleague's ticket or commitment (tc OWN-01, COM-29). New per-client data scope prevents this across clients (404). Services.cs:90-94: the responsibleUserIds parameter is still unused.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

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

