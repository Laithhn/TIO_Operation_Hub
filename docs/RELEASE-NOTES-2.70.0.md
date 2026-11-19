# TIO Operations Hub 2.70.0

Prepared 19 November 2026. **No database change:** `database/01-schema.sql` is unchanged from 2.69.0. If 2.69.0 is not deployed yet, run its schema script first (migration `AllRightsRoles`), as described in the 2.69.0 notes.

- **Notifications as one flat list** (A121, owner request).
  - The bell pop-up and the Notification Center no longer group related alerts ("4 overdue payments", "2 commitments due soon") and no longer show severity headings, status badges, coloured backgrounds or coloured left borders. Every notification is its own row.
  - Each row shows one severity icon on the left (red circle with "!" = critical, orange triangle = action required, info circle = information, green check = resolved), the title (bold while unread), a short description, the category and one relative time, a blue dot while unread and a **Review** button. A read critical alert stays critical; it turns into a resolved row only when its cause is cleared.
  - Order: critical, action required, information, resolved; newest first within each.
  - Review, or a click anywhere on a row, marks the notification as read and opens its record. Payment notifications open their contract (there is no page for a single payment).
  - In the pop-up only the list scrolls; the header, the All / Unread / Critical tabs and the new **Open Notification Center** footer stay in view.
  - Payment reminders now show the amount and payment condition under the title (for example "2,430,000 SAR · Second payment") instead of in the title, and a renewal reminder reads "Contract CT-1016 needs a renewal decision". Existing reminders are reworded at the next background scan (within 15 minutes of start-up); their read state is kept.

**Rights, configuration and seed data.** None needed: this changes how notifications are shown. The existing Notifications rights still decide who can mark notifications as read or delete them.
