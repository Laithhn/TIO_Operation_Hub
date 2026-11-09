# TIO Operations Hub 2.51.4

Prepared 5 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. This release has no database change of its own. Upgrading from before 2.51.3? Read the earlier notes as well.

## Mapping Jira users (A92)

- **Every active hub user can be chosen.** The list used to hide people with no role, so a Vitronic team member could not be selected, and the page showed "Current owner (#22) — not assignable in this scope" in their place. That text no longer appears here.
- **One person can have several Jira accounts.** Each account can be mapped to the same person, and replies and assignments from any of them count as that person. The list shows who already has an account mapped. Mapping a second account used to fail with "Another Jira user of this connection is already mapped to this person."

## Clicking a row opens its record

On lists with a client column, such as Cases, Commitments, Environments and Escalations, clicking a row opened the client. It now opens the case, commitment or other record in that row. Clicking the client's name still opens the client.

## SLA figures change when you map people

Mapping, remapping or clearing a Jira user now recalculates the first responses of the cases that person commented on, and their SLA results, at once. There is no separate step. A first response a person recorded stays. **Recalculate first responses** remains for the whole connection.

A case that closed with no first response now stops counting at closing, so "hours over" no longer grows every day. Existing cases show the corrected figure the next time they are recalculated. The banner saying a case waits on the customer no longer shows on a closed case.

After upgrading, press **Recalculate first responses** once, to pick up the people you mapped before this release.

## Upgrade

Deploy the application.
