using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Inventory;

public static class InventoryEndpoints
{
    public sealed record AssetInput(long? EnvironmentId, string? Name, string? Type, string? Role, string? NetworkZone, string? ProjectPhase, AssetLifecycle? Lifecycle,
        long? OwnerUserId, ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization, long? ResponsibleTeamId, long? CoordinatorUserId,
        decimal? CpuQuantity, CpuUnit? CpuUnit, decimal? RamQuantity, MemoryUnit? RamUnit, string? OsFamily, string? OsVersion,
        List<Deployment.Selection>? Microservices = null, string? OwnerName = null, string? OwnerContact = null, ContactDetailsInput? Owner = null);
    public sealed record HostedMicroservicesInput(List<Deployment.Selection>? Microservices);
    public sealed record VolumeInput(string? Label, decimal? Capacity, StorageUnit? Unit, string? Purpose, long? SharedStorageId);
    public sealed record ComponentInput(long? InstallationId, string? Name, string? Role, string? ComponentVersion, long? OwnerUserId,
        ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization, long? ResponsibleTeamId, long? CoordinatorUserId, long[]? HostAssetIds);
    public sealed record SharedStorageInput(long? ClientId, long? EnvironmentId, string? Name, decimal? Capacity, StorageUnit? Unit, string? Description);

    public static void MapInventoryEndpoints(this RouteGroupBuilder api)
    {
        var ag = api.MapGroup("/assets").WithTags("Assets");

        ag.MapGet("", async (long? clientId, long? regionId, long? environmentId, long? productId, string? type, AssetLifecycle? lifecycle, string? role, string? phase, string? zone, string? q, int? page, int? pageSize,
            HubDbContext db, HubAccess access, CancellationToken ct, string? country = null) =>
        {
            access.RequireBusiness();
            var tech = access.Me.SeesTechnical;
            var query = FilterAssets(db, clientId, regionId, environmentId, productId, type, lifecycle, role, phase, tech ? zone : null, q, country);
            return Results.Ok(await query.OrderBy(a => a.Environment!.Client!.Code).ThenBy(a => a.Environment!.Name).ThenBy(a => a.Name).Select(a => new
            {
                a.Id, a.Name, a.Type, a.Role, a.ProjectPhase, a.Lifecycle, networkZone = tech ? a.NetworkZone : null, networkZoneRestricted = !tech && a.NetworkZone != null,
                a.EnvironmentId, environmentName = a.Environment!.Name, a.ClientId, clientCode = a.Environment.Client!.Code, regionCode = a.Environment.Region == null ? null : a.Environment.Region.Code,
                a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.OsFamily, a.OsVersion, a.VerifiedAt,
                owner = a.Owner == null ? null : new UserRef(a.Owner.Id, a.Owner.DisplayName, a.Owner.IsActive),
                ownerName = a.TechnicalOwnerName,
                componentCount = a.Hosts.Count, volumeCount = a.Volumes.Count(v => v.ArchivedAt == null)
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        ag.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var a = await db.Assets.AsNoTracking().Include(x => x.Environment).ThenInclude(e => e!.Client).Include(x => x.Environment).ThenInclude(e => e!.Region).Include(x => x.Owner)
                .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The asset");
            var tech = access.Me.SeesTechnical;
            var volumes = await db.Volumes.AsNoTracking().Where(v => v.AssetId == id).OrderBy(v => v.Label)
                .Select(v => new { v.Id, v.Label, v.Capacity, v.Unit, v.Purpose, v.SharedStorageId, sharedStorageName = v.SharedStorage == null ? null : v.SharedStorage.Name, version = Convert.ToBase64String(v.RowVersion) }).ToListAsync(ct);
            var components = await db.ComponentHosts.AsNoTracking().Where(h => h.AssetId == id)
                .Select(h => new { h.ComponentId, h.Component!.Name, h.Component.Role, h.Component.InstallationId, installationName = h.Component.Installation!.InstanceName, productCode = h.Component.Installation.Product!.Code }).ToListAsync(ct);
            // A35: the firewall rules from and to this server (technical detail).
            var firewallRules = tech ? await db.FirewallRules.AsNoTracking().Where(r => r.SourceAssetId == id || r.DestinationAssetId == id)
                .Select(r => new { r.Id, r.SourceAssetId, source = r.SourceAsset!.Name, r.DestinationAssetId, destination = r.DestinationAsset!.Name, r.Ports, r.Protocol, r.Direction, r.Purpose }).ToListAsync(ct) : null;
            return ctx.WithETag(a, new
            {
                a.Id, a.Name, a.Type, a.Role, a.ProjectPhase, a.Lifecycle,
                networkZone = tech ? a.NetworkZone : null, technicalRestricted = !tech,
                environment = new { a.Environment!.Id, a.Environment.Name, clientId = a.ClientId, clientCode = a.Environment.Client!.Code, regionId = a.Environment.RegionId,
                    regionCode = a.Environment.Region == null ? null : a.Environment.Region.Code },
                owner = a.Owner == null ? null : new UserRef(a.Owner.Id, a.Owner.DisplayName, a.Owner.IsActive),
                ownerName = a.TechnicalOwnerName, ownerContact = a.TechnicalOwnerContact,
                ownerDetails = a.TechnicalOwnerName == null ? null : new { name = a.TechnicalOwnerName, title = a.TechnicalOwnerTitle, organization = a.TechnicalOwnerOrganization,
                    phone = a.TechnicalOwnerPhone, mobile = a.TechnicalOwnerMobile, email = a.TechnicalOwnerEmail },
                a.ResponsibleParty, a.ResponsibleOrganization, a.ResponsibleTeamId, a.CoordinatorUserId,
                a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.OsFamily, a.OsVersion, a.VerifiedAt,
                volumes, components, firewallRules, a.CreatedAt, a.UpdatedAt
            });
        });

        // Server form: the installations of an environment with their product's microservices, and which run on a given server.
        api.MapGet("/environments/{environmentId:long}/microservice-options", async (long environmentId, long? assetId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (!await db.Environments.AnyAsync(e => e.Id == environmentId, ct)) throw new NotFoundException("The environment");
            var installations = await db.Installations.AsNoTracking().Where(i => i.EnvironmentId == environmentId).OrderBy(i => i.Product!.Code).ThenBy(i => i.InstanceName)
                .Select(i => new { i.Id, i.InstanceName, i.ProductId, productCode = i.Product!.Code, productName = i.Product.Name }).ToListAsync(ct);
            var productIds = installations.Select(i => i.ProductId).Distinct().ToList();
            var microservices = await db.ProductMicroservices.AsNoTracking().Where(m => productIds.Contains(m.ProductId))
                .OrderBy(m => m.Module == null ? "" : m.Module.Code).ThenBy(m => m.Name)
                .Select(m => new
                {
                    m.Id, m.ProductId, m.Name, module = m.Module == null ? null : m.Module.Code, m.Role, m.IsActive,
                    versions = m.Versions.OrderByDescending(v => v.SortKey).Select(v => new { v.Id, v.Version, v.ReleasedOn, v.IsActive }).ToList()
                }).ToListAsync(ct);
            var selected = assetId is null ? [] : await db.Components.AsNoTracking()
                .Where(c => c.EnvironmentId == environmentId && c.MicroserviceId != null && c.Hosts.Any(h => h.AssetId == assetId))
                .Select(c => new { c.InstallationId, MicroserviceId = c.MicroserviceId!.Value, VersionId = c.Hosts.Where(h => h.AssetId == assetId).Select(h => h.MicroserviceVersionId).FirstOrDefault() })
                .ToListAsync(ct);
            return Results.Ok(installations.Select(i => new
            {
                installationId = i.Id, i.InstanceName, i.productCode, i.productName,
                microservices = microservices.Where(m => m.ProductId == i.ProductId && (m.IsActive || selected.Any(x => x.InstallationId == i.Id && x.MicroserviceId == m.Id)))
                    .Select(m =>
                    {
                        var sel = selected.FirstOrDefault(x => x.InstallationId == i.Id && x.MicroserviceId == m.Id);
                        // Retired versions are offered only where already deployed here.
                        return new
                        {
                            m.Id, m.Name, m.module, m.Role, m.IsActive, selected = sel is not null, versionId = sel?.VersionId,
                            versions = m.versions.Where(v => v.IsActive || v.Id == sel?.VersionId)
                        };
                    })
            }));
        }).WithTags("Assets");

        // Server page: change only the hosted microservices (and their deployed versions) of an existing server.
        ag.MapPut("/{id:long}/microservices", async (long id, HostedMicroservicesInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var a = await db.Assets.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The asset");
            access.RequireMaintain(ResourcePermissions.Servers, a.ClientId, null);
            await Deployment.ApplySelectionsAsync(db, a, input.Microservices ?? [], ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        ag.MapPost("", async (AssetInput input, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var env = await db.Environments.FirstOrDefaultAsync(e => e.Id == input.EnvironmentId, ct) ?? throw new ValidationException("environmentId", "Select an environment you can access.");
            access.RequireCreateFor(ResourcePermissions.Servers, env.ClientId);
            var a = new Asset { EnvironmentId = env.Id, ClientId = env.ClientId };
            await ApplyAssetAsync(a, input, db, access, lookups, true, ct);
            db.Assets.Add(a);
            // The microservices hosted on the new server are saved together with it.
            if (input.Microservices is { Count: > 0 }) await Deployment.ApplySelectionsAsync(db, a, input.Microservices, ct);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/assets/{a.Id}", new { a.Id });
        });

        ag.MapPut("/{id:long}", async (long id, AssetInput input, HttpContext ctx, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var a = await db.Assets.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The asset");
            var env = await db.Environments.FirstAsync(e => e.Id == a.EnvironmentId, ct);
            access.RequireMaintain(ResourcePermissions.Servers, a.ClientId, null, a.OwnerUserId, env.OwnerUserId, env.BackupOwnerUserId, a.CoordinatorUserId);
            db.ExpectVersion(ctx, a);
            await ApplyAssetAsync(a, input, db, access, lookups, false, ct);
            if (input.Microservices is { Count: > 0 }) await Deployment.ApplySelectionsAsync(db, a, input.Microservices, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        ag.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var a = await db.Assets.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The asset");
            access.RequireArchiveFor(a.ClientId, resource: ResourcePermissions.Servers);
            db.ExpectVersion(ctx, a);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(a, access.Me, DateTimeOffset.UtcNow, reason);
            if (a.Lifecycle != AssetLifecycle.Retired) a.Lifecycle = AssetLifecycle.Retired;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        ag.MapPost("/{id:long}/volumes", async (long id, VolumeInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var a = await db.Assets.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The asset");
            var env = await db.Environments.FirstAsync(e => e.Id == a.EnvironmentId, ct);
            access.RequireMaintain(ResourcePermissions.Servers, a.ClientId, null, a.OwnerUserId, env.OwnerUserId, env.BackupOwnerUserId);
            var v = new Volume { AssetId = id, EnvironmentId = a.EnvironmentId, ClientId = a.ClientId };
            await ApplyVolumeAsync(v, input, db, ct);
            db.Volumes.Add(v);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/volumes/{v.Id}", new { v.Id });
        });
        var vg = api.MapGroup("/volumes").WithTags("Assets");
        vg.MapPut("/{id:long}", async (long id, VolumeInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var v = await db.Volumes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The volume");
            var a = await db.Assets.FirstAsync(x => x.Id == v.AssetId, ct);
            var env = await db.Environments.FirstAsync(e => e.Id == a.EnvironmentId, ct);
            access.RequireMaintain(ResourcePermissions.Servers, a.ClientId, null, a.OwnerUserId, env.OwnerUserId, env.BackupOwnerUserId);
            db.ExpectVersion(ctx, v);
            await ApplyVolumeAsync(v, input, db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        vg.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var v = await db.Volumes.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The volume");
            var a = await db.Assets.FirstAsync(x => x.Id == v.AssetId, ct);
            var env = await db.Environments.FirstAsync(e => e.Id == a.EnvironmentId, ct);
            access.RequireArchiveFor(a.ClientId, resource: ResourcePermissions.Servers);
            db.ExpectVersion(ctx, v);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(v, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- shared storage ----
        var sg = api.MapGroup("/shared-storage").WithTags("Assets");
        sg.MapGet("", async (long clientId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            return Results.Ok(await db.SharedStorages.AsNoTracking().Where(s => s.ClientId == clientId).OrderBy(s => s.Name)
                .Select(s => new { s.Id, s.Name, s.Capacity, s.Unit, s.Description, s.EnvironmentId, volumeCount = db.Volumes.Count(v => v.SharedStorageId == s.Id), version = Convert.ToBase64String(s.RowVersion) }).ToListAsync(ct));
        });
        sg.MapPost("", async (SharedStorageInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            if (input.ClientId is null || !await db.Clients.AnyAsync(c => c.Id == input.ClientId, ct)) throw new ValidationException("clientId", "Select the client.");
            access.RequireCreateFor(ResourcePermissions.Servers, input.ClientId);
            var check = new Check().Text("name", input.Name, 150, "the name", true).Text("description", input.Description, 2000, "Description");
            CheckQuantity(check, "capacity", input.Capacity, input.Unit, "unit");
            if (input.EnvironmentId is not null && !await db.Environments.AnyAsync(e => e.Id == input.EnvironmentId && e.ClientId == input.ClientId, ct)) check.Add("environmentId", "Select an environment of this client.");
            check.ThrowIfAny();
            if (await db.SharedStorages.AnyAsync(s => s.ClientId == input.ClientId && s.Name == input.Name!.Trim(), ct)) throw new ConflictException("Shared storage with this name already exists for the client.");
            var s = new SharedStorage { ClientId = input.ClientId.Value, EnvironmentId = input.EnvironmentId, Name = input.Name!.Trim(), Capacity = input.Capacity, Unit = input.Unit, Description = Text.Clean(input.Description) };
            db.SharedStorages.Add(s);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/shared-storage/{s.Id}", new { s.Id });
        });

        // ---- components (INF-02) ----
        var cg = api.MapGroup("/components").WithTags("Components");
        cg.MapPost("", async (ComponentInput input, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var inst = await db.Installations.FirstOrDefaultAsync(i => i.Id == input.InstallationId, ct) ?? throw new ValidationException("installationId", "Select an installation you can access.");
            var env = await db.Environments.FirstAsync(e => e.Id == inst.EnvironmentId, ct);
            access.RequireCreateFor(ResourcePermissions.Servers, inst.ClientId);
            var c = new Component { InstallationId = inst.Id, EnvironmentId = inst.EnvironmentId, ClientId = inst.ClientId };
            await ApplyComponentAsync(c, input, db, access, lookups, true, ct);
            db.Components.Add(c);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/components/{c.Id}", new { c.Id });
        });
        cg.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var c = await db.Components.AsNoTracking().Include(x => x.Owner).Include(x => x.Hosts).ThenInclude(h => h.Asset).Include(x => x.Installation).ThenInclude(i => i!.Product)
                .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The component");
            return ctx.WithETag(c, new
            {
                c.Id, c.Name, c.Role, c.ComponentVersion, c.InstallationId, installationName = c.Installation!.InstanceName, productCode = c.Installation.Product!.Code, c.EnvironmentId, c.ClientId,
                owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive), c.ResponsibleParty, c.ResponsibleOrganization, c.CoordinatorUserId,
                hosts = c.Hosts.Where(h => h.Asset != null).Select(h => new { h.AssetId, h.Asset!.Name, h.Asset.Type })
            });
        });
        cg.MapPut("/{id:long}", async (long id, ComponentInput input, HttpContext ctx, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var c = await db.Components.Include(x => x.Hosts).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The component");
            var env = await db.Environments.FirstAsync(e => e.Id == c.EnvironmentId, ct);
            access.RequireMaintain(ResourcePermissions.Servers, c.ClientId, null, c.OwnerUserId, env.OwnerUserId, env.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await ApplyComponentAsync(c, input, db, access, lookups, false, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        cg.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var c = await db.Components.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The component");
            access.RequireArchiveFor(c.ClientId, resource: ResourcePermissions.Servers);
            db.ExpectVersion(ctx, c);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(c, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- infrastructure summary (INF-08, Section 7 Resource totals) ----
        api.MapGet("/infrastructure/summary", async (long? clientId, long? regionId, long? environmentId, long? productId, string? type, AssetLifecycle? lifecycle, string? role, string? phase, string? zone,
            HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var assets = await FilterAssets(db, clientId, regionId, environmentId, productId, type, lifecycle, role, phase, access.Me.SeesTechnical ? zone : null, null)
                .AsNoTracking().Select(a => new { a.Id, a.TypeCategory, a.Lifecycle, a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.VerifiedAt }).ToListAsync(ct);
            var ids = assets.Select(a => a.Id).ToList();
            var volumes = await db.Volumes.AsNoTracking().Where(v => ids.Contains(v.AssetId)).Select(v => new { v.Id, v.Capacity, v.Unit, v.SharedStorageId }).ToListAsync(ct);
            var sharedIds = volumes.Where(v => v.SharedStorageId != null).Select(v => v.SharedStorageId!.Value).Distinct().ToList();
            var shared = await db.SharedStorages.AsNoTracking().Where(s => sharedIds.Contains(s.Id)).Select(s => new { s.Id, s.Capacity, s.Unit }).ToListAsync(ct);
            return Results.Ok(Summarize(
                assets.Select(a => new AssetFacts(a.TypeCategory, a.Lifecycle, a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.VerifiedAt)).ToList(),
                volumes.Select(v => new VolumeFacts(v.Capacity, v.Unit, v.SharedStorageId)).ToList(),
                shared.Select(s => new SharedFacts(s.Id, s.Capacity, s.Unit)).ToList()));
        });
    }

    public sealed record AssetFacts(AssetType Type, AssetLifecycle Lifecycle, decimal? Cpu, CpuUnit? CpuUnit, decimal? Ram, MemoryUnit? RamUnit, DateTimeOffset? VerifiedAt);
    public sealed record VolumeFacts(decimal? Capacity, StorageUnit? Unit, long? SharedStorageId);
    public sealed record SharedFacts(long Id, decimal? Capacity, StorageUnit? Unit);

    /// <summary>
    /// Recorded quantities only, never utilization. Logical endpoints are never VMs; vCPU and physical cores stay separate;
    /// unknown quantities are counted as missing, not zero; each shared storage is counted once however many volumes reference it.
    /// </summary>
    public static object Summarize(IReadOnlyList<AssetFacts> assets, IReadOnlyList<VolumeFacts> volumes, IReadOnlyList<SharedFacts> shared)
    {
        var hosts = assets.Where(a => a.Type != AssetType.LogicalEndpoint).ToList();
        var storage = new Dictionary<StorageUnit, decimal>();
        var unknownStorage = 0;
        foreach (var v in volumes.Where(v => v.SharedStorageId is null))
        {
            if (v.Capacity is null || v.Unit is null) { unknownStorage++; continue; }
            storage[v.Unit.Value] = storage.GetValueOrDefault(v.Unit.Value) + v.Capacity.Value;
        }
        var sharedStorage = new Dictionary<StorageUnit, decimal>();
        var unknownShared = 0;
        foreach (var s in shared)
        {
            if (s.Capacity is null || s.Unit is null) { unknownShared++; continue; }
            sharedStorage[s.Unit.Value] = sharedStorage.GetValueOrDefault(s.Unit.Value) + s.Capacity.Value;
        }
        return new
        {
            label = "Recorded provisioning (manually documented, not measured utilization)",
            assets = new
            {
                total = assets.Count,
                vm = assets.Count(a => a.Type == AssetType.VM),
                physical = assets.Count(a => a.Type == AssetType.Physical),
                logicalEndpoints = assets.Count(a => a.Type == AssetType.LogicalEndpoint),
                byLifecycle = Enum.GetValues<AssetLifecycle>().ToDictionary(l => l.ToString(), l => assets.Count(a => a.Lifecycle == l)),
                unverified = assets.Count(a => a.VerifiedAt is null)
            },
            cpu = new
            {
                vCpu = hosts.Where(a => a.Cpu is not null && a.CpuUnit == CpuUnit.vCPU).Sum(a => a.Cpu!.Value),
                physicalCores = hosts.Where(a => a.Cpu is not null && a.CpuUnit == CpuUnit.PhysicalCore).Sum(a => a.Cpu!.Value),
                unknownCount = hosts.Count(a => a.Cpu is null || a.CpuUnit is null)
            },
            ram = new
            {
                gb = hosts.Where(a => a.Ram is not null && a.RamUnit == MemoryUnit.GB).Sum(a => a.Ram!.Value),
                gib = hosts.Where(a => a.Ram is not null && a.RamUnit == MemoryUnit.GiB).Sum(a => a.Ram!.Value),
                unknownCount = hosts.Count(a => a.Ram is null || a.RamUnit is null)
            },
            storage = new
            {
                dedicated = storage.ToDictionary(k => k.Key.ToString(), k => k.Value),
                dedicatedUnknownCount = unknownStorage,
                shared = sharedStorage.ToDictionary(k => k.Key.ToString(), k => k.Value),
                sharedUnknownCount = unknownShared,
                sharedPools = shared.Count,
                volumesOnShared = volumes.Count(v => v.SharedStorageId is not null)
            }
        };
    }

    public static IQueryable<Asset> FilterAssets(HubDbContext db, long? clientId, long? regionId, long? environmentId, long? productId, string? type, AssetLifecycle? lifecycle, string? role, string? phase, string? zone, string? q, string? country = null)
    {
        var query = db.Assets.AsQueryable();
        // A73: the client map's servers of one country (the client's country, like the other lists' country filter).
        if (!string.IsNullOrWhiteSpace(country)) query = query.Where(a => a.Environment!.Client!.Country == country);
        if (clientId is not null) query = query.Where(a => a.ClientId == clientId);
        if (regionId is not null) query = query.Where(a => a.Environment!.RegionId == regionId);
        if (environmentId is not null) query = query.Where(a => a.EnvironmentId == environmentId);
        if (productId is not null) query = query.Where(a => a.Hosts.Any(h => h.Component!.Installation!.ProductId == productId));
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(a => a.Type == type);
        if (lifecycle is not null) query = query.Where(a => a.Lifecycle == lifecycle);
        if (!string.IsNullOrWhiteSpace(role)) query = query.Where(a => a.Role == role);
        if (!string.IsNullOrWhiteSpace(phase)) query = query.Where(a => a.ProjectPhase == phase);
        if (!string.IsNullOrWhiteSpace(zone)) query = query.Where(a => a.NetworkZone == zone);
        if (!string.IsNullOrWhiteSpace(q)) query = query.Where(a => a.Name.Contains(q));
        return query;
    }

    private static void CheckQuantity(Check check, string field, decimal? qty, object? unit, string unitField)
    {
        if (qty is not null && qty <= 0) check.Add(field, "Enter a positive quantity, or leave it empty when unknown (unknown is not zero).");
        if (qty is not null && unit is null) check.Add(unitField, "Select the unit for this quantity.");
        if (qty is null && unit is not null) check.Add(field, "Enter the quantity for this unit, or clear the unit.");
    }

    private static async Task ApplyAssetAsync(Asset a, AssetInput i, HubDbContext db, HubAccess access, LookupService lookups, bool isNew, CancellationToken ct)
    {
        var check = new Check();
        if (!isNew && i.EnvironmentId is not null && i.EnvironmentId != a.EnvironmentId) check.Add("environmentId", "An asset cannot move to another environment.");
        check.Text("name", i.Name, 150, "the asset name", true)
             .Text("osFamily", i.OsFamily, 100, "OS family").Text("osVersion", i.OsVersion, 100, "OS version")
             .Text("responsibleOrganization", i.ResponsibleOrganization, 150, "Responsible organization");
        // A34: configured server type; its category (VM, Physical, Logical endpoint) drives totals and rules.
        var (typeCode, typeCategory) = await lookups.TypeAsync<AssetType>(check, "type", LookupLists.AssetType, i.Type, "the server type", isNew ? null : a.Type, ct);
        var role = await lookups.CheckAsync(check, "role", LookupLists.AssetRole, i.Role, "the role", a.Role, ct);
        var phase = await lookups.CheckAsync(check, "projectPhase", LookupLists.ProjectPhase, i.ProjectPhase, "the project phase", a.ProjectPhase, ct);
        string? zone = a.NetworkZone;
        if (access.Me.SeesTechnical) zone = await lookups.CheckAsync(check, "networkZone", LookupLists.NetworkZone, i.NetworkZone, "the network zone", a.NetworkZone, ct);
        else if (Text.Clean(i.NetworkZone) is { } z && z != a.NetworkZone) check.Add("networkZone", "Changing the network zone needs the Technical detail permission.");
        CheckQuantity(check, "cpuQuantity", i.CpuQuantity, i.CpuUnit, "cpuUnit");
        CheckQuantity(check, "ramQuantity", i.RamQuantity, i.RamUnit, "ramUnit");
        if (typeCode != "" && typeCategory == AssetType.LogicalEndpoint && (i.CpuQuantity is not null || i.RamQuantity is not null))
            check.Add("cpuQuantity", "A logical endpoint (for example a listener) has no own CPU or RAM; record capacity on its hosting servers.");
        var party = i.ResponsibleParty ?? ResponsibleParty.TIO;
        // A team member, or a named person with contact details (not both).
        // A36: structured details (Owner) take precedence over the older OwnerName / OwnerContact fields.
        var details = i.Owner ?? (i.OwnerName is null ? null : new ContactDetailsInput(i.OwnerName, null, null, null, null, null));
        ContactDetails.Check(check, "owner", details, "Technical owner");
        var ownerName = Text.Clean(details?.Name);
        check.Text("ownerContact", i.OwnerContact, 300, "Other contact notes")
             .When(i.OwnerUserId is not null && ownerName is not null, "ownerName", "Choose a team member or type a name, not both.")
             .When(ownerName is null && !string.IsNullOrWhiteSpace(i.OwnerContact), "ownerName", "Type the technical owner's name for these contact details.");
        Rules.CheckAccountability(check, party, i.OwnerUserId ?? (ownerName is null ? null : 0L), i.CoordinatorUserId, ownerRequired: false);
        access.CheckOwnerChange(check, "ownerUserId", isNew ? i.OwnerUserId : a.OwnerUserId, i.OwnerUserId, resource: ResourcePermissions.Servers);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, a.ClientId, null, "the owner", ct);
        await access.CheckAssignableAsync(check, "coordinatorUserId", i.CoordinatorUserId, a.ClientId, null, "the coordinator", ct);
        check.ThrowIfAny();
        var norm = Text.Norm(i.Name);
        if (await db.Assets.IgnoreQueryFilters().AnyAsync(x => x.EnvironmentId == a.EnvironmentId && x.NormalizedName == norm && x.ArchivedAt == null && x.Id != a.Id, ct))
            throw new ConflictException("An asset with this name already exists in the environment.", new() { ["name"] = ["Asset names are unique within an environment."] });
        a.Name = i.Name!.Trim();
        a.NormalizedName = norm;
        a.Type = typeCode;
        a.TypeCategory = typeCategory;
        a.Role = role;
        a.ProjectPhase = phase;
        a.NetworkZone = zone;
        a.Lifecycle = i.Lifecycle ?? AssetLifecycle.Unknown;
        a.OwnerUserId = i.OwnerUserId;
        a.TechnicalOwnerName = ownerName;
        a.TechnicalOwnerTitle = ownerName is null ? null : Text.Clean(details?.Title);
        a.TechnicalOwnerOrganization = ownerName is null ? null : Text.Clean(details?.Organization);
        a.TechnicalOwnerPhone = ownerName is null ? null : Text.Clean(details?.Phone);
        a.TechnicalOwnerMobile = ownerName is null ? null : Text.Clean(details?.Mobile);
        a.TechnicalOwnerEmail = ownerName is null ? null : Text.Clean(details?.Email);
        a.TechnicalOwnerContact = ownerName is null ? null : Text.Clean(i.OwnerContact);
        a.ResponsibleParty = party;
        a.ResponsibleOrganization = Text.Clean(i.ResponsibleOrganization);
        a.ResponsibleTeamId = i.ResponsibleTeamId;
        a.CoordinatorUserId = i.CoordinatorUserId;
        a.CpuQuantity = i.CpuQuantity;
        a.CpuUnit = i.CpuQuantity is null ? null : i.CpuUnit;
        a.RamQuantity = i.RamQuantity;
        a.RamUnit = i.RamQuantity is null ? null : i.RamUnit;
        a.OsFamily = Text.Clean(i.OsFamily);
        a.OsVersion = Text.Clean(i.OsVersion);
    }

    private static async Task ApplyVolumeAsync(Volume v, VolumeInput i, HubDbContext db, CancellationToken ct)
    {
        var check = new Check().Text("label", i.Label, 100, "the volume label", true).Text("purpose", i.Purpose, 200, "Purpose");
        CheckQuantity(check, "capacity", i.Capacity, i.Unit, "unit");
        if (i.SharedStorageId is not null && !await db.SharedStorages.AnyAsync(s => s.Id == i.SharedStorageId && s.ClientId == v.ClientId, ct))
            check.Add("sharedStorageId", "Select shared storage of this client.");
        check.ThrowIfAny();
        var label = i.Label!.Trim();
        if (await db.Volumes.AnyAsync(x => x.AssetId == v.AssetId && x.Label == label && x.Id != v.Id, ct))
            throw new ConflictException("This asset already has a volume with this label.", new() { ["label"] = ["Volume labels are unique within an asset."] });
        v.Label = label;
        v.Capacity = i.Capacity;
        v.Unit = i.Capacity is null ? null : i.Unit;
        v.Purpose = Text.Clean(i.Purpose);
        v.SharedStorageId = i.SharedStorageId;
    }

    private static async Task ApplyComponentAsync(Component c, ComponentInput i, HubDbContext db, HubAccess access, LookupService lookups, bool isNew, CancellationToken ct)
    {
        var check = new Check();
        if (!isNew && i.InstallationId is not null && i.InstallationId != c.InstallationId) check.Add("installationId", "A component cannot move to another installation.");
        check.Text("name", i.Name, 150, "the component name", true).Text("componentVersion", i.ComponentVersion, 50, "Component version")
             .Text("responsibleOrganization", i.ResponsibleOrganization, 150, "Responsible organization");
        var role = await lookups.CheckAsync(check, "role", LookupLists.ComponentRole, i.Role, "the component role", c.Role, ct, required: true);
        var hostIds = (i.HostAssetIds ?? []).Distinct().ToList();
        if (hostIds.Count > 0)
        {
            // MVP: components and their hosts belong to the same client and environment; shared infrastructure is described through dependencies.
            var valid = await db.Assets.Where(a => hostIds.Contains(a.Id) && a.EnvironmentId == c.EnvironmentId && a.ClientId == c.ClientId).Select(a => a.Id).ToListAsync(ct);
            if (valid.Count != hostIds.Count) check.Add("hostAssetIds", "Hosts must be assets of the same environment. Other clients' or environments' servers cannot host this component.");
        }
        var party = i.ResponsibleParty ?? ResponsibleParty.TIO;
        access.CheckOwnerChange(check, "ownerUserId", isNew ? i.OwnerUserId : c.OwnerUserId, i.OwnerUserId, resource: ResourcePermissions.Servers);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, c.ClientId, null, "the owner", ct);
        await access.CheckAssignableAsync(check, "coordinatorUserId", i.CoordinatorUserId, c.ClientId, null, "the coordinator", ct);
        if (party != ResponsibleParty.TIO && i.OwnerUserId is null && i.CoordinatorUserId is null) check.Add("coordinatorUserId", "Responsibility is external or unknown: select an internal coordinator.");
        check.ThrowIfAny();
        var norm = Text.Norm(i.Name);
        if (await db.Components.IgnoreQueryFilters().AnyAsync(x => x.InstallationId == c.InstallationId && x.NormalizedName == norm && x.ArchivedAt == null && x.Id != c.Id, ct))
            throw new ConflictException("This installation already has a component with this name.", new() { ["name"] = ["Component names are unique within an installation."] });
        c.Name = i.Name!.Trim();
        c.NormalizedName = norm;
        c.Role = role!;
        c.ComponentVersion = Text.Clean(i.ComponentVersion);
        c.OwnerUserId = i.OwnerUserId;
        c.ResponsibleParty = party;
        c.ResponsibleOrganization = Text.Clean(i.ResponsibleOrganization);
        c.ResponsibleTeamId = i.ResponsibleTeamId;
        c.CoordinatorUserId = i.CoordinatorUserId;
        c.Hosts.RemoveAll(h => !hostIds.Contains(h.AssetId));
        foreach (var id in hostIds.Where(id => c.Hosts.All(h => h.AssetId != id))) c.Hosts.Add(new ComponentHost { AssetId = id, ClientId = c.ClientId });
    }
}
