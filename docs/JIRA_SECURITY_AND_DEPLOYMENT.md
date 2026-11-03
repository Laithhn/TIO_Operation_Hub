# Jira integration: security and deployment (A76)

## Credentials

| Provider | Stored in the database | Where the token is |
|---|---|---|
| Encrypted on the server (`DataProtected`) | Ciphertext in `jira.JiraCredential`, in its own table and excluded from the change history | Encrypted with the ASP.NET Core data-protection key ring |
| Environment variable (`EnvironmentVariable`) | Only the variable's name, which must start with `TIOHUB_JIRA_` | App-pool environment |

No API returns a token. Responses carry only whether one exists, the provider, the reference and the rotation date. Tokens are not logged, and audit entries cannot contain them.

**Not implemented:** Azure Key Vault, which the mockup shows, because it needs a new package and a real vault to verify against. The two providers sit behind `JiraSecretStore`, where a vault provider would be added. This is open decision 4.

### Data-protection keys become important

`OPERATIONS.md` used to say losing these keys only signs users out. With the encrypted provider, losing them also makes stored Jira tokens unreadable. Recovery is to enter the token again with **Rotate credentials**; no other data is affected.

- Back up the keys with the database. Several servers must share one key folder.
- Or use the environment-variable provider, which does not depend on them.

## Other protections

| Risk | Protection |
|---|---|
| Writing to Jira | No writing operation exists; `JiraReadOnlyHandler` refuses it at the HTTP layer |
| Reaching internal addresses through a connection | HTTPS only, allowed host suffixes, no credentials or ports in the URL, redirects not followed |
| Token in an error message | Errors are built from the HTTP status only |
| Script in Jira content | Stored and rendered as plain text; ADF is converted without HTML |
| Credentials pasted into Jira text | Not stored (IAM-03) |
| One client seeing another's data | Client scope filters on the new tables; another client's name shows as "Another client"; existing case filters apply to imported cases |
| Restricted Jira comments | Text returned by the server to case coordinators only |
| Two servers running one space | Lease by conditional update |
| Space owned twice | Filtered unique index in the database, not only application checks |
| CSRF, sign-in, audit | Existing antiforgery, authentication and audit apply to all new endpoints |

Atlassian account: use a dedicated service account with **read access only** to the spaces in scope. Restricted comments visible to that account are imported, so its project roles decide what reaches the hub.

## Deployment

1. Back up the database and the data-protection keys.
2. Run `database/04-access-control-upgrade-review.sql` if your procedure includes it, then have the DBA apply `database/01-schema.sql`. The `JiraIntegration` migration only adds the `jira` schema, `work.CaseComment` and one defaulted column; existing references become `Manual`.
3. Deploy with `Jira__Enabled=false`. Keep `Database__ApplyMigrationsOnStartup=false`.
4. Allow outbound HTTPS from the server to the Jira site and `api.atlassian.com`. The hub made no outbound calls before this release, so **firewalls may need a change**.
5. Configure IIS as in the operations guide.
6. Follow *First use* in the operations guide.

The application identity needs ordinary read and write on the new schema; `database/02-app-login.sql` grants this database-wide.

## Not yet verified

- A real Jira Cloud site, including scoped tokens and the gateway.
- The real rate limits and volumes.
- The IIS always-running setup on a server.
- The upgrade script against a restored UAT backup, which the project's practice requires before UAT.
