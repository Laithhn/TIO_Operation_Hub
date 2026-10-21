# TIO Operations Hub — Shared AI Engineering Rules

## Project
TIO Operations Hub is a .NET backend and React/TypeScript
frontend application for software operations management.

## Important paths
- src/TioHub.Api: ASP.NET Core API
- src/web: React and TypeScript frontend
- tests/TioHub.Tests: .NET automated tests
- tests/e2e: Playwright end-to-end tests
- database: Database scripts
- docs: Requirements, decisions, and architecture guidance

## Read before developing
1. README.md
2. docs/DECISIONS.md
3. docs/DESIGN-RULES.md
4. docs/IMPLEMENTATION-PLAN.md
5. docs/OPERATIONS.md

## Architecture
- Respect the existing modular architecture.
- Preserve existing business behavior.
- Use existing API, security, and validation patterns.
- Avoid introducing unnecessary packages.
- Maintain compatibility between backend and frontend.

## Database protection
- Never modify shared or production databases.
- Never execute database migrations without approval.
- Never delete or reset database data without approval.
- Use separately configured development databases for
  Claude and Codex.
- Do not assume Git worktrees isolate SQL Server databases.

## Security
- Never expose passwords, tokens, or connection strings.
- Never bypass authentication or authorization.
- Never commit secrets or machine-specific configuration.
- Review migrations and schema changes before execution.

## Testing
- Run relevant .NET tests for backend changes.
- Run frontend checks for TypeScript changes.
- Run Playwright tests when browser behavior changes.
- Report test results and any tests not executed.
- Do not start external services without approval.

## Git collaboration
- Never commit directly to main from an AI worktree.
- Each agent owns its own branch and working directory.
- Never edit the other agent's worktree.
- Never merge branches automatically.
- Never force push, hard reset, or discard user changes.
- Keep changes focused on the assigned task.

## Completion report
For every task, provide:
1. Summary of changes
2. Files changed
3. Tests executed and results
4. Known issues and risks
5. Database impact
6. Suggested next action
