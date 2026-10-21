using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Quality;

public static class QualityEndpoints
{
    public sealed record ReviewInput(string? RecordType, long? RecordId, ReviewScope? Scope, string? Note, string? Evidence, DateTimeOffset? NextReviewAt);
    public sealed record PolicyInput(string? RecordType, ReviewScope? Scope, int? MaxAgeDays, bool UsesNextReviewDate, DateOnly? EffectiveFrom, long? PolicyOwnerId, string? Notes, bool IsActive = true);
    public sealed record ItemInput(long? CoordinatorUserId, string? NextAction, DateTimeOffset? NextReviewAt);
    public sealed record DocumentInput(string? RecordType, long? RecordId, DocumentKind? Kind, string? Title, string? Reference, long? OwnerUserId, DateOnly? ReviewDate);

    /// <summary>Scopes a meaningful review can verify per record type. Condition uses condition reports, never a generic review.</summary>
    public static readonly Dictionary<string, ReviewScope[]> AllowedScopes = new()
    {
        [RecordTypes.Client] = [ReviewScope.Record, ReviewScope.Contacts],
        [RecordTypes.Region] = [ReviewScope.Record],
        [RecordTypes.Project] = [ReviewScope.Record],
        [RecordTypes.Contact] = [ReviewScope.Record],
        [RecordTypes.Environment] = [ReviewScope.Record, ReviewScope.Inventory, ReviewScope.Dependencies],
        [RecordTypes.Installation] = [ReviewScope.Record],
        [RecordTypes.Asset] = [ReviewScope.Record],
        [RecordTypes.Case] = [ReviewScope.Record],
        [RecordTypes.Commitment] = [ReviewScope.Record],
        [RecordTypes.Contract] = [ReviewScope.Record]
    };

    public static void MapQualityEndpoints(this RouteGroupBuilder api)
    {
        // ---- meaningful reviews (OPS-03) ----
        var rg = api.MapGroup("/reviews").WithTags("Reviews");
        rg.MapGet("", async (string recordType, long recordId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            return Results.Ok(await db.Reviews.AsNoTracking().Where(r => r.RecordType == recordType && r.RecordId == recordId).OrderByDescending(r => r.ReviewedAt)
                .Select(r => new { r.Id, r.Scope, r.Note, r.Evidence, r.ReviewedAt, r.NextReviewAt, reviewer = r.Reviewer == null ? null : r.Reviewer.DisplayName }).ToListAsync(ct));
        });
        rg.MapPost("", async (ReviewInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var check = new Check().Text("note", input.Note, 1000, "the verification note", true).Text("evidence", input.Evidence, 1000, "Evidence")
                .When(input.Scope is null, "scope", "Select the scope checked.");
            if (input.RecordType is null || !AllowedScopes.TryGetValue(input.RecordType, out var scopes)) { check.Add("recordType", "This record type has no review."); check.ThrowIfAny(); return Results.BadRequest(); }
            if (input.Scope == ReviewScope.Condition) check.Add("scope", "Record the condition as a condition report with evidence; a condition review never verifies the inventory.");
            else if (input.Scope is not null && !scopes.Contains(input.Scope.Value)) check.Add("scope", $"A {input.RecordType} review can check: {string.Join(", ", scopes)}.");
            var now = clock.GetUtcNow();
            if (input.NextReviewAt is not null && input.NextReviewAt < now) check.Add("nextReviewAt", "The next review date is in the past.");
            if (input.RecordType is RecordTypes.Case or RecordTypes.Commitment && input.NextReviewAt is null && input.RecordType == RecordTypes.Case) check.Add("nextReviewAt", "Enter the next review time.");
            check.ThrowIfAny();
            var target = await ReviewTarget.LoadAsync(db, input.RecordType!, input.RecordId ?? 0, ct) ?? throw new NotFoundException("The record");
            access.RequireMaintain(target.ClientId, target.TeamId, target.Responsible);
            target.Apply(input.Scope!.Value, now, input.NextReviewAt);
            db.Reviews.Add(new Review
            {
                RecordType = input.RecordType!, RecordId = target.Id, ClientId = target.ClientId, EnvironmentId = target.EnvironmentId, TeamId = target.ClientId is null ? target.TeamId : null,
                Scope = input.Scope!.Value, Note = input.Note!.Trim(), Evidence = Text.Clean(input.Evidence), ReviewerId = access.Me.UserId, ReviewedAt = now, NextReviewAt = input.NextReviewAt
            });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

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
            access.RequireMaintain(i.ClientId, i.TeamId, i.CoordinatorUserId);
            db.ExpectVersion(ctx, i);
            var check = new Check().Text("nextAction", input.NextAction, 1000, "the next action", true);
            if (input.CoordinatorUserId is null) check.Add("coordinatorUserId", "Select the accountable internal coordinator.");
            if (input.CoordinatorUserId != i.CoordinatorUserId && !access.Me.IsLead) check.Add("coordinatorUserId", "Only the TIO Manager can change the coordinator.");
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
            me.Require(Role.Engineer);
            using var scope = scopes.CreateScope();
            var (opened, resolved) = await scope.ServiceProvider.GetRequiredService<DataQualityEngine>().ScanAsync(ct);
            return Results.Ok(new { opened, resolved });
        });

        // ---- document references (Section 6.6) ----
        var docs = api.MapGroup("/documents").WithTags("Document references");
        docs.MapGet("", async (string recordType, long recordId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            return Results.Ok(await db.DocumentReferences.AsNoTracking().Where(d => d.RecordType == recordType && d.RecordId == recordId).OrderBy(d => d.Title)
                .Select(d => new { d.Id, d.Kind, d.Title, d.Reference, d.ReviewDate, owner = d.Owner == null ? null : new UserRef(d.Owner.Id, d.Owner.DisplayName, d.Owner.IsActive), version = Convert.ToBase64String(d.RowVersion), note = "Reference only: a stored link does not prove the target exists or is accessible." })
                .ToListAsync(ct));
        });
        docs.MapPost("", async (DocumentInput input, HubDbContext db, HubAccess access, HubSettings settings, CancellationToken ct) =>
        {
            var target = await ReviewTarget.LoadAsync(db, input.RecordType ?? "", input.RecordId ?? 0, ct, allowAny: true) ?? throw new ValidationException("recordId", "Select a record you can access.");
            access.RequireMaintain(target.ClientId, target.TeamId, target.Responsible);
            var d = new DocumentReference { RecordType = input.RecordType!, RecordId = target.Id, ClientId = target.ClientId, EnvironmentId = target.EnvironmentId, TeamId = target.TeamId };
            await ApplyDocumentAsync(d, input, settings, access, ct);
            db.DocumentReferences.Add(d);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/documents/{d.Id}", new { d.Id });
        });
        docs.MapPut("/{id:long}", async (long id, DocumentInput input, HttpContext ctx, HubDbContext db, HubAccess access, HubSettings settings, CancellationToken ct) =>
        {
            var d = await db.DocumentReferences.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The document reference");
            access.RequireMaintain(d.ClientId, d.TeamId, d.OwnerUserId);
            db.ExpectVersion(ctx, d);
            await ApplyDocumentAsync(d, input, settings, access, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        docs.MapPost("/{id:long}/archive", async (long id, ArchiveInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var d = await db.DocumentReferences.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The document reference");
            access.RequireMaintain(d.ClientId, d.TeamId, d.OwnerUserId);
            db.ExpectVersion(ctx, d);
            var reason = Rules.RequireReason(input.Reason);
            Rules.Archive(d, access.Me, DateTimeOffset.UtcNow, reason);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
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

    private static async Task ApplyDocumentAsync(DocumentReference d, DocumentInput i, HubSettings settings, HubAccess access, CancellationToken ct)
    {
        var check = new Check().Text("title", i.Title, 150, "the title", true).When(i.Kind is null, "kind", "Select Link or Vault reference.");
        if (i.Kind == DocumentKind.Link && LinkGuard.Problem(i.Reference, await settings.ListAsync(SettingKeys.ApprovedLinkHosts, ct)) is { } p) check.Add("reference", p);
        if (i.Kind == DocumentKind.VaultReference && LinkGuard.VaultProblem(i.Reference, await settings.GetAsync(SettingKeys.VaultReferencePrefix, "vault://", ct)) is { } v) check.Add("reference", v);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, d.ClientId, d.TeamId, "the owner", ct);
        check.ThrowIfAny();
        d.Kind = i.Kind!.Value;
        d.Title = i.Title!.Trim();
        d.Reference = i.Reference!.Trim();
        d.OwnerUserId = i.OwnerUserId;
        d.ReviewDate = i.ReviewDate;
    }
}

/// <summary>Loads a reviewable record through scope filters and applies a review to the matching scope timestamp.</summary>
public sealed class ReviewTarget
{
    public long Id { get; init; }
    public long? ClientId { get; init; }
    public long? EnvironmentId { get; init; }
    public long? TeamId { get; init; }
    public long?[] Responsible { get; init; } = [];
    public Action<ReviewScope, DateTimeOffset, DateTimeOffset?> Apply { get; init; } = (_, _, _) => { };

    public static async Task<ReviewTarget?> LoadAsync(HubDbContext db, string type, long id, CancellationToken ct, bool allowAny = false)
    {
        switch (type)
        {
            case RecordTypes.Client:
            {
                var x = await db.Clients.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.Id, Responsible = [x.OwnerUserId, x.CoordinatorUserId], Apply = (s, now, next) =>
                {
                    if (s == ReviewScope.Record) { x.LastReviewedAt = now; if (next is not null) x.NextReviewAt = next; }
                    if (s == ReviewScope.Contacts) foreach (var c in db.Contacts.Where(c => c.ClientId == x.Id)) c.LastReviewedAt = now;
                } };
            }
            case RecordTypes.Region:
            {
                var x = await db.Regions.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, Responsible = [x.OwnerUserId], Apply = (_, now, _) => x.LastReviewedAt = now };
            }
            case RecordTypes.Project:
            {
                var x = await db.Projects.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, Responsible = [x.OwnerUserId], Apply = (_, now, _) => x.LastReviewedAt = now };
            }
            case RecordTypes.Contract:
            {
                var x = await db.Contracts.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, Responsible = [x.OwnerUserId], Apply = (_, now, _) => x.LastReviewedAt = now };
            }
            case RecordTypes.Contact:
            {
                var x = await db.Contacts.FirstOrDefaultAsync(r => r.Id == id, ct);
                var owner = x is null ? null : await db.Clients.Where(c => c.Id == x.ClientId).Select(c => c.OwnerUserId).FirstOrDefaultAsync(ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, Responsible = [owner], Apply = (_, now, _) => x.LastReviewedAt = now };
            }
            case RecordTypes.Environment:
            {
                var x = await db.Environments.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, EnvironmentId = x.Id, Responsible = [x.OwnerUserId, x.BackupOwnerUserId, x.CoordinatorUserId], Apply = (s, now, next) =>
                {
                    // Each scope refreshes only its own timestamp: an inventory review does not refresh condition, and vice versa.
                    if (s == ReviewScope.Record) x.LastReviewedAt = now;
                    if (s == ReviewScope.Inventory) x.InventoryReviewedAt = now;
                    if (s == ReviewScope.Dependencies) x.DependenciesReviewedAt = now;
                    if (next is not null) x.NextReviewAt = next;
                } };
            }
            case RecordTypes.Installation:
            {
                var x = await db.Installations.FirstOrDefaultAsync(r => r.Id == id, ct);
                var env = x is null ? null : await db.Environments.FirstOrDefaultAsync(e => e.Id == x.EnvironmentId, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, EnvironmentId = x.EnvironmentId, Responsible = [x.OwnerUserId, env?.OwnerUserId, env?.BackupOwnerUserId], Apply = (_, now, _) => x.LastReviewedAt = now };
            }
            case RecordTypes.Asset:
            {
                var x = await db.Assets.FirstOrDefaultAsync(r => r.Id == id, ct);
                var env = x is null ? null : await db.Environments.FirstOrDefaultAsync(e => e.Id == x.EnvironmentId, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, EnvironmentId = x.EnvironmentId, Responsible = [x.OwnerUserId, env?.OwnerUserId, env?.BackupOwnerUserId], Apply = (_, now, _) => x.VerifiedAt = now };
            }
            case RecordTypes.Case:
            {
                var x = await db.Cases.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, TeamId = x.ResponsibleTeamId, Responsible = [x.OwnerUserId, x.BackupOwnerUserId, x.CoordinatorUserId], Apply = (_, now, next) =>
                {
                    x.LastReviewedAt = now;
                    if (next is not null) x.NextReviewAt = next.Value;
                } };
            }
            case RecordTypes.Commitment:
            {
                var x = await db.Commitments.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, TeamId = x.ResponsibleTeamId, Responsible = [x.OwnerUserId, x.CoordinatorUserId], Apply = (_, now, next) =>
                {
                    x.LastReviewedAt = now;
                    if (next is not null) x.NextReviewAt = next;
                } };
            }
            case RecordTypes.Component when allowAny:
            {
                var x = await db.Components.FirstOrDefaultAsync(r => r.Id == id, ct);
                return x is null ? null : new() { Id = x.Id, ClientId = x.ClientId, EnvironmentId = x.EnvironmentId, Responsible = [x.OwnerUserId, x.CoordinatorUserId] };
            }
            default:
                return null;
        }
    }
}
