using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Commitments;

public sealed record CommitmentFilter(long? ClientId = null, long? TeamId = null, long? OwnerId = null, WorkScope? Scope = null, CommitmentType? Type = null,
    string? Status = null, string? Due = null, bool? Late = null, bool? Stale = null, long? ProjectId = null, long? CaseId = null, string? Q = null,
    DateTimeOffset? CompletedFrom = null, DateTimeOffset? CompletedTo = null, bool? DeactivatedOwner = null, string? Country = null, long? ProductId = null);

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
        if (!string.IsNullOrWhiteSpace(f.Q)) q = q.Where(c => c.Description.Contains(f.Q) || c.Ref.Contains(f.Q));
        return q;
    }
}

public static class CommitmentEndpoints
{
    public sealed record CommitmentInput(WorkScope? Scope, long? ClientId, long? ResponsibleTeamId, string? Description, CommitmentType? Type, long? OwnerUserId,
        ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization, long? CoordinatorUserId, string? DueLocal, string? TimeZone, DateTimeOffset? NextReviewAt, long? CaseId, long? ProjectId);
    public sealed record CommitmentUpdateInput(string? Description, CommitmentType? Type, long? OwnerUserId, ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization,
        long? CoordinatorUserId, DateTimeOffset? NextReviewAt, long? CaseId, long? ProjectId);
    public sealed record ReviseInput(string? DueLocal, string? TimeZone, string? Reason);
    public sealed record CompleteInput(DateTimeOffset? CompletedAt, string? Evidence);
    public sealed record ReasonInput(string? Reason);

    public static void MapCommitmentEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/commitments").WithTags("Commitments");

        g.MapGet("", async (long? clientId, long? teamId, long? ownerId, WorkScope? scope, CommitmentType? type, string? status, string? due, bool? late, bool? stale, long? projectId, long? caseId, string? q,
            DateTimeOffset? completedFrom, DateTimeOffset? completedTo, bool? deactivatedOwner, string? country, long? productId, DateTimeOffset? asOf, string? sort, int? page, int? pageSize,
            HubDbContext db, HubAccess access, HubSettings settings, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var now = asOf ?? DateTimeOffset.UtcNow;
            var f = new CommitmentFilter(clientId, teamId, ownerId, scope, type, status, due, late, stale, projectId, caseId, q, completedFrom, completedTo, deactivatedOwner, country, productId);
            var query = CommitmentQuery.Apply(db.Commitments.AsNoTracking(), f, now, await settings.UpcomingDaysAsync(ct), db);
            var keys = new Dictionary<string, Expression<Func<Commitment, object?>>> { ["due"] = c => c.CurrentDueAt, ["ref"] = c => c.Id, ["status"] = c => c.Status, ["client"] = c => c.Client!.Code, ["owner"] = c => c.Owner!.DisplayName };
            return Results.Ok(await query.SortBy(sort, keys, "due").Select(Row(now)).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var c = await db.Commitments.AsNoTracking().Include(x => x.Client).Include(x => x.ResponsibleTeam).Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            var now = DateTimeOffset.UtcNow;
            var events = await db.CommitmentEvents.AsNoTracking().Where(e => e.CommitmentId == id).OrderBy(e => e.At).ThenBy(e => e.Id)
                .Select(e => new { e.Id, e.Type, e.PreviousDueAt, e.NewDueAt, e.CompletedAt, e.Reason, e.Evidence, e.At, by = e.By == null ? null : e.By.DisplayName }).ToListAsync(ct);
            var caseRef = c.CaseId is null ? null : await db.Cases.AsNoTracking().Where(x => x.Id == c.CaseId).Select(x => new { x.Id, x.Ref, x.Title }).FirstOrDefaultAsync(ct);
            var project = c.ProjectId is null ? null : await db.Projects.AsNoTracking().Where(x => x.Id == c.ProjectId).Select(x => new { x.Id, x.Code, x.Name }).FirstOrDefaultAsync(ct);
            var coordinator = await access.UserRefAsync(c.CoordinatorUserId, ct);
            var maintain = access.Me.SeesScope(c.ClientId, c.ResponsibleTeamId) && access.Me.Can(Role.Engineer);
            return ctx.WithETag(c, new
            {
                c.Id, c.Ref, c.Scope, c.Description, c.Type, c.Status, c.TimeZone,
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
                permissions = new { canEdit = maintain, canRevise = maintain && c.Status == CommitmentStatus.Open, canComplete = maintain && c.Status == CommitmentStatus.Open, canCancel = maintain && c.Status == CommitmentStatus.Open, canReopen = maintain && c.Status != CommitmentStatus.Open }
            });
        });

        g.MapPost("", async (CommitmentInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            access.Me.Require(Role.Engineer);
            var now = clock.GetUtcNow();
            var check = new Check();
            check.When(input.Scope is null, "scope", "Select Client-related or Internal.")
                 .Text("description", input.Description, 2000, "the description", true)
                 .When(input.Type is null, "type", "Select the commitment type.")
                 .When(input.OwnerUserId is null, "ownerUserId", "Select the accountable owner.")
                 .Text("responsibleOrganization", input.ResponsibleOrganization, 150, "Responsible organization");
            if (input.Scope == WorkScope.Client && input.ClientId is null) check.Add("clientId", "Client-related commitments need a client.");
            if (input.Scope == WorkScope.Internal && input.ClientId is not null) check.Add("clientId", "Internal commitments have no client.");
            if (input.Scope == WorkScope.Internal && input.ResponsibleTeamId is null) check.Add("responsibleTeamId", "Select the internal team scope.");
            if (input.ClientId is not null && !access.Me.HasClient(input.ClientId.Value)) check.Add("clientId", "Select a client you can access.");
            if (input.Scope == WorkScope.Internal && input.ResponsibleTeamId is not null && !access.Me.SeesInternal(input.ResponsibleTeamId)) check.Add("responsibleTeamId", "You have no internal scope for this team.");
            if (input.OwnerUserId is not null && input.OwnerUserId != access.Me.UserId && !access.Me.IsLead) check.Add("ownerUserId", "Only the TIO Manager can make someone else the owner. Choose yourself.");
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, input.ClientId, input.ResponsibleTeamId, "the owner", ct);
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, input.ClientId, input.ResponsibleTeamId, "the coordinator", ct);
            await CheckLinksAsync(check, db, input.ClientId, input.ResponsibleTeamId, input.CaseId, input.ProjectId, ct);
            var due = Zones.ToUtc(check, "dueLocal", input.DueLocal, input.TimeZone);
            check.ThrowIfAny();
            var c = new Commitment
            {
                Scope = input.Scope!.Value, ClientId = input.ClientId, ResponsibleTeamId = input.ResponsibleTeamId, Description = input.Description!.Trim(), Type = input.Type!.Value,
                OwnerUserId = input.OwnerUserId, ResponsibleParty = input.ResponsibleParty ?? ResponsibleParty.TIO, ResponsibleOrganization = Text.Clean(input.ResponsibleOrganization),
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
            access.RequireMaintain(c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            var check = new Check().Text("description", input.Description, 2000, "the description", true).When(input.Type is null, "type", "Select the type.")
                .When(input.OwnerUserId is null, "ownerUserId", "Select the accountable owner.").Text("responsibleOrganization", input.ResponsibleOrganization, 150, "Responsible organization");
            access.CheckOwnerChange(check, "ownerUserId", c.OwnerUserId, input.OwnerUserId);
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, c.ClientId, c.ResponsibleTeamId, "the owner", ct);
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, c.ClientId, c.ResponsibleTeamId, "the coordinator", ct);
            await CheckLinksAsync(check, db, c.ClientId, c.ResponsibleTeamId, input.CaseId, input.ProjectId, ct);
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            // Material changes count as a review of the commitment (Section 9: reviewed on material change).
            var material = input.Description!.Trim() != c.Description || input.Type != c.Type || input.OwnerUserId != c.OwnerUserId;
            if (input.OwnerUserId != c.OwnerUserId) c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.OwnerChanged, Reason = $"Owner {c.OwnerUserId} → {input.OwnerUserId}", ById = access.Me.UserId, At = now });
            c.Description = input.Description!.Trim();
            c.Type = input.Type!.Value;
            c.OwnerUserId = input.OwnerUserId;
            c.ResponsibleParty = input.ResponsibleParty ?? c.ResponsibleParty;
            c.ResponsibleOrganization = Text.Clean(input.ResponsibleOrganization);
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
            access.RequireMaintain(c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("dueLocal", "Only open commitments can be revised. Reopen it first.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reason for the revision");
            var check = new Check();
            var zone = string.IsNullOrWhiteSpace(input.TimeZone) ? c.TimeZone : input.TimeZone;
            var due = Zones.ToUtc(check, "dueLocal", input.DueLocal, zone);
            if (due == c.CurrentDueAt) check.Add("dueLocal", "This is already the current deadline.");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Revised, PreviousDueAt = c.CurrentDueAt, NewDueAt = due, Reason = reason, ById = access.Me.UserId, At = now });
            c.CurrentDueAt = due!.Value;
            c.RevisionCount++;
            c.LastReviewedAt = now;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // COM-03 / Section 5.4: completion needs a time (not before creation, not in the future) and evidence. Late stays Completed with a derived result.
        g.MapPost("/{id:long}/complete", async (long id, CompleteInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireMaintain(c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            if (c.Status != CommitmentStatus.Open) throw new ValidationException("completedAt", "Only open commitments can be completed.");
            var now = clock.GetUtcNow();
            var check = new Check().When(input.CompletedAt is null, "completedAt", "Enter when the commitment was fulfilled.")
                .When(input.CompletedAt > now.AddMinutes(1), "completedAt", "The completion time cannot be in the future.")
                .When(input.CompletedAt < c.CreatedAt, "completedAt", "The completion time cannot be before the commitment was created.")
                .Text("evidence", input.Evidence, 1000, "the completion evidence or reference", true);
            check.ThrowIfAny();
            c.Status = CommitmentStatus.Completed;
            c.CompletedAt = input.CompletedAt;
            c.CompletionEvidence = input.Evidence!.Trim();
            c.DueAtCompletion = c.CurrentDueAt;
            c.CompletedLate = input.CompletedAt > c.CurrentDueAt;
            c.LastReviewedAt = now;
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Completed, CompletedAt = input.CompletedAt, Evidence = c.CompletionEvidence, ById = access.Me.UserId, At = now, PreviousDueAt = c.CurrentDueAt });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/cancel", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Commitments.Include(x => x.Events).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The commitment");
            access.RequireMaintain(c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.CoordinatorUserId);
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
            access.RequireMaintain(c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            if (c.Status == CommitmentStatus.Open) throw new ValidationException("reason", "The commitment is already open.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reopening reason");
            var now = clock.GetUtcNow();
            c.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Reopened, Reason = reason, ById = access.Me.UserId, At = now, CompletedAt = c.CompletedAt });
            c.Status = CommitmentStatus.Open;
            c.CompletedAt = null;
            c.CompletionEvidence = null;
            c.CompletedLate = null;
            c.DueAtCompletion = null;
            c.CancelReason = null;
            c.LastReviewedAt = now;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    public sealed record CommitmentRow(long Id, string Ref, WorkScope Scope, string Description, CommitmentType Type, CommitmentStatus Status, long? ClientId, string? ClientCode,
        string? TeamName, long? OwnerUserId, string? OwnerName, bool OwnerDeactivated, DateTimeOffset OriginalDueAt, DateTimeOffset CurrentDueAt, string TimeZone,
        int RevisionCount, DateTimeOffset? CompletedAt, bool? CompletedLate, bool Overdue, DateTimeOffset? NextReviewAt);

    public static Expression<Func<Commitment, CommitmentRow>> Row(DateTimeOffset now) => c => new CommitmentRow(c.Id, c.Ref, c.Scope, c.Description, c.Type, c.Status,
        c.ClientId, c.Client == null ? null : c.Client.Code, c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name, c.OwnerUserId, c.Owner == null ? null : c.Owner.DisplayName,
        c.Owner != null && !c.Owner.IsActive, c.OriginalDueAt, c.CurrentDueAt, c.TimeZone, c.RevisionCount, c.CompletedAt, c.CompletedLate,
        c.Status == CommitmentStatus.Open && c.CurrentDueAt < now, c.NextReviewAt);

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
            check.Add("caseId", "Link a case in the same client or internal scope.");
        if (projectId is not null && (clientId is null || !await db.Projects.AnyAsync(p => p.Id == projectId && p.ClientId == clientId, ct)))
            check.Add("projectId", "Link a project of the same client.");
    }
}
