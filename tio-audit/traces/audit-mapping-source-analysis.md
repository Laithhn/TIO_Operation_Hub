# Supplemental analysis: invalid user identifier in Jira mapping change history

10 November 2026. Read-only local source inspection requested after the lead auditor's live screenshot/evidence 054 showed Jira user mapping updates whose `Tio user id` changed from absent to `-9223372036854775000`. The lead auditor also observed corresponding user-created entries with ordinary account data. This file analyzes likely causes; it does not assert that the deployed binary matches the local source or that a production DB value was queried.

## Direct source facts

1. `Modules/Jira/JiraAdminEndpoints.cs:370` and `:391` implement creation of a team member or ordinary hub user from a mapping. Both add a new `User`, assign the **existing** mapping's `TioUser` navigation to it, and call `SaveChangesAsync` once (`:381–386`, `:396–401`).
2. `JiraUserMapping.TioUserId` is a nullable long (`Modules/Jira/JiraEntities.cs:191`). It is an actual EF relationship FK (`Data/HubDbContext.cs:1395`).
3. The save pipeline assembles pending audits before the data save (`Data/HubDbContext.cs:1575–1579`). Modified entities call `ModifiedChanges` immediately; it copies original/current scalar values into arrays (`:1647–1656`), using `Plain` which retains ordinary numeric values (`:1674`).
4. The main `base.SaveChangesAsync` runs after that capture (`Data/HubDbContext.cs:1589`). During audit construction after saving, added entities call `AddedValues` at that later point, while modified entities reuse the earlier `p.Changes` (`:1593`). Changes are serialized and persisted on the second base save within the same transaction (`:1608`, `:1615`).
5. `/admin/audit` returns `a.Changes`, possibly masking restricted fields, as a string (`Modules/Admin/AdminEndpoints.cs:438`, `:564`). The page parses this inner JSON via native `JSON.parse` and converts values for display (`src/web/src/pages/common.tsx:57–62`).
6. Contact creation uses two saves inside a transaction, assigning `ClientContactId` only after the new contact has an ID (`JiraAdminEndpoints.cs:421–427`), unlike the one-save User navigation path.

## Likely mechanism (hypothesis)

EF can propagate a temporary generated numeric identity into a newly related FK before the database returns the actual ID. Capturing an existing mapping's changed FK before saving can therefore freeze that temporary value in its `ModifiedChanges` audit snapshot. The later database save can correctly resolve the real mapping FK while the already-copied audit scalar remains temporary. Added User audit data is captured after saving, consistent with the normal created-user record observed by the lead auditor.

Native JavaScript number parsing can then round very large 64-bit integers. A local, non-network demonstration executed during this review:

```text
Input JSON: {"TioUserId":[null,-9223372036854774808]}
String(JSON.parse(input).TioUserId[1]): -9223372036854775000
```

This reproduces the *displayed number shape*, not the production data creation scenario. It does not establish that the stored audit value equals the example input. The exact production audit `Changes` string was not captured by this reviewer, and no DB inspection occurred.

## Classification boundary

The lead auditor's live evidence establishes a misleading audit display. It does not by itself establish an invalid actual user mapping, a negative persisted FK in the business table, a lost user, permission escalation or failed Jira synchronization. Suggested classification is **P2 / Data integrity of the audit trail**, with business impact that an operator cannot reliably trace the recorded before/after user association.

Before claiming stored audit corruption, inspect the raw `changes` string from the existing authorized audit response without parsing the inner numbers, or have an authorized DBA inspect that single audit entry read-only. Before claiming a broken mapping, compare the current read-only Jira user-mapping detail/list to the matching real user. These checks must not modify data, re-run mappings or trigger Jira recalculation.

## Recommended correction and regression evidence

- Preserve pre-save original values and the property names to audit. For modified properties whose current values can be generated/fixed up, read final current values **after** the first successful data save and before audit serialization. Retain transaction atomicity. Simply rerunning `ModifiedChanges` after accepting changes can lose originals, so snapshot the originals intentionally.
- Represent potentially large identifiers losslessly when transporting/rendering audit values, for example explicit strings for identifier fields. This precision improvement does not itself repair a captured temporary FK.
- Add an approved isolated SQL regression: start with an unmapped Jira user record; create a related new hub user/team member using the existing one-save path; assert saved mapping FK equals the actual generated user ID, and the audit before/after FK records that same final ID with no temporary sentinel. Include the contact path, failed transaction and concurrent-change preservation.
- Add a frontend lossless-ID rendering regression for integers outside JavaScript's safe range if such IDs remain supported in the API contract.
- Historical audit remediation requires owner/DBA review and an append-only correction policy; do not silently rewrite production audit history.

No code fix or database action was performed. The local JS demonstration is the only executed calculation in this supplemental analysis.
