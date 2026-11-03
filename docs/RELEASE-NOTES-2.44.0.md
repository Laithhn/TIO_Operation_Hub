# TIO Operations Hub 2.44.0

Prepared 2 November 2026.

Rights Management now supports independent Module, Submodule, Tab/section and Action grants using the existing permission registry and role assignments. Parent access is mandatory and grants no children. Disabling a parent retains child assignments while blocking their effective use.

The Rights editor adds four-level labels, expandable branches, partial-selection indicators, filtered bulk previews, staged-change review, discard/restore, read-only administration and save/error feedback. Existing routes, tab content, mutations, exports, personal notes, notifications and administrative operations are checked against the hierarchy. Combined detail APIs filter denied sections. Parent re-enablement and user reactivation are checked against the acting administrator's authority.

The manifest contains 330 definitions (10 modules, 33 submodules, 52 tabs/sections, 235 actions). Existing resource/action identifiers are preserved; new roles remain denied until explicitly configured. Active roles combine by union before prerequisites are evaluated. No per-user permission override feature was introduced.

## Deployment

Review `database/03-permission-hierarchy-review.sql`, take a backup, and have the DBA apply the included idempotent `database/01-schema.sql` before replacing application files. New migration `20261102110000_HierarchicalPermissions` extends the existing registry and makes one-time, audited compatibility assignments. The package also includes the preceding ProjectPermissions and existing registry/granular-authorization migrations for installations that need them. Do not enable production startup migrations.

The implementation report [AUTHORIZATION-HIERARCHY-2.44.md](AUTHORIZATION-HIERARCHY-2.44.md) documents exact rules, upgrade mappings, legacy shared-source ambiguities, modified files and rollback. The complete key/parent/prerequisite inventory is [AUTHORIZATION-HIERARCHY-MATRIX.md](AUTHORIZATION-HIERARCHY-MATRIX.md).

## Validation and provenance

Build and automated checks are recorded in `RELEASE-VALIDATION-2.44.0.md`. The owner approved validation using temporary, uniquely named test databases and services. The idempotent deployment SQL applied successfully twice to an isolated database; the full SQL-backed .NET suite passed 309 tests, and the real API browser suite passed 149 tests. Those temporary databases were removed. A package build does not apply its migration to any deployment database.

The package is built from the current working tree, including pre-existing uncommitted authorization work required by this implementation. `BUILD-INFO.txt` records the base commit, dirty-tree state and build time; it must not be described as a clean committed release. No shared/production database or running production service was changed. IIS deployment, Windows authentication, actual role mapping review and production UAT remain operator checks.
