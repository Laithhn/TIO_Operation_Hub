using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Clients;

public static class OrganizationEndpoints
{
    public sealed record OrganizationInput(string? Name, string? Code = null, string? Description = null,
        string? OrganizationType = null, string? Email = null, string? Phone = null, string? Address = null, string? Status = null);
    public sealed record InitialRelationshipInput(long? ChildOrganizationId = null, OrganizationInput? NewOrganization = null,
        string? RelationshipType = null, string? Description = null);
    public sealed record RelationshipInput(long? ParentOrganizationId, long? ChildOrganizationId, string? RelationshipType = null,
        string? Description = null, DateOnly? StartDate = null, DateOnly? EndDate = null, int? SortOrder = null, bool? IsActive = null);
    public sealed record OrganizationDto(long Id, long? ClientId, string Name, string? Code, string? Description,
        string? OrganizationType, string? Email, string? Phone, string? Address, string? Status, string Version, bool CanEdit, bool IsArchived);
    public sealed record RelationshipDto(long Id, long ParentOrganizationId, long ChildOrganizationId, string? RelationshipType,
        string? Description, DateOnly? StartDate, DateOnly? EndDate, int SortOrder, bool IsActive, string Version);

    public static void MapOrganizationEndpoints(this RouteGroupBuilder api)
    {
        var org = api.MapGroup("/organizations").WithTags("Organizations");
        org.MapGet("", async (string? q, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var query = db.Organizations.AsNoTracking().Include(x => x.Client).AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
                query = query.Where(x => (x.ClientId != null ? x.Client!.Name : x.Name!).Contains(q) ||
                    (x.ClientId != null ? x.Client!.Code : x.Code ?? "").Contains(q));
            var size = Math.Clamp(pageSize ?? 30, 1, 200);
            var number = Math.Clamp(page ?? 1, 1, 1000000);
            var count = await query.CountAsync(ct);
            var rows = await query.OrderBy(x => x.ClientId != null ? x.Client!.Name : x.Name).ThenBy(x => x.Id)
                .Skip((number - 1) * size).Take(size).ToListAsync(ct);
            return Results.Ok(new { items = rows.Select(x => Dto(x, access.Me)), totalCount = count, page = number, pageSize = size });
        });
        org.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var row = await FindAsync(id, db, ct);
            return ctx.WithETag(row, Dto(row, access.Me));
        });
        org.MapPost("", async (OrganizationInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            RequireCatalogWrite(access.Me, ResourcePermissions.Create);
            var row = await NewOrganizationAsync(input, db, ct);
            db.Organizations.Add(row);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/organizations/{row.Id}", new { row.Id });
        });
        org.MapPut("/{id:long}", async (long id, OrganizationInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            RequireCatalogWrite(access.Me, ResourcePermissions.Maintain);
            var row = await FindAsync(id, db, ct);
            if (row.ClientId != null)
                throw new ValidationException("name", "Edit this organization's name and alias on its existing client page.");
            db.ExpectVersion(ctx, row);
            await ApplyOrganizationAsync(row, input, db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        org.MapGet("/{id:long}/hierarchy", async (long id, long clientId, long? projectId, int? maxDepth, HubDbContext db, HubAccess access, CancellationToken ct) =>
            await GraphAsync(clientId, projectId, id, maxDepth, db, access, ct));
        org.MapGet("/{id:long}/children", async (long id, long clientId, long? projectId, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
            await NeighborsAsync(id, clientId, projectId, false, page, pageSize, db, access, ct));
        org.MapGet("/{id:long}/parents", async (long id, long clientId, long? projectId, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
            await NeighborsAsync(id, clientId, projectId, true, page, pageSize, db, access, ct));

        api.MapGet("/clients/{clientId:long}/organizational-structure",
            async (long clientId, long? projectId, int? maxDepth, HubDbContext db, HubAccess access, CancellationToken ct) =>
                await GraphAsync(clientId, projectId, null, maxDepth, db, access, ct)).WithTags("Organizations");
        var edges = api.MapGroup("/clients/{clientId:long}/organization-relationships").WithTags("Organizations");
        edges.MapPost("", async (long clientId, long? projectId, RelationshipInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            await CheckContextAsync(clientId, projectId, true, db, access, ct);
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await LockContextAsync(clientId, projectId, db, ct);
            var row = new OrganizationRelationship { ClientId = clientId, ProjectId = projectId };
            await ApplyRelationshipAsync(row, input, db, access, ct);
            db.OrganizationRelationships.Add(row);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Created($"/api/v1/clients/{clientId}/organization-relationships/{row.Id}", new { row.Id });
        });
        edges.MapPut("/{id:long}", async (long clientId, long? projectId, long id, RelationshipInput input,
            HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            await CheckContextAsync(clientId, projectId, true, db, access, ct);
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await LockContextAsync(clientId, projectId, db, ct);
            var row = await ContextEdges(db, clientId, projectId).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The relationship");
            await RequireParticipantAsync(row.ParentOrganizationId, db, access.Me, ct, includeArchived: true);
            await RequireParticipantAsync(row.ChildOrganizationId, db, access.Me, ct, includeArchived: true);
            db.ExpectVersion(ctx, row);
            await ApplyRelationshipAsync(row, input, db, access, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
        edges.MapDelete("/{id:long}", async (long clientId, long? projectId, long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            await CheckContextAsync(clientId, projectId, true, db, access, ct);
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            await LockContextAsync(clientId, projectId, db, ct);
            var row = await ContextEdges(db, clientId, projectId).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The relationship");
            await RequireParticipantAsync(row.ParentOrganizationId, db, access.Me, ct, includeArchived: true);
            await RequireParticipantAsync(row.ChildOrganizationId, db, access.Me, ct, includeArchived: true);
            db.ExpectVersion(ctx, row);
            db.OrganizationRelationships.Remove(row);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
    }

    private static IQueryable<OrganizationRelationship> ContextEdges(HubDbContext db, long clientId, long? projectId) =>
        db.OrganizationRelationships.Where(x => x.ClientId == clientId && x.ProjectId == projectId);

    private static async Task CheckContextAsync(long clientId, long? projectId, bool write, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        access.RequireBusiness();
        if (!await db.Clients.AnyAsync(x => x.Id == clientId, ct)) throw new NotFoundException("The client");
        if (projectId is { } p)
        {
            if (!await db.Projects.AnyAsync(x => x.Id == p && x.ClientId == clientId, ct)) throw new NotFoundException("The project");
        }
        else if (!access.Me.HasClient(clientId)) throw new NotFoundException("The client structure");
        if (write) access.RequireLeadFor(clientId);
    }

    private static void RequireCatalogWrite(UserContext me, string action)
    {
        me.RequirePermission(ResourcePermissions.Structure, action);
        if (!me.AllClients && !me.IsSystem) throw new ForbiddenException("Managing the shared organization catalog needs access to all clients.");
    }

    private static async Task<Organization> FindAsync(long id, HubDbContext db, CancellationToken ct, bool includeArchived = false)
    {
        var query = includeArchived ? db.Organizations.IgnoreQueryFilters([HubDbContext.ArchiveFilter]) : db.Organizations;
        return await query.Include(x => x.Client).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The organization");
    }

    private static async Task RequireParticipantAsync(long id, HubDbContext db, UserContext me, CancellationToken ct, bool includeArchived = false)
    {
        var row = await FindAsync(id, db, ct, includeArchived);
        if (row.ClientId is { } c && !me.HasClient(c)) throw new NotFoundException("The organization");
    }

    public static OrganizationDto Dto(Organization row, UserContext me) => new(row.Id, row.ClientId,
        row.ClientId != null ? row.Client!.Name : row.Name!, row.ClientId != null ? row.Client!.Code : row.Code,
        row.Description, row.OrganizationType, row.Email, row.Phone, row.Address, row.Status,
        Convert.ToBase64String(row.RowVersion), row.ClientId == null && (me.AllClients || me.IsSystem) && me.HasPermission(ResourcePermissions.Structure, ResourcePermissions.Maintain),
        row.Client?.ArchivedAt != null);
    private static RelationshipDto Dto(OrganizationRelationship row) => new(row.Id, row.ParentOrganizationId, row.ChildOrganizationId,
        row.RelationshipType, row.Description, row.StartDate, row.EndDate, row.SortOrder, row.IsActive, Convert.ToBase64String(row.RowVersion));

    public static async Task<Organization> NewOrganizationAsync(OrganizationInput input, HubDbContext db, CancellationToken ct)
    {
        var row = new Organization();
        await ApplyOrganizationAsync(row, input, db, ct);
        return row;
    }
    private static async Task ApplyOrganizationAsync(Organization row, OrganizationInput input, HubDbContext db, CancellationToken ct)
    {
        var check = new Check();
        check.Text("name", input.Name, 150, "the organization name", required: true);
        check.Text("code", input.Code, 50, "the code");
        check.Text("description", input.Description, 2000, "the description");
        check.Text("organizationType", input.OrganizationType, 100, "the organization type");
        check.Text("email", input.Email, 254, "the email");
        check.Text("phone", input.Phone, 100, "the phone");
        check.Text("address", input.Address, 1000, "the address");
        check.Text("status", input.Status, 100, "the status");
        check.ThrowIfAny();
        var code = Text.Clean(input.Code);
        if (code != null && await db.Organizations.IgnoreQueryFilters().AnyAsync(x => x.Id != row.Id && x.Code == code, ct))
            throw new ConflictException("This organization code is already in use.");
        row.Name = input.Name!.Trim();
        row.Code = code;
        row.Description = Text.Clean(input.Description);
        row.OrganizationType = Text.Clean(input.OrganizationType);
        row.Email = Text.Clean(input.Email);
        row.Phone = Text.Clean(input.Phone);
        row.Address = Text.Clean(input.Address);
        row.Status = Text.Clean(input.Status);
    }

    public static async Task LockContextAsync(long clientId, long? projectId, HubDbContext db, CancellationToken ct)
    {
        var resource = $"TioHub:OrganizationGraph:{clientId}:{projectId ?? 0}";
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock @Resource={resource}, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000;
            IF @result < 0 THROW 51000, 'The organization structure is busy. Retry the operation.', 1;
            """, ct);
    }

    /// <summary>Deleting a client must preserve its reusable business identity and edges in other contexts.</summary>
    public static async Task PreserveClientIdentityAsync(long clientId, HubDbContext db, CancellationToken ct)
    {
        var row = await db.Organizations.IgnoreQueryFilters().Include(x => x.Client).SingleOrDefaultAsync(x => x.ClientId == clientId, ct);
        if (row == null) return;
        row.Name = row.Client!.Name;
        var alias = row.Client.Code;
        row.Code = await db.Organizations.IgnoreQueryFilters().AnyAsync(x => x.Id != row.Id && x.Code == alias, ct) ? null : alias;
        row.ClientId = null;
        row.Client = null;
        await db.SaveChangesAsync(ct);
    }

    private static async Task ApplyRelationshipAsync(OrganizationRelationship row, RelationshipInput input, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        var check = new Check();
        check.Required("parentOrganizationId", input.ParentOrganizationId, "the parent organization");
        check.Required("childOrganizationId", input.ChildOrganizationId, "the child organization");
        check.When(input.ParentOrganizationId != null && input.ParentOrganizationId == input.ChildOrganizationId, "childOrganizationId", "An organization cannot be its own parent.");
        check.Text("description", input.Description, 2000, "the description");
        check.When(input.StartDate != null && input.EndDate != null && input.EndDate < input.StartDate, "endDate", "The end date cannot be before the start date.");
        var type = await new LookupService(db).CheckAsync(check, "relationshipType", LookupLists.OrganizationRelationshipType,
            input.RelationshipType, "the relationship type", row.RelationshipType, ct);
        check.ThrowIfAny();
        var parent = input.ParentOrganizationId!.Value;
        var child = input.ChildOrganizationId!.Value;
        await RequireParticipantAsync(parent, db, access.Me, ct, includeArchived: row.Id != 0 && parent == row.ParentOrganizationId);
        await RequireParticipantAsync(child, db, access.Me, ct, includeArchived: row.Id != 0 && child == row.ChildOrganizationId);
        // Read the FULL effective context, including hidden/inactive edges, while holding its transaction-owned lock.
        var edges = await db.OrganizationRelationships.IgnoreQueryFilters()
            .Where(x => x.ClientId == row.ClientId && x.ProjectId == row.ProjectId && x.Id != row.Id)
            .Select(x => new GraphEdge(x.ParentOrganizationId, x.ChildOrganizationId)).ToListAsync(ct);
        if (edges.Any(x => x.Parent == parent && x.Child == child))
            throw new ConflictException("These organizations are already linked in this context.");
        if (WouldCycle(edges, parent, child))
            throw new ValidationException("parentOrganizationId", "This relationship would create a circular hierarchy in this context.");
        row.ParentOrganizationId = parent;
        row.ChildOrganizationId = child;
        row.RelationshipType = type;
        row.Description = Text.Clean(input.Description);
        row.StartDate = input.StartDate;
        row.EndDate = input.EndDate;
        row.SortOrder = input.SortOrder ?? 0;
        row.IsActive = input.IsActive ?? true;
    }

    public sealed record GraphEdge(long Parent, long Child);
    public static bool WouldCycle(IEnumerable<GraphEdge> edges, long parent, long child)
    {
        if (parent == child) return true;
        var next = edges.ToLookup(e => e.Parent, e => e.Child);
        var seen = new HashSet<long>();
        var pending = new Stack<long>();
        pending.Push(child);
        while (pending.TryPop(out var node))
        {
            if (node == parent) return true;
            if (!seen.Add(node)) continue;
            foreach (var n in next[node]) pending.Push(n);
        }
        return false;
    }

    public static async Task AddInitialAsync(Client client, List<InitialRelationshipInput>? input, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        if (input is not { Count: > 0 }) return;
        access.Me.RequirePermission(ResourcePermissions.Structure, ResourcePermissions.Coordinate);
        if (input.Count > 200) throw new ValidationException("organizationRelationships", "Add at most 200 relationships at initial creation; add more on the client page.");
        await LockContextAsync(client.Id, null, db, ct);
        var rootId = await db.Organizations.Where(x => x.ClientId == client.Id).Select(x => x.Id).SingleAsync(ct);
        foreach (var item in input)
        {
            if ((item.ChildOrganizationId is null) == (item.NewOrganization is null))
                throw new ValidationException("organizationRelationships", "Choose one existing organization or enter a new organization.");
            var child = item.ChildOrganizationId;
            if (item.NewOrganization != null)
            {
                RequireCatalogWrite(access.Me, ResourcePermissions.Create);
                var organization = await NewOrganizationAsync(item.NewOrganization, db, ct);
                db.Organizations.Add(organization);
                await db.SaveChangesAsync(ct);
                child = organization.Id;
            }
            var row = new OrganizationRelationship { ClientId = client.Id };
            await ApplyRelationshipAsync(row, new(rootId, child, item.RelationshipType, item.Description), db, access, ct);
            db.OrganizationRelationships.Add(row);
            await db.SaveChangesAsync(ct);
        }
    }

    private static async Task<IResult> GraphAsync(long clientId, long? projectId, long? rootId, int? maxDepth, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        await CheckContextAsync(clientId, projectId, false, db, access, ct);
        if (maxDepth < 0) throw new ValidationException("maxDepth", "Depth must be zero or a positive integer.");
        var root = rootId != null ? await FindAsync(rootId.Value, db, ct) :
            await db.Organizations.Include(x => x.Client).SingleAsync(x => x.ClientId == clientId, ct);
        var visible = db.Organizations.IgnoreQueryFilters([HubDbContext.ArchiveFilter]).Select(x => x.Id);
        var baseQuery = ContextEdges(db, clientId, projectId).AsNoTracking()
            .Where(x => visible.Contains(x.ParentOrganizationId) && visible.Contains(x.ChildOrganizationId));
        const int edgeLimit = 2000, nodeLimit = 1000;
        var rows = new List<OrganizationRelationship>();
        var ids = new HashSet<long> { root.Id };
        var truncated = false;
        if (rootId == null && maxDepth == null)
        {
            var candidates = await baseQuery.OrderBy(x => x.SortOrder).ThenBy(x => x.Id).Take(edgeLimit + 1).ToListAsync(ct);
            foreach (var row in candidates)
            {
                var extra = (ids.Contains(row.ParentOrganizationId) ? 0 : 1) + (ids.Contains(row.ChildOrganizationId) ? 0 : 1);
                if (rows.Count == edgeLimit || ids.Count + extra > nodeLimit) { truncated = true; break; }
                rows.Add(row); ids.Add(row.ParentOrganizationId); ids.Add(row.ChildOrganizationId);
            }
        }
        else
        {
            var frontier = new HashSet<long> { root.Id };
            var depth = 0;
            while (frontier.Count > 0 && (maxDepth == null || depth < maxDepth))
            {
                var candidates = await baseQuery.Where(x => frontier.Contains(x.ParentOrganizationId)).OrderBy(x => x.SortOrder).ThenBy(x => x.Id)
                    .Take(edgeLimit - rows.Count + 1).ToListAsync(ct);
                var next = new HashSet<long>();
                foreach (var row in candidates)
                {
                    if (rows.Count == edgeLimit || (!ids.Contains(row.ChildOrganizationId) && ids.Count == nodeLimit)) { truncated = true; break; }
                    rows.Add(row);
                    if (ids.Add(row.ChildOrganizationId)) next.Add(row.ChildOrganizationId);
                }
                if (truncated) break;
                frontier = next; depth++;
            }
            if (!truncated && frontier.Count > 0)
                truncated = await baseQuery.AnyAsync(x => frontier.Contains(x.ParentOrganizationId), ct);
        }
        var nodes = await db.Organizations.IgnoreQueryFilters([HubDbContext.ArchiveFilter]).AsNoTracking().Include(x => x.Client).Where(x => ids.Contains(x.Id)).ToListAsync(ct);
        return Results.Ok(new
        {
            rootOrganizationId = root.Id, organizations = nodes.Select(x => Dto(x, access.Me)), relationships = rows.Select(Dto), truncated,
            canEdit = access.Me.HasClient(clientId) && access.Me.HasPermission(ResourcePermissions.Structure, ResourcePermissions.Coordinate),
            canCreateOrganization = access.Me.AllClients && access.Me.HasPermission(ResourcePermissions.Structure, ResourcePermissions.Create)
        });
    }

    private static async Task<IResult> NeighborsAsync(long id, long clientId, long? projectId, bool parents, int? page, int? pageSize,
        HubDbContext db, HubAccess access, CancellationToken ct)
    {
        await CheckContextAsync(clientId, projectId, false, db, access, ct);
        await FindAsync(id, db, ct, includeArchived: true);
        var visible = db.Organizations.IgnoreQueryFilters([HubDbContext.ArchiveFilter]).Select(x => x.Id);
        var query = ContextEdges(db, clientId, projectId).AsNoTracking()
            .Where(x => (parents ? x.ChildOrganizationId == id : x.ParentOrganizationId == id) &&
                visible.Contains(x.ParentOrganizationId) && visible.Contains(x.ChildOrganizationId));
        var size = Math.Clamp(pageSize ?? 50, 1, 200);
        var number = Math.Clamp(page ?? 1, 1, 1000000);
        var count = await query.CountAsync(ct);
        var rows = await query.OrderBy(x => x.SortOrder).ThenBy(x => x.Id).Skip((number - 1) * size).Take(size).ToListAsync(ct);
        var nodeIds = rows.SelectMany(x => new[] { x.ParentOrganizationId, x.ChildOrganizationId }).Distinct().ToList();
        var nodes = await db.Organizations.IgnoreQueryFilters([HubDbContext.ArchiveFilter]).Include(x => x.Client).Where(x => nodeIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, ct);
        return Results.Ok(new { items = rows.Select(x => new { relationship = Dto(x), parent = Dto(nodes[x.ParentOrganizationId], access.Me), child = Dto(nodes[x.ChildOrganizationId], access.Me) }), totalCount = count, page = number, pageSize = size });
    }
}
