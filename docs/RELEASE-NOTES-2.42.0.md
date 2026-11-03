# TIO Operations Hub 2.42.0

Production deployment package, 30 October 2026. Authorization administration and registry foundation.

## Changed

- Added a persisted permission metadata catalog synchronized from the explicit `ResourcePermissions.Registry` manifest. Registry synchronization inserts and updates metadata and marks removed manifest entries inactive without deleting role assignments.
- Added multiple role assignments per user, role cloning and activation controls, active-role evaluation, access inspection, role grant ceilings, and protections against removing the last active administrator.
- Added reusable React permission helpers and an admin-route guard. These are presentation controls; backend authorization remains authoritative.
- Added discovery, coverage, administrator, and migration documentation.

## Database and deployment

- Apply the regenerated `database/01-schema.sql` before deploying this version. Migration `20261030062806_PermissionRegistry` adds `iam.PermissionDefinition` and `iam.AppRole.IsActive`; existing roles receive `IsActive = 1` by default.
- The migration preserves role assignments. Production startup migrations remain disabled. Follow the backup, DBA apply, IIS deploy, and rollback procedure in `docs/OPERATIONS.md`.
- Do not deploy this package until the authorization coverage matrix and the limitations below have been reviewed for the target environment.

## Known limitations

- Authorization remains resource/action-centric. Not every page, tab, field, component, API action, background operation, export, or record boundary has an individually configurable permission or a completed enforcement review.
- The access inspector is available; permission simulation, role comparison, unused-role reporting, and a dedicated authorization audit history interface are not included.
- Existing A22/A63 scope semantics are preserved. New tenant or record-level restrictions are not introduced by this release.
- Permission cache invalidation is process-local; multi-instance revocation consistency is not distributed.
- This package is an implementation increment and does not certify that all acceptance criteria for a comprehensive authorization system are met.

## Validation

- API build: passed.
- .NET tests: 273 passed, 0 failed, 0 skipped.
- TypeScript and Vite production build: passed.
- Playwright end-to-end tests were not run for this package.
- No database migration was executed during package preparation.
