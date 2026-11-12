# TIO-DEV-AUDIT-013 — Invalid values produce a generic 400 with no field; some forms report one error at a time

| Field | Value |
|---|---|
| State in 2.60.0 | **Partly fixed** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | P3 |
| Module | API error handling |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | all forms (API) |
| Category | Functional defect |
| Suggested Owner | Development |

## Observation on 2.60.0

Query-string enums now answer 422 with the field ("Bogus is not a priority."). JSON body enums still answer the generic 400 (tc ESC-13e).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

Integrations and the UI cannot tell users which value is wrong when an enum or filter value is unknown.

## User Impact

Users see "The request could not be read. Check the values entered and try again." without a field.

## Preconditions

None.

## Steps to Reproduce

1. POST /escalations with direction "ReceivedFromClient".
2. GET /cases?priority=Bogus.
3. POST /environments {} (only "Select the client." is returned).

## Expected Result

422 with errors keyed by field, all problems in one response.

## Actual Result

400 without errors; environments return a single error.

## Evidence

traces/api-test-evidence.jsonl (tc ESC-02 first run, ENV-01); misc run "bad enum filter 400"; test TIO-DEV-AUDIT-013.

## Root Cause

Enum binding fails in the JSON/query binder before validation runs; environment validation returns early.

## Recommended Fix

Bind enums as nullable strings validated in Check, or map binder failures to field errors.

## Acceptance Criteria

Unknown enum value returns 422 naming the field and the accepted values.

## Regression Test

TIO-DEV-AUDIT-013

