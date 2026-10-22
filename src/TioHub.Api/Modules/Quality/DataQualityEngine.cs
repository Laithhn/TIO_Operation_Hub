using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Shared;

namespace TioHub.Api.Modules.Quality;

/// <summary>
/// DAT-06 / RDY-03 rule evaluation. Runs in system context over all records; visibility is applied when items are read.
/// Items open when a rule fails and resolve only when the rule no longer fails — a person cannot close an item and so
/// "verify" data that is still unknown. Details never contain restricted technical values.
/// </summary>
public sealed class DataQualityEngine(HubDbContext db, FreshnessService fresh, HubSettings settings, TimeProvider clock, ILogger<DataQualityEngine> log)
{
    public static class Rule
    {
        public const string CountryUnknown = "CountryUnknown";
        public const string MissingOwner = "MissingOwner";
        public const string UnknownEnvironment = "UnknownEnvironment";
        public const string UnknownVersion = "UnknownVersion";
        public const string StaleReview = "StaleReview";
        public const string ConditionNeedsVerification = "ConditionNeedsVerification";
        public const string MissingReviewPolicy = "MissingReviewPolicy";
        public const string UnhostedComponent = "UnhostedComponent";
        public const string MissingSpecification = "MissingSpecification";
        public const string InvalidReference = "InvalidReference";

        public static readonly Dictionary<string, string> Labels = new()
        {
            [CountryUnknown] = "Country unknown (onboarding follow-up)",
            [MissingOwner] = "Missing owner",
            [UnknownEnvironment] = "Unknown environment on case",
            [UnknownVersion] = "Unknown installed version",
            [StaleReview] = "Stale review",
            [ConditionNeedsVerification] = "Condition needs verification",
            [MissingReviewPolicy] = "Missing review policy",
            [UnhostedComponent] = "Component without recorded host",
            [MissingSpecification] = "Missing specification",
            [InvalidReference] = "Invalid or unapproved reference"
        };
    }

    private sealed record Finding(string Rule, string RecordType, long RecordId, long? ClientId, long? EnvironmentId, long? TeamId, string Label, string Detail, long? Coordinator, string NextAction);

    public async Task<(int Opened, int Resolved)> ScanAsync(CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var findings = await EvaluateAsync(now, ct);
        var open = await db.DataQualityItems.Where(i => i.Status == DataQualityStatus.Open).ToListAsync(ct);
        var current = findings.ToDictionary(f => (f.Rule, f.RecordType, f.RecordId));
        var resolved = 0;
        foreach (var item in open)
        {
            if (current.Remove((item.Rule, item.RecordType, item.RecordId), out var f))
            {
                item.Detail = f.Detail;
                item.RecordLabel = f.Label;
                item.ClientId = f.ClientId;
                item.EnvironmentId = f.EnvironmentId;
                item.CoordinatorUserId ??= f.Coordinator;
                continue;
            }
            item.Status = DataQualityStatus.Resolved;
            item.ResolvedAt = now;
            item.ResolutionEvidence = "Rule no longer applies (re-evaluated).";
            resolved++;
        }
        foreach (var f in current.Values)
            db.DataQualityItems.Add(new DataQualityItem
            {
                Rule = f.Rule, RecordType = f.RecordType, RecordId = f.RecordId, ClientId = f.ClientId, EnvironmentId = f.EnvironmentId, TeamId = f.TeamId,
                RecordLabel = Trim(f.Label, 300), Detail = Trim(f.Detail, 1000), CoordinatorUserId = f.Coordinator, NextAction = f.NextAction, OpenedAt = now, Status = DataQualityStatus.Open
            });
        await db.SaveChangesAsync(ct);
        if (current.Count > 0 || resolved > 0) log.LogInformation("Data-quality scan opened {Opened} and resolved {Resolved} items", current.Count, resolved);
        return (current.Count, resolved);
    }

    private static string Trim(string s, int n) => s.Length > n ? s[..n] : s;

    private async Task<List<Finding>> EvaluateAsync(DateTimeOffset now, CancellationToken ct)
    {
        var list = new List<Finding>();
        var policies = await fresh.PoliciesAsync(ct);

        // Missing review policies for reviewable record types (OPS-03).
        foreach (var type in RecordTypes.Reviewable)
            if (!policies.Keys.Any(k => k.Item1 == type))
                list.Add(new(Rule.MissingReviewPolicy, "ReviewPolicy", Array.IndexOf(RecordTypes.Reviewable, type) + 1, null, null, null, type, $"No review policy is configured for {type} records, so their freshness cannot be assessed.", null, "Agree and configure a review policy."));
        if (!policies.ContainsKey((RecordTypes.Environment, ReviewScope.Inventory)))
            list.Add(new(Rule.MissingReviewPolicy, "ReviewPolicy", 100, null, null, null, "Environment inventory", "No inventory review policy for environments.", null, "Configure the inventory review policy."));

        var clients = await db.Clients.AsNoTracking().Select(c => new { c.Id, c.Code, c.Name, c.CountryUnknown, c.CountryFollowUpOwnerId, c.OwnerUserId, c.CoordinatorUserId, c.CreatedAt, c.LastReviewedAt, c.NextReviewAt }).ToListAsync(ct);
        var clientOwner = clients.ToDictionary(c => c.Id, c => c.OwnerUserId);
        foreach (var c in clients)
        {
            var label = $"{c.Code} · {c.Name}";
            if (c.CountryUnknown) list.Add(new(Rule.CountryUnknown, RecordTypes.Client, c.Id, c.Id, null, null, label, "Country is recorded as Unknown during onboarding.", c.CountryFollowUpOwnerId ?? c.OwnerUserId, "Confirm and record the client's country."));
            if (c.OwnerUserId is null) list.Add(new(Rule.MissingOwner, RecordTypes.Client, c.Id, c.Id, null, null, label, "The client has no accountable owner.", c.CoordinatorUserId, "Assign a Client Owner."));
            Stale(list, RecordTypes.Client, ReviewScope.Record, c.Id, c.Id, null, label, c.CreatedAt, c.LastReviewedAt, c.NextReviewAt, c.OwnerUserId, policies, now);
        }

        foreach (var r in await db.Regions.AsNoTracking().Select(r => new { r.Id, r.ClientId, r.Code, r.Name, r.OwnerUserId, r.CreatedAt, r.LastReviewedAt }).ToListAsync(ct))
            Stale(list, RecordTypes.Region, ReviewScope.Record, r.Id, r.ClientId, null, $"{r.Code} · {r.Name}", r.CreatedAt, r.LastReviewedAt, null, r.OwnerUserId ?? clientOwner.GetValueOrDefault(r.ClientId), policies, now);
        foreach (var p in await db.Projects.AsNoTracking().Select(p => new { p.Id, p.ClientId, p.Code, p.Name, p.OwnerUserId, p.CreatedAt, p.LastReviewedAt }).ToListAsync(ct))
            Stale(list, RecordTypes.Project, ReviewScope.Record, p.Id, p.ClientId, null, $"{p.Code} · {p.Name}", p.CreatedAt, p.LastReviewedAt, null, p.OwnerUserId ?? clientOwner.GetValueOrDefault(p.ClientId), policies, now);
        foreach (var ct2 in await db.Contacts.AsNoTracking().Select(x => new { x.Id, x.ClientId, x.Name, x.CreatedAt, x.LastReviewedAt }).ToListAsync(ct))
            Stale(list, RecordTypes.Contact, ReviewScope.Record, ct2.Id, ct2.ClientId, null, ct2.Name, ct2.CreatedAt, ct2.LastReviewedAt, null, clientOwner.GetValueOrDefault(ct2.ClientId), policies, now);

        var envs = await db.Environments.AsNoTracking().Select(e => new { e.Id, e.ClientId, e.Name, clientCode = e.Client!.Code, e.OwnerUserId, e.CoordinatorUserId, e.CreatedAt, e.LastReviewedAt, e.InventoryReviewedAt, e.NextReviewAt, e.Condition, e.ConditionObservedAt }).ToListAsync(ct);
        var conditionPolicy = policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition));
        foreach (var e in envs)
        {
            var label = $"{e.clientCode} · {e.Name}";
            var coord = e.OwnerUserId ?? e.CoordinatorUserId ?? clientOwner.GetValueOrDefault(e.ClientId);
            if (e.OwnerUserId is null) list.Add(new(Rule.MissingOwner, RecordTypes.Environment, e.Id, e.ClientId, e.Id, null, label, "No technical owner: recorded as an assignment gap.", coord, "Assign the technical owner."));
            Stale(list, RecordTypes.Environment, ReviewScope.Inventory, e.Id, e.ClientId, e.Id, label, e.CreatedAt, e.InventoryReviewedAt, e.NextReviewAt, coord, policies, now);
            var cond = EnvironmentEndpoints.ConditionView(e.Condition, e.ConditionObservedAt, conditionPolicy, now);
            if (cond.NeedsVerification) list.Add(new(Rule.ConditionNeedsVerification, RecordTypes.Environment, e.Id, e.ClientId, e.Id, null, label, $"Last reported {e.Condition} on {e.ConditionObservedAt:yyyy-MM-dd}; evidence is older than the condition review period.", coord, "Record a current condition report with evidence."));
        }
        var envOwner = envs.ToDictionary(e => e.Id, e => e.OwnerUserId ?? e.CoordinatorUserId ?? clientOwner.GetValueOrDefault(e.ClientId));

        foreach (var i in await db.Installations.AsNoTracking().Select(i => new { i.Id, i.ClientId, i.EnvironmentId, i.InstanceName, product = i.Product!.Code, i.ProductVersionId, i.OwnerUserId, i.CreatedAt, i.LastReviewedAt }).ToListAsync(ct))
        {
            var label = $"{i.product} · {i.InstanceName}";
            var coord = i.OwnerUserId ?? envOwner.GetValueOrDefault(i.EnvironmentId);
            if (i.ProductVersionId is null) list.Add(new(Rule.UnknownVersion, RecordTypes.Installation, i.Id, i.ClientId, i.EnvironmentId, null, label, "Installed version is Unknown.", coord, "Confirm the installed version with evidence."));
            Stale(list, RecordTypes.Installation, ReviewScope.Record, i.Id, i.ClientId, i.EnvironmentId, label, i.CreatedAt, i.LastReviewedAt, null, coord, policies, now);
        }

        foreach (var a in await db.Assets.AsNoTracking().Select(a => new { a.Id, a.ClientId, a.EnvironmentId, a.Name, a.TypeCategory, a.OwnerUserId, a.TechnicalOwnerName, a.CoordinatorUserId, a.CpuQuantity, a.RamQuantity, a.OsFamily, a.CreatedAt, a.VerifiedAt }).ToListAsync(ct))
        {
            var coord = a.OwnerUserId ?? a.CoordinatorUserId ?? envOwner.GetValueOrDefault(a.EnvironmentId);
            if (a.OwnerUserId is null && a.TechnicalOwnerName is null) list.Add(new(Rule.MissingOwner, RecordTypes.Asset, a.Id, a.ClientId, a.EnvironmentId, null, a.Name, "No technical owner recorded.", coord, "Assign the asset owner."));
            if (a.TypeCategory != AssetType.LogicalEndpoint && (a.CpuQuantity is null || a.RamQuantity is null || a.OsFamily is null))
                list.Add(new(Rule.MissingSpecification, RecordTypes.Asset, a.Id, a.ClientId, a.EnvironmentId, null, a.Name,
                    "Unknown: " + string.Join(", ", new[] { a.CpuQuantity is null ? "CPU" : null, a.RamQuantity is null ? "RAM" : null, a.OsFamily is null ? "OS" : null }.OfType<string>()) + ".", coord, "Obtain the specification from the source owner."));
            Stale(list, RecordTypes.Asset, ReviewScope.Record, a.Id, a.ClientId, a.EnvironmentId, a.Name, a.CreatedAt, a.VerifiedAt, null, coord, policies, now);
        }

        foreach (var c in await db.Components.AsNoTracking().Where(c => !c.Hosts.Any()).Select(c => new { c.Id, c.ClientId, c.EnvironmentId, c.Name, c.OwnerUserId, c.CoordinatorUserId }).ToListAsync(ct))
            list.Add(new(Rule.UnhostedComponent, RecordTypes.Component, c.Id, c.ClientId, c.EnvironmentId, null, c.Name, "No supporting server is recorded for this component.", c.OwnerUserId ?? c.CoordinatorUserId ?? envOwner.GetValueOrDefault(c.EnvironmentId), "Record the hosting assets or confirm they are unknown."));
        foreach (var c in await db.Components.AsNoTracking().Where(c => c.OwnerUserId == null && c.CoordinatorUserId == null).Select(c => new { c.Id, c.ClientId, c.EnvironmentId, c.Name }).ToListAsync(ct))
            list.Add(new(Rule.MissingOwner, RecordTypes.Component, c.Id, c.ClientId, c.EnvironmentId, null, c.Name, "No owner or coordinator recorded.", envOwner.GetValueOrDefault(c.EnvironmentId), "Assign the component owner."));


        foreach (var c in await db.Cases.AsNoTracking().Where(c => c.UnknownEnvironmentReason != null && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled)
            .Select(c => new { c.Id, c.ClientId, c.ResponsibleTeamId, c.Ref, c.Title, c.OwnerUserId, c.CoordinatorUserId }).ToListAsync(ct))
            list.Add(new(Rule.UnknownEnvironment, RecordTypes.Case, c.Id, c.ClientId, null, c.ClientId is null ? c.ResponsibleTeamId : null, $"{c.Ref} · {c.Title}", "The affected environment is not yet identified.", c.OwnerUserId ?? c.CoordinatorUserId, "Identify the affected environment."));

        // A52: document references were removed from the application, so their link check no longer runs (open items resolve on the next scan).
        return list;
    }

    private static void Stale(List<Finding> list, string type, ReviewScope scope, long id, long? clientId, long? envId, string label, DateTimeOffset created, DateTimeOffset? last, DateTimeOffset? next, long? coord,
        Dictionary<(string, ReviewScope), ReviewPolicy> policies, DateTimeOffset now)
    {
        var policy = policies.GetValueOrDefault((type, scope));
        if (policy is null) return; // reported once per type as MissingReviewPolicy
        var f = FreshnessService.Evaluate(policy, created, last, next, now);
        if (f.State == FreshnessState.Stale)
            list.Add(new(Rule.StaleReview, type, id, clientId, envId, null, label,
                $"{scope} review {(last is null ? "never recorded" : $"last {last:yyyy-MM-dd}")}; {f.Rule.ToLowerInvariant()}.", coord, $"Perform a meaningful {scope.ToString().ToLowerInvariant()} review."));
    }
}

/// <summary>Re-evaluates data-quality rules periodically in system context.</summary>
public sealed class DataQualityScanner(IServiceScopeFactory scopes, IConfiguration config, ILogger<DataQualityScanner> log) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var minutes = config.GetValue("Quality:ScanMinutes", 5);
        if (minutes <= 0) return;
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                await scope.ServiceProvider.GetRequiredService<DataQualityEngine>().ScanAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogError(ex, "Data-quality scan failed");
            }
            await Task.Delay(TimeSpan.FromMinutes(minutes), stoppingToken);
        }
    }
}
