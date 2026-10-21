using System.Security.Claims;
using System.Security.Principal;
using System.Text.Encodings.Web;
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

    /// <summary>Access changes take effect for active sessions at once: every cached snapshot is dropped (Section 3).</summary>
    public static void InvalidateAll(IMemoryCache cache) => cache.Set(GenerationKey, cache.Get<long>(GenerationKey) + 1);

    public async Task<ResolvedUser?> ResolveAsync(ClaimsPrincipal principal, CancellationToken ct)
    {
        var account = principal.Identity?.Name;
        if (string.IsNullOrWhiteSpace(account)) return null;
        var generation = cache.Get<long>(GenerationKey);
        var groups = GroupNames(principal);
        var key = CacheKey(account, generation) + "|" + string.Join(';', groups.Order());
        if (cache.TryGetValue(key, out ResolvedUser? cached) && cached is not null) return cached;

        var mappings = await db.GroupMappings.AsNoTracking().Include(m => m.Scopes).ToListAsync(ct);
        var matched = mappings.Where(m => groups.Contains(m.GroupName.Trim())).ToList();
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
            if (isBootstrap) user.Roles.Add(new UserRole { AppRoleId = (await BuiltInRoles.EnsureAsync(db, ct))[Role.Manager] });
            db.Users.Add(user);
            await db.SaveChangesAsync(ct);
            log.LogInformation("Provisioned hub user {UserId} on first sign-in", user.Id);
        }
        else if (user.LastSignInAt is null || now - user.LastSignInAt > TimeSpan.FromMinutes(30))
        {
            user.LastSignInAt = now;
            await db.SaveChangesAsync(ct);
        }

        var matchedNames = string.Join(';', matched.Select(m => m.GroupName).Order());
        if ((user.MappedGroups ?? "") != matchedNames)
        {
            user.MappedGroups = matchedNames.Length == 0 ? null : matchedNames;
            await db.SaveChangesAsync(ct);
        }
        var resolved = await AccessCalculator.ComputeAsync(db, user, matched, ct);
        if (resolved.Roles.Length == 0 && user.IsActive) return null;
        cache.Set(key, resolved, TimeSpan.FromSeconds(Math.Max(5, _opt.CacheSeconds)));
        return resolved;
    }

    /// <summary>Effective access of any user from stored roles, scopes and last mapped groups (used for owner/assignee checks).</summary>
    public async Task<ResolvedUser?> ForUserAsync(long userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Roles).Include(u => u.Scopes).FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return null;
        var names = (user.MappedGroups ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var mappings = names.Count == 0 ? [] : await db.GroupMappings.AsNoTracking().Include(m => m.Scopes).Where(m => names.Contains(m.GroupName)).ToListAsync(ct);
        return await AccessCalculator.ComputeAsync(db, user, mappings, ct);
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
    public static async Task<ResolvedUser> ComputeAsync(HubDbContext db, User user, IReadOnlyCollection<GroupMapping> matched, CancellationToken ct)
    {
        // A31: the user's roles plus the built-in roles of matched group mappings; rights are the union of the roles' rights.
        var mappedKeys = matched.Where(m => m.Role is not null).Select(m => m.Role == Role.Manager ? BuiltInRoles.ManagerKey : BuiltInRoles.EngineerKey).Distinct().ToList();
        var roleIds = user.Roles.Select(r => r.AppRoleId).ToList();
        var held = roleIds.Count == 0 && mappedKeys.Count == 0 ? []
            : await db.AppRoles.AsNoTracking().Where(r => roleIds.Contains(r.Id) || (r.Key != null && mappedKeys.Contains(r.Key))).ToListAsync(ct);
        var roles = held.Select(r => r.Name).Order().ToArray();
        var rights = held.Aggregate(Right.None, (a, r) => a | (r.IsLocked ? BuiltInRoles.All : r.Rights));
        // One TIO team: any role sees every client and internal team (owner decision, 19 Oct 2026); grants follow the rights.
        if (roles.Length > 0)
            return new ResolvedUser(user.Id, user.AccountName, user.DisplayName, user.WorkingTimeZone, user.IsActive, roles, rights,
                (rights.HasFlag(Right.Export) ? Grant.Export : 0) | (rights.HasFlag(Right.TechnicalDetail) ? Grant.TechnicalDetail : 0) | (rights.HasFlag(Right.Audit) ? Grant.Audit : 0),
                true, [], [], [], [], true, []);
        var scopes = user.Scopes.Select(s => (s.Kind, s.ClientId, s.ProjectId, s.TeamId))
            .Concat(matched.SelectMany(m => m.Scopes.Select(s => (s.Kind, s.ClientId, s.ProjectId, s.TeamId)))).ToList();
        var allClients = user.AllClients || matched.Any(m => m.AllClients);
        var allInternal = user.AllInternal || matched.Any(m => m.AllInternal);
        var grants = matched.Aggregate(user.Grants, (g, m) => g | m.Grants);
        var clientIds = scopes.Where(s => s.Kind == ScopeKind.Client && s.ClientId is not null).Select(s => s.ClientId!.Value).Distinct().ToArray();
        var projectIds = scopes.Where(s => s.Kind == ScopeKind.Project && s.ProjectId is not null).Select(s => s.ProjectId!.Value).Distinct().ToArray();
        var teamIds = scopes.Where(s => s.Kind == ScopeKind.InternalTeam && s.TeamId is not null).Select(s => s.TeamId!.Value).Distinct().ToArray();
        long[] projectClientIds = [], projectEnvIds = [];
        if (projectIds.Length > 0)
        {
            projectClientIds = await db.Projects.IgnoreQueryFilters().Where(p => projectIds.Contains(p.Id)).Select(p => p.ClientId).Distinct().ToArrayAsync(ct);
            projectEnvIds = await db.Environments.IgnoreQueryFilters().Where(e => e.ProjectId != null && projectIds.Contains(e.ProjectId.Value)).Select(e => e.Id).ToArrayAsync(ct);
        }
        return new ResolvedUser(user.Id, user.AccountName, user.DisplayName, user.WorkingTimeZone, user.IsActive, roles, Right.None, grants,
            allClients, clientIds, projectIds, projectClientIds, projectEnvIds, allInternal, teamIds);
    }
}
