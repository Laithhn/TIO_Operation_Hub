# Optional client organization structures (A64)

Clients remain independent records with their existing required fields, IDs, sub-client grouping, and operational scope. Zero relationships is valid. Organizational structure describes business participation, not access inheritance or contractual authority.

## Identity and context

The clients.Organization table represents reusable identities. A nullable unique ClientId points to an existing client; its name/alias are read from that client, preventing conflicting names. Other organizations need only a name; code, classification, contacts, address, description and status are optional. Existing clients receive one identity through the additive migration; new clients receive one in their save transaction. No placeholder edges are inserted.

## VITRONIC as the system operator

VITRONIC is the operating organization for this deployment of TIO Operations Hub. This describes who operates and administers the application; it is not a client, a permanent organization type, or a required top-level node in every client structure. In a project context, a VITRONIC legal entity such as VITRONIC LLC may separately be a contractor, subcontractor, supplier, or another participant according to that project's actual relationships. VITRONIC GmbH and VITRONIC LLC are separate organization identities unless the business explicitly records an association.

The deployment currently has no tenant model or `OperatingOrganizationId` setting. The VITRONIC name in the interface is deployment branding; it does not select an organization record or grant permissions. Do not infer a user's access from the operator identity or from an organization graph. Existing roles, permissions, and client/project scopes continue to control access. If a later feature needs to reference the operator as data (for example, to display its contact details), add an explicit optional application setting that references the appropriate organization identity; do not create a hierarchy edge or a second copy of the organization automatically.

A client can therefore be managed by VITRONIC without having a contractual link to VITRONIC in its graph. When a real contract does link the client and a VITRONIC entity, record that edge in the applicable client or project context with its contextual relationship type.

OrganizationRelationship is an adjacency-list edge. Its required ClientId owns the context. Optional ProjectId must belong to that client. No project means the client-wide context, distinct from every project context. Multiple parents/children and different roles/directions across contexts are supported. The database has no depth limit.

Roles are optional codes in Configuration → OrganizationRelationshipType. Defaults include Contractor, Subcontractor, Supplier and Partner. Labels never define structural levels. Retired values remain valid where already used.

## Integrity and access

Edges require visible valid participants/context. Self-links, duplicate pairs, cycles (including inactive edges), invalid dates and cross-client project references are rejected. Each mutation takes a transaction-owned SQL Server application lock for its exact client/project context before reading the full graph and saving. Concurrent reverse edges cannot both commit. A computed non-null project scope enforces uniqueness for client-wide edges too. Updates/unlinks require If-Match versions.

ClientStructure Create plus all-client scope creates catalog organizations; Maintain edits independent metadata; Coordinate plus full context-client scope changes relationships. Project-only users can read their project graph, not a client-wide graph. Linked client identities retain their visibility boundary. The existing app grants active business roles global scope and has no separate tenant model; this feature preserves that policy and adds no access inheritance.

Unlink removes only the edge. Client deletion detaches its canonical identity and preserves its name/available alias and relationships in other contexts. Explicit cascade deletion can remove edges owned by that client context, never shared organizations.

## API (prefix /api/v1)

| Route | Purpose |
|---|---|
| GET/POST /organizations | Search/paginate or independently create identities |
| GET/PUT /organizations/{id} | View/edit independent metadata; client-backed names use the client page |
| GET /clients/{clientId}/organizational-structure?projectId= | Context graph with root, unique nodes, edges, permissions and truncation flag |
| POST /clients/{clientId}/organization-relationships?projectId= | Add edge |
| PUT/DELETE /clients/{clientId}/organization-relationships/{id}?projectId= | Edit/move or unlink with If-Match |
| GET /organizations/{id}/hierarchy?clientId=&projectId=&maxDepth= | Focused descendant graph and optional depth |
| GET /organizations/{id}/children or /parents | Paginated immediate edges with clientId and optional projectId |

Graph responses cap at 1,000 nodes/2,000 edges and report truncation explicitly. Traversal is iterative. Paged direct neighbors remain available beyond these response limits, which impose no database depth restriction. Shared nodes use one identity with separate incoming edges.

POST /clients accepts optional organizationRelationships: each initial direct child selects childOrganizationId OR newOrganization (name required), plus optional relationshipType/description. The entire client and graph save atomically; invalid drafts leave no orphan records. Omitted/empty arrays preserve standalone creation. Add deeper levels after saving.

## Deployment and validation

Review/apply OptionalOrganizationGraph via database/01-schema.sql before deploying matching application files. The migration adds two tables, indexes and checks, backfills identities without editing clients, and creates no relationships. A29 groupings are not converted into contractor edges. Production automatic migrations stay disabled. Roll back application files first; dropping graph tables would discard graph data.

Focused API tests cover independent clients, draft rollback, reuse, roles/direction per context, multi-parent graphs, cycles, simultaneous requests, duplicates, moves, stale versions, permissions, deep/large retrieval, scope filters and deletion preservation. Browser tests cover optional controls, selection/creation, nesting, contexts and read-only behavior.

Validation on 23 October 2026: 24 focused .NET tests passed (organization graph/migration plus existing client, sub-client, deletion, notes and A63 regressions); 7 Playwright journeys passed (5 new organization journeys plus 2 existing client journeys). The API and production TypeScript/Vite build succeeded. Upgrade testing preserved active/archived clients' IDs, field values and row versions. Cycle detection was exercised at 20,000 levels and retrieval at 1,100 levels. Existing compiler/analyzer warnings and an unavailable NuGet vulnerability lookup remain; there were no build/test failures in the final checks. Interactive in-app browser inspection was declined; automated browser tests completed before that request.

The approved local development database TioHub_A63Run_20261023 was backed up and migrated: its 3 clients remain, with 3 canonical identities and zero inferred edges. No production/shared database was changed. The old resource-permission migration's ClientStructure Maintain mapping was corrected from legacy Manage to Edit, preserving engineers' pre-existing client/team editing behavior on upgrades that have not yet applied that migration.

## Files for this enhancement

- Modules/Clients: OrganizationEntities.cs, OrganizationModel.cs, OrganizationEndpoints.cs (new), ClientEndpoints.cs (optional atomic creation drafts).
- Data: HubDbContext.cs (mapping, canonical identities, audit labels), ReferenceData.cs (role defaults), migrations/20261023100730_OptionalOrganizationGraph.cs and .Designer.cs, HubDbContextModelSnapshot.cs, and the one legacy mapping correction in 20261023080108_ResourcePermissionMatrix.cs.
- Modules/Admin/AdminEntities.cs and Modules/Shared/Deletion.cs: reference list registration/usage protection. Modules/Shared/Cascade.cs: shared identity preservation. Modules/ModuleRegistration.cs: endpoint registration.
- Web: pages/OrganizationStructure.tsx and .css (new); pages/Clients.tsx, pages/Configuration.tsx, ui/Shell.tsx.
- Tests: tests/TioHub.Tests/OrganizationHierarchyTests.cs and tests/e2e/organization-hierarchy.spec.ts (new).
- Deployment/guidance: database/01-schema.sql, docs/DECISIONS.md, docs/OPERATIONS.md, this implementation note.
