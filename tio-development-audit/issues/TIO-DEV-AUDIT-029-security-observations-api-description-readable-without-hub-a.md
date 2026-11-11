# TIO-DEV-AUDIT-029 — Security observations: API description readable without hub access, extension-only file checks, public map tiles, no MFA

| Field | Value |
|---|---|
| Module | Security |
| Environment | Development (local instance http://127.0.0.1:5094, build 2.29.0, commit 26b7cf8) |
| Page URL | /openapi/v1.json, attachments, dashboard map |
| Category | Security observation |
| Priority | P3 |
| Status | Confirmed |
| Suggested Owner | Security / Development |

## Business Impact

The OpenAPI document (318 KB, every endpoint and schema) is returned to an authenticated account that has no hub access. Attachments are accepted by extension only (a file starting "MZ" named .pdf was stored). Map tiles are fetched by users' browsers from tile.openstreetmap.org, disclosing user IP addresses and viewed regions to a third party. Forms sign-in (the production default) has no MFA; it was not testable in this build.

## User Impact

Information disclosure of the API surface; malware could be stored under a harmless extension (downloads are forced as attachments with nosniff, which limits impact).

## Preconditions

Unknown development account.

## Steps to Reproduce

1. GET /openapi/v1.json as an account that gets 403 on /api/v1/me.
2. Upload fake.pdf.

## Expected Result

OpenAPI only for hub users or disabled outside development; content-type sniffing or AV scan; internal tile source.

## Actual Result

200 / stored.

## Evidence

security run "openapi for unknown user 200 317839"; misc run "upload TIO_AUDIT_TEST_fake.pdf 200"; src/TioHub.Api/Program.cs (MapOpenApi; AppOptions.MapTileUrl); DECISIONS A18, A20.

## Root Cause

MapOpenApi sits under the fallback authentication policy but outside UserContextMiddleware's /api path check.

## Recommended Fix

Serve OpenAPI under /api or only in Development; add magic-number validation; configure an internal tile server; plan MFA/SSO before production.

## Acceptance Criteria

Unmapped account gets 403 for /openapi/v1.json.

## Regression Test

01-auth-roles.spec.ts
