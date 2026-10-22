# Deployment, configuration, backup, restore and rollback

This guide covers a Windows Server + IIS + SQL Server deployment. For a step-by-step installation with the scripts in `deploy\`, start with `DEPLOYMENT-GUIDE.md`. Everything named here is fictional until the owners supply real hosts.
No secrets are needed in configuration: the application signs in to SQL Server with its Windows identity.

## 1. Prerequisites

| Component | Version |
|---|---|
| Windows Server | 2019 or later with IIS 10 (Windows Authentication role service only when `Auth:Mode` is `Windows`) |
| ASP.NET Core Hosting Bundle | 10.0.x (matches the build) |
| SQL Server | 2019 or later (compatibility level 150+). LocalDB is for development only. |
| Application identity | gMSA or IIS app-pool identity with a SQL login (see `database/02-app-login.sql`) |
| TLS | Certificate from the organization CA bound to the IIS site (HTTPS only) |

## 2. Build the release

```
.\build\Build-Release.ps1
```

Runs the tests, builds the React front end into `wwwroot`, publishes the API (framework-dependent, win-x64) and writes `release\TioHub-<version>.zip` plus its SHA-256.
`appsettings.Development.json` and `launchSettings.json` are never published.

## 3. Database (DBA)

1. Create an empty database (e.g. `TioHub`) with the agreed collation and recovery model **FULL**.
2. Apply the idempotent schema script (safe to re-run; already-applied migrations are skipped):
   `sqlcmd -S <server> -d TioHub -E -b -i database\01-schema.sql`
3. Create the login and least-privilege permissions for the application identity:
   `sqlcmd -S <server> -d TioHub -E -b -v AppPoolIdentity="DOMAIN\svc-tiohub$" -i database\02-app-login.sql`
   This grants read/write, **denies UPDATE/DELETE on the `audit` schema** (append-only audit) and denies schema changes.
4. Reference data (reference lists, Jira instances without hosts, review policies, settings) is inserted by the application at start-up and never overwrites administrator changes.

Schema changes in later releases: developers add an EF Core migration and regenerate `01-schema.sql` with
`dotnet tool run dotnet-ef migrations script --idempotent --project src/TioHub.Api --output database/01-schema.sql`, then re-add the `SET` header (see the file top). The DBA runs the new script before deploying the new application files.

## 4. Application (IIS)

1. Unzip the release into e.g. `D:\Apps\TioHub\app`. Create an IIS site bound to HTTPS only, app pool “No Managed Code”, identity = the gMSA.
2. IIS Authentication depends on the sign-in mode:
   - **Forms (default):** Anonymous Authentication **enabled**, Windows Authentication **disabled** — the hub shows its own sign-in page. HTTPS is mandatory (the session cookie is marked Secure on HTTPS). Give the app-pool identity modify rights on `app\App_Data` and restrict that folder to server administrators (it holds the one-time setup code).
   - **Windows:** Windows Authentication enabled, Anonymous disabled. `web.config` (published) forwards Windows auth to the app.
3. Configure with environment variables on the app pool or `appsettings.Production.json` (template: `deploy/appsettings.Production.example.json`):

| Key | Value |
|---|---|
| `ConnectionStrings__TioHub` | `Server=<sql>;Database=TioHub;Integrated Security=True;Encrypt=True;TrustServerCertificate=False` |
| `Auth__Mode` | `Forms` (default: account name + password held by the hub) or `Windows`. The app refuses to start with `Development` outside Development/Testing. |
| `Auth__SessionMinutes` | Forms: session lifetime, renewed while active (default 480). Sessions also end when the browser closes. |
| `Auth__LockoutAttempts` / `Auth__LockoutMinutes` | Forms: failed sign-ins before a temporary lock (default 5) and its duration (default 15). |
| `Auth__SetupCodeFile` | Forms: where the one-time first-administrator setup code is written (default `App_Data/setup-code.txt`). |
| `Auth__BootstrapAdministrators__0` | Windows mode only: first administrator account, e.g. `DOMAIN\jdoe`. Gets the administrator role only (no business data). Remove after setup. |
| `App__MapTileUrl` | Map tiles for the Executive overview, loaded by users' browsers. Default: OpenStreetMap (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`). Point to an internal/hosted tile server if browsers cannot reach the internet or for heavier use; empty = no base map (the Leaflet map shows the bundled country shapes only; nothing is fetched). Only `https` templates with `{z}/{x}/{y}` are accepted. |
| `App__MapAttribution` | Attribution text shown on the map (keep `© OpenStreetMap contributors` for OSM-based tiles). |
| `Attachments__Path` | Folder for attached files (A46). Default `App_Data/attachments` under the application folder (kept by in-place upgrades); an absolute path or a UNC share such as `\\fileserver\TioHub\attachments` is recommended for servers. The app-pool identity needs modify rights; restrict the folder to that identity and server administrators. Since 2.20.0 an administrator can change the folder, limits and types under Administration → Settings → File attachments (A48); the saved value overrides this setting, which stays the fallback. Moving copies the existing files first; grant the app-pool identity modify rights on the new folder beforehand. |
| `Attachments__MaxFileMB` / `Attachments__MaxFilesPerUpload` / `Attachments__AllowedExtensions__0…` | Upload limits (default 25 MB, 10 files) and accepted types (Office, PDF, images, text, e-mail, archives; executables, scripts, certificates and keys are never in the default list). The published `web.config` allows requests up to 260 MB; raise `maxAllowedContentLength` with the limits. |
| `App__EnvironmentName` | `Production`, `UAT`… (shown in the status bar when not Production) |
| `Database__ApplyMigrationsOnStartup` | `false` (the DBA applies scripts) |
| `Database__SeedDevelopmentData` | `false` — the app refuses to start with `true` outside Development/Testing |
| `Quality__ScanMinutes` | Data-quality re-evaluation interval (default 5) |

4. First sign-in, **Forms**: on start the app finds no administrator with a password and writes a random one-time code to `App_Data\setup-code.txt` (the log says so, without the code). A server administrator opens the hub, enters the code and chooses the first administrator account and password; the file is deleted. That administrator then creates users under **Administration → Users & access** and issues each a temporary password (**Set password**), which the person must replace at first sign-in. Forgotten passwords: an administrator issues a new temporary password (this also clears a lock and ends the person's sessions). An administrator cannot reset their own password there — they use **Change password**; if the only administrator is locked out, wait for the lock to expire or have a DBA remove that account's row from `iam.UserCredential`, restart, and repeat the setup.

   First sign-in, **Windows**: the bootstrap administrator opens **Administration → Users & access** and **Group mappings**, maps the organization groups to roles, scopes and grants, sets **Jira instances** approved hosts, **Settings → ApprovedLinkHosts**, and confirms the **Review policies**. Then remove the bootstrap entry.
5. Health endpoints for monitoring the hub itself: `/api/health/live` and `/api/health/ready` (database reachable). The OpenAPI document is at `/openapi/v1.json` (signed-in users only).
6. Logs: `logs/tiohub-YYYYMMDD.log` (31 days) plus console/IIS stdout. Logs contain request path, status and duration — never request bodies or query strings.

## 5. Backup (NFR-07)

The owners still have to decide RPO, RTO, retention and hosting (BRD Section 9). Proposed baseline until then:

| What | How | Proposed frequency |
|---|---|---|
| Database (business records **and** audit) | SQL Server full backup + transaction-log backups (FULL recovery) | Full daily, log every 15 min |
| Attached files (`Attachments__Path`) | File-system backup of the folder, taken together with the database backup so files and their records match (a file whose record is gone is harmless; a record whose file is missing shows "file missing" on download) | Daily, with the database |
| Application configuration | Copy of `appsettings.Production.json` / app-pool variables (no secrets) | On every change |
| ASP.NET Core data-protection keys | Stored under the app-pool profile by default; back up `%LOCALAPPDATA%\ASP.NET\DataProtection-Keys` of the identity, or configure a shared key folder. Losing them only signs users out of the antiforgery cookie — no business data is encrypted with them. | Weekly |
| Release packages | Keep the last three `release\*.zip` with their SHA-256 | Per release |

## 6. Restore and the restore drill

Restore into an **isolated** database first, verify, then switch:

```
RESTORE DATABASE TioHub_Restore FROM DISK = N'<backup.bak>' WITH MOVE ..., REPLACE;
```

Verify on the restored copy (the automated test `AC15_RestoreDrill` does exactly this on LocalDB):
1. The application starts against it (`/api/health/ready` returns ready).
2. A user can sign in; a scope-limited user still sees only their clients; an administrator without business role still sees no client data.
3. Row counts of clients, environments, cases, commitments and **audit entries** match the source.
4. Record the elapsed restore time for the RTO decision.

Latest automated drill: backup + restore 0.3 s on development data; sign-in, scope, records and audit verified (see `docs/TEST-RESULTS.md`). A drill on the production-like server with production-like volume is still required before launch.

## 7. Rollback

| Situation | Action |
|---|---|
| Application defect, no schema change in the release | Stop the site, replace the `app` folder with the previous release zip, start. |
| Release included a migration | Migrations in this project are additive. Roll back the application files first; the older version ignores new columns. If a migration must be reversed, restore the pre-deployment backup into an isolated database, verify, and switch the connection string (data entered since the backup is lost — reconcile from Jira and approved channels as in the BRD continuity section). |
| Configuration error | Revert the app-pool variables / `appsettings.Production.json` from the backup copy. |

Always take a full backup immediately before applying `01-schema.sql` for a new release.

## 8. If the hub is unavailable

Work continues in Jira and approved channels (BRD Section 8). After recovery, record owners reconcile case summaries, commitments, condition reports and outstanding actions; leads review the data-quality and action lists.
