# Authentication Modernization Plan — Forms → OpenID Connect SSO with MFA

Status: **Proposal for owner / IT security review** (16 Nov 2026). Nothing in this plan is implemented.
Related decisions: A1 (Windows sign-in, "replace Negotiate with OIDC"), A20 (Forms sign-in, "confirm whether MFA is needed later").

## 1. Recommendation

Move to **OpenID Connect (Authorization Code + PKCE) against the organization's identity provider — Microsoft Entra ID assumed** —
using a **Backend-for-Frontend (BFF) cookie session**: the API performs the OIDC exchange server-side and keeps issuing the existing
hardened `TioHub.Session` cookie. No tokens reach the browser. MFA, Conditional Access, password policy and account lifecycle move to
the identity provider.

Keep Forms sign-in only as a **break-glass path** for a small number of flagged administrator accounts, and add **TOTP MFA** to it.
Windows mode stays available for on-premises sites that cannot use an identity provider.

Why this option:

| Option | Security gain | Effort | Ongoing cost | Verdict |
|---|---|---|---|---|
| **OIDC + Entra ID, BFF cookie (recommended)** | MFA, Conditional Access, central offboarding, no passwords in the hub | Medium | Low (IdP already licensed in most AD estates) | Best value; matches A1 note |
| SAML 2.0 | Same IdP benefits | Medium–High | Medium (cert rollover, no first-party ASP.NET Core handler) | Only if the IdP cannot do OIDC |
| Keep Forms, add TOTP / passkeys locally | MFA only | Medium | High (hub stays a password store, own reset/lifecycle) | Use only for break-glass |
| Self-hosted IdP (Keycloak, Duende) | Full control | High | High (another critical service to run and patch) | Not justified at this scale |
| SPA holds JWT access tokens (MSAL in browser) | IdP benefits | Medium | Medium | Rejected: tokens exposed to XSS; loses existing cookie + antiforgery model |

## 2. Current state (as built)

| Area | Today | Source |
|---|---|---|
| Modes | `Auth:Mode` = `Forms` (default), `Windows` (Negotiate/IIS), `Development` (dev/test only) — exactly one scheme per deployment | `Program.cs`, `Security/SignIn.cs` |
| Credentials | `iam.UserCredential`: PBKDF2-SHA256 600k, lockout 5/15 min, temporary passwords, no MFA, no self-service reset | `Security/Passwords.cs`, `AuthEndpoints.cs` |
| Session | Cookie `TioHub.Session`, HttpOnly, **SameSite=Strict**, sliding 480 min, session stamp checked on every request | `Program.cs`, `AuthEndpoints.ValidateSessionAsync` |
| Revocation | `SessionStamp` lives on `UserCredential` (so only password users have it) | `Passwords.cs` |
| Authorization | `UserResolver` builds rights/scope from roles + `GroupMapping` (by group **name**, Windows only) | `SignIn.cs`, `Modules/Access/AccessEntities.cs` |
| User identity key | `User.AccountName` (`DOMAIN\name` or Forms name) | `AccessEntities.cs` |
| CSRF | Antiforgery header on unsafe methods | `Program.cs` |
| Bootstrap | One-time setup code file for first Forms administrator | `Passwords.cs` (`SetupCode`) |

The authorization layer (rights, scopes, `UserContext`) is independent of how the user signed in. **That is the main reason this change is
tractable: only authentication and user resolution change; business behavior does not.**

## 3. Target architecture

```
Browser (SPA)  --GET /api/v1/auth/oidc/login?returnUrl=/x-->  API  --302-->  Entra ID (MFA, Conditional Access)
Browser        <--302 + TioHub.Session cookie--  API /signin-oidc  <--form_post code--  Entra ID
API: code → tokens (server-side, PKCE, client certificate) → validate issuer/tenant/audience/nonce
     → resolve User by (issuer, oid) → GroupMapping by group object ID / app role → existing UserResolver → cookie session
```

Key design points:

1. **Schemes:** cookie (session) + OpenIdConnect (challenge) + optional Forms endpoints, combined with a policy scheme so both can be
   enabled at once during migration (`Auth:Mode` becomes a set: e.g. `Oidc,Forms`).
2. **Stable identity key:** link users on Entra `tid` + `oid` (immutable), **never** on e-mail or UPN alone (they change and can be
   reassigned). New table `iam.UserExternalLogin (UserId, Issuer, Subject, TenantId, LinkedAt, LinkedBy)`, unique on (Issuer, Subject).
3. **Groups:** Entra emits group **object IDs**, not names, and switches to an "overage" claim above 200 groups. Use either
   *App Roles* assigned to groups, or *"groups assigned to the application"* only. Extend `GroupMapping` with an optional `ExternalId`
   so a mapping can match by ID; existing name-based mappings keep working for Windows mode.
4. **Session revocation for all users:** move `SessionStamp` from `UserCredential` to `User` (or a new `iam.UserSession` table) so
   deactivation, role removal and admin "sign out everywhere" end OIDC sessions too. Keep validating active state on each request.
5. **Session lifetime:** hub session stays the source of truth (480 min sliding, as today). IdP sign-out → hub `/auth/logout` clears the
   cookie and redirects to the IdP end-session endpoint. Entra offers front-channel logout only; accept that deactivation in the hub
   (or the stamp check) is the reliable revocation path.
6. **Client secret handling:** use a **certificate credential** from the server certificate store (or a federated credential if hosted
   in Azure). No client secret in `appsettings`, environment or source.
7. **Break-glass Forms:** a `User.LocalSignInAllowed` flag; Forms sign-in refused for everyone else once OIDC is primary. Break-glass
   accounts require TOTP (RFC 6238, BCL `HMACSHA1`, no new package; secret encrypted with the existing `HubDataProtection`; 10 hashed
   recovery codes). Every break-glass sign-in is audited and raises an in-hub notification to administrators.

## 4. Phased delivery

### Phase 0 — Decisions and prerequisites (owner, IT security) — ~1 week elapsed
| # | Decision / action | Owner |
|---|---|---|
| 0.1 | Confirm the IdP (Entra ID assumed) and that all hub users exist there. **Do client/customer users sign in?** If yes, Entra External ID / B2B is needed — this changes scope. | Owner |
| 0.2 | App registration: single-tenant authority, redirect URIs per environment, certificate credential, `openid profile` scopes only | IT / Entra admin |
| 0.3 | Group strategy: App Roles vs. assigned groups (avoid overage) | IT security + Owner |
| 0.4 | Conditional Access policy: MFA required, compliant device optional | IT security |
| 0.5 | Break-glass policy: number of accounts (proposed 2), who holds them, review cadence | Owner |
| 0.6 | Linking policy for existing users (section 5) | Owner |

### Phase 1 — Foundation (no user-visible change) — ~1–1.5 weeks
- Decouple `SessionStamp` from `UserCredential`; keep Forms behavior identical.
- Add `iam.UserExternalLogin`, `GroupMapping.ExternalId`, `User.LocalSignInAllowed` (idempotent `database/01-schema.sql` + EF migration).
- Refactor `Program.cs` auth wiring so several modes can be enabled together; startup validation refuses incomplete OIDC config.
- Tests: existing Forms/Windows suites stay green; new tests for multi-mode selection and stamp revocation.

### Phase 2 — OIDC sign-in — ~1.5–2 weeks
- Add `Microsoft.AspNetCore.Authentication.OpenIdConnect` (first-party, version-aligned with `Negotiate` 10.0.x). Avoid
  `Microsoft.Identity.Web` unless a Graph call becomes necessary.
- Endpoints: `GET /auth/oidc/login` (challenge, `returnUrl` validated as local path only), `/signin-oidc` callback, `POST /auth/logout`
  extended. `GET /auth/options` tells the SPA which sign-in buttons to show.
- Claims → user resolution in `UserResolver`: linked login → user; unlinked → linking rules (section 5); no provisioning unless a mapping
  admits the user (same rule as Windows today).
- **Cookie SameSite change:** the session cookie set on the IdP `form_post` callback is cross-site; with `Strict` the first post-login
  request will not carry it. Change `TioHub.Session` to `Lax` (CSRF stays covered by antiforgery) and set correlation/nonce cookies to
  `None; Secure`. Requires HTTPS everywhere, which is already mandatory for Forms.
- SPA: `pages/SignIn.tsx` shows "Sign in with Microsoft" (primary) and hides the password form unless break-glass is requested.
- Audit events: `ExternalSignIn`, `ExternalSignInRefused` (reason), `ExternalLoginLinked`, `ExternalLoginUnlinked`.

### Phase 3 — Account linking and pilot — ~1 week + 2 weeks pilot
- Administration → Users: show linked identity, *Link*, *Unlink*, *Sign out everywhere*. Bulk CSV import of `AccountName → oid`.
- Pilot with the TIO management team, `Auth:Mode = Oidc,Forms`. Track sign-in failures and support tickets.

### Phase 4 — Break-glass hardening — ~1 week
- TOTP enrolment and verification for `LocalSignInAllowed` accounts; recovery codes; audit + admin notification.
- Forms sign-in refused for non-flagged accounts; existing password hashes for them cleared in a reviewed, approved data step.

### Phase 5 — Cutover and decommission — ~1 week
- All users on OIDC; Forms limited to break-glass. Update `DEPLOYMENT-GUIDE.md`, `OPERATIONS.md`, release notes, `DECISIONS.md` (A1/A20 superseded).
- The setup-code bootstrap remains for brand-new installations only.

Estimates are rough engineering estimates for one developer plus review, excluding IdP lead times.

## 5. Existing user migration (linking)

| Approach | Risk | Recommendation |
|---|---|---|
| Auto-link by e-mail / UPN on first OIDC sign-in | **Account takeover** if an address is reused or a guest account matches | Reject |
| Auto-link when UPN equals stored `DOMAIN\name` translated by `Auth:DirectoryUpnSuffix`, same tenant only, audited | Low, if `DirectoryUpnSuffix` is correct | Accept for AD-synced users (configurable, off by default) |
| Administrator links each user (UI or CSV import) | Lowest | Default for Forms-only accounts |

## 6. Rights, configuration and seed data (AGENTS.md checklist)

| Item | Proposal |
|---|---|
| Rights | **No new right.** Linking, unlinking and "sign out everywhere" reuse the existing user-administration right that guards Administration → Users. Setting `LocalSignInAllowed` should require Application Administrator (business decision — flag for owner). |
| Deployment configuration (not admin-editable) | `Auth:Mode`, `Auth:Oidc:Authority`, `ClientId`, `CertificateThumbprint`, `TenantId`, `CallbackPath`, `AutoLinkByUpn`. Identity-provider trust must not be changeable from the UI. |
| Settings (`SettingKeys`) | None required. Session minutes and lockout stay in deployment config as today. |
| Seed data | None. Optional demo: a linked fake identity in `DevelopmentData.cs` for a test OIDC handler. |
| Schema | `iam.UserExternalLogin`; `GroupMapping.ExternalId`; `User.LocalSignInAllowed`; `SessionStamp` moved to user level; TOTP columns for break-glass. Additive; reviewed and approved before any migration is run. |

## 7. Testing strategy

- **.NET integration tests:** a Testing-only fake OIDC/claims handler (pattern of `DevAuthHandler`) to cover: linked user admitted; unlinked
  refused; wrong tenant/issuer refused; group-ID mapping grants the right roles and scope; deactivation ends the session; break-glass
  refused without TOTP; non-flagged account refused on Forms; `returnUrl` open-redirect attempts refused.
- **Rights tests:** link/unlink endpoints allow with the user-admin right and deny without it.
- **Playwright:** sign-in page variants per mode; break-glass flow with TOTP; logout. Real Entra flows tested manually in a test tenant.
- **Security review:** state/nonce/PKCE, token validation parameters, cookie flags, CSRF after the Lax change, logging contains no tokens.

## 8. Operations, rollout and rollback

| Topic | Plan |
|---|---|
| Rollout | Feature flag through `Auth:Mode`: `Forms` → `Oidc,Forms` (pilot) → `Oidc,Forms` with break-glass restriction → done |
| Rollback | Set `Auth:Mode=Forms`; schema is additive so an earlier build still runs. Users keep passwords until Phase 4, so rollback before Phase 4 is lossless. |
| IdP outage | Break-glass accounts sign in with password + TOTP; documented runbook |
| Multi-server | Data Protection keys are already persisted (`HubDataProtection`) — required for OIDC correlation cookies across nodes |
| Monitoring | Audit-based counts: sign-ins by method, refusals by reason, break-glass uses (alert on any), unlinked-user refusals |
| Certificate | Track the app-registration certificate expiry; renewal runbook in `OPERATIONS.md` |

## 9. Success criteria / KPIs

- 100 % of interactive sign-ins (excluding break-glass) via OIDC with MFA within 4 weeks of cutover.
- Password credentials in the hub reduced to the break-glass accounts only.
- Password-reset requests to hub administrators: zero after cutover.
- Leaver access removed within the IdP's offboarding SLA with no hub action required (verified in an access review).
- No increase in sign-in-related incidents during the pilot.

## 10. Risks and open questions

| Risk / question | Mitigation |
|---|---|
| Customer (client) users may need access | Decide in Phase 0; B2B/External ID changes linking and tenant validation |
| Group overage and name→ID change break mappings | App Roles or assigned groups; `ExternalId` on mappings; pre-cutover mapping report |
| SameSite Strict → Lax | Antiforgery already on all unsafe methods; add a test that proves it |
| Wrong auto-link | Off by default; same-tenant + exact UPN only; audited |
| IdP outage locks everyone out | Break-glass accounts with TOTP; runbook; quarterly test |
| Windows mode users | Unchanged; can move to OIDC later with the same linking (UPN suffix) |
