# Authorization audit, 2.45.0

Audit of the API surface against the master access-control requirements, 3 November 2026. A static inventory of all 323 mapped endpoints was reviewed by hand where it flagged a handler. The findings are from reading code. Which of them are proven by tests is recorded in [RELEASE-VALIDATION-2.45.0.md](RELEASE-VALIDATION-2.45.0.md).

## How the layers fit

| Layer | Where | What it decides |
|---|---|---|
| Authentication | Fallback policy, `UserContextMiddleware` | Signed in and active, otherwise no `/api` call runs |
| Boundary | `CapabilityPermissionFilter` on `/api/v1` | Read and section permissions by route; denials are audited |
| Administration | `AuthorizationAdministrationFilter` | Serializes access changes and re-resolves the actor inside the transaction |
| Operation | `HubAccess`, `UserContext` | Permission and data scope for the stored record, through `AuthorizationDecisions` when contextual |
| Data | `HubDbContext` query filters | Client, project and team visibility for ordinary queries |

## Findings

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Single-record deletes used `SeesClient`, so project-only visibility could authorize deleting client-wide records that the same person could not edit | High | Fixed in `Deletion.cs` |
| 2 | Last-administrator checks in Windows and Development counted role names, not effective permissions | High | Fixed by `AdministratorRecovery` |
| 3 | Cascade needed global scope, blocking legitimate delegated use | Functional | Fixed with a footprint check on every affected row |
| 4 | A nullable scope column on exceptions would have been unlinked by cascade, turning a scoped exception into a global one | High, in new code | Prevented: removed with the scope; model test added |
| 5 | Exception and simulation code built dictionaries by permission key, which would throw once one key could hold several scopes | Defect, in new code | Fixed |
| 6 | Forms setup consumed its code and wrote its audit after the commit | Low | Fixed |
| 7 | An earlier application would apply a scoped row globally after a rollback | High, operational | `Down` refuses; review script and deployment guide cover it |
| 8 | Directory modes treated a person with no readable snapshot as having no access, blocking their assignment as owner or recipient | High, functional. Would affect all users after an upgrade | Fixed with `directWhenGroupsUnknown`; delegation still fails closed |
| 9 | The recipient of a failed scheduled report had no notice and no reason in history | Medium, functional | Fixed in `VisibleNotifications` for the person's own failed run |
| 10 | Fictional seed accounts did not match what the compatibility migration gives upgraded accounts | Test integrity | Seed corrected; narrower-scope tests create their own people |

## What the first full SQL run showed

The committed 2.44.1 state (`cafd3d7`) had never been run through the whole suite: 70 of 435 tests failed on it. Earlier reports covered a focused database-free subset. 69 of those failures were resolved in this release. Most were tests that predated mandatory data scope and granular detail permissions, and findings 8 and 9 were real defects they exposed. One test changed its expectation because of a deliberate earlier hardening: schedule history masks failure text.

## Flagged by the inventory and accepted

| Area | Why it is acceptable |
|---|---|
| Notes, notifications, `/me/preferences` | Owner-scoped queries; the boundary filter requires the module permission |
| Report schedules, presets, exports | `ExportService.RequireExport` plus owner or fingerprint checks; pause and resume go through `SetActiveAsync` |
| Products catalogue | Global catalogue with no client boundary by design; `Products:*` applies |
| Administration writes | Administrator check plus the serializing filter; delegation is validated inside |
| Handover acknowledge | Only the named receiver; the boundary filter requires `Handovers:Maintain` |
| Attachment update and delete | Resolves the current target and re-checks it, not the scope recorded at upload |

## Still open

| Item | Risk | Next action |
|---|---|---|
| View-type permissions cannot take a scope | Administrators cannot hide one client's records from one person by exception. Use data scope for that | Add database filters per resource before making any read permission eligible |
| Legacy cross-cutting rights (Export, Audit, Technical detail, Administer) coexist with granular permissions | Two concepts to explain; both are enforced server-side | Convert after an owner decision on the migration |
| `HasAny` and `Can(Role)` compatibility helpers remain | Coarse, and used by few callers. They never apply to the three scope-eligible keys | Replace at each call site |
| Internal handover items carry no team | All-internal scope is required, which is conservative | Add a team to handover items if owners want team-level handovers |
| Schedule history shows no failure reason, even to the schedule owner | Owners of a schedule with other recipients see only that a run failed; only each recipient gets the reason, in their notice | Decide whether an owner may see reasons that hold no scoped data |
| Scheduled exports have no directory principal | Legitimate schedules can be refused while a mapped role could conflict | Live lookup can narrow this once validated on a domain |
