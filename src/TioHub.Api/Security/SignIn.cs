using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

public sealed class AuthOptions
{
    /// <summary>
    /// "Forms" (account name + password held by the hub), "Windows" (Negotiate through IIS) or "Development" (Development/Testing only).
    /// </summary>
    public string Mode { get; set; } = "Windows";
    public bool IsForms => string.Equals(Mode, "Forms", StringComparison.OrdinalIgnoreCase);
    /// <summary>Forms: session lifetime, renewed while the user is active.</summary>
    public int SessionMinutes { get; set; } = 480;
    /// <summary>Forms: failed attempts before a temporary lock, and the lock duration.</summary>
    public int LockoutAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    /// <summary>Forms: where the one-time first-administrator setup code is written (relative to the application folder).</summary>
    public string SetupCodeFile { get; set; } = "App_Data/setup-code.txt";
    public string DevUser { get; set; } = "DEV\\manager";
    /// <summary>Accounts that receive only the Application Administrator role on first sign-in, so access can be set up. No business access.</summary>
    public string[] BootstrapAdministrators { get; set; } = [];
    public int CacheSeconds { get; set; } = 60;
}

/// <summary>
/// Development and automated-test sign-in. Program.cs refuses to start with it outside the Development and Testing environments.
/// Testing honours the X-Test-User / X-Test-Groups headers; Development honours the tiohub-dev-user cookie (fictional seeded accounts only).
/// </summary>
public sealed class DevAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder,
    IOptions<AuthOptions> auth, IWebHostEnvironment env)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Development";
    public const string GroupClaim = "tiohub:group";
    public const string DevUserCookie = "tiohub-dev-user";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!(env.IsDevelopment() || env.IsEnvironment("Testing")))
            return Task.FromResult(AuthenticateResult.Fail("Development sign-in is disabled."));
        string? user = null;
        string[] groups = [];
        if (env.IsEnvironment("Testing"))
        {
            user = Request.Headers["X-Test-User"].FirstOrDefault();
            groups = (Request.Headers["X-Test-Groups"].FirstOrDefault() ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        }
        else if (Request.Cookies.TryGetValue(DevUserCookie, out var picked) && picked.StartsWith("DEV\\", StringComparison.OrdinalIgnoreCase))
        {
            user = picked;
        }
        user ??= auth.Value.DevUser;
        if (string.IsNullOrWhiteSpace(user)) return Task.FromResult(AuthenticateResult.NoResult());
        var claims = new List<Claim> { new(ClaimTypes.Name, user) };
        claims.AddRange(groups.Select(g => new Claim(GroupClaim, g)));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, SchemeName));
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(principal, SchemeName)));
    }
}

/// <summary>
/// Turns the authenticated organization identity into an effective permission snapshot. Provisions a user on first sign-in only
/// when a group mapping or bootstrap entry admits them; refuses deactivated or unmapped accounts (ACC-01).
/// </summary>
public sealed class UserResolver(HubDbContext db, IMemoryCache cache, IOptions<AuthOptions> options, TimeProvider clock, ILogger<UserResolver> log)
{
    private readonly AuthOptions _opt = options.Value;
    private const string GenerationKey = "access-generation";

    public static string CacheKey(string account, long generation) => $"user:{generation}:{account.ToUpperInvariant()}";

    /// <summary>Group identities are encoded without separator ambiguity before being hashed for the cache key.</summary>
    public static string GroupCacheKey(IEnumerable<string> groups)
    {
        var normalized = groups.Select(g => g.ToUpperInvariant()).Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(normalized))));
    }

    // A snapshot is evidence from a particular authentication mode. Earlier formats
    // (including v3) did not identify Development vs Windows and must be refreshed.
    private const string FormsGroupSnapshot = "\0forms";
    private const string UnavailableGroupSnapshot = "\0unavailable";
    private const int StoredGroupLimit = 400;

    private static string? StoredGroupPrefix(string mode) => mode.ToUpperInvariant() switch
    {
        "WINDOWS" => "\0v4:w:",
        "DEVELOPMENT" => "\0v4:d:",
        _ => null
    };

    /// <summary>Store mode-specific last-observed groups; oversized snapshots fail closed.</summary>
    public static string EncodeStoredGroups(IEnumerable<string> groups, string mode)
    {
        var prefix = StoredGroupPrefix(mode) ?? throw new ArgumentException("A directory authentication mode is required.", nameof(mode));
        var names = groups.Distinct(StringComparer.OrdinalIgnoreCase).Order(StringComparer.OrdinalIgnoreCase).ToArray();
        if (names.Any(name => string.IsNullOrWhiteSpace(name) || name.Contains('\0'))) return UnavailableGroupSnapshot;
        var encoded = prefix + JsonSerializer.Serialize(names);
        return encoded.Length <= StoredGroupLimit ? encoded : UnavailableGroupSnapshot;
    }

    /// <summary>Only a fresh snapshot from the current authentication mode can support a security decision.</summary>
    public static bool TryDecodeStoredGroups(string? value, string mode, out string[] groups)
    {
        groups = [];
        var prefix = StoredGroupPrefix(mode);
        if (prefix is null || value is null || !value.StartsWith(prefix, StringComparison.Ordinal)) return false;
        try
        {
            var decoded = JsonSerializer.Deserialize<string[]>(value[prefix.Length..]);
            if (decoded is null || decoded.Any(name => string.IsNullOrWhiteSpace(name) || name.Contains('\0'))) return false;
            groups = decoded.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
            return true;
        }
        catch (JsonException) { return false; }
    }

    public static string[] RequireStoredGroups(string? value, string mode)
    {
        if (!TryDecodeStoredGroups(value, mode, out var groups))
            throw new ValidationException("groups", "This account's directory group snapshot is unavailable. An authenticated sign-in must refresh it before access can be changed.");
        return groups;
    }

    // Forms identities cannot have directory groups. Never persist their empty group set as
    // directory evidence: after a switch to Windows only a fresh directory sign-in suffices.
    public static bool TryGroupsForMode(string? value, string mode, out string[] groups)
    {
        if (string.Equals(mode, "Forms", StringComparison.OrdinalIgnoreCase)) { groups = []; return true; }
        return TryDecodeStoredGroups(value, mode, out groups);
    }
    public bool IsForms => _opt.IsForms;
    public bool TryGroups(string? value, out string[] groups) => TryGroupsForMode(value, _opt.Mode, out groups);
    public string[] Groups(string? value) => TryGroups(value, out var groups) ? groups : [];
    public string[] RequireGroups(string? value) => _opt.IsForms ? [] : RequireStoredGroups(value, _opt.Mode);
    public void MarkFormsSnapshot(User user) { if (_opt.IsForms) user.MappedGroups = FormsGroupSnapshot; }
    public HashSet<string> PrincipalGroups(ClaimsPrincipal principal) => _opt.IsForms ? new(StringComparer.OrdinalIgnoreCase) : GroupNames(principal);

    /// <summary>Access changes take effect for active sessions at once: every cached snapshot is dropped (Section 3).</summary>
    public static void InvalidateAll(IMemoryCache cache) => cache.Set(GenerationKey, cache.Get<long>(GenerationKey) + 1);

    public async Task<ResolvedUser?> ResolveAsync(ClaimsPrincipal principal, CancellationToken ct)
    {
        var account = principal.Identity?.Name;
        if (string.IsNullOrWhiteSpace(account)) return null;
        // One lightweight authoritative read per request prevents a second application instance from serving revoked grants.
        // Failure to read the generation fails the request closed; existing authenticated operations are not cancelled mid-flight.
        var databaseGeneration = await db.AuthorizationVersions.AsNoTracking().Where(v => v.Id == 1).Select(v => v.Version).SingleAsync(ct);
        var generation = cache.Get<long>(GenerationKey);
        var groups = PrincipalGroups(principal);
        var key = CacheKey(account, generation) + $"|db:{databaseGeneration}|" + GroupCacheKey(groups);
        if (cache.TryGetValue(key, out ResolvedUser? cached) && cached is not null) return cached;

        var mappings = await db.GroupMappings.AsNoTracking().Include(m => m.Scopes).ToListAsync(ct);
        var matched = mappings.Where(m => !m.GroupName.Contains('\0') && groups.Contains(m.GroupName.Trim())).ToList();
        var isBootstrap = _opt.BootstrapAdministrators.Any(a => string.Equals(a.Trim(), account, StringComparison.OrdinalIgnoreCase));

        var user = await db.Users.Include(u => u.Roles).Include(u => u.Scopes).FirstOrDefaultAsync(u => u.AccountName == account, ct);
        var now = clock.GetUtcNow();
        if (user is null)
        {
            // Forms sign-in never provisions: accounts are created by an administrator (or the one-time setup).
            if (_opt.IsForms || (matched.Count == 0 && !isBootstrap))
            {
                log.LogWarning("Sign-in refused: account has no hub access mapping");
                return null;
            }
            var zone = await db.Settings.Where(s => s.Key == Modules.Admin.SettingKeys.DefaultTimeZone).Select(s => s.Value).FirstOrDefaultAsync(ct);
            user = new User { AccountName = account, DisplayName = DisplayNameOf(account), IsActive = true, LastSignInAt = now, WorkingTimeZone = Zones.Find(zone) is not null ? zone! : "UTC" };
            if (isBootstrap)
            {
                user.AllClients = true;
                user.AllInternal = true;
                user.Roles.Add(new UserRole { AppRoleId = (await BuiltInRoles.EnsureAsync(db, ct))[Role.Manager] });
            }
            db.Users.Add(user);
            try
            {
                await db.SaveChangesAsync(ct);
                log.LogInformation("Provisioned hub user {UserId} on first sign-in", user.Id);
            }
            catch (DbUpdateException ex) when (SqlErrors.IsUniqueViolation(ex))
            {
                // Another first request of the same session provisioned the account a moment earlier (rolled back here): use that row.
                db.ChangeTracker.Clear();
                user = await db.Users.Include(u => u.Roles).Include(u => u.Scopes).FirstAsync(u => u.AccountName == account, ct);
            }
        }
        else
        {
            await RecordSignInAsync(user, u =>
            {
                if (u.LastSignInAt is not null && now - u.LastSignInAt <= TimeSpan.FromMinutes(30)) return false;
                u.LastSignInAt = now;
                return true;
            }, ct);
        }

        var matchedNames = _opt.IsForms ? FormsGroupSnapshot : EncodeStoredGroups(matched.Select(m => m.GroupName), _opt.Mode);
        await RecordSignInAsync(user, u =>
        {
            if (u.MappedGroups == matchedNames) return false;
            u.MappedGroups = matchedNames;
            return true;
        }, ct);
        var resolved = await AccessCalculator.ComputeAsync(db, user, matched, ct, now);
        if (user.IsActive && !resolved.HasAccess) return null;
        var cacheUntil = now.AddSeconds(Math.Max(5, _opt.CacheSeconds));
        if (resolved.NextPermissionExpiry is { } expiry && expiry < cacheUntil) cacheUntil = expiry;
        cache.Set(key, resolved, new MemoryCacheEntryOptions { AbsoluteExpiration = cacheUntil });
        return resolved;
    }

    /// <summary>
    /// Sign-in bookkeeping on the user row. A session's first requests run in parallel and each records the sign-in, so the one that
    /// saves second meets a changed row version. It reloads the row and applies the change again only if still needed; bookkeeping
    /// never turns a read into 412. <paramref name="apply"/> returns false when the row already holds the value.
    /// </summary>
    private async Task RecordSignInAsync(User user, Func<User, bool> apply, CancellationToken ct)
    {
        for (var attempt = 1; attempt <= 3 && apply(user); attempt++)
        {
            try
            {
                await db.SaveChangesAsync(ct);
                return;
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(user).ReloadAsync(ct);
            }
        }
    }

    /// <summary>Effective access of any user from stored roles, scopes and last mapped groups (used for owner/assignee checks).</summary>
    public async Task<ResolvedUser?> ForUserAsync(long userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Roles).Include(u => u.Scopes).FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;
        if (!TryGroups(user.MappedGroups, out var storedGroups))
            return new ResolvedUser(user.Id, user.AccountName, user.DisplayName, user.WorkingTimeZone, user.IsActive,
                [], Right.None, [], Grant.None, false, [], [], [], [], false, [], AccessRestriction: "directory_groups_unavailable");
        var names = storedGroups.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var mappings = names.Count == 0 ? [] : await db.GroupMappings.AsNoTracking().Include(m => m.Scopes).Where(m => names.Contains(m.GroupName)).ToListAsync(ct);
        return await AccessCalculator.ComputeAsync(db, user, mappings, ct, clock.GetUtcNow());
    }

    /// <summary>Directory groups of the signed-in principal (Windows groups, or test/development group claims).</summary>
    public static HashSet<string> GroupNames(ClaimsPrincipal principal)
    {
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in principal.FindAll(DevAuthHandler.GroupClaim)) names.Add(c.Value);
        if (OperatingSystem.IsWindows() && principal.Identity is WindowsIdentity wi && wi.Groups is not null)
        {
            foreach (var sid in wi.Groups)
            {
                try { names.Add(sid.Translate(typeof(NTAccount)).Value); }
                catch (Exception) { /* SIDs from trusted domains that cannot be resolved are ignored */ }
            }
        }
        return names;
    }

    private static string DisplayNameOf(string account)
    {
        var slash = account.LastIndexOf('\\');
        return slash >= 0 ? account[(slash + 1)..] : account;
    }
}

/// <summary>Resolves the hub user once per request and refuses access before any endpoint runs (ACC-01).</summary>
public sealed class UserContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext ctx, UserResolver resolver, UserContext user)
    {
        var path = ctx.Request.Path;
        if (!path.StartsWithSegments("/api") || path.StartsWithSegments("/api/health") || AuthEndpoints.AnonymousPaths.Any(p => path.Equals(p, StringComparison.OrdinalIgnoreCase)))
        {
            await next(ctx);
            return;
        }
        if (ctx.User.Identity?.IsAuthenticated != true)
        {
            await ctx.ChallengeAsync();
            return;
        }
        var resolved = await resolver.ResolveAsync(ctx.User, ctx.RequestAborted);
        if (resolved is null)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status403Forbidden, "No access",
                "Your account has no access to the TIO Operations Hub. Ask an Application Administrator.");
            return;
        }
        if (!resolved.IsActive)
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status403Forbidden, "Account deactivated",
                "Your hub account is deactivated. Ask an Application Administrator if you need access again.");
            return;
        }
        // A temporary password must be replaced before anything else is possible.
        if (ctx.User.HasClaim(c => c.Type == AuthEndpoints.MustChangeClaim) && !AuthEndpoints.MustChangePaths.Any(p => path.Equals(p, StringComparison.OrdinalIgnoreCase)))
        {
            await ProblemWriter.WriteAsync(ctx, StatusCodes.Status403Forbidden, "Password change required", "Choose a new password before continuing.");
            return;
        }
        user.Set(resolved);
        await next(ctx);
    }
}

public static class AccessCalculator
{
    public static async Task<ResolvedUser> ComputeAsync(HubDbContext db, User user, IReadOnlyCollection<GroupMapping> matched, CancellationToken ct, DateTimeOffset? asOf = null)
    {
        if (!user.IsActive)
            return new ResolvedUser(user.Id, user.AccountName, user.DisplayName, user.WorkingTimeZone, false,
                [], Right.None, [], Grant.None, false, [], [], [], [], false, []);
        // A31: the user's roles plus the built-in roles of matched group mappings; rights are the union of the roles' rights.
        var mappedKeys = matched.Where(m => m.Role is not null).Select(m => m.Role == Role.Manager ? BuiltInRoles.ManagerKey : BuiltInRoles.EngineerKey).Distinct().ToList();
        var roleIds = user.Roles.Select(r => r.AppRoleId).ToList();
        var held = roleIds.Count == 0 && mappedKeys.Count == 0 ? []
            : await db.AppRoles.AsNoTracking().Include(r => r.Permissions).Where(r => r.IsActive && (roleIds.Contains(r.Id) || (r.Key != null && mappedKeys.Contains(r.Key)))).ToListAsync(ct);
        if (RoleConflicts.Conflicts(held.Select(r => r.Id), await RoleConflicts.LoadAsync(db, ct)))
            return new ResolvedUser(user.Id, user.AccountName, user.DisplayName, user.WorkingTimeZone, user.IsActive,
                [], Right.None, [], Grant.None, false, [], [], [], [], false, [], AccessRestriction: "incompatible_roles");
        var activePermissionKeys = await db.PermissionDefinitions.AsNoTracking().Where(p => p.IsActive).Select(p => p.Key).ToListAsync(ct);
        var activePermissions = activePermissionKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var roles = held.Select(r => r.Name).Order().ToArray();
        var rights = held.Aggregate(Right.None, (a, r) => a | (r.IsLocked ? BuiltInRoles.All : r.Rights));
        var permissionSet = held.SelectMany(r => r.IsLocked ? ResourcePermissions.All : r.Permissions.Select(p => ResourcePermissions.KeyOf(p.Resource, p.Action)))
            .Where(activePermissions.Contains)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        // A checked action with an absent prerequisite is assigned but ineffective. Return the same decision to UI,
        // background jobs and access inspection that UserContext enforces on the server.
        var now = asOf ?? DateTimeOffset.UtcNow;
        var overrides = await db.UserPermissionOverrides.AsNoTracking().Where(o => o.UserId == user.Id && (o.ExpiresAt == null || o.ExpiresAt > now)).ToListAsync(ct);
        var permissions = PermissionOverrides.ResolveForRights(permissionSet, overrides, rights, now, activePermissions);
        var nextExpiry = overrides.Where(o => o.ExpiresAt != null).Select(o => o.ExpiresAt).Min();
        var scopes = user.Scopes.Select(s => (s.Kind, s.ClientId, s.ProjectId, s.TeamId))
            .Concat(matched.SelectMany(m => m.Scopes.Select(s => (s.Kind, s.ClientId, s.ProjectId, s.TeamId)))).ToList();
        var allClients = user.AllClients || matched.Any(m => m.AllClients);
        var allInternal = user.AllInternal || matched.Any(m => m.AllInternal);
        var grants = (rights.HasFlag(Right.Export) ? Grant.Export : 0) | (rights.HasFlag(Right.TechnicalDetail) ? Grant.TechnicalDetail : 0) | (rights.HasFlag(Right.Audit) ? Grant.Audit : 0);
        var clientIds = scopes.Where(s => s.Kind == ScopeKind.Client && s.ClientId is not null).Select(s => s.ClientId!.Value).Distinct().ToArray();
        var projectIds = scopes.Where(s => s.Kind == ScopeKind.Project && s.ProjectId is not null).Select(s => s.ProjectId!.Value).Distinct().ToArray();
        var teamIds = scopes.Where(s => s.Kind == ScopeKind.InternalTeam && s.TeamId is not null).Select(s => s.TeamId!.Value).Distinct().ToArray();
        long[] projectClientIds = [], projectEnvIds = [];
        if (projectIds.Length > 0)
        {
            projectClientIds = await db.Projects.IgnoreQueryFilters().Where(p => projectIds.Contains(p.Id)).Select(p => p.ClientId).Distinct().ToArrayAsync(ct);
            projectEnvIds = await db.Environments.IgnoreQueryFilters().Where(e => e.ProjectId != null && projectIds.Contains(e.ProjectId.Value)).Select(e => e.Id).ToArrayAsync(ct);
        }
        return new ResolvedUser(user.Id, user.AccountName, user.DisplayName, user.WorkingTimeZone, user.IsActive, roles, rights, permissions, grants,
            allClients, clientIds, projectIds, projectClientIds, projectEnvIds, allInternal, teamIds, nextExpiry);
    }
}
