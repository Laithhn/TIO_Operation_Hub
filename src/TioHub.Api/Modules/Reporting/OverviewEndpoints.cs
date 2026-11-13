using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Firewall;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>Client 360 (CLI-03, REG-05) and Environment 360 (ENV-03, DAS-02). Regions appear only where they exist; no unexplained health score.</summary>
public static class OverviewEndpoints
{
    public static void MapOverviewEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/clients/{id:long}/overview", async (long id, string? tab, long? regionId, HubDbContext db, HubAccess access, FreshnessService fresh, CancellationToken ct) =>
        {
            var section = (tab ?? "structure").ToLowerInvariant();
            access.Me.RequireRight(RightKeys.Tab("ClientStructure", section, "View"));
            RightChecks.RequireViews(access.Me, RightChecks.ClientTabViews(section));
            if (!access.Me.SeesClient(id)) throw new NotFoundException("The client");
            var c = await db.Clients.AsNoTracking().Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            var now = DateTimeOffset.UtcNow;
            var policies = await fresh.PoliciesAsync(ct);
            var fullClientScope = access.Me.HasClient(id);
            // Project-only users need labels for the regions of their visible environments, not
            // client-wide region records or owners. Keep the archive filter and constrain IDs
            // using environments already filtered by their project scope.
            var permittedRegionIds = fullClientScope ? [] : await db.Environments.AsNoTracking()
                .Where(e => e.ClientId == id && e.RegionId != null).Select(e => e.RegionId!.Value).Distinct().ToArrayAsync(ct);
            var regionQuery = fullClientScope ? db.Regions.AsNoTracking() : db.Regions.IgnoreQueryFilters([HubDbContext.ScopeFilter]).AsNoTracking().Where(r => permittedRegionIds.Contains(r.Id));
            var regions = await regionQuery.Where(r => r.ClientId == id).OrderBy(r => r.Code)
                .Select(r => new { r.Id, r.Code, r.Name, owner = fullClientScope && r.Owner != null ? r.Owner.DisplayName : null }).ToListAsync(ct);
            var envQuery = db.Environments.AsNoTracking().Where(e => e.ClientId == id);
            if (regionId is not null) envQuery = envQuery.Where(e => e.RegionId == regionId);
            var envs = await envQuery.OrderBy(e => e.Name).Select(e => new
            {
                e.Id, e.Name, e.Type, e.Criticality, e.RegionId, e.Condition, e.ConditionObservedAt, e.InventoryReviewedAt, e.CreatedAt, e.NextReviewAt,
                owner = e.Owner == null ? null : new UserRef(e.Owner.Id, e.Owner.DisplayName, e.Owner.IsActive),
                hasBackup = e.BackupOwnerUserId != null && e.BackupOwner!.IsActive,
                installations = db.Installations.Where(i => i.EnvironmentId == e.Id).Select(i => new { i.Id, i.InstanceName, product = i.Product!.Code, version = i.ProductVersion == null ? null : i.ProductVersion.Version }).ToList(),
                assetCount = db.Assets.Count(a => a.EnvironmentId == e.Id),
                openCases = db.CaseEnvironments.Count(ce => ce.EnvironmentId == e.Id && db.Cases.Any(x => x.Id == ce.CaseId && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled))
            }).ToListAsync(ct);
            var condPolicy = policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition));
            var invPolicy = policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Inventory));
            var envView = envs.Select(e => new
            {
                e.Id, e.Name, e.Type, e.Criticality, e.RegionId, e.owner, e.hasBackup,
                installations = access.Me.HasRight(RightKeys.Installations, RightKeys.View) && access.Me.HasRight(RightKeys.Products, RightKeys.View) ? e.installations : null,
                assetCount = access.Me.HasRight(RightKeys.Servers, RightKeys.View) ? (int?)e.assetCount : null,
                openCases = access.Me.HasRight(RightKeys.Cases, RightKeys.View) ? (int?)e.openCases : null,
                condition = EnvironmentEndpoints.ConditionView(e.Condition, e.ConditionObservedAt, condPolicy, now),
                inventoryFreshness = FreshnessService.Evaluate(invPolicy, e.CreatedAt, e.InventoryReviewedAt, e.NextReviewAt, now)
            }).ToList();
            var envIds = envs.Select(e => e.Id).ToList();
            var assets = await db.Assets.AsNoTracking().Where(a => envIds.Contains(a.EnvironmentId)).Select(a => new { a.Id, a.TypeCategory, a.Lifecycle, a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.VerifiedAt }).ToListAsync(ct);
            var assetIds = assets.Select(a => a.Id).ToList();
            var volumes = await db.Volumes.AsNoTracking().Where(v => assetIds.Contains(v.AssetId)).Select(v => new { v.Capacity, v.Unit, v.SharedStorageId }).ToListAsync(ct);
            var sharedIds = volumes.Where(v => v.SharedStorageId != null).Select(v => v.SharedStorageId!.Value).Distinct().ToList();
            var shared = await db.SharedStorages.AsNoTracking().Where(s => sharedIds.Contains(s.Id)).Select(s => new { s.Id, s.Capacity, s.Unit }).ToListAsync(ct);
            var infra = InventoryEndpoints.Summarize(
                assets.Select(a => new InventoryEndpoints.AssetFacts(a.TypeCategory, a.Lifecycle, a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.VerifiedAt)).ToList(),
                volumes.Select(v => new InventoryEndpoints.VolumeFacts(v.Capacity, v.Unit, v.SharedStorageId)).ToList(),
                shared.Select(s => new InventoryEndpoints.SharedFacts(s.Id, s.Capacity, s.Unit)).ToList());
            var cases = await db.Cases.AsNoTracking().Where(x => x.ClientId == id && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled)
                .Where(x => regionId == null || x.Environments.Any(ce => envIds.Contains(ce.EnvironmentId)))
                .OrderBy(x => x.DueAt == null).ThenBy(x => x.DueAt)
                .Select(x => new { x.Id, x.Ref, x.Title, x.Status, x.StatusCode, x.Priority, owner = x.Owner == null ? "Unassigned" : x.Owner.DisplayName, x.DueAt, overdue = x.DueAt != null && x.DueAt < now, x.WaitingReason, x.NextAction })
                .ToListAsync(ct);
            var commitments = await db.Commitments.AsNoTracking().Where(x => x.ClientId == id && x.Status == CommitmentStatus.Open).OrderBy(x => x.CurrentDueAt)
                .Select(x => new { x.Id, x.Ref, x.Title, x.Description, x.Type, x.CurrentDueAt, x.TimeZone, overdue = x.CurrentDueAt < now, owner = x.Owner == null ? null : x.Owner.DisplayName }).ToListAsync(ct);
            var projects = access.Me.HasRight(RightKeys.Projects, RightKeys.View)
                ? await db.Projects.AsNoTracking().Where(x => x.ClientId == id).OrderBy(x => x.Name)
                    .Select(x => new { x.Id, x.Code, x.Name, x.Status, owner = x.Owner == null ? null : x.Owner.DisplayName, x.ServiceStart, x.ServiceEnd }).ToListAsync(ct)
                : [];
            var full = access.Me.HasClient(id);
            var contacts = full ? await db.Contacts.AsNoTracking().Where(x => x.ClientId == id).OrderBy(x => x.Name).Select(x => new { x.Id, x.Name, x.Role, x.Organization, x.Email, x.Phone, x.AuthorizedSupport }).ToListAsync(ct) : null;
            var boundaries = full ? await db.Boundaries.AsNoTracking().Where(x => x.ClientId == id).OrderBy(x => x.Area).Select(b => new { b.Id, b.Area, b.Party, b.Organization, b.EnvironmentId, b.CoordinatorUserId, coordinator = b.Coordinator == null ? null : b.Coordinator.DisplayName,
                responsibleUser = b.ResponsibleUser == null ? null : b.ResponsibleUser.DisplayName, b.ResponsibleUserId,
                    person = b.PersonName == null ? null : new { name = b.PersonName, title = b.PersonTitle, organization = b.Organization, phone = b.PersonPhone, mobile = b.PersonMobile, email = b.PersonEmail }, b.Notes, version = Convert.ToBase64String(b.RowVersion) }).ToListAsync(ct) : null;
            var documents = await db.DocumentReferences.AsNoTracking().Where(d => d.ClientId == id).OrderBy(d => d.Title).Select(d => new { d.Id, d.RecordType, d.RecordId, d.Kind, d.Title, d.Reference }).ToListAsync(ct);
            var dq = await db.DataQualityItems.AsNoTracking().Where(i => i.ClientId == id && i.Status == DataQualityStatus.Open).GroupBy(i => i.Rule).Select(g => new { rule = g.Key, count = g.Count() }).ToListAsync(ct);
            var gaps = new List<string>();
            if (c.CountryUnknown) gaps.Add("Country is Unknown (onboarding follow-up assigned).");
            gaps.AddRange(envView.Where(e => e.owner is null).Select(e => $"{e.Name}: no technical owner."));
            gaps.AddRange(envView.Where(e => !e.hasBackup).Select(e => $"{e.Name}: no active backup owner (coverage gap)."));
            gaps.AddRange(envView.Where(e => e.installations?.Any(i => i.version is null) == true).Select(e => $"{e.Name}: installation with unknown version."));
            var structureTab = section == "structure";
            var casesTab = section == "cases";
            var commitmentsTab = section == "commitments";
            var projectsTab = section == "projects";
            var contactsTab = section == "contacts";
            var infraTab = section == "infra";
            var canViewStructure = fullClientScope && access.Me.HasRight(RightKeys.Structure, RightKeys.View);
            return Results.Ok(new
            {
                client = new
                {
                    c.Id, c.Code, c.Name, c.Country, c.Status,
                    countryUnknown = canViewStructure && c.CountryUnknown,
                    owner = canViewStructure && c.Owner != null ? new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive) : null,
                    lastReviewedAt = canViewStructure ? c.LastReviewedAt : null
                },
                structure = structureTab ? (regions.Count == 0 ? "Direct" : envView.Any(e => e.RegionId is null) ? "Regional and direct" : "Regional") : null,
                regions = structureTab ? regions.Select(r => new { r.Id, r.Code, r.Name, r.owner, environments = envView.Where(e => e.RegionId == r.Id) }) : [],
                directEnvironments = structureTab ? envView.Where(e => e.RegionId is null) : [],
                counts = new
                {
                    environments = structureTab && access.Me.HasRight(RightKeys.Environments, RightKeys.View) ? envView.Count : 0,
                    installations = structureTab && access.Me.HasRight(RightKeys.Installations, RightKeys.View) && access.Me.HasRight(RightKeys.Products, RightKeys.View) ? envView.Sum(e => e.installations?.Count ?? 0) : 0,
                    environmentsWithInstallations = structureTab && access.Me.HasRight(RightKeys.Installations, RightKeys.View) && access.Me.HasRight(RightKeys.Products, RightKeys.View) ? envView.Count(e => (e.installations?.Count ?? 0) > 0) : 0,
                    openCases = casesTab ? cases.Count : 0, overdueCases = casesTab ? cases.Count(x => x.overdue) : 0,
                    openCommitments = commitmentsTab ? commitments.Count : 0, overdueCommitments = commitmentsTab ? commitments.Count(x => x.overdue) : 0
                },
                infrastructure = infraTab ? infra : null,
                cases = casesTab ? cases : [], commitments = commitmentsTab ? commitments : [],
                projects = (projectsTab || section == "organizations") && access.Me.HasRight(RightKeys.Projects, RightKeys.View) ? projects : [],
                contacts = contactsTab ? contacts : null, boundaries = contactsTab ? boundaries : null, personalDataRestricted = !full,
                documents = Array.Empty<object>(), dataQuality = Array.Empty<object>(), gaps = Array.Empty<string>(),
                changeRecords = (object?)null
            });
        }).WithTags("Clients");

        api.MapGet("/environments/{id:long}/overview", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var e = await db.Environments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The environment");
            bool CanTab(string tab) => access.Me.HasRight(RightKeys.Tab("Environments", tab));
            if (!new[] { "apps", "assets", "work", "network", "quality" }.Any(CanTab))
                throw new ForbiddenException("No environment overview section is granted.");
            var tech = access.Me.SeesTechnical && CanTab("network");
            var installations = await db.Installations.AsNoTracking().Where(i => i.EnvironmentId == id).OrderBy(i => i.Product!.Code).ThenBy(i => i.InstanceName)
                .Select(i => new
                {
                    i.Id, i.InstanceName, product = i.Product!.Code, module = i.Module == null ? null : i.Module.Code, version = i.ProductVersion == null ? null : i.ProductVersion.Version, i.DeployedOn, i.LastReviewedAt,
                    components = db.Components.Where(c => c.InstallationId == i.Id).OrderBy(c => c.Role).Select(c => new { c.Id, c.Name, c.Role, c.ComponentVersion, hosts = c.Hosts.Select(h => new { h.AssetId, h.Asset!.Name, h.Asset.Type }) }).ToList()
                }).ToListAsync(ct);
            var assets = await db.Assets.AsNoTracking().Where(a => a.EnvironmentId == id).OrderBy(a => a.Name)
                .Select(a => new
                {
                    a.Id, a.Name, a.Type, a.Role, a.Lifecycle, a.ProjectPhase, networkZone = tech ? a.NetworkZone : null, ipAddress = tech ? a.IpAddress : null, a.CpuQuantity, a.CpuUnit, a.RamQuantity, a.RamUnit, a.OsFamily, a.OsVersion, a.VerifiedAt,
                    owner = a.Owner == null ? null : a.Owner.DisplayName,
                    volumes = a.Volumes.Where(v => v.ArchivedAt == null).Select(v => new { v.Id, v.Label, v.Capacity, v.Unit, v.Purpose, shared = v.SharedStorage == null ? null : v.SharedStorage.Name }),
                    components = a.Hosts.Select(h => new { h.ComponentId, h.Component!.Name, h.Component.Role })
                }).ToListAsync(ct);
            var cases = await db.Cases.AsNoTracking().Where(c => c.Environments.Any(ce => ce.EnvironmentId == id) && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled)
                .Select(c => new { c.Id, c.Ref, c.Title, c.Status, c.StatusCode, c.Priority, owner = c.Owner == null ? "Unassigned" : c.Owner.DisplayName, c.DueAt, c.NextAction }).ToListAsync(ct);
            var caseIds = cases.Select(c => c.Id).ToList();
            var commitments = await db.Commitments.AsNoTracking().Where(m => m.Status == CommitmentStatus.Open && ((m.CaseId != null && caseIds.Contains(m.CaseId.Value)) || (e.ProjectId != null && m.ProjectId == e.ProjectId)))
                .Select(m => new { m.Id, m.Ref, m.Description, m.CurrentDueAt, m.TimeZone }).ToListAsync(ct);
            var firewallRuleCount = tech && access.Me.HasRight(RightKeys.Other, RightKeys.View) && access.Me.HasRight(RightKeys.Servers, RightKeys.View) ? await FirewallEndpoints.VisibleRules(db).CountAsync(x => x.EnvironmentId == id || x.DestinationAsset!.EnvironmentId == id, ct) : 0;
            var boundaries = await db.Boundaries.AsNoTracking().Where(b => b.EnvironmentId == id || (b.ClientId == e.ClientId && b.EnvironmentId == null))
                .Select(b => new { b.Id, b.Area, b.Party, b.Organization, environmentSpecific = b.EnvironmentId != null, coordinator = b.Coordinator == null ? null : b.Coordinator.DisplayName,
                    responsibleUser = b.ResponsibleUser == null ? null : b.ResponsibleUser.DisplayName, b.ResponsibleUserId,
                    person = b.PersonName == null ? null : new { name = b.PersonName, title = b.PersonTitle, organization = b.Organization, phone = b.PersonPhone, mobile = b.PersonMobile, email = b.PersonEmail } }).ToListAsync(ct);
            var documents = await db.DocumentReferences.AsNoTracking().Where(d => d.EnvironmentId == id).Select(d => new { d.Id, d.RecordType, d.Kind, d.Title, d.Reference }).ToListAsync(ct);
            var reviews = await db.Reviews.AsNoTracking().Where(r => r.RecordType == RecordTypes.Environment && r.RecordId == id).OrderByDescending(r => r.ReviewedAt).Take(20)
                .Select(r => new { r.Scope, r.Note, r.Evidence, r.ReviewedAt, reviewer = r.Reviewer == null ? null : r.Reviewer.DisplayName }).ToListAsync(ct);
            var dq = await db.DataQualityItems.AsNoTracking().Where(i => i.EnvironmentId == id && i.Status == DataQualityStatus.Open)
                .Select(i => new { i.Id, i.Rule, i.RecordType, i.RecordLabel, i.Detail, i.NextAction }).ToListAsync(ct);
            return Results.Ok(new
            {
                installations = CanTab("apps") ? installations : [], assets = CanTab("assets") ? assets : [],
                cases = CanTab("work") ? cases : [], commitments = CanTab("work") ? commitments : [], boundaries = CanTab("work") ? boundaries : [],
                documents = Array.Empty<object>(), reviews = Array.Empty<object>(), dataQuality = CanTab("quality") ? dq : [],
                network = new { firewallRuleCount, detailRestricted = !tech },
                technicalRestricted = !tech,
                impactNote = "Infrastructure is recorded documentation, not live monitoring."
            });
        }).WithTags("Environments");
    }
}
