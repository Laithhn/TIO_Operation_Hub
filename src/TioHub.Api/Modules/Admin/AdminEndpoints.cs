using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Admin;

public static class AdminEndpoints
{
    public sealed record ScopeInput(ScopeKind Kind, long? ClientId, long? ProjectId, long? TeamId);
    /// <summary>A31: <c>RoleId</c> picks the user's role; <c>Roles</c> (role names or built-in keys Manager/Engineer) is still accepted.</summary>
    public sealed record UserInput(string? AccountName, string? DisplayName, string? Email, string? WorkingTimeZone, string[]? Roles, bool AllClients, bool AllInternal,
        bool Export, bool TechnicalDetail, bool Audit, ScopeInput[]? Scopes, long? RoleId = null);
    public sealed record DeactivateInput(string? Reason);
    public sealed record DeleteUserInput(string? Reason);
    public sealed record MappingInput(string? GroupName, Role? Role, bool AllClients, bool AllInternal, bool Export, bool TechnicalDetail, bool Audit, ScopeInput[]? Scopes);
    /// <summary>A34: <c>Code</c> is optional (made from the label); <c>Category</c> is required for type lists and fixed once created.</summary>
    public sealed record LookupInput(string? ListName, string? Code, string? Label, string? Description, int SortOrder, bool IsRetired, string? Category = null);
    public sealed record OrderInput(long[]? Ids);
    public sealed record SettingInput(string? Value);
    public sealed record JiraInstanceInput(string? Name, JiraInstanceKind? Kind, string? ApprovedHost, bool IsActive = true);
    public sealed record RestoreInput(string? Reason);
    public sealed record CodeCorrectionInput(string? NewCode, string? Reason);

    private static readonly string[] ArchivableTypes = [RecordTypes.Client, RecordTypes.Region, RecordTypes.Project, RecordTypes.Contract, RecordTypes.Contact, RecordTypes.Environment, RecordTypes.Installation, RecordTypes.Asset, RecordTypes.Component];

    public static void MapAdminEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin").WithTags("Administration");

        // ---- users and access (ACC-04, ACC-05) ----
        g.MapGet("/users", async (string? q, bool? active, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var query = db.Users.AsNoTracking().Include(u => u.Roles).ThenInclude(r => r.AppRole).Include(u => u.Scopes).AsQueryable();
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(u => u.DisplayName.Contains(q) || u.AccountName.Contains(q));
            if (active is not null) query = query.Where(u => u.IsActive == active);
            var users = await query.OrderBy(u => u.DisplayName).ToListAsync(ct);
            return Results.Ok(users.Select(u => UserDto(u)));
        });
        g.MapGet("/users/{id:long}", async (long id, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var u = await db.Users.AsNoTracking().Include(x => x.Roles).ThenInclude(r => r.AppRole).Include(x => x.Scopes).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The user");
            return ctx.WithETag(u, UserDto(u));
        });
        g.MapPost("/users", async (UserInput input, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var u = new User();
            await ApplyUserAsync(u, input, db, me, isNew: true, ct);
            db.Users.Add(u);
            db.AuditReason = "User provisioned by administrator";
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/users/{u.Id}", new { u.Id });
        });
        g.MapPut("/users/{id:long}", async (long id, UserInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var u = await db.Users.Include(x => x.Roles).Include(x => x.Scopes).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The user");
            db.ExpectVersion(ctx, u);
            await ApplyUserAsync(u, input, db, me, isNew: false, ct);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
        // Deactivation preserves identity and history; active records surface in the reassignment queue, never auto-reassigned.
        g.MapPost("/users/{id:long}/deactivate", async (long id, DeactivateInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            if (id == me.UserId) throw new ValidationException("reason", "You cannot deactivate your own account.");
            var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The user");
            db.ExpectVersion(ctx, u);
            var reason = Rules.RequireReason(input.Reason);
            u.IsActive = false;
            u.DeactivatedAt = clock.GetUtcNow();
            u.DeactivationReason = reason;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            var queue = await db.Cases.IgnoreQueryFilters().CountAsync(c => c.OwnerUserId == id && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled, ct)
                + await db.Commitments.IgnoreQueryFilters().CountAsync(c => c.OwnerUserId == id && c.Status == CommitmentStatus.Open, ct)
                + await db.Environments.IgnoreQueryFilters().CountAsync(e => (e.OwnerUserId == id || e.BackupOwnerUserId == id) && e.ArchivedAt == null, ct);
            return Results.Ok(new { recordsAwaitingReassignment = queue });
        });
        g.MapPost("/users/{id:long}/reactivate", async (long id, DeactivateInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var u = await db.Users.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The user");
            db.ExpectVersion(ctx, u);
            db.AuditReason = Rules.RequireReason(input.Reason);
            u.IsActive = true;
            u.DeactivatedAt = null;
            u.DeactivationReason = null;
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
        g.MapDelete("/users/{id:long}", async (long id, [Microsoft.AspNetCore.Mvc.FromBody] DeleteUserInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            if (id == me.UserId) throw new ValidationException("reason", "You cannot delete your own account.");
            var u = await db.Users.Include(x => x.Roles).Include(x => x.Scopes).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The user");
            db.ExpectVersion(ctx, u);
            var reason = Rules.RequireReason(input.Reason);

            // Keep business and audit history attached to its original person. Only remove an account
            // when no retained record points to it; use deactivation for users with recorded activity.
            db.UserCredentials.RemoveRange(await db.UserCredentials.Where(c => c.UserId == id).ToListAsync(ct));
            db.Notifications.RemoveRange(await db.Notifications.Where(n => n.UserId == id).ToListAsync(ct));
            db.Users.Remove(u);
            db.AuditReason = reason;
            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                db.ChangeTracker.Clear();
                throw new ConflictException("This user is still referenced by retained records or history. Deactivate the account to keep its history and remove access.");
            }
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });
        // Identity-only list of scope targets so access can be assigned; no business detail.
        g.MapGet("/scope-targets", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            return Results.Ok(new
            {
                clients = await db.Clients.IgnoreQueryFilters().AsNoTracking().OrderBy(c => c.Code).Select(c => new { c.Id, c.Code, c.Name, archived = c.ArchivedAt != null }).ToListAsync(ct),
                projects = await db.Projects.IgnoreQueryFilters().AsNoTracking().OrderBy(p => p.Code).Select(p => new { p.Id, p.Code, p.Name, p.ClientId }).ToListAsync(ct),
                teams = await db.Teams.AsNoTracking().OrderBy(t => t.Code).Select(t => new { t.Id, t.Code, t.Name }).ToListAsync(ct)
            });
        });

        g.MapGet("/group-mappings", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var maps = await db.GroupMappings.AsNoTracking().Include(m => m.Scopes).OrderBy(m => m.GroupName).ToListAsync(ct);
            return Results.Ok(maps.Select(m => new { m.Id, m.GroupName, m.Role, m.AllClients, m.AllInternal, grants = GrantFlags(m.Grants), scopes = m.Scopes.Select(s => new { s.Kind, s.ClientId, s.ProjectId, s.TeamId }), version = Convert.ToBase64String(m.RowVersion) }));
        });
        g.MapPost("/group-mappings", async (MappingInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            RefuseOwnGroup(ctx, input.GroupName);
            var m = new GroupMapping();
            await ApplyMappingAsync(m, input, db, ct);
            db.GroupMappings.Add(m);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.Created($"/api/v1/admin/group-mappings/{m.Id}", new { m.Id });
        });
        g.MapPut("/group-mappings/{id:long}", async (long id, MappingInput input, HttpContext ctx, HubDbContext db, UserContext me, IMemoryCache cache, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var m = await db.GroupMappings.Include(x => x.Scopes).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The mapping");
            RefuseOwnGroup(ctx, m.GroupName, input.GroupName);
            db.ExpectVersion(ctx, m);
            await ApplyMappingAsync(m, input, db, ct);
            await db.SaveChangesAsync(ct);
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        });

        // ---- reference lists, settings, Jira instances (NFR-09) ----
        g.MapGet("/lookups", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            return Results.Ok(await db.LookupValues.AsNoTracking().OrderBy(l => l.ListName).ThenBy(l => l.SortOrder)
                .Select(l => new { l.Id, l.ListName, l.Code, l.Label, l.Description, l.SortOrder, l.IsRetired, l.Category, version = Convert.ToBase64String(l.RowVersion) }).ToListAsync(ct));
        });
        // A34: how many records use each value of a list, so a configuration page shows what retiring or renaming affects.
        g.MapGet("/lookups/{list}/usage", async (string list, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            if (!LookupLists.All.Contains(list)) throw new NotFoundException("The list");
            return Results.Ok(await LookupUsage.CountsAsync(db, list, ct));
        });
        g.MapPost("/lookups/{list}/order", async (string list, OrderInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            if (LookupLists.IsFixedWorkflowLabel(list)) throw new ValidationException("ids", "Condition and case-status values keep their built-in workflow order.");
            var rows = await db.LookupValues.Where(l => l.ListName == list).ToListAsync(ct);
            var ids = (input.Ids ?? []).ToList();
            if (ids.Count != rows.Count || rows.Any(r => !ids.Contains(r.Id))) throw new ValidationException("ids", "Send every value of the list once, in the new order.");
            foreach (var r in rows) r.SortOrder = (ids.IndexOf(r.Id) + 1) * 10;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/lookups", async (LookupInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var check = new Check().Text("label", input.Label, 150, "the name", true).Text("description", input.Description, 1000, "Description");
            if (input.ListName is null || !LookupLists.All.Contains(input.ListName)) check.Add("listName", "Select a reference list.");
            if (LookupLists.IsFixedWorkflowLabel(input.ListName)) throw new ValidationException("listName", "Condition and case-status values are fixed; only their display labels can be changed.");
            var typed = input.ListName is not null && LookupLists.Categories.TryGetValue(input.ListName, out var categoryEnum) ? categoryEnum : null;
            if (typed is not null && (input.Category is null || !Enum.GetNames(typed).Contains(input.Category))) check.Add("category", "Choose how this type behaves (its category).");
            // The code is stored on records: made from the name when not given (letters and digits), unique in the list.
            var code = Text.Clean(input.Code) ?? string.Concat(System.Text.RegularExpressions.Regex.Split(input.Label ?? "", "[^A-Za-z0-9]+")
                .Where(w => w.Length > 0).Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
            if (code.Length == 0) check.Add("label", "Use letters or digits in the name.");
            if (code.Length > (typed is null ? 100 : 40)) code = code[..(typed is null ? 100 : 40)];
            check.ThrowIfAny();
            if (await db.LookupValues.AnyAsync(l => l.ListName == input.ListName && l.Label == input.Label!.Trim(), ct))
                throw new ConflictException("This name already exists in the list.", new() { ["label"] = ["Names are unique in a list; a retired value with this name can be reactivated instead."] });
            var baseCode = code;
            for (var n = 2; await db.LookupValues.AnyAsync(l => l.ListName == input.ListName && l.Code == code, ct); n++) code = $"{baseCode}{n}";
            var sort = input.SortOrder > 0 ? input.SortOrder : ((await db.LookupValues.Where(l => l.ListName == input.ListName).MaxAsync(l => (int?)l.SortOrder, ct)) ?? 0) + 10;
            var l = new LookupValue { ListName = input.ListName!, Code = code, Label = input.Label!.Trim(), Description = Text.Clean(input.Description), SortOrder = sort, IsRetired = input.IsRetired,
                Category = typed is null ? null : input.Category };
            db.LookupValues.Add(l);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/admin/lookups/{l.Id}", new { l.Id });
        });
        g.MapPut("/lookups/{id:long}", async (long id, LookupInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var l = await db.LookupValues.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The value");
            db.ExpectVersion(ctx, l);
            // Codes are stored on records; changing one would silently reinterpret history.
            if ((input.Code ?? "").Trim() != l.Code) throw new ValidationException("code", "Codes keep their historical meaning. Retire this value and add a new one.");
            new Check().Text("label", input.Label, 150, "the name", true).Text("description", input.Description, 1000, "Description").ThrowIfAny();
            if (LookupLists.IsFixedWorkflowLabel(l.ListName))
            {
                if (input.IsRetired || input.SortOrder != l.SortOrder || Text.Clean(input.Description) != l.Description)
                    throw new ValidationException("label", "Only the display label can be changed for a fixed workflow value.");
                l.Label = input.Label!.Trim();
                await db.SaveChangesAsync(ct);
                return Results.NoContent();
            }
            // Forms need at least one active value of a type list.
            if (input.IsRetired && !l.IsRetired && LookupLists.Categories.ContainsKey(l.ListName) && !await db.LookupValues.AnyAsync(x => x.ListName == l.ListName && x.Id != l.Id && !x.IsRetired, ct))
                throw new ValidationException("isRetired", "Keep at least one active value in this list.");
            l.Label = input.Label!.Trim();
            l.Description = Text.Clean(input.Description);
            l.SortOrder = input.SortOrder;
            l.IsRetired = input.IsRetired;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapGet("/settings", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            return Results.Ok(await db.Settings.AsNoTracking().Where(s => !s.Key.StartsWith("Attachments.") && !s.Key.StartsWith("Sla.")).OrderBy(s => s.Key).Select(s => new { s.Id, s.Key, s.Value, s.Description, version = Convert.ToBase64String(s.RowVersion) }).ToListAsync(ct));
        });
        g.MapPut("/settings/{id:long}", async (long id, SettingInput input, HttpContext ctx, HubDbContext db, UserContext me, HubSettings settings, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var s = await db.Settings.FirstOrDefaultAsync(x => x.Id == id && !x.Key.StartsWith("Attachments.") && !x.Key.StartsWith("Sla."), ct) ?? throw new NotFoundException("The setting");
            db.ExpectVersion(ctx, s);
            new Check().Text("value", input.Value, 2000, "the value", true).ThrowIfAny();
            var value = input.Value!.Trim();
            if (s.Key == SettingKeys.UpcomingDays && (!int.TryParse(value, out var d) || d < 1 || d > 90)) throw new ValidationException("value", "Enter a number of days between 1 and 90.");
            if (s.Key == SettingKeys.DefaultTimeZone && Zones.Find(value) is null) throw new ValidationException("value", "Enter a valid IANA time zone.");
            if (s.Key == SettingKeys.PaymentReminderDays && (!int.TryParse(value, out var pd) || pd < 1 || pd > 90)) throw new ValidationException("value", "Enter a number of days between 1 and 90.");
            s.Value = value;
            await db.SaveChangesAsync(ct);
            settings.Invalidate();
            return Results.NoContent();
        });
        g.MapGet("/jira-instances", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            return Results.Ok(await db.JiraInstances.AsNoTracking().OrderBy(j => j.Kind).Select(j => new { j.Id, j.Name, j.Kind, j.ApprovedHost, j.IsActive, version = Convert.ToBase64String(j.RowVersion) }).ToListAsync(ct));
        });
        g.MapPut("/jira-instances/{id:long}", async (long id, JiraInstanceInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var j = await db.JiraInstances.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira instance");
            db.ExpectVersion(ctx, j);
            var host = (input.ApprovedHost ?? "").Trim().ToLowerInvariant();
            var check = new Check().Text("name", input.Name, 100, "the name", true);
            if (host.Length > 0 && Uri.CheckHostName(host) != UriHostNameType.Dns) check.Add("approvedHost", "Enter a host name only, for example example.atlassian.net.");
            check.ThrowIfAny();
            j.Name = input.Name!.Trim();
            j.ApprovedHost = host;
            j.IsActive = input.IsActive;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- audit (NFR-03): read-only, grant- and scope-filtered, technical values masked without the grant ----
        g.MapGet("/audit", async (string? entityType, long? entityId, long? clientId, string? action, string? category, DateTimeOffset? from, DateTimeOffset? to, int? page, int? pageSize,
            HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var canBusiness = me.Has(Grant.Audit);
            var canAccess = me.IsAdministrator && me.HoldsGrant(Grant.Audit);
            if (!canBusiness && !canAccess) throw new ForbiddenException("Viewing change history needs the Audit permission.");
            var q = db.AuditEntries.AsNoTracking().AsQueryable();
            var all = me.AllClients;
            var ids = me.ClientIds;
            var allInt = me.AllInternal;
            var teams = me.TeamIds;
            q = q.Where(a =>
                (canAccess && a.Category == "Access") ||
                (canBusiness && a.Category != "Access" && (
                    (a.ClientId != null && (all || ids.Contains(a.ClientId.Value))) ||
                    (a.ClientId == null && a.TeamId != null && (allInt || teams.Contains(a.TeamId.Value))) ||
                    (a.ClientId == null && a.TeamId == null && a.EntityType != "Case" && a.EntityType != "Commitment"))));
            if (!string.IsNullOrWhiteSpace(entityType)) q = q.Where(a => a.EntityType == entityType);
            if (entityId is not null) q = q.Where(a => a.EntityId == entityId);
            if (clientId is not null) q = q.Where(a => a.ClientId == clientId);
            if (!string.IsNullOrWhiteSpace(action)) q = q.Where(a => a.Action == action);
            if (!string.IsNullOrWhiteSpace(category)) q = q.Where(a => a.Category == category);
            if (from is not null) q = q.Where(a => a.At >= from);
            if (to is not null) q = q.Where(a => a.At < to);
            var paged = await q.OrderByDescending(a => a.Id).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            var tech = me.SeesTechnical;
            return Results.Ok(new Paged<object>(paged.Items.Select(a => (object)new
            {
                a.Id, a.At, a.UserName, a.Action, a.Category, a.EntityType, a.EntityId, a.EntityLabel, a.ClientId, a.Reason,
                changes = MaskChanges(a.EntityType, a.Changes, tech)
            }).ToList(), paged.Page, paged.PageSize, paged.TotalCount));
        });
        g.MapGet("/exports", async (int? page, int? pageSize, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            if (!(me.Has(Grant.Audit) || (me.IsAdministrator && me.HoldsGrant(Grant.Audit)))) throw new ForbiddenException("Viewing the export log needs the Audit permission.");
            return Results.Ok(await db.ExportLogs.AsNoTracking().OrderByDescending(e => e.Id)
                .Select(e => new { e.Id, e.At, e.Report, e.Filters, e.RowCount, user = db.Users.Where(u => u.Id == e.UserId).Select(u => u.AccountName).FirstOrDefault() })
                .ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        // ---- archive and restore (DAT-05, Section 5.8): restore needs business role and scope; administration alone is insufficient ----
        g.MapGet("/archived", async (string? recordType, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            string[] f = [HubDbContext.ArchiveFilter];
            var list = new List<object>();
            if (recordType is null or RecordTypes.Client) list.AddRange(await db.Clients.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Client, x.Id, label = x.Code + " · " + x.Name, clientId = (long?)x.Id, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Region) list.AddRange(await db.Regions.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Region, x.Id, label = x.Code + " · " + x.Name, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Project) list.AddRange(await db.Projects.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Project, x.Id, label = x.Code + " · " + x.Name, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Contract) list.AddRange(await db.Contracts.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Contract, x.Id, label = x.Ref + " · " + x.Title, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Contact) list.AddRange(await db.Contacts.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Contact, x.Id, label = x.Name, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Environment) list.AddRange(await db.Environments.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Environment, x.Id, label = x.Name, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Installation) list.AddRange(await db.Installations.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Installation, x.Id, label = x.InstanceName, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Asset) list.AddRange(await db.Assets.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Asset, x.Id, label = x.Name, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            if (recordType is null or RecordTypes.Component) list.AddRange(await db.Components.IgnoreQueryFilters(f).AsNoTracking().Where(x => x.ArchivedAt != null).Select(x => new { recordType = RecordTypes.Component, x.Id, label = x.Name, clientId = (long?)x.ClientId, x.ArchivedAt, x.ArchiveReason, version = Convert.ToBase64String(x.RowVersion) }).ToListAsync(ct));
            return Results.Ok(list);
        });
        g.MapPost("/archived/{recordType}/{id:long}/restore", async (string recordType, long id, RestoreInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            if (!ArchivableTypes.Contains(recordType)) throw new NotFoundException("The record type");
            access.Me.RequirePermission(ResourcePermissions.ForRecord(recordType), ResourcePermissions.ArchiveRestore);
            var reason = Rules.RequireReason(input.Reason, "reason", "the restore reason");
            string[] f = [HubDbContext.ArchiveFilter];
            IArchivable item;
            long clientId;
            switch (recordType)
            {
                case RecordTypes.Client:
                {
                    var x = await db.Clients.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived client");
                    x.Status = ClientStatus.Active; item = x; clientId = x.Id; break;
                }
                case RecordTypes.Region:
                {
                    var x = await db.Regions.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived region");
                    await RequireActiveClientAsync(db, x.ClientId, ct); item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Project:
                {
                    var x = await db.Projects.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived project");
                    await RequireActiveClientAsync(db, x.ClientId, ct); x.Status = ProjectStatus.OnHold; item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Contract:
                {
                    var x = await db.Contracts.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived contract");
                    await RequireActiveClientAsync(db, x.ClientId, ct); item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Contact:
                {
                    var x = await db.Contacts.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived contact");
                    await RequireActiveClientAsync(db, x.ClientId, ct); item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Environment:
                {
                    var x = await db.Environments.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived environment");
                    await RequireActiveClientAsync(db, x.ClientId, ct);
                    if (x.RegionId is not null && !await db.Regions.AnyAsync(r => r.Id == x.RegionId, ct))
                        throw new ValidationException("reason", "The environment's region is archived. Restore the region first, or restore the environment after reassigning it.");
                    if (await db.Environments.IgnoreQueryFilters().AnyAsync(e => e.ClientId == x.ClientId && e.RegionId == x.RegionId && e.NormalizedName == x.NormalizedName && e.ArchivedAt == null, ct))
                        throw new ConflictException("An active environment with the same name exists in the same scope. Rename one through an audited correction first.");
                    item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Installation:
                {
                    var x = await db.Installations.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived installation");
                    if (!await db.Environments.AnyAsync(e => e.Id == x.EnvironmentId, ct)) throw new ValidationException("reason", "Restore the environment first.");
                    if (await db.Installations.IgnoreQueryFilters().AnyAsync(i => i.EnvironmentId == x.EnvironmentId && i.ProductId == x.ProductId && i.NormalizedInstanceName == x.NormalizedInstanceName && i.ArchivedAt == null, ct))
                        throw new ConflictException("An active installation with the same instance name exists.");
                    item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Asset:
                {
                    var x = await db.Assets.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived asset");
                    if (!await db.Environments.AnyAsync(e => e.Id == x.EnvironmentId, ct)) throw new ValidationException("reason", "Restore the environment first.");
                    if (await db.Assets.IgnoreQueryFilters().AnyAsync(a => a.EnvironmentId == x.EnvironmentId && a.NormalizedName == x.NormalizedName && a.ArchivedAt == null, ct)) throw new ConflictException("An active asset with the same name exists.");
                    x.Lifecycle = AssetLifecycle.Unknown; item = x; clientId = x.ClientId; break;
                }
                case RecordTypes.Component:
                {
                    var x = await db.Components.IgnoreQueryFilters(f).FirstOrDefaultAsync(r => r.Id == id && r.ArchivedAt != null, ct) ?? throw new NotFoundException("The archived component");
                    if (!await db.Installations.AnyAsync(i => i.Id == x.InstallationId, ct)) throw new ValidationException("reason", "Restore the installation first.");
                    item = x; clientId = x.ClientId; break;
                }
                default: throw new NotFoundException("The record type");
            }
            if (!access.Me.HasClient(clientId)) throw new NotFoundException("The archived record");
            Rules.Restore(item);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // DAT-05: only an administrator with the client's scope corrects an erroneous identifying value, through an audited action.
        g.MapPost("/corrections/clients/{id:long}/code", async (long id, CodeCorrectionInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            if (!me.HasClient(id)) throw new NotFoundException("The client");
            var c = await db.Clients.IgnoreQueryFilters([HubDbContext.ArchiveFilter]).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            var reason = Rules.RequireReason(input.Reason, "reason", "the correction reason");
            var code = (input.NewCode ?? "").Trim().ToUpperInvariant();
            if (code.Length is 0 or > 50) throw new ValidationException("newCode", "Enter the corrected code (max 50).");
            if (await db.Clients.IgnoreQueryFilters().AnyAsync(x => x.Code == code && x.Id != id, ct))
                throw new ConflictException("This client alias is already in use; records are never silently merged or overwritten.");
            c.Code = code;
            db.AuditReason = "Administrative correction: " + reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    private static async Task RequireActiveClientAsync(HubDbContext db, long clientId, CancellationToken ct)
    {
        if (!await db.Clients.AnyAsync(c => c.Id == clientId, ct)) throw new ValidationException("reason", "The client is archived or outside your scope. Restore the client first.");
    }

    private static string? MaskChanges(string entityType, string? changes, bool tech)
    {
        if (changes is null || tech) return changes;
        var restricted = HubDbContext.TechnicalProperties.Where(p => p.StartsWith(entityType + ".")).Select(p => p[(entityType.Length + 1)..]).ToHashSet();
        if (restricted.Count == 0) return changes;
        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(changes);
        if (dict is null) return changes;
        foreach (var k in dict.Keys.Where(k => restricted.Contains(k, StringComparer.OrdinalIgnoreCase)).ToList())
            dict[k] = JsonSerializer.SerializeToElement(new[] { "(restricted)", "(restricted)" });
        return JsonSerializer.Serialize(dict);
    }

    private static string[] GrantFlags(Grant g) => Enum.GetValues<Grant>().Where(x => x != Grant.None && g.HasFlag(x)).Select(x => x.ToString()).ToArray();

    private static object UserDto(User u) => new
    {
        u.Id, u.AccountName, u.DisplayName, u.Email, u.WorkingTimeZone, u.IsActive, u.DeactivatedAt, u.DeactivationReason, u.LastSignInAt, u.MappedGroups,
        roles = u.Roles.Select(r => r.AppRole?.Key ?? r.AppRole?.Name), roleId = u.Roles.Select(r => (long?)r.AppRoleId).FirstOrDefault(),
        roleName = u.Roles.Select(r => r.AppRole?.Name).FirstOrDefault(), u.AllClients, u.AllInternal, grants = GrantFlags(u.Grants),
        scopes = u.Scopes.Select(s => new { s.Kind, s.ClientId, s.ProjectId, s.TeamId }), version = Convert.ToBase64String(u.RowVersion)
    };

    private static async Task<List<(ScopeKind, long?, long?, long?)>> CheckScopesAsync(Check check, ScopeInput[]? scopes, HubDbContext db, CancellationToken ct)
    {
        var list = new List<(ScopeKind, long?, long?, long?)>();
        foreach (var (s, n) in (scopes ?? []).Select((s, n) => (s, n)))
        {
            var ok = s.Kind switch
            {
                ScopeKind.Client => s.ClientId is not null && await db.Clients.IgnoreQueryFilters().AnyAsync(c => c.Id == s.ClientId, ct),
                ScopeKind.Project => s.ProjectId is not null && await db.Projects.IgnoreQueryFilters().AnyAsync(c => c.Id == s.ProjectId, ct),
                _ => s.TeamId is not null && await db.Teams.AnyAsync(c => c.Id == s.TeamId, ct)
            };
            if (!ok) { check.Add($"scopes[{n}]", "Select an existing client, project or team."); continue; }
            var key = (s.Kind, s.Kind == ScopeKind.Client ? s.ClientId : null, s.Kind == ScopeKind.Project ? s.ProjectId : null, s.Kind == ScopeKind.InternalTeam ? s.TeamId : null);
            if (!list.Contains(key)) list.Add(key);
        }
        return list;
    }

    private static Grant ToGrants(bool export, bool tech, bool audit) => (export ? Grant.Export : 0) | (tech ? Grant.TechnicalDetail : 0) | (audit ? Grant.Audit : 0);

    /// <summary>
    /// Nobody grants their own access (Section 3): an administrator cannot create or change a mapping for a directory group
    /// they belong to, because that mapping decides their own role, scope and grants at sign-in. Another administrator must do it.
    /// </summary>
    private static void RefuseOwnGroup(HttpContext ctx, params string?[] groupNames)
    {
        var mine = UserResolver.GroupNames(ctx.User);
        if (groupNames.Any(g => !string.IsNullOrWhiteSpace(g) && mine.Contains(g.Trim())))
            throw new ValidationException("groupName", "You belong to this group, so this mapping would change your own access. Ask another administrator.");
    }

    private static async Task ApplyUserAsync(User u, UserInput i, HubDbContext db, UserContext me, bool isNew, CancellationToken ct)
    {
        var check = new Check().Text("displayName", i.DisplayName, 150, "the display name", true).Text("email", i.Email, 254, "Email");
        if (isNew) check.Text("accountName", i.AccountName, 200, "the organization account (DOMAIN\\name)", true);
        if (Zones.Find(i.WorkingTimeZone) is null) check.Add("workingTimeZone", "Select a valid IANA time zone.");
        // A31: one configurable role per user (by id, or by name / built-in key).
        var names = (i.Roles ?? []).Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList();
        var wanted = i.RoleId is { } rid ? await db.AppRoles.Where(r => r.Id == rid).Select(r => r.Id).ToListAsync(ct)
            : await db.AppRoles.Where(r => names.Contains(r.Name) || (r.Key != null && names.Contains(r.Key))).Select(r => r.Id).ToListAsync(ct);
        if ((i.RoleId is not null && wanted.Count == 0) || (i.RoleId is null && wanted.Count < names.Count)) check.Add("roleId", "Select an existing role.");
        if (wanted.Count > 1) check.Add("roleId", "Give each user one role.");
        // Nobody grants their own access (Section 3).
        if (!isNew && u.Id == me.UserId)
        {
            var newRoles = wanted.Order().ToArray();
            if (!newRoles.SequenceEqual(u.Roles.Select(r => r.AppRoleId).Order()) || ToGrants(i.Export, i.TechnicalDetail, i.Audit) != u.Grants || i.AllClients != u.AllClients || i.AllInternal != u.AllInternal || (i.Scopes ?? []).Length != u.Scopes.Count)
                check.Add("roles", "You cannot change your own roles, scope or grants. Ask another administrator.");
        }
        var scopes = await CheckScopesAsync(check, i.Scopes, db, ct);
        check.ThrowIfAny();
        if (isNew)
        {
            var account = i.AccountName!.Trim();
            if (await db.Users.AnyAsync(x => x.AccountName == account, ct)) throw new ConflictException("This account already exists.");
            u.AccountName = account;
        }
        u.DisplayName = i.DisplayName!.Trim();
        u.Email = Text.Clean(i.Email);
        u.WorkingTimeZone = i.WorkingTimeZone!.Trim();
        u.AllClients = i.AllClients;
        u.AllInternal = i.AllInternal;
        u.Grants = ToGrants(i.Export, i.TechnicalDetail, i.Audit);
        u.Roles.RemoveAll(r => !wanted.Contains(r.AppRoleId));
        foreach (var r in wanted.Where(r => u.Roles.All(x => x.AppRoleId != r))) u.Roles.Add(new UserRole { AppRoleId = r });
        u.Scopes.RemoveAll(s => !scopes.Contains((s.Kind, s.ClientId, s.ProjectId, s.TeamId)));
        foreach (var s in scopes.Where(s => !u.Scopes.Any(x => (x.Kind, x.ClientId, x.ProjectId, x.TeamId) == s)))
            u.Scopes.Add(new UserScope { Kind = s.Item1, ClientId = s.Item2, ProjectId = s.Item3, TeamId = s.Item4 });
    }

    private static async Task ApplyMappingAsync(GroupMapping m, MappingInput i, HubDbContext db, CancellationToken ct)
    {
        var check = new Check().Text("groupName", i.GroupName, 256, "the group name", true);
        var scopes = await CheckScopesAsync(check, i.Scopes, db, ct);
        check.ThrowIfAny();
        var name = i.GroupName!.Trim();
        if (await db.GroupMappings.AnyAsync(x => x.GroupName == name && x.Id != m.Id, ct)) throw new ConflictException("This group already has a mapping.");
        m.GroupName = name;
        m.Role = i.Role;
        m.AllClients = i.AllClients;
        m.AllInternal = i.AllInternal;
        m.Grants = ToGrants(i.Export, i.TechnicalDetail, i.Audit);
        m.Scopes.RemoveAll(s => !scopes.Contains((s.Kind, s.ClientId, s.ProjectId, s.TeamId)));
        foreach (var s in scopes.Where(s => !m.Scopes.Any(x => (x.Kind, x.ClientId, x.ProjectId, x.TeamId) == s)))
            m.Scopes.Add(new GroupMappingScope { Kind = s.Item1, ClientId = s.Item2, ProjectId = s.Item3, TeamId = s.Item4 });
    }
}
