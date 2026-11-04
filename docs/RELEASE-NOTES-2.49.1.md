# TIO Operations Hub 2.49.1

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. **Not yet run against a real Jira site.** Upgrading from an older version? Read [RELEASE-NOTES-2.49.0.md](RELEASE-NOTES-2.49.0.md) as well.

## Stored Jira tokens stay readable (A85)

The keys that protect stored Jira tokens and sign-in sessions no longer depend on the application folder or on a setting.

- A deployed hub keeps them in `%ProgramData%\TioHub\DataProtection-Keys`, with access for the app-pool identity, SYSTEM and administrators only. `DataProtection:KeysFolder`, if set, still wins.
- A new package folder, an upgrade or a restart keeps tokens readable.
- If the app-pool identity changes, grant the new one Modify on the folder. The application refuses to start, with a clear message, until then.
- Several servers using one database, or a move to a new server, still need the same keys: copy the folder or set `DataProtection:KeysFolder`.
- A local run in the Development environment uses different keys. Save a production token from the production site only.

**Once, after installing this version:**

- enter each Jira token again with **Rotate credentials**, unless `DataProtection:KeysFolder` was already set, because tokens saved under the old keys cannot be read;
- everyone is signed out, and forms left open need a reload.

Back up the key folder, apart from the database backups if you can: together they can decrypt the stored tokens. `Backup-TioHub.ps1` does not copy it. Several hub instances on one server share this folder unless each sets its own `DataProtection:KeysFolder`.

## Reassigning a Jira space (A84)

**Reassign** under *Administration › Jira Connections* now offers a contract of the new client. The earlier client's contract never moves with the space, and existing cases stay with their client.

## Upgrade

No database change compared with 2.49.0. `Upgrade-TioHub.ps1` and `Install-TioHub.ps1` prepare the key folder; a manual installation creates it on first start. Going back to 2.49.0 needs the token entered again.
