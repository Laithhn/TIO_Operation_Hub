# Jira synchronization: operations guide (A76)

**Status:** verified against a fake Jira and real SQL Server only. No run against a real Jira site has happened. Treat the first run below as the real test.

## Configuration

| Key | Default | Meaning |
|---|---|---|
| `Jira__Enabled` | `false` | Feature flag. Off: configuration, connection tests, discovery and dry runs work, but no case changes |
| `Jira__WorkerSeconds` | `60` | How often the worker looks for due spaces; `0` turns it off |
| `Jira__AllowedHostSuffixes__0` | `.atlassian.net` | Hosts a connection may use |
| `Jira__MaxIssuesPerRun` | `5000` | Larger spaces continue from the checkpoint in the next run |
| `Jira__CheckpointOverlapMinutes` | `5` | Re-read window; imports are idempotent |
| `Jira__RequestTimeoutSeconds` | `30` | Per request |
| `Jira__MaxRetries` | `4` | For 429, 5xx and timeouts |
| `Jira__LeaseMinutes` | `30` | After this a stopped server's lease can be taken over |
| `Jira__PreviewMaxIssues` | `2000` | Dry-run limit; the page says when it stopped early |

The schedule per client is on the client's Jira tab: default every 15 minutes, full reconciliation every 7 days.

## First use, in order

1. Deploy with `Jira__Enabled=false`.
2. Grant roles the new rights if anyone besides the TIO Manager should use them.
3. **Administration → Jira Connections → New connection:** `Poliscan Jira Cloud`, `https://poliscan.atlassian.net`.
4. **Run test.** All four steps must pass.
5. **Discover spaces.**
6. Client → **Jira integration:** choose the connection, team, case type and priority, then add the space (`TAH`).
7. **Jira conflicts → Workflow mappings:** Discover statuses, then map them.
8. **Preview import** and review the totals. Enabling is refused until a dry run succeeded.
9. Enable the client, set `Jira__Enabled=true`, restart.
10. After the first run, resolve **Jira conflicts** (user mappings first) and compare a few cases with Jira.

## Keeping 15 minutes reliable

The worker runs inside the application. It only runs while the site runs, so IIS must not idle it out:

- Application pool: **Start mode = AlwaysRunning**, **Idle time-out = 0**.
- Site: **Preload enabled**; the Application Initialization role service is installed.
- Recycling: a recycle delays a run by at most the next worker pass.

While the application is stopped nothing runs. The next run catches up from the checkpoint, so no update is lost, only delayed. If the hub must keep syncing with the site stopped, run a second instance of the application on another server against the same database: the lease guarantees each space runs once. An external scheduler is not needed for this.

## Monitoring

**Jira sync monitor** shows issue, comment and activity health, 24-hour totals, durations and every run. **Jira conflicts** lists what needs a person. Logs contain ids and reasons, never tokens or issue content.

| Symptom | Likely cause | Action |
|---|---|---|
| Run failed, 401 | Token expired or wrong | Rotate credentials, run test |
| Run failed, 403 | Account or token scope too narrow | Grant browse rights or scopes |
| "cannot be decrypted on this server" | The token was saved with keys this instance does not have: another instance, a restored database, a moved site or a changed identity | Rotate credentials, then set `DataProtection__KeysFolder` as in the security guide so it does not recur |
| Many runs with 429 | Rate limit | Lengthen intervals |
| Missing user mapping | New assignee | Map under Jira conflicts |
| Unknown workflow status | New status in Jira | Map under Jira conflicts |
| Stuck on Triaged | No active owner | Map the assignee or assign an owner |

Repeated failures back off, up to four hours. **Sync now** runs at once.

## Stopping and rollback

- **Stop everything:** `Jira__Enabled=false`, restart. Nothing else changes.
- **Stop one site or client:** disable the connection, the client's integration or a single space.
- **Application rollback:** the migration only adds objects, so the previous application runs against the new schema. Imported cases stay ordinary cases. References keep their rows; the old version ignores `Origin`.
- **Schema rollback:** restore the pre-deployment backup, as for any release (`OPERATIONS.md` section 7).
