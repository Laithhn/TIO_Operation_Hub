**Issue ID:** TIO-BUG-007

**Title:** Ticket-list type hint differs from the configured type shown in detail

**Module:** Tickets / Overdue drilldown

**Page URL:** https://nb01994.vitronic.de/cases?due=overdue; https://nb01994.vitronic.de/cases/10795

**Category:** UX / UI

**Severity:** P3

**Business Impact:** An operator inspecting an overdue ticket receives an Incident type hint in the list but sees Bug on the same ticket detail, creating avoidable terminology ambiguity. The demonstrated mismatch is the tooltip/title/accessibility-snapshot hint, not a visible type column or a stored type change.

**Environment:** 10 November 2026, Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser ID 2, exact engine/build not recorded; existing TIO Manager account lmh; desktop 1920×1080 captures.

**Preconditions:** Existing overdue ticket CS-2595 (/cases/10795) is visible. The current configuration includes a ticket type labelled Bug whose built-in behavior is Incident. No ticket/type configuration is changed.

**Steps to Reproduce:**

1. From the Executive dashboard, follow the 73 overdue-ticket link to /cases?due=overdue.
2. Locate CS-2595 and inspect the ticket-entry title/type hint in the rendered list/DOM snapshot.
3. Open that ticket at /cases/10795 and read the type next to Client-related.
4. Compare with the read-only Bug entry under Administration → Configuration → Ticket types.

**Expected Result:** The list type hint and record-detail type use the same current configured display label. If built-in behavior is exposed, it is explicitly labelled Behavior rather than presented ambiguously as the ticket type.

**Actual Result:** The list entry containing the CS-2595 link has an Incident title/generic hint, while the detail displays Bug · Client-related. Configuration shows Bug with Incident behavior. The exact deployed raw stored code was not independently read from an API/DB; no actual type mutation or Jira import error was demonstrated.

**Reproducibility:** Once observed for the existing unchanged ticket in the saved overdue-list/detail journey; local source corroborates the presentation mismatch. A configuration rename/type-change creation scenario was not executed.

**Evidence:**

- [Overdue-list title/type hint](../traces/119-journey-overdue-drilldown.txt)
- [Overdue-list screenshot](../screenshots/119-journey-overdue-drilldown.png)
- [Same-ticket detail](../traces/120-journey-ticket-detail.txt)
- [Detail screenshot](../screenshots/120-journey-ticket-detail.png)
- [Configured ticket types](../traces/084-case-types.txt)
- [Source distinction and limitations](../traces/ticket-type-tooltip-source-analysis.md)

**Likely Root Cause:** Local source confirms inconsistent label resolvers: pages/ticket/TicketTable.tsx:47 uses label(r.type) in the title span, while Cases.tsx:265 uses T.name('CaseType',c.type). The optional Type column also uses the generic helper at TicketTable.tsx:62, a source-only extension of the risk. Both API projections use c.Type and keep TypeCategory separate. This supports a raw-token/configured-label presentation hypothesis; the precise deployed code and raw value were not independently verified. No type icon exists in that specific title-span expression.

**Recommended Fix:** Resolve list type hints through the shared configured CaseType name helper, consistently with detail. Apply the same helper to the optional Type column when present; label built-in behavior separately if needed. Preserve stored codes, categories, rights and Jira mapping behavior.

**Acceptance Criteria:**

1. For CS-2595-equivalent isolated data, list title/type hint and detail show Bug consistently.
2. Renamed/custom/retired configured types follow the same established label-resolution policy across hint and optional Type column.
3. Any displayed category is explicitly labelled as behavior; no record type/category value is mutated by the rendering correction.

**Regression Test:** Use approved isolated or in-memory fixtures where the type code differs from its configured label (for example a code humanized as Incident labelled Bug). Assert the list title attribute and detail text resolve the configured label; cover a rename and historical/retired type policy. Do not rename live configuration or trigger Jira imports for this regression.
