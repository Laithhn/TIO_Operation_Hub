using System.Reflection;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Access;

public static class MeEndpoints
{
    public sealed record PreferencesInput(string? WorkingTimeZone);

    public static void MapMeEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("").WithTags("Session");

        g.MapGet("/me", async (HttpContext ctx, UserContext me, HubDbContext db, IAntiforgery af, IOptions<AppOptions> app, IOptions<AuthOptions> auth, IWebHostEnvironment env, CancellationToken ct) =>
        {
            // Issue the antiforgery request token as a readable cookie for the SPA (double-submit with the HttpOnly cookie).
            var tokens = af.GetAndStoreTokens(ctx);
            ctx.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions { HttpOnly = false, SameSite = SameSiteMode.Strict, Secure = ctx.Request.IsHttps, Path = "/" });
            var user = await db.Users.AsNoTracking().FirstAsync(u => u.Id == me.UserId, ct);
            var version = typeof(Program).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion?.Split('+')[0] ?? "dev";
            var legacyRights = BuiltInRoles.Names(me.IsSystem ? BuiltInRoles.All : me.Rights).ToHashSet(StringComparer.Ordinal);
            if (me.HasRight(Right.Edit)) legacyRights.Add("Edit");
            if (me.HasRight(Right.Manage)) legacyRights.Add("Manage");
            if (me.HasRight(Right.Archive)) legacyRights.Add("Archive");
            if (me.HasRight(Right.Delete)) legacyRights.Add("Delete");
            return Results.Ok(new
            {
                id = me.UserId,
                account = me.AccountName,
                displayName = me.DisplayName,
                timeZone = user.WorkingTimeZone,
                roles = me.Roles,
                roleLabels = me.Roles,
                rights = legacyRights.OrderBy(x => x).ToArray(), permissions = me.PermissionKeys,
                businessRole = me.BusinessRole,
                isAdministrator = me.IsAdministrator,
                grants = new { export = me.Has(Grant.Export), technicalDetail = me.SeesTechnical, audit = me.Has(Grant.Audit) },
                scope = new
                {
                    allClients = me.AllClients,
                    clientCount = me.ClientIds.Count,
                    projectCount = me.ProjectIds.Count,
                    allInternal = me.AllInternal,
                    internalTeamCount = me.TeamIds.Count,
                    hasBusinessAccess = me.HasBusinessRole && (me.AllClients || me.ClientIds.Count > 0 || me.ProjectIds.Count > 0 || me.AllInternal || me.TeamIds.Count > 0)
                },
                app = new { version, environmentName = app.Value.EnvironmentName, supportContact = app.Value.SupportContact, devSignIn = env.IsDevelopment(), authMode = auth.Value.Mode, mustChangePassword = ctx.User.HasClaim(c => c.Type == AuthEndpoints.MustChangeClaim), map = app.Value.SafeMapTileUrl is { } tiles ? new { tileUrl = tiles, attribution = app.Value.MapAttribution } : null }
            });
        });

        g.MapPut("/me/preferences", async (PreferencesInput input, UserContext me, HubDbContext db, CancellationToken ct) =>
        {
            if (Zones.Find(input.WorkingTimeZone) is null) throw new ValidationException("workingTimeZone", "Select a valid time zone (for example Asia/Riyadh).");
            var user = await db.Users.FirstAsync(u => u.Id == me.UserId, ct);
            user.WorkingTimeZone = input.WorkingTimeZone!.Trim();
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Values every screen needs: enums, active reference lists, products, teams, Jira instances.
        g.MapGet("/reference", async (HubDbContext db, CancellationToken ct) =>
        {
            var lookups = await db.LookupValues.AsNoTracking().OrderBy(l => l.SortOrder).ThenBy(l => l.Label)
                .Select(l => new { l.ListName, l.Code, l.Label, l.Description, l.IsRetired, l.Category }).ToListAsync(ct);
            var workflowLabels = lookups.Where(l => LookupLists.IsFixedWorkflowLabel(l.ListName))
                .GroupBy(l => l.ListName == LookupLists.ConditionLabel ? "Condition" : "CaseStatus")
                .ToDictionary(g => g.Key, g => g.ToDictionary(x => x.Code, x => x.Label));
            var products = await db.Products.AsNoTracking().OrderBy(p => p.Code)
                .Select(p => new
                {
                    p.Id, p.Code, p.Name, p.IsActive,
                    modules = p.Modules.OrderBy(m => m.Code).Select(m => new { m.Id, m.Code, m.Name, m.IsActive }),
                    versions = p.Versions.OrderByDescending(v => v.SortKey).Select(v => new { v.Id, v.Version, v.IsActive })
                }).ToListAsync(ct);
            var teams = await db.Teams.AsNoTracking().OrderBy(t => t.Name).Select(t => new { t.Id, t.Code, t.Name, t.IsActive }).ToListAsync(ct);
            var jira = await db.JiraInstances.AsNoTracking().OrderBy(j => j.Kind).Select(j => new { j.Id, j.Name, j.Kind, j.ApprovedHost, j.IsActive }).ToListAsync(ct);
            return Results.Ok(new
            {
                lookups = lookups.GroupBy(l => l.ListName).ToDictionary(x => x.Key, x => x.ToList()),
                products, teams, jiraInstances = jira,
                enums = EnumCatalog.All, enumLabels = workflowLabels,
                countries = Countries.All
            });
        });

        // People who can be assigned in a scope (owner pickers). Business roles only; never exposes scope details.
        g.MapGet("/users/assignable", async (long? clientId, long? teamId, string? q, bool? includeInactive, UserContext me, HubDbContext db, UserResolver resolver, CancellationToken ct) =>
        {
            if (!me.HasBusinessRole) throw new ForbiddenException("Your account has no business role.");
            if (clientId is { } c && !me.SeesClient(c)) throw new NotFoundException("The client");
            var users = await db.Users.AsNoTracking().Where(u => u.IsActive || (includeInactive == true && me.IsLead))
                .Where(u => q == null || u.DisplayName.Contains(q) || u.AccountName.Contains(q))
                .OrderBy(u => u.DisplayName).Select(u => new { u.Id, u.DisplayName, u.AccountName, u.IsActive }).Take(300).ToListAsync(ct);
            var result = new List<object>();
            foreach (var u in users)
            {
                var r = await resolver.ForUserAsync(u.Id, ct);
                if (r is null || r.Roles.Length == 0) continue;
                if (!u.IsActive) { result.Add(new { id = u.Id, name = u.DisplayName + " (deactivated)", account = u.AccountName }); continue; }
                var ok = clientId is { } cid ? r.AllClients || r.ClientIds.Contains(cid) : teamId is { } tid ? r.AllInternal || r.TeamIds.Contains(tid) : true;
                if (ok) result.Add(new { id = u.Id, name = u.DisplayName, account = u.AccountName });
            }
            return Results.Ok(result);
        });
    }
}

/// <summary>Business vocabularies for the front end, so labels and options come from one place.</summary>
public static class EnumCatalog
{
    public static readonly Dictionary<string, string[]> All = typeof(Role).Assembly.GetTypes()
        .Where(t => t.IsEnum && t.Namespace == "TioHub.Api.Common" && t != typeof(Grant))
        .ToDictionary(t => t.Name, t => Enum.GetNames(t));
}
