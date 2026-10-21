using Microsoft.EntityFrameworkCore;
using TioHub.Api.Data;

namespace TioHub.Api.Modules.Work;

/// <summary>
/// INF-07: potential effect derived only from recorded relationships (asset → hosted components → installations → environments → client,
/// and, since 2.14, servers connected to affected servers by recorded firewall rules). Labelled as documented impact; never a live outage claim.
/// Everything is read through scope filters, so restricted records do not appear.
/// </summary>
public static class DocumentedImpact
{
    public const string Label = "Documented dependency impact — inferred from recorded relationships, not live outage detection.";

    public static async Task<object> ForCaseAsync(HubDbContext db, Case c, CancellationToken ct)
    {
        var assetIds = c.Assets.Select(a => a.AssetId).ToHashSet();
        var componentIds = c.Components.Select(x => x.ComponentId).ToHashSet();

        // Components hosted on affected assets.
        var hosted = await db.ComponentHosts.AsNoTracking().Where(h => assetIds.Contains(h.AssetId)).Select(h => h.ComponentId).ToListAsync(ct);
        componentIds.UnionWith(hosted);

        // Firewall rules from or to an affected server: the other side and what it hosts are potentially affected too.
        var rules = await db.FirewallRules.AsNoTracking().Where(r => assetIds.Contains(r.SourceAssetId) || assetIds.Contains(r.DestinationAssetId))
            .Select(r => new { r.Id, r.Purpose, r.Ports, r.Protocol, source = r.SourceAsset!.Name, destination = r.DestinationAsset!.Name, r.SourceAssetId, r.DestinationAssetId })
            .ToListAsync(ct);
        var connected = rules.SelectMany(r => new[] { r.SourceAssetId, r.DestinationAssetId }).Where(id => !assetIds.Contains(id)).ToHashSet();
        componentIds.UnionWith(await db.ComponentHosts.AsNoTracking().Where(h => connected.Contains(h.AssetId)).Select(h => h.ComponentId).ToListAsync(ct));

        var components = await db.Components.AsNoTracking().Where(x => componentIds.Contains(x.Id))
            .Select(x => new { x.Id, x.Name, x.Role, x.InstallationId }).ToListAsync(ct);
        var installationIds = components.Select(x => x.InstallationId).ToHashSet();
        var installations = await db.Installations.AsNoTracking().Where(i => installationIds.Contains(i.Id))
            .Select(i => new { i.Id, i.InstanceName, product = i.Product!.Code, i.EnvironmentId, environment = i.Environment!.Name, i.ClientId, client = i.Environment.Client!.Code })
            .ToListAsync(ct);
        var envIds = installations.Select(i => i.EnvironmentId).Concat(c.Environments.Select(e => e.EnvironmentId)).ToHashSet();
        var environments = await db.Environments.AsNoTracking().Where(e => envIds.Contains(e.Id)).Select(e => new { e.Id, e.Name, e.ClientId, client = e.Client!.Code }).ToListAsync(ct);
        return new
        {
            label = Label,
            components,
            installations,
            environments,
            clients = environments.Select(e => new { id = e.ClientId, code = e.client }).Distinct(),
            firewallRules = rules.Select(r => new { r.Id, r.Purpose, r.source, r.destination, r.Ports, r.Protocol })
        };
    }
}
