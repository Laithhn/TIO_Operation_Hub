# TIO Operations Hub 2.53.1

Prepared 5 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. This release has no database change. Upgrading from before 2.53.0? Read the earlier notes as well.

## Clearer user dialog

Creating or editing a user is easier to read and quicker to fill in:

- **Sections:** Account, Roles, Direct data scope and Effective access are clearly apart, in a wider dialog.
- **Roles** are separate boxes, each with its description, and the chosen ones stand out.
- **Clients, projects and internal teams** are one list at a time, with one record per line, and each tab shows how many are selected.
- **Search, Select all shown and Clear shown** work on the list in view. What is already chosen stays in view above it and can be removed with one click.
- **All clients and projects** and **All internal teams** say when they already include everything, in place of the list.
- **Effective access** shows its counts at a glance.

Directory group mappings use the same data scope list.

## Upgrade

Deploy the application.
