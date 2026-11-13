/** What people see under What's new in the footer: newest first, in plain words. Add an entry with every release; a test checks the top one matches the version. */
export const WHATS_NEW: { version: string; date: string; changes: string[] }[] = [
  {
    version: '2.63.0', date: '13 November 2026', changes: [
      'The Client dashboard is now Client 360: projects, contracts, payments (paid, upcoming, overdue), SLA, tickets, escalations and commitments for one client on one page.',
      'Choose one or several years together, or all years; the page keeps the choice in its address. Open or overdue items from other years are still mentioned.',
      'Summary tiles at the top jump to each section; the signals behind the client status are one click away.'
    ]
  },
  {
    version: '2.62.0', date: '12 November 2026', changes: [
      'Tickets show their configured status in search, client and environment overviews; the Tickets report offers the configured statuses.',
      'Change history records the saved id for items created in the same save, and shows large numbers exactly.',
      'Hidden export details now explain why they are unavailable.',
      'The ticket list uses the configured ticket type; the select-all column and phone notification layout are fixed.'
    ]
  },
  {
    version: '2.61.0', date: '12 November 2026', changes: [
      'A result already reached under an SLA (met or breached) stays when the ticket priority changes; only what is still running takes the new target.',
      'Changing or removing the contract of a ticket that has an SLA result, or cancelling such a ticket, needs ticket coordination. The earlier result is kept on the timeline.',
      'After the response deadline has passed, a first response dated before it needs ticket coordination and a note.',
      'Closed tickets and completed commitments can no longer be edited. Reopen them first.',
      'A commitment deadline that has already passed is moved by commitment coordination only.',
      'Tickets with an SLA result cannot be deleted, alone or with their client, project or contract.',
      'Change history and the export log show only what belongs to the clients and teams you can see.'
    ]
  },
  {
    version: '2.60.0', date: '10 November 2026', changes: [
      'The Project dashboard is now the Client dashboard: one recorded status per client, with signals across all its projects.',
      'The Management dashboard lists clients in its portfolio instead of projects.',
      "A client's Tickets tab shows the same table as the Tickets page.",
      'Servers can record an optional GPU: number, model and memory.',
      'The contract register shows the client and the contract amount.',
      'Contract obligations and support notes have no length limit.',
      "Change a payment's status from the contract page without editing the contract."
    ]
  },
  {
    version: '2.59.0', date: '10 November 2026', changes: [
      'Four dashboards under Dashboard: Operational (what to act on today), SLA & Contracts, Management and Project.',
      'On a project, record a status with a reason. The page shows signals from the records and says when they disagree.'
    ]
  },
  {
    version: '2.58.1', date: '9 November 2026', changes: [
      'On a ticket synchronized from Jira, the Jira details are a main section under the overview and above the tabs, instead of the last section of the details panel. Fold it when you do not need it; the page remembers.'
    ]
  },
  {
    version: '2.58.0', date: '6 November 2026', changes: [
      'A ticket opens with its latest activity, next action, owner and SLA in one band, with the tabs below and a details panel on the right.',
      'The details panel holds the management summary, age and waiting, contractual SLA, measurements, penalties and Jira details. Fold the sections you do not need; the page remembers.',
      'Activity shows comments as cards and changes as before → after on one timeline, each marked Jira or TIO. The comment box is at the top; Ctrl+Enter adds the comment.',
      'Affected records can be filtered by type and searched. Jira references show whether each issue is imported or a manual link, and its sync state.',
      'Documented impact shows the recorded impact statement beside the inferred dependencies. Commitments can be filtered by status.',
      'Field history is a timeline of who changed which field, from what to what. It can be searched and loads older changes on request.'
    ]
  },
  {
    version: '2.57.0', date: '6 November 2026', changes: [
      'An empty list says so ("No active escalations", "0 records") instead of "Records: 1 OF 0", with a View all action where it helps.',
      'Commitments and My dashboard show a short title and a two-line preview of long descriptions.',
      'A contract opens with its term, renewal, SLA targets and payments at a glance, with links to every section. A product has the same section links.',
      'The Action list shows its categories in four groups with counts, and keeps the reason, deadline and next action in view.',
      'Users list name, role, sign-in and scope first; account actions are in the row menu. Settings have readable names, groups and dates.',
      'Change history shows changes by people first, and can be searched by person and date. Long changes open on request.',
      'Jira Connections starts with an overview of the set-up, from connection to health; monitoring leads with what needs attention.',
      'The report builder is a guided flow: Filters, Columns, Sort and group, then Preview.',
      'The configuration menu keeps one category open and says where you are. SLA states read First response and Resolution.',
      'Delete is under More or the row menu on product, microservice, role and user pages too.'
    ]
  },
  {
    version: '2.56.0', date: '6 November 2026', changes: [
      'A server now records its IP address, VLAN and notes. People without the Technical detail right do not see them.',
      'Server lists show the IP address next to the network zone.'
    ]
  },
  {
    version: '2.55.0', date: '5 November 2026', changes: [
      'Critical or high on the overview now opens both priorities, with the same number of tickets.',
      'Tickets and Clients have one search that covers every page, and it stays when you change pages. It also finds a ticket by its client or Jira key.',
      'Tickets has quick views with counts: My tickets, Overdue, Unassigned and Waiting for customer.',
      'The main filters are on show, and the rest are under Advanced filters. Active filters appear as chips, with Clear all.',
      'The ticket table fits the screen. Expand a row to see the rest, or add columns under Columns.',
      'Delete has moved into a small menu on each row, and under More on a record\'s page.',
      'The overview starts with the summary and the urgent work, including each item\'s next action.',
      'My dashboard has a compact row of figures and one queue of tickets and commitments, with a next step for each.',
      'A client opens on its risks and outstanding work, and its pages are grouped into Operational, Technical, Commercial and Records.',
      'A ticket starts with its latest activity, next action, owner and SLA state, with the timeline straight below. The rest is under Supporting details.'
    ]
  },
  {
    version: '2.54.1', date: '5 November 2026', changes: [
      'Engineers now start on My dashboard when they sign in. The executive overview is still under Dashboard.',
      'My dashboard has its own right on the Rights page, so it can be given or taken away for each role.'
    ]
  },
  {
    version: '2.54.0', date: '5 November 2026', changes: [
      'Ticket priorities now follow Jira, including existing tickets, and SLA targets follow the priority.',
      'The ticket timeline is easier to read: comments are cards with their author, changes are short lines, and everything is grouped by day.',
      'Tables can select several rows at once, to export them or delete them together.',
      'My dashboard shows only your own tickets, commitments and results.',
      'The executive overview opens with an At a glance summary compared with the previous period, and its sections can be folded away.',
      'New Team KPI report: response and resolution times, SLA breaches, replies written, and reopened and overdue tickets for each person.',
      'What\'s new is here in the footer.'
    ]
  },
  {
    version: '2.53.1', date: '5 November 2026', changes: [
      'The user form is clearer: separate sections, role boxes, and one list of clients, projects or teams at a time, with search and quick selection.'
    ]
  },
  {
    version: '2.53.0', date: '5 November 2026', changes: [
      'Renew contract copies a contract into a new one for the next period, ready to change before saving.',
      'Cases are now called Tickets.'
    ]
  },
  {
    version: '2.52.0', date: '5 November 2026', changes: [
      'A Jira space can have several contracts, such as yearly renewals, and each ticket takes the one valid on the day it was created. A ticket no contract covers is Not measurable.'
    ]
  },
  {
    version: '2.51.4', date: '5 November 2026', changes: [
      'One person can have several Jira accounts, and mapping a person corrects their first responses and SLA results at once.',
      'Clicking a row opens the ticket, not the client.'
    ]
  }
];
