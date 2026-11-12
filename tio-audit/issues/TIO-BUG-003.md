**Issue ID:** TIO-BUG-003

**Title:** Selectable ticket table reverses Details and selection column headers

**Module:** Shared tables / Tickets

**Page URL:** https://nb01994.vitronic.de/cases

**Category:** Accessibility / UI

**Severity:** P3

**Business Impact:** The first two native table headers do not describe the controls in their corresponding cells. This creates misleading visual/assistive table-column associations. Individual controls retain explicit accessible labels, limiting the demonstrated impact.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Desktop viewport 1920 × 1080, selection and row details both enabled.

**Preconditions:** Ticket table has at least one row and both selection checkboxes and Details disclosures. The sampled search CS-4003 yields a simple single-row example. Phone layout disables selection, so that layout is outside the demonstrated mismatch.

**Steps to Reproduce:**

1. Open /cases at desktop width and search CS-4003 with Status All.
2. Inspect the first two table headers: Details, then Select all rows shown checkbox.
3. Inspect the corresponding first-row cells: row-selection checkbox, then Details disclosure.
4. Compare their DOM/semantic order; no checkbox or record action needs activation.

**Expected Result:** The leading header order matches the row-cell order: selection header over selection controls, Details header over details disclosures, with correct native table associations.

**Actual Result:** Headers are Details → selection, while body cells are selection → Details. The saved DOM geometry/structure records both orders for the same table.

**Reproducibility:** Always for the desktop selectable Tickets table when both hasDetails and canSelect are true; the sampled row was inspected repeatedly.

**Evidence:**

- [Repeated ticket table snapshot](../traces/109-ticket-table-header-alignment.txt)
- [Repeated table screenshot](../screenshots/109-ticket-table-header-alignment.png)
- [Header/cell structural capture](../traces/ticket-table-header-alignment.json)
- [Source corroboration](../traces/source-inventory.md)

**Likely Root Cause:** Confirmed in local JSX: ui/kit.tsx:679–681 emits Details TH before selection TH; :708–713 emits selection TD before Details TD. pages/Cases.tsx:126–128 supplies details, and selection defaults on outside phone layout (:531). The live captured DOM shows the same order; deployed source revision was not independently matched.

**Recommended Fix:** Render the selection TH before the Details TH to match the existing body order (or consistently change both). Preserve accessible labels, scope and responsive behavior.

**Acceptance Criteria:**

1. When selection and details are enabled, the first two TH and TD columns have matching selection/Details meaning.
2. Tables with either control absent remain aligned; mobile details-only behavior remains intact.
3. Select all, row selection, expansion and keyboard labels preserve their established behavior.

**Regression Test:** Render the shared table with isolated in-memory rows under desktop and phone breakpoints. Assert leading TH/TD semantic order for selection+details, each alone and neither. Expand/select only synthetic rows; no live record mutation is required.
