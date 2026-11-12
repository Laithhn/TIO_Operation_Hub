# Security observations

**Comprehensive security readiness: Not Rated.** The executed anonymous checks denied access to the two protected resources sampled and showed useful transport/header protections. The audit did not establish role/scope isolation, session lifecycle correctness or complete API authorization coverage. No security certification or broad security pass is justified.

Assessment date: 10 November 2026, Asia/Dubai. Live application: `https://nb01994.vitronic.de/`, displayed version **2.59.0**. Browser inspection used an existing **TIO Manager** session; it did not establish a new login or exercise a second approved role. The local checkout includes **2.60.0/A109** changes. Source explanations below are supplemental and cannot establish deployed implementation identity. See [source-review boundaries](traces/source-security-review.md) and [live dashboard snapshot](traces/001-executive-dashboard.txt).

## Executed anonymous HTTP checks

Six independent, sequential GET requests ran at **16:45:59 Asia/Dubai**. Native PowerShell HttpClient used no default credentials, request cookies or Authorization header; redirects were disabled and platform TLS validation remained enabled. No browser session was extracted. Cookie/token values and full bodies were not recorded. [Structured results](traces/anonymous-http-observations.json), [execution notes](traces/anonymous-http-observations.md).

| ID | Target route | Actual result | Security conclusion within tested scope |
|---|---|---|---|
| HTTP-ANON-01 | `/` | 200, HTML shell, 609 bytes | Anonymous shell retrieval worked; shell access alone does not disclose authenticated business data. |
| HTTP-ANON-02 | `/api/v1/me` | 401, zero body bytes | This endpoint denied the unsigned request. |
| HTTP-ANON-03 | `/api/v1/clients` | 401, zero body bytes | This client-list request denied unsigned access without a business-data body. |
| HTTP-ANON-04 | `/api/health/live` | 200, `live` | Public liveness state returned. |
| HTTP-ANON-05 | `/api/health/ready` | 200, `ready` | Public sanitized readiness state returned at the sample instant. |
| HTTP-ANON-06 | `/api/v1/auth/config` | 200, Forms mode, setupRequired=false | Public auth discovery worked; the source explicitly documents this route as anonymous. |

All six responses included HSTS (`max-age=2592000`), CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, camera/microphone/geolocation restrictions and Cache-Control no-store. CSP used self for scripts/connections/fonts, denied frame ancestors, permitted inline styles and permitted images from data and the configured OpenStreetMap tile origin. The shell and auth configuration also used no-cache. These are observed header values, not a complete CSP, XSS, cache or TLS assessment. Both sampled 401 challenges retained the headers. [Redacted response metadata](traces/anonymous-http-observations.json).

Auth/config issued `TioHub.Antiforgery` with Secure, HttpOnly and SameSite Strict, and `XSRF-TOKEN` with Secure and SameSite Strict without HttpOnly. The latter is the intended script-readable request token in the reviewed SPA code. No authentication-session cookie was issued by these anonymous samples; **logged-in session-cookie attributes were not verified**. IIS disclosed its product/version header and ASP.NET branding; this is informational hardening context, with no exploit or operational impact established.

## Observed browser behavior and evidence limits

| Area | Observation | Interpretation |
|---|---|---|
| Existing authenticated session | Navigation, administrative settings, rights, access review and audit screens were visible to the TIO Manager. | Confirms access for this existing session only. It does not establish correct access for engineers, viewers, delegated administrators or scoped users. [Rights](traces/051-admin-rights.txt), [access review](traces/052-admin-access-review.txt). |
| Sign-in presentation | `/login` displayed account/password inputs, a disabled blank Sign in button and temporary-password recovery guidance. | Form presentation inspected. No login submission, wrong-password attempt or lockout test occurred. Opening this public page with an existing session does not prove logout. [Snapshot](traces/094-login-with-existing-session.txt). |
| Password presentation | Change-password page displayed current/new/repeat fields and the minimum-length policy. | Presentation inspected; password validation, update and session invalidation remain unexecuted. [Snapshot](traces/093-password-form.txt). |
| Audit traceability | Existing Jira mapping change entries displayed `Tio user id: — → -9223372036854775000`. | Confirmed misleading audit display affects reliable traceability. No actual negative business FK, lost user, mapping failure or access-control breach was proven. [Live evidence](traces/054-admin-audit.txt), [source hypothesis](traces/audit-mapping-source-analysis.md). |
| Export history | Existing Completed exports showed unavailable details/metadata and no Download control. | Source shows intentional fail-closed masking when ownership/access fingerprints do not permit details. Lack of an explanation is a usability concern; it is not proof of missing files, failed generation or broken permission enforcement. No export generation/download was performed. [History](traces/064-export-history.txt), [details](traces/066-export-details.txt), [analysis](traces/exports-source-review.md). |

The audit-identifier defect is a data/governance finding, not evidence of privilege escalation. Local code captures modified scalar values before generated keys resolve, while added-record audit values are captured after saving; native JavaScript parsing can round a very large integer to the displayed value. This is a strong hypothesis, but the exact stored audit JSON and current real mapping were not queried. Keep the original audit evidence and use an approved append-only correction process if historical correction is needed. [Full analysis and regression criteria](traces/audit-mapping-source-analysis.md).

## Source-supported protections, not live passes

The local review found the following implementation patterns. Deployed equivalence and runtime effectiveness remain unverified where no explicit executed check is listed above. [Locations and limitations](traces/source-security-review.md).

- A fallback authenticated-user policy, central endpoint-rights table that refuses unregistered routes, additional handler checks and independent EF/client/project/team scope boundaries.
- Role unions, prerequisites, deny/allow exceptions, expiry and role-conflict rules; serialized access administration with a fresh rights check after acquiring its transaction lock.
- PBKDF2 password hashing, generic failed-login message, account lockout, temporary-password restriction and DB-backed session stamps rotated on password change/reset.
- Server-side antiforgery validation for state-changing API methods, scoped report permissions and re-evaluation of export requester access before job execution/download.
- Row-version concurrency, field validation and neutral duplicate/not-found error responses; trace IDs in problem responses and exclusion of credential objects from automatic business history.
- Production HTTPS/HSTS handling and sanitized health/readiness; startup refuses an incomplete schema before seeding/backfills. Actual reverse-proxy, file ACL, database-login and log-collection settings were not inspected.

The source pattern in which `ProblemWriter` clears a response after headers were assigned remains a **hypothesis** about handled-error header retention. Sampled 401 challenges did retain headers, but did not execute that error-writing path. The Secure-cookie policy also depends on HTTPS recognition; anonymous token cookies were Secure in the actual sample. No new defect is asserted for either source concern.

## Blocked or unexecuted security scenarios

| Scenario | Status and reason |
|---|---|
| Successful fresh login, invalid credentials, lockout/unlock, password/reset/temporary-password flow | Blocked: no explicitly approved disposable account; no live credential attempts or existing-user changes authorized. |
| Logout, browser Back after logout, idle/session expiry and multi-session revocation | Blocked: preserve the only existing approved working session; no session lifecycle mutation or controlled timing setup. |
| Role visibility, direct endpoint denial, scope isolation, restricted fields, attachment/export access across roles | Blocked: no second approved account/role/scoped dataset. TIO Manager navigation is not a negative test. |
| Unauthorized record-ID or cross-client requests | Unexecuted: no approved scoped records/accounts; no enumeration or privilege-escalation attempt. |
| Antiforgery rejection, invalid input, XSS/injection or concurrency/access changes | Unexecuted: no approved isolated test records/environment; non-intrusive inspection does not establish exploit resistance. |
| Browser storage/session secrets, certificate chain detail, TLS protocols/ciphers, server/file ACLs, DB grants, audit immutability and log redaction | Not comprehensively inspected. Evidence contains no cookie/session/credential values. |
| Integration credentials, outbound destinations, notification delivery and Jira test/discovery/sync/retry | Unexecuted: external calls or local state changes would exceed the live read-only scope. |

## Management actions and operational cautions

1. Obtain approved test accounts representing a business reader, engineer, privileged administrator and narrow client/project/team scope, plus safe isolated records, before release-critical positive/negative authorization and lifecycle testing.
2. Correct audit identifier recording/display, preserving actual before/after values and lossless identifiers. Verify the stored audit string and actual mapping through an authorized read-only review before describing historical data corruption.
3. Keep export masking fail-closed while adding safe unavailable-detail reasons and regeneration guidance. Do not recover usability by revealing protected metadata.
4. Validate recovery evidence and ownership: the operating guide leaves RPO/RTO/retention decisions and a production-like restore drill outstanding as documented owner tasks. Do not substitute the historical development restore timing for enterprise recovery assurance. [Source context](traces/source-security-review.md).
5. Treat CT1001's reported `Public Holidays Excluded` note as a **contractual measurement risk requiring validation**. The reviewed calculator does not model holidays; no specific wrong deadline, breach or penalty was proven. This concerns trust in operational evidence, not a demonstrated security exploit. [Calendar analysis](traces/dashboard-window-and-holiday-analysis.md).

No critical security failure was confirmed within this limited executed scope. That statement must not be read as absence of vulnerabilities or enterprise security readiness. Application source, production configuration, permissions and database were unchanged by this security-review work.
