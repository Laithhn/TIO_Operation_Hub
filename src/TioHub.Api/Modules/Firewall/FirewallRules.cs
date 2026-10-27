using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Firewall;

/// <summary>
/// A35 (owner request, 20 Oct 2026): firewall rules replace network endpoints and dependencies. A rule records an allowed communication
/// between two servers of the same client: source, destination, ports, protocol, direction and purpose. Recorded configuration, not a live
/// firewall export. Technical detail: reading and editing need the Technical detail right.
/// </summary>
public class FirewallRule : Entity, IClientOwned
{
    public long ClientId { get; set; }
    /// <summary>The source server's environment (for lists per environment).</summary>
    public long EnvironmentId { get; set; }
    public long SourceAssetId { get; set; }
    public Asset? SourceAsset { get; set; }
    public long DestinationAssetId { get; set; }
    public Asset? DestinationAsset { get; set; }
    /// <summary>Comma-separated ports or ranges, e.g. "443, 8080-8090". Empty for ICMP or Any.</summary>
    public string? Ports { get; set; }
    public FirewallProtocol Protocol { get; set; } = FirewallProtocol.TCP;
    public FlowDirection Direction { get; set; } = FlowDirection.OneWay;
    public string Purpose { get; set; } = "";
    public string? Notes { get; set; }
    public long? ScopeClientId => ClientId;
}

public enum FirewallProtocol { TCP, UDP, TCPandUDP, ICMP, Any }

public static partial class FirewallEndpoints
{
    public sealed record RuleInput(long? SourceAssetId, long? DestinationAssetId, string? Ports, FirewallProtocol? Protocol, FlowDirection? Direction, string? Purpose, string? Notes);

    [GeneratedRegex(@"^\s*(\d{1,5})(\s*-\s*(\d{1,5}))?\s*$")]
    private static partial Regex PortPart();

    /// <summary>Normalises "443,8080 - 8090" to "443, 8080-8090"; null when invalid.</summary>
    public static string? NormalizePorts(string? ports)
    {
        if (string.IsNullOrWhiteSpace(ports)) return "";
        var parts = new List<string>();
        foreach (var raw in ports.Split(',', StringSplitOptions.RemoveEmptyEntries))
        {
            var m = PortPart().Match(raw);
            if (!m.Success) return null;
            var a = int.Parse(m.Groups[1].Value);
            var b = m.Groups[3].Success ? int.Parse(m.Groups[3].Value) : a;
            if (a < 1 || b > 65535 || b < a) return null;
            parts.Add(a == b ? $"{a}" : $"{a}-{b}");
        }
        return string.Join(", ", parts);
    }

    public static IQueryable<FirewallRule> Filter(IQueryable<FirewallRule> q, long? clientId, long? environmentId, long? assetId, FirewallProtocol? protocol, string? text)
    {
        if (clientId is not null) q = q.Where(r => r.ClientId == clientId);
        if (environmentId is not null) q = q.Where(r => r.EnvironmentId == environmentId || r.DestinationAsset!.EnvironmentId == environmentId);
        if (assetId is not null) q = q.Where(r => r.SourceAssetId == assetId || r.DestinationAssetId == assetId);
        if (protocol is not null) q = q.Where(r => r.Protocol == protocol);
        if (!string.IsNullOrWhiteSpace(text))
            q = q.Where(r => r.Purpose.Contains(text) || r.SourceAsset!.Name.Contains(text) || r.DestinationAsset!.Name.Contains(text) || (r.Ports != null && r.Ports.Contains(text)));
        return q;
    }

    public static void MapFirewallEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/firewall-rules").WithTags("Firewall rules");

        g.MapGet("", async (long? clientId, long? environmentId, long? assetId, FirewallProtocol? protocol, string? q, string? sort, int? page, int? pageSize,
            HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            access.Me.RequireGrant(Grant.TechnicalDetail);
            var query = Filter(db.FirewallRules.AsNoTracking(), clientId, environmentId, assetId, protocol, q);
            var keys = new Dictionary<string, Expression<Func<FirewallRule, object?>>>
            {
                ["source"] = r => r.SourceAsset!.Name, ["destination"] = r => r.DestinationAsset!.Name, ["protocol"] = r => r.Protocol,
                ["ports"] = r => r.Ports, ["purpose"] = r => r.Purpose, ["client"] = r => r.SourceAsset!.Environment!.Client!.Code
            };
            return Results.Ok(await query.SortBy(sort, keys, "source").Select(r => new
            {
                r.Id, r.ClientId, clientCode = r.SourceAsset!.Environment!.Client!.Code,
                source = new { id = r.SourceAssetId, r.SourceAsset.Name, environmentId = r.SourceAsset.EnvironmentId, environment = r.SourceAsset.Environment.Name },
                destination = new { id = r.DestinationAssetId, r.DestinationAsset!.Name, environmentId = r.DestinationAsset.EnvironmentId, environment = r.DestinationAsset.Environment!.Name },
                r.Ports, r.Protocol, r.Direction, r.Purpose, r.Notes, version = Convert.ToBase64String(r.RowVersion)
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        g.MapPost("", async (RuleInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var r = new FirewallRule();
            await ApplyAsync(r, input, db, access, ct);
            db.FirewallRules.Add(r);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/firewall-rules/{r.Id}", new { r.Id });
        });

        g.MapPut("/{id:long}", async (long id, RuleInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var r = await db.FirewallRules.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The firewall rule");
            db.ExpectVersion(ctx, r);
            await ApplyAsync(r, input, db, access, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapDelete("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var r = await db.FirewallRules.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The firewall rule");
            access.Me.RequireGrant(Grant.TechnicalDetail);
            access.RequireMaintain(ResourcePermissions.Other, r.ClientId, null);
            // Deleted straight from the table: no version check (nothing else changes on a rule while it is removed).
            db.FirewallRules.Remove(r);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    private static async Task ApplyAsync(FirewallRule r, RuleInput i, HubDbContext db, HubAccess access, CancellationToken ct)
    {
        access.Me.RequireGrant(Grant.TechnicalDetail);
        var check = new Check()
            .When(i.SourceAssetId is null, "sourceAssetId", "Select the source server.")
            .When(i.DestinationAssetId is null, "destinationAssetId", "Select the destination server.")
            .When(i.SourceAssetId is not null && i.SourceAssetId == i.DestinationAssetId, "destinationAssetId", "Source and destination must be different servers.")
            .Text("purpose", i.Purpose, 500, "the purpose", required: true).Text("notes", i.Notes, 2000, "Notes");
        var protocol = i.Protocol ?? FirewallProtocol.TCP;
        var ports = NormalizePorts(i.Ports);
        if (ports is null) check.Add("ports", "Enter ports as numbers or ranges between 1 and 65535, separated by commas (for example 443, 8080-8090).");
        else if (ports.Length == 0 && protocol is FirewallProtocol.TCP or FirewallProtocol.UDP or FirewallProtocol.TCPandUDP) check.Add("ports", "Enter the port(s) for TCP or UDP.");
        else if (ports.Length > 200) check.Add("ports", "Keep the port list under 200 characters; split it into several rules.");
        var servers = await db.Assets.Where(a => a.Id == i.SourceAssetId || a.Id == i.DestinationAssetId).Select(a => new { a.Id, a.ClientId, a.EnvironmentId }).ToListAsync(ct);
        var src = servers.FirstOrDefault(a => a.Id == i.SourceAssetId);
        var dst = servers.FirstOrDefault(a => a.Id == i.DestinationAssetId);
        if (i.SourceAssetId is not null && src is null) check.Add("sourceAssetId", "Select a server you can access.");
        if (i.DestinationAssetId is not null && dst is null) check.Add("destinationAssetId", "Select a server you can access.");
        if (src is not null && dst is not null && src.ClientId != dst.ClientId) check.Add("destinationAssetId", "Both servers must belong to the same client.");
        check.ThrowIfAny();
        access.RequireMaintain(ResourcePermissions.Other, src!.ClientId, null);
        r.ClientId = src.ClientId;
        r.EnvironmentId = src.EnvironmentId;
        r.SourceAssetId = src.Id;
        r.DestinationAssetId = dst!.Id;
        r.Ports = ports!.Length == 0 ? null : ports;
        r.Protocol = protocol;
        r.Direction = i.Direction ?? FlowDirection.OneWay;
        r.Purpose = i.Purpose!.Trim();
        r.Notes = Text.Clean(i.Notes);
    }
}

