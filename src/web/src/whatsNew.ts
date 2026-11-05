/** What people see under What's new in the footer: newest first, in plain words. Add an entry with every release; a test checks the top one matches the version. */
export const WHATS_NEW: { version: string; date: string; changes: string[] }[] = [
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
