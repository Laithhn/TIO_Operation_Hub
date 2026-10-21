using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Clients;

public static partial class ClientEndpoints
{
    /// <summary>
    /// Owner decision (UAT 19 Oct 2026): alias, name, country from the world list, status Opportunity/Active and the project manager.
    /// Responsibility party/organization, coordinator, parent organization and partner are out of scope (always the TIO team).
    /// </summary>
    /// <summary>A29: <c>ParentClientId</c> makes the client a sub-client of a main client (null = main client); <c>Team</c> null leaves the project team unchanged.</summary>
    public sealed record ClientInput(string? Code, string? Name, string? Country, ClientStatus? Status, long? OwnerUserId, DateTimeOffset? NextReviewAt,
        long? ParentClientId = null, List<TeamMemberInput>? Team = null);
    public sealed record TeamMemberInput(long? UserId, string? Role);

    public sealed record RegionInput(string? Code, string? Name, long? OwnerUserId, string? Description);
    public sealed record ProjectInput(long? ClientId, string? Code, string? Name, long? OwnerUserId, ProjectStatus? Status, string? ScopeSummary, DateOnly? ServiceStart, DateOnly? ServiceEnd, long[]? ProductIds);
    public sealed record ContactInput(string? Name, string? Role, string? Organization, string? Email, string? Phone, bool AuthorizedSupport, long? ProjectId, string? Responsibility);
    public sealed record BoundaryInput(long? EnvironmentId, string? Area, ResponsibleParty? Party, string? Organization, long? ContactId, long? CoordinatorUserId, string? Notes, string? Evidence,
        long? ResponsibleUserId = null, ContactDetailsInput? Person = null);

    [GeneratedRegex(@"^[A-Za-z0-9][A-Za-z0-9_\-]{0,49}$")]
    private static partial Regex CodePattern();

    public static void MapClientEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/clients").WithTags("Clients");

        g.MapGet("", async (string? q, string? country, ClientStatus? status, long? ownerId, string? structure, long? parentId, string? level, string? sort, int? page, int? pageSize,
            HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var query = db.Clients.AsNoTracking().AsQueryable();
            if (parentId is not null) query = query.Where(c => c.ParentClientId == parentId);
            if (level == "main") query = query.Where(c => c.ParentClientId == null);
            if (level == "sub") query = query.Where(c => c.ParentClientId != null);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(c => c.Name.Contains(q) || c.Code.Contains(q));
            if (!string.IsNullOrWhiteSpace(country)) query = country == "Unknown" ? query.Where(c => c.CountryUnknown) : query.Where(c => c.Country == country);
            if (status is not null) query = query.Where(c => c.Status == status);
            if (ownerId is not null) query = query.Where(c => c.OwnerUserId == ownerId);
            if (structure == "regional") query = query.Where(c => db.Regions.Any(r => r.ClientId == c.Id));
            if (structure == "direct") query = query.Where(c => !db.Regions.Any(r => r.ClientId == c.Id));
            var keys = new Dictionary<string, Expression<Func<Client, object?>>>
            {
                ["name"] = c => c.Name, ["code"] = c => c.Code, ["country"] = c => c.Country, ["status"] = c => c.Status,
                // Main clients followed by their sub-clients.
                ["tree"] = c => c.ParentClient != null ? c.ParentClient.Code + " " + c.Code : c.Code
            };
            var now = DateTimeOffset.UtcNow;
            var paged = await query.SortBy(sort, keys, "name").Select(c => new
            {
                c.Id, c.Code, c.Name, c.Country, c.CountryUnknown, c.Status,
                owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive),
                c.ParentClientId, parentCode = c.ParentClient == null ? null : c.ParentClient.Code, parentName = c.ParentClient == null ? null : c.ParentClient.Name,
                subClientCount = db.Clients.Count(s => s.ParentClientId == c.Id),
                regionCount = db.Regions.Count(r => r.ClientId == c.Id),
                environmentCount = db.Environments.Count(e => e.ClientId == c.Id),
                directEnvironmentCount = db.Environments.Count(e => e.ClientId == c.Id && e.RegionId == null),
                openCases = db.Cases.Count(x => x.ClientId == c.Id && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled),
                overdueCommitments = db.Commitments.Count(x => x.ClientId == c.Id && x.Status == CommitmentStatus.Open && x.CurrentDueAt < now),
                c.LastReviewedAt
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            return Results.Ok(paged);
        });

        // Duplicate warning before onboarding (Section 5.1). Hidden matches are reported only as a neutral count.
        g.MapGet("/duplicates", async (string? code, string? name, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var c = (code ?? "").Trim();
            var n = (name ?? "").Trim();
            if (c.Length == 0 && n.Length == 0) return Results.Ok(new { visible = Array.Empty<object>(), hiddenCount = 0 });
            var all = await db.Clients.IgnoreQueryFilters()
                .Where(x => (c.Length > 0 && x.Code == c) || (n.Length > 0 && x.Name.Contains(n)))
                .Select(x => new { x.Id, x.Code, x.Name, archived = x.ArchivedAt != null }).Take(50).ToListAsync(ct);
            var visible = all.Where(x => access.Me.SeesClient(x.Id)).ToList();
            return Results.Ok(new { visible, hiddenCount = all.Count - visible.Count });
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, FreshnessService fresh, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var c = await db.Clients.AsNoTracking().Include(x => x.Owner).Include(x => x.CountryFollowUpOwner).Include(x => x.ParentClient)
                .Include(x => x.Team).ThenInclude(t => t.User).AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            var f = await fresh.ForAsync(RecordTypes.Client, ReviewScope.Record, c.CreatedAt, c.LastReviewedAt, c.NextReviewAt, DateTimeOffset.UtcNow, ct);
            var users = await access.UserRefsAsync([c.CoordinatorUserId], ct);
            // A29: a main client lists its sub-clients with what each of them runs.
            var subs = await db.Clients.AsNoTracking().Where(s => s.ParentClientId == id).OrderBy(s => s.Code).Select(s => new
            {
                s.Id, s.Code, s.Name, s.Status, s.Country,
                owner = s.Owner == null ? null : new UserRef(s.Owner.Id, s.Owner.DisplayName, s.Owner.IsActive),
                regionCount = db.Regions.Count(r => r.ClientId == s.Id),
                environmentCount = db.Environments.Count(e => e.ClientId == s.Id),
                serverCount = db.Assets.Count(a => a.ClientId == s.Id && a.TypeCategory != AssetType.LogicalEndpoint),
                products = db.Installations.Where(i => i.ClientId == s.Id).Select(i => i.Product!.Code).Distinct().ToList(),
                teamSize = db.ClientTeamMembers.Count(t => t.ClientId == s.Id)
            }).ToListAsync(ct);
            return ctx.WithETag(c, ClientDto(c, f, users, access.Me.HasClient(c.Id), subs));
        });

        g.MapPost("", async (ClientInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.Require(Role.Manager);
            if (!access.Me.AllClients) throw new ForbiddenException("Creating a client needs access to all clients, so the new client stays visible to you. Ask the TIO Manager.");
            var c = new Client();
            await ApplyClientAsync(c, input, db, access, isNew: true, ct);
            db.Clients.Add(c);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/clients/{c.Id}", new { c.Id, c.Code });
        });

        g.MapPut("/{id:long}", async (long id, ClientInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Clients.Include(x => x.Team).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireMaintain(c.Id, null, c.OwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await ApplyClientAsync(c, input, db, access, isNew: false, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // CLI-05: archival with active work requires a Manager exception; history is never removed.
        g.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireArchiveFor(c.Id);
            db.ExpectVersion(ctx, c);
            var reason = Rules.RequireReason(input.Reason, "reason", "the archive reason");
            if (await db.Clients.AnyAsync(s => s.ParentClientId == id, ct))
                throw new ValidationException("reason", "This client still has active sub-clients. Archive them, or make them main clients, first.");
            var active = await ActiveWorkAsync(db, id, ct);
            if (active.Total > 0)
            {
                if (string.IsNullOrWhiteSpace(input.ExceptionReason))
                    throw new ValidationException("Active records remain.", new Dictionary<string, string[]> { ["exceptionReason"] = [$"{active.Describe()} remain. A TIO Manager must record an exception reason to archive anyway."] });
                if (!access.Me.HasRight(Right.Archive) || !access.Me.IsManager) throw new ForbiddenException("Archiving a client with active records needs the Archive and Manage rights.");
                reason = $"{reason} — Manager exception: {Rules.RequireReason(input.ExceptionReason, "exceptionReason", "the exception reason")}";
            }
            Rules.Archive(c, access.Me, DateTimeOffset.UtcNow, reason);
            c.Status = ClientStatus.Archived;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapGet("/{id:long}/active-work", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            if (!access.Me.HasClient(id)) throw new NotFoundException("The client");
            var a = await ActiveWorkAsync(db, id, ct);
            return Results.Ok(new { a.OpenCases, a.OpenCommitments, a.ActiveEnvironments, total = a.Total });
        });

        // ---- regions (REG-01, REG-06) ----
        g.MapGet("/{id:long}/regions", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (!access.Me.SeesClient(id)) throw new NotFoundException("The client");
            var rows = await db.Regions.AsNoTracking().Where(r => r.ClientId == id).OrderBy(r => r.Code)
                .Select(r => new { r.Id, r.Code, r.Name, r.Description, owner = r.Owner == null ? null : new UserRef(r.Owner.Id, r.Owner.DisplayName, r.Owner.IsActive), environmentCount = db.Environments.Count(e => e.RegionId == r.Id) })
                .ToListAsync(ct);
            return Results.Ok(rows);
        });

        g.MapPost("/{id:long}/regions", async (long id, RegionInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var client = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireLeadFor(client.Id);
            var r = new Region { ClientId = id };
            await ApplyRegionAsync(r, input, db, access, ct);
            db.Regions.Add(r);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/regions/{r.Id}", new { r.Id });
        });

        var rg = api.MapGroup("/regions").WithTags("Regions");
        rg.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var r = await db.Regions.AsNoTracking().Include(x => x.Owner).Include(x => x.Client).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The region");
            var envs = await db.Environments.AsNoTracking().Where(e => e.RegionId == id).OrderBy(e => e.Name)
                .Select(e => new { e.Id, e.Name, e.Type, e.Criticality, e.Condition }).ToListAsync(ct);
            return ctx.WithETag(r, new
            {
                r.Id, r.Code, r.Name, r.Description, r.ClientId, clientName = r.Client!.Name, clientCode = r.Client.Code,
                owner = r.Owner == null ? null : new UserRef(r.Owner.Id, r.Owner.DisplayName, r.Owner.IsActive),
                environments = envs, r.CreatedAt, r.UpdatedAt
            });
        });
        rg.MapPut("/{id:long}", async (long id, RegionInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var r = await db.Regions.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The region");
            access.RequireLeadFor(r.ClientId);
            db.ExpectVersion(ctx, r);
            await ApplyRegionAsync(r, input, db, access, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        // REG-06: archival is blocked while active environments remain; they are never moved or deleted silently.
        rg.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var r = await db.Regions.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The region");
            access.RequireArchiveFor(r.ClientId);
            db.ExpectVersion(ctx, r);
            var reason = Rules.RequireReason(input.Reason);
            var active = await db.Environments.IgnoreQueryFilters().CountAsync(e => e.RegionId == id && e.ArchivedAt == null, ct);
            if (active > 0)
                throw new ValidationException("Active environments remain in this region.", new Dictionary<string, string[]> { ["reason"] = [$"{active} active environment(s) still belong to this region. Reassign them to another region of this client or directly to the client first."] });
            Rules.Archive(r, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- projects (CLI-02) ----
        var pg = api.MapGroup("/projects").WithTags("Projects");
        pg.MapGet("", async (long? clientId, string? q, ProjectStatus? status, long? ownerId, string? sort, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var query = db.Projects.AsNoTracking().AsQueryable();
            if (clientId is not null) query = query.Where(p => p.ClientId == clientId);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(p => p.Name.Contains(q) || p.Code.Contains(q));
            if (status is not null) query = query.Where(p => p.Status == status);
            if (ownerId is not null) query = query.Where(p => p.OwnerUserId == ownerId);
            var keys = new Dictionary<string, Expression<Func<Project, object?>>> { ["name"] = p => p.Name, ["code"] = p => p.Code, ["status"] = p => p.Status, ["client"] = p => p.Client!.Name };
            // Contract summary per project (A27): same renewal rule as the contract register ("needs attention").
            var horizon = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(ContractQuery.RenewalWindowDays);
            return Results.Ok(await query.SortBy(sort, keys, "name").Select(p => new
            {
                p.Id, p.Code, p.Name, p.Status, p.ClientId, clientName = p.Client!.Name, clientCode = p.Client.Code, p.ScopeSummary, p.ServiceStart, p.ServiceEnd,
                owner = p.Owner == null ? null : new UserRef(p.Owner.Id, p.Owner.DisplayName, p.Owner.IsActive),
                products = db.ProjectProducts.Where(pp => pp.ProjectId == p.Id).Join(db.Products, pp => pp.ProductId, pr => pr.Id, (pp, pr) => new { pr.Id, pr.Code }).ToList(),
                contracts = db.Contracts.Count(c => c.ProjectId == p.Id),
                activeContracts = db.Contracts.Count(c => c.ProjectId == p.Id && c.Status == ContractStatus.Active),
                renewalAttention = db.Contracts.Count(c => c.ProjectId == p.Id && c.Status == ContractStatus.Active && (c.EndDate == null || c.EndDate.Value.AddDays(-(c.NoticeDays ?? 0)) <= horizon))
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });
        pg.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var p = await db.Projects.AsNoTracking().Include(x => x.Owner).Include(x => x.Client).Include(x => x.Products).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The project");
            var now = DateTimeOffset.UtcNow;
            var productIds = p.Products.Select(x => x.ProductId).ToList();
            var contracts = await db.Contracts.AsNoTracking().Where(c => c.ProjectId == id).OrderByDescending(c => c.Status == ContractStatus.Active).ThenByDescending(c => c.StartDate)
                .Select(c => new
                {
                    c.Id, c.Ref, c.Title, c.ContractReference, c.Type, c.Status, c.StartDate, c.EndDate, c.NoticeDays, c.SupportModel, c.OnSiteEngineersRequired,
                    owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive),
                    slaTargets = c.SlaTargets.OrderBy(t => t.Priority).Select(t => new { t.Priority, t.ResponseMinutes, t.ResolutionMinutes, t.Basis }).ToList()
                }).ToListAsync(ct);
            return ctx.WithETag(p, new
            {
                p.Id, p.Code, p.Name, p.Status, p.ClientId, clientName = p.Client!.Name, clientCode = p.Client.Code, p.ScopeSummary, p.ServiceStart, p.ServiceEnd,
                owner = p.Owner == null ? null : new UserRef(p.Owner.Id, p.Owner.DisplayName, p.Owner.IsActive),
                productIds,
                products = await db.Products.AsNoTracking().Where(x => productIds.Contains(x.Id)).OrderBy(x => x.Code).Select(x => new { x.Id, x.Code, x.Name }).ToListAsync(ct),
                environments = await db.Environments.AsNoTracking().Where(e => e.ProjectId == id)
                    .Select(e => new { e.Id, e.Name, e.Type, region = e.Region == null ? null : e.Region.Code }).ToListAsync(ct),
                contracts = contracts.Select(c =>
                {
                    var notice = c.EndDate is { } e && c.NoticeDays is { } n ? e.AddDays(-n) : (DateOnly?)null;
                    var state = ContractQuery.State(new Contract { Status = c.Status, EndDate = c.EndDate, NoticeDays = c.NoticeDays }, now);
                    return new
                    {
                        c.Id, c.Ref, c.Title, c.ContractReference, c.Type, c.Status, c.StartDate, c.EndDate, noticeDeadline = notice, c.SupportModel, c.OnSiteEngineersRequired, c.owner, c.slaTargets,
                        renewalState = state, renewalNote = state is "Expired" or "RenewalDue" or "EndDateUnknown" ? ContractQuery.Reason(state, c.EndDate, notice, now) : null
                    };
                }),
                p.LastReviewedAt, p.CreatedAt, p.UpdatedAt,
                permissions = new
                {
                    canEdit = access.Me.SeesClient(p.ClientId) && access.Me.Can(Role.Engineer),
                    canAddContract = access.Me.SeesClient(p.ClientId) && access.Me.Can(Role.Engineer),
                    canArchive = access.Me.HasRight(Right.Archive) && access.Me.SeesClient(p.ClientId)
                }
            });
        });
        pg.MapPost("", async (ProjectInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            if (input.ClientId is null) throw new ValidationException("clientId", "Select the client.");
            var client = await db.Clients.FirstOrDefaultAsync(x => x.Id == input.ClientId, ct) ?? throw new NotFoundException("The client");
            access.RequireLeadFor(client.Id);
            var p = new Project { ClientId = client.Id };
            await ApplyProjectAsync(p, input, db, access, ct);
            db.Projects.Add(p);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/projects/{p.Id}", new { p.Id });
        });
        pg.MapPut("/{id:long}", async (long id, ProjectInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var p = await db.Projects.Include(x => x.Products).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The project");
            access.RequireMaintain(p.ClientId, null, p.OwnerUserId);
            db.ExpectVersion(ctx, p);
            await ApplyProjectAsync(p, input, db, access, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        pg.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The project");
            access.RequireArchiveFor(p.ClientId);
            db.ExpectVersion(ctx, p);
            if (await db.Contracts.AnyAsync(c => c.ProjectId == id && c.Status == ContractStatus.Active, ct))
                throw new ValidationException("reason", "This project has an Active contract. Record the contract as Ended or Terminated before archiving the project.");
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(p, access.Me, DateTimeOffset.UtcNow, reason);
            p.Status = ProjectStatus.Archived;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- contacts ----
        g.MapGet("/{id:long}/contacts", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (!access.Me.SeesClient(id)) throw new NotFoundException("The client");
            return Results.Ok(await db.Contacts.AsNoTracking().Where(c => c.ClientId == id).OrderBy(c => c.Name)
                .Select(c => new { c.Id, c.Name, c.Role, c.Organization, c.Email, c.Phone, c.AuthorizedSupport, c.ProjectId, c.Responsibility, c.LastReviewedAt, version = Convert.ToBase64String(c.RowVersion) })
                .ToListAsync(ct));
        });
        g.MapPost("/{id:long}/contacts", async (long id, ContactInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var client = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireMaintain(client.Id, null, client.OwnerUserId, client.CoordinatorUserId);
            var c = new Contact { ClientId = id };
            await ApplyContactAsync(c, input, db, ct);
            db.Contacts.Add(c);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/contacts/{c.Id}", new { c.Id });
        });
        var cg = api.MapGroup("/contacts").WithTags("Contacts");
        cg.MapPut("/{id:long}", async (long id, ContactInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Contacts.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The contact");
            var client = await db.Clients.FirstAsync(x => x.Id == c.ClientId, ct);
            access.RequireMaintain(c.ClientId, null, client.OwnerUserId, client.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await ApplyContactAsync(c, input, db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        cg.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Contacts.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The contact");
            var client = await db.Clients.FirstAsync(x => x.Id == c.ClientId, ct);
            access.RequireMaintain(c.ClientId, null, client.OwnerUserId, client.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(c, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- responsibility boundaries ----
        g.MapGet("/{id:long}/boundaries", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (!access.Me.SeesClient(id)) throw new NotFoundException("The client");
            return Results.Ok(await db.Boundaries.AsNoTracking().Where(b => b.ClientId == id).OrderBy(b => b.Area)
                .Select(b => new
                {
                    b.Id, b.Area, b.Party, b.Organization, b.ContactId, b.EnvironmentId, b.Notes, b.Evidence,
                    responsibleUser = b.ResponsibleUser == null ? null : b.ResponsibleUser.DisplayName, b.ResponsibleUserId,
                    person = b.PersonName == null ? null : new { name = b.PersonName, title = b.PersonTitle, organization = b.Organization, phone = b.PersonPhone, mobile = b.PersonMobile, email = b.PersonEmail },
                    environmentName = db.Environments.Where(e => e.Id == b.EnvironmentId).Select(e => e.Name).FirstOrDefault(),
                    coordinator = b.Coordinator == null ? null : new UserRef(b.Coordinator.Id, b.Coordinator.DisplayName, b.Coordinator.IsActive),
                    version = Convert.ToBase64String(b.RowVersion)
                }).ToListAsync(ct));
        });
        g.MapPost("/{id:long}/boundaries", async (long id, BoundaryInput input, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var client = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireMaintain(client.Id, null, client.OwnerUserId, client.CoordinatorUserId);
            var b = new ResponsibilityBoundary { ClientId = id };
            await ApplyBoundaryAsync(b, input, db, access, lookups, ct);
            db.Boundaries.Add(b);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/boundaries/{b.Id}", new { b.Id });
        });
        var bg = api.MapGroup("/boundaries").WithTags("Responsibility boundaries");
        bg.MapPut("/{id:long}", async (long id, BoundaryInput input, HttpContext ctx, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var b = await db.Boundaries.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The responsibility boundary");
            var client = await db.Clients.FirstAsync(x => x.Id == b.ClientId, ct);
            access.RequireMaintain(b.ClientId, null, client.OwnerUserId, client.CoordinatorUserId, b.CoordinatorUserId);
            db.ExpectVersion(ctx, b);
            await ApplyBoundaryAsync(b, input, db, access, lookups, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        bg.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var b = await db.Boundaries.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The responsibility boundary");
            access.RequireArchiveFor(b.ClientId);
            db.ExpectVersion(ctx, b);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(b, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    public sealed record ActiveWork(int OpenCases, int OpenCommitments, int ActiveEnvironments)
    {
        public int Total => OpenCases + OpenCommitments + ActiveEnvironments;
        public string Describe() => string.Join(", ", new[] { (OpenCases, "open case(s)"), (OpenCommitments, "open commitment(s)"), (ActiveEnvironments, "active environment(s)") }.Where(x => x.Item1 > 0).Select(x => $"{x.Item1} {x.Item2}"));
    }

    /// <summary>Counted without scope filters: the gate must see every active record, even ones the actor cannot open.</summary>
    public static async Task<ActiveWork> ActiveWorkAsync(HubDbContext db, long clientId, CancellationToken ct) => new(
        await db.Cases.IgnoreQueryFilters().CountAsync(c => c.ClientId == clientId && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled, ct),
        await db.Commitments.IgnoreQueryFilters().CountAsync(c => c.ClientId == clientId && c.Status == CommitmentStatus.Open, ct),
        await db.Environments.IgnoreQueryFilters().CountAsync(e => e.ClientId == clientId && e.ArchivedAt == null, ct));

    private static object ClientDto(Client c, Freshness f, Dictionary<long, UserRef> users, bool fullScope, object subClients) => new
    {
        c.Id, c.Code, c.Name, c.Country, c.CountryUnknown, c.Status, c.ParentOrganization, c.Partner,
        // A29: main client, sub-clients and the project team.
        c.ParentClientId, parent = c.ParentClient == null ? null : new { c.ParentClient.Id, c.ParentClient.Code, c.ParentClient.Name },
        subClients, team = c.Team.OrderBy(t => t.SortOrder).Select(t => new { t.UserId, name = t.User!.DisplayName, t.User.IsActive, t.Role }),
        owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive),
        countryFollowUpOwner = c.CountryFollowUpOwner == null ? null : new UserRef(c.CountryFollowUpOwner.Id, c.CountryFollowUpOwner.DisplayName, c.CountryFollowUpOwner.IsActive),
        c.ResponsibleParty, c.ResponsibleOrganization, c.ResponsibleTeamId,
        coordinator = c.CoordinatorUserId is { } cid ? users.GetValueOrDefault(cid) : null,
        c.LastReviewedAt, c.NextReviewAt, freshness = f,
        c.ArchivedAt, c.ArchiveReason, c.CreatedAt, c.UpdatedAt,
        accessLevel = fullScope ? "Full" : "ProjectSummary"
    };

    private static async Task ApplyClientAsync(Client c, ClientInput i, HubDbContext db, HubAccess access, bool isNew, CancellationToken ct)
    {
        var check = new Check();
        var code = (i.Code ?? "").Trim().ToUpperInvariant();
        if (isNew)
        {
            check.Required("code", code, "the client alias");
            if (code.Length > 0 && !CodePattern().IsMatch(code)) check.Add("code", "Use letters, digits, hyphen or underscore (max 50).");
        }
        else if (code.Length > 0 && code != c.Code)
        {
            check.Add("code", "The client alias cannot be changed here. An administrator can correct it through an audited correction.");
        }
        check.Text("name", i.Name, 150, "the client name", required: true);
        var country = Countries.Find(i.Country);
        if (string.IsNullOrWhiteSpace(i.Country)) check.Add("country", "Select the country.");
        else if (country is null) check.Add("country", "Select a country from the list.");
        var status = i.Status ?? (isNew ? ClientStatus.Opportunity : c.Status);
        if (status == ClientStatus.Archived) check.Add("status", "Use Archive to archive a client.");
        if (i.OwnerUserId is null) check.Add("ownerUserId", "Select the project manager (the team member managing this client).");
        access.CheckOwnerChange(check, "ownerUserId", isNew ? i.OwnerUserId : c.OwnerUserId, i.OwnerUserId);
        // A new client has no scope grants yet; the project manager must at least hold an active business role. Later changes also check scope.
        if (isNew)
        {
            if (i.OwnerUserId is not null && !await db.Users.AnyAsync(u => u.Id == i.OwnerUserId && u.IsActive && u.Roles.Any(), ct))
                check.Add("ownerUserId", "Select an active team member with a business role.");
        }
        else await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, c.Id, null, "the project manager", ct);
        // A29: one level of sub-clients.
        if (i.ParentClientId is not null)
        {
            var parent = await db.Clients.Where(p => p.Id == i.ParentClientId).Select(p => new { p.Id, p.ParentClientId }).FirstOrDefaultAsync(ct);
            if (parent is null) check.Add("parentClientId", "Select an active main client.");
            else if (parent.Id == c.Id) check.Add("parentClientId", "A client cannot be its own main client.");
            else if (parent.ParentClientId is not null) check.Add("parentClientId", "That client is itself a sub-client. Choose its main client instead (one level of sub-clients).");
            else if (!isNew && await db.Clients.AnyAsync(s => s.ParentClientId == c.Id, ct)) check.Add("parentClientId", "This client has sub-clients of its own, so it must stay a main client.");
        }
        var team = (i.Team ?? []).Where(t => t.UserId is not null || !string.IsNullOrWhiteSpace(t.Role)).ToList();
        for (var n = 0; n < team.Count; n++)
        {
            var t = team[n];
            check.When(t.UserId is null, $"team[{n}]", $"Team member {n + 1}: select the person.");
            // A37: the role comes from Configuration → Project team roles (a role already on this team stays valid if retired).
            var keep = c.Team.FirstOrDefault(m => m.UserId == t.UserId)?.Role;
            await new LookupService(db).CheckAsync(check, $"team[{n}].role", LookupLists.TeamRole, t.Role, $"the role of team member {n + 1}", keep, ct, required: true);
            if (t.UserId is not null && !await db.Users.AnyAsync(u => u.Id == t.UserId && u.IsActive && u.Roles.Any(), ct))
                check.Add($"team[{n}]", $"Team member {n + 1}: select an active team member.");
        }
        if (team.Where(t => t.UserId is not null).GroupBy(t => t.UserId).Any(g => g.Count() > 1)) check.Add("team", "List each person once; give them one combined role.");
        check.ThrowIfAny();
        if (isNew)
        {
            // Aliases are reserved across archive/restore. A hidden duplicate is reported neutrally.
            var dup = await db.Clients.IgnoreQueryFilters().Where(x => x.Code == code).Select(x => new { x.Id, x.Name }).FirstOrDefaultAsync(ct);
            if (dup is not null)
                throw new ConflictException("This client alias is already in use.", new()
                {
                    ["code"] = [access.Me.SeesClient(dup.Id) ? $"Already used by {dup.Name}." : "This client alias is already in use by a record you cannot access."]
                });
            c.Code = code;
        }
        c.Name = i.Name!.Trim();
        c.Country = country;
        c.CountryUnknown = false;
        c.CountryFollowUpOwnerId = null;
        c.Status = status;
        c.OwnerUserId = i.OwnerUserId;
        // Always the TIO team (out-of-scope responsibility fields are cleared).
        c.ResponsibleParty = ResponsibleParty.TIO;
        c.ResponsibleOrganization = null;
        c.CoordinatorUserId = null;
        c.NextReviewAt = i.NextReviewAt;
        c.ParentClientId = i.ParentClientId;
        if (i.Team is not null)
        {
            c.Team.RemoveAll(m => team.All(t => t.UserId != m.UserId));
            for (var n = 0; n < team.Count; n++)
            {
                var row = c.Team.FirstOrDefault(m => m.UserId == team[n].UserId);
                if (row is null) c.Team.Add(row = new ClientTeamMember { UserId = team[n].UserId!.Value });
                row.Role = team[n].Role!.Trim();
                row.SortOrder = n;
            }
        }
    }

    private static async Task ApplyRegionAsync(Region r, RegionInput i, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        var check = new Check();
        var code = (i.Code ?? "").Trim().ToUpperInvariant();
        check.Required("code", code, "the region code").When(code.Length > 0 && !CodePattern().IsMatch(code), "code", "Use letters, digits, hyphen or underscore (max 50).")
             .Text("name", i.Name, 150, "the region name", required: true)
             .Text("description", i.Description, 2000, "Description")
             .When(i.OwnerUserId is null, "ownerUserId", "Select the accountable region owner.");
        access.CheckOwnerChange(check, "ownerUserId", r.Id == 0 ? i.OwnerUserId : r.OwnerUserId, i.OwnerUserId);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, r.ClientId, null, "the owner", ct);
        check.ThrowIfAny();
        if (code != r.Code && await db.Regions.IgnoreQueryFilters().AnyAsync(x => x.ClientId == r.ClientId && x.Code == code && x.Id != r.Id, ct))
            throw new ConflictException("This region code is already used by this client.", new() { ["code"] = ["Region codes are unique within a client."] });
        r.Code = code;
        r.Name = i.Name!.Trim();
        r.OwnerUserId = i.OwnerUserId;
        r.Description = Text.Clean(i.Description);
    }

    private static async Task ApplyProjectAsync(Project p, ProjectInput i, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        var check = new Check();
        var code = (i.Code ?? "").Trim().ToUpperInvariant();
        check.Required("code", code, "the project code").When(code.Length > 0 && !CodePattern().IsMatch(code), "code", "Use letters, digits, hyphen or underscore (max 50).")
             .Text("name", i.Name, 150, "the project name", required: true)
             .Text("scopeSummary", i.ScopeSummary, 2000, "Scope summary")
             .When(i.OwnerUserId is null, "ownerUserId", "Select the project owner.")
             .When(i.Status is null, "status", "Select the status.")
             .When(i.Status == ProjectStatus.Archived, "status", "Use Archive to archive a project.")
             .When(i.ServiceStart is not null && i.ServiceEnd is not null && i.ServiceEnd < i.ServiceStart, "serviceEnd", "The service end is before the start.");
        if (i.ClientId is not null && p.Id != 0 && i.ClientId != p.ClientId) check.Add("clientId", "A project cannot move to another client.");
        access.CheckOwnerChange(check, "ownerUserId", p.Id == 0 ? i.OwnerUserId : p.OwnerUserId, i.OwnerUserId);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, p.ClientId, null, "the owner", ct);
        var productIds = (i.ProductIds ?? []).Distinct().ToList();
        if (productIds.Count > 0 && await db.Products.CountAsync(x => productIds.Contains(x.Id), ct) != productIds.Count) check.Add("productIds", "Select products from the catalogue.");
        check.ThrowIfAny();
        if (code != p.Code && await db.Projects.IgnoreQueryFilters().AnyAsync(x => x.Code == code && x.Id != p.Id, ct))
            throw new ConflictException("This project code is already in use.", new() { ["code"] = ["Project codes are unique. Choose another code."] });
        p.Code = code;
        p.Name = i.Name!.Trim();
        p.OwnerUserId = i.OwnerUserId;
        p.Status = i.Status!.Value;
        p.ScopeSummary = Text.Clean(i.ScopeSummary);
        p.ServiceStart = i.ServiceStart;
        p.ServiceEnd = i.ServiceEnd;
        p.Products.RemoveAll(x => !productIds.Contains(x.ProductId));
        foreach (var id in productIds.Where(id => p.Products.All(x => x.ProductId != id))) p.Products.Add(new ProjectProduct { ProductId = id });
    }

    private static async Task ApplyContactAsync(Contact c, ContactInput i, HubDbContext db, CancellationToken ct)
    {
        var check = new Check();
        var email = Text.Clean(i.Email);
        var phone = Text.Clean(i.Phone);
        check.Text("name", i.Name, 150, "the contact's name", required: true)
             .Text("role", i.Role, 150, "Role")
             .Text("organization", i.Organization, 150, "Organization")
             .Text("responsibility", i.Responsibility, 1000, "Responsibility")
             .When(email is null && phone is null, "email", "Enter at least one usable email address or phone number.")
             .When(email is not null && !System.Net.Mail.MailAddress.TryCreate(email, out _), "email", "Enter a valid email address.")
             .When(phone is not null && !Regex.IsMatch(phone, @"^\+?[0-9 ()\-]{6,30}$"), "phone", "Enter a valid phone number.");
        if (i.ProjectId is not null && !await db.Projects.AnyAsync(p => p.Id == i.ProjectId && p.ClientId == c.ClientId, ct)) check.Add("projectId", "Select a project of this client.");
        check.ThrowIfAny();
        c.Name = i.Name!.Trim();
        c.Role = Text.Clean(i.Role);
        c.Organization = Text.Clean(i.Organization);
        c.Email = email;
        c.Phone = phone;
        c.AuthorizedSupport = i.AuthorizedSupport;
        c.ProjectId = i.ProjectId;
        c.Responsibility = Text.Clean(i.Responsibility);
    }

    private static async Task ApplyBoundaryAsync(ResponsibilityBoundary b, BoundaryInput i, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct)
    {
        var check = new Check();
        var area = await lookups.CheckAsync(check, "area", LookupLists.BoundaryArea, i.Area, "the area", b.Area, ct, required: true);
        check.When(i.Party is null, "party", "Select the responsible party, or Unknown.")
             .Text("organization", i.Organization, 150, "Organization")
             .Text("notes", i.Notes, 2000, "Notes")
             .Text("evidence", i.Evidence, 1000, "Evidence")
             .When(i.Party is not null and not ResponsibleParty.TIO && i.CoordinatorUserId is null, "coordinatorUserId", "Responsibility is external or unknown: select an internal coordinator.");
        if (i.EnvironmentId is not null && !await db.Environments.AnyAsync(e => e.Id == i.EnvironmentId && e.ClientId == b.ClientId, ct)) check.Add("environmentId", "Select an environment of this client.");
        if (i.ContactId is not null && !await db.Contacts.AnyAsync(x => x.Id == i.ContactId && x.ClientId == b.ClientId, ct)) check.Add("contactId", "Select a contact of this client.");
        ContactDetails.Check(check, "person", i.Person, "Responsible person");
        if (i.ResponsibleUserId is not null && ContactDetails.HasName(i.Person)) check.Add("personName", "Choose a team member or type a person, not both.");
        if (i.ResponsibleUserId is not null && !await db.Users.AnyAsync(u => u.Id == i.ResponsibleUserId && u.IsActive, ct)) check.Add("responsibleUserId", "Select an active team member.");
        await access.CheckAssignableAsync(check, "coordinatorUserId", i.CoordinatorUserId, b.ClientId, null, "the coordinator", ct);
        check.ThrowIfAny();
        b.Area = area!;
        b.Party = i.Party!.Value;
        b.EnvironmentId = i.EnvironmentId;
        b.Organization = Text.Clean(i.Organization);
        b.ContactId = i.ContactId;
        b.CoordinatorUserId = i.CoordinatorUserId;
        b.ResponsibleUserId = i.ResponsibleUserId;
        var named = ContactDetails.HasName(i.Person);
        b.PersonName = named ? i.Person!.Name!.Trim() : null;
        b.PersonTitle = named ? Text.Clean(i.Person!.Title) : null;
        b.PersonPhone = named ? Text.Clean(i.Person!.Phone) : null;
        b.PersonMobile = named ? Text.Clean(i.Person!.Mobile) : null;
        b.PersonEmail = named ? Text.Clean(i.Person!.Email) : null;
        if (named && Text.Clean(i.Person!.Organization) is { } org) b.Organization = org;
        b.Notes = Text.Clean(i.Notes);
        b.Evidence = Text.Clean(i.Evidence);
    }
}
