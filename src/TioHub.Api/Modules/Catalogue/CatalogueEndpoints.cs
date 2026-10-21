using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Catalogue;

public static class CatalogueEndpoints
{
    public sealed record DeveloperInput(string? Name, string? Role, string? Email);
    public sealed record ProductInput(string? Code, string? Name, string? Aliases, string? Description, string? Category, string? Technology,
        long? OwningTeamId, string? ProductOwner, bool IsActive = true, List<DeveloperInput>? Developers = null);
    public sealed record MicroserviceVersionInput(string? Version, DateOnly? ReleasedOn, string? ReleaseNotes, bool IsActive = true);
    public sealed record ModuleInput(string? Code, string? Name, string? Description, bool IsActive = true);
    public sealed record FeatureInput(string? Name, string? Description, long? ModuleId, bool IsActive = true);
    public sealed record MicroserviceInput(string? Name, string? Description, long? ModuleId, string? Role, bool IsActive = true);
    public sealed record DeploymentInput(long[]? MicroserviceIds);
    public sealed record VersionInput(string? Version, DateOnly? ReleasedOn, bool IsActive = true);
    public sealed record InstallationInput(long? EnvironmentId, long? ProductId, long? ModuleId, string? InstanceName, long? ProductVersionId, string? VersionEvidence,
        DateOnly? DeployedOn, string? SupportNotes, long? OwnerUserId);
    public sealed record VersionChangeInput(long? ProductVersionId, string? Reason, string? Evidence, DateOnly? DeployedOn);

    public static void MapCatalogueEndpoints(this RouteGroupBuilder api)
    {
        // ---- products (= applications): every user reads; Operation Engineers and the TIO Manager maintain; retiring keeps history ----
        var pg = api.MapGroup("/products").WithTags("Products");
        pg.MapGet("", async (string? q, bool? includeRetired, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var query = db.Products.AsNoTracking().AsQueryable();
            if (includeRetired != true) query = query.Where(p => p.IsActive);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(p => p.Code.Contains(q) || p.Name.Contains(q) || (p.Aliases != null && p.Aliases.Contains(q)) || (p.Category != null && p.Category.Contains(q)));
            // Usage counts come from scope-filtered installations, so they never reveal records the user cannot see.
            return Results.Ok(await query.OrderBy(p => p.Code).Select(p => new
            {
                p.Id, p.Code, p.Name, p.Aliases, p.Description, p.Category, p.Technology, p.IsActive, version = Convert.ToBase64String(p.RowVersion),
                owningTeam = p.OwningTeam == null ? null : new { p.OwningTeam.Id, p.OwningTeam.Code, p.OwningTeam.Name },
                p.ProductOwner,
                modules = p.Modules.OrderBy(m => m.Code).Select(m => new { m.Id, m.Code, m.Name, m.Description, m.IsActive, version = Convert.ToBase64String(m.RowVersion) }),
                versions = p.Versions.OrderByDescending(v => v.SortKey).Select(v => new { v.Id, v.Version, v.ReleasedOn, v.IsActive, rowVersion = Convert.ToBase64String(v.RowVersion) }),
                developers = p.Developers.OrderBy(d => d.SortOrder).Select(d => new { d.Name, d.Role }),
                featureCount = p.Features.Count(f => f.IsActive),
                microserviceCount = p.Microservices.Count(m => m.IsActive),
                latestVersion = p.Versions.Where(v => v.IsActive).OrderByDescending(v => v.SortKey).Select(v => v.Version).FirstOrDefault(),
                environments = db.Installations.Where(i => i.ProductId == p.Id).Select(i => i.EnvironmentId).Distinct().Count(),
                clients = db.Installations.Where(i => i.ProductId == p.Id).Select(i => i.ClientId).Distinct().Count()
            }).ToListAsync(ct));
        });
        pg.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var p = await db.Products.AsNoTracking().Include(x => x.OwningTeam).Include(x => x.Modules).Include(x => x.Versions)
                .Include(x => x.Features).ThenInclude(f => f.Module).Include(x => x.Microservices).ThenInclude(m => m.Module)
                .Include(x => x.Microservices).ThenInclude(m => m.Versions).Include(x => x.Developers)
                .AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The product");
            // Deployments of each microservice in installations the user can see (scope-filtered components).
            var deployed = await db.Components.AsNoTracking().Where(c => c.MicroserviceId != null && c.Microservice!.ProductId == id)
                .Select(c => new { c.MicroserviceId, c.ClientId, servers = c.Hosts.Count }).ToListAsync(ct);
            var installs = await db.Installations.AsNoTracking().Where(i => i.ProductId == id)
                .Select(i => new
                {
                    i.Id, i.InstanceName, i.ClientId, clientCode = i.Environment!.Client!.Code, clientName = i.Environment.Client.Name, i.EnvironmentId,
                    environment = i.Environment.Name, region = i.Environment.Region == null ? null : i.Environment.Region.Code,
                    module = i.Module == null ? null : i.Module.Code, version = i.ProductVersion == null ? null : i.ProductVersion.Version
                }).ToListAsync(ct);
            var projects = await db.ProjectProducts.AsNoTracking().Where(pp => pp.ProductId == id)
                .Join(db.Projects, pp => pp.ProjectId, pr => pr.Id, (pp, pr) => new { pr.Id, pr.Code, pr.Name, pr.Status, pr.ClientId, clientCode = pr.Client!.Code }).ToListAsync(ct);
            // Contracts cover the products of their project (A27).
            var contracts = await db.Contracts.AsNoTracking().Where(c => db.ProjectProducts.Any(pp => pp.ProjectId == c.ProjectId && pp.ProductId == id))
                .Select(c => new { c.Id, c.Ref, c.Title, c.Status, c.ClientId, clientCode = c.Client!.Code }).ToListAsync(ct);
            return ctx.WithETag(p, new
            {
                p.Id, p.Code, p.Name, p.Aliases, p.Description, p.Category, p.Technology, p.IsActive,
                owningTeam = p.OwningTeam == null ? null : new { p.OwningTeam.Id, p.OwningTeam.Code, p.OwningTeam.Name },
                p.ProductOwner,
                developers = p.Developers.OrderBy(d => d.SortOrder).Select(d => new { d.Name, d.Role, d.Email }),
                modules = p.Modules.OrderBy(m => m.Code).Select(m => new
                {
                    m.Id, m.Code, m.Name, m.Description, m.IsActive, version = Convert.ToBase64String(m.RowVersion),
                    features = p.Features.Count(f => f.ModuleId == m.Id && f.IsActive), installations = installs.Count(i => i.module == m.Code)
                }),
                features = p.Features.OrderBy(f => f.Module == null ? "" : f.Module.Code).ThenBy(f => f.Name)
                    .Select(f => new { f.Id, f.Name, f.Description, f.ModuleId, module = f.Module == null ? null : f.Module.Code, f.IsActive, version = Convert.ToBase64String(f.RowVersion) }),
                microservices = p.Microservices.OrderBy(m => m.Module == null ? "" : m.Module.Code).ThenBy(m => m.Name).Select(m => new
                {
                    m.Id, m.Name, m.Description, m.ModuleId, module = m.Module == null ? null : m.Module.Code, m.Role, m.IsActive, version = Convert.ToBase64String(m.RowVersion),
                    latestVersion = m.Versions.Where(v => v.IsActive).OrderByDescending(v => v.SortKey).Select(v => v.Version).FirstOrDefault(), versionCount = m.Versions.Count,
                    installations = deployed.Count(d => d.MicroserviceId == m.Id), clients = deployed.Where(d => d.MicroserviceId == m.Id).Select(d => d.ClientId).Distinct().Count(),
                    servers = deployed.Where(d => d.MicroserviceId == m.Id).Sum(d => d.servers)
                }),
                versions = p.Versions.OrderByDescending(v => v.SortKey).Select(v => new
                {
                    v.Id, v.Version, v.ReleasedOn, v.IsActive, rowVersion = Convert.ToBase64String(v.RowVersion), installations = installs.Count(i => i.version == v.Version)
                }),
                usage = installs.GroupBy(i => new { i.ClientId, i.clientCode, i.clientName }).OrderBy(g => g.Key.clientCode).Select(g => new
                {
                    clientId = g.Key.ClientId, g.Key.clientCode, g.Key.clientName,
                    installations = g.OrderBy(i => i.region).ThenBy(i => i.environment).Select(i => new { i.Id, i.InstanceName, i.EnvironmentId, i.environment, i.region, i.module, i.version })
                }),
                projects, contracts,
                usageNote = "Only clients, projects and contracts you can access are listed.",
                p.CreatedAt, p.UpdatedAt,
                permissions = new { canEdit = access.Me.Can(Role.Engineer), canDelete = access.Me.HasRight(Right.Delete) }
            });
        });
        // Owner request (20 Oct 2026): the TIO Manager can delete a product that is not in use. A product that is installed somewhere or
        // supported by a project is refused (retire it instead), so no client record loses its product.
        pg.MapDelete("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, UserContext me, Attachments.AttachmentStore files, CancellationToken ct) =>
        {
            me.RequireRight(Right.Delete);
            var p = await db.Products.Include(x => x.Modules).Include(x => x.Versions).Include(x => x.Features).Include(x => x.Developers)
                .Include(x => x.Microservices).ThenInclude(m => m.Versions).AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The product");
            if (ctx.Request.Headers.IfMatch.Count > 0) db.ExpectVersion(ctx, p); // table deletes send no version
            var installs = await db.Installations.IgnoreQueryFilters().CountAsync(i => i.ProductId == id, ct);
            var projects = await db.ProjectProducts.CountAsync(pp => pp.ProductId == id, ct);
            if (installs + projects > 0)
                throw new ConflictException("This product is in use and cannot be deleted.", new()
                {
                    ["product"] = [$"{p.Code} is used by {installs} installation(s) and {projects} project(s), including archived ones. Remove it from them, or mark the product Retired instead."]
                });
            db.AuditReason = $"Product {p.Code} deleted";
            db.MicroserviceVersions.RemoveRange(p.Microservices.SelectMany(m => m.Versions));
            db.ProductFeatures.RemoveRange(p.Features);
            db.ProductMicroservices.RemoveRange(p.Microservices);
            db.ProductModules.RemoveRange(p.Modules);
            db.ProductVersions.RemoveRange(p.Versions);
            // A46: the product's attached files go with it.
            var attached = await db.Attachments.Where(a => a.RecordType == "Product" && a.RecordId == id).ToListAsync(ct);
            db.Attachments.RemoveRange(attached);
            db.Products.Remove(p);
            await db.SaveChangesAsync(ct);
            files.Delete(attached.Select(a => a.StoredPath));
            return Results.NoContent();
        });
        pg.MapPost("", async (ProductInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var p = new Product();
            await ApplyProductAsync(p, input, db, ct);
            db.Products.Add(p);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/products/{p.Id}", new { p.Id });
        });
        pg.MapPut("/{id:long}", async (long id, ProductInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var p = await db.Products.Include(x => x.Developers).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The product");
            db.ExpectVersion(ctx, p);
            if (!string.Equals((input.Code ?? "").Trim(), p.Code, StringComparison.OrdinalIgnoreCase))
                throw new ValidationException("code", "Product codes keep their historical meaning and cannot be renamed. Retire it and add a new product.");
            await ApplyProductAsync(p, input, db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        pg.MapPost("/{id:long}/modules", async (long id, ModuleInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            if (!await db.Products.AnyAsync(p => p.Id == id, ct)) throw new NotFoundException("The product");
            new Check().Text("code", input.Code, 50, "the module code", true).Text("name", input.Name, 150, "the module name", true)
                .Text("description", input.Description, 2000, "Description").ThrowIfAny();
            var code = input.Code!.Trim().ToUpperInvariant();
            if (await db.ProductModules.AnyAsync(m => m.ProductId == id && m.Code == code, ct))
                throw new ConflictException("This module code already exists for the product.", new() { ["code"] = ["Module codes are unique within the product."] });
            var m = new ProductModule { ProductId = id, Code = code, Name = input.Name!.Trim(), Description = Text.Clean(input.Description), IsActive = input.IsActive };
            db.ProductModules.Add(m);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/products/{id}/modules/{m.Id}", new { m.Id });
        });
        pg.MapPut("/modules/{moduleId:long}", async (long moduleId, ModuleInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var m = await db.ProductModules.FirstOrDefaultAsync(x => x.Id == moduleId, ct) ?? throw new NotFoundException("The module");
            db.ExpectVersion(ctx, m);
            if (!string.Equals((input.Code ?? "").Trim(), m.Code, StringComparison.OrdinalIgnoreCase))
                throw new ValidationException("code", "Module codes cannot be renamed once recorded; retire it and add a new module.");
            new Check().Text("name", input.Name, 150, "the module name", true).Text("description", input.Description, 2000, "Description").ThrowIfAny();
            m.Name = input.Name!.Trim();
            m.Description = Text.Clean(input.Description);
            m.IsActive = input.IsActive;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        pg.MapPost("/{id:long}/features", async (long id, FeatureInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            if (!await db.Products.AnyAsync(p => p.Id == id, ct)) throw new NotFoundException("The product");
            var f = new ProductFeature { ProductId = id };
            await ApplyFeatureAsync(f, input, db, ct);
            db.ProductFeatures.Add(f);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/products/{id}/features/{f.Id}", new { f.Id });
        });
        pg.MapPut("/features/{featureId:long}", async (long featureId, FeatureInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var f = await db.ProductFeatures.FirstOrDefaultAsync(x => x.Id == featureId, ct) ?? throw new NotFoundException("The feature");
            db.ExpectVersion(ctx, f);
            await ApplyFeatureAsync(f, input, db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        pg.MapPost("/{id:long}/microservices", async (long id, MicroserviceInput input, HubDbContext db, UserContext me, LookupService lookups, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            if (!await db.Products.AnyAsync(p => p.Id == id, ct)) throw new NotFoundException("The product");
            var m = new ProductMicroservice { ProductId = id };
            await ApplyMicroserviceAsync(m, input, db, lookups, ct);
            db.ProductMicroservices.Add(m);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/products/{id}/microservices/{m.Id}", new { m.Id });
        });
        pg.MapPut("/microservices/{microserviceId:long}", async (long microserviceId, MicroserviceInput input, HttpContext ctx, HubDbContext db, UserContext me, LookupService lookups, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var m = await db.ProductMicroservices.FirstOrDefaultAsync(x => x.Id == microserviceId, ct) ?? throw new NotFoundException("The microservice");
            db.ExpectVersion(ctx, m);
            await ApplyMicroserviceAsync(m, input, db, lookups, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        pg.MapGet("/microservices/{microserviceId:long}", async (long microserviceId, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var m = await db.ProductMicroservices.AsNoTracking().Include(x => x.Module).Include(x => x.Versions).FirstOrDefaultAsync(x => x.Id == microserviceId, ct)
                ?? throw new NotFoundException("The microservice");
            var product = await db.Products.AsNoTracking().Where(x => x.Id == m.ProductId).Select(x => new { x.Id, x.Code, x.Name }).FirstAsync(ct);
            // Where it runs, in installations the user can see.
            var deployments = await db.Components.AsNoTracking().Where(c => c.MicroserviceId == microserviceId)
                .Select(c => new
                {
                    componentId = c.Id, c.InstallationId, installation = c.Installation!.InstanceName, c.ClientId, clientCode = c.Installation.Environment!.Client!.Code,
                    c.EnvironmentId, environment = c.Installation.Environment.Name, region = c.Installation.Environment.Region == null ? null : c.Installation.Environment.Region.Code,
                    c.ComponentVersion, servers = c.Hosts.Select(h => new { h.AssetId, h.Asset!.Name, version = h.MicroserviceVersion == null ? null : h.MicroserviceVersion.Version })
                }).ToListAsync(ct);
            return ctx.WithETag(m, new
            {
                m.Id, m.Name, m.Description, m.ModuleId, module = m.Module == null ? null : new { m.Module.Id, m.Module.Code, m.Module.Name }, m.Role, m.IsActive, product,
                versions = m.Versions.OrderByDescending(v => v.SortKey).Select(v => new { v.Id, v.Version, v.ReleasedOn, v.ReleaseNotes, v.IsActive, rowVersion = Convert.ToBase64String(v.RowVersion) }),
                deployments, permissions = new { canEdit = access.Me.Can(Role.Engineer) }
            });
        });
        pg.MapPost("/microservices/{microserviceId:long}/versions", async (long microserviceId, MicroserviceVersionInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            if (!await db.ProductMicroservices.AnyAsync(x => x.Id == microserviceId, ct)) throw new NotFoundException("The microservice");
            new Check().Text("version", input.Version, 50, "the version number", true).Text("releaseNotes", input.ReleaseNotes, 8000, "Release notes").ThrowIfAny();
            var v = input.Version!.Trim();
            if (await db.MicroserviceVersions.AnyAsync(x => x.MicroserviceId == microserviceId && x.Version == v, ct))
                throw new ConflictException("This version already exists for the microservice.", new() { ["version"] = ["Version numbers are unique per microservice."] });
            var mv = new MicroserviceVersion { MicroserviceId = microserviceId, Version = v, SortKey = Text.VersionKey(v), ReleasedOn = input.ReleasedOn, ReleaseNotes = Text.Clean(input.ReleaseNotes), IsActive = input.IsActive };
            db.MicroserviceVersions.Add(mv);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/products/microservices/{microserviceId}/versions/{mv.Id}", new { mv.Id });
        });
        pg.MapPut("/microservice-versions/{versionId:long}", async (long versionId, MicroserviceVersionInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var mv = await db.MicroserviceVersions.FirstOrDefaultAsync(x => x.Id == versionId, ct) ?? throw new NotFoundException("The version");
            db.ExpectVersion(ctx, mv);
            if ((input.Version ?? "").Trim() != mv.Version) throw new ValidationException("version", "A version number cannot be renamed once recorded; retire it and add the correct one.");
            new Check().Text("releaseNotes", input.ReleaseNotes, 8000, "Release notes").ThrowIfAny();
            mv.ReleasedOn = input.ReleasedOn;
            mv.ReleaseNotes = Text.Clean(input.ReleaseNotes);
            mv.IsActive = input.IsActive;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        pg.MapPost("/{id:long}/versions", async (long id, VersionInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            if (!await db.Products.AnyAsync(p => p.Id == id, ct)) throw new NotFoundException("The product");
            new Check().Text("version", input.Version, 50, "the version", true).ThrowIfAny();
            var v = input.Version!.Trim();
            if (await db.ProductVersions.AnyAsync(x => x.ProductId == id && x.Version == v, ct)) throw new ConflictException("This version already exists for the product.");
            var pv = new ProductVersion { ProductId = id, Version = v, SortKey = Text.VersionKey(v), ReleasedOn = input.ReleasedOn, IsActive = input.IsActive };
            db.ProductVersions.Add(pv);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/products/{id}/versions/{pv.Id}", new { pv.Id });
        });
        pg.MapPut("/versions/{versionId:long}", async (long versionId, VersionInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.Require(Role.Engineer);
            var pv = await db.ProductVersions.FirstOrDefaultAsync(x => x.Id == versionId, ct) ?? throw new NotFoundException("The version");
            db.ExpectVersion(ctx, pv);
            if ((input.Version ?? "").Trim() != pv.Version) throw new ValidationException("version", "A version label cannot be renamed once recorded; retire it instead.");
            pv.ReleasedOn = input.ReleasedOn;
            pv.IsActive = input.IsActive;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- installations (ENV-02, REG-04) ----
        var ig = api.MapGroup("/installations").WithTags("Installations");
        ig.MapGet("", async (long? clientId, long? regionId, long? environmentId, long? productId, long? versionId, bool? unknownVersion, string? q, int? page, int? pageSize,
            HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var query = Filter(db.Installations.AsNoTracking(), clientId, regionId, environmentId, productId, versionId, unknownVersion, q);
            return Results.Ok(await query.OrderBy(i => i.Environment!.Client!.Name).ThenBy(i => i.Environment!.Name).ThenBy(i => i.Product!.Code).ThenBy(i => i.InstanceName)
                .Select(i => new
                {
                    i.Id, i.InstanceName, i.EnvironmentId, environmentName = i.Environment!.Name, environmentType = i.Environment.Type,
                    i.ClientId, clientCode = i.Environment.Client!.Code, regionCode = i.Environment.Region == null ? null : i.Environment.Region.Code,
                    i.ProductId, productCode = i.Product!.Code, moduleCode = i.Module == null ? null : i.Module.Code,
                    version = i.ProductVersion == null ? null : i.ProductVersion.Version, i.DeployedOn, i.LastReviewedAt,
                    componentCount = db.Components.Count(c => c.InstallationId == i.Id)
                }).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        ig.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var i = await db.Installations.AsNoTracking().Include(x => x.Environment).ThenInclude(e => e!.Client).Include(x => x.Environment).ThenInclude(e => e!.Region)
                .Include(x => x.Product).Include(x => x.Module).Include(x => x.ProductVersion).Include(x => x.Owner)
                .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The installation");
            var components = await db.Components.AsNoTracking().Where(c => c.InstallationId == id).OrderBy(c => c.Role).ThenBy(c => c.Name)
                .Select(c => new
                {
                    c.Id, c.Name, c.Role, c.ComponentVersion,
                    owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive),
                    hosts = c.Hosts.Select(h => new { h.AssetId, h.Asset!.Name, h.Asset.Type, h.Asset.Lifecycle })
                }).ToListAsync(ct);
            var history = await db.InstallationVersionChanges.AsNoTracking().Where(v => v.InstallationId == id).OrderByDescending(v => v.ChangedAt)
                .Select(v => new { v.Id, from = v.FromVersion == null ? null : v.FromVersion.Version, to = v.ToVersion == null ? null : v.ToVersion.Version, v.Reason, v.Evidence, v.DeployedOn, v.ChangedAt, changedBy = v.ChangedBy == null ? null : v.ChangedBy.DisplayName })
                .ToListAsync(ct);
            return ctx.WithETag(i, new
            {
                i.Id, i.InstanceName, i.DeployedOn, i.SupportNotes, i.LastReviewedAt,
                environment = new { i.Environment!.Id, i.Environment.Name, i.Environment.Type, clientId = i.Environment.ClientId, clientCode = i.Environment.Client!.Code, clientName = i.Environment.Client.Name, region = i.Environment.Region == null ? null : new { i.Environment.Region.Id, i.Environment.Region.Code } },
                product = new { i.Product!.Id, i.Product.Code, i.Product.Name },
                module = i.Module == null ? null : new { i.Module.Id, i.Module.Code, i.Module.Name },
                version = i.ProductVersion == null ? null : new { i.ProductVersion.Id, i.ProductVersion.Version },
                owner = i.Owner == null ? null : new UserRef(i.Owner.Id, i.Owner.DisplayName, i.Owner.IsActive),
                components, versionHistory = history, i.CreatedAt, i.UpdatedAt
            });
        });

        // Which product microservice runs on which server of the installation's environment.
        ig.MapGet("/{id:long}/deployment", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var i = await db.Installations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The installation");
            var microservices = await db.ProductMicroservices.AsNoTracking().Where(m => m.ProductId == i.ProductId)
                .OrderBy(m => m.Module == null ? "" : m.Module.Code).ThenBy(m => m.Name)
                .Select(m => new { m.Id, m.Name, m.Description, module = m.Module == null ? null : m.Module.Code, m.ModuleId, m.Role, m.IsActive }).ToListAsync(ct);
            var components = await db.Components.AsNoTracking().Where(c => c.InstallationId == id)
                .Select(c => new
                {
                    c.Id, c.Name, c.MicroserviceId, c.Role, hostIds = c.Hosts.Select(h => h.AssetId).ToList(),
                    hostVersions = c.Hosts.Select(h => new { h.AssetId, version = h.MicroserviceVersion == null ? null : h.MicroserviceVersion.Version }).ToList()
                }).ToListAsync(ct);
            var servers = await db.Assets.AsNoTracking().Where(a => a.EnvironmentId == i.EnvironmentId && a.TypeCategory != AssetType.LogicalEndpoint)
                .OrderBy(a => a.Name).Select(a => new { a.Id, a.Name, a.Type, a.Role, a.Lifecycle }).ToListAsync(ct);
            return Results.Ok(new
            {
                installationId = id, productId = i.ProductId, moduleId = i.ModuleId,
                microservices = microservices.Select(m => new
                {
                    m.Id, m.Name, m.Description, m.module, m.ModuleId, m.Role, m.IsActive,
                    componentId = components.FirstOrDefault(c => c.MicroserviceId == m.Id)?.Id,
                    serverIds = components.Where(c => c.MicroserviceId == m.Id).SelectMany(c => c.hostIds).Distinct()
                }),
                servers = servers.Select(a => new
                {
                    a.Id, a.Name, a.Type, a.Role, a.Lifecycle,
                    microserviceIds = components.Where(c => c.MicroserviceId != null && c.hostIds.Contains(a.Id)).Select(c => c.MicroserviceId),
                    versions = components.Where(c => c.MicroserviceId != null).SelectMany(c => c.hostVersions.Where(h => h.AssetId == a.Id && h.version != null)
                        .Select(h => new { microserviceId = c.MicroserviceId, h.version })),
                    otherComponents = components.Where(c => c.MicroserviceId == null && c.hostIds.Contains(a.Id)).Select(c => new { c.Id, c.Name, c.Role })
                }),
                notDeployed = microservices.Where(m => m.IsActive && !components.Any(c => c.MicroserviceId == m.Id && c.hostIds.Count > 0)).Select(m => m.Name)
            });
        });

        // Choose the microservices running on one server: selected ones get (or keep) this server as a host; unselected ones lose it.
        // A microservice is one component per installation, so running it on several servers adds hosts rather than duplicates.
        ig.MapPut("/{id:long}/deployment/{assetId:long}", async (long id, long assetId, DeploymentInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var inst = await db.Installations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The installation");
            access.RequireMaintain(inst.ClientId, null);
            var server = await db.Assets.FirstOrDefaultAsync(a => a.Id == assetId && a.EnvironmentId == inst.EnvironmentId, ct)
                ?? throw new ValidationException("assetId", "Select a server of this installation's environment.");
            await Deployment.ApplyAsync(db, inst, server, (input.MicroserviceIds ?? []).Distinct().ToList(), ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        ig.MapPost("", async (InstallationInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var env = await db.Environments.FirstOrDefaultAsync(e => e.Id == input.EnvironmentId, ct) ?? throw new ValidationException("environmentId", "Select an environment you can access.");
            access.RequireMaintain(env.ClientId, null, env.OwnerUserId, env.BackupOwnerUserId, env.CoordinatorUserId);
            var i = new Installation { EnvironmentId = env.Id, ClientId = env.ClientId };
            await ApplyAsync(i, input, db, access, isNew: true, ct);
            // Owner decision (20 Oct 2026): version evidence is optional everywhere; the history entry is recorded either way.
            new Check().Text("versionEvidence", input.VersionEvidence, 1000, "Version evidence").ThrowIfAny();
            var evidence = Text.Clean(input.VersionEvidence) ?? "";
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.Installations.Add(i);
            await db.SaveChangesAsync(ct);
            if (i.ProductVersionId is not null)
            {
                db.InstallationVersionChanges.Add(new InstallationVersionChange
                {
                    InstallationId = i.Id, ClientId = i.ClientId, ToVersionId = i.ProductVersionId, Reason = "Initial record", Evidence = evidence,
                    DeployedOn = i.DeployedOn, ChangedById = access.Me.UserId, ChangedAt = clock.GetUtcNow()
                });
                await db.SaveChangesAsync(ct);
            }
            await tx.CommitAsync(ct);
            return Results.Created($"/api/v1/installations/{i.Id}", new { i.Id });
        });

        ig.MapPut("/{id:long}", async (long id, InstallationInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var i = await db.Installations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The installation");
            var env = await db.Environments.FirstAsync(e => e.Id == i.EnvironmentId, ct);
            access.RequireMaintain(i.ClientId, null, i.OwnerUserId, env.OwnerUserId, env.BackupOwnerUserId);
            db.ExpectVersion(ctx, i);
            if (input.ProductVersionId != i.ProductVersionId)
                throw new ValidationException("productVersionId", "Change the version with Confirm version, which records the evidence and history.");
            await ApplyAsync(i, input, db, access, isNew: false, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Explicit authorized version confirmation with old/new value, reason and evidence (Section 6.3, AC-03).
        ig.MapPost("/{id:long}/version", async (long id, VersionChangeInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var i = await db.Installations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The installation");
            var env = await db.Environments.FirstAsync(e => e.Id == i.EnvironmentId, ct);
            access.RequireMaintain(i.ClientId, null, i.OwnerUserId, env.OwnerUserId, env.BackupOwnerUserId);
            db.ExpectVersion(ctx, i);
            var check = new Check();
            check.Text("reason", input.Reason, 1000, "the reason", true).Text("evidence", input.Evidence, 1000, "Evidence");
            if (input.ProductVersionId is not null && !await db.ProductVersions.AnyAsync(v => v.Id == input.ProductVersionId && v.ProductId == i.ProductId, ct))
                check.Add("productVersionId", "Select a version of this installation's product.");
            if (input.ProductVersionId == i.ProductVersionId) check.Add("productVersionId", "This is already the recorded version. Use Review to confirm it without a change.");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            db.InstallationVersionChanges.Add(new InstallationVersionChange
            {
                InstallationId = id, ClientId = i.ClientId, FromVersionId = i.ProductVersionId, ToVersionId = input.ProductVersionId,
                Reason = input.Reason!.Trim(), Evidence = Text.Clean(input.Evidence) ?? "", DeployedOn = input.DeployedOn, ChangedById = access.Me.UserId, ChangedAt = now
            });
            i.ProductVersionId = input.ProductVersionId;
            if (input.DeployedOn is not null) i.DeployedOn = input.DeployedOn;
            i.LastReviewedAt = now;
            db.AuditReason = input.Reason!.Trim();
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        ig.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var i = await db.Installations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The installation");
            access.RequireArchiveFor(i.ClientId);
            db.ExpectVersion(ctx, i);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(i, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- version matrix (ENV-06, DAS-08) ----
        api.MapGet("/version-matrix", async (long? clientId, long? regionId, long? productId, string? environmentType, string? country,
            HubDbContext db, HubAccess access, FreshnessService fresh, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var q = Filter(db.Installations.AsNoTracking(), clientId, regionId, null, productId, null, null, null);
            if (environmentType is not null) q = q.Where(i => i.Environment!.Type == environmentType);
            if (!string.IsNullOrWhiteSpace(country)) q = country == "Unknown" ? q.Where(i => i.Environment!.Client!.CountryUnknown) : q.Where(i => i.Environment!.Client!.Country == country);
            var rows = await q.Select(i => new
            {
                i.Id, i.InstanceName, i.EnvironmentId, environmentName = i.Environment!.Name, environmentType = i.Environment.Type,
                i.ClientId, clientCode = i.Environment.Client!.Code, clientName = i.Environment.Client.Name,
                regionId = i.Environment.RegionId, regionCode = i.Environment.Region == null ? null : i.Environment.Region.Code,
                i.ProductId, productCode = i.Product!.Code, moduleCode = i.Module == null ? null : i.Module.Code,
                versionId = i.ProductVersionId, version = i.ProductVersion == null ? null : i.ProductVersion.Version, sortKey = i.ProductVersion == null ? null : i.ProductVersion.SortKey,
                i.CreatedAt, i.LastReviewedAt
            }).ToListAsync(ct);
            var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Installation, ReviewScope.Record));
            var now = DateTimeOffset.UtcNow;
            var cells = rows.OrderBy(r => r.clientCode).ThenBy(r => r.regionCode).ThenBy(r => r.environmentName).ThenBy(r => r.productCode).ThenBy(r => r.InstanceName)
                .Select(r => new { r.Id, r.InstanceName, r.EnvironmentId, r.environmentName, r.environmentType, r.ClientId, r.clientCode, r.clientName, r.regionId, r.regionCode, r.ProductId, r.productCode, r.moduleCode, r.versionId, version = r.version ?? "Unknown", versionUnknown = r.version is null, r.LastReviewedAt, freshness = FreshnessService.Evaluate(policy, r.CreatedAt, r.LastReviewedAt, null, now) })
                .ToList();
            // DAS-08: distinct installations and environments per product/version; an environment with several installations counts once.
            var summary = rows.GroupBy(r => new { r.ProductId, r.productCode }).OrderBy(g => g.Key.productCode).Select(g => new
            {
                g.Key.ProductId, g.Key.productCode,
                installations = g.Count(),
                environments = g.Select(x => x.EnvironmentId).Distinct().Count(),
                unknownVersion = g.Count(x => x.versionId is null),
                notReviewed = g.Count(x => x.LastReviewedAt is null),
                versions = g.Where(x => x.versionId is not null).GroupBy(x => new { x.version, x.sortKey }).OrderByDescending(v => v.Key.sortKey)
                    .Select(v => new { v.Key.version, installations = v.Count(), environments = v.Select(x => x.EnvironmentId).Distinct().Count() })
            }).ToList();
            return Results.Ok(new { cells, summary, evaluatedAt = now });
        });
    }

    public static IQueryable<Installation> Filter(IQueryable<Installation> q, long? clientId, long? regionId, long? environmentId, long? productId, long? versionId, bool? unknownVersion, string? text)
    {
        if (clientId is not null) q = q.Where(i => i.ClientId == clientId);
        if (regionId is not null) q = q.Where(i => i.Environment!.RegionId == regionId);
        if (environmentId is not null) q = q.Where(i => i.EnvironmentId == environmentId);
        if (productId is not null) q = q.Where(i => i.ProductId == productId);
        if (versionId is not null) q = q.Where(i => i.ProductVersionId == versionId);
        if (unknownVersion == true) q = q.Where(i => i.ProductVersionId == null);
        if (!string.IsNullOrWhiteSpace(text)) q = q.Where(i => i.InstanceName.Contains(text) || i.Product!.Code.Contains(text));
        return q;
    }

    private static async Task ApplyProductAsync(Product p, ProductInput i, HubDbContext db, CancellationToken ct)
    {
        var check = new Check().Text("code", i.Code, 50, "the product code", true).Text("name", i.Name, 150, "the product name", true)
            .Text("aliases", i.Aliases, 400, "Also known as").Text("description", i.Description, 4000, "Description")
            .Text("category", i.Category, 100, "Category").Text("technology", i.Technology, 1000, "Technology");
        if (i.OwningTeamId is not null && !await db.Teams.AnyAsync(t => t.Id == i.OwningTeamId, ct)) check.Add("owningTeamId", "Select an existing team.");
        check.Text("productOwner", i.ProductOwner, 150, "Product owner");
        var devs = (i.Developers ?? []).Where(d => !string.IsNullOrWhiteSpace(d.Name) || !string.IsNullOrWhiteSpace(d.Email)).ToList();
        for (var n = 0; n < devs.Count; n++)
        {
            var d = devs[n];
            check.Text($"developers[{n}]", d.Name, 150, $"Developer {n + 1} name", true).Text($"developers[{n}]", d.Email, 254, $"Developer {n + 1} e-mail")
                 .When(d.Role is not (null or "Lead" or "Developer"), $"developers[{n}]", $"Developer {n + 1}: choose Lead or Developer.")
                 .When(!string.IsNullOrWhiteSpace(d.Email) && !d.Email.Contains('@'), $"developers[{n}]", $"Developer {n + 1}: enter a valid e-mail or leave it empty.");
        }
        if (devs.GroupBy(d => (d.Name ?? "").Trim().ToLowerInvariant()).Any(g => g.Count() > 1)) check.Add("developers", "Each developer is listed once.");
        check.ThrowIfAny();
        var code = i.Code!.Trim();
        if (p.Id == 0 && await db.Products.AnyAsync(x => x.Code == code, ct))
            throw new ConflictException("This product code already exists.", new() { ["code"] = ["Product codes are unique."] });
        p.Code = code;
        p.Name = i.Name!.Trim();
        p.Aliases = Text.Clean(i.Aliases);
        p.Description = Text.Clean(i.Description);
        p.Category = Text.Clean(i.Category);
        p.Technology = Text.Clean(i.Technology);
        p.OwningTeamId = i.OwningTeamId;
        p.ProductOwner = Text.Clean(i.ProductOwner);
        p.IsActive = i.IsActive;
        if (i.Developers is not null)
        {
            p.Developers.Clear();
            for (var n = 0; n < devs.Count; n++)
                p.Developers.Add(new ProductDeveloper { Name = devs[n].Name!.Trim(), Role = devs[n].Role ?? "Developer", Email = Text.Clean(devs[n].Email), SortOrder = n });
        }
    }

    private static async Task ApplyMicroserviceAsync(ProductMicroservice m, MicroserviceInput i, HubDbContext db, LookupService lookups, CancellationToken ct)
    {
        var check = new Check().Text("name", i.Name, 200, "the microservice name", true).Text("description", i.Description, 2000, "Description");
        if (i.ModuleId is not null && !await db.ProductModules.AnyAsync(x => x.Id == i.ModuleId && x.ProductId == m.ProductId, ct))
            check.Add("moduleId", "Select a module of this product.");
        var role = await lookups.CheckAsync(check, "role", LookupLists.ComponentRole, i.Role, "the role", m.Role, ct);
        check.ThrowIfAny();
        var name = i.Name!.Trim();
        if (await db.ProductMicroservices.AnyAsync(x => x.ProductId == m.ProductId && x.Name == name && x.Id != m.Id, ct))
            throw new ConflictException("This product already has a microservice with this name.", new() { ["name"] = ["Microservice names are unique within the product."] });
        m.Name = name;
        m.Description = Text.Clean(i.Description);
        m.ModuleId = i.ModuleId;
        m.Role = role;
        m.IsActive = i.IsActive;
    }

    private static async Task ApplyFeatureAsync(ProductFeature f, FeatureInput i, HubDbContext db, CancellationToken ct)
    {
        var check = new Check().Text("name", i.Name, 150, "the feature name", true).Text("description", i.Description, 2000, "Description");
        if (i.ModuleId is not null && !await db.ProductModules.AnyAsync(m => m.Id == i.ModuleId && m.ProductId == f.ProductId, ct))
            check.Add("moduleId", "Select a module of this product.");
        check.ThrowIfAny();
        var name = i.Name!.Trim();
        if (await db.ProductFeatures.AnyAsync(x => x.ProductId == f.ProductId && x.Name == name && x.Id != f.Id, ct))
            throw new ConflictException("This product already has a feature with this name.", new() { ["name"] = ["Feature names are unique within the product."] });
        f.Name = name;
        f.Description = Text.Clean(i.Description);
        f.ModuleId = i.ModuleId;
        f.IsActive = i.IsActive;
    }

    private static async Task ApplyAsync(Installation i, InstallationInput input, HubDbContext db, HubAccess access, bool isNew, CancellationToken ct)
    {
        var check = new Check();
        if (!isNew && input.EnvironmentId is not null && input.EnvironmentId != i.EnvironmentId) check.Add("environmentId", "An installation cannot move to another environment; record a new installation.");
        if (!isNew && input.ProductId is not null && input.ProductId != i.ProductId) check.Add("productId", "The product of an installation cannot change.");
        check.Text("instanceName", input.InstanceName, 100, "the instance name", true).Text("supportNotes", input.SupportNotes, 2000, "Support notes");
        var productId = isNew ? input.ProductId : i.ProductId;
        if (isNew)
        {
            if (productId is null) check.Add("productId", "Select the product.");
            else if (!await db.Products.AnyAsync(p => p.Id == productId && p.IsActive, ct)) check.Add("productId", "Select an active product from the catalogue.");
        }
        if (input.ModuleId is not null && !await db.ProductModules.AnyAsync(m => m.Id == input.ModuleId && m.ProductId == productId, ct)) check.Add("moduleId", "Select a module of this product.");
        if (isNew && input.ProductVersionId is not null && !await db.ProductVersions.AnyAsync(v => v.Id == input.ProductVersionId && v.ProductId == productId, ct)) check.Add("productVersionId", "Select a version of this product, or leave it Unknown.");
        await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, i.ClientId, null, "the owner", ct);
        if (!isNew) access.CheckOwnerChange(check, "ownerUserId", i.OwnerUserId, input.OwnerUserId);
        check.ThrowIfAny();
        var norm = Text.Norm(input.InstanceName);
        var envId = isNew ? input.EnvironmentId!.Value : i.EnvironmentId;
        if (await db.Installations.IgnoreQueryFilters().AnyAsync(x => x.EnvironmentId == envId && x.ProductId == productId && x.NormalizedInstanceName == norm && x.ArchivedAt == null && x.Id != i.Id, ct))
            throw new ConflictException("This environment already has an installation of this product with that instance name.", new() { ["instanceName"] = ["Instance names are unique per product within an environment. Use a distinct name for each instance."] });
        i.ProductId = productId!.Value;
        i.ModuleId = input.ModuleId;
        i.InstanceName = input.InstanceName!.Trim();
        i.NormalizedInstanceName = norm;
        if (isNew) i.ProductVersionId = input.ProductVersionId;
        i.DeployedOn = input.DeployedOn;
        i.SupportNotes = Text.Clean(input.SupportNotes);
        i.OwnerUserId = input.OwnerUserId;
    }
}
