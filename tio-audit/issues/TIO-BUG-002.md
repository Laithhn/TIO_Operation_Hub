**Issue ID:** TIO-BUG-002

**Title:** Jira user-mapping audit displays a large negative TIO user identifier

**Module:** Administration / Change history / Jira user mappings

**Page URL:** https://nb01994.vitronic.de/admin/audit

**Category:** Data / Functional

**Severity:** P2

**Business Impact:** The before/after audit value cannot be used as a trustworthy user association, impairing mapping traceability and investigation. Evidence does not establish a negative actual business-table foreign key, failed synchronization, lost user or access escalation.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Desktop viewport 1920 × 1080.

**Preconditions:** Existing audit rows include the 10 November 2026 13:45 update of Jira user mapping 552 for Ngirababo and the associated User creation entry. The account may view Change history. No mapping creation is performed.

**Steps to Reproduce:**

1. Open Administration → Change history (/admin/audit).
2. Keep Changes by people and inspect the existing recent rows; use the table Filter rows text Ngirababo to locate the sampled update.
3. Read Changes (before → after) for Jira user mapping 552 and compare the nearby User creation audit entry.
4. Revisit the same existing entry to confirm the displayed value persists.

**Expected Result:** A user-association audit records and displays the final real user identifier losslessly, or an explicit safely resolvable reference; it must not show a temporary identity sentinel as a completed association.

**Actual Result:** The existing mapping update displays Tio user id: — → -9223372036854775000. A nearby entry records creation of a named user/team member. The invalid-looking number is confirmed in the audit UI only; the raw stored audit string and current mapping foreign key were not inspected in a database.

**Reproducibility:** Always when viewing the existing sampled entry in the repeated read-only observations; the mapping/user creation trigger was not reproduced, so frequency for new mappings is unknown.

**Evidence:**

- [Initial Change history observation](../traces/054-admin-audit.txt)
- [Focused repeated audit evidence](../traces/113-audit-user-mapping-evidence.txt)
- [Focused screenshot](../screenshots/113-audit-user-mapping-evidence.png)
- [Source and precision analysis](../traces/audit-mapping-source-analysis.md)

**Likely Root Cause:** Hypothesis supported by local code: the existing mapping is assigned a new User navigation and saved once; modified scalar audit values are captured before the database save resolves generated IDs (HubDbContext.cs:1575–1593). A temporary EF identity may therefore be frozen in the audit snapshot. Subsequent native JSON number parsing can round very large 64-bit values. Neither exact production stored value nor that production creation path was reproduced; the local numerical demonstration only explains the displayed number shape.

**Recommended Fix:** Preserve original audit values intentionally, then resolve generated/fixed-up current identifier values after successful business save and before audit serialization, within the same transaction. Transport/render large identifiers losslessly. Investigate historical affected entries through an approved append-only correction process; do not silently rewrite audit history.

**Acceptance Criteria:**

1. An isolated mapping-to-new-user operation produces an audit target identifier equal to the final saved User ID, with no temporary negative value.
2. Large supported identifiers survive serialization/rendering without precision loss; original before-values and atomic audit/data persistence are preserved.
3. The existing sampled history has an approved traceable explanation/correction without an unauthorized rewrite of production audit records.

**Regression Test:** Use an approved isolated SQL fixture for mapping an existing unmapped Jira user to a newly created hub user/team member through the one-save path. Assert business FK and audit after-value equal the final User ID; cover contact creation, rollback/failure and preserved original values. Add lossless frontend ID rendering coverage if identifiers beyond the JS safe integer range remain supported. Do not reproduce by creating live users/mappings.
