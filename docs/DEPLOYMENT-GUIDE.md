# TIO Operations Hub — production deployment guide

This guide installs the hub on a new Windows server from the release package `TioHub-<version>.zip`.
Reference details (every setting, backup, restore drill, rollback) are in `docs/OPERATIONS.md` inside the package.

The package contains **no secrets**. The application reaches SQL Server with the IIS application-pool Windows identity, and the first
administrator is created in the browser with a one-time code. Nothing in the package contacts external services; users' browsers load
map tiles from the configured tile server only (default OpenStreetMap; can be changed or switched off).

## 1. What is in the package

| Folder / file | Content |
|---|---|
| `app\` | The published application (ASP.NET Core 10, framework-dependent, win-x64) with the built web front end in `app\wwwroot` and `web.config` for IIS |
| `database\01-schema.sql` | Idempotent schema script: creates a new database or upgrades an existing one; safe to re-run |
| `database\02-app-login.sql` | Creates the SQL login and least-privilege rights for the application identity (read/write, audit append-only, no schema changes) |
| `deploy\Install-TioHub.ps1` | First installation: prerequisite check, database (optional), files, settings, IIS pool and site, folder rights, health check |
| `deploy\Upgrade-TioHub.ps1` | In-place upgrade: database backup, schema script, file swap keeping settings/data/logs, health check, rollback copy |
| `deploy\Backup-TioHub.ps1` | On-demand backup of database, attachments and settings |
| `deploy\appsettings.Production.example.json` | Settings template (the install script writes the real file for you) |
| `docs\` | Operations guide, decisions, API reference, test results |
| `DEPLOYMENT-GUIDE.md` | This guide |

Verify the package before use: compare `Get-FileHash TioHub-<version>.zip -Algorithm SHA256` with the `.sha256` file delivered with it.

## 2. Server requirements

| Item | Requirement |
|---|---|
| Application server | Windows Server 2019 or later, IIS 10 |
| IIS role services | Web Server (IIS) with Static Content, Default Document, HTTP Errors, Request Filtering; **Windows Authentication** only if you choose Windows sign-in |
| .NET | **ASP.NET Core 10.0 Hosting Bundle** (download from Microsoft, install, then run `iisreset`) |
| Database | SQL Server 2019 or later (Standard/Enterprise; compatibility level 150+) — may be on another server |
| Tools | `sqlcmd` on the machine that runs the database steps ("Microsoft Command Line Utilities for SQL Server") |
| Identity | Recommended: a **gMSA** such as `CORP\svc-tiohub$` allowed on the application server. Single server with local SQL: the built-in pool identity `IIS APPPOOL\TioHub` also works |
| Certificate | HTTPS certificate for the host name, from your organization CA, in `LocalMachine\My` (note its thumbprint) |
| DNS / firewall | A host name such as `tiohub.corp.example` → application server; 443 inbound from users; 1433 from the application server to SQL Server |
| Browsers | Current Edge or Chrome. For the map background, users' browsers need access to the tile server (`tile.openstreetmap.org` by default) |

## 3. Prepare

1. Copy `TioHub-<version>.zip` to the application server and verify its SHA-256 (section 1).
2. Right-click the zip → Properties → **Unblock**, then extract it, e.g. to `C:\Install\TioHub-<version>`.
3. Install IIS and the Hosting Bundle (section 2), run `iisreset`.
4. Import the HTTPS certificate into `LocalMachine\My`; copy its thumbprint (`Get-ChildItem Cert:\LocalMachine\My`).
5. If you use a gMSA: the AD team creates it and allows the application server to use it (`Install-ADServiceAccount svc-tiohub` on the server).

Check everything in one go — this changes nothing:

```powershell
cd C:\Install\TioHub-<version>\deploy
.\Install-TioHub.ps1 -SqlServer SQL01 -CertificateThumbprint <thumbprint> -AppPoolIdentity 'CORP\svc-tiohub$' -CheckOnly
```

## 4. Database

**Option A — the installer has DBA rights:** add `-CreateDatabase` to the installation command in section 5; it creates the database
(recovery model FULL), applies `01-schema.sql` and runs `02-app-login.sql` for the pool identity.

**Option B — a DBA does it separately** (any machine with `sqlcmd`):

```powershell
.\Install-TioHub.ps1 -SqlServer SQL01 -Database TioHub -AppPoolIdentity 'CORP\svc-tiohub$' -CreateDatabase -DatabaseOnly
```

or by hand:

```powershell
sqlcmd -S SQL01 -E -b -Q "CREATE DATABASE [TioHub]; ALTER DATABASE [TioHub] SET RECOVERY FULL;"
sqlcmd -S SQL01 -d TioHub -E -b -i ..\database\01-schema.sql
sqlcmd -S SQL01 -d TioHub -E -b -v AppPoolIdentity="CORP\svc-tiohub$" -i ..\database\02-app-login.sql
```

By hand, `-v` works only for an identity without spaces (a gMSA such as `CORP\svc-tiohub$`). For `IIS APPPOOL\TioHub` use the
script command above, which fills the identity in for you.

The application never changes the schema itself (`Database:ApplyMigrationsOnStartup = false`); reference lists and settings are added at
start-up and never overwrite what administrators change.

## 5. Install the application

In an **elevated** PowerShell, from the package's `deploy` folder:

```powershell
.\Install-TioHub.ps1 `
    -SqlServer SQL01 -Database TioHub `
    -HostName tiohub.corp.example -CertificateThumbprint <thumbprint> `
    -AppPoolIdentity 'CORP\svc-tiohub$' `
    -InstallRoot 'D:\Apps\TioHub' -AttachmentsPath 'D:\TioHubData\attachments' `
    -AuthMode Forms
    # add -CreateDatabase for option A in section 4
```

| Parameter | Meaning (default) |
|---|---|
| `-SqlServer`, `-Database` | SQL Server instance and database (`TioHub`) |
| `-HostName`, `-Port` | Site binding host name and port (`443`) |
| `-CertificateThumbprint` | HTTPS certificate. `-AllowHttp` instead is for a throw-away test server only |
| `-AppPoolIdentity` | gMSA or service account. Empty = `IIS APPPOOL\<SiteName>`. For a normal account, enter its password in IIS Manager afterwards (the script never handles passwords) |
| `-InstallRoot` | `C:\Apps\TioHub`; the application goes to `<InstallRoot>\app` |
| `-AttachmentsPath` | Folder for attached files (`<InstallRoot>\attachments`). Can be changed later under Administration → Settings → File attachments |
| `-AuthMode` | `Forms` (default: accounts and passwords held by the hub) or `Windows` (domain sign-in through IIS) |
| `-EnvironmentName` | `Production` (other values show a label in the status bar) |
| `-MapTileUrl` | Map tile template; `''` for no base map |
| `-SiteName` | IIS site and pool name (`TioHub`) |
| `-WhatIf` | Show what would be done without doing it |

The script stops before changing anything if a prerequisite is missing, refuses to overwrite an existing installation, and ends with a
health check of `https://<host>/api/health/ready`.

What it sets up: application pool "No Managed Code", AlwaysRunning, user profile loaded; site bound to HTTPS with the certificate;
Anonymous authentication on and Windows off for Forms (the reverse for Windows); read rights for the pool identity on the application,
modify rights on `App_Data`, `logs` and the attachment folder; `App_Data` restricted to the pool identity, SYSTEM and Administrators.

## 6. First sign-in

**Forms (default)**

1. A server administrator opens `D:\Apps\TioHub\app\App_Data\setup-code.txt` and copies the one-time code.
2. Open `https://tiohub.corp.example`, enter the code, and choose the first administrator's account name and password. The code file is deleted.
3. Administration → **Users & access**: create the users and give each a temporary password (**Set password**); they change it at first sign-in.

**Windows**: before the first start add `"BootstrapAdministrators": [ "CORP\\first.admin" ]` under `Auth` in
`app\appsettings.Production.json`; that person maps AD groups to roles under Administration → Group mappings; then remove the entry.

## 7. Configure and verify

1. Administration → **Settings**: `DefaultTimeZone`, `PaymentReminderDays`, approved link hosts; **File attachments** (folder, limits, types).
2. Administration → **Configuration**: reference lists (environment, server, contract and case types, team member roles, escalation channels…).
3. Administration → **Review policies**: confirm the review periods.
4. Smoke test: create a client, an environment and a server; open a case; attach a small file; check the dashboard and the notification bell.
5. Monitoring: point your monitoring at `https://<host>/api/health/ready` (database reachable) and `/api/health/live`.
6. Backups (owners decide RPO/RTO; proposed): SQL full backup daily + log backups every 15 minutes; the attachment folder daily with
   the database; `app\appsettings.Production.json` on every change. `deploy\Backup-TioHub.ps1` makes an on-demand copy of all three.
   Restore drill and details: `docs/OPERATIONS.md` sections 5–6.

## 8. Upgrades and rollback

Extract the new package on the server and run, elevated, from its `deploy` folder:

```powershell
.\Upgrade-TioHub.ps1 -SqlServer SQL01 -Database TioHub -InstallRoot 'D:\Apps\TioHub' `
    -BackupFolder '\\backup01\sql\TioHub' -Url https://tiohub.corp.example
```

It backs up the database (COPY_ONLY), applies the schema script, stops the site, keeps the running version in `<InstallRoot>\app.previous`,
copies the new files while keeping `appsettings.Production.json`, `App_Data` and `logs`, starts and checks health. If the DBA handles the
database, run the backup and `01-schema.sql` first and add `-SkipDatabase`.

**Rollback:** stop the site, replace `<InstallRoot>\app` with `app.previous` (keep `App_Data` and `logs`), start. Schema changes are
additive, so the previous version runs on the upgraded database; if a database rollback is ever needed, restore the backup taken by the
upgrade into an isolated database first (OPERATIONS.md section 7).

## 9. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| HTTP 500.19 | Hosting Bundle missing or installed before IIS — reinstall it, then `iisreset` |
| HTTP 500.30 / 500.32 | The app failed to start: read `<InstallRoot>\app\logs\tiohub-*.log` and the Application event log |
| Log: "Auth:Mode=Development is only allowed in the Development and Testing environments…" | `Auth:Mode` is `Development` — use `Forms` or `Windows` (the app refuses unsafe settings in production) |
| Log: "Login failed for user …" | The pool identity has no SQL login — run `02-app-login.sql` with exactly that identity |
| `/api/health/ready` not ready | SQL Server unreachable (firewall 1433, server name, certificate trust for `Encrypt=True`) |
| Sign-in page loops on HTTP | Forms sign-in needs HTTPS for its secure cookie |
| Uploads fail | The pool identity needs modify rights on the attachment folder; large files need `maxAllowedContentLength` in `web.config` |
| Map without background | Browsers cannot reach the tile server — allow it, set an internal tile server, or set `MapTileUrl` to empty |
| "Error - Report Manager" / `/Reports/Pages/Folder.aspx` instead of a hub page | SQL Server Reporting Services on the same server reserves `http(s)://+:<port>/Reports/` with http.sys, and that reservation wins over the IIS site for every path under `/Reports`. From 2.36.0 (decision A69) the Reporting Center is at `/reporting-center` (old `/reports` links are redirected inside the hub). If the error still appears, check `netsh http show urlacl` and open the Reporting Center from the hub's menu; do not remove the SSRS reservation without its owner's approval |

## 10. Security checklist

- HTTPS only, certificate from the organization CA; no HTTP binding in production.
- The pool identity has only the rights from `02-app-login.sql` (no `db_owner`); audit entries cannot be changed or deleted by the app.
- `App_Data` (one-time setup code) is readable by the pool identity and administrators only.
- No passwords, keys or connection-string secrets in files: the connection string uses integrated security.
- `Database:SeedDevelopmentData` stays `false` (the app refuses to start otherwise outside Development/Testing).
