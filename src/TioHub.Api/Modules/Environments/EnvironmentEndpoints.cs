using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Environments;

public static class EnvironmentEndpoints
{
    public sealed record EnvironmentInput(long? ClientId, long? RegionId, long? ProjectId, string? Name, string? Type, string? TypeDescription,
        HostingType? Hosting, string? Location, Criticality? Criticality, long? OwnerUserId, long? BackupOwnerUserId, string? BackupGapReason,
        ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization, long? ResponsibleTeamId, long? CoordinatorUserId, string? Description,
        DateTimeOffset? NextReviewAt, string? RegionChangeReason);

    public sealed record ConditionInput(Condition? Condition, string? Reason, string? Evidence, DateTimeOffset? ObservedAt);

    public static void MapEnvironmentEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/environments").WithTags("Environments");

        g.MapGet("", async (long? clientId, long? regionId, bool? direct, string? country, string? type, Criticality? criticality, Condition? condition,
            long? ownerId, long? productId, string? q, string? freshness, string? sort, int? page, int? pageSize,
            HubDbContext db, HubAccess access, FreshnessService fresh, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var query = db.Environments.AsNoTracking().AsQueryable();
            query = query.Where(e => db.Clients.Any(c => c.Id == e.ClientId));
            if (clientId is not null) query = query.Where(e => e.ClientId == clientId);
            if (regionId is not null) query = query.Where(e => e.RegionId == regionId);
            if (direct == true) query = query.Where(e => e.RegionId == null);
            if (!string.IsNullOrWhiteSpace(country)) query = country == "Unknown" ? query.Where(e => e.Client!.CountryUnknown) : query.Where(e => e.Client!.Country == country);
            if (type is not null) query = query.Where(e => e.Type == type);
            if (criticality is not null) query = query.Where(e => e.Criticality == criticality);
            if (condition is not null) query = query.Where(e => e.Condition == condition);
            if (ownerId is not null) query = query.Where(e => e.OwnerUserId == ownerId || e.BackupOwnerUserId == ownerId);
            if (productId is not null) query = query.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == productId));
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(e => e.Name.Contains(q) || e.Client!.Name.Contains(q) || e.Client.Code.Contains(q));
            var keys = new Dictionary<string, Expression<Func<ClientEnvironment, object?>>>
            {
                ["name"] = e => e.Name, ["client"] = e => e.Client!.Name, ["region"] = e => e.Region!.Code, ["type"] = e => e.Type, ["criticality"] = e => e.Criticality, ["condition"] = e => e.Condition
            };
            var rows = await query.SortBy(sort, keys, "client").Select(e => new
            {
                e.Id, e.Name, e.Type, e.Criticality, e.Condition, e.ConditionObservedAt, e.Hosting, e.ClientId, clientCode = e.Client!.Code, clientName = e.Client.Name,
                country = e.Client.CountryUnknown ? "Unknown" : e.Client.Country,
                e.RegionId, regionCode = e.Region == null ? null : e.Region.Code, regionName = e.Region == null ? null : e.Region.Name,
                owner = e.Owner == null ? null : new UserRef(e.Owner.Id, e.Owner.DisplayName, e.Owner.IsActive),
                backupOwner = e.BackupOwner == null ? null : new UserRef(e.BackupOwner.Id, e.BackupOwner.DisplayName, e.BackupOwner.IsActive),
                e.BackupGapReason, e.CreatedAt, e.InventoryReviewedAt, e.NextReviewAt,
                installationCount = db.Installations.Count(i => i.EnvironmentId == e.Id),
                assetCount = db.Assets.Count(a => a.EnvironmentId == e.Id),
                openCases = db.CaseEnvironments.Count(ce => ce.EnvironmentId == e.Id && db.Cases.Any(c => c.Id == ce.CaseId && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled))
            }).ToListAsync(ct);
            var policies = await fresh.PoliciesAsync(ct);
            var now = DateTimeOffset.UtcNow;
            var enriched = rows.Select(e => new
            {
                e.Id, e.Name, e.Type, e.Criticality, e.Hosting, e.ClientId, e.clientCode, e.clientName, e.country, e.RegionId, e.regionCode, e.regionName,
                e.owner, e.backupOwner, e.BackupGapReason, e.installationCount, e.assetCount, e.openCases,
                condition = ConditionView(e.Condition, e.ConditionObservedAt, policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition)), now),
                inventoryFreshness = FreshnessService.Evaluate(policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Inventory)), e.CreatedAt, e.InventoryReviewedAt, e.NextReviewAt, now)
            }).ToList();
            if (freshness == "stale") enriched = enriched.Where(e => e.inventoryFreshness.State == FreshnessState.Stale).ToList();
            if (freshness == "needsVerification") enriched = enriched.Where(e => e.condition.NeedsVerification).ToList();
            var p = PageQuery.From(page, pageSize);
            return Results.Ok(new Paged<object>(enriched.Skip((p.Page - 1) * p.PageSize).Take(p.PageSize).Cast<object>().ToList(), p.Page, p.PageSize, enriched.Count));
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, FreshnessService fresh, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var e = await db.Environments.AsNoTracking().Include(x => x.Client).Include(x => x.Region).Include(x => x.Project)
                .Include(x => x.Owner).Include(x => x.BackupOwner).Include(x => x.Coordinator).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The environment");
            var now = DateTimeOffset.UtcNow;
            var policies = await fresh.PoliciesAsync(ct);
            return ctx.WithETag(e, new
            {
                e.Id, e.Name, e.Type, e.TypeDescription, e.Hosting, e.Location, e.Criticality, e.Description,
                client = new { e.Client!.Id, e.Client.Code, e.Client.Name, country = e.Client.CountryUnknown ? "Unknown" : e.Client.Country },
                region = e.Region == null ? null : new { e.Region.Id, e.Region.Code, e.Region.Name },
                project = e.Project == null ? null : new { e.Project.Id, e.Project.Code, e.Project.Name },
                owner = Ref(e.Owner), backupOwner = Ref(e.BackupOwner), coordinator = Ref(e.Coordinator), e.BackupGapReason,
                e.ResponsibleParty, e.ResponsibleOrganization, e.ResponsibleTeamId,
                coverageGap = e.BackupOwnerUserId == null || e.BackupOwner?.IsActive == false || e.Owner?.IsActive == false,
                condition = ConditionView(e.Condition, e.ConditionObservedAt, policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition)), now),
                e.ConditionReason,
                freshness = new
                {
                    record = FreshnessService.Evaluate(policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Record)), e.CreatedAt, e.LastReviewedAt, e.NextReviewAt, now),
                    inventory = FreshnessService.Evaluate(policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Inventory)), e.CreatedAt, e.InventoryReviewedAt, e.NextReviewAt, now),
                    dependencies = FreshnessService.Evaluate(policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Dependencies)), e.CreatedAt, e.DependenciesReviewedAt, null, now)
                },
                e.LastReviewedAt, e.InventoryReviewedAt, e.DependenciesReviewedAt, e.NextReviewAt,
                e.ArchivedAt, e.ArchiveReason, e.CreatedAt, e.UpdatedAt,
                canEdit = access.Me.Can(Role.Engineer)
            });
        });

        g.MapPost("", async (EnvironmentInput input, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            if (input.ClientId is null) throw new ValidationException("clientId", "Select the client.");
            var client = await db.Clients.FirstOrDefaultAsync(c => c.Id == input.ClientId, ct) ?? throw new NotFoundException("The client");
            access.RequireEngineerFor(client.Id);
            var e = new ClientEnvironment { ClientId = client.Id };
            await ApplyAsync(e, input, db, access, lookups, isNew: true, ct);
            db.Environments.Add(e);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/environments/{e.Id}", new { e.Id });
        });

        g.MapPut("/{id:long}", async (long id, EnvironmentInput input, HttpContext ctx, HubDbContext db, HubAccess access, LookupService lookups, CancellationToken ct) =>
        {
            var e = await db.Environments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The environment");
            access.RequireMaintain(e.ClientId, null, e.OwnerUserId, e.BackupOwnerUserId, e.CoordinatorUserId);
            db.ExpectVersion(ctx, e);
            await ApplyAsync(e, input, db, access, lookups, isNew: false, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var e = await db.Environments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The environment");
            access.RequireArchiveFor(e.ClientId);
            db.ExpectVersion(ctx, e);
            var reason = Rules.RequireReason(input.Reason);
            var openCases = await db.CaseEnvironments.CountAsync(ce => ce.EnvironmentId == id && db.Cases.IgnoreQueryFilters().Any(c => c.Id == ce.CaseId && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled), ct);
            if (openCases > 0)
            {
                if (string.IsNullOrWhiteSpace(input.ExceptionReason))
                    throw new ValidationException("Open cases affect this environment.", new Dictionary<string, string[]> { ["exceptionReason"] = [$"{openCases} open case(s) affect this environment. A TIO Manager must record an exception reason to archive anyway."] });
                access.Me.Require(Role.Manager);
                reason += " — Manager exception: " + Rules.RequireReason(input.ExceptionReason, "exceptionReason", "the exception reason");
            }
            Rules.Archive(e, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- condition reports (ENV-04/05) ----
        g.MapGet("/{id:long}/conditions", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            if (!await db.Environments.AnyAsync(e => e.Id == id, ct)) throw new NotFoundException("The environment");
            return Results.Ok(await db.ConditionReports.AsNoTracking().Where(r => r.EnvironmentId == id).OrderByDescending(r => r.ObservedAt).ThenByDescending(r => r.Id)
                .Select(r => new { r.Id, r.Condition, r.Reason, r.Evidence, r.ObservedAt, r.RecordedAt, recordedBy = r.RecordedBy == null ? null : r.RecordedBy.DisplayName }).ToListAsync(ct));
        });

        g.MapPost("/{id:long}/conditions", async (long id, ConditionInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var e = await db.Environments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The environment");
            access.RequireMaintain(e.ClientId, null, e.OwnerUserId, e.BackupOwnerUserId, e.CoordinatorUserId);
            var now = clock.GetUtcNow();
            var check = new Check();
            check.When(input.Condition is null, "condition", "Select the reported condition.")
                 .When(input.ObservedAt is null, "observedAt", "Enter when the condition was observed.")
                 .When(input.ObservedAt > now.AddMinutes(5), "observedAt", "The observation time cannot be in the future.")
                 .Text("reason", input.Reason, 1000, "Reason")
                 .Text("evidence", input.Evidence, 1000, "Evidence");
            if (input.Condition is not null and not Condition.Unknown)
            {
                check.Required("reason", input.Reason, "the reason for this condition");
                check.Required("evidence", input.Evidence, "the supporting evidence, reference or verification note");
            }
            check.ThrowIfAny();
            var report = new ConditionReport
            {
                EnvironmentId = id, ClientId = e.ClientId, Condition = input.Condition!.Value, Reason = Text.Clean(input.Reason), Evidence = Text.Clean(input.Evidence),
                ObservedAt = input.ObservedAt!.Value, RecordedAt = now, RecordedById = access.Me.UserId
            };
            db.ConditionReports.Add(report);
            await db.SaveChangesAsync(ct);
            // Latest observation wins; a back-dated report only enters history. Condition review is its own scope: inventory freshness is untouched.
            if (e.ConditionObservedAt is null || report.ObservedAt >= e.ConditionObservedAt)
            {
                e.Condition = report.Condition;
                e.ConditionReason = report.Reason;
                e.ConditionObservedAt = report.ObservedAt;
                e.ConditionReportId = report.Id;
                await db.SaveChangesAsync(ct);
            }
            return Results.Created($"/api/v1/environments/{id}/conditions/{report.Id}", new { report.Id });
        });
    }

    public sealed record ConditionState(Condition Reported, DateTimeOffset? ObservedAt, bool NeedsVerification, string Display);

    /// <summary>ENV-05: no report = Unknown; stale evidence keeps the reported value but shows Needs verification, never confirmed health.</summary>
    public static ConditionState ConditionView(Condition reported, DateTimeOffset? observedAt, Quality.ReviewPolicy? policy, DateTimeOffset now)
    {
        if (observedAt is null) return new ConditionState(Condition.Unknown, null, false, "Unknown");
        var stale = policy?.MaxAgeDays is { } days && observedAt.Value.AddDays(days) < now;
        return new ConditionState(reported, observedAt, stale && reported != Condition.Unknown, stale && reported != Condition.Unknown ? $"{reported} (needs verification)" : reported.ToString());
    }

    private static UserRef? Ref(Access.User? u) => u is null ? null : new UserRef(u.Id, u.DisplayName, u.IsActive);

    internal static async Task ApplyAsync(ClientEnvironment e, EnvironmentInput i, HubDbContext db, HubAccess access, LookupService lookups, bool isNew, CancellationToken ct)
    {
        var check = new Check();
        if (!isNew && i.ClientId is not null && i.ClientId != e.ClientId) check.Add("clientId", "An environment cannot move to another client.");
        check.Text("name", i.Name, 100, "the environment name", required: true)
             .Text("typeDescription", i.TypeDescription, 150, "Type description")
             .Text("location", i.Location, 150, "Location")
             .Text("description", i.Description, 2000, "Description")
             .Text("backupGapReason", i.BackupGapReason, 1000, "Coverage gap reason")
             .When(i.Criticality is null, "criticality", "Select the criticality (or Unknown).");
        var hosting = i.Hosting ?? HostingType.Unknown;
        // A34: configured environment type; a type in the "Other" category needs a description.
        var (typeCode, typeCategory) = await lookups.TypeAsync<EnvironmentType>(check, "type", LookupLists.EnvironmentType, i.Type, "the environment type", isNew ? null : e.Type, ct);
        if (typeCode != "" && typeCategory == EnvironmentType.Other && string.IsNullOrWhiteSpace(i.TypeDescription)) check.Add("typeDescription", "Describe the environment type.");

        // REG-02: a selected region must belong to the same client. Owner decision (UAT 19 Oct 2026): a client that has regions
        // cannot have environments outside them; only clients without regions have environments directly under the client.
        if (i.RegionId is not null && !await db.Regions.AnyAsync(r => r.Id == i.RegionId && r.ClientId == e.ClientId, ct))
            check.Add("regionId", "Select a region of this client. Regions of other clients cannot be used.");
        if (i.RegionId is null && await db.Regions.AnyAsync(r => r.ClientId == e.ClientId, ct))
            check.Add("regionId", "This client has regions: select the region of this environment.");
        if (i.ProjectId is not null && !await db.Projects.AnyAsync(p => p.Id == i.ProjectId && p.ClientId == e.ClientId, ct))
            check.Add("projectId", "Select a project of this client.");
        if (!isNew && i.RegionId != e.RegionId && string.IsNullOrWhiteSpace(i.RegionChangeReason))
            check.Add("regionChangeReason", "Enter the reason for moving this environment to another region.");

        // Owner decision (UAT 19 Oct 2026): responsibility is always the TIO team; the operation engineer and the backup operation
        // engineer are optional (a missing backup still shows as a coverage gap for critical environments under the coverage policy).
        if (i.BackupOwnerUserId is not null && i.BackupOwnerUserId == i.OwnerUserId) check.Add("backupOwnerUserId", "The backup operation engineer must be a different person from the technical owner.");
        if (i.BackupOwnerUserId is not null && i.BackupOwnerUserId == i.CoordinatorUserId) check.Add("backupOwnerUserId", "The backup operation engineer must be a different person from the operation engineer.");
        access.CheckOwnerChange(check, "ownerUserId", isNew ? i.OwnerUserId : e.OwnerUserId, i.OwnerUserId);
        access.CheckOwnerChange(check, "backupOwnerUserId", isNew ? i.BackupOwnerUserId : e.BackupOwnerUserId, i.BackupOwnerUserId);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, e.ClientId, null, "the technical owner", ct);
        await access.CheckAssignableAsync(check, "backupOwnerUserId", i.BackupOwnerUserId, e.ClientId, null, "the backup operation engineer", ct);
        await access.CheckAssignableAsync(check, "coordinatorUserId", i.CoordinatorUserId, e.ClientId, null, "the operation engineer", ct);
        check.ThrowIfAny();

        // REG-03: unique within client + region scope; null region is one direct-client scope.
        var norm = Text.Norm(i.Name);
        var clash = await db.Environments.IgnoreQueryFilters().AnyAsync(x => x.ClientId == e.ClientId && x.RegionId == i.RegionId && x.NormalizedName == norm && x.ArchivedAt == null && x.Id != e.Id, ct);
        if (clash)
            throw new ConflictException("An environment with this name already exists in the same scope.", new()
            {
                ["name"] = [i.RegionId is null ? "This client already has a direct environment with this name." : "This region already has an environment with this name."]
            });
        if (!isNew && i.RegionId != e.RegionId) db.AuditReason = "Region reassignment: " + Rules.RequireReason(i.RegionChangeReason, "regionChangeReason", "the reason");

        e.Name = i.Name!.Trim();
        e.NormalizedName = norm;
        e.RegionId = i.RegionId;
        e.ProjectId = i.ProjectId;
        e.Type = typeCode;
        e.TypeCategory = typeCategory;
        e.TypeDescription = Text.Clean(i.TypeDescription);
        e.Hosting = hosting;
        e.Location = Text.Clean(i.Location);
        e.Criticality = i.Criticality!.Value;
        e.OwnerUserId = i.OwnerUserId;
        e.BackupOwnerUserId = i.BackupOwnerUserId;
        e.BackupGapReason = i.BackupOwnerUserId is null ? Text.Clean(i.BackupGapReason) : null;
        e.ResponsibleParty = ResponsibleParty.TIO;
        e.ResponsibleOrganization = null;
        e.ResponsibleTeamId = i.ResponsibleTeamId;
        e.CoordinatorUserId = i.CoordinatorUserId;
        e.Description = Text.Clean(i.Description);
        e.NextReviewAt = i.NextReviewAt;
    }
}
