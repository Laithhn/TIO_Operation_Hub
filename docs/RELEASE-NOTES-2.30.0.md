# TIO Operations Hub 2.30.0

Released 23 October 2026. Upgrade from 2.29.0 or an earlier supported 2.x installation with the supplied idempotent schema script and deployment scripts.

## Included changes

- Optional contextual organization structures: independent clients and reusable organizations, unlimited logical nesting, multiple parents, optional relationship roles, separate client/project contexts, diagram/table views, and paginated direct connections. Unlinking preserves organizations; cycles and duplicate edges are rejected safely under concurrent writes.
- Resource/action permission matrix for client structure, contracts, environments, servers, installations, products, cases, commitments, teams and other operations, retaining general Export, Technical detail, Audit and Administration rights.
- SLA penalty clauses and indicative, auditable assessments using case-time term snapshots, configurable caps and billing time zones. Assessments do not issue payments or credits.
- Configurable display labels for existing reported-condition and case-status workflow codes.
- Reporting Center fixes already present in this working source, covering export failures and retry, missing/expired files, date filtering and access checks.
- Upgrade checks now require elevation, the IIS management module, the site and application pool before any database backup/schema or application changes. Run Upgrade-TioHub.ps1 from an elevated Windows PowerShell session.

## Database and deployment

The package adds these migrations after 2.29.0:

1. ResourcePermissionMatrix
2. ContractPenaltyClauses
3. PenaltyAssessmentSnapshots
4. OptionalOrganizationGraph

Existing client data and IDs are preserved. Organization identities are added for existing clients; no contractor relationships are inferred. Relationship roles are managed in Configuration → Organization relationship types.

Back up the production database and application data before upgrading. Apply database/01-schema.sql using the supplied upgrade script or your DBA procedure, then deploy the matching application. Production automatic migrations and development seeding remain disabled. Keep appsettings.Production.json, App_Data, logs and the previous application folder as described in DEPLOYMENT-GUIDE.md.

Use an administrator PowerShell session for IIS installation/upgrade. This package has been built for win-x64 with the ASP.NET Core 10 hosting bundle required on the server.

## Validation and limits

Release validation: all 160 .NET tests passed in Release configuration, and the production TypeScript/Vite client build passed. Earlier focused validation passed 24 .NET regressions and 7 Playwright journeys, including existing client/sub-client flows. The legacy role-catalog acceptance test was updated for the new resource-permission contract. The upgrade script passed parsing and safely rejected a non-elevated preflight before any database/application operation.

Organization graph responses are bounded to 1,000 identities/2,000 edges, with paginated parent/child browsing beyond that response limit; the database has no fixed depth limit. Existing business-user visibility follows the application's current shared-team policy. Penalty calculations are indicative. Full Windows/IIS deployment and production UAT remain operator checks. Existing compiler/analyzer warnings and an unavailable NuGet vulnerability lookup were observed during local validation.

This package includes the current reviewed working source, including uncommitted changes. BUILD-INFO.txt records the base Git commit and working-tree status; it is not a claim that all packaged changes are committed. Verify the delivered ZIP using its companion SHA-256 file.
