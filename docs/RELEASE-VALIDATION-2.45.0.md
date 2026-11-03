# Release validation, 2.45.0

Validated 3 November 2026 on an isolated local instance, `(localdb)\TioHubQALocalDB`, with uniquely named databases. No shared, UAT or production database was touched.

**Status: release candidate.** The automated acceptance below passed. The items under "Not verified" must be done in the target environment before this is called production-ready.

## Results on the released code

| Suite | Result |
|---|---|
| Backend: unit, integration, security, against real SQL Server | **482 passed, 0 failed, 0 skipped** |
| Frontend unit tests | 82 passed |
| TypeScript check and production build | Passed |
| Browser against the real API, in Microsoft Edge | **157 passed** |
| Browser with intercepted HTTP (three suites) | 23 passed |

The backend suite includes:

- `01-schema.sql` on an empty database, a second no-op run, and an upgrade from the 2.44.1 schema that keeps existing exceptions as global.
- Migration `Down` refusing while scoped rows exist, and a down-and-up round trip keeping global rows.
- Database constraints exercised directly, without the application.
- The directory snapshot marker round-tripping through SQL Server.
- The backup and restore drill.

## The end-to-end acceptance workflow

`tests/e2e/access-control-real-api.spec.ts` runs with nothing intercepted:

1. An administrator signs in and creates a role.
2. They configure it in the permission matrix and assign it to a new user.
3. The effective permission shows in the snapshot.
4. The user signs in; the interface and API allow what was granted and refuse contracts, administration and a direct attempt to create a role.
5. A deny limited to one client removes edit rights there and leaves another client editable, and a direct API call is refused.
6. Removing the role gives 403 on the user's next request without signing out, and the interface says the account has no access.
7. The change history records it.

A second test checks phone width has no page overflow, keyboard order in the user picker, and accessible names in the access section.

## What the first full SQL run found

The committed 2.44.1 state had never been through the whole suite: **70 of 435 tests failed on commit `cafd3d7`**. Earlier reports covered a database-free subset. See [AUTHORIZATION-AUDIT-2.45.md](AUTHORIZATION-AUDIT-2.45.md). Most failures were tests that predated mandatory data scope. Two were real defects, now fixed: people with no readable group snapshot could not be assigned work, and failed scheduled reports gave their recipient no signal.

Changing existing tests was part of reaching this result. Those changes fall into these groups:

- Test people gained a data scope, so a permission test reaches the permission rather than the scope boundary.
- Roles gained the View and Details prerequisites that 2.43 introduced.
- Expected wording was updated where the message had changed.
- The list of pending migrations was extended.
- The restore drill now allows extra audit rows from sign-ins on the restored copy, and still requires nothing from the source to be lost.
- Three assertions now expect schedule history to mask failure text, a deliberate earlier hardening.

The fictional seed also changed so that seeded accounts match what the compatibility migration gives upgraded accounts. No test of a security boundary was loosened to make it pass.

## Not verified

| Item | Why | Needed before production |
|---|---|---|
| Upgrade of a real database | Tested from a generated 2.44.1 schema with a sample row, not a copy of real data. The compatibility migration's real effect on your accounts is untested | Restore the production or UAT backup to an isolated database, run `04-access-control-upgrade-review.sql`, apply the schema, run it again, and review the output |
| Windows authentication | Tests use Development and Forms sign-in | Sign in with real accounts and group mappings on the target server |
| Live directory lookup (`Auth:LiveDirectoryLookup`) | Needs a domain and the service account's rights. **Off by default** | Validate on a domain before enabling |
| IIS install and upgrade scripts | Not run on this machine | Run on the target or a staging server |
| Rollback on a real server | The migration guard is tested. The file swap and database restore are not | Rehearse on staging, including the scoped-exception precondition |
| Assistive technology, formal accessibility audit | Automated checks only: names, keyboard order, phone width. No screen reader or full WCAG review | Review if your organization requires it |
| Load and multi-instance behaviour | Cross-instance revocation is tested in one process with two caches, not on two servers | Test if you run more than one server |

## Master acceptance criteria not fully met

These are limits of the implementation, not of testing.

| Criterion | State |
|---|---|
| Legacy authorization mechanisms replaced; no old-versus-new inconsistency | **Partial.** Export, Audit, Technical detail and Administer remain as role rights alongside granular permissions. Both are enforced server-side, and the two compatibility helpers remain |
| Scoped user exceptions and record-level control | **Partial, deliberately.** Three edit permissions can take a scope; read permissions cannot. Use data scope to limit what a person sees |
| Stronger authentication or approval for privileged changes | **Not implemented.** The requirement says "consider". See A75 in [DECISIONS.md](DECISIONS.md); it needs an owner decision |
| Separation of duties at workflow level | **Not implemented,** for the same reason. Role-pair conflicts are opt-in |

## Environment

.NET SDK 10.0.401, Node 22 from `.tools`, Microsoft Edge, SQL Server LocalDB 15.0.
