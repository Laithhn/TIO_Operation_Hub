# Decision A63 — resource permissions, SLA penalties and workflow labels

**Owner request:** 23 October 2026  
**Status:** Implemented in the application; database changes await DBA deployment
**Scope:** Follow-up to requests 5–12. This records the behavior to build; it does not itself change authorization, database schema, or production data.

## Permission matrix

Replace the four broad business-operation rights (Edit, Manage, Archive, Delete) with a resource-by-action matrix. Keep Export, Technical detail, Audit and Administration as separate cross-cutting rights.

Every business role continues to be able to view all records, consistent with A22. A permission controls an action, not record visibility. Client/project/team scope remains an independent authorization check; an action right never grants scope. The application administrator without a business role continues to have no business-data access.

The matrix has these resource rows:

| Resource | Included records and actions |
|---|---|
| Client structure | Create/edit clients and sub-clients, regions and projects; assign project managers and owners |
| Contracts | Create/edit contracts and their terms, including SLA and penalty clauses |
| Environments | Create/edit environments and report conditions |
| Servers | Create/edit servers, volumes and server-hosted components |
| Installations | Create/edit installations, versions and deployment history |
| Products | Create/edit products, modules, features and versions |
| Cases | Create/edit cases; separate coordination actions cover triage, assignment, status transitions and contract linking |
| Commitments | Create/edit commitments; separate workflow actions cover revision, completion, cancellation and reopening |
| Teams and handovers | Maintain teams, membership, coverage, handovers and reassignment |
| Other operations | Contacts, responsibility boundaries, firewall rules, escalations and attachments, each checked against its owning record's scope |
| Administration | Lookup values, review policies, Jira instances and application settings remain under the separate Administration right |

For each resource, the role editor exposes **Create**, **Maintain** (edit existing records), **Coordinate** (the resource's privileged workflow or assignment actions where applicable), **Archive and restore** (where supported), and **Permanently delete unused records** (where supported). Create is separate from Maintain so editing an existing client structure record does not automatically grant authority to create clients or regions. The UI groups rights by resource and explains the effect of each action. Unsupported action/resource combinations are not shown. Exports, technical details, change history and administration retain their existing separate rights.

| Role profile | Default |
|---|---|
| TIO Manager | Every matrix action and cross-cutting right. The built-in role stays locked and cannot lose Administration. |
| Operation Engineer | Preserve the effective day-to-day permissions in A22: create and maintain contracts, environments, servers, installations, products, cases and commitments; maintain existing client-structure records where previously allowed; retain the current engineer workflow actions; keep the existing Export, Technical detail and Audit defaults. No client-structure creation/coordination, archive/restore, permanent deletion, or Administration unless a TIO Manager explicitly grants those rights. |
| Custom role | Only the rights selected by the TIO Manager. Read remains available to every business role under the current A22 policy. |

The permission check must be applied in API handlers and reflected in the UI; hiding a button is not authorization. Existing role assignments migrate without privilege expansion: old Edit maps to the Create and Maintain rows its handlers currently permit; old Manage maps to the structure creation, coordination and assignment actions its handlers currently protect; old Archive and Delete map to the matching supported resource actions. Export, Technical detail, Audit and Administration keep their values. The locked TIO Manager remains fully privileged. Audit each permission change and make it effective on the next authorization refresh.

Store the matrix as normalized role-permission rows keyed by role, resource and action, rather than extending the current 32-bit flags. This avoids a fixed bit limit and allows future resource rows. Do not add per-record ACLs or change the current all-client visibility policy in this decision.

## SLA contract penalties

Add a **Penalties** section to SLA/support contracts. Penalties are recorded contractual terms and indicative calculations; the hub does not issue credits, change payment rows, or send invoices.

A contract may contain multiple clauses. Each clause records:

- A name and one trigger: **response SLA breached** or **resolution SLA breached**.
- A calculation: **fixed amount per breach**, or **percentage of an explicit reference amount per breach**. The percentage is 0–100; the reference amount is entered on the clause and is never inferred from the contract's general fee rows.
- An optional maximum amount per clause per billing month. No cap means uncapped as recorded in the contract.
- The amount currency, inherited from the contract. A penalty clause cannot be saved unless the contract has a currency.
- A required IANA billing time zone when a monthly cap is used; the cap period is the calendar month in that zone.

A qualifying event is one measured response or resolution obligation whose SLA result becomes **Breached** under A61. Each obligation counts once, even when recalculated. Not applicable, not measurable, pending, or met obligations do not incur a penalty. If both obligations breach and clauses cover both, each applicable clause is counted. For each clause and billing month, sum the qualifying amounts, apply the monthly cap, then round to the currency's ISO 4217 minor-unit precision. Store the calculation inputs, clause/terms snapshot, breach identity, period, result and review state so it is idempotent and auditable.

Penalty clauses are snapshotted with the SLA terms when a case is linked to a contract. Later edits affect newly linked or relinked cases only; they do not rewrite prior case terms or results. A result is marked **Needs review** until an authorized user confirms it. Confirmation is an auditable acknowledgement, not an automatic accounting action. Contract, case and penalty records keep the existing access, scope and audit rules.

## Condition and case-status configuration

Support **label changes only** for the existing Condition and CaseStatus values. Keep the stable API/storage codes, complete built-in value set, order, and semantics. Administrators may change the display label for a code; they cannot add, retire, delete, reorder, or rename its code.

Condition values (Unknown, Healthy, Degraded, Unavailable) drive dashboard grouping and severity. Case statuses (New, Triaged, InProgress, PendingValidation, Closed, Cancelled) drive transitions, open/closed classification, SLA clocks, reporting and reopen behavior. Custom workflow values would require a separately designed transition graph, terminal-state rules, SLA behavior, reporting semantics and migration strategy. Until that model is approved, the API continues to accept stable codes and custom values are refused.

## Delivery notes

This decision needs implementation work: a permission-schema migration and authorization/UI updates; penalty entities, endpoints, UI and migration; and a configuration-backed display-label source for the fixed workflow codes. Deployment still follows the DBA procedure in OPERATIONS.md. The production database must not be migrated by application startup.

