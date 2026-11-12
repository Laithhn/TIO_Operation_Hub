# TIO-DEV-AUDIT-026 — Test and delivery pipeline: tests run only on Windows/LocalDB, no CI, no lint, no front-end unit tests

| Field | Value |
|---|---|
| State in 2.60.0 | **Partly fixed** |
| Priority in 2.60.0 | P3 |
| Priority in 2.29.0 | P2 |
| Module | Engineering process |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.60.0, commit fa71ace) |
| Page URL | tests/, build/ |
| Category | Architecture risk |
| Suggested Owner | Development / QA |

## Observation on 2.60.0

Tests are portable (TIOHUB_TEST_SQL_AUTH); 755 back-end tests (711 passed, 6 failed, 38 skipped on this Linux host), 268 front-end unit tests (all pass), about 212 browser journeys (not run: Edge channel). Still no CI definition and no lint configuration in the repository. One non-environment failure needs triage: AC60_OperationsCommandCenter (expected 1, actual 0).

> The sections below are the finding as first reported on build 2.29.0 (folder `tio-development-audit/`). Evidence paths in them refer to that folder; 2.60.0 evidence is in `traces/` of this folder.

## Business Impact

The .NET tests hard-code Trusted_Connection (Windows authentication), the e2e suite requires Microsoft Edge and LocalDB, there is no CI definition, no ESLint/Prettier config and zero front-end unit tests (vitest is configured with no test files). On Linux 3 of 140 existing tests fail on file-path assumptions. 29 releases were produced in about four days without an automated gate.

## User Impact

Regressions such as findings 001-013 are not caught automatically; the application cannot be verified on a build server or in containers.

## Preconditions

Linux host with SQL Server container.

## Steps to Reproduce

Run dotnet test with TIOHUB_TEST_SQL pointing to a SQL-auth server.

## Expected Result

Tests run on any agent with a connection string; CI runs build, lint, unit, integration and e2e on every change.

## Actual Result

Connection fails unless the test source is changed; result after adapting a copy: 137 passed, 3 failed.

## Evidence

tests/TioHub.Tests/HubFactory.cs:21,47; tests/e2e/playwright.config.ts (channel msedge, LocalDB); traces/dotnet-existing-tests.txt; repository root has no CI or lint configuration.

## Root Cause

Project built on a single Windows developer machine.

## Recommended Fix

Take the full connection string from configuration, run e2e on bundled Chromium, add a CI workflow with SQL Server service container, add ESLint and component tests.

## Acceptance Criteria

A clean Linux agent runs all suites green from one documented command.

## Regression Test

CI itself

