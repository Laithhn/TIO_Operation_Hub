using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Inventory;

namespace TioHub.Api.Modules.Catalogue;

/// <summary>
/// Which product microservice runs on which server (A23). Used by the installation page ("Choose microservices" per server) and by the
/// server form ("Hosted microservices"), so both always describe the same records: one component per microservice per installation,
/// with one host link per server it runs on. Changes are tracked only; the caller saves (atomically with its own changes).
/// </summary>
public static class Deployment
{
    /// <summary>One installation's microservices on the server. <c>Hosted</c> (microservice + deployed version) takes precedence over the older <c>MicroserviceIds</c>.</summary>
    public sealed record Selection(long? InstallationId, long[]? MicroserviceIds, List<HostedItem>? Hosted = null);
    public sealed record HostedItem(long MicroserviceId, long? VersionId);

    /// <summary>Sets exactly <paramref name="wanted"/> as the microservices of <paramref name="inst"/> running on <paramref name="server"/>.
    /// With <paramref name="versions"/>, also records the version deployed on this server (null = not recorded); without it, recorded versions are kept.</summary>
    public static async Task ApplyAsync(HubDbContext db, Installation inst, Asset server, IReadOnlyCollection<long> wanted, CancellationToken ct,
        IReadOnlyDictionary<long, long?>? versions = null)
    {
        if (server.EnvironmentId != inst.EnvironmentId) throw new ValidationException("assetId", "Select a server of this installation's environment.");
        if (server.TypeCategory == AssetType.LogicalEndpoint)
        {
            if (wanted.Count == 0) return;
            throw new ValidationException("assetId", "A logical endpoint (for example a listener) does not run microservices; choose a server.");
        }
        var catalogue = await db.ProductMicroservices.Where(m => m.ProductId == inst.ProductId).ToListAsync(ct);
        if (wanted.Any(w => catalogue.All(m => m.Id != w))) throw new ValidationException("microserviceIds", "Select microservices of this installation's product.");
        var versionIds = versions?.Where(v => v.Value is not null && wanted.Contains(v.Key)).ToList() ?? [];
        if (versionIds.Count > 0)
        {
            var ids = versionIds.Select(v => v.Value!.Value).ToList();
            var known = await db.MicroserviceVersions.Where(v => ids.Contains(v.Id)).Select(v => new { v.Id, v.MicroserviceId }).ToListAsync(ct);
            if (versionIds.Any(v => !known.Any(k => k.Id == v.Value && k.MicroserviceId == v.Key)))
                throw new ValidationException("microservices", "Choose a version of the same microservice (Products, then the microservice, then Versions).");
        }
        var components = await db.Components.Include(c => c.Hosts).Where(c => c.InstallationId == inst.Id && c.MicroserviceId != null).ToListAsync(ct);
        var tracked = db.Components.Local.Where(c => c.InstallationId == inst.Id && c.MicroserviceId != null && c.Id == 0).ToList();
        components.AddRange(tracked);
        bool HostedHere(ComponentHost h) => server.Id != 0 ? h.AssetId == server.Id : ReferenceEquals(h.Asset, server);
        foreach (var ms in catalogue.Where(m => wanted.Contains(m.Id)))
        {
            var c = components.FirstOrDefault(x => x.MicroserviceId == ms.Id);
            if (c is null)
            {
                c = new Component
                {
                    InstallationId = inst.Id, EnvironmentId = inst.EnvironmentId, ClientId = inst.ClientId, MicroserviceId = ms.Id,
                    Name = ms.Name, NormalizedName = Text.Norm(ms.Name), Role = ms.Role ?? "Application"
                };
                if (await db.Components.IgnoreQueryFilters().AnyAsync(x => x.InstallationId == inst.Id && x.NormalizedName == c.NormalizedName && x.ArchivedAt == null, ct))
                    throw new ConflictException($"This installation already has a component named {ms.Name}. Link or rename it first.");
                db.Components.Add(c);
                components.Add(c);
            }
            var host = c.Hosts.FirstOrDefault(HostedHere);
            if (host is null)
            {
                host = server.Id != 0 ? new ComponentHost { AssetId = server.Id, ClientId = inst.ClientId } : new ComponentHost { Asset = server, ClientId = inst.ClientId };
                c.Hosts.Add(host);
            }
            if (versions is not null) host.MicroserviceVersionId = versions.GetValueOrDefault(ms.Id);
        }
        foreach (var c in components.Where(x => !wanted.Contains(x.MicroserviceId!.Value)))
            c.Hosts.RemoveAll(HostedHere);
    }

    /// <summary>Applies the server form's selections: one entry per installation of the server's environment; installations not listed are untouched.</summary>
    public static async Task ApplySelectionsAsync(HubDbContext db, Asset server, IReadOnlyCollection<Selection> selections, CancellationToken ct)
    {
        foreach (var sel in selections)
        {
            var inst = await db.Installations.FirstOrDefaultAsync(i => i.Id == sel.InstallationId && i.EnvironmentId == server.EnvironmentId, ct)
                ?? throw new ValidationException("microservices", "Choose microservices of installations in this server's environment.");
            if (sel.Hosted is not null)
            {
                if (sel.Hosted.GroupBy(h => h.MicroserviceId).Any(g => g.Count() > 1)) throw new ValidationException("microservices", "List each microservice once per server.");
                await ApplyAsync(db, inst, server, sel.Hosted.Select(h => h.MicroserviceId).ToList(), ct, sel.Hosted.ToDictionary(h => h.MicroserviceId, h => h.VersionId));
            }
            else await ApplyAsync(db, inst, server, (sel.MicroserviceIds ?? []).Distinct().ToList(), ct);
        }
    }
}
