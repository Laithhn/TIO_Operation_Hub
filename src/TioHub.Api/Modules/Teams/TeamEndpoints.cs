using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Teams;

public static class TeamEndpoints
{
    /// <summary>Teams are internal data: list and object operations share the same scope boundary.</summary>
    public static IQueryable<Team> VisibleTeams(IQueryable<Team> teams, UserContext me)
    {
        if (me.IsSystem || me.AllInternal) return teams;
        var ids = me.TeamIds.ToArray();
        return teams.Where(team => ids.Contains(team.Id));
    }

    // Mixed-resource workflows must never turn Teams access into permission to
    // inspect or change another module's records.
    public static bool CanReadOwnedRecord(UserContext me, string recordType)
    {
        string resource;
        try { resource = RightKeys.ForRecord(recordType); }
        catch (NotFoundException) { return false; }
        return me.HasRight(resource, RightKeys.View)
            && (recordType != RecordTypes.Region || me.HasRight(RightKeys.Tab("ClientStructure", "structure", "View")));
    }

    public static bool CanTransferOwnedRecord(UserContext me, string recordType, long? clientId, long? teamId) =>
        CanReadOwnedRecord(me, recordType)
        && me.SeesScope(clientId, teamId)
        && me.HasRight(RightKeys.ForRecord(recordType), RightKeys.Coordinate)
        && (recordType != RecordTypes.Region || me.HasRight(RightKeys.Tab("ClientStructure", "structure", "Maintain")));

    /// <summary>Team assignment counts combine case and commitment information.</summary>
    public static void RequireAssignmentSources(UserContext me) =>
        RightChecks.RequireViews(me, RightKeys.Cases, RightKeys.Commitments);

    public sealed record HandoverTextView(string? Summary, string? OutstandingActions, string? DocumentationNotes,
        string? AcknowledgmentNote, string? CancelReason, string? ExceptionReason);

    /// <summary>Free text can describe any item, so every source type must be readable before it is disclosed.</summary>
    public static HandoverTextView VisibleHandoverText(UserContext me, Handover handover)
    {
        if (handover.Items.Count == 0 || handover.Items.Any(item => !CanReadOwnedRecord(me, item.RecordType)))
            return new(null, null, null, null, null, null);
        return new(handover.Summary, handover.OutstandingActions, handover.DocumentationNotes,
            handover.AcknowledgmentNote, handover.CancelReason, handover.ExceptionReason);
    }

    public sealed record TeamInput(string? Code, string? Name, long? LeadUserId, long? ManagerUserId, string? Description, bool IsActive = true);
    public sealed record MemberInput(long? UserId, string? TeamRole, string? Skills, string? ProductFamiliarity, bool IsActive = true);
    public sealed record HandoverItemInput(string? RecordType, long? RecordId);
    public sealed record HandoverInput(long? OutgoingOwnerId, long? ReceivingOwnerId, DateTimeOffset? EffectiveAt, string? Summary, string? OutstandingActions, string? DocumentationNotes, HandoverItemInput[]? Items);
    public sealed record AckInput(string? Note);
    public sealed record ExceptionInput(string? Reason, long? FollowUpOwnerId, DateOnly? FollowUpDate);
    public sealed record CancelInput(string? Reason);

    public static void MapTeamEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/teams").WithTags("Teams");

        g.MapGet("", async (HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            return Results.Ok(await VisibleTeams(db.Teams.AsNoTracking(), access.Me).OrderBy(t => t.Name).Select(t => new
            {
                t.Id, t.Code, t.Name, t.Description, t.IsActive,
                lead = t.Lead == null ? null : new UserRef(t.Lead.Id, t.Lead.DisplayName, t.Lead.IsActive),
                manager = t.Manager == null ? null : new UserRef(t.Manager.Id, t.Manager.DisplayName, t.Manager.IsActive),
                memberCount = t.Members.Count(m => m.IsActive), version = Convert.ToBase64String(t.RowVersion)
            }).ToListAsync(ct));
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var t = await VisibleTeams(db.Teams.AsNoTracking(), access.Me).Include(x => x.Lead).Include(x => x.Manager).Include(x => x.Members).ThenInclude(m => m.User).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The team");
            return ctx.WithETag(t, new
            {
                t.Id, t.Code, t.Name, t.Description, t.IsActive, t.LeadUserId, t.ManagerUserId,
                lead = t.Lead == null ? null : new UserRef(t.Lead.Id, t.Lead.DisplayName, t.Lead.IsActive),
                manager = t.Manager == null ? null : new UserRef(t.Manager.Id, t.Manager.DisplayName, t.Manager.IsActive),
                members = t.Members.OrderBy(m => m.User!.DisplayName).Select(m => new
                {
                    m.Id, m.UserId, name = m.User!.DisplayName, userActive = m.User.IsActive, timeZone = m.User.WorkingTimeZone, m.TeamRole, m.Skills, m.ProductFamiliarity, m.IsActive,
                    version = Convert.ToBase64String(m.RowVersion)
                })
            });
        });

        g.MapPost("", async (TeamInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            me.RequireRight(RightKeys.Teams, RightKeys.Create);
            if (!me.IsSystem && !me.AllInternal) throw new ForbiddenException("Creating a team requires access to all internal teams.");
            var t = new Team();
            await ApplyTeamAsync(t, input, db, ct);
            db.Teams.Add(t);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/teams/{t.Id}", new { t.Id });
        });
        g.MapPut("/{id:long}", async (long id, TeamInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var t = await VisibleTeams(db.Teams, me).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The team");
            me.RequireRight(RightKeys.Teams, RightKeys.Maintain);
            if (input.LeadUserId != t.LeadUserId || input.ManagerUserId != t.ManagerUserId)
                me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            db.ExpectVersion(ctx, t);
            await ApplyTeamAsync(t, input, db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/{id:long}/members", async (long id, MemberInput input, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var t = await VisibleTeams(db.Teams, me).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The team");
            me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            var check = new Check();
            if (input.UserId is null || !await db.Users.AnyAsync(u => u.Id == input.UserId && u.IsActive, ct)) check.Add("userId", "Select an active person.");
            var m = new TeamMember { TeamId = id };
            await ApplyMemberAsync(m, input, check, db, ct);
            if (await db.TeamMembers.AnyAsync(x => x.TeamId == id && x.UserId == input.UserId, ct)) throw new ConflictException("This person is already a member. Edit the membership instead.");
            m.UserId = input.UserId!.Value;
            db.TeamMembers.Add(m);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/teams/{id}/members/{m.Id}", new { m.Id });
        });
        g.MapPut("/{id:long}/members/{memberId:long}", async (long id, long memberId, MemberInput input, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var t = await VisibleTeams(db.Teams, me).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The team");
            me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            var m = await db.TeamMembers.FirstOrDefaultAsync(x => x.Id == memberId && x.TeamId == id, ct) ?? throw new NotFoundException("The membership");
            db.ExpectVersion(ctx, m);
            await ApplyMemberAsync(m, input, new Check(), db, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        // A53: a membership can be removed (the person and their work are untouched).
        g.MapDelete("/{id:long}/members/{memberId:long}", async (long id, long memberId, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var t = await VisibleTeams(db.Teams, me).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The team");
            me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            var m = await db.TeamMembers.FirstOrDefaultAsync(x => x.Id == memberId && x.TeamId == id, ct) ?? throw new NotFoundException("The membership");
            db.TeamMembers.Remove(m);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // TEAM-03: assignments, waiting/blockers, due dates and coverage per team and engineer.
        g.MapGet("/{id:long}/assignments", async (long id, HubDbContext db, HubAccess access, HubSettings settings, CancellationToken ct) =>
        {
            access.RequireAccess();
            RequireAssignmentSources(access.Me);
            var team = await VisibleTeams(db.Teams.AsNoTracking(), access.Me).Include(t => t.Members).ThenInclude(m => m.User).FirstOrDefaultAsync(t => t.Id == id, ct) ?? throw new NotFoundException("The team");
            var now = DateTimeOffset.UtcNow;
            var prios = await settings.CoveragePrioritiesAsync(ct);
            var cases = await db.Cases.AsNoTracking().Where(c => c.ResponsibleTeamId == id && c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled)
                .Select(c => new { c.Id, c.Ref, c.Title, c.Status, c.Priority, c.OwnerUserId, c.BackupOwnerUserId, backupActive = c.BackupOwner == null || c.BackupOwner.IsActive, c.WaitingReason, c.DueAt, c.NextReviewAt, c.NextAction })
                .ToListAsync(ct);
            var commitments = await db.Commitments.AsNoTracking().Where(c => c.Status == CommitmentStatus.Open && c.ResponsibleTeamId == id)
                .Select(c => new { c.Id, c.Ref, c.Title, c.Description, c.OwnerUserId, c.CurrentDueAt, c.TimeZone }).ToListAsync(ct);
            var people = team.Members.Where(m => m.IsActive).OrderBy(m => m.User!.DisplayName).Select(m => new
            {
                m.UserId, name = m.User!.DisplayName, active = m.User.IsActive, timeZone = m.User.WorkingTimeZone, m.TeamRole,
                openCases = cases.Count(c => c.OwnerUserId == m.UserId),
                waiting = cases.Count(c => c.OwnerUserId == m.UserId && c.WaitingReason != null),
                overdue = cases.Count(c => c.OwnerUserId == m.UserId && c.DueAt < now) + commitments.Count(c => c.OwnerUserId == m.UserId && c.CurrentDueAt < now),
                backupFor = cases.Count(c => c.BackupOwnerUserId == m.UserId),
                openCommitments = commitments.Count(c => c.OwnerUserId == m.UserId)
            });
            return Results.Ok(new
            {
                team = new { team.Id, team.Code, team.Name },
                people,
                unassigned = cases.Where(c => c.OwnerUserId == null),
                coverageGaps = cases.Where(c => prios.Contains(c.Priority) && (c.BackupOwnerUserId == null || !c.backupActive)),
                cases,
                note = "Capacity and planned hours arrive in the Next release; no utilization or performance score is shown."
            });
        });

        // ACC-04 / TEAM-03: active records of deactivated owners. Nothing is reassigned automatically.
        api.MapGet("/reassignment-queue", async (HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            return Results.Ok(await ReassignmentQueueAsync(db, ct));
        }).WithTags("Teams");

        // ---- handovers (OPS-05, Section 5.6) ----
        var h = api.MapGroup("/handovers").WithTags("Handovers");
        h.MapGet("", async (string? status, bool? mine, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var q = db.Handovers.AsNoTracking().AsQueryable();
            if (status == "pending") q = q.Where(x => x.Status == HandoverStatus.PendingAcknowledgment);
            if (mine == true) q = q.Where(x => x.ReceivingOwnerId == access.Me.UserId || x.OutgoingOwnerId == access.Me.UserId);
            var rows = await q.Include(x => x.Items).Include(x => x.OutgoingOwner).Include(x => x.ReceivingOwner)
                .OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
            return Results.Ok(rows.Select(x => new
            {
                x.Id, x.Ref, x.Status, x.EffectiveAt, summary = VisibleHandoverText(access.Me, x).Summary ?? "Restricted", x.ClientId,
                outgoing = new UserRef(x.OutgoingOwner!.Id, x.OutgoingOwner.DisplayName, x.OutgoingOwner.IsActive),
                receiving = new UserRef(x.ReceivingOwner!.Id, x.ReceivingOwner.DisplayName, x.ReceivingOwner.IsActive),
                itemCount = x.Items.Count, x.AcknowledgedAt, x.CompletedAt
            }));
        });
        h.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var x = await db.Handovers.AsNoTracking().Include(z => z.Items).Include(z => z.OutgoingOwner).Include(z => z.ReceivingOwner).FirstOrDefaultAsync(z => z.Id == id, ct) ?? throw new NotFoundException("The handover");
            var users = await access.UserRefsAsync([x.ExceptionApprovedById, x.ExceptionFollowUpOwnerId], ct);
            var text = VisibleHandoverText(access.Me, x);
            return ctx.WithETag(x, new
            {
                x.Id, x.Ref, x.Status, x.EffectiveAt, summary = text.Summary ?? "Restricted", text.OutstandingActions, text.DocumentationNotes, x.ClientId,
                outgoing = new UserRef(x.OutgoingOwner!.Id, x.OutgoingOwner.DisplayName, x.OutgoingOwner.IsActive),
                receiving = new UserRef(x.ReceivingOwner!.Id, x.ReceivingOwner.DisplayName, x.ReceivingOwner.IsActive),
                x.AcknowledgedAt, text.AcknowledgmentNote, x.CompletedAt, text.CancelReason,
                exception = x.ExceptionReason == null ? null : new { reason = text.ExceptionReason, approvedBy = x.ExceptionApprovedById is { } a ? users.GetValueOrDefault(a) : null, followUpOwner = x.ExceptionFollowUpOwnerId is { } f ? users.GetValueOrDefault(f) : null, followUpDate = x.ExceptionFollowUpDate },
                // A handover viewer may lack View in the source module. Do not expose
                // the source record identity, label, or processing notes in that case.
                items = x.Items.Select(i => new
                {
                    i.Id, recordType = CanReadOwnedRecord(access.Me, i.RecordType) ? i.RecordType : null,
                    recordId = CanReadOwnedRecord(access.Me, i.RecordType) ? (long?)i.RecordId : null,
                    label = CanReadOwnedRecord(access.Me, i.RecordType) ? i.Label : null,
                    restricted = !CanReadOwnedRecord(access.Me, i.RecordType),
                    previousOwnerId = CanReadOwnedRecord(access.Me, i.RecordType) ? i.PreviousOwnerId : null,
                    i.Applied, notAppliedReason = CanReadOwnedRecord(access.Me, i.RecordType) ? i.NotAppliedReason : null
                }),
                permissions = new
                {
                    canAcknowledge = access.Me.HasRight("Handovers:Maintain") && x.Status == HandoverStatus.PendingAcknowledgment && x.ReceivingOwnerId == access.Me.UserId,
                    canAuthorizeException = access.Me.HasRight("Handovers:Maintain") && x.Status == HandoverStatus.PendingAcknowledgment && access.Me.HasRight(RightKeys.Teams, RightKeys.Coordinate),
                    canCancel = access.Me.HasRight("Handovers:Maintain") && x.Status == HandoverStatus.PendingAcknowledgment && access.Me.HasRight(RightKeys.Teams, RightKeys.Coordinate)
                }
            });
        });
        h.MapGet("/candidates", async (long ownerId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            return Results.Ok(await OwnedRecordsAsync(db, ownerId, ct));
        });
        h.MapPost("", async (HandoverInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            var check = new Check();
            check.When(input.OutgoingOwnerId is null, "outgoingOwnerId", "Select the outgoing owner.")
                 .When(input.ReceivingOwnerId is null, "receivingOwnerId", "Select the receiving owner.")
                 .When(input.OutgoingOwnerId == input.ReceivingOwnerId && input.OutgoingOwnerId is not null, "receivingOwnerId", "The receiving owner must be a different person.")
                 .When(input.EffectiveAt is null, "effectiveAt", "Enter the effective time.")
                 .Text("summary", input.Summary, 2000, "the handover summary", true)
                 .Text("outstandingActions", input.OutstandingActions, 2000, "Outstanding actions")
                 .Text("documentationNotes", input.DocumentationNotes, 2000, "Documentation notes")
                 .When((input.Items ?? []).Length == 0, "items", "Select at least one affected record.");
            if (input.ReceivingOwnerId is not null && !await db.Users.AnyAsync(u => u.Id == input.ReceivingOwnerId && u.IsActive, ct)) check.Add("receivingOwnerId", "The receiving owner must be an active person.");
            check.ThrowIfAny();
            var items = new List<HandoverItem>();
            foreach (var (it, n) in input.Items!.Select((it, n) => (it, n)))
            {
                var rec = await OwnedRecord.LoadAsync(db, it.RecordType, it.RecordId, ct);
                if (rec is null) { check.Add($"items[{n}]", "This record was not found or you cannot access it."); continue; }
                if (!CanTransferOwnedRecord(access.Me, rec.Type, rec.ClientId, rec.TeamId)) { check.Add($"items[{n}]", "This record was not found or you cannot transfer its ownership."); continue; }
                if (rec.OwnerId != input.OutgoingOwnerId) { check.Add($"items[{n}]", $"{rec.Label} is not owned by the outgoing owner."); continue; }
                await access.CheckAssignableAsync(check, $"items[{n}]", input.ReceivingOwnerId, rec.ClientId, rec.TeamId, $"the new owner of {rec.Label}", ct);
                items.Add(new HandoverItem { RecordType = rec.Type, RecordId = rec.Id, ClientId = rec.ClientId, Label = rec.Label, PreviousOwnerId = rec.OwnerId });
            }
            check.ThrowIfAny();
            var clients = items.Select(i => i.ClientId).Distinct().ToList();
            var ho = new Handover
            {
                ClientId = clients.Count == 1 ? clients[0] : null, OutgoingOwnerId = input.OutgoingOwnerId!.Value, ReceivingOwnerId = input.ReceivingOwnerId!.Value, EffectiveAt = input.EffectiveAt!.Value,
                Summary = input.Summary!.Trim(), OutstandingActions = Text.Clean(input.OutstandingActions), DocumentationNotes = Text.Clean(input.DocumentationNotes), Items = items
            };
            db.Handovers.Add(ho);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/handovers/{ho.Id}", new { ho.Id, ho.Ref });
        });
        h.MapPost("/{id:long}/acknowledge", async (long id, AckInput input, HttpContext ctx, HubDbContext db, HubAccess access, UserResolver resolver, TimeProvider clock, CancellationToken ct) =>
        {
            // Keep recipient eligibility stable until all ownership changes are saved together.
            await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
            var ho = await db.Handovers.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The handover");
            db.ExpectVersion(ctx, ho);
            if (ho.Status != HandoverStatus.PendingAcknowledgment) throw new ValidationException("status", "This handover is no longer pending.");
            if (ho.ReceivingOwnerId != access.Me.UserId) throw new ForbiddenException("Only the receiving owner can acknowledge the handover.");
            new Check().Text("note", input.Note, 1000, "Note").ThrowIfAny();
            var now = clock.GetUtcNow();
            ho.AcknowledgedAt = now;
            ho.AcknowledgmentNote = Text.Clean(input.Note);
            await ApplyAsync(db, access, resolver, ho, HandoverStatus.Completed, now, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
        h.MapPost("/{id:long}/exception", async (long id, ExceptionInput input, HttpContext ctx, HubDbContext db, HubAccess access, UserResolver resolver, TimeProvider clock, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
            var ho = await db.Handovers.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The handover");
            db.ExpectVersion(ctx, ho);
            if (ho.Status != HandoverStatus.PendingAcknowledgment) throw new ValidationException("status", "This handover is no longer pending.");
            var check = new Check().Text("reason", input.Reason, 1000, "the exception reason", true)
                .When(input.FollowUpOwnerId is null, "followUpOwnerId", "Select the follow-up owner.").When(input.FollowUpDate is null, "followUpDate", "Enter the follow-up date.");
            if (input.FollowUpOwnerId is not null && !await db.Users.AnyAsync(u => u.Id == input.FollowUpOwnerId && u.IsActive, ct)) check.Add("followUpOwnerId", "Select an active person.");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            ho.ExceptionReason = input.Reason!.Trim();
            ho.ExceptionApprovedById = access.Me.UserId;
            ho.ExceptionFollowUpOwnerId = input.FollowUpOwnerId;
            ho.ExceptionFollowUpDate = input.FollowUpDate;
            db.AuditReason = "Manager acknowledgment exception: " + ho.ExceptionReason;
            await ApplyAsync(db, access, resolver, ho, HandoverStatus.CompletedByException, now, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
        h.MapPost("/{id:long}/cancel", async (long id, CancelInput input, HttpContext ctx, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Teams, RightKeys.Coordinate);
            var ho = await db.Handovers.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The handover");
            db.ExpectVersion(ctx, ho);
            if (ho.Status != HandoverStatus.PendingAcknowledgment) throw new ValidationException("status", "This handover is no longer pending.");
            ho.CancelReason = Rules.RequireReason(input.Reason);
            ho.Status = HandoverStatus.Cancelled;
            db.AuditReason = ho.CancelReason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
    }

    /// <summary>Applies ownership on completion, keeping the previous owner per item. Items changed since creation are skipped with a reason.</summary>
    private static async Task ApplyAsync(HubDbContext db, HubAccess access, UserResolver resolver, Handover ho, HandoverStatus status, DateTimeOffset now, CancellationToken ct)
    {
        var check = new Check();
        var receiver = await resolver.ForUserAsync(ho.ReceivingOwnerId, ct, directWhenGroupsUnknown: true);
        if (receiver is null || !receiver.IsActive)
            check.Add("receivingOwnerId", "The receiving owner is no longer active. Cancel this handover and select an active owner.");
        else if (!receiver.HasAccess)
            check.Add("receivingOwnerId", "The receiving owner no longer has business access. Cancel this handover and select an eligible owner.");
        // An old pending handover is not a perpetual grant: the person who authorized it
        // must still have authority over each source record when it is applied.
        var authorizer = ho.CreatedById is { } creatorId ? await resolver.ForUserAsync(creatorId, ct) : null;
        var authorizerContext = new UserContext();
        if (authorizer is null || !authorizer.IsActive)
            check.Add("handover", "The handover authorizer is no longer active. Create a new handover.");
        else authorizerContext.Set(authorizer);
        var applicable = new List<(HandoverItem Item, OwnedRecord Record)>();
        foreach (var (item, index) in ho.Items.Select((item, index) => (item, index)))
        {
            var rec = await OwnedRecord.LoadTrackedAsync(db, item.RecordType, item.RecordId, ct);
            if (rec is null) { item.NotAppliedReason = "Record no longer available."; continue; }
            if (rec.OwnerId != item.PreviousOwnerId) { item.NotAppliedReason = "The owner changed after the handover was created."; continue; }
            if (authorizer is null || !CanTransferOwnedRecord(authorizerContext, rec.Type, rec.ClientId, rec.TeamId))
            {
                check.Add($"items[{index}]", "The handover authorizer no longer has permission to transfer this record.");
                continue;
            }
            if (status == HandoverStatus.CompletedByException && !CanTransferOwnedRecord(access.Me, rec.Type, rec.ClientId, rec.TeamId))
            {
                check.Add($"items[{index}]", "You do not have permission to transfer this record by exception.");
                continue;
            }
            await access.CheckAssignableAsync(check, $"items[{index}]", ho.ReceivingOwnerId, rec.ClientId, rec.TeamId, $"the new owner of {rec.Label}", ct);
            applicable.Add((item, rec));
        }
        // A manager exception waives acknowledgement, never active business access. Reject before applying any item.
        check.ThrowIfAny();
        foreach (var (item, rec) in applicable)
        {
            rec.SetOwner(ho.ReceivingOwnerId);
            item.Applied = true;
            if (rec.Entity is Case c) CaseEndpoints.AddEvent(db, c, CaseEventType.OwnerChanged, item.PreviousOwnerId?.ToString(), ho.ReceivingOwnerId.ToString(), $"Handover {ho.Ref}", access.Me, now);
            if (rec.Entity is Commitment m) db.CommitmentEvents.Add(new CommitmentEvent { CommitmentId = m.Id, Type = CommitmentEventType.OwnerChanged, Reason = $"Handover {ho.Ref}", ById = access.Me.UserId, At = now });
        }
        ho.Status = status;
        ho.CompletedAt = now;
    }

    public static async Task<object> OwnedRecordsAsync(HubDbContext db, long ownerId, CancellationToken ct)
    {
        var me = db.CurrentUser;
        var canSeeClient = CanReadOwnedRecord(me, RecordTypes.Client);
        var canSeeRegion = CanReadOwnedRecord(me, RecordTypes.Region);
        var canSeeProject = CanReadOwnedRecord(me, RecordTypes.Project);
        var canSeeEnvironment = CanReadOwnedRecord(me, RecordTypes.Environment);
        var canSeeAsset = CanReadOwnedRecord(me, RecordTypes.Asset);
        var canSeeComponent = CanReadOwnedRecord(me, RecordTypes.Component);
        var canSeeCase = CanReadOwnedRecord(me, RecordTypes.Case);
        var canSeeCommitment = CanReadOwnedRecord(me, RecordTypes.Commitment);
        var allClients = me.IsSystem || me.AllClients;
        var clientIds = me.ClientIds.ToArray();
        return new
    {
        clients = await db.Clients.AsNoTracking().Where(x => canSeeClient && (allClients || clientIds.Contains(x.Id)) && x.OwnerUserId == ownerId).Select(x => new { recordType = RecordTypes.Client, x.Id, label = x.Code + " · " + x.Name }).ToListAsync(ct),
        regions = await db.Regions.AsNoTracking().Where(x => canSeeRegion && x.OwnerUserId == ownerId).Select(x => new { recordType = RecordTypes.Region, x.Id, label = x.Code + " · " + x.Name }).ToListAsync(ct),
        projects = await db.Projects.AsNoTracking().Where(x => canSeeProject && x.OwnerUserId == ownerId).Select(x => new { recordType = RecordTypes.Project, x.Id, label = x.Code + " · " + x.Name }).ToListAsync(ct),
        environments = await db.Environments.AsNoTracking().Where(x => canSeeEnvironment && x.OwnerUserId == ownerId).Select(x => new { recordType = RecordTypes.Environment, x.Id, label = x.Client!.Code + " · " + x.Name }).ToListAsync(ct),
        assets = await db.Assets.AsNoTracking().Where(x => canSeeAsset && x.OwnerUserId == ownerId).Select(x => new { recordType = RecordTypes.Asset, x.Id, label = x.Name }).ToListAsync(ct),
        components = await db.Components.AsNoTracking().Where(x => canSeeComponent && x.OwnerUserId == ownerId).Select(x => new { recordType = RecordTypes.Component, x.Id, label = x.Name }).ToListAsync(ct),
        cases = await db.Cases.AsNoTracking().Where(x => canSeeCase && x.OwnerUserId == ownerId && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled).Select(x => new { recordType = RecordTypes.Case, x.Id, label = x.Ref + " · " + x.Title }).ToListAsync(ct),
        commitments = await db.Commitments.AsNoTracking().Where(x => canSeeCommitment && x.OwnerUserId == ownerId && x.Status == CommitmentStatus.Open).Select(x => new { recordType = RecordTypes.Commitment, x.Id, label = x.Ref + " · " + x.Title }).ToListAsync(ct)
    };
    }

    public sealed record QueueItem(string RecordType, long Id, string Label, long? ClientId, string OwnerName, long OwnerId, string Reason);

    public static async Task<List<QueueItem>> ReassignmentQueueAsync(HubDbContext db, CancellationToken ct)
    {
        var list = new List<QueueItem>();
        var me = db.CurrentUser;
        var canSeeClient = CanReadOwnedRecord(me, RecordTypes.Client);
        var canSeeRegion = CanReadOwnedRecord(me, RecordTypes.Region);
        var canSeeProject = CanReadOwnedRecord(me, RecordTypes.Project);
        var canSeeEnvironment = CanReadOwnedRecord(me, RecordTypes.Environment);
        var canSeeAsset = CanReadOwnedRecord(me, RecordTypes.Asset);
        var canSeeComponent = CanReadOwnedRecord(me, RecordTypes.Component);
        var canSeeCase = CanReadOwnedRecord(me, RecordTypes.Case);
        var canSeeCommitment = CanReadOwnedRecord(me, RecordTypes.Commitment);
        var allClients = me.IsSystem || me.AllClients;
        var clientIds = me.ClientIds.ToArray();
        list.AddRange(await db.Clients.AsNoTracking().Where(x => canSeeClient && (allClients || clientIds.Contains(x.Id)) && x.Owner != null && !x.Owner.IsActive).Select(x => new QueueItem(RecordTypes.Client, x.Id, x.Code + " · " + x.Name, x.Id, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Regions.AsNoTracking().Where(x => canSeeRegion && x.Owner != null && !x.Owner.IsActive).Select(x => new QueueItem(RecordTypes.Region, x.Id, x.Code + " · " + x.Name, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Projects.AsNoTracking().Where(x => canSeeProject && x.Owner != null && !x.Owner.IsActive).Select(x => new QueueItem(RecordTypes.Project, x.Id, x.Code + " · " + x.Name, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Environments.AsNoTracking().Where(x => canSeeEnvironment && x.Owner != null && !x.Owner.IsActive).Select(x => new QueueItem(RecordTypes.Environment, x.Id, x.Client!.Code + " · " + x.Name, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Technical owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Environments.AsNoTracking().Where(x => canSeeEnvironment && x.BackupOwner != null && !x.BackupOwner.IsActive).Select(x => new QueueItem(RecordTypes.Environment, x.Id, x.Client!.Code + " · " + x.Name, x.ClientId, x.BackupOwner!.DisplayName, x.BackupOwner.Id, "Backup owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Assets.AsNoTracking().Where(x => canSeeAsset && x.Owner != null && !x.Owner.IsActive).Select(x => new QueueItem(RecordTypes.Asset, x.Id, x.Name, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Components.AsNoTracking().Where(x => canSeeComponent && x.Owner != null && !x.Owner.IsActive).Select(x => new QueueItem(RecordTypes.Component, x.Id, x.Name, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Cases.AsNoTracking().Where(x => canSeeCase && x.Owner != null && !x.Owner.IsActive && x.Status != CaseStatus.Closed && x.Status != CaseStatus.Cancelled).Select(x => new QueueItem(RecordTypes.Case, x.Id, x.Ref + " · " + x.Title, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        list.AddRange(await db.Commitments.AsNoTracking().Where(x => canSeeCommitment && x.Owner != null && !x.Owner.IsActive && x.Status == CommitmentStatus.Open).Select(x => new QueueItem(RecordTypes.Commitment, x.Id, x.Ref + " · " + x.Title, x.ClientId, x.Owner!.DisplayName, x.Owner.Id, "Owner deactivated")).ToListAsync(ct));
        return list;
    }

    /// <summary>
    /// A53: the team role comes from the configurable list (Administration → Configuration → Team member roles; a retired role stays on a
    /// member who has it) and product familiarity is a comma-separated list of configured product codes.
    /// </summary>
    private static async Task ApplyMemberAsync(TeamMember m, MemberInput i, Check check, HubDbContext db, CancellationToken ct)
    {
        check.Text("skills", i.Skills, 1000, "Skills");
        var role = await new LookupService(db).CheckAsync(check, "teamRole", LookupLists.TeamMemberRole, i.TeamRole, "the team role", m.TeamRole, ct);
        var codes = (i.ProductFamiliarity ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var known = codes.Count == 0 ? [] : await db.Products.AsNoTracking().Where(p => codes.Contains(p.Code)).Select(p => p.Code).ToListAsync(ct);
        var unknown = codes.Where(c => !known.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
        if (unknown.Count > 0) check.Add("productFamiliarity", $"Select products from the list ({string.Join(", ", unknown)} is not a configured product).");
        check.ThrowIfAny();
        m.TeamRole = role;
        m.Skills = Text.Clean(i.Skills);
        m.ProductFamiliarity = known.Count == 0 ? null : string.Join(", ", codes.Select(c => known.First(k => string.Equals(k, c, StringComparison.OrdinalIgnoreCase))));
        m.IsActive = i.IsActive;
    }

    private static async Task ApplyTeamAsync(Team t, TeamInput i, HubDbContext db, CancellationToken ct)
    {
        var check = new Check().Text("code", i.Code, 50, "the team code", true).Text("name", i.Name, 150, "the team name", true).Text("description", i.Description, 2000, "Description");
        if (i.LeadUserId is not null && !await db.Users.AnyAsync(u => u.Id == i.LeadUserId && u.IsActive, ct)) check.Add("leadUserId", "Select an active person as lead.");
        if (i.ManagerUserId is not null && !await db.Users.AnyAsync(u => u.Id == i.ManagerUserId && u.IsActive, ct)) check.Add("managerUserId", "Select an active person as manager.");
        check.ThrowIfAny();
        var code = i.Code!.Trim().ToUpperInvariant();
        if (await db.Teams.IgnoreQueryFilters().AnyAsync(x => x.Code == code && x.Id != t.Id, ct)) throw new ConflictException("This team code is already in use.");
        t.Code = code;
        t.Name = i.Name!.Trim();
        t.LeadUserId = i.LeadUserId;
        t.ManagerUserId = i.ManagerUserId;
        t.Description = Text.Clean(i.Description);
        t.IsActive = i.IsActive;
    }
}

/// <summary>Uniform owner access over the ownable record types (handovers, reassignment).</summary>
public sealed class OwnedRecord(string type, long id, long? clientId, long? teamId, string label, long? ownerId, object entity, Action<long> setOwner)
{
    public string Type { get; } = type;
    public long Id { get; } = id;
    public long? ClientId { get; } = clientId;
    public long? TeamId { get; } = teamId;
    public string Label { get; } = label;
    public long? OwnerId { get; } = ownerId;
    public object Entity { get; } = entity;
    public void SetOwner(long userId) => setOwner(userId);

    public static Task<OwnedRecord?> LoadAsync(HubDbContext db, string? type, long? id, CancellationToken ct) => LoadTrackedAsync(db, type, id, ct);

    public static async Task<OwnedRecord?> LoadTrackedAsync(HubDbContext db, string? type, long? id, CancellationToken ct)
    {
        if (id is null) return null;
        switch (type)
        {
            case RecordTypes.Client: { var x = await db.Clients.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.Id, null, $"{x.Code} · {x.Name}", x.OwnerUserId, x, u => x.OwnerUserId = u); }
            case RecordTypes.Region: { var x = await db.Regions.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, null, $"{x.Code} · {x.Name}", x.OwnerUserId, x, u => x.OwnerUserId = u); }
            case RecordTypes.Project: { var x = await db.Projects.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, null, $"{x.Code} · {x.Name}", x.OwnerUserId, x, u => x.OwnerUserId = u); }
            case RecordTypes.Environment: { var x = await db.Environments.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, null, x.Name, x.OwnerUserId, x, u => { x.OwnerUserId = u; if (x.BackupOwnerUserId == u) x.BackupOwnerUserId = null; }); }
            case RecordTypes.Asset: { var x = await db.Assets.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, null, x.Name, x.OwnerUserId, x, u => x.OwnerUserId = u); }
            case RecordTypes.Component: { var x = await db.Components.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, null, x.Name, x.OwnerUserId, x, u => x.OwnerUserId = u); }
            case RecordTypes.Case: { var x = await db.Cases.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, x.ResponsibleTeamId, $"{x.Ref} · {x.Title}", x.OwnerUserId, x, u => { x.OwnerUserId = u; if (x.BackupOwnerUserId == u) x.BackupOwnerUserId = null; }); }
            case RecordTypes.Commitment: { var x = await db.Commitments.FirstOrDefaultAsync(r => r.Id == id, ct); return x is null ? null : new(type, x.Id, x.ClientId, x.ResponsibleTeamId, $"{x.Ref} · {x.Title}", x.OwnerUserId, x, u => x.OwnerUserId = u); }
            default: return null;
        }
    }
}
