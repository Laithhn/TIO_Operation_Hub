# TIO-DEV-AUDIT-006 — No server-side protection against duplicate submissions

| Field | Value |
|---|---|
| State in 2.60.0 | **Open** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | P3 |
| Module | Cases, Commitments (API) |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | /cases/new, /commitments/new |
| Category | Data integrity defect |
| Suggested Owner | Development |

## Observation on 2.60.0

Reproduced: three parallel identical requests create three tickets; commitments likewise. Browser double click still sends one request.

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

Repeated or parallel identical requests create duplicate operational records that inflate open-work KPIs. The browser button is protected against double click; scripts, retries after timeouts and multiple tabs are not.

## User Impact

Duplicate cases must be found and cancelled manually.

## Preconditions

None.

## Steps to Reproduce

1. Send the same POST /cases body three times in parallel.

## Expected Result

One record; later identical requests within a short window return the first record (as exports already do, DECISIONS A62) or 409.

## Actual Result

201 three times (CS-1029..1031); same for commitments (COM-07).

## Evidence

traces/api-test-evidence.jsonl (tc CASE-11, COM-07); misc run "3 parallel identical creates -> [201, 201, 201]"; test TIO-DEV-AUDIT-006.

## Root Cause

No idempotency key or duplicate rule on work records (environments, assets, installations and client aliases do have uniqueness rules).

## Recommended Fix

Accept an Idempotency-Key header from the SPA or apply the 10-second identical-request rule already used for exports.

## Acceptance Criteria

Three identical parallel POSTs create exactly one case.

## Regression Test

TIO-DEV-AUDIT-006

