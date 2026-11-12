**Issue ID:** TIO-BUG-004

**Title:** Mobile notification badge and action overlap grouped alert title

**Module:** Notifications

**Page URL:** https://nb01994.vitronic.de/notifications

**Category:** UI / UX

**Severity:** P2

**Business Impact:** The first urgent grouped alert becomes difficult to scan on a representative phone viewport: its severity badge collides with the alert title and crowds its action. This reduces clarity during daily operational triage; no notification-state or delivery failure was demonstrated.

**Environment:** 10 November 2026, original evidence approximately 16:41–17:07 Asia/Dubai; deployed footer 2.59.0; ChatGPT in-app browser (browser ID 2), exact engine/build not recorded; existing account lmh, TIO Manager. Mobile viewport 390 × 844; tablet comparison 768 × 1024. Existing All view with the 4 overdue payments group.

**Preconditions:** Existing grouped notifications contain the first Critical / overdue card titled 4 overdue payments and action View payments (4). Keep existing read state; do not click notification actions or Mark all as read.

**Steps to Reproduce:**

1. Open /notifications at 390 × 844 with All selected.
2. View the first Critical / overdue grouped card, titled 4 overdue payments.
3. Inspect the title, outlined Overdue badge and View payments (4) action.
4. Repeat the same mobile view, then compare the 768 × 1024 capture without activating notice actions.

**Expected Result:** At mobile width, title, badge and action occupy non-overlapping readable areas; the action may wrap or stack below the text.

**Actual Result:** The Overdue badge overlays the first title line; the action occupies the same cramped horizontal band. The repeated mobile screenshot reproduces the collision, while the tablet sample has separate title/badge/action areas. Measured rectangles place title at x86–213.05/y611.41–654.76 and badge at x133.91–204.58/y613.41–636.14, confirming intersection.

**Reproducibility:** Always in the repeated sampled 390 × 844 grouped-card condition; wider/tablet comparison did not show the same collision. This does not claim every notification text/viewport fails.

**Evidence:**

- [Initial mobile snapshot](../traces/102-notifications-mobile-overlap.txt)
- [Initial mobile screenshot](../screenshots/102-notifications-mobile-overlap.png)
- [Repeated mobile snapshot](../traces/104-notifications-mobile-reproduced.txt)
- [Repeated mobile screenshot](../screenshots/104-notifications-mobile-reproduced.png)
- [Tablet comparison](../screenshots/103-notifications-tablet-comparison.png)
- [Measured element geometry](../traces/notification-mobile-geometry.json)
- [Screenshot/CSS review](../traces/visual-review-observations.md)

**Likely Root Cause:** Source-supported hypothesis: Notifications.css page-specific .ntf-page .ntf-side max-width:40% overrides the less-specific phone max-width:none rule. Phone layout changes this non-shrinking side area to width100% with non-wrapping badge/action content, which can overflow its constrained width toward the text. Saved live geometry confirms the 40% maximum and collision; the deployed stylesheet revision was not independently matched to the checkout.

**Recommended Fix:** At the phone breakpoint give page-specific badge/actions an explicit full-width flex basis or independent grid row and remove the inherited maximum; allow action content to wrap when required. Verify individual/grouped cards and the bell popover independently.

**Acceptance Criteria:**

1. At 390 × 844, the sampled group title, badge and action have no intersecting rectangles and remain independently readable.
2. Long titles and action labels, grouped/individual alerts and expanded groups fit at mobile/tablet widths without hidden actions or document-wide overflow.
3. Existing keyboard labels, focus and notification read/delete/navigation behavior remain unchanged.

**Regression Test:** Use isolated/synthetic notification fixtures with grouped overdue payments, long titles and long actions. Capture 390 × 844 and 768 × 1024 and assert nonintersection of title/badge/action; keyboard-check the visible actions. Do not mark live notices read, delete them or send notifications merely to test layout.
