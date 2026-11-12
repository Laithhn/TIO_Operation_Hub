# Usability validation plan (A102, release 2.55.0)

Release 2.55.0 changes how the tickets, dashboards and client pages work, based on an expert review. No user has tried it yet, so its effect is not measured. This plan measures it before a wider rollout.

## Who and how

- **People:** the TIO Manager and 3 to 5 engineers, at least one of them new to the hub.
- **Where:** a restored copy of the live data on 2.55.0, never the live database. Each session is 30 minutes, one person at a time, with a facilitator who does not help unless the person is stuck.
- **Baseline:** run tasks 1 to 6 once on 2.54.1 with one or two people if a copy is available. Without a baseline, judge against the targets below.

## Tasks

| # | Who | Task | Success means | Target time |
|---|---|---|---|---|
| 1 | Manager | From the overview, say what most needs a decision today and who owns it | Names the top item, its owner and its next action | 60 s |
| 2 | Manager | Open the open critical and high tickets, and check the number matches the overview | Reaches the list; the numbers match | 30 s |
| 3 | Manager | Find everything outstanding on one named client, such as Tahakom | Reaches the client's risks and states the top one | 60 s |
| 4 | Manager | Find when a named client's contract ends | Finds it under Commercial | 45 s |
| 5 | Engineer | Say what to work on next and what to do about it | Names the top item in the queue and its next step | 30 s |
| 6 | Engineer | Find all tickets waiting for the customer, then those on one client | Uses the quick view, then the client filter | 45 s |
| 7 | Engineer | Find a ticket knowing only its Jira key | Finds it through the one search | 30 s |
| 8 | Engineer | On a ticket, read the latest activity and the SLA state, then record progress | Reads both without scrolling; progress saved | 90 s |
| 9 | Engineer | Filter tickets by product and team, then remove the filters | Finds Advanced filters; uses Clear all | 60 s |
| 10 | Either | Delete a test ticket, without being told where Delete is | Finds it in the row's menu or under More | 45 s |

## What to record for each task

| Measure | How | Target |
|---|---|---|
| Completed | Yes, or with help, or no | At least 80% complete without help |
| Time | Seconds from reading the task to finishing | At or below the target for 80% of people |
| Help needed | Number of prompts from the facilitator | 0 for most people, at most 1 per task |
| Errors | Wrong page opened, or a wrong record acted on | No wrong record acted on, ever |
| Rating | "How easy was that?" from 1 to 5 | Average of 4 or more |

After the session ask each person what was hardest, and what they miss from the earlier layout.

## After the sessions

1. Put the results for each task in `docs/TEST-RESULTS.md`, without names.
2. Fix any task under 80% completion, or where someone acted on a wrong record, before a wider rollout.
3. Check the decisions the review could not settle: where **Records** belongs on the client page, whether **Supporting details** should start open on tickets with an SLA at risk, and whether the delete menu is easy enough to find.

Hub usage is not measured automatically: this plan adds no tracking of people's actions.
