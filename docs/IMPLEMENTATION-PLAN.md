# TIO Operations Hub — implementation plan

Source of truth: *TIO Operations Hub — Standalone business requirements document v1.0 (16 October 2026)* for behaviour and scope;
the supplied VITS screenshot ("Wanted Plate Management") for visual design only.

## Starting point

The working folder was emptied during this session (the earlier v1.0 pilot code, release package and design HTML were removed
outside this session). The application is therefore built fresh against the standalone BRD. Nothing from earlier documents is required.

## Technology choices

| Concern | Choice | Why |
|---|---|---|
| Runtime | .NET 10 (SDK 10.0.401, LTS) | Installed on this machine; supported LTS until Nov 2028 |
| API | ASP.NET Core 10 minimal APIs, versioned under `/api/v1`, OpenAPI document at `/openapi/v1.json` | Small surface, explicit endpoints per module |
| Persistence | EF Core 10 + SQL Server (LocalDB for development/tests, SQL Server 2019+ for servers) | BRD technology constraint |
| Sign-in | Windows Integrated (Negotiate) behind IIS — assumed approved organization sign-in; isolated Development/Testing sign-in that refuses to start in any other environment | BRD ACC-01/NFR-01; identity provider is an open decision |
| Front end | React 18 + TypeScript 5 + Vite 7 + TanStack Query + React Router | Built into the API's `wwwroot`, one deployment |
| Tests | xUnit unit + integration tests against real SQL Server (LocalDB); Playwright end-to-end against installed Microsoft Edge | BRD Section 8 |

## Architecture (modular monolith)

```
src/TioHub.Api
  Common/          shared kernel: base entity, errors, validation, paging, CSV, time zones, link and secret guards
  Data/            HubDbContext (scope filters, audit-in-transaction), migrations, seeders
  Security/        sign-in, user resolution, effective permissions (role + scope + grants)
  Modules/
    Access/        users, roles, scopes, grants, group mappings
    Clients/       clients, regions, projects, contacts, responsibility boundaries, Client 360
    Environments/  environments, condition reports, Environment 360
    Catalogue/     products, modules, versions, installations, version matrix
    Inventory/     assets, components, component hosts, volumes, shared storage, totals
    Network/       network contexts, endpoints, addresses, groups, dependencies
    Work/          cases, waiting intervals, Jira references, affected records, documented impact
    Commitments/   commitments and their event history
    Teams/         teams, members, coverage, reassignment queue, handovers
    Quality/       review policies, meaningful reviews, data-quality items, document references
    Reporting/     dashboard, action list, drilldowns, search, CSV exports
    Admin/         reference lists, Jira instances, settings, audit, archive/restore
src/web            React front end (design tokens, shell, shared components, pages per module)
tests/TioHub.Tests xUnit unit + SQL Server integration/acceptance tests
tests/e2e          Playwright browser journeys
```

Each module owns its entities, validation rules and endpoints. Cross-module reads go through the shared `HubDbContext`;
there are no speculative repositories or message buses.

## Delivery sequence (vertical slices)

1. Foundation: solution, DbContext, migration, sign-in, permission model, audit, errors, concurrency.
2. Design tokens, shared components, application shell matched to the screenshot.
3. Clients, regions, projects, contacts, boundaries, environments, Client 360 / Environment 360.
4. Catalogue, installations, version matrix, assets, components, storage, endpoints, dependencies.
5. Cases, Jira references, commitments.
6. Teams, coverage, handovers, reviews, review policies, data quality, document references.
7. Dashboard, action list, reports, search, exports, administration, archive/restore.
8. Acceptance tests (AC-01…AC-16), visual comparison, documentation.

## Technical assumptions (reversible, recorded here and in `docs/DECISIONS.md`)

- Approved organization sign-in = Windows Integrated authentication through IIS (as the existing environment uses AD). Can be swapped for OIDC/Entra ID.
- Users may hold several roles. Business data access needs a business role **and** a scope grant (client, project or internal team).
  Application Administrator alone sees no client data; Export, Technical detail and Audit are separate grants.
- Project scope grants the client summary plus records linked to that project (environments and their inventory, commitments, cases touching those environments).
- Restore requires Team Lead or Manager within scope (administration alone is insufficient).
- Approved link hosts, vault-reference prefix, coverage policy and review policies are configurable settings seeded with placeholder-safe defaults (no real hosts).
- Condition-evidence review interval defaults to 7 days (BRD gives no figure); configurable.
- Time zones are IANA identifiers; ambiguous local times (DST overlap) require an explicit offset; invalid local times (DST gap) are rejected.
