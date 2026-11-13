using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Commitments;

public sealed record CommitmentFilter(long? ClientId = null, long? TeamId = null, long? OwnerId = null, WorkScope? Scope = null, CommitmentType? Type = null,
    string? Status = null, string? Due = null, bool? Late = null, bool? Stale = null, long? ProjectId = null, long? CaseId = null, string? Q = null,
    DateTimeOffset? CompletedFrom = null, DateTimeOffset? CompletedTo = null, bool? DeactivatedOwner = null, string? Country = null, long? ProductId = null,
    CommitmentDirection? Direction = null, long? ExternalOrganizationId = null);

/// <summary>Shared commitment filter for lists, dashboard counts and exports (AC-11).</summary>
public static class CommitmentQuery
{
    public static IQueryable<Commitment> Apply(IQueryable<Commitment> q, CommitmentFilter f, DateTimeOffset now, int upcomingDays, HubDbContext db)
    {
        if (f.ClientId is not null) q = q.Where(c => c.ClientId == f.ClientId);
        if (!string.IsNullOrWhiteSpace(f.Country)) q = f.Country == "Unknown" ? q.Where(c => c.Client!.CountryUnknown) : q.Where(c => c.Client!.Country == f.Country);
        if (f.TeamId is not null) q = q.Where(c => c.ResponsibleTeamId == f.TeamId);
        if (f.OwnerId is not null) q = q.Where(c => c.OwnerUserId == f.OwnerId);
        if (f.Scope is not null) q = q.Where(c => c.Scope == f.Scope);
        if (f.Type is not null) q = q.Where(c => c.Type == f.Type);
        if (f.ProjectId is not null) q = q.Where(c => c.ProjectId == f.ProjectId);
        if (f.CaseId is not null) q = q.Where(c => c.CaseId == f.CaseId);
        if (f.ProductId is not null) q = q.Where(c => c.ProjectId != null && db.ProjectProducts.Any(pp => pp.ProjectId == c.ProjectId && pp.ProductId == f.ProductId));
        q = f.Status switch
        {
            null or "" or "open" => q.Where(c => c.Status == CommitmentStatus.Open),
            "all" => q,
            "done" => q.Where(c => c.Status == CommitmentStatus.Completed || c.Status == CommitmentStatus.Cancelled),
            _ when Enum.TryParse<CommitmentStatus>(f.Status, true, out var s) => q.Where(c => c.Status == s),
            _ => q
        };
        var horizon = now.AddDays(upcomingDays);
        q = f.Due switch
        {
            "overdue" => q.Where(c => c.Status == CommitmentStatus.Open && c.CurrentDueAt < now),
            "upcoming" => q.Where(c => c.Status == CommitmentStatus.Open && c.CurrentDueAt >= now && c.CurrentDueAt <= horizon),
            _ => q
        };
        if (f.Late == true) q = q.Where(c => c.CompletedLate == true);
        if (f.Stale == true) q = q.Where(c => c.Status == CommitmentStatus.Open && c.NextReviewAt != null && c.NextReviewAt < now);
        if (f.CompletedFrom is not null) q = q.Where(c => c.CompletedAt >= f.CompletedFrom);
        if (f.CompletedTo is not null) q = q.Where(c => c.CompletedAt < f.CompletedTo);
        if (f.DeactivatedOwner == true) q = q.Where(c => c.Owner != null && !c.Owner.IsActive);
        if (f.Direction is not null) q = q.Where(c => c.Direction == f.Direction);
        if (f.ExternalOrganizationId is not null) q = q.Where(c => c.ExternalOrganizationId == f.ExternalOrganizationId);
        if (!string.IsNullOrWhiteSpace(f.Q)) q = q.Where(c => c.Title.Contains(f.Q) || c.Description.Contains(f.Q) || c.Ref.Contains(f.Q)
            || (c.ResponsibleOrganization != null && c.ResponsibleOrganization.Contains(f.Q)));
        return q;
    }
}

public static class CommitmentEndpoints
{
    /// <summary>A114: <c>Title</c> is required; <c>Description</c> is optional. A client that sends no title (before 2.64) gets one from the description.</summary>
    public sealed record CommitmentInput(WorkScope? Scope, long? ClientId, long? ResponsibleTeamId, string? Description, CommitmentType? Type, long? OwnerUserId,
        ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization, long? CoordinatorUserId, string? DueLocal, string? TimeZone, DateTimeOffset? NextReviewAt, long? CaseId, long? ProjectId,
        string? Title = null, CommitmentDirection? Direction = null, long? ExternalOrganizationId = null);
    public sealed record CommitmentUpdateInput(string? Description, CommitmentType? Type, long? OwnerUserId, ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization,
        long? CoordinatorUserId, DateTimeOffset? NextReviewAt, long? CaseId, long? ProjectId, string? Title = null, long? ExternalOrganizationId = null);
    /// <summary>A114: <c>CauseCommitmentId</c> names the dependency that caused the revision (optional).</summary>
    public sealed record ReviseInput(string? DueLocal, string? TimeZone, string? Reason, long? CauseCommitmentId = null);
    public sealed record CompleteInput(DateTimeOffset? CompletedAt, string? Evidence, string? Reason = null);
    public sealed record ReasonInput(string? Reason);

    public static void MapCommitmentEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/commitments").WithTags("Commitments");

        g.MapGet("", async (long? clientId, long? teamId, long? ownerId, WorkScope? scope, CommitmentType? type, string? status, string? due, bool? late, bool? stale, long? projectId, long? caseId, string? q,
            DateTimeOffset? completedFrom, DateTimeOffset? completedTo, bool? deactivatedOwner, string? country, long? productId, DateTimeOffset? asOf, string? sort, int? page, int? pageSize, int? upcomingDays,
            CommitmentDirection? direction, long? externalOrganizationId, string? health,
            HubDbContext db, HubAccess access, HubSettings settings, CancellationToken ct) =>
        {
            access.RequireAccess();
            var now = asOf ?? DateTimeOffset.UtcNow;
            var windowDays = upcomingDays ?? await settings.UpcomingDaysAsync(ct);
            if (windowDays is < 1 or > 90) throw new ValidationException("upcomingDays", "Choose a value from 1 to 90 days.");
            var warn = await settings.DependencyWarningDaysAsync(ct);
            var f = new CommitmentFilter(clientId, teamId, ownerId, scope, type, status, due, late, stale, projectId, caseId, q, completedFrom, completedTo, deactivatedOwner, country, productId, direction, externalOrganizationId);
            var query = CommitmentQuery.Apply(db.Commitments.AsNoTracking(), f, now, windowDays, db);
            // A114: health is derived, so its filter is the set of open commitments whose forecast matches.
            if (!string.IsNullOrWhiteSpace(health))
            {
                DependencyHealth[] wanted = health == "risk" ? [DependencyHealth.AtRisk, DependencyHealth.WillBeLate, DependencyHealth.Blocked]
                    : Enum.TryParse<DependencyHealth>(health, true, out var h) ? [h] : throw new ValidationException("health", "Select a valid health.");
                var ids = (await DependencyRules.OpenForecastsAsync(db, query, now, warn, ct)).Where(x => wanted.Contains(x.Value.Health!.Value)).Select(x => x.Key).ToList();
                query = query.Where(c => ids.Contains(c.Id));
            }
            var keys = new Dictionary<string, Expression<Func<Commitment, object?>>> { ["due"] = c => c.CurrentDueAt, ["ref"] = c => c.Id, ["status"] = c => c.Status, ["client"] = c => c.Client!.Code, ["owner"] = c => c.Owner!.DisplayName, ["title"] = c => c.Title };
            var paged = await query.SortBy(sort, keys, "due").Select(Row(now)).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            var forecasts = await DependencyRules.ForecastsAsync(db, paged.Items.Where(r => r.DependencyCount > 0).Select(r => (r.Id, r.Status, r.CurrentDueAt, r.TimeZone)).ToList(), now, warn, ct);
            return Results.Ok(paged with { Items = paged.Items.Select(r => forecasts.TryGetValue(r.Id, out var fc) ? r with { Health = fc.Health, ForecastAt = fc.ForecastAt } : r).ToList() });
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, HubSettings settings, CancellationToken ct) =>
        {
            access.RequireAccess();
            var c = await db.Commitments.AsNoTracking().Include(x => x.Client).Include(x => x.ResponsibleTeam).Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            var now = DateTimeOffset.UtcNow;
            var canHistory = access.Me.HasRight(RightKeys.Commitments, RightKeys.HistoryView) && access.Me.HasRight(RightKeys.Audit);
            var rawEvents = await db.CommitmentEvents.AsNoTracking().Where(e => canHistory && e.CommitmentId == id).OrderBy(e => e.At).ThenBy(e => e.Id)
                .Select(e => new { e.Id, e.Type, e.PreviousDueAt, e.NewDueAt, e.CompletedAt, e.Reason, e.Evidence, e.At, by = e.By == null ? null : e.By.DisplayName, e.CauseCommitmentId }).ToListAsync(ct);
            // A114: references of the dependencies named in the history (read across scopes: only the reference is shown).
            var causeIds = rawEvents.Where(e => e.CauseCommitmentId != null).Select(e => e.CauseCommitmentId!.Value).Distinct().ToList();
            var causeRefs = causeIds.Count == 0 ? [] : await db.Commitments.IgnoreQueryFilters().AsNoTracking().Where(x => causeIds.Contains(x.Id)).ToDictionaryAsync(x => x.Id, x => x.Ref, ct);
            var events = rawEvents.Select(e => new { e.Id, e.Type, e.PreviousDueAt, e.NewDueAt, e.CompletedAt, e.Reason, e.Evidence, e.At, e.by, e.CauseCommitmentId,
                causeRef = e.CauseCommitmentId is { } cid ? causeRefs.GetValueOrDefault(cid) : null }).ToList();
            // A114: what this commitment waits for (read across scopes once the commitment itself is visible) and what waits for it (only those the reader may see).
            var forecast = (await DependencyRules.ForecastsAsync(db, [(c.Id, c.Status, c.CurrentDueAt, c.TimeZone)], now, await settings.DependencyWarningDaysAsync(ct), ct)).GetValueOrDefault(c.Id);
            var dependents = await db.CommitmentDependencies.AsNoTracking().Where(d => d.DependsOnCommitmentId == id)
                .Join(db.Commitments, d => d.CommitmentId, x => x.Id, (d, x) => new { x.Id, x.Ref, x.Title, x.Status, x.CurrentDueAt, x.TimeZone, owner = x.Owner == null ? null : x.Owner.DisplayName, d.LeadTimeDays, d.Note })
                .OrderBy(x => x.CurrentDueAt).ToListAsync(ct);
            var lateCause = c.LateCauseCommitmentId is null ? null : await db.Commitments.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == c.LateCauseCommitmentId)
                .Select(x => new { x.Id, x.Ref, x.Title, party = x.Direction == CommitmentDirection.External ? x.ResponsibleOrganization : null }).FirstOrDefaultAsync(ct);
            var caseRef = c.CaseId is null ? null : await db.Cases.AsNoTracking().Where(x => x.Id == c.CaseId).Select(x => new { x.Id, x.Ref, x.Title }).FirstOrDefaultAsync(ct);
            var project = c.ProjectId is null ? null : await db.Projects.AsNoTracking().Where(x => x.Id == c.ProjectId).Select(x => new { x.Id, x.Code, x.Name }).FirstOrDefaultAsync(ct);
            var coordinator = await access.UserRefAsync(c.CoordinatorUserId, ct);
            var maintain = access.Me.SeesScope(c.ClientId, c.ResponsibleTeamId) && access.Me.HasRightIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            return ctx.WithETag(c, new
            {
                c.Id, c.Ref, c.Scope, c.Title, c.Description, c.Type, c.Status, c.TimeZone, c.Direction,
                externalParty = c.ExternalOrganizationId is null ? null : new { id = c.ExternalOrganizationId, name = c.ResponsibleOrganization },
                forecast, dependents, lateCause,
                typeLabel = c.Type == CommitmentType.RecordedContractualDeadline ? "Recorded deadline (manually entered; not a verified SLA calculation)" : c.Type.ToString(),
                client = c.Client == null ? null : new { c.Client.Id, c.Client.Code, c.Client.Name },
                team = c.ResponsibleTeam == null ? null : new { c.ResponsibleTeam.Id, c.ResponsibleTeam.Name },
                owner = c.Owner == null ? null : new UserRef(c.Owner.Id, c.Owner.DisplayName, c.Owner.IsActive), coordinator,
                c.ResponsibleParty, c.ResponsibleOrganization,
                c.OriginalDueAt, originalDueLocal = Zones.Local(c.OriginalDueAt, c.TimeZone), c.CurrentDueAt, currentDueLocal = Zones.Local(c.CurrentDueAt, c.TimeZone),
                c.RevisionCount, c.NextReviewAt, c.CompletedAt, c.CompletionEvidence, c.DueAtCompletion, c.CancelReason,
                timeliness = Timeliness(c, now),
                originalDeadlineResult = c.Status == CommitmentStatus.Completed && c.CompletedAt is not null ? (c.CompletedAt <= c.OriginalDueAt ? "OnTime" : "Late") : null,
                overdue = c.Status == CommitmentStatus.Open && c.CurrentDueAt < now,
                @case = caseRef, project, events, c.CreatedAt, c.UpdatedAt, c.LastReviewedAt,
                permissions = new { canEdit = maintain && c.Status == CommitmentStatus.Open, canRevise = maintain && c.Status == CommitmentStatus.Open && (c.CurrentDueAt >= now || access.Me.HasRight(RightKeys.Commitments, RightKeys.Coordinate)), canComplete = maintain && c.Status == CommitmentStatus.Open, canCancel = maintain && c.Status == CommitmentStatus.Open, canReopen = maintain && c.Status != CommitmentStatus.Open }
            });
        });

        g.MapPost("", async (CommitmentInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Commitments, RightKeys.Create);
            var now = clock.GetUtcNow();
            var check = new Check();
            var title = TitleOf(input.Title, input.Description);
            check.When(input.Scope is null, "scope", "Select Client-related or Internal.")
                 .Text("title", title, 200, "the title", true)
                 .Text("description", input.Description, 2000, "the description")
                 .When(input.Type is null, "type", "Select the commitment type.")
                 .When(input.OwnerUserId is null, "ownerUserId", "Select the accountable owner.")
                 .Text("responsibleOrganization", input.ResponsibleOrganization, 150, "Responsible organization");
            if (input.Scope == WorkScope.Client && input.ClientId is null) check.Add("clientId", "Client-related commitments need a client.");
            if (input.Scope == WorkScope.Internal && input.ClientId is not null) check.Add("clientId", "Internal commitments have no client.");
            if (input.Scope == WorkScope.Internal && input.ResponsibleTeamId is null) check.Add("responsibleTeamId", "Select the internal team scope.");
            if (input.ClientId is not null && !access.Me.HasClient(input.ClientId.Value)) check.Add("clientId", "Select a client you can access.");
            if (input.Scope == WorkScope.Internal && input.ResponsibleTeamId is not null && !access.Me.SeesInternal(input.ResponsibleTeamId)) check.Add("responsibleTeamId", "You have no internal scope for this team.");
            if (input.OwnerUserId is not null && input.OwnerUserId != access.Me.UserId && !access.Me.HasRight(RightKeys.Commitments, RightKeys.Coordinate)) check.Add("ownerUserId", "Commitment coordination permission is required to assign someone else. Choose yourself.");
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, input.ClientId, input.ResponsibleTeamId, "the owner", ct);
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, input.ClientId, input.ResponsibleTeamId, "the coordinator", ct);
            await CheckLinksAsync(check, db, input.ClientId, input.ResponsibleTeamId, input.CaseId, input.ProjectId, ct);
            var direction = input.Direction ?? CommitmentDirection.Ours;
            var party = await ExternalPartyAsync(check, db, direction, input.ExternalOrganizationId, ct);
            var due = Zones.ToUtc(check, "dueLocal", input.DueLocal, input.TimeZone);
            check.ThrowIfAny();
            var c = new Commitment
            {
                Scope = input.Scope!.Value, ClientId = input.ClientId, ResponsibleTeamId = input.ResponsibleTeamId, Title = title!, Description = input.Description?.Trim() ?? "", Type = input.Type!.Value,
                Direction = direction, ExternalOrganizationId = party?.Id,
                OwnerUserId = input.OwnerUserId, ResponsibleParty = party is null ? input.ResponsibleParty ?? ResponsibleParty.TIO : ResponsibleParty.Vendor,
                ResponsibleOrganization = party?.Name ?? Text.Clean(input.ResponsibleOrganization),
                CoordinatorUserId = input.CoordinatorUserId, OriginalDueAt = due!.Value, CurrentDueAt = due.Value, TimeZone = input.TimeZone!.Trim(), NextReviewAt = input.NextReviewAt,
                CaseId = input.CaseId, ProjectId = input.ProjectId, Status = CommitmentStatus.Open, LastReviewedAt = now
            };
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Created, NewDueAt = c.CurrentDueAt, ById = access.Me.UserId, At = now });
            db.Commitments.Add(c);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/commitments/{c.Id}", new { c.Id, c.Ref });
        });

        g.MapPut("/{id:long}", async (long id, CommitmentUpdateInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            // Relinking needs authority over both the stored links and the proposed ones.
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, (await ResourceContexts.ForCommitmentAsync(db, c, ct))
                .Merge(await ResourceContexts.ForCommitmentAsync(db, c.ClientId, c.ResponsibleTeamId, input.ProjectId, input.CaseId, ct)));
            db.ExpectVersion(ctx, c);
            // A111: a completed or cancelled commitment is a finished record, as it already is for revisions and cancellation.
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("status", "Only open commitments can be changed. Reopen it first.");
            var title = TitleOf(input.Title, input.Description) ?? c.Title;
            var check = new Check().Text("title", title, 200, "the title", true).Text("description", input.Description, 2000, "the description").When(input.Type is null, "type", "Select the type.")
                .When(input.OwnerUserId is null, "ownerUserId", "Select the accountable owner.").Text("responsibleOrganization", input.ResponsibleOrganization, 150, "Responsible organization");
            access.CheckOwnerChange(check, "ownerUserId", c.OwnerUserId, input.OwnerUserId, resource: RightKeys.Commitments);
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, c.ClientId, c.ResponsibleTeamId, "the owner", ct);
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, c.ClientId, c.ResponsibleTeamId, "the coordinator", ct);
            await CheckLinksAsync(check, db, c.ClientId, c.ResponsibleTeamId, input.CaseId, input.ProjectId, ct);
            var party = await ExternalPartyAsync(check, db, c.Direction, input.ExternalOrganizationId ?? c.ExternalOrganizationId, ct);
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            var description = input.Description?.Trim() ?? "";
            // Material changes count as a review of the commitment (Section 9: reviewed on material change).
            var material = title != c.Title || description != c.Description || input.Type != c.Type || input.OwnerUserId != c.OwnerUserId || party?.Id != c.ExternalOrganizationId;
            if (input.OwnerUserId != c.OwnerUserId) c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.OwnerChanged, Reason = $"Owner {c.OwnerUserId} → {input.OwnerUserId}", ById = access.Me.UserId, At = now });
            c.Title = title!;
            c.Description = description;
            c.Type = input.Type!.Value;
            c.OwnerUserId = input.OwnerUserId;
            c.ExternalOrganizationId = party?.Id;
            c.ResponsibleParty = party is null ? input.ResponsibleParty ?? c.ResponsibleParty : ResponsibleParty.Vendor;
            c.ResponsibleOrganization = party?.Name ?? Text.Clean(input.ResponsibleOrganization);
            c.CoordinatorUserId = input.CoordinatorUserId;
            c.NextReviewAt = input.NextReviewAt;
            c.CaseId = input.CaseId;
            c.ProjectId = input.ProjectId;
            if (material) c.LastReviewedAt = now;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // COM-04: revision keeps the original and all prior deadlines with reason, actor and time.
        g.MapPost("/{id:long}/revise", async (long id, ReviseInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("dueLocal", "Only open commitments can be revised. Reopen it first.");
            // A111: moving a deadline that has already passed decides whether the commitment counts as kept, so it is a coordination
            // decision, not the owner's own. Before the deadline, a revision with a reason stays with whoever maintains the commitment.
            if (c.CurrentDueAt < clock.GetUtcNow() && !access.Me.HasRight(RightKeys.Commitments, RightKeys.Coordinate))
                throw new ForbiddenException("The deadline has already passed. Moving it needs commitment coordination permission.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reason for the revision");
            var check = new Check();
            var zone = string.IsNullOrWhiteSpace(input.TimeZone) ? c.TimeZone : input.TimeZone;
            var due = Zones.ToUtc(check, "dueLocal", input.DueLocal, zone);
            if (due == c.CurrentDueAt) check.Add("dueLocal", "This is already the current deadline.");
            if (input.CauseCommitmentId is not null && !await db.CommitmentDependencies.IgnoreQueryFilters().AnyAsync(d => d.CommitmentId == c.Id && d.DependsOnCommitmentId == input.CauseCommitmentId, ct))
                check.Add("causeCommitmentId", "Select one of this commitment's dependencies as the cause, or none.");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Revised, PreviousDueAt = c.CurrentDueAt, NewDueAt = due, Reason = reason, CauseCommitmentId = input.CauseCommitmentId, ById = access.Me.UserId, At = now });
            c.CurrentDueAt = due!.Value;
            c.RevisionCount++;
            c.LastReviewedAt = now;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // A91: a commitment can be fulfilled early, on time or late, and a record entered afterwards can state an earlier time, with an optional reason.
        // The time only cannot be in the future (a minute's margin for the form's precision). Timeliness is derived from the deadline, never validated against it.
        g.MapPost("/{id:long}/complete", async (long id, CompleteInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("completedAt", "Only open commitments can be completed.");
            var now = clock.GetUtcNow();
            var check = new Check().When(input.CompletedAt is null, "completedAt", "Enter when the commitment was fulfilled.")
                .When(input.CompletedAt > now.AddMinutes(1), "completedAt", "The completion time cannot be in the future.")
                .Text("evidence", input.Evidence, 1000, "the completion evidence or reference")
                .Text("reason", input.Reason, 1000, "the reason");
            check.ThrowIfAny();
            // A114: completing before what it waits for is delivered is allowed (a workaround, for example), but needs a reason.
            var facts = (await DependencyRules.FactsAsync(db, [c.Id], ct)).GetValueOrDefault(c.Id) ?? [];
            var pending = facts.Where(f => f.Status != CommitmentStatus.Completed).Select(f => f.Ref).ToList();
            if (pending.Count > 0 && Text.Clean(input.Reason) is null)
                throw new ValidationException("reason", $"This commitment depends on {string.Join(", ", pending)}, not yet delivered. Give a reason to complete it anyway (for example, a workaround was delivered).");
            c.Status = CommitmentStatus.Completed;
            c.CompletedAt = input.CompletedAt;
            c.CompletionEvidence = Text.Clean(input.Evidence);
            c.DueAtCompletion = c.CurrentDueAt;
            c.CompletedLate = input.CompletedAt > c.CurrentDueAt;
            c.LateCauseCommitmentId = c.CompletedLate == true ? DependencyRules.LateCause(c.CurrentDueAt, facts, input.CompletedAt!.Value) : null;
            c.LastReviewedAt = now;
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Completed, CompletedAt = input.CompletedAt, Evidence = c.CompletionEvidence, Reason = Text.Clean(input.Reason), ById = access.Me.UserId, At = now, PreviousDueAt = c.CurrentDueAt });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/cancel", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("reason", "Only open commitments can be cancelled.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the cancellation reason");
            var now = clock.GetUtcNow();
            c.Status = CommitmentStatus.Cancelled;
            c.CancelReason = reason;
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Cancelled, Reason = reason, ById = access.Me.UserId, At = now });
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Reopening returns to Open and retains previous completion events.
        g.MapPost("/{id:long}/reopen", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireIn(RightKeys.Commitments, RightKeys.Maintain, await ResourceContexts.ForCommitmentAsync(db, c, ct));
            db.ExpectVersion(ctx, c);
            if (c.Status == CommitmentStatus.Open) throw new ValidationException("reason", "The commitment is already open.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reopening reason");
            var now = clock.GetUtcNow();
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Reopened, Reason = reason, ById = access.Me.UserId, At = now, CompletedAt = c.CompletedAt });
            c.Status = CommitmentStatus.Open;
            c.CompletedAt = null;
            c.CompletionEvidence = null;
            c.CompletedLate = null;
            c.LateCauseCommitmentId = null;
            c.DueAtCompletion = null;
            c.CancelReason = null;
            c.LastReviewedAt = now;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    /// <summary>A114 added the title, direction, external party, dependency count and (lists only) the derived health and forecast.</summary>
    public sealed record CommitmentRow(long Id, string Ref, WorkScope Scope, string Description, CommitmentType Type, CommitmentStatus Status, long? ClientId, string? ClientCode,
        string? TeamName, long? OwnerUserId, string? OwnerName, bool OwnerDeactivated, DateTimeOffset OriginalDueAt, DateTimeOffset CurrentDueAt, string TimeZone,
        int RevisionCount, DateTimeOffset? CompletedAt, bool? CompletedLate, bool Overdue, DateTimeOffset? NextReviewAt, long? TeamId,
        string Title, CommitmentDirection Direction, string? ExternalParty, int DependencyCount, DependencyHealth? Health = null, DateTimeOffset? ForecastAt = null);

    public static Expression<Func<Commitment, CommitmentRow>> Row(DateTimeOffset now) => c => new CommitmentRow(c.Id, c.Ref, c.Scope, c.Description, c.Type, c.Status,
        c.ClientId, c.Client == null ? null : c.Client.Code, c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name, c.OwnerUserId, c.Owner == null ? null : c.Owner.DisplayName,
        c.Owner != null && !c.Owner.IsActive, c.OriginalDueAt, c.CurrentDueAt, c.TimeZone, c.RevisionCount, c.CompletedAt, c.CompletedLate,
        c.Status == CommitmentStatus.Open && c.CurrentDueAt < now, c.NextReviewAt, c.ResponsibleTeamId,
        c.Title, c.Direction, c.Direction == CommitmentDirection.External ? c.ResponsibleOrganization : null, c.Dependencies.Count, null, null);

    /// <summary>A114: the title as sent; a client that sends none (written before 2.64) gets the first line of the description, up to 200 characters.</summary>
    public static string? TitleOf(string? title, string? description)
    {
        if (Text.Clean(title) is { } t) return t;
        var first = description?.Replace("\r", "").Split('\n').Select(l => l.Trim()).FirstOrDefault(l => l.Length > 0);
        return first is null ? null : first.Length > 200 ? first[..199] + "…" : first;
    }

    /// <summary>A114: External commitments name a standalone organization (no client) as their external party; Ours never do.</summary>
    private static async Task<(long Id, string Name)?> ExternalPartyAsync(Check check, HubDbContext db, CommitmentDirection direction, long? organizationId, CancellationToken ct)
    {
        if (direction != CommitmentDirection.External)
        {
            if (organizationId is not null) check.Add("externalOrganizationId", "Only External commitments have an external party.");
            return null;
        }
        if (organizationId is null) { check.Add("externalOrganizationId", "Select the external party that delivers this."); return null; }
        var o = await db.Organizations.IgnoreQueryFilters().AsNoTracking().Where(x => x.Id == organizationId && x.ClientId == null && x.Name != null).Select(x => new { x.Id, x.Name }).FirstOrDefaultAsync(ct);
        if (o is null) { check.Add("externalOrganizationId", "Select an external party from the list."); return null; }
        return (o.Id, o.Name!);
    }

    /// <summary>Derived outcome separate from status (COM-03).</summary>
    public static string Timeliness(Commitment c, DateTimeOffset now) => c.Status switch
    {
        CommitmentStatus.Completed => c.CompletedLate == true ? "Completed late" : "Completed on time",
        CommitmentStatus.Cancelled => "Cancelled",
        _ => c.CurrentDueAt < now ? "Open — overdue" : "Open — not yet due"
    };

    private static async Task CheckLinksAsync(Check check, HubDbContext db, long? clientId, long? teamId, long? caseId, long? projectId, CancellationToken ct)
    {
        if (caseId is not null && !await db.Cases.AnyAsync(c => c.Id == caseId && c.ClientId == clientId && (clientId != null || c.ResponsibleTeamId == teamId), ct))
            check.Add("caseId", "Link a ticket in the same client or internal scope.");
        if (projectId is not null && (clientId is null || !await db.Projects.AnyAsync(p => p.Id == projectId && p.ClientId == clientId, ct)))
            check.Add("projectId", "Link a project of the same client.");
    }
}
