# TIO Operations Hub 2.50.2

Prepared 4 November 2026. See [TEST-RESULTS.md](TEST-RESULTS.md) for what was run. This release also contains everything in [RELEASE-NOTES-2.50.1.md](RELEASE-NOTES-2.50.1.md) and [RELEASE-NOTES-2.50.0.md](RELEASE-NOTES-2.50.0.md); read them when upgrading from an earlier version.

## Fixed: long Jira text stopped issues from importing (A87)

Jira descriptions and comments over 400 characters failed with "String or binary data would be truncated", so those issues never became cases.

Issue descriptions, comments, labels, components, detail fields and activity values now have no length limit and are stored in full. Text that looks like a credential is still withheld.

Issues that failed retry at the next synchronization, and their open failure entries remain until then. Expect a large first run if many issues failed.

## Upgrade

1. Back up the database.
2. Review and apply `database/01-schema.sql`. `JiraLongText` widens seven columns on `jira.JiraCaseMapping`, `jira.JiraComment` and `jira.JiraActivity` to `nvarchar(max)`. No data changes.
3. Deploy the application.

Going back to 2.50.1: the wider columns can stay, and long text already imported stays readable, but new long text fails to import again.
