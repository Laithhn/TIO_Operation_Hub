# 11 — Security observations

Scope: role and access behaviour through the normal UI and API with development identities; response headers; input handling; code review of the security module. **No exploitation, credential attack or scanner was used.** Production sign-in modes (Forms, Windows) could not be exercised in this build.

## Verified controls

| Control | Result | Evidence |
|---|---|---|
| Every API call needs a resolved hub user | Unknown account → 403 "No access"; deactivated account → 403 | sec run; `DEV\former` |
| Antiforgery on all non-GET API calls | Missing token → 400 "Security token missing or expired" | sec run |
| Administration endpoints | Engineer: 403 on users, roles, settings, lookups, group mappings, storage | SEC-ADM, SEC-01..03 |
| Structural and destructive rights | Engineer: 403 on create client/region, archive, delete, cascade delete | SEC-04..07 |
| Custom role without rights | Reads allowed; 403 on every write tried, on export, audit, report catalogue and firewall rules; network zone hidden on servers | RO-01..08 |
| Notes privacy | Other users, including the manager, get 404 | misc run |
| Export files | Download only by the requesting user (404 for others) | rep run |
| Existence not disclosed | 404 text is identical for missing and inaccessible records | `Common/Errors.cs` |
| Error disclosure | Problem Details with title and trace id only; no stack trace, SQL or path in any of 215 responses | evidence log |
| Response headers | CSP (`default-src 'self'`, no inline script), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `no-store` on API, HSTS and HTTPS redirect outside Development (code) | response headers |
| Input handling | Script tags in titles rendered as text; note HTML sanitised; search and filters parameterised (no error with quote/comment characters); secret-like text refused; CSV formulas neutralised | CASE-08, CASE-09, misc run |
| Attachments | Executables, HTML, SVG, double extensions and empty files refused; traversal segments stripped; forced download | misc run |
| Development sign-in | Application refuses to start with it outside Development/Testing; settings file not published | `Program.cs`, `.csproj` |
| Password storage (code review) | PBKDF2-HMAC-SHA256, 600,000 iterations, per-user salt; lockout 5 attempts / 15 min; session stamp invalidation | `Security/Passwords.cs`, DECISIONS A20 |

## Observations

| # | Observation | Risk | Issue |
|---|---|---|---|
| S1 | **Ownership is not an access control**: any Edit holder may cancel, close or alter any case or commitment | Medium — accountability, insider error | 010 |
| S2 | **Cascade delete** accepts a single request without version or server-side confirmation and removes whole client trees; work history can be hard-deleted | Medium — data loss, loss of evidence | 011 |
| S3 | **Measurement tampering** through normal functions (SLA and deadlines) | High for reporting integrity | 001–005 |
| S4 | **OpenAPI document** (318 KB) is served to an authenticated account that has no hub access | Low — reconnaissance | 029 |
| S5 | **Attachment content is not inspected** (extension allow-list only; no antivirus hook) | Low–medium | 029 |
| S6 | **Map tiles from a public server**: user browsers contact `tile.openstreetmap.org`, revealing IP address and viewed region; also a usage-policy question (DECISIONS A18) | Low — privacy, availability | 029 |
| S7 | **Forms sign-in without MFA or SSO** is the production default; identity provider still an open decision (DECISIONS) | To be decided before production | 029 |
| S8 | **Two-role model with broad defaults**: every role sees every client, contract value and contact; Operation Engineer holds Export, Technical detail and Change history by default | Accepted by owner decision A22; revisit if external or project staff get accounts | — |
| S9 | **Commercial data** (fees, payment amounts) visible to every role including roles without rights | Design decision A49; confirm with the data owner | — |
| S10 | `style-src 'unsafe-inline'` in the CSP | Low | — |
| S11 | Data-protection key ring not configured ("No XML encryptor configured" warning at start) | Development-only observation; verify protection of antiforgery/cookie keys on the server | — |
| S12 | Audit trail is in the same database; "append-only" depends on the least-privilege SQL login script `database/02-app-login.sql` (not executed in the audit) | Verify in the target environment | — |

## Not tested

Forms sign-in in the browser (lockout, temporary passwords, session expiry, setup code), Windows sign-in and group mappings, TLS configuration, IIS hardening, SQL permissions of the application login, rate limiting, dependency vulnerability scan, penetration testing.

## Recommendations

1. Close S1–S3 with the business-rule fixes; they are the material risks.
2. Before production: decide SSO/MFA, run a penetration test and a dependency scan, verify the SQL least-privilege login and audit-table protection, configure an internal map tile source.
3. Restrict `/openapi/v1.json` to hub users or to Development.
4. Add content sniffing or an antivirus hook to uploads.
