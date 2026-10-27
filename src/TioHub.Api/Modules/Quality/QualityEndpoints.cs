using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Quality;

public static class QualityEndpoints
{
    public sealed record PolicyInput(string? RecordType, ReviewScope? Scope, int? MaxAgeDays, bool UsesNextReviewDate, DateOnly? EffectiveFrom, long? PolicyOwnerId, string? Notes, bool IsActive = true);
    public sealed record ItemInput(long? CoordinatorUserId, string? NextAction, DateTimeOffset? NextReviewAt);

    public static void MapQualityEndpoints(this RouteGroupBuilder api)
    {
        // A52: the meaningful-review and document-reference endpoints were removed (owner request); saving a record now counts as reviewing it.
        // ---- review policies (OPS-02/04, NFR-09) ----
        var pg = api.MapGroup("/review-policies").WithTags("Reviews");
        pg.MapGet("", async (HubDbContext db, CancellationToken ct) => Results.Ok(await db.ReviewPolicies.AsNoTracking().OrderBy(p => p.RecordType).ThenBy(p => p.Scope)
            .Select(p => new { p.Id, p.RecordType, p.Scope, p.MaxAgeDays, p.UsesNextReviewDate, p.EffectiveFrom, p.PolicyOwnerId, p.Notes, p.IsActive, version = Convert.ToBase64String(p.RowVersion) }).ToListAsync(ct)));
        pg.MapPost("", async (PolicyInput input, HubDbContext db, UserContext me, FreshnessService fresh, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            PolicyCheck(input).ThrowIfAny();
            if (await db.ReviewPolicies.AnyAsync(p => p.RecordType == input.RecordType && p.Scope == input.Scope && p.IsActive, ct))
                throw new ConflictException("An active policy already exists for this record type and scope. Edit it, or deactivate it first.");
            var p = new ReviewPolicy();
            ApplyPolicy(p, input);
            db.ReviewPolicies.Add(p);
            await db.SaveChangesAsync(ct);
            fresh.Invalidate();
            return Results.Created($"/api/v1/review-policies/{p.Id}", new { p.Id });
        });
        pg.MapPut("/{id:long}", async (long id, PolicyInput input, HttpContext ctx, HubDbContext db, UserContext me, FreshnessService fresh, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var p = await db.ReviewPolicies.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The policy");
            db.ExpectVersion(ctx, p);
            PolicyCheck(input).ThrowIfAny();
            if (input.RecordType != p.RecordType || input.Scope != p.Scope) throw new ValidationException("recordType", "Record type and scope cannot change; add a new policy instead.");
            ApplyPolicy(p, input);
            await db.SaveChangesAsync(ct);
            fresh.Invalidate();
            return Results.NoContent();
        });

        // ---- data quality (DAT-06, RDY-03) ----
        var dg = api.MapGroup("/data-quality").WithTags("Data quality");
        dg.MapGet("", async (string? rule, long? clientId, long? coordinatorId, string? status, string? recordType, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var q = Filter(db.DataQualityItems.AsNoTracking(), rule, clientId, coordinatorId, status, recordType);
            return Results.Ok(await q.OrderBy(i => i.Rule).ThenBy(i => i.RecordLabel).Select(i => new
            {
                i.Id, i.Rule, ruleLabel = i.Rule, i.RecordType, i.RecordId, i.RecordLabel, i.Detail, i.ClientId, clientCode = db.Clients.Where(c => c.Id == i.ClientId).Select(c => c.Code).FirstOrDefault(),
                coordinator = i.Coordinator == null ? null : new UserRef(i.Coordinator.Id, i.Coordinator.DisplayName, i.Coordinator.IsActive),
                i.NextAction, i.NextReviewAt, i.Status, i.OpenedAt, i.ResolvedAt, i.ResolutionEvidence, version = Convert.ToBase64String(i.RowVersion)
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });
        dg.MapGet("/summary", async (long? clientId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var rows = await Filter(db.DataQualityItems.AsNoTracking(), null, clientId, null, "Open", null).GroupBy(i => i.Rule).Select(g => new { rule = g.Key, count = g.Count() }).ToListAsync(ct);
            return Results.Ok(rows.Select(r => new { r.rule, label = DataQualityEngine.Rule.Labels.GetValueOrDefault(r.rule, r.rule), r.count }));
        });
        dg.MapPut("/{id:long}", async (long id, ItemInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var i = await db.DataQualityItems.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The data-quality item");
            access.RequireMaintain(ResourcePermissions.Other, i.ClientId, i.TeamId, i.CoordinatorUserId);
            db.ExpectVersion(ctx, i);
            var check = new Check().Text("nextAction", input.NextAction, 1000, "the next action", true);
            if (input.CoordinatorUserId is null) check.Add("coordinatorUserId", "Select the accountable internal coordinator.");
            if (input.CoordinatorUserId != i.CoordinatorUserId && !access.Me.HasPermission(ResourcePermissions.Other, ResourcePermissions.Coordinate)) check.Add("coordinatorUserId", "Other operations coordination permission is required to change the coordinator.");
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, i.ClientId, i.TeamId, "the coordinator", ct);
            check.ThrowIfAny();
            i.CoordinatorUserId = input.CoordinatorUserId;
            i.NextAction = input.NextAction!.Trim();
            i.NextReviewAt = input.NextReviewAt;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        dg.MapPost("/scan", async (UserContext me, IServiceScopeFactory scopes, CancellationToken ct) =>
        {
            me.RequirePermission(ResourcePermissions.Other, ResourcePermissions.Maintain);
            using var scope = scopes.CreateScope();
            var (opened, resolved) = await scope.ServiceProvider.GetRequiredService<DataQualityEngine>().ScanAsync(ct);
            return Results.Ok(new { opened, resolved });
        });

    }

    public static IQueryable<DataQualityItem> Filter(IQueryable<DataQualityItem> q, string? rule, long? clientId, long? coordinatorId, string? status, string? recordType)
    {
        if (!string.IsNullOrWhiteSpace(rule)) q = q.Where(i => i.Rule == rule);
        if (clientId is not null) q = q.Where(i => i.ClientId == clientId);
        if (coordinatorId is not null) q = q.Where(i => i.CoordinatorUserId == coordinatorId);
        if (!string.IsNullOrWhiteSpace(recordType)) q = q.Where(i => i.RecordType == recordType);
        q = status switch
        {
            "Resolved" => q.Where(i => i.Status == DataQualityStatus.Resolved),
            "all" => q,
            _ => q.Where(i => i.Status == DataQualityStatus.Open)
        };
        return q;
    }

    private static Check PolicyCheck(PolicyInput i)
    {
        var c = new Check().Text("notes", i.Notes, 1000, "Notes");
        if (i.RecordType is null || !RecordTypes.Reviewable.Contains(i.RecordType)) c.Add("recordType", "Select a reviewable record type.");
        if (i.Scope is null) c.Add("scope", "Select the review scope.");
        if (i.MaxAgeDays is not null && i.MaxAgeDays <= 0) c.Add("maxAgeDays", "Enter a positive number of days.");
        if (i.MaxAgeDays is null && !i.UsesNextReviewDate) c.Add("maxAgeDays", "Enter a maximum age, use the explicit next-review date, or both.");
        return c;
    }

    private static void ApplyPolicy(ReviewPolicy p, PolicyInput i)
    {
        p.RecordType = i.RecordType!;
        p.Scope = i.Scope!.Value;
        p.MaxAgeDays = i.MaxAgeDays;
        p.UsesNextReviewDate = i.UsesNextReviewDate;
        p.EffectiveFrom = i.EffectiveFrom ?? DateOnly.FromDateTime(DateTime.UtcNow);
        p.PolicyOwnerId = i.PolicyOwnerId;
        p.Notes = Text.Clean(i.Notes);
        p.IsActive = i.IsActive;
    }
}

