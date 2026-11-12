using System.Runtime.Versioning;
using System.Security.Principal;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace TioHub.Api.Security;

/// <summary>Where the directory groups used for an administrative decision came from.</summary>
public sealed record DirectoryEvidence(string Source, DateTimeOffset? ObservedAt)
{
    public const string Live = "live", LastObserved = "lastObserved", NotApplicable = "notApplicable", Unavailable = "unavailable";
}

/// <summary>
/// Current group membership of an account that is not the signed-in principal. Returning null means "unknown": callers then rely on the
/// last-observed snapshot and say so; nothing is ever granted because a lookup failed.
/// </summary>
public interface IDirectoryGroupLookup
{
    Task<string[]?> GroupsAsync(string accountName, CancellationToken ct);
}

/// <summary>
/// Windows token lookup through the service account (S4U), using only what the framework provides. Off unless <c>Auth:LiveDirectoryLookup</c>
/// is set, because it depends on domain trust and the service account's rights, which only the target environment can confirm. Forms and
/// Development have no directory to ask. Answers are cached briefly so that assignment checks do not run a logon per call.
/// </summary>
public sealed class WindowsDirectoryGroupLookup(IOptions<AuthOptions> options, IMemoryCache cache, ILogger<WindowsDirectoryGroupLookup> log) : IDirectoryGroupLookup
{
    private static readonly TimeSpan CacheFor = TimeSpan.FromSeconds(60);

    public Task<string[]?> GroupsAsync(string accountName, CancellationToken ct)
    {
        var o = options.Value;
        if (!o.LiveDirectoryLookup || !string.Equals(o.Mode, "Windows", StringComparison.OrdinalIgnoreCase) || !OperatingSystem.IsWindows())
            return Task.FromResult<string[]?>(null);
        var key = "directory-groups:" + accountName.ToUpperInvariant();
        if (cache.TryGetValue(key, out string[]? cached)) return Task.FromResult(cached);
        var groups = Lookup(UserPrincipalName(accountName, o.DirectoryUpnSuffix));
        if (groups is not null) cache.Set(key, groups, CacheFor);
        return Task.FromResult(groups);
    }

    /// <summary>S4U needs a user principal name; DOMAIN\name becomes name@suffix when a suffix is configured.</summary>
    public static string UserPrincipalName(string account, string? suffix)
    {
        var slash = account.LastIndexOf('\\');
        return slash >= 0 && !string.IsNullOrWhiteSpace(suffix) ? $"{account[(slash + 1)..]}@{suffix.Trim().TrimStart('@')}" : account;
    }

    [SupportedOSPlatform("windows")]
    private string[]? Lookup(string upn)
    {
        try
        {
            using var identity = new WindowsIdentity(upn);
            var names = new List<string>();
            foreach (var sid in identity.Groups ?? [])
            {
                try { names.Add(sid.Translate(typeof(NTAccount)).Value); }
                catch (Exception) { /* SIDs from trusted domains that cannot be resolved are ignored, as at sign-in */ }
            }
            return [.. names];
        }
        catch (Exception ex)
        {
            // The account name stays out of the log; the failure type is enough to diagnose configuration.
            log.LogWarning("Live directory lookup failed: {Error}", ex.GetType().Name);
            return null;
        }
    }
}
