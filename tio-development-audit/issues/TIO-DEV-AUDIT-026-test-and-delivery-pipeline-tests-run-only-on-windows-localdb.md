# TIO-DEV-AUDIT-026 — Test and delivery pipeline: tests run only on Windows/LocalDB, no CI, no lint, no front-end unit tests

| Field | Value |
|---|---|
| Module | Engineering process |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | tests/, build/ |
| Category | Architecture risk |
| Priority | P2 |
| Status | Confirmed |
| Suggested Owner | Development / QA |

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
