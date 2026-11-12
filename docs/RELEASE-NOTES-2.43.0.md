# TIO Operations Hub 2.43.0

Release prepared 30 October 2026. This replaces the Rights screen shipped in 2.42.0 with the permission editor and adds enforced read, detail, history, file and export capabilities.

## Changes visible to administrators

- Administration → Rights is now **Rights and permissions**, with a role selector and an expandable module/resource tree. Search permission names and stable keys, filter by module/resource/action/sensitivity/assignment, and compare a second role.
- Checkboxes stage individual grants. Group buttons show an explicit confirmation and stage only the permissions currently shown. Expanding a group grants nothing.
- **Review and save** previews additions and removals, highlights sensitive actions and missing prerequisites, then saves the selected role in one audited transaction with its row version. Conflicts retain the draft for review.
- The explicit registry now contains **134 permissions**: 13 actions for each of ten business resource categories, plus dashboard, reporting, personal notes and notifications access. Existing keys are retained.
- New roles receive no record access until permissions are assigned. Existing roles receive compatibility assignments once through the upgrade migration.
- Direct routes and navigation follow effective permissions. Detail pages, history, attachments and exports have separate capabilities enforced by the API as well as the UI.
- File upload and deletion can be granted independently of record editing. Delete own attachments checks the uploader; Delete any attachment applies only within the authorized record scope.
- Access inspection excludes inactive roles/users and actions whose prerequisites are absent. Multiple roles combine before prerequisites are evaluated.
- Authorization administration validates and saves under a shared database lock. Grant ceilings apply to every administrator; Client structure coordination no longer bypasses them.

## Migration and operation

Apply the included idempotent `database/01-schema.sql` through the DBA process before replacing application files. New migration `20261030080145_GranularAuthorization` adds `iam.AuthorizationVersion`, compatibility assignments and upgrade audit entries. The preceding permission registry migration is also included for installations older than 2.42.0.

The compatibility migration preserves previously available reads and existing export/file authority. It runs once; registry synchronization never restores revoked assignments. New file grants preserve the deployed shared file service's previous Other operations edit/delete mapping. Administrators can then narrow each resource independently.

Each API request reads the shared authorization generation before using a cached snapshot. Supported administration changes advance that generation in the same transaction as grants and audit records. After commit, the next request on any instance sees the change. Requests already executing are not cancelled. The frontend refreshes `/me` every 15 seconds and on focus; the server remains authoritative throughout.

Follow `AUTHORIZATION-2.43.md` for administration, dependencies, checks and rollback. No production/shared database was changed during preparation.

## Remaining limitations

The registered controls are listed in `AUTHORIZATION-CAPABILITY-MATRIX.md`. Individual form fields and every workflow transition are not separate grants; existing Maintain/Coordinate policies still govern those operations. The combined dashboard needs all source module View permissions. Permission simulation and explicit user-level denies are not included. Existing A22/A63 organizational scope semantics remain; this release does not introduce a tenant model. SQL changes made outside supported application administration must also advance the authorization generation or wait for snapshot expiry.

Validation results are recorded in `AUTHORIZATION-2.43.md` after package verification. IIS deployment, Windows authentication and production UAT remain operator checks.
