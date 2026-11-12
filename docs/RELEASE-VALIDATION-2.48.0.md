# Release validation, 2.48.0

Validated 3 November 2026 on an isolated local instance, `(localdb)\TioHubQALocalDB`, with uniquely named databases, under the owner's approval for this task. No shared, UAT or production database was touched.

**Status: committed and packaged, not deployed.** The automated checks below passed on 4 November 2026, including the real-API browser suite on the final rights screens. The items under "Not verified" must be done before calling this production-ready. In particular, the upgrade has never run on real data.

## Results on the final code

| Suite | Result |
|---|---|
| Backend: unit, integration, security, against real SQL Server | **660 passed, 0 failed, 0 skipped** |
| Frontend unit tests | 74 passed |
| TypeScript check and production build | Passed. Entry chunk 893.45 kB, budget 900 kB |
| Browser against the real API, in Microsoft Edge | **158 passed** |
| Browser with intercepted HTTP | 7 passed |
| Release-configuration build | Passed, 28 warnings of the existing kinds |
| Baseline before any change: 2.47.0 backend | 624 passed, 0 failed |

## Rights screen update, 4 November 2026

The Rights page and the Roles comparison were redesigned after the results above. Only the frontend changed: the catalog, the rules, the API and the database did not.

| Suite | Result |
|---|---|
| TypeScript check and production build | Passed. Entry chunk 893.45 kB, budget 900 kB |
| Frontend unit tests | 81 passed |
| Browser with intercepted HTTP | 13 passed |
| SQL-backed backend, on the QA LocalDB instance | 660 passed, 0 skipped |
| Browser against the real API, on the QA LocalDB instance | 158 passed |

## Release package, 4 November 2026

`release/TioHub-2.48.0.zip` was built with `build/Build-Release.ps1` from commit `a5c6596` on a clean checkout. The 660 SQL-backed tests ran in that build and passed. SHA-256: `f63124dcdcf292b1e947055f44462ea833faa66cc8c341c8515809f83b1dbce2`. The package has not been installed anywhere.

## What the tests prove

| Requirement | Evidence |
|---|---|
| Every API operation has a decision | `Every_api_operation_has_a_decision_and_every_decision_has_an_operation` compares the table with the real routes, both ways. Public decisions must equal the anonymous routes |
| The server enforces it, not just the interface | `No_operation_succeeds_for_someone_without_its_right` calls every operation directly as a person holding one unrelated right |
| Each capability category | `A_right_opens_its_category_and_nothing_next_to_it` checks 18 categories, allowed and refused |
| Users and roles | `RightsLifecycleTests`: several roles, inactive roles, clone, holders, deletion rules, inventing a right is refused |
| Effective rights | `RightsCatalogTests`, `RightPrerequisiteIntegrationTests`: prerequisites across roles, unknown and retired keys |
| Scope | `A_role_grant_does_not_widen_data_scope`, plus the existing scope and limited-exception suites |
| Authentication modes | Forms sign-in end to end. Directory mappings through the Development sign-in's group claims. **Not Windows itself** |
| Safeguards | Self-change, delegation ceiling, protected role, last administrator, stale updates, session revocation, deactivation, deletion with retained references |
| UI and API agree | Browser journeys through the new screens, including a real user being granted, narrowed and revoked, with direct API checks at each step |
| Upgrade rules | `RightsModelUpgradeTests`: each mapping rule, each person's access per the old rules, container denies, directory mappings, audit, old rows untouched |
| Review script | Run on a 2.47 database. It writes nothing, and reports what the migration then does |
| Rollback | `Down` restores the 2.47 schema with the old rows, and upgrading again works. `01-schema.sql` runs on an empty database, re-runs as a no-op, and upgrades an earlier schema |

## What changed in existing tests

Replacing the model meant changing tests. None was loosened to pass, but you should know what moved.

- **Mechanical:** names, routes and payload fields, across 35 files. Test roles now use the `Fixture` helper, and test payloads can name roles, which the test client turns into ids.
- **Removed:** `PermissionHierarchyTests` and `AuthorizationPathCasingTests`, whose subject no longer exists. The route table and the catalog tests replace them. Browser specs `hierarchy-ui` and `access-roles-isolated` went with the screens they tested.
- **Rewritten:** `HierarchicalAuthorizationIntegrationTests` became `RightPrerequisiteIntegrationTests`, testing the same protections through prerequisites. The same goes for the browser journey in `access-control-real-api`, which now goes through Roles, Rights and Users.
- **Moved on an upgrade path:** the old `Down` refusal test now sets up its scoped row in the old table, because that is where it lived at that point in the history.

## Problems the tests found and fixed

- A new Operation Engineer role was missing `tab.ClientStructure.contacts:Create`, compared with what 2.47 gave. A frozen comparison caught it. Existing roles were not affected.
- The expand buttons in the new role comparison were 22 px tall, under the 24 px minimum.

## Not verified

| Item | Why | Needed before production |
|---|---|---|
| **Upgrade of a real database** | Tested from a generated 2.47 schema with fixture rows that cover each rule, not your data | Follow [RIGHTS-MODEL-UPGRADE.md](RIGHTS-MODEL-UPGRADE.md) on a restored backup and compare a sample of accounts |
| **Windows authentication and real directory groups** | Tests use Forms and Development sign-in | Sign in with real accounts on the target server |
| Live directory lookup | Needs a domain. Off by default | Validate on a domain before enabling |
| IIS install and upgrade scripts | The package is built, but the scripts have never run | Run them on staging |
| Application rollback on a real server | The schema path is tested. The 2.47.0 application was not started against an upgraded database | Rehearse on staging |
| Assistive technology, formal accessibility audit | Automated checks only: names, keyboard order, target size, phone width | Review if your organization requires it |
| Multi-instance behaviour | Revocation is tested in one process | Test if you run more than one server |

## Known limits

- **The Reporting Center is stricter in the browser than in the API.** The pages also need `Platform:Export`; the overview and catalog API operations need only their View rights. This is unchanged from 2.47 and recorded in [RIGHTS-UI-COVERAGE.md](RIGHTS-UI-COVERAGE.md).
- **Handler decisions depend on the handler.** Where a right depends on the record, the table records it and the handler enforces it. The sweep test catches a missing check only if the handler doesn't answer 404 first, because it uses ids that don't exist.
- **Rule 2 of the migration has a forward effect.** A future holder of such a role gets the action without a separate container, because containers no longer exist.
- **Compensating allows are computed from last-observed directory groups.** Later membership changes are not modelled.

## Environment

.NET SDK 10.0.4xx, Node 22 from `.tools`, Microsoft Edge, SQL Server LocalDB 15.0.
