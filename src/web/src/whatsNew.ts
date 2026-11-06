/** What people see under What's new in the footer: newest first, in plain words. Add an entry with every release; a test checks the top one matches the version. */
export const WHATS_NEW: { version: string; date: string; changes: string[] }[] = [
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
