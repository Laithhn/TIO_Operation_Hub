# TIO Operations Hub 2.61.0

Prepared 12 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **This release has no database change:** deploy the application only. It applies the immediate actions of the independent audit of 2.60.0 (`tio-development-audit-2.60.0/`, decision A111): what was measured or finished stays as it was.

## SLA results are kept (A111)

- **Priority changes.** A response or resolution that already has its result (met, breached, or still pending with its deadline passed) keeps the target it was measured against. Only an obligation that is still running takes the new priority's target. Lowering the priority of a breached ticket no longer turns the breach into "met", and no longer removes the indicative penalty priced from it. This applies to priority changes arriving from Jira as well.
- **Contract of a ticket.** Changing or removing the contract of a ticket that has an SLA result needs `Cases:Coordinate`. The reason is required, and the result reached before the change is written to the timeline. A ticket without a result is linked and relinked as before.
- **Cancelling.** Cancelling takes a ticket out of SLA and penalties. For a ticket that has an SLA result it needs `Cases:Coordinate`; the earlier result is written to the timeline.
- **First response.** Once the response deadline has passed, a first response dated before the deadline needs `Cases:Coordinate` and a note saying what the claim rests on. The timeline keeps the time it was entered. A late response at its real time is recorded as before and stays a breach. Synchronized tickets are unchanged: their first response is the first Jira comment.

## Finished records are not edited (A111)

- A **closed or cancelled ticket** refuses *Edit* and *Change due date*. Reopen it first. Comments, attachments, Jira references and recording the first response still work on a closed ticket. The *Edit* button is shown on open tickets only.
- A **completed or cancelled commitment** refuses edits. Reopen it first.

## Commitment deadlines (A111)

A deadline that has **already passed** is moved by `Commitments:Coordinate` only. Before the deadline, whoever maintains the commitment still revises it with a reason. A commitment completed after a deadline that was not moved reads *Completed late*.

## Delete with everything (A111)

- The request states how many related records the dialog listed (`?expected=`). If something was added or removed in the meantime, nothing is deleted and the dialog must be opened again. Both delete dialogs do this automatically.
- A **ticket with an SLA result is kept as evidence.** It cannot be deleted alone, with its dependents, or through a client, project or contract whose deletion would delete or unlink it; the message names the tickets. A ticket raised by mistake is cancelled by ticket coordination, with a reason, and can then be deleted.

## Change history follows your access (A111)

- Entries for rows that have no client of their own — SLA targets, payments, fees, milestones, penalty clauses, project products, timeline events, team members — now carry the client or team of the record they belong to.
- A person who does not see every client and team no longer sees unscoped entries written before this release, except product and configuration history and their own actions.
- The export log lists only your own exports unless you see every client and team, because its filter text names clients.

## Rights and settings

No new right, setting or seed data. The rules use `Cases:Coordinate` and `Commitments:Coordinate`, which the TIO Manager role holds. **Operation Engineers can no longer:** change or remove the contract of a ticket that has an SLA result, cancel such a ticket, record a back-dated response after the response deadline, edit closed tickets or completed commitments, or move a commitment deadline that has passed. Grant the two coordination rights to team leads if they should keep doing this.

## For integrators

- `DELETE /dependents/{kind}/{id}` needs `?expected=<total from GET /dependents/{kind}/{id}>`: 428 without it, 412 when the set changed, 409 when it would delete or unlink tickets with an SLA result. `DELETE /cases/{id}` answers 409 for such a ticket.
- `PUT /cases/{id}` and `POST /cases/{id}/due` answer 422 on closed or cancelled tickets; `PUT /commitments/{id}` answers 422 unless the commitment is open.
- `POST /cases/{id}/contract`, `/cancel` and `/first-response`, and `POST /commitments/{id}/revise`, answer 403 in the cases described above.
- `docs/openapi-v1.json` was regenerated (374 operations).

## Not changed

Audit findings that are not part of this release: duplicate submissions, past due dates, uniqueness of contract references and names, ownership as an access control inside a client, escalation target dates, error text for invalid values, the page shown for an unknown address, colour contrast and dialog focus. See `tio-development-audit-2.60.0/14-PRIORITIZED-REMEDIATION-ROADMAP.md`.

## Not yet validated

- The browser journeys in `tests/e2e` were **not run** for this release (they need Microsoft Edge and Windows authentication). Run them on the Windows machine before deploying.
- Verified on a Linux container only; see TEST-RESULTS.md. No user has tried these changes, and they have not been run on live data or with Jira synchronization switched on.
- Audit entries written before this release are not re-stamped with their client.

## Upgrade

1. No database script is needed.
2. Deploy the application.
3. Tell Operation Engineers what now needs coordination, or grant `Cases:Coordinate` / `Commitments:Coordinate` to the people who should decide.
