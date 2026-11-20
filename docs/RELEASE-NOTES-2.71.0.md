# TIO Operations Hub 2.71.0

Prepared 20 November 2026. **Database change:** run `database/01-schema.sql` before deploying. It adds migrations `TicketDashboard` (rights rows only) and `PaymentMilestoneTemplate` (nullable columns on `contracts.ContractPayment`). If 2.69.0 is not deployed yet, the same script also applies its `AllRightsRoles` migration.

- **Tickets dashboard** (A123, owner request). *Tickets → Tickets dashboard* (`/cases/dashboard`), modelled on a Jira board, with filters for client, team, product and opening period (any time, 7, 30 or 90 days, 12 months).
  - Figures: all tickets, % done, unresolved, unassigned, overdue, waiting for customer.
  - Tickets by configured status (donut), the 10 most urgent unresolved tickets per responsible party with "1–10 of N", statistics per owner, priority, type and client, and the 30 newest activity entries.
  - Every figure opens the ticket list it counts.
- **Payment milestone template** (A124, owner request). Contract payment terms show the template's columns: milestone, planned invoice date, invoice amount, %, actual invoice date, invoice no., work status, client approval, payment status, amount received, outstanding, notes. **Update** on a row changes one milestone without editing the contract (`Contracts:Maintain`). The Financial dashboard (screen and Excel), Client 360 and its export show the same columns. A Paid row recorded before this release, with no amount received, counts as fully received.
- **Reserved owner account TioAdmin** (A125, owner request). Forms mode seeds `TioAdmin`, holding every right, with no password. Its first password is set with the one-time code written to `App_Data/owner-claim-code.txt` on the server (see OPERATIONS.md). Deactivate it under Administration → Users if you do not want it.
- **Vault references removed** (A126, owner request). The *Vault reference prefix* setting is gone and its row is deleted from existing databases at start-up (audited). The secret-detection message now says the hub must never hold secrets.

**Rights, configuration and seed data.**
- New right `TicketDashboard:View` (requires `Cases:View`). The upgrade grants it to every role that can already see tickets. **Owner to confirm this default**; change it in Administration → Roles.
- New configuration lists *Payment milestone work statuses* and *Payment milestone client approvals* (Administration → Configuration → Contracts & Tickets), seeded only when empty.
- New setting `Auth:OwnerClaimCodeFile` (claim-code path, optional).
