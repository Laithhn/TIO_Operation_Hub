# TIO Operations Hub 2.65.0

Prepared 13 November 2026. **Apply the included `database/01-schema.sql` before deploying the application files** (migration `20261113063436_PaymentsDashboard`). It changes no table: it adds two rights and grants them to existing roles. It adds the Payments dashboard (decision A115) and an Operational dashboard fix (A116) on top of 2.64.0.

- **Payments dashboard** (Dashboard → Payments). Every contract payment term you can see, as **Paid**, **Upcoming** (including those due within 14 days, setting *Contracts.PaymentReminderDays*) and **Overdue**, with the amount per currency and the number of terms. Click a total to list only those terms.
- **Filters, all multi-select.** Years (calendar years; tick one or several, or all years; default this year), Clients, Contract owners, Products and Currencies. The page keeps the choice in its address. Overdue terms from years that are not selected are still mentioned, with *Show all years*.
- **What it shows.** Payment terms by month (one year) or by year; overdue terms by how late they are (1–30, 31–60, 61–90, over 90 days); a table by client (most overdue first, with a link to Client 360); and the list of terms. Paid terms count in the year they were paid, others in the year they are due. Waived terms, open terms of terminated contracts and terms without a date are counted apart. Amounts are never added across currencies.
- **Export to Excel.** The same view as a workbook: Summary (filters and totals), Payment terms and By client. Every export is recorded in the change history with the filters used.
- **Operational dashboard.** It now opens on *Everything* by default (was *My work*), and the *Show* switch no longer overlaps the Client filter (A116). The API's `view` defaults to `all` when not given.
- **API.** `GET /dashboard/payments` and `GET /dashboard/payments/export`; see `API.md` (Audience dashboards).

**Rights, configuration and seed data.** Two new rights: *Payments dashboard: View* and *Payments dashboard: Export*. The schema script grants View to every role that already holds *Operations dashboard: View* and *Contracts: View*, and Export to those of them that also hold *Contracts: Export*. The export also needs *Export files* (platform). New installations give both to Operation Engineer; TIO Manager holds every right. Filtering by product needs *Products: View*. No new setting or configuration list; no demo data is added to a production database.

**Owner to confirm (proposed default):** which roles receive the two new rights.
