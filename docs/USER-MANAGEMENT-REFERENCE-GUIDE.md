# User management: reference behavior and TIO development guide

**Status:** Reference and implementation guide, not an approved change to existing TIO decisions. **Implemented in 2.48.0 (A81):** see [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md), where the section 7 decisions stay open for the owner as D1 to D6. The file names in section 8 are from 2.47; current entry points are in [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).  
**Audience:** Product owner, security owner, and Claude Code developer.  
**Reference reviewed:** PoliScan Office Lite 2.0.0, signed in as Power User, 3 November 2026.  
**Scope:** Users, roles, rights, and their administration. Assignment rules are outside scope.

## 1. Purpose and how to use this guide

Adapt the reference application's understandable user → role → right model to TIO Operations Hub. Use TIO's own domain, permission registry, terminology, authentication modes, and existing protection rules. Do not copy PoliScan's application-specific permissions, sample accounts, role names, or data into TIO.

This guide separates three types of statement:

- **Observed:** displayed by the reference UI or checked in an unsaved form. It is evidence of UI behavior, not proof of server enforcement.
- **TIO baseline:** behavior in the current TIO source or project documentation. Recheck the current branch before implementing because the code may change.
- **Proposed:** a development direction or acceptance criterion for TIO. It does not supersede an existing owner decision. Resolve material conflicts in section 7 before changing behavior.

The reference application's source, database schema, complete role-to-right mapping, and server-side validation were not available. No reference records or access settings were saved during the review. Treat unverified behavior as unknown, not as a hidden requirement.

## 2. Reference model and observed behavior

### 2.1 Concepts

The reference Administration page has separate Users, Roles, and Rights screens. It says users are associated with roles in Users and that rights are associated with roles. The user form calls its selection **User Group**, with labels matching the Roles list; the UI suggests these are the same role choices, but the underlying data model was not verified. Multiple checkboxes can be selected together. How multiple roles combine was not established.

The rights catalog distinguishes access to a menu from permission to execute an action. Examples shown are `Admin.User` for visibility and `Admin.User.Create`, `Admin.User.Edit`, and `Admin.User.Delete` for the corresponding actions. Role and right administration also have separately named rights. This distinction is the reusable design principle; the reference keys are examples, not TIO keys.

The reference landing page warns that the rights catalog must match the application code and should not be changed. This does not establish whether the product technically permits changes to the catalog or role grants.

### 2.2 Users and form behavior

| Item | Reference observation |
|---|---|
| User list | Shows login, name, enabled, status, last activity date/time, comments, and role indicators. The meaning of status and last activity was not verified. |
| Login and name | Marked required on creation. Both fields were disabled in an existing user's edit form. |
| Password | Creation form states a minimum of six characters and has confirmation. With unsaved test values, five characters or a mismatch disabled Save; matching six-character values enabled Save when the other required inputs were populated. Server rules were not tested. |
| Enabled | Checked by default in a new-user form. Effects on sessions and access were not verified. |
| Comments | Shown as an editable field, without a required marker. |
| User Group | Marked required. The form allows multiple role checkboxes. The landing page says a user is made a clerk by default, but no group was checked in the new-user form. The actual default behavior is unresolved. |
| Edit | Password, comments, enabled state, and role selection were displayed as editable. Password requirements when the password is left unchanged were not checked. |

The reference catalog says user edit includes changing a password or adding roles, and lists user deletion as a separate right. The review did not execute create, edit, disable, delete, or password reset; it did not establish uniqueness, deletion constraints, audit, lockout, session revocation, or default-role behavior.

### 2.3 Reference role descriptions

The reference installation lists Admin, Clerk, Dev, Read Only, Service, and Supervisor. Their descriptions communicate broad purposes, but the UI reviewed did not show their complete grants. They are **reference examples only**. TIO should retain or define roles appropriate to its own organization; it must not assume any of these names imply a particular TIO grant.

## 3. TIO baseline and differences to reconcile

The current application already implements users, multiple roles, a permission registry and rights editor. Its newer access model goes beyond the reference UI reviewed. Verify implementation and tests in the current checkout before changing it.

| Topic | Current TIO baseline / implication |
|---|---|
| Identity and profile | Account name is set at creation; display name is editable. Users also have email and working time zone. The user entity has no comments field. `LastSignInAt` is a sign-in timestamp, not proof of last activity or online status. |
| Role membership | Multiple roles are supported. An empty direct-role selection is currently possible; group mappings or direct permission exceptions can also affect access. Requiring at least one role needs a decision and migration analysis. |
| Permissions | A code-defined registry, hierarchical permissions, role grants, prerequisites, scope, and direct exceptions exist. Evaluate current semantics from the latest implementation and release notes; do not replace them with an assumed flat matrix. |
| Data scope | Client, project, and team scope is distinct from permissions. Administration alone does not automatically grant business data access. Preserve this separation. |
| Authentication | Forms and Windows modes exist. Forms uses temporary passwords and a stronger 12-character policy, with lockout and session handling. The reference's six-character UI minimum is not a reason to weaken TIO's policy. Windows identities and directory group mappings must continue to work. |
| Lifecycle and safeguards | TIO includes deactivation/reactivation, retained-history deletion checks, access-change audit, delegation limits, self-change restrictions, last-administrator protection, and concurrency checks. Preserve these unless an explicit owner decision changes them. |

Historical decisions in `docs/DECISIONS.md` describe earlier versions and are not necessarily the current implementation. In particular, use the newer authorization documents and code for current role, hierarchy, scope, and exception behavior.

## 4. Proposed TIO development requirements

The following are the recommended implementation target for the reusable reference concepts, subject to the decisions in section 7. Prefer extending existing TIO functionality; do not introduce a second authorization engine.

### 4.1 Users

1. Provide a user list and create/edit workflows showing account name, display name, active state, assigned roles, and meaningful sign-in information. Clearly label **Last sign-in**; do not call it last activity or online status without an actual activity definition and implementation.
2. Keep account name immutable after creation. Retain TIO's existing display-name editing unless the owner decides otherwise. Retain email, time zone, and other existing fields needed by TIO.
3. Allow multiple roles and show which are directly assigned versus inherited through directory mappings where applicable. Make the effect of role status, scope, and direct exceptions understandable without implying that a role alone gives access to all data.
4. Keep the existing TIO password provisioning, minimum length, change/reset, lockout, and session rules. Only present password controls where the authentication mode supports them. Do not expose passwords in logs or audit records.
5. Continue to offer deactivation and reactivation with their existing safeguards and clear consequences. Preserve historical references and explain any manual reassignment that remains necessary. Apply TIO's existing deletion restrictions.
6. Consider a comments field only if a TIO business need is confirmed; specify its visibility, size, audit treatment, and migration before adding it.

### 4.2 Roles and rights

1. Present roles with a clear name, description, status, and accessible view of their assigned permissions. Continue to support TIO's protected roles and existing role lifecycle rules.
2. Present the TIO rights catalog using stable TIO permission keys and descriptions. Distinguish access to a feature from permission to create, edit, delete, or carry out other operations. Include parent/prerequisite and scope effects where relevant.
3. Allow authorized administrators to manage **role grants** through TIO's existing rights editor and review flow. Keep permission definitions aligned with the server-owned manifest and existing registry lifecycle; do not silently create, rename, or remove permission keys through ordinary role editing.
4. Show effective access and its sources using TIO's existing access inspection mechanisms. Explain that roles, status, hierarchy, prerequisites, scope, directory mappings, and applicable exceptions can affect the final decision. Do not imply a displayed role matrix alone guarantees access.
5. Retain TIO's existing rules for multiple roles and exception precedence. Do not infer them from the reference application.

### 4.3 Enforcement and operations

1. Enforce authorization and validation on the server for each relevant operation, including direct API calls. UI visibility and disabled controls are usability aids, not the security boundary.
2. Continue to deny access when required permission or scope is absent, and retain current delegation, protected-administrator, self-change, audit, concurrency, and session-revocation controls. Assess the effects of access changes on already signed-in users and background work.
3. Retain existing user identities, role assignments, directory mappings, data scopes, exceptions, audit history, and business-record references during any redesign. No automatic privilege expansion or access removal is acceptable without an approved mapping and owner review.
4. Apply existing accessible UI patterns, loading/error states, keyboard support, and responsive layouts. Avoid exposing information to a user who cannot access it through the API.

## 5. Rights mapping for design and review

Map concepts to the **existing TIO registry**, not to literal PoliScan keys. Inspect the manifest and endpoint policies to identify the exact current keys before implementation; do not invent keys in advance.

| Capability | Reference example | TIO design check |
|---|---|---|
| See user administration | `Admin.User` | Identify the existing visibility/read requirement and test direct API access. |
| Create a user | `Admin.User.Create` | Identify TIO's create permission and delegation checks. |
| Edit a user or access | `Admin.User.Edit` | Check profile, password, role/scope changes and any separately enforced permissions. Preserve self-change and delegation restrictions. |
| Delete a user | `Admin.User.Delete` | Check TIO's delete permission, retained references and last-administrator safeguards. |
| View/manage roles | `Admin.Role` and action rights | Map to TIO role read/create/edit/delete capabilities and protected-role rules. |
| View/manage rights | `Admin.Right`, `Admin.Right.Edit` | Map to TIO registry visibility and role-grant editing; distinguish definitions from assignments. |

Prepare an explicit role × TIO permission matrix from current source and configuration for review. A list of reference role descriptions is not a substitute for such a matrix. Record the source and approval of any proposed changes to existing grants.

## 6. Acceptance and verification

Use these as implementation acceptance criteria after the outstanding decisions are resolved:

- **User administration:** a permitted administrator can view, create, and edit within their delegated authority; account name remains immutable; multiple role assignments display correctly; TIO-specific fields and existing account lifecycle still work.
- **Password and identity:** Forms provisioning and reset follow TIO's current policy, including confirmation and relevant session effects; Windows accounts continue through their existing path. Invalid or unauthorized operations are rejected server-side. Do not test real credentials in shared environments.
- **Permission boundaries:** independently verify user visibility, creation, editing, deletion, role management, and rights management. An actor lacking each action right cannot perform that operation by calling the API directly, even if the UI is bypassed. Verify existing parent/prerequisite, scope, and exception behavior.
- **Role and scope:** test multiple roles, inactive users/roles, directory-derived access, direct exceptions, and scoped data against the current TIO rules. Confirm that a role grant does not accidentally widen data scope and that changing one user's access does not change another's.
- **Safeguards:** test self-change restrictions, delegated-authority limits, protected and last-administrator cases, auditing, stale update conflicts, deactivation/reactivation, session revocation, and deletion with retained references.
- **Upgrade:** on an approved isolated database, compare users, effective access, scopes, and role grants before and after an upgrade; investigate every difference. Validate backup, deployment and rollback procedures and avoid silent grant expansion.
- **UI:** verify keyboard navigation, validation messages, loading and error states, and responsive layout. Run the relevant .NET tests, frontend checks, and Playwright journeys when browser behavior changes; report results and gaps.

## 7. Decisions required before changing behavior

| Decision | Why it matters | Safe interim treatment |
|---|---|---|
| Require at least one direct role for every user? | Reference form marks a group required; TIO can derive access through other sources and currently permits no direct roles. | Preserve current behavior and analyze existing users, directory mappings, exceptions, and bootstrap access. |
| Default role for a new user? | The reference landing page and form appear inconsistent; its Clerk role is specific to that product. | Do not assign a new TIO role silently. Follow existing TIO behavior pending a decision. |
| Should display name become immutable? | Reference edit form disables it; TIO currently allows updates. | Preserve TIO edit behavior until the owner decides, including a correction process if immutability is chosen. |
| Add comments and/or a true last-activity indicator? | Neither is established as a TIO need; sign-in is not activity. | Keep current fields and label timestamps accurately. |
| Change role names or default grants? | Reference roles and grants are not a verified match for TIO responsibilities. | Retain TIO roles and grants; prepare a reviewed mapping before any change. |
| Change password or account lifecycle policy? | Reference UI observations do not establish server security behavior and conflict with stronger existing TIO controls. | Retain existing TIO policy and protections. |

## 8. Claude Code starting points and delivery constraints

Before development, read the repository instructions and required documents: `README.md`, `docs/DECISIONS.md`, `docs/DESIGN-RULES.md`, `docs/IMPLEMENTATION-PLAN.md`, and `docs/OPERATIONS.md`. Review `docs/AUTHORIZATION-2.43.md`, `docs/AUTHORIZATION-HIERARCHY-2.44.md`, `docs/RELEASE-NOTES-2.45.0.md`, `docs/RELEASE-VALIDATION-2.45.0.md`, and `docs/ACCESS-CONTROL-IMPLEMENTATION.md` alongside current code.

Likely entry points include `src/TioHub.Api/Modules/Admin/AdminEndpoints.cs`, `RoleEndpoints.cs`, `src/TioHub.Api/Modules/Access/AccessEntities.cs`, `src/TioHub.Api/Security/PermissionHierarchy.cs`, `UserContext.cs`, `AuthorizationDecisions.cs`, `PermissionOverrides.cs`, `AuthEndpoints.cs`, and the administration pages under `src/web/src/pages/`. Confirm exact paths and existing tests before editing. Relevant tests include `AuthorizationBoundarySqlIntegrationTests.cs`, `AccessControlSqlIntegrationTests.cs`, and `FormsRecoverySqlIntegrationTests.cs` under `tests/TioHub.Tests`.

First inventory actual behavior and produce a gap/migration plan against this guide. Implement only the approved changes, maintain API/frontend compatibility, and update project decisions and operations guidance when behavior changes. Respect concurrent uncommitted work. Never run a database migration, reset data, or start external services without the approval required by repository instructions. Any schema proposal needs review, an isolated upgrade test, a rollback plan, and the normal DBA-controlled deployment process.

## 9. Evidence and limits

Reference screens reviewed: [Administration](http://aedevweb:3011/administration), [Users](http://aedevweb:3011/administration/users), [Roles](http://aedevweb:3011/administration/roles), and [Rights](http://aedevweb:3011/administration/rights). These are internal links and require authorized access. Observations reflect the signed-in Power User's visible interface on the review date; permissions, configuration, and deployed versions can alter what other users see.

No exact role-to-right matrix, server implementation, or live authorization testing was available for the reference system. Any behavior not explicitly identified as observed in this document is a TIO baseline, proposal, or open decision, not a claim about PoliScan.
