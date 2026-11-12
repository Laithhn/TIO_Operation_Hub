# Anonymous HTTP observations

Execution: 10 November 2026, 16:45:59 Asia/Dubai (12:45:59 UTC). Target: `https://nb01994.vitronic.de/`. Structured evidence: `anonymous-http-observations.json` in this folder.

Six sequential GET requests, one sample per route, from native PowerShell `System.Net.Http.HttpClient` on the workspace machine. Each request used a fresh handler with default credentials disabled, cookies disabled and redirects disabled. Platform TLS certificate validation remained enabled. No browser session/cookie was extracted or reused. No login, credential attempt, mutation, external host, scan or load test was performed. Cookie/token values and full response bodies were not saved.

| Scenario | Route | Expected | Actual | Elapsed ms | Result |
|---|---|---|---|---:|---|
| HTTP-ANON-01 | `/` | Public SPA shell available over HTTPS | 200, HTML, 609 bytes, no redirect | 267.1 | Pass for shell retrieval only |
| HTTP-ANON-02 | `/api/v1/me` | No anonymous user/business payload | 401, zero body bytes | 13.2 | Pass for anonymous denial |
| HTTP-ANON-03 | `/api/v1/clients` | No anonymous client data | 401, zero body bytes | 9.2 | Pass for anonymous denial of this list |
| HTTP-ANON-04 | `/api/health/live` | Public liveness response | 200, status `live` | 9.5 | Pass at sample time |
| HTTP-ANON-05 | `/api/health/ready` | Public sanitized readiness response | 200, status `ready` | 30.7 | Pass at sample time |
| HTTP-ANON-06 | `/api/v1/auth/config` | Public auth discovery, safe token issuance | 200, Forms mode, setupRequired=false, password policy string | 67.2 | Pass for safe auth discovery |

The auth/config route was taken from `src/TioHub.Api/Security/AuthEndpoints.cs:40`, rather than guessed. Readiness returning ready supports only the endpoint's reported readiness state at this instant; it does not validate every workflow or attest to backup/recovery readiness.

## Headers observed

All six responses included:

- HSTS `max-age=2592000`.
- CSP limiting default/script/connect/font/base/form sources to self, frame ancestors to none, images additionally to data and the configured OpenStreetMap tile origin, and inline styles allowed.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin` and Permissions-Policy disabling camera/microphone/geolocation.
- Cache-Control no-store (shell and auth/config also no-cache).

Both observed 401 responses retained these headers. They were ordinary authentication challenges; they do **not** exercise the source hypothesis about `ProblemWriter.Response.Clear()` on handled errors.

IIS disclosed `Server: Microsoft-IIS/10.0` and `X-Powered-By: ASP.NET`. This is informational hardening context; no exploitable vulnerability or business impact was established.

Auth/config issued `TioHub.Antiforgery` with Secure, HttpOnly and SameSite Strict, plus `XSRF-TOKEN` with Secure and SameSite Strict and without HttpOnly. The latter is the documented script-readable request token for the SPA, not an authentication session cookie. No session cookie was issued in these anonymous samples; this does not verify logged-in session-cookie attributes.

## Interpretation and limits

No confirmed defect was found in these six observations. The protected endpoints tested denied anonymous access without business bodies; the shell, public auth configuration and health endpoints were accessible. HTTPS completed with normal certificate validation and no redirect was followed.

Timings are elapsed native client GET plus body-buffering samples, not browser rendering, route navigation, LCP, p95, load capacity or API-service-only timings. The first request may include connection/DNS/TLS initialization and was slower than later requests. One sample per route cannot support a performance rating or reliability percentage.

Not tested here: authenticated role/scope isolation, session expiration/logout, password/lockout/reset, antiforgery rejection, error recovery, authorization under concurrency, access/audit record completeness, TLS protocol/cipher analysis, file authorization, integration behavior and backend deployment configuration. No observed status proves those properties.
