# Rights: developer guide

How to add a screen, an endpoint or a right. For what the model is and why, see [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md).

## The rule

A person holds roles. Roles hold rights. Rights come from one code-defined catalog. **There is one place that decides: `UserContext`.**

| You want to | Use |
|---|---|
| Check a right in a handler | `me.RequireRight(RightKeys.Cases, RightKeys.Maintain)` or `me.HasRight("AdminUsers:View")` |
| Check a right for one record, respecting limited exceptions | `access.RequireIn(RightKeys.Contracts, RightKeys.Maintain, ResourceContext.ForRecord(clientId, null, [projectId]))` |
| Check data scope | `me.HasClient(id)`, `me.SeesClient(id)`, `me.SeesInternal(teamId)`. Scope and rights are separate. Check both |
| Check a right in the browser | `useRight('Cases', 'Maintain')` or `hasRight(me, 'Cases', 'Maintain')`. This only decides what to show |

## Adding an endpoint

1. Map the route as usual.
2. Add one line to `Security/EndpointRights.cs`. Until you do, the route answers 403 and `Every_api_operation_has_a_decision_and_every_decision_has_an_operation` fails.

| Decision | Use when | Example |
|---|---|---|
| `Rights("A:View")` | A fixed right applies whatever the record. Checked before the handler | `["GET /cases"] = Rights("Cases:View")` |
| `.Also("B:Maintain")` | The handler checks more, and the filter can't, because it depends on the record | `Rights("X:View").Also("X:Coordinate")` |
| `Handler("A:Maintain")` | The handler must decide, for example because a right limited to one client must reach it. **The handler must really check it** | `["PUT /contracts/{id:long}"] = Handler("Contracts:Maintain")` |
| `Dynamic(DynamicPolicy.X)` | The right depends on the record type or a query value. The filter works it out | Attachments, the client page tab |
| `Authenticated("why")` | Any signed-in person, returning only their own or filtered data. The reason is required | `["GET /me"]` |
| `Public("why")` | No sign-in. Must also be `AllowAnonymous`, and a test compares the two | `["POST /auth/login"]` |

3. Run the generator, which rewrites [RIGHTS-COVERAGE-MATRIX.md](RIGHTS-COVERAGE-MATRIX.md) and the browser's copy of the catalog. A test fails if you forget:

```bash
dotnet run --project build/RightsManifest
```

4. Add a line to [RIGHTS-UI-COVERAGE.md](RIGHTS-UI-COVERAGE.md) if it adds a screen or control.

`No_operation_succeeds_for_someone_without_its_right` calls every operation as a person holding one unrelated right. A `Handler` entry whose handler forgets the check fails there, unless the record lookup fails first. So also add a direct test with a record that exists.

## Adding a page

A page cannot exist outside the rights. `pageRights.test.ts` reads every route in `App.tsx` and `pages/Reports.tsx`. It fails until someone holding every right can open the page and someone holding none cannot, and a release package can't be built while it fails. Until the page is registered, everyone gets Access denied, including the TIO Manager.

1. Add the route.
2. Decide what opens it. **A new screen with its own purpose gets its own right**, so it can be given and taken away and shows on the Rights page: add a line to `Features` in `Security/RightsCatalog.cs`, with `ViewNeeds` set to the right its data needs. A form or detail of an existing feature uses that feature's rights.
3. Register it in `rights.ts`: in `routePermissions` for a top-level page, or in `adminAreas` or `reportingAreas`.
4. Run the generator, and add the page to [RIGHTS-UI-COVERAGE.md](RIGHTS-UI-COVERAGE.md).
5. Follow **Adding a right** below. A new right opens the page only for the TIO Manager until a migration or an administrator gives it to other roles.

## Adding a right

Add a right when an action has **different business or security consequences** from the rights that exist. Two buttons that mean the same thing share a right.

1. Add it in `Security/RightsCatalog.cs`, in `Resources`, `TabActions` or `Features`. Give it prerequisites: an action needs its feature's `View`. Administration features need `Platform:Administration`.
2. Run the generator.
3. **New rights are denied to everyone except the protected TIO Manager role.** Startup adds the definition and never grants it. If existing people should have it, write a reviewed migration that grants it and audits that.
4. If a right should be limited per client, project or team, it can only join `ScopedRights.Eligible` once every path using it evaluates `ResourceContext`. See [SCOPED-PERMISSION-EXCEPTIONS.md](SCOPED-PERMISSION-EXCEPTIONS.md).

Never rename or reuse a key. Keys appear in role grants, exceptions and audit history. To retire one, remove it from the catalog: startup marks its definition inactive and it grants nothing, while stored grants stay reviewable.

## Things that will catch you out

- **A role grant does not widen data scope.** A person with `Cases:View` and no scope sees no cases, and that is correct.
- **Prerequisites are not added for you.** Assigning `Cases:Maintain` without `Cases:View` saves, and is not effective. The Rights page warns and offers to add them.
- **`Platform:*` and administration rights can't be individual exceptions.** They are managed through roles only. People holding `Platform:Administration` ignore direct allows; denies still apply.
- **The API `permissions` object on a record is not the rights model.** `GET /cases/{id}` returns `permissions.canEdit` and similar: flags the server works out for that record, so the browser needn't. They stay as they are.
- **The test helper's names are not application rights.** `Fixture.Rights(keys, Flag.Export)` in the tests is shorthand for choosing rights. Test payloads may name roles; `Api.Send` turns names into ids.

## Tests to know

| Test | What it proves |
|---|---|
| `EndpointRightsCoverageTests` | The table matches the real routes. A person without a right can't succeed anywhere. A right opens its own category only |
| `RightsCatalogTests` | The catalog's shape, prerequisites, resolution, and default Engineer grants |
| `RightsLifecycleTests` | Users, several roles, directory roles, role lifecycle, delegation, protected role, exceptions |
| `RightsModelUpgradeTests` | The upgrade from 2.47: each rule, effective access per person, review script, `Down` |

SQL-backed tests need explicit approval and an isolated instance: set `TIOHUB_TEST_SQL` and `TIOHUB_APPROVE_OVERRIDE_SQL_TESTS=migrate-and-drop-isolated-database`.
