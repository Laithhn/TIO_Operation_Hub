# TIO-DEV-AUDIT-028 — Maintainability: very dense source, business rules inside endpoint lambdas, vestigial access model, large bundle

| Field | Value |
|---|---|
| Module | Source code |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | src/ |
| Category | Architecture risk |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | Development |

## Business Impact

1,116 source lines exceed 200 characters (up to 342); CaseEndpoints.cs holds 60 KB of validation and workflow logic in route lambdas; the scope/grant model (client, project, team scopes) is still stored and returned by the admin API but ignored at run time; 115 IgnoreQueryFilters calls; 41 migrations in four days; the SPA ships a single 789 KB script (224 KB gzip) plus a 757 KB map atlas.

## User Impact

Slower onboarding and review, higher defect rate when rules change (see 004, 008: guards present on some endpoints and missing on siblings).

## Preconditions

None.

## Steps to Reproduce

Static review.

## Expected Result

Domain services with unit tests per rule; line length and complexity limits; route-level code splitting.

## Actual Result

As described.

## Evidence

src/TioHub.Api/Modules/Work/CaseEndpoints.cs; Modules/Shared/Services.cs:76-81; Security/SignIn.cs (AccessCalculator); src/web build output (index-*.js 788.62 kB).

## Root Cause

Rapid feature delivery without refactoring.

## Recommended Fix

Extract a CaseWorkflow/CommitmentWorkflow domain layer with a transition table; remove unused scope data or re-enable it; split the bundle per route.

## Acceptance Criteria

Workflow rules are covered by unit tests independent of HTTP; initial script < 300 KB.

## Regression Test

Unit tests for transition table
