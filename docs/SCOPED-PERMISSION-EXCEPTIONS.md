# Scoped permission exceptions: implementation and cutover requirements

This is an implementation design, not a description of an enabled feature. Individual
permission exceptions currently apply throughout a person's independently assigned data
scope. The exception API rejects unknown scope fields. Do not enable those fields until
the enforcement and validation described here are complete.

## Security contract

An individual exception names a registered permission, an allow or deny effect, an
optional expiry, and either global scope or one client, project, or internal team.
Client, project and team identifiers are distinct namespaces. A scoped allow is never
authority to see data beyond the person's separately assigned data scope. It applies
only when the entire object and operation lie in the exception's scope. A scoped deny
overrides role or individual allows when **any** affected part of an operation
intersects the denied scope. This asymmetry matters for a case linked to multiple
projects and for bulk operations. Unknown, incomplete, deleted or ambiguous object
context must not turn a restriction into an allow.

At a given server time and resource context, evaluation order is mandatory security
restrictions, unexpired matching denies, unexpired matching direct allows, inherited
role allows, then default deny. Evaluate every prerequisite in the permission hierarchy
at the *same* context and time. Thus a scoped grant cannot bypass a scoped denial of a
parent, nor satisfy a dependency for a different project. An inactive user, inactive
permission or separation-of-duties conflict remains denied. Preserve the existing
restriction against direct administrative grants and self-administration. Any future
delegation model must test both current and future effective permissions at each expiry
boundary, not only the requested exception.

Client scope includes its child projects. Project scope applies only to records whose
complete relevant project association is known to lie within that project. Team scope
applies to internal records associated with the named team, not automatically to all
client records assigned to that team. A multi-project or mixed client/internal record
needs an explicit mapping of all affected contexts. For a deny, include every
associated context, including records hidden from the caller. If the server cannot
establish the complete set, deny the operation rather than treating hidden links as
absent. Keep creation, reassignment and moves constrained by both the old and proposed
contexts; a caller cannot move data to a scope they lack authority to change.

## Required implementation slices

1. Add a normalized exception representation with referential integrity and a check
   constraint requiring exactly one valid scope form. Preserve each existing exception
   as global, including its effect and expiry. Enforce uniqueness for each user,
   permission and scope, while allowing different effects in different scopes. The
   migration must not discard existing assignments. Review the generated idempotent
   deployment SQL and a recovery procedure before any execution.
2. Introduce one authorization decision service that accepts an authoritative resource
   context, time and complete permission prerequisites, returning a decision and reason.
   It must distinguish a global authorization decision from a contextual one. A caller
   asking for a global decision cannot be granted merely because one contextual grant
   exists. Avoid relying on frontend-provided resource ownership or scope.
3. Implement database-translatable visibility predicates per resource and action.
   Apply them to lists, counts, search, aggregate dashboards, nested records, reports,
   exports, notifications and attachments as well as direct reads. Filter before
   pagination or aggregation. Load all affected contexts for commands and bulk or
   cascade operations and authorize each before changing anything. A global endpoint
   precheck may reject obviously impossible requests, but cannot replace these checks.
4. Convert every use of the affected permission, including cross-module projections,
   background work and download paths, before declaring that permission eligible for
   scoped exceptions. A release may initially allow a small explicit set of permissions,
   but the API must reject scopes for every other permission. The allowlist must cover
   both allow and deny effects: accepting a scoped deny on a path that ignores it would
   be a security defect. Existing global permission checks are insufficient because they
   do not receive the requested object and cannot distinguish two projects.
5. Persist scoped exceptions through audited, optimistic-concurrency protected
   administration APIs. Validate live scope references, expiration, protected targets,
   and the administrator's authority for the entire effect of the change. Include scope
   and expiry in audit history and in inspection and simulation results. Make the GUI
   display the exact scope and clearly distinguish global permissions from contextual
   permissions; a conditional simulation must not promise that a workflow will succeed.
6. Include scoped exception state and its next expiry in authorization cache
   invalidation and exported-file access fingerprints. Re-evaluate current authority on
   report execution and download. Scope and relationship changes must invalidate any
   derived authorization snapshot. In-flight requests retain their documented snapshot;
   subsequent requests must observe the revocation.

## Acceptance tests before activation

Test matching and nonmatching client, project and team scopes; global role allow plus
scoped deny; scoped allow plus global and scoped deny; inherited and direct grants;
inactive permissions and users; strict expiry; nested prerequisites; disjoint scopes;
and cross-client, mixed-scope and multi-project records. Check every bulk operation is
atomic when one item is unauthorized. Verify hidden associations cannot be inferred or
altered through results, counts, exports, notifications, attachments or audit entries.
Use the actual SQL Server provider to execute the generated filters, including empty
and large scope lists, then exercise direct API calls and the GUI with two isolated
users on both sides of each boundary. Verify cached permissions and generated exports
are rejected immediately after a change or expiry.

Test the upgrade and recovery on an explicitly approved isolated database first.
This repository currently has database-free tests, but no scoped-exception feature or
database-backed evidence sufficient to claim this contract is implemented.
