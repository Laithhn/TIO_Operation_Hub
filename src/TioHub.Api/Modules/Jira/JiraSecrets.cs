using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Api.Modules.Jira;

/// <summary>
/// A76: API tokens. DataProtected keeps ciphertext in its own unaudited table, encrypted with the ASP.NET Core data-protection key ring;
/// EnvironmentVariable keeps only the variable's name in the database. Tokens are only ever read here, to call Jira, and no API answers with one.
/// </summary>
public sealed partial class JiraSecretStore(HubDbContext db, IDataProtectionProvider protection, TimeProvider clock, IOptions<JiraOptions> options)
{
    private IDataProtector Protector => protection.CreateProtector("TioHub.Jira.ApiToken.v1");

    [GeneratedRegex("^TIOHUB_JIRA_[A-Z0-9_]{1,80}$")]
    private static partial Regex VariableName();

    public static bool IsValidVariableName(string? name) => name is not null && VariableName().IsMatch(name);

    /// <summary>Stores or replaces the credential in the connection's unsaved state; the caller saves. The value is never logged or returned.</summary>
    public async Task SetAsync(JiraConnection c, JiraSecretProvider provider, string? token, string? variableName, CancellationToken ct)
    {
        var existing = c.Id == 0 ? null : await db.JiraCredentials.FirstOrDefaultAsync(x => x.JiraConnectionId == c.Id, ct);
        if (provider == JiraSecretProvider.EnvironmentVariable)
        {
            if (existing is not null) db.JiraCredentials.Remove(existing);
            c.SecretReference = variableName;
        }
        else
        {
            var cipher = Protector.Protect(token!);
            if (c.Id == 0) throw new InvalidOperationException("Save the connection before storing its token.");
            if (existing is null) db.JiraCredentials.Add(new JiraCredential { JiraConnectionId = c.Id, Ciphertext = cipher, UpdatedAt = clock.GetUtcNow(), UpdatedById = db.CurrentUser.UserId });
            else { existing.Ciphertext = cipher; existing.UpdatedAt = clock.GetUtcNow(); existing.UpdatedById = db.CurrentUser.UserId; }
            c.SecretReference = $"protected:jira-connection-{c.Id}";
        }
        c.SecretProvider = provider;
        c.CredentialRotatedAt = clock.GetUtcNow();
    }

    /// <summary>The credentials for one Jira call, or an error that names the configuration problem without any secret value.</summary>
    public async Task<JiraAuth> AuthAsync(JiraConnection c, CancellationToken ct)
    {
        string? token;
        if (c.SecretProvider == JiraSecretProvider.EnvironmentVariable)
            token = IsValidVariableName(c.SecretReference) ? Environment.GetEnvironmentVariable(c.SecretReference!) : null;
        else
        {
            var cipher = await db.JiraCredentials.AsNoTracking().Where(x => x.JiraConnectionId == c.Id).Select(x => x.Ciphertext).FirstOrDefaultAsync(ct);
            try { token = cipher is null ? null : Protector.Unprotect(cipher); }
            catch (CryptographicException) { throw new JiraApiException(null, "The stored API token cannot be decrypted on this server. Enter it again with Rotate credentials, and check that every server uses the same DataProtection:KeysFolder."); }
        }
        if (string.IsNullOrEmpty(token)) throw new JiraApiException(null, "No API token is configured for this connection.");
        if (string.IsNullOrWhiteSpace(c.AccountEmail)) throw new JiraApiException(null, "No Atlassian account e-mail is configured for this connection.");
        if (c.AuthMode == JiraAuthMode.ScopedApiToken && string.IsNullOrWhiteSpace(c.CloudId)) throw new JiraApiException(null, "A scoped API token needs the site's Cloud ID.");
        return new JiraAuth(c.SiteUrl, c.AuthMode, c.AccountEmail, token, c.CloudId);
    }

    public async Task<bool> HasCredentialAsync(JiraConnection c, CancellationToken ct) => c.SecretProvider == JiraSecretProvider.EnvironmentVariable
        ? !string.IsNullOrEmpty(c.SecretReference) && !string.IsNullOrEmpty(Environment.GetEnvironmentVariable(c.SecretReference))
        : await db.JiraCredentials.AnyAsync(x => x.JiraConnectionId == c.Id, ct);

    /// <summary>Normalizes the site to https://host and refuses hosts outside the allowed Jira Cloud suffixes (no internal addresses, no credentials in the URL).</summary>
    public (string? Site, string? Problem) NormalizeSite(string? site) => NormalizeSite(site, options.Value.AllowedHostSuffixes);

    public static (string? Site, string? Problem) NormalizeSite(string? site, IEnumerable<string> allowedSuffixes)
    {
        if (!Uri.TryCreate((site ?? "").Trim(), UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps) return (null, "Enter the site as https://your-site.atlassian.net.");
        if (!string.IsNullOrEmpty(u.UserInfo) || !u.IsDefaultPort) return (null, "The site address cannot contain a user name, password or port.");
        var host = u.IdnHost.ToLowerInvariant();
        if (!allowedSuffixes.Any(s => host.EndsWith(s, StringComparison.OrdinalIgnoreCase) && host.Length > s.Length)) return (null, "Only Jira Cloud sites are allowed (for example your-site.atlassian.net).");
        return ($"https://{host}", null);
    }
}
