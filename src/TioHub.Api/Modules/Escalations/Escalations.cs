using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Escalations;

/// <summary>
/// A41 (owner request, 21 Oct 2026): escalation management. An escalation is a client matter raised above normal handling — received from the
/// customer, or raised by TIO — through a channel (e-mail, formal letter, verbal, Jira… a configuration list). It has an accountable owner,
/// a level (1–3), optional response and resolution targets and a timeline of communications, status changes and level raises. The hub records
/// the channel and its reference; it never sends e-mail or touches Jira.
/// </summary>
public class Escalation : Entity, IClientOwned
{
    public string Ref { get; set; } = null!;
    public long ClientId { get; set; }
    public Client? Client { get; set; }
    public long? ProjectId { get; set; }
    public long? ContractId { get; set; }
    public long? CaseId { get; set; }
    public string Title { get; set; } = "";
    public string? Description { get; set; }
    public EscalationDirection Direction { get; set; } = EscalationDirection.Received;
    /// <summary>Code from the EscalationChannel configuration list.</summary>
    public string Channel { get; set; } = "";
    /// <summary>Letter number, e-mail subject, Jira key or meeting note — whatever identifies it in that channel.</summary>
    public string? ChannelReference { get; set; }
    public Priority Priority { get; set; } = Priority.High;
    public int Level { get; set; } = 1;
    public string? CounterpartName { get; set; }
    public string? CounterpartTitle { get; set; }
    public string? CounterpartOrganization { get; set; }
    public string? CounterpartPhone { get; set; }
    public string? CounterpartMobile { get; set; }
    public string? CounterpartEmail { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
    public long OwnerUserId { get; set; }
    public User? Owner { get; set; }
    public DateTimeOffset? ResponseDueAt { get; set; }
    public DateTimeOffset? ResolutionDueAt { get; set; }
    public EscalationStatus Status { get; set; } = EscalationStatus.Open;
    public DateTimeOffset? AcknowledgedAt { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }
    public string? ResolutionSummary { get; set; }
    public long? ScopeClientId => ClientId;
    public List<EscalationEvent> Events { get; set; } = [];

    public static readonly EscalationStatus[] Active = [EscalationStatus.Open, EscalationStatus.Acknowledged, EscalationStatus.InProgress];
}

public class EscalationEvent
{
    public long Id { get; set; }
    public long EscalationId { get; set; }
    public EscalationEventType Type { get; set; }
    public EscalationStatus? Status { get; set; }
    public string? Channel { get; set; }
    /// <summary>For communications: true when TIO sent it, false when received.</summary>
    public bool? Outgoing { get; set; }
    public int? Level { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset At { get; set; }
    public long? ById { get; set; }
    public User? By { get; set; }
}

public enum EscalationDirection { Received, Raised }
public enum EscalationStatus { Open, Acknowledged, InProgress, Resolved, Closed, Withdrawn }
public enum EscalationEventType { Created, Communication, StatusChange, LevelRaised, OwnerChange }

public sealed record EscalationFilter(long? ClientId = null, long? ProjectId = null, long? ContractId = null, long? CaseId = null, string? Status = null, string? Channel = null,
    Priority? Priority = null, int? Level = null, long? OwnerId = null, bool? Overdue = null, string? Q = null, string? Country = null, long? ProductId = null);

public static class EscalationQuery
{
    public static IQueryable<Escalation> Apply(IQueryable<Escalation> q, EscalationFilter f, DateTimeOffset now, HubDbContext db)
    {
        if (f.ClientId is not null) q = q.Where(e => e.ClientId == f.ClientId || e.Client!.ParentClientId == f.ClientId);
        if (!string.IsNullOrWhiteSpace(f.Country)) q = f.Country == "Unknown" ? q.Where(e => e.Client!.CountryUnknown) : q.Where(e => e.Client!.Country == f.Country);
        if (f.ProjectId is not null) q = q.Where(e => e.ProjectId == f.ProjectId);
        if (f.ContractId is not null) q = q.Where(e => e.ContractId == f.ContractId);
        if (f.CaseId is not null) q = q.Where(e => e.CaseId == f.CaseId);
        if (f.ProductId is not null) q = q.Where(e => e.ProjectId != null && db.ProjectProducts.Any(pp => pp.ProjectId == e.ProjectId && pp.ProductId == f.ProductId));
        if (!string.IsNullOrWhiteSpace(f.Channel)) q = q.Where(e => e.Channel == f.Channel);
        if (f.Priority is not null) q = q.Where(e => e.Priority == f.Priority);
        if (f.Level is not null) q = q.Where(e => e.Level == f.Level);
        if (f.OwnerId is not null) q = q.Where(e => e.OwnerUserId == f.OwnerId);
        q = f.Status switch
        {
            null or "" or "active" => q.Where(e => e.Status == EscalationStatus.Open || e.Status == EscalationStatus.Acknowledged || e.Status == EscalationStatus.InProgress),
            "all" => q,
            _ when Enum.TryParse<EscalationStatus>(f.Status, true, out var s) => q.Where(e => e.Status == s),
            _ => q
        };
        if (f.Overdue == true) q = q.Where(Overdue(now));
        if (!string.IsNullOrWhiteSpace(f.Q))
            q = q.Where(e => e.Title.Contains(f.Q) || e.Ref.Contains(f.Q) || (e.ChannelReference != null && e.ChannelReference.Contains(f.Q)) || (e.CounterpartName != null && e.CounterpartName.Contains(f.Q)));
        return q;
    }

    /// <summary>Active and past its resolution target, or still unacknowledged past its response target.</summary>
    public static Expression<Func<Escalation, bool>> Overdue(DateTimeOffset now) => e =>
        (e.Status == EscalationStatus.Open || e.Status == EscalationStatus.Acknowledged || e.Status == EscalationStatus.InProgress)
        && ((e.ResolutionDueAt != null && e.ResolutionDueAt < now) || (e.Status == EscalationStatus.Open && e.ResponseDueAt != null && e.ResponseDueAt < now));
}

public static class EscalationEndpoints
{
    public sealed record EscalationInput(long? ClientId, long? ProjectId, long? ContractId, long? CaseId, string? Title, string? Description, EscalationDirection? Direction,
        string? Channel, string? ChannelReference, Priority? Priority, int? Level, ContactDetailsInput? Counterpart, DateTimeOffset? ReceivedAt, long? OwnerUserId,
        DateTimeOffset? ResponseDueAt, DateTimeOffset? ResolutionDueAt);
    public sealed record CommunicationInput(string? Channel, bool? Outgoing, DateTimeOffset? At, string? Note);
    public sealed record StatusInput(EscalationStatus? Status, string? Note, string? ResolutionSummary);
    public sealed record NoteInput(string? Note);

    private static readonly Dictionary<EscalationStatus, EscalationStatus[]> Moves = new()
    {
        [EscalationStatus.Open] = [EscalationStatus.Acknowledged, EscalationStatus.InProgress, EscalationStatus.Resolved, EscalationStatus.Withdrawn],
        [EscalationStatus.Acknowledged] = [EscalationStatus.InProgress, EscalationStatus.Resolved, EscalationStatus.Withdrawn],
        [EscalationStatus.InProgress] = [EscalationStatus.Resolved, EscalationStatus.Withdrawn],
        [EscalationStatus.Resolved] = [EscalationStatus.Closed, EscalationStatus.InProgress],
        [EscalationStatus.Closed] = [EscalationStatus.InProgress],
        [EscalationStatus.Withdrawn] = [EscalationStatus.Open]
    };

    public static void MapEscalationEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/escalations").WithTags("Escalations");

        g.MapGet("", async (long? clientId, long? projectId, long? contractId, long? caseId, string? status, string? channel, Priority? priority, int? level, long? ownerId, bool? overdue,
            string? q, string? country, long? productId, string? sort, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var now = DateTimeOffset.UtcNow;
            var f = new EscalationFilter(clientId, projectId, contractId, caseId, status, channel, priority, level, ownerId, overdue, q, country, productId);
            var query = EscalationQuery.Apply(db.Escalations.AsNoTracking(), f, now, db);
            var keys = new Dictionary<string, Expression<Func<Escalation, object?>>>
            {
                ["ref"] = e => e.Id, ["received"] = e => e.ReceivedAt, ["due"] = e => e.ResolutionDueAt, ["priority"] = e => e.Priority, ["level"] = e => e.Level,
                ["status"] = e => e.Status, ["client"] = e => e.Client!.Code, ["owner"] = e => e.Owner!.DisplayName, ["channel"] = e => e.Channel
            };
            var overdueExpr = EscalationQuery.Overdue(now).Compile();
            var rows = await query.SortBy(sort, keys, "-received").Select(e => new
            {
                e.Id, e.Ref, e.Title, e.ClientId, clientCode = e.Client!.Code, e.Direction, e.Channel, e.ChannelReference, e.Priority, e.Level, e.Status,
                e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt, e.AcknowledgedAt, e.CounterpartName, e.CounterpartOrganization,
                owner = e.Owner == null ? null : new UserRef(e.Owner.Id, e.Owner.DisplayName, e.Owner.IsActive),
                active = e.Status == EscalationStatus.Open || e.Status == EscalationStatus.Acknowledged || e.Status == EscalationStatus.InProgress,
                overdue = (e.Status == EscalationStatus.Open || e.Status == EscalationStatus.Acknowledged || e.Status == EscalationStatus.InProgress)
                    && ((e.ResolutionDueAt != null && e.ResolutionDueAt < now) || (e.Status == EscalationStatus.Open && e.ResponseDueAt != null && e.ResponseDueAt < now)),
                lastActivityAt = e.Events.Max(x => (DateTimeOffset?)x.At)
            }).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            return Results.Ok(rows);
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var e = await db.Escalations.AsNoTracking().Include(x => x.Client).Include(x => x.Owner).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The escalation");
            var now = DateTimeOffset.UtcNow;
            var events = await db.EscalationEvents.AsNoTracking().Where(x => x.EscalationId == id).OrderBy(x => x.At).ThenBy(x => x.Id)
                .Select(x => new { x.Id, x.Type, x.Status, x.Channel, x.Outgoing, x.Level, x.Note, x.At, by = x.By == null ? null : x.By.DisplayName }).ToListAsync(ct);
            var project = e.ProjectId is null ? null : await db.Projects.AsNoTracking().Where(x => x.Id == e.ProjectId).Select(x => new { x.Id, x.Code, x.Name }).FirstOrDefaultAsync(ct);
            var contract = e.ContractId is null ? null : await db.Contracts.AsNoTracking().Where(x => x.Id == e.ContractId).Select(x => new { x.Id, x.Ref, x.Title }).FirstOrDefaultAsync(ct);
            var caseRef = e.CaseId is null ? null : await db.Cases.AsNoTracking().Where(x => x.Id == e.CaseId).Select(x => new { x.Id, x.Ref, x.Title }).FirstOrDefaultAsync(ct);
            var edit = access.Me.SeesScope(e.ClientId, null) && access.Me.HasPermission(ResourcePermissions.Other, ResourcePermissions.Maintain);
            var active = Escalation.Active.Contains(e.Status);
            return ctx.WithETag(e, new
            {
                e.Id, e.Ref, e.Title, e.Description, e.Direction, e.Channel, e.ChannelReference, e.Priority, e.Level, e.Status,
                client = new { e.Client!.Id, e.Client.Code, e.Client.Name },
                counterpart = e.CounterpartName == null ? null : new { name = e.CounterpartName, title = e.CounterpartTitle, organization = e.CounterpartOrganization, phone = e.CounterpartPhone, mobile = e.CounterpartMobile, email = e.CounterpartEmail },
                owner = e.Owner == null ? null : new UserRef(e.Owner.Id, e.Owner.DisplayName, e.Owner.IsActive),
                e.ReceivedAt, e.ResponseDueAt, e.ResolutionDueAt, e.AcknowledgedAt, e.ResolvedAt, e.ClosedAt, e.ResolutionSummary,
                active, overdue = EscalationQuery.Overdue(now).Compile()(e),
                responseOverdue = e.Status == EscalationStatus.Open && e.ResponseDueAt < now,
                project, contract, @case = caseRef, events, e.CreatedAt, e.UpdatedAt,
                nextStatuses = edit ? Moves[e.Status] : [],
                permissions = new { canEdit = edit, canLog = edit, canRaise = edit && active && e.Level < 3, canChangeOwner = edit && access.Me.HasPermission(ResourcePermissions.Other, ResourcePermissions.Coordinate) }
            });
        });

        g.MapPost("", async (EscalationInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            access.Me.RequirePermission(ResourcePermissions.Other, ResourcePermissions.Create);
            var now = clock.GetUtcNow();
            var e = new Escalation { Status = EscalationStatus.Open };
            await ApplyAsync(e, input, null, db, access, now, ct);
            e.Events.Add(new EscalationEvent { Type = EscalationEventType.Created, Status = EscalationStatus.Open, Channel = e.Channel, Outgoing = e.Direction == EscalationDirection.Raised,
                Level = e.Level, Note = e.Description, At = e.ReceivedAt, ById = access.Me.UserId });
            db.Escalations.Add(e);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/escalations/{e.Id}", new { e.Id, e.Ref });
        });

        g.MapPut("/{id:long}", async (long id, EscalationInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var e = await db.Escalations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The escalation");
            access.RequireMaintain(ResourcePermissions.Other, e.ClientId, null);
            db.ExpectVersion(ctx, e);
            var before = e.OwnerUserId;
            await ApplyAsync(e, input, e, db, access, clock.GetUtcNow(), ct);
            if (before != e.OwnerUserId)
                db.EscalationEvents.Add(new EscalationEvent { EscalationId = id, Type = EscalationEventType.OwnerChange, Note = "Owner changed", At = clock.GetUtcNow(), ById = access.Me.UserId });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/communications", async (long id, CommunicationInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var e = await db.Escalations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The escalation");
            access.RequireMaintain(ResourcePermissions.Other, e.ClientId, null);
            var now = clock.GetUtcNow();
            var check = new Check().Text("note", input.Note, 2000, "what was said or sent", required: true)
                .When((input.At ?? now) < e.ReceivedAt, "at", "The communication cannot be before the escalation was received.")
                .When(input.At > now.AddMinutes(5), "at", "The time cannot be in the future.");
            var channel = await new LookupService(db).CheckAsync(check, "channel", LookupLists.EscalationChannel, input.Channel, "the channel", null, ct, required: true);
            check.ThrowIfAny();
            db.EscalationEvents.Add(new EscalationEvent { EscalationId = id, Type = EscalationEventType.Communication, Channel = channel, Outgoing = input.Outgoing ?? true,
                Note = input.Note!.Trim(), At = input.At ?? now, ById = access.Me.UserId });
            // Answering a received escalation acknowledges it.
            if (e.Status == EscalationStatus.Open && input.Outgoing != false)
            {
                e.Status = EscalationStatus.Acknowledged;
                e.AcknowledgedAt ??= input.At ?? now;
                db.EscalationEvents.Add(new EscalationEvent { EscalationId = id, Type = EscalationEventType.StatusChange, Status = EscalationStatus.Acknowledged, Note = "Acknowledged by the reply", At = input.At ?? now, ById = access.Me.UserId });
            }
            e.UpdatedAt = now;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/status", async (long id, StatusInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var e = await db.Escalations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The escalation");
            access.RequireMaintain(ResourcePermissions.Other, e.ClientId, null);
            var now = clock.GetUtcNow();
            var check = new Check().When(input.Status is null, "status", "Select the new status.").Text("note", input.Note, 2000, "Note")
                .When(now < e.ReceivedAt, "status", "The status cannot change before the escalation was received. Correct the receipt time first.")
                .Text("resolutionSummary", input.ResolutionSummary, 2000, "the resolution");
            var to = input.Status ?? e.Status;
            if (input.Status is not null && !Moves[e.Status].Contains(to)) check.Add("status", $"An escalation that is {Label(e.Status)} cannot become {Label(to)}.");
            if (to == EscalationStatus.Resolved && string.IsNullOrWhiteSpace(input.ResolutionSummary)) check.Add("resolutionSummary", "Describe how the escalation was resolved.");
            var reopening = !Escalation.Active.Contains(e.Status) && Escalation.Active.Contains(to);
            if ((to == EscalationStatus.Withdrawn || reopening) && string.IsNullOrWhiteSpace(input.Note)) check.Add("note", "Give the reason.");
            check.ThrowIfAny();
            e.Status = to;
            if (to != EscalationStatus.Open && to != EscalationStatus.Withdrawn) e.AcknowledgedAt ??= now;
            if (to == EscalationStatus.Resolved) { e.ResolvedAt = now; e.ResolutionSummary = input.ResolutionSummary!.Trim(); }
            if (to == EscalationStatus.Closed) e.ClosedAt = now;
            if (reopening) { e.ResolvedAt = null; e.ClosedAt = null; }
            db.EscalationEvents.Add(new EscalationEvent { EscalationId = id, Type = EscalationEventType.StatusChange, Status = to,
                Note = Text.Clean(to == EscalationStatus.Resolved ? input.ResolutionSummary : input.Note) ?? Text.Clean(input.Note), At = now, ById = access.Me.UserId });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/raise-level", async (long id, NoteInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var e = await db.Escalations.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The escalation");
            access.RequireMaintain(ResourcePermissions.Other, e.ClientId, null);
            var check = new Check().Text("note", input.Note, 2000, "the reason", required: true)
                .When(clock.GetUtcNow() < e.ReceivedAt, "note", "The level cannot change before the escalation was received. Correct the receipt time first.")
                .When(e.Level >= 3, "note", "The escalation is already at the highest level (3).")
                .When(!Escalation.Active.Contains(e.Status), "note", "Only an active escalation can be raised.");
            check.ThrowIfAny();
            e.Level++;
            db.EscalationEvents.Add(new EscalationEvent { EscalationId = id, Type = EscalationEventType.LevelRaised, Level = e.Level, Note = input.Note!.Trim(), At = clock.GetUtcNow(), ById = access.Me.UserId });
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    public static string Label(EscalationStatus s) => s switch { EscalationStatus.InProgress => "in progress", _ => s.ToString().ToLowerInvariant() };

    private static async Task ApplyAsync(Escalation e, EscalationInput i, Escalation? existing, HubDbContext db, HubAccess access, DateTimeOffset now, CancellationToken ct)
    {
        var check = new Check()
            .Text("title", i.Title, 200, "the title", required: true).Text("description", i.Description, 4000, "Description")
            .Text("channelReference", i.ChannelReference, 300, "Channel reference")
            .When(i.ClientId is null, "clientId", "Select the client.")
            .When(i.Level is < 1 or > 3, "level", "The level is 1, 2 or 3.")
            .When(i.OwnerUserId is null, "ownerUserId", "Select the accountable owner.")
            .When(i.ReceivedAt > now.AddMinutes(5), "receivedAt", "The escalation cannot be received in the future.")
            .When(i.ResolutionDueAt is not null && i.ResponseDueAt is not null && i.ResolutionDueAt < i.ResponseDueAt, "resolutionDueAt", "Resolution cannot be due before the response.");
        ContactDetails.Check(check, "counterpart", i.Counterpart, "Contact");
        if (i.ClientId is not null && !access.Me.HasClient(i.ClientId.Value)) check.Add("clientId", "Select a client you can access.");
        if (existing is not null && i.ClientId is not null && i.ClientId != existing.ClientId) check.Add("clientId", "An escalation stays with its client.");
        var channel = await new LookupService(db).CheckAsync(check, "channel", LookupLists.EscalationChannel, i.Channel, "the channel", existing?.Channel, ct, required: true);
        if (existing is null)
        {
            if (i.OwnerUserId is not null && i.OwnerUserId != access.Me.UserId && !access.Me.HasPermission(ResourcePermissions.Other, ResourcePermissions.Coordinate)) check.Add("ownerUserId", "Other operations coordination permission is required to assign someone else. Choose yourself.");
        }
        else access.CheckOwnerChange(check, "ownerUserId", existing.OwnerUserId, i.OwnerUserId);
        await access.CheckAssignableAsync(check, "ownerUserId", i.OwnerUserId, i.ClientId, null, "the owner", ct);
        // Links must belong to the same client (or one of its sub-clients' records belong to the sub-client itself).
        if (i.ProjectId is not null && !await db.Projects.AnyAsync(p => p.Id == i.ProjectId && p.ClientId == i.ClientId, ct)) check.Add("projectId", "Select a project of this client.");
        if (i.ContractId is not null && !await db.Contracts.AnyAsync(c => c.Id == i.ContractId && c.ClientId == i.ClientId, ct)) check.Add("contractId", "Select a contract of this client.");
        if (i.CaseId is not null && !await db.Cases.AnyAsync(c => c.Id == i.CaseId && c.ClientId == i.ClientId, ct)) check.Add("caseId", "Select a case of this client.");
        var receivedAt = i.ReceivedAt ?? existing?.ReceivedAt ?? now;
        if (existing is not null && receivedAt != existing.ReceivedAt)
        {
            // The Created event describes receipt itself; later history must keep its actual times.
            var precedesHistory = existing.AcknowledgedAt < receivedAt || existing.ResolvedAt < receivedAt || existing.ClosedAt < receivedAt
                || await db.EscalationEvents.AnyAsync(x => x.EscalationId == e.Id && x.Type != EscalationEventType.Created && x.At < receivedAt, ct);
            if (precedesHistory) check.Add("receivedAt", "Receipt cannot be after an existing communication or lifecycle event.");
        }
        if (existing is not null && i.OwnerUserId != existing.OwnerUserId && now < receivedAt)
            check.Add("receivedAt", "Receipt cannot be after the owner change. Correct the receipt time first.");
        check.ThrowIfAny();
        if (existing is not null && receivedAt != existing.ReceivedAt)
        {
            var receiptEvents = await db.EscalationEvents.Where(x => x.EscalationId == e.Id && x.Type == EscalationEventType.Created).ToListAsync(ct);
            foreach (var receiptEvent in receiptEvents) receiptEvent.At = receivedAt;
        }
        if (existing is null) access.RequireCreateFor(ResourcePermissions.Other, i.ClientId);
        e.ClientId = i.ClientId!.Value;
        e.ProjectId = i.ProjectId;
        e.ContractId = i.ContractId;
        e.CaseId = i.CaseId;
        e.Title = i.Title!.Trim();
        e.Description = Text.Clean(i.Description);
        e.Direction = i.Direction ?? EscalationDirection.Received;
        e.Channel = channel!;
        e.ChannelReference = Text.Clean(i.ChannelReference);
        e.Priority = i.Priority ?? Priority.High;
        if (existing is null) e.Level = i.Level ?? 1;
        var c = i.Counterpart;
        e.CounterpartName = Text.Clean(c?.Name);
        e.CounterpartTitle = e.CounterpartName is null ? null : Text.Clean(c?.Title);
        e.CounterpartOrganization = e.CounterpartName is null ? null : Text.Clean(c?.Organization);
        e.CounterpartPhone = e.CounterpartName is null ? null : Text.Clean(c?.Phone);
        e.CounterpartMobile = e.CounterpartName is null ? null : Text.Clean(c?.Mobile);
        e.CounterpartEmail = e.CounterpartName is null ? null : Text.Clean(c?.Email);
        e.ReceivedAt = receivedAt;
        e.OwnerUserId = i.OwnerUserId!.Value;
        e.ResponseDueAt = i.ResponseDueAt;
        e.ResolutionDueAt = i.ResolutionDueAt;
    }
}
