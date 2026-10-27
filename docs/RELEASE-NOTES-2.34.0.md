# TIO Operations Hub 2.34.0

Production package release, 27 October 2026.

## Included changes

- The frontend is rebuilt on the organization's own GUI framework, **VtWebGuiFramework 3.6.1** with **VtWebGuiIcons 2.4.0** (owner decision A68).
  - **Framework frame:** header with the official VITRONIC logo and primary links, a section sidebar with the framework's active marker, a main toolbar holding the page title and actions, and the framework footer.
  - **Framework design values in full:** primary `#001e46`, 17 px base text, 28 px controls and no rounded corners. This replaces the navy `#0c1b37` look of 2.33.1.
  - **Framework components:** the tab bar, status markers, KPI value fields, spinner and the 366-icon set. Charts use the framework colours.
  - **Narrow screens:** below 900 px the section sidebar becomes a drawer, and the header adapts to phone width.
- No functionality, route, permission or API behaviour changed. One fix came with the new frame: the dashboard's section bar now follows scrolling inside the page area.
- Documentation:
  - `docs/FRONTEND-ARCHITECTURE.md` (architecture and developer handover)
  - `docs/FRONTEND-FRAMEWORK-ADOPTION.md` (adoption summary, before and after)
  - `docs/FRONTEND-MIGRATION-CHECKLIST.md`
  - `docs/FRONTEND-VALIDATION-REPORT.md`

## Database and deployment

This release adds no database schema changes, and no migration is needed when upgrading from 2.33.x. Production startup migrations and development data remain disabled.

To upgrade, replace the application files as usual and follow the standard backup and rollback procedure in `docs/OPERATIONS.md`. Users may need a hard refresh (Ctrl+F5) the first time, so that the new styles and fonts load.

## Validation

- TypeScript and production build: passed.
- .NET test suite: 246/246 passed.
- Playwright end-to-end suite, 72 tests including the new frame smoke spec: 71 passed in the final full run. The one failure was an Edge browser crash, not a test assertion; that spec passed on re-run.
- The release script reruns the .NET tests and records the source commit in `BUILD-INFO.txt`.
