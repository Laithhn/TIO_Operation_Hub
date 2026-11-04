using System.Linq.Expressions;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Work;

public static class CaseEndpoints
{
    public sealed record JiraInput(long? JiraInstanceId, string? IssueKey, string? Url, string? ReuseReason);
    public sealed record AffectedInput(long[]? EnvironmentIds, long[]? AssetIds, long[]? ComponentIds, long[]? DependencyIds, string? UnknownEnvironmentReason);
    public sealed record CaseInput(string? Title, string? Type, WorkScope? Scope, long? ClientId, long? ResponsibleTeamId, string? ImpactSummary, Priority? Priority,
        long? OwnerUserId, long? BackupOwnerUserId, ResponsibleParty? ResponsibleParty, string? ResponsibleOrganization, long? CoordinatorUserId,
        string? NextAction, DateTimeOffset? NextReviewAt, string? DueLocal, string? DueTimeZone, AffectedInput? Affected, JiraInput[]? JiraReferences, string? ProgressSummary,
        long? ContractId = null);
    public sealed record CaseUpdateInput(string? Title, string? Type, long? ResponsibleTeamId, string? ImpactSummary, Priority? Priority, ResponsibleParty? ResponsibleParty,
        string? ResponsibleOrganization, long? CoordinatorUserId, string? NextAction, DateTimeOffset? NextReviewAt, AffectedInput? Affected, string? ChangeNote);
    public sealed record TriageInput(long? ResponsibleTeamId, string? ImpactSummary, Priority? Priority, string? NextAction, DateTimeOffset? NextReviewAt, long? OwnerUserId);
    public sealed record AssignInput(long? OwnerUserId, long? BackupOwnerUserId, string? Reason);
    /// <summary>CustomerResponse: the update was sent to the customer, so it is the first response when none is recorded yet (A61).</summary>
    public sealed record ProgressInput(string? ProgressSummary, string? NextAction, DateTimeOffset? NextReviewAt, bool CustomerResponse = false);
    public sealed record FirstResponseInput(DateTimeOffset? RespondedAt, string? Channel, string? Note);
    public sealed record ContractLinkInput(long? ContractId, string? Reason);
    public sealed record ValidationRequestInput(string? ProgressSummary, string? ValidationRequest, string? NextAction, DateTimeOffset? NextReviewAt);
    public sealed record CloseInput(string? Outcome, string? ValidationEvidence, string? EvidenceExceptionReason, long? FollowUpOwnerId, DateOnly? FollowUpDate);
    public sealed record ReasonInput(string? Reason, string? NextAction, DateTimeOffset? NextReviewAt);
    public sealed record StatusInput(string? Code);
    public sealed record WaitingInput(WaitingReason? Reason, string? Note, DateTimeOffset? NextReviewAt);
    public sealed record DueInput(string? DueLocal, string? DueTimeZone, bool Clear, string? Reason);
    public sealed record RemoveJiraInput(string? Reason);

    public static void MapCaseEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/cases").WithTags("Cases");

        g.MapGet("", async ([AsParameters] CaseListQuery p, HubDbContext db, HubAccess access, HubSettings settings, FreshnessService fresh, CancellationToken ct) =>
        {
            access.RequireAccess();
            var now = p.AsOf ?? DateTimeOffset.UtcNow;
            var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
            var q = CaseQuery.Apply(db.Cases.AsNoTracking(), p.ToFilter(), now, await settings.UpcomingDaysAsync(ct), policy, db, await settings.CoveragePrioritiesAsync(ct));
            var keys = new Dictionary<string, Expression<Func<Case, object?>>>
            {
                ["ref"] = c => c.Id, ["title"] = c => c.Title, ["priority"] = c => c.Priority, ["status"] = c => c.StatusCode, ["due"] = c => c.DueAt,
                ["nextReview"] = c => c.NextReviewAt, ["created"] = c => c.CreatedAt, ["client"] = c => c.Client!.Code, ["owner"] = c => c.Owner!.DisplayName
            };
            var paged = await q.SortBy(p.Sort, keys, "-created").Select(Row(now, policy)).ToPagedAsync(PageQuery.From(p.Page, p.PageSize), ct);
            return Results.Ok(paged);
        });

        g.MapGet("/{id:long}", async (long id, HttpContext ctx, HubDbContext db, HubAccess access, FreshnessService fresh, CancellationToken ct) =>
        {
            access.RequireAccess();
            var c = await db.Cases.AsNoTracking().Include(x => x.Client).Include(x => x.ResponsibleTeam).Include(x => x.Owner).Include(x => x.BackupOwner)
                .Include(x => x.Environments).Include(x => x.Assets).Include(x => x.Components)
                .Include(x => x.JiraReferences).ThenInclude(j => j.JiraInstance).Include(x => x.WaitingIntervals)
                .AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The case");
            var now = DateTimeOffset.UtcNow;
            var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
            var envIds = c.Environments.Select(e => e.EnvironmentId).ToList();
            var canAffected = access.Me.HasRight(RightKeys.Tab("Cases", "affected"));
            var canJira = access.Me.HasRight(RightKeys.Tab("Cases", "jira"));
            var canEnvironments = canAffected && access.Me.HasRight(RightKeys.Environments, RightKeys.View);
            var canServers = canAffected && access.Me.HasRight(RightKeys.Servers, RightKeys.View);
            var canCommitments = access.Me.HasRight(RightKeys.Tab("Cases", "commitments")) && access.Me.HasRight(RightKeys.Commitments, RightKeys.View);
            var canHistory = access.Me.HasRight(RightKeys.Cases, RightKeys.HistoryView) && access.Me.HasRight(RightKeys.Audit);
            var envs = await db.Environments.AsNoTracking().Where(e => canEnvironments && envIds.Contains(e.Id)).Select(e => new { e.Id, e.Name, e.Type, regionCode = e.Region == null ? null : e.Region.Code }).ToListAsync(ct);
            var assetIds = c.Assets.Select(a => a.AssetId).ToList();
            var assets = await db.Assets.AsNoTracking().Where(a => canServers && assetIds.Contains(a.Id)).Select(a => new { a.Id, a.Name, a.Type }).ToListAsync(ct);
            var compIds = c.Components.Select(x => x.ComponentId).ToList();
            var comps = await db.Components.AsNoTracking().Where(x => canServers && compIds.Contains(x.Id)).Select(x => new { x.Id, x.Name, x.Role, installation = x.Installation!.InstanceName }).ToListAsync(ct);
            var events = await db.CaseEvents.AsNoTracking().Where(e => canHistory && access.Me.HasRight("tab.Cases.timeline:View") && e.CaseId == id).OrderByDescending(e => e.At).ThenByDescending(e => e.Id)
                .Select(e => new { e.Id, e.Type, e.FromValue, e.ToValue, e.Note, e.At, by = e.By == null ? null : e.By.DisplayName }).ToListAsync(ct);
            var commitments = await db.Commitments.AsNoTracking().Where(m => canCommitments && m.CaseId == id)
                .Select(m => new { m.Id, m.Ref, m.Description, m.Status, m.CurrentDueAt, m.TimeZone }).ToListAsync(ct);
            var users = await access.UserRefsAsync([c.CoordinatorUserId, c.EvidenceExceptionApprovedById, c.EvidenceExceptionFollowUpOwnerId], ct);
            var waitingSeconds = c.WaitingIntervals.Sum(w => ((w.EndedAt ?? now) - w.StartedAt).TotalSeconds);
            var statusFromJira = await db.JiraCaseMappings.AsNoTracking().AnyAsync(m => m.CaseId == c.Id, ct);
            return ctx.WithETag(c, new
            {
                c.Id, c.Ref, c.Title, c.Type, c.Scope, c.Status, c.StatusCode, statusFromJira, c.ClientRepresentative, c.InternalAssignee, statusOptions = await StatusOptionsAsync(db, c, ct), c.Priority, c.ImpactSummary, c.ProgressSummary, c.NextAction, c.NextReviewAt,
                c.DueAt, c.DueTimeZone, dueLocal = c.DueAt is null ? null : Zones.Local(c.DueAt.Value, c.DueTimeZone ?? "UTC"),
                client = c.Client == null ? null : new { c.Client.Id, c.Client.Code, c.Client.Name },
                team = c.ResponsibleTeam == null ? null : new { c.ResponsibleTeam.Id, c.ResponsibleTeam.Code, c.ResponsibleTeam.Name },
                owner = Ref(c.Owner), backupOwner = Ref(c.BackupOwner), unassigned = c.OwnerUserId == null,
                ownerDeactivated = c.Owner is { IsActive: false },
                coordinator = c.CoordinatorUserId is { } co ? users.GetValueOrDefault(co) : null,
                c.ResponsibleParty, c.ResponsibleOrganization,
                waiting = c.WaitingReason == null ? null : new { reason = c.WaitingReason, since = c.WaitingSince },
                waitingIntervals = c.WaitingIntervals.Where(_ => canHistory).OrderByDescending(w => w.StartedAt).Select(w => new { w.Reason, w.Note, w.StartedAt, w.EndedAt }),
                waitingHours = Math.Round(waitingSeconds / 3600, 1),
                ageDays = Math.Round((now - c.CreatedAt).TotalDays, 1),
                currentCycleAgeDays = c.ReopenCount > 0 ? Math.Round((now - c.CycleStartedAt).TotalDays, 1) : (double?)null,
                c.ReopenCount, unknownEnvironmentReason = canAffected ? c.UnknownEnvironmentReason : null, c.ValidationRequest, c.Outcome, c.ValidationEvidence,
                evidenceException = c.EvidenceExceptionReason == null ? null : new
                {
                    reason = c.EvidenceExceptionReason, approvedBy = c.EvidenceExceptionApprovedById is { } ab ? users.GetValueOrDefault(ab) : null,
                    followUpOwner = c.EvidenceExceptionFollowUpOwnerId is { } fo ? users.GetValueOrDefault(fo) : null, followUpDate = c.EvidenceExceptionFollowUpDate
                },
                c.CancelReason, c.ClosedAt, c.CancelledAt, c.CreatedAt, c.UpdatedAt, c.LastReviewedAt,
                freshness = CaseQuery.IsOpen(c.Status) ? FreshnessService.Evaluate(policy, c.CreatedAt, c.LastReviewedAt, c.NextReviewAt, now) : new Freshness(FreshnessState.NotApplicable, c.LastReviewedAt, null, "Closed or cancelled"),
                reviewOverdue = CaseQuery.IsOpen(c.Status) && c.NextReviewAt < now,
                overdue = CaseQuery.IsOpen(c.Status) && c.DueAt < now,
                environments = envs, assets, components = comps,
                jiraReferences = c.JiraReferences.Where(j => canJira && j.RemovedAt == null).Select(j => new { j.Id, instance = j.JiraInstance!.Name, kind = j.JiraInstance.Kind, j.JiraInstanceId, j.IssueKey, j.Url, j.ReuseReason, j.Origin }),
                jiraSource = canJira ? await Jira.JiraCaseEndpoints.SourceAsync(db, c.Id, now, ct) : null,
                removedJiraReferences = c.JiraReferences.Where(j => canJira && canHistory && j.RemovedAt != null).Select(j => new { j.Id, instance = j.JiraInstance!.Name, j.IssueKey, j.RemovedAt }),
                commitments, events,
                contract = c.ContractId is null ? null : await db.Contracts.AsNoTracking().Where(k => k.Id == c.ContractId).Select(k => new { k.Id, k.Ref, k.Title, k.Status }).FirstOrDefaultAsync(ct),
                sla = new
                {
                    applied = c.SlaAppliedAt == null ? null : new
                    {
                        contractRef = c.SlaContractRef, priority = c.SlaPriority, responseMinutes = c.SlaResponseMinutes, resolutionMinutes = c.SlaResolutionMinutes, basis = c.SlaBasis,
                        support24x7 = c.SlaSupport24x7, supportDays = c.SlaSupportDays.ToString(), supportFrom = c.SlaSupportFrom?.ToString("HH:mm"), supportTo = c.SlaSupportTo?.ToString("HH:mm"),
                        timeZone = c.SlaTimeZone, pausesWhileWaitingOnCustomer = c.SlaPauseOnCustomerWaiting, at = c.SlaAppliedAt
                    },
                    startAt = c.CreatedAt,
                    response = new { status = CaseSla.Now(c.ResponseSlaStatus, c.ResponseDueAt, now), dueAt = c.ResponseDueAt, actualAt = c.FirstResponseAt, elapsedMinutes = c.ResponseElapsedMinutes,
                        breachMinutes = c.ResponseDueAt is { } rd && (c.FirstResponseAt ?? now) > rd && c.ResponseSlaStatus is SlaState.Breached or SlaState.Pending ? (int?)((c.FirstResponseAt ?? now) - rd).TotalMinutes : null },
                    resolution = new { status = CaseSla.Now(c.ResolutionSlaStatus, c.ResolutionDueAt, now), dueAt = c.ResolutionDueAt, actualAt = c.ResolvedAt, elapsedMinutes = c.ResolutionElapsedMinutes,
                        breachMinutes = c.ResolutionDueAt is { } xd && (c.ResolvedAt ?? now) > xd && c.ResolutionSlaStatus is SlaState.Breached or SlaState.Pending ? (int?)((c.ResolvedAt ?? now) - xd).TotalMinutes : null },
                    pausedMinutes = c.SlaPausedMinutes, note = c.SlaNote, calculatedAt = c.SlaCalculatedAt,
                    operationalDueAt = c.DueAt
                },
                permissions = Permissions(c, access.Me, await db.TeamMembers.AnyAsync(m => m.TeamId == c.ResponsibleTeamId && m.UserId == access.Me.UserId && m.IsActive, ct), await CaseStatuses.HasActiveAsync(db, CaseStatusBehavior.Resolved, ct), statusFromJira)
            });
        });

        // A63: calculate an indicative preview from the case's snapshotted clause terms; no accounting action is taken.
        g.MapGet("/{id:long}/penalty-preview", async (long id, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            access.RequireAccess();
            var c = await db.Cases.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The case");
            // A penalty preview applies monthly caps across all cases on the contract.
            // A project-only view would omit other cases and produce an incorrect amount.
            if (c.ClientId is { } clientId && !access.Me.HasClient(clientId)) throw new NotFoundException("The case");
            if (c.ContractId is null || string.IsNullOrWhiteSpace(c.PenaltyTermsSnapshotJson)) return Results.Ok(new { contractRef = c.SlaContractRef, items = Array.Empty<object>() });
            var terms = JsonSerializer.Deserialize<PenaltyClauseSnapshot[]>(c.PenaltyTermsSnapshotJson) ?? [];
            var now = clock.GetUtcNow();
            var cases = await db.Cases.AsNoTracking().Where(x => x.ContractId == c.ContractId && x.Status != CaseStatus.Cancelled && x.PenaltyTermsSnapshotJson != null)
                .Select(x => new { x.Id, x.ResponseSlaStatus, x.ResponseDueAt, x.FirstResponseAt, x.ResolutionSlaStatus, x.ResolutionDueAt, x.ResolvedAt, x.PenaltyTermsSnapshotJson }).ToListAsync(ct);
            var candidates = cases.Select(x => new { Record = x, TermKeys = (JsonSerializer.Deserialize<PenaltyClauseSnapshot[]>(x.PenaltyTermsSnapshotJson!) ?? [])
                .Select(PenaltyRules.TermsKey).ToHashSet(StringComparer.Ordinal) }).ToArray();
            var items = new List<object>();
            foreach (var term in terms)
            {
                var termKey = PenaltyRules.TermsKey(term);
                var breaches = candidates.Where(x => x.TermKeys.Contains(termKey)).Select(x => x.Record).Select(x =>
                {
                    var response = term.Trigger == PenaltyTrigger.ResponseSlaBreached;
                    var state = response ? CaseSla.Now(x.ResponseSlaStatus, x.ResponseDueAt, now) : CaseSla.Now(x.ResolutionSlaStatus, x.ResolutionDueAt, now);
                    var due = response ? x.ResponseDueAt : x.ResolutionDueAt;
                    var actual = response ? x.FirstResponseAt : x.ResolvedAt;
                    return state == SlaState.Breached ? new PenaltyBreach($"{x.Id}:{term.Trigger}", due ?? actual ?? now) : null;
                }).OfType<PenaltyBreach>().ToArray();
                if (breaches.Length == 0) continue;
                var clause = new ContractPenaltyClause { Id = term.Id, Calculation = term.Calculation, FixedAmount = term.FixedAmount, Percentage = term.Percentage,
                    ReferenceAmount = term.ReferenceAmount, MonthlyCap = term.MonthlyCap, BillingTimeZone = term.BillingTimeZone };
                foreach (var assessment in PenaltyRules.Calculate(clause, breaches, term.Currency))
                    items.Add(new { term.Id, term.Name, term.Trigger, assessment.Month, assessment.Amount, assessment.Currency, assessment.ReviewState, assessment.BreachCount });
            }
            return Results.Ok(new { contractRef = c.SlaContractRef, items });
        });

        g.MapPost("", async (CaseInput input, HubDbContext db, HubAccess access, TimeProvider clock, HubSettings settings, CancellationToken ct) =>
        {
            access.Me.RequireRight(RightKeys.Cases, RightKeys.Create);
            var now = clock.GetUtcNow();
            var check = new Check();
            var (typeCode, typeCategory) = await new LookupService(db).TypeAsync<CaseType>(check, "type", LookupLists.CaseType, input.Type, "the case type", null, ct);
            check.Text("title", input.Title, 200, "the title", true)
                 .When(input.Scope is null, "scope", "Select Client-related or Internal.")
                 .Text("impactSummary", input.ImpactSummary, 2000, "the impact summary", true)
                 .When(input.Priority is null, "priority", "Select the priority.")
                 .When(input.ResponsibleTeamId is null, "responsibleTeamId", "Select the responsible team.")
                 .Text("nextAction", input.NextAction, 1000, "the next action")
                 .When(input.NextReviewAt is null, "nextReviewAt", "Enter the next review time.")
                 .When(input.NextReviewAt < now.AddMinutes(-5), "nextReviewAt", "The next review time is in the past.")
                 .Text("progressSummary", input.ProgressSummary, 2000, "Progress summary")
                 .Text("responsibleOrganization", input.ResponsibleOrganization, 150, "Responsible organization");
            if (input.Scope == WorkScope.Client && input.ClientId is null) check.Add("clientId", "Client-related work needs a client.");
            if (input.Scope == WorkScope.Internal && input.ClientId is not null) check.Add("clientId", "Internal work has no client. Choose Client-related to link a client.");
            if (input.ClientId is not null && !access.Me.HasClient(input.ClientId.Value)) check.Add("clientId", "Select a client you can access.");
            if (input.ResponsibleTeamId is not null && !await db.Teams.AnyAsync(t => t.Id == input.ResponsibleTeamId && t.IsActive, ct)) check.Add("responsibleTeamId", "Select an active team.");
            if (input.Scope == WorkScope.Internal && input.ResponsibleTeamId is not null && !access.Me.SeesInternal(input.ResponsibleTeamId)) check.Add("responsibleTeamId", "You have no internal scope for this team.");
            if (input.OwnerUserId is not null && !access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate) && input.OwnerUserId != access.Me.UserId) check.Add("ownerUserId", "Case coordination permission is required to assign someone else. Leave it Unassigned or take it yourself.");
            if (input.BackupOwnerUserId is not null && input.BackupOwnerUserId == input.OwnerUserId) check.Add("backupOwnerUserId", "The backup must be a different person.");
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, input.ClientId, input.ResponsibleTeamId, "the owner", ct);
            await access.CheckAssignableAsync(check, "backupOwnerUserId", input.BackupOwnerUserId, input.ClientId, input.ResponsibleTeamId, "the backup owner", ct);
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, input.ClientId, input.ResponsibleTeamId, "the coordinator", ct);
            if ((input.ResponsibleParty ?? ResponsibleParty.TIO) != ResponsibleParty.TIO && input.CoordinatorUserId is null && input.OwnerUserId is null)
                check.Add("coordinatorUserId", "Responsibility is external or unknown: select an internal coordinator.");
            var due = ParseDue(check, input.DueLocal, input.DueTimeZone);
            if (input.ContractId is not null) await CheckContractAsync(check, db, input.ContractId.Value, input.ClientId, ct);
            check.ThrowIfAny();

            var c = new Case
            {
                Title = input.Title!.Trim(), Type = typeCode, TypeCategory = typeCategory, Scope = input.Scope!.Value, ClientId = input.ClientId, ResponsibleTeamId = input.ResponsibleTeamId,
                ImpactSummary = input.ImpactSummary!.Trim(), Priority = input.Priority!.Value, OwnerUserId = input.OwnerUserId, BackupOwnerUserId = input.BackupOwnerUserId,
                ResponsibleParty = input.ResponsibleParty ?? ResponsibleParty.TIO, ResponsibleOrganization = Text.Clean(input.ResponsibleOrganization), CoordinatorUserId = input.CoordinatorUserId,
                NextAction = input.NextAction?.Trim() ?? "", NextReviewAt = input.NextReviewAt!.Value, DueAt = due?.At, DueTimeZone = due?.Zone,
                ProgressSummary = Text.Clean(input.ProgressSummary), Status = CaseStatus.New, StatusCode = await CaseStatuses.DefaultCodeAsync(db, CaseStatusBehavior.Initial, CaseStatus.New, ct), CycleStartedAt = now, LastReviewedAt = now, ContractId = input.ContractId
            };
            await ApplyAffectedAsync(c, input.Affected, db, ct);
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.Cases.Add(c);
            await db.SaveChangesAsync(ct);
            AddEvent(db, c, CaseEventType.Created, null, CaseStatus.New.ToString(), null, access.Me, now);
            if (input.JiraReferences?.Length > 0) access.Me.RequireRight(RightKeys.Tab("Cases", "jira", "Create"));
            foreach (var j in input.JiraReferences ?? []) await AddJiraAsync(db, access, c, j, now, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Created($"/api/v1/cases/{c.Id}", new { c.Id, c.Ref });
        });

        g.MapPut("/{id:long}", async (long id, CaseUpdateInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            var now = clock.GetUtcNow();
            var check = new Check();
            check.Text("title", input.Title, 200, "the title", true).Text("impactSummary", input.ImpactSummary, 2000, "the impact summary", true)
                 .Text("nextAction", input.NextAction, 1000, "the next action")
                 .When(input.Priority is null, "priority", "Select the priority.")
                 .When(input.ResponsibleTeamId is null, "responsibleTeamId", "Select the responsible team.")
                 .When(CaseQuery.IsOpen(c.Status) && input.NextReviewAt is null, "nextReviewAt", "Every open case needs a next review time.")
                 .Text("changeNote", input.ChangeNote, 1000, "Note").Text("responsibleOrganization", input.ResponsibleOrganization, 150, "Responsible organization");
            var (typeCode, typeCategory) = await new LookupService(db).TypeAsync<CaseType>(check, "type", LookupLists.CaseType, input.Type, "the case type", c.Type, ct);
            if (input.Priority != c.Priority && !access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate)) check.Add("priority", "Case coordination permission is required to change the priority.");
            if (input.ResponsibleTeamId != c.ResponsibleTeamId && !access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate)) check.Add("responsibleTeamId", "Case coordination permission is required to change the team.");
            if (input.ResponsibleTeamId is not null && !await db.Teams.AnyAsync(t => t.Id == input.ResponsibleTeamId, ct)) check.Add("responsibleTeamId", "Select a team.");
            await access.CheckAssignableAsync(check, "coordinatorUserId", input.CoordinatorUserId, c.ClientId, input.ResponsibleTeamId, "the coordinator", ct);
            check.ThrowIfAny();
            if (input.Priority != c.Priority) AddEvent(db, c, CaseEventType.PriorityChanged, c.Priority.ToString(), input.Priority.ToString(), input.ChangeNote, access.Me, now);
            if (input.ResponsibleTeamId != c.ResponsibleTeamId) AddEvent(db, c, CaseEventType.ScopeChanged, $"Team {c.ResponsibleTeamId}", $"Team {input.ResponsibleTeamId}", input.ChangeNote, access.Me, now);
            var beforeScope = AffectedSummary(c);
            c.Title = input.Title!.Trim();
            c.Type = typeCode;
            c.TypeCategory = typeCategory;
            c.ResponsibleTeamId = input.ResponsibleTeamId;
            c.ImpactSummary = input.ImpactSummary!.Trim();
            c.Priority = input.Priority!.Value;
            c.ResponsibleParty = input.ResponsibleParty ?? c.ResponsibleParty;
            c.ResponsibleOrganization = Text.Clean(input.ResponsibleOrganization);
            c.CoordinatorUserId = input.CoordinatorUserId;
            c.NextAction = Text.Clean(input.NextAction) ?? "";
            if (input.NextReviewAt is not null) c.NextReviewAt = input.NextReviewAt.Value;
            if (input.Affected is not null)
            {
                access.Me.RequireRight(RightKeys.Tab("Cases", "affected", "View"));
                await ApplyAffectedAsync(c, input.Affected, db, ct);
                var afterScope = AffectedSummary(c);
                if (afterScope != beforeScope) AddEvent(db, c, CaseEventType.ScopeChanged, beforeScope, afterScope, input.ChangeNote, access.Me, now);
            }
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- lifecycle (Section 5.3) ----
        g.MapPost("/{id:long}/triage", async (long id, TriageInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireLeadFor(c.ClientId, c.ResponsibleTeamId, RightKeys.Cases);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            RequireStatus(c, CaseStatus.New);
            var now = clock.GetUtcNow();
            var check = new Check();
            check.When(input.ResponsibleTeamId is null, "responsibleTeamId", "Confirm the responsible team.")
                 .Text("impactSummary", input.ImpactSummary, 2000, "the impact", true).When(input.Priority is null, "priority", "Confirm the priority.")
                 .Text("nextAction", input.NextAction, 1000, "the next action").When(input.NextReviewAt is null || input.NextReviewAt < now, "nextReviewAt", "Enter a future next review time.");
            if (input.OwnerUserId is not null && input.OwnerUserId == c.BackupOwnerUserId)
                check.Add("ownerUserId", "This person is the backup owner. Use Assign owner to change the owner and backup together; they must be different people.");
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, c.ClientId, input.ResponsibleTeamId, "the owner", ct);
            check.ThrowIfAny();
            if (input.Priority != c.Priority) AddEvent(db, c, CaseEventType.PriorityChanged, c.Priority.ToString(), input.Priority.ToString(), "At triage", access.Me, now);
            c.ResponsibleTeamId = input.ResponsibleTeamId;
            c.ImpactSummary = input.ImpactSummary!.Trim();
            c.Priority = input.Priority!.Value;
            c.NextAction = Text.Clean(input.NextAction) ?? "";
            c.NextReviewAt = input.NextReviewAt!.Value;
            if (input.OwnerUserId is not null && input.OwnerUserId != c.OwnerUserId)
            {
                AddEvent(db, c, CaseEventType.OwnerChanged, c.OwnerUserId?.ToString(), input.OwnerUserId.ToString(), "Assigned at triage", access.Me, now);
                c.OwnerUserId = input.OwnerUserId;
            }
            await TransitionAsync(db, c, CaseStatus.Triaged, CaseEventType.Triaged, null, access.Me, now, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/assign", async (long id, AssignInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            if (!access.Me.SeesScope(c.ClientId, c.ResponsibleTeamId)) throw new NotFoundException("The case");
            db.ExpectVersion(ctx, c);
            if (!CaseQuery.IsOpen(c.Status)) throw new ValidationException("ownerUserId", "Reopen the case before changing its owner.");
            var now = clock.GetUtcNow();
            var check = new Check();
            // ACC-03: only a Lead or Manager reassigns; an Engineer may take unassigned work of their own team.
            var selfTake = input.OwnerUserId == access.Me.UserId && c.OwnerUserId is null && access.Me.HasRight(RightKeys.Cases, RightKeys.Maintain)
                && await db.TeamMembers.AnyAsync(m => m.TeamId == c.ResponsibleTeamId && m.UserId == access.Me.UserId && m.IsActive, ct);
            if (!access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate) && !selfTake) throw new ForbiddenException("Only the TIO Manager can assign this case. You can take unassigned work of your own team.");
            if (input.BackupOwnerUserId is not null && input.BackupOwnerUserId == input.OwnerUserId) check.Add("backupOwnerUserId", "The backup must be a different person.");
            if (!access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate) && input.BackupOwnerUserId != c.BackupOwnerUserId) check.Add("backupOwnerUserId", "Only the TIO Manager can change the backup owner.");
            if (c.Status == CaseStatus.InProgress && input.OwnerUserId is null) check.Add("ownerUserId", "A case in progress must keep an active owner.");
            check.Text("reason", input.Reason, 1000, "Reason");
            await access.CheckAssignableAsync(check, "ownerUserId", input.OwnerUserId, c.ClientId, c.ResponsibleTeamId, "the owner", ct);
            await access.CheckAssignableAsync(check, "backupOwnerUserId", input.BackupOwnerUserId, c.ClientId, c.ResponsibleTeamId, "the backup owner", ct);
            check.ThrowIfAny();
            if (input.OwnerUserId != c.OwnerUserId)
            {
                var names = await access.UserRefsAsync([c.OwnerUserId, input.OwnerUserId], ct);
                AddEvent(db, c, CaseEventType.OwnerChanged, c.OwnerUserId is { } o ? names.GetValueOrDefault(o)?.Name : "Unassigned", input.OwnerUserId is { } n ? names.GetValueOrDefault(n)?.Name : "Unassigned", input.Reason, access.Me, now);
            }
            // A76: a person's assignment holds until the Jira assignee changes again.
            if (input.OwnerUserId != c.OwnerUserId && await db.JiraCaseMappings.FirstOrDefaultAsync(m => m.CaseId == id, ct) is { } jiraSource) jiraSource.OwnerFromJira = false;
            c.OwnerUserId = input.OwnerUserId;
            c.BackupOwnerUserId = input.BackupOwnerUserId;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/start", async (long id, ProgressInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Cases.Include(x => x.Owner).Include(x => x.Environments).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The case");
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            RequireStatus(c, CaseStatus.Triaged);
            // WRK-04: an active owner is required before In progress.
            if (c.OwnerUserId is null) throw new ValidationException("Assign an owner first.", new Dictionary<string, string[]> { ["ownerUserId"] = ["The case is Unassigned. An active owner is required before work can start."] });
            if (c.Owner is { IsActive: false }) throw new ValidationException("The owner is deactivated.", new Dictionary<string, string[]> { ["ownerUserId"] = ["The owner is deactivated. Reassign the case to an active owner before starting."] });
            var now = clock.GetUtcNow();
            ApplyProgress(c, input, now, required: false);
            if (input.CustomerResponse) RecordFirstResponse(db, c, now, "Progress update sent to the customer", access.Me, now);
            await TransitionAsync(db, c, CaseStatus.InProgress, CaseEventType.Started, input.ProgressSummary, access.Me, now, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/progress", async (long id, ProgressInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            if (!CaseQuery.IsOpen(c.Status)) throw new ValidationException("progressSummary", "The case is closed or cancelled.");
            var now = clock.GetUtcNow();
            ApplyProgress(c, input, now, required: true);
            // A progress update is a meaningful review of the case (OPS-03); viewing or unrelated edits are not.
            c.LastReviewedAt = now;
            db.Reviews.Add(new Quality.Review { RecordType = RecordTypes.Case, RecordId = c.Id, ClientId = c.ClientId, TeamId = c.ClientId == null ? c.ResponsibleTeamId : null, Scope = ReviewScope.Record, Note = c.ProgressSummary ?? c.NextAction, ReviewerId = access.Me.UserId, ReviewedAt = now, NextReviewAt = c.NextReviewAt });
            AddEvent(db, c, CaseEventType.Progress, null, null, c.ProgressSummary, access.Me, now);
            // A78: on a synchronized case the first Jira comment is the first response.
            if (input.CustomerResponse && !await db.JiraCaseMappings.AnyAsync(m => m.CaseId == c.Id, ct)) RecordFirstResponse(db, c, now, "Progress update sent to the customer", access.Me, now);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/request-validation", async (long id, ValidationRequestInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            RequireStatus(c, CaseStatus.InProgress);
            if (!await CaseStatuses.HasActiveAsync(db, CaseStatusBehavior.Resolved, ct))
                throw new ValidationException("status", "No case status behaves as Resolved, so close the case instead.");
            var check = new Check().Text("progressSummary", input.ProgressSummary, 2000, "the delivered outcome or progress", true)
                .Text("validationRequest", input.ValidationRequest, 1000, "Validation request").Text("nextAction", input.NextAction, 1000, "Next action");
            if (string.IsNullOrWhiteSpace(input.ValidationRequest) && string.IsNullOrWhiteSpace(input.NextAction)) check.Add("validationRequest", "Record the validation request or the next action.");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            c.ProgressSummary = input.ProgressSummary!.Trim();
            c.ValidationRequest = Text.Clean(input.ValidationRequest);
            if (input.NextAction is not null) c.NextAction = Text.Clean(input.NextAction) ?? "";
            if (input.NextReviewAt is not null) c.NextReviewAt = input.NextReviewAt.Value;
            c.LastReviewedAt = now;
            await TransitionAsync(db, c, CaseStatus.PendingValidation, CaseEventType.ValidationRequested, c.ValidationRequest ?? c.NextAction, access.Me, now, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/resume", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            RequireStatus(c, CaseStatus.PendingValidation);
            var reason = Rules.RequireReason(input.Reason, "reason", "why validation did not pass");
            var now = clock.GetUtcNow();
            if (input.NextAction is not null) c.NextAction = Text.Clean(input.NextAction) ?? "";
            if (input.NextReviewAt is not null) c.NextReviewAt = input.NextReviewAt.Value;
            await TransitionAsync(db, c, CaseStatus.InProgress, CaseEventType.Started, reason, access.Me, now, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // A61: the first response to the customer, with the time it was actually sent (not later than now, not before the case).
        g.MapPost("/{id:long}/first-response", async (long id, FirstResponseInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            if (await db.JiraCaseMappings.AnyAsync(m => m.CaseId == c.Id, ct)) throw new ValidationException("respondedAt", "This case's first response is its first Jira comment.");
            if (c.Status == CaseStatus.Cancelled) throw new ValidationException("respondedAt", "The case was cancelled.");
            if (c.FirstResponseAt is { } fr) throw new ConflictException("The first response is already recorded.", new() { ["respondedAt"] = [$"Recorded at {fr:yyyy-MM-dd HH:mm} UTC; a first response is recorded once."] });
            var now = clock.GetUtcNow();
            var at = input.RespondedAt ?? now;
            var check = new Check().Text("channel", input.Channel, 60, "the channel", true).Text("note", input.Note, 1000, "Note");
            if (at > now.AddMinutes(1)) check.Add("respondedAt", "The response time is in the future.");
            if (at < (c.SlaClockStartAt ?? c.CreatedAt).AddMinutes(-1)) check.Add("respondedAt", "The response time is before the case was opened.");
            check.ThrowIfAny();
            RecordFirstResponse(db, c, at, $"{input.Channel!.Trim()}{(string.IsNullOrWhiteSpace(input.Note) ? "" : $": {input.Note.Trim()}")}", access.Me, now);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // A61: link, change or remove the contract whose SLA applies; the targets are taken again from that contract.
        g.MapPost("/{id:long}/contract", async (long id, ContractLinkInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            var check = new Check();
            if (input.ContractId is not null) await CheckContractAsync(check, db, input.ContractId.Value, c.ClientId, ct);
            if (input.ContractId == c.ContractId) check.Add("contractId", "This contract is already linked.");
            var reason = c.ContractId is null ? Text.Clean(input.Reason) : Rules.RequireReason(input.Reason, "reason", "why the contract changes");
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            var from = c.ContractId is null ? null : await db.Contracts.AsNoTracking().Where(k => k.Id == c.ContractId).Select(k => k.Ref).FirstOrDefaultAsync(ct);
            var to = input.ContractId is null ? null : await db.Contracts.AsNoTracking().Where(k => k.Id == input.ContractId).Select(k => k.Ref).FirstOrDefaultAsync(ct);
            c.ContractId = input.ContractId;
            if (input.ContractId is null && c.SlaClockStartAt is not null) { c.DueAt = null; c.DueTimeZone = null; } // it came from this contract's SLA
            AddEvent(db, c, CaseEventType.ContractChanged, from ?? "No contract", to ?? "No contract", reason, access.Me, now);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Closure: outcome always; validation evidence, or a case-specific Manager exception with reason and follow-up owner/date.
        g.MapPost("/{id:long}/close", async (long id, CloseInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            // A77: with no Resolved status there is no validation step, so a case in progress closes directly. The evidence rule is the same.
            if (c.Status != CaseStatus.InProgress || await CaseStatuses.HasActiveAsync(db, CaseStatusBehavior.Resolved, ct)) RequireStatus(c, CaseStatus.PendingValidation);
            var check = new Check().Text("outcome", input.Outcome, 2000, "the outcome", true).Text("validationEvidence", input.ValidationEvidence, 1000, "Validation evidence")
                .Text("evidenceExceptionReason", input.EvidenceExceptionReason, 1000, "Exception reason");
            var hasEvidence = !string.IsNullOrWhiteSpace(input.ValidationEvidence);
            var usesException = !hasEvidence && !string.IsNullOrWhiteSpace(input.EvidenceExceptionReason);
            if (!hasEvidence && !usesException) check.Add("validationEvidence", "Enter the validation evidence. Without it, a TIO Manager must authorize an evidence exception.");
            if (usesException)
            {
                // An engineer-entered reason alone can never waive evidence (Section 5.3).
                if (!access.Me.HasRight(RightKeys.Cases, RightKeys.Coordinate)) check.Add("evidenceExceptionReason", "Case coordination permission is required to authorize closing without validation evidence.");
                if (input.FollowUpOwnerId is null) check.Add("followUpOwnerId", "Select the follow-up owner for the missing evidence.");
                if (input.FollowUpDate is null) check.Add("followUpDate", "Enter the follow-up date.");
                await access.CheckAssignableAsync(check, "followUpOwnerId", input.FollowUpOwnerId, c.ClientId, c.ResponsibleTeamId, "the follow-up owner", ct);
            }
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            c.Outcome = input.Outcome!.Trim();
            c.ValidationEvidence = Text.Clean(input.ValidationEvidence);
            if (usesException)
            {
                c.EvidenceExceptionReason = input.EvidenceExceptionReason!.Trim();
                c.EvidenceExceptionApprovedById = access.Me.UserId;
                c.EvidenceExceptionFollowUpOwnerId = input.FollowUpOwnerId;
                c.EvidenceExceptionFollowUpDate = input.FollowUpDate;
                AddEvent(db, c, CaseEventType.EvidenceException, null, null, c.EvidenceExceptionReason, access.Me, now);
            }
            c.ClosedAt = now;
            EndWaiting(db, c, access.Me, now);
            await TransitionAsync(db, c, CaseStatus.Closed, CaseEventType.Closed, c.Outcome, access.Me, now, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/{id:long}/cancel", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            if (!CaseQuery.IsOpen(c.Status)) throw new ValidationException("reason", "The case is already closed or cancelled.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the cancellation reason");
            var now = clock.GetUtcNow();
            c.CancelReason = reason;
            c.CancelledAt = now;
            EndWaiting(db, c, access.Me, now);
            await TransitionAsync(db, c, CaseStatus.Cancelled, CaseEventType.Cancelled, reason, access.Me, now, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Reopen to Triaged by a Lead/Manager with a reason; earlier closure or cancellation stays in history; ownership is rechecked.
        g.MapPost("/{id:long}/reopen", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Cases.Include(x => x.Owner).Include(x => x.BackupOwner).Include(x => x.Environments).FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The case");
            access.RequireLeadFor(c.ClientId, c.ResponsibleTeamId, RightKeys.Cases);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            if (CaseQuery.IsOpen(c.Status)) throw new ValidationException("reason", "Only closed or cancelled cases can be reopened.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reopening reason");
            var now = clock.GetUtcNow();
            var check = new Check().Text("nextAction", input.NextAction, 1000, "the next action")
                .When(input.NextReviewAt is null || input.NextReviewAt < now, "nextReviewAt", "Enter a future next review time.");
            check.ThrowIfAny();
            if (c.Owner is { IsActive: false })
            {
                AddEvent(db, c, CaseEventType.OwnerChanged, c.Owner.DisplayName, "Unassigned", "Owner is deactivated; recheck at reopening", access.Me, now);
                c.OwnerUserId = null;
            }
            if (c.BackupOwner is { IsActive: false }) c.BackupOwnerUserId = null;
            c.NextAction = Text.Clean(input.NextAction) ?? "";
            c.NextReviewAt = input.NextReviewAt!.Value;
            c.ReopenCount++;
            c.CycleStartedAt = now;
            c.LastReviewedAt = now;
            // Outcome/closure fields of the previous cycle stay in the timeline; the new cycle needs its own.
            c.ClosedAt = null;
            c.CancelledAt = null;
            await TransitionAsync(db, c, CaseStatus.Triaged, CaseEventType.Reopened, reason, access.Me, now, ct, CaseStatusBehavior.Reopened);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // A77: between configured statuses of the same stage. Moving to another stage has its own action, with that action's rules.
        g.MapPost("/{id:long}/status", async (long id, StatusInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            var options = await StatusOptionsAsync(db, c, ct);
            if (input.Code is null || !options.Contains(input.Code)) throw new ValidationException("code", "Select another status of the same stage. Other changes have their own action on the case.");
            AddEvent(db, c, CaseEventType.StatusChanged, c.StatusCode, input.Code, null, access.Me, clock.GetUtcNow());
            c.StatusCode = input.Code;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Waiting is separate from status; deadlines continue (Section 5.3).
        g.MapPost("/{id:long}/waiting", async (long id, WaitingInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            if (!CaseQuery.IsOpen(c.Status)) throw new ValidationException("reason", "The case is closed or cancelled.");
            var now = clock.GetUtcNow();
            new Check().When(input.Reason is null, "reason", "Select Customer, Internal team, Vendor or Planned change.")
                .When(input.NextReviewAt is null || input.NextReviewAt < now, "nextReviewAt", "Waiting needs a future next review time.")
                .Text("note", input.Note, 1000, "Note").ThrowIfAny();
            EndWaiting(db, c, access.Me, now);
            c.WaitingReason = input.Reason;
            c.WaitingSince = now;
            c.NextReviewAt = input.NextReviewAt!.Value;
            c.WaitingIntervals.Add(new CaseWaitingInterval { Reason = input.Reason!.Value, Note = Text.Clean(input.Note), StartedAt = now, StartedById = access.Me.UserId });
            AddEvent(db, c, CaseEventType.WaitingStarted, null, input.Reason.ToString(), input.Note, access.Me, now);
            await SyncWaitingStatusAsync(db, c, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/{id:long}/waiting/clear", async (long id, ReasonInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            db.ExpectVersion(ctx, c);
            await RequireStatusFromHubAsync(db, c, ct);
            if (c.WaitingReason is null) throw new ValidationException("reason", "The case is not waiting.");
            var now = clock.GetUtcNow();
            EndWaiting(db, c, access.Me, now, input.Reason);
            await SyncWaitingStatusAsync(db, c, ct);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // WRK-07: due-date changes need a reason and keep history.
        g.MapPost("/{id:long}/due", async (long id, DueInput input, HttpContext ctx, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId);
            db.ExpectVersion(ctx, c);
            if (SlaSetsDue(c)) throw new ValidationException("dueLocal", "This case's due date comes from its Jira creation time and its contract's SLA.");
            var reason = Rules.RequireReason(input.Reason, "reason", "the reason for the due-date change");
            var check = new Check();
            var due = input.Clear ? null : ParseDue(check, input.DueLocal, input.DueTimeZone, required: true);
            check.ThrowIfAny();
            var now = clock.GetUtcNow();
            AddEvent(db, c, CaseEventType.DueChanged, c.DueAt is null ? "No deadline" : Zones.Local(c.DueAt.Value, c.DueTimeZone ?? "UTC"), due is null ? "No deadline" : Zones.Local(due.Value.At, due.Value.Zone), reason, access.Me, now);
            c.DueAt = due?.At;
            c.DueTimeZone = due?.Zone;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- Jira references (WRK-03, DAT-03): manual, no Jira calls ----
        g.MapPost("/{id:long}/jira", async (long id, JiraInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            var j = await AddJiraAsync(db, access, c, input, clock.GetUtcNow(), ct);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/cases/{id}/jira/{j.Id}", new { j.Id });
        });
        g.MapPost("/{id:long}/jira/{refId:long}/remove", async (long id, long refId, RemoveJiraInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await LoadForChangeAsync(db, id, ct);
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            var j = await db.JiraReferences.FirstOrDefaultAsync(x => x.Id == refId && x.CaseId == id && x.RemovedAt == null, ct) ?? throw new NotFoundException("The Jira reference");
            if (j.Origin != JiraReferenceOrigin.Manual && await db.JiraCaseMappings.AnyAsync(m => m.CaseId == id && m.IssueKey == j.IssueKey, ct))
                throw new ValidationException("reason", "This is the synchronized source issue of the case, so it stays while the case is synchronized.");
            var reason = Rules.RequireReason(input.Reason);
            var now = clock.GetUtcNow();
            j.RemovedAt = now;
            j.RemovedById = access.Me.UserId;
            AddEvent(db, c, CaseEventType.JiraRemoved, j.IssueKey, null, reason, access.Me, now);
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        api.MapGet("/jira/reuse", async (long instanceId, string key, long? exceptCaseId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            access.Me.RequireRight(RightKeys.Tab("Cases", "jira", "View"));
            return Results.Ok(await ReuseAsync(db, access, instanceId, JiraKeys.Normalize(key), exceptCaseId, ct));
        }).WithTags("Cases");

        // INF-07: potentially affected installations and clients by traversing recorded relationships only.
        g.MapGet("/{id:long}/impact", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var c = await db.Cases.AsNoTracking().Include(x => x.Environments).Include(x => x.Assets).Include(x => x.Components)
                .FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The case");
            return Results.Ok(await DocumentedImpact.ForCaseAsync(db, c, ct));
        });
    }

    public sealed record CaseListQuery(long? ClientId, long? RegionId, long? EnvironmentId, long? ProductId, long? TeamId, long? OwnerId, bool? Unassigned, string? Status,
        Priority? Priority, WorkScope? Scope, string? Due, bool? Waiting, bool? ReviewOverdue, bool? Stale, string? JiraKey, string? Q, DateTimeOffset? CreatedFrom, DateTimeOffset? CreatedTo,
        bool? CoverageGap, bool? DeactivatedOwner, string? Country, DateTimeOffset? AsOf, string? Sort, int? Page, int? PageSize, long? ContractId = null, string? Sla = null,
        string? JiraSource = null, long? JiraConnectionId = null, string? JiraSpace = null)
    {
        public CaseFilter ToFilter() => new(ClientId, RegionId, EnvironmentId, ProductId, TeamId, OwnerId, Unassigned, Status, Priority, Scope, Due, Waiting, ReviewOverdue, Stale, JiraKey, Q, CreatedFrom, CreatedTo, CoverageGap, DeactivatedOwner, Country, ContractId, Sla, JiraSource, JiraConnectionId, JiraSpace);
    }

    public static Expression<Func<Case, CaseRow>> Row(DateTimeOffset now, Quality.ReviewPolicy? policy)
    {
        var limit = policy?.MaxAgeDays is { } d ? now.AddDays(-d) : DateTimeOffset.MinValue;
        var hasAge = policy?.MaxAgeDays is not null;
        var byNext = policy?.UsesNextReviewDate == true;
        return c => new CaseRow(c.Id, c.Ref, c.Title, c.Type, c.Scope, c.Status, c.Priority,
            c.ClientId, c.Client == null ? null : c.Client.Code, c.ResponsibleTeam == null ? null : c.ResponsibleTeam.Name,
            c.OwnerUserId, c.Owner == null ? null : c.Owner.DisplayName, c.Owner != null && !c.Owner.IsActive,
            c.WaitingReason, c.WaitingSince, c.NextAction, c.NextReviewAt, c.DueAt, c.DueTimeZone, c.CreatedAt,
            c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && c.DueAt != null && c.DueAt < now,
            c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && c.NextReviewAt < now,
            c.Status != CaseStatus.Closed && c.Status != CaseStatus.Cancelled && ((hasAge && (c.LastReviewedAt ?? c.CreatedAt) < limit) || (byNext && c.NextReviewAt < now)),
            c.JiraReferences.Where(j => j.RemovedAt == null).Select(j => j.IssueKey).ToList(),
            c.Contract == null ? null : c.Contract.Ref,
            c.ResponseSlaStatus == SlaState.Pending && c.ResponseDueAt < now ? SlaState.Breached : c.ResponseSlaStatus,
            c.ResolutionSlaStatus == SlaState.Pending && c.ResolutionDueAt < now ? SlaState.Breached : c.ResolutionSlaStatus,
            c.JiraSource == null ? null : c.JiraSource.IssueKey, c.JiraSource == null ? null : c.JiraSource.JiraConnection!.Name, c.JiraSource == null ? null : c.JiraSource.StatusName, c.StatusCode, c.InternalAssignee);
    }

    public sealed record CaseRow(long Id, string Ref, string Title, string Type, WorkScope Scope, CaseStatus Status, Priority Priority,
        long? ClientId, string? ClientCode, string? TeamName, long? OwnerUserId, string? OwnerName, bool OwnerDeactivated,
        WaitingReason? WaitingReason, DateTimeOffset? WaitingSince, string NextAction, DateTimeOffset NextReviewAt, DateTimeOffset? DueAt, string? DueTimeZone, DateTimeOffset CreatedAt,
        bool Overdue, bool ReviewOverdue, bool Stale, List<string> JiraKeys, string? ContractRef = null, SlaState ResponseSla = SlaState.NotApplicable, SlaState ResolutionSla = SlaState.NotApplicable,
        string? JiraSourceKey = null, string? JiraConnectionName = null, string? JiraStatus = null, string StatusCode = "", string? InternalAssignee = null);

    private static object Permissions(Case c, UserContext me, bool belongsToTeam, bool hasResolved, bool statusFromJira)
    {
        var inScope = me.SeesScope(c.ClientId, c.ResponsibleTeamId);
        var maintain = inScope && me.HasRight(RightKeys.Cases, RightKeys.Maintain);
        var coordinate = inScope && me.HasRight(RightKeys.Cases, RightKeys.Coordinate);
        return new
        {
            canEdit = maintain,
            canTriage = coordinate && !statusFromJira && c.Status == CaseStatus.New,
            canAssign = CaseQuery.IsOpen(c.Status) && (coordinate || (c.OwnerUserId is null && maintain && belongsToTeam)),
            canStart = maintain && !statusFromJira && c.Status == CaseStatus.Triaged,
            canClose = maintain && !statusFromJira && (c.Status == CaseStatus.PendingValidation || (c.Status == CaseStatus.InProgress && !hasResolved)),
            canRequestValidation = maintain && !statusFromJira && c.Status == CaseStatus.InProgress && hasResolved,
            canReturnToWork = maintain && !statusFromJira && c.Status == CaseStatus.PendingValidation,
            canChangeStatus = maintain && !statusFromJira,
            canSetWaiting = maintain && !statusFromJira && CaseQuery.IsOpen(c.Status),
            canChangeDue = maintain && CaseQuery.IsOpen(c.Status) && !SlaSetsDue(c),
            canAuthorizeEvidenceException = coordinate,
            canReopen = coordinate && !statusFromJira && !CaseQuery.IsOpen(c.Status),
            canCancel = maintain && !statusFromJira && CaseQuery.IsOpen(c.Status)
        };
    }

    private static UserRef? Ref(Access.User? u) => u is null ? null : new UserRef(u.Id, u.DisplayName, u.IsActive);

    private static async Task<Case> LoadForChangeAsync(HubDbContext db, long id, CancellationToken ct) =>
        await db.Cases.Include(x => x.Environments).Include(x => x.Assets).Include(x => x.Components).Include(x => x.WaitingIntervals)
            .AsSplitQuery().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The case");

    /// <summary>A78: Jira is the trusted source of a synchronized case's status, so people only read it here.</summary>
    private static async Task RequireStatusFromHubAsync(HubDbContext db, Case c, CancellationToken ct)
    {
        var key = await db.JiraCaseMappings.AsNoTracking().Where(m => m.CaseId == c.Id).Select(m => m.IssueKey).FirstOrDefaultAsync(ct);
        if (key is not null) throw new ValidationException("status", $"This case's status follows Jira {key}. Change it in Jira.");
    }

    /// <summary>A78: true while a synchronized case's due date is its contract's resolution SLA.</summary>
    private static bool SlaSetsDue(Case c) => c.SlaClockStartAt is not null && c.ContractId is not null && c.ResolutionDueAt is not null;

    private static void RequireStatus(Case c, CaseStatus expected)
    {
        if (c.Status != expected)
            throw new ValidationException($"This step needs status {expected}.", new Dictionary<string, string[]> { ["status"] = [$"The case is {c.Status}; this step applies only to {expected} cases."] });
    }

    private static void ApplyProgress(Case c, ProgressInput i, DateTimeOffset now, bool required)
    {
        var check = new Check().Text("progressSummary", i.ProgressSummary, 2000, "the progress summary", required).Text("nextAction", i.NextAction, 1000, "the next action")
            .When(required && i.NextReviewAt is null, "nextReviewAt", "Enter the next review time.")
            .When(i.NextReviewAt is not null && i.NextReviewAt < now, "nextReviewAt", "The next review time is in the past.");
        check.ThrowIfAny();
        if (!string.IsNullOrWhiteSpace(i.ProgressSummary)) c.ProgressSummary = i.ProgressSummary.Trim();
        if (i.NextAction is not null) c.NextAction = Text.Clean(i.NextAction) ?? "";
        if (i.NextReviewAt is not null) c.NextReviewAt = i.NextReviewAt.Value;
    }

    /// <summary>The other active statuses this case can move to without changing stage; waiting has its own action.</summary>
    private static async Task<List<string>> StatusOptionsAsync(HubDbContext db, Case c, CancellationToken ct)
    {
        if (!CaseQuery.IsOpen(c.Status) || c.WaitingReason == WaitingReason.Customer) return [];
        var names = Enum.GetValues<CaseStatusBehavior>().Where(b => CaseStatuses.StageOf(b) == c.Status).Select(b => b.ToString()).ToList();
        return await db.LookupValues.AsNoTracking().Where(l => l.ListName == CaseStatuses.List && !l.IsRetired && l.Code != c.StatusCode && l.Category != null && names.Contains(l.Category))
            .OrderBy(l => l.SortOrder).Select(l => l.Code).ToListAsync(ct);
    }

    /// <summary>The one way a case changes stage, for people and for the Jira synchronization (A76). An exact status can be named; otherwise the behavior's first active one applies.</summary>
    internal static async Task TransitionAsync(HubDbContext db, Case c, CaseStatus to, CaseEventType type, string? note, UserContext me, DateTimeOffset now, CancellationToken ct, CaseStatusBehavior? behavior = null, string? code = null)
    {
        var waitingCode = c.WaitingReason == WaitingReason.Customer && CaseQuery.IsOpen(to) ? await CaseStatuses.FirstActiveAsync(db, CaseStatusBehavior.WaitingForCustomer, ct) : null;
        c.StatusCode = code ?? waitingCode ?? await CaseStatuses.DefaultCodeAsync(db, behavior ?? CaseStatuses.BehaviorFor(to), to, ct);
        AddEvent(db, c, type, c.Status.ToString(), to.ToString(), note, me, now);
        // A61: resolved = first move into Pending validation or Closed; a rejected validation clears it; a later reopen keeps it.
        if (to is CaseStatus.PendingValidation or CaseStatus.Closed) c.ResolvedAt ??= now;
        else if (c.Status == CaseStatus.PendingValidation) c.ResolvedAt = null;
        c.Status = to;
    }

    /// <summary>A61: the first qualifying response is recorded once; later responses never move it.</summary>
    internal static bool RecordFirstResponse(HubDbContext db, Case c, DateTimeOffset at, string note, UserContext me, DateTimeOffset now)
    {
        if (c.FirstResponseAt is not null) return false;
        c.FirstResponseAt = at;
        AddEvent(db, c, CaseEventType.FirstResponse, null, at.ToString("O"), note, me, now);
        return true;
    }

    /// <summary>A61: a case's contract belongs to the case's client.</summary>
    private static async Task CheckContractAsync(Check check, HubDbContext db, long contractId, long? clientId, CancellationToken ct)
    {
        var k = await db.Contracts.AsNoTracking().Where(x => x.Id == contractId).Select(x => new { x.ClientId }).FirstOrDefaultAsync(ct);
        if (k is null) check.Add("contractId", "Select a contract you can access.");
        else if (clientId is null) check.Add("contractId", "Internal work has no contract.");
        else if (k.ClientId != clientId) check.Add("contractId", "Select a contract of the case's client.");
    }

    /// <summary>A77: waiting on the customer shows as the waiting status, if one is configured; ending it returns to the stage's status.</summary>
    internal static async Task SyncWaitingStatusAsync(HubDbContext db, Case c, CancellationToken ct)
    {
        if (c.WaitingReason == WaitingReason.Customer)
            c.StatusCode = await CaseStatuses.FirstActiveAsync(db, CaseStatusBehavior.WaitingForCustomer, ct) ?? c.StatusCode;
        else if (await CaseStatuses.BehaviorOfAsync(db, c.StatusCode, ct) == CaseStatusBehavior.WaitingForCustomer)
            c.StatusCode = await CaseStatuses.DefaultCodeAsync(db, CaseStatuses.BehaviorFor(c.Status), c.Status, ct);
    }

    internal static void StartWaiting(HubDbContext db, Case c, WaitingReason reason, string? note, UserContext me, DateTimeOffset now)
    {
        c.WaitingReason = reason;
        c.WaitingSince = now;
        c.WaitingIntervals.Add(new CaseWaitingInterval { Reason = reason, Note = note, StartedAt = now, StartedById = me.UserId });
        AddEvent(db, c, CaseEventType.WaitingStarted, null, reason.ToString(), note, me, now);
    }

    internal static void EndWaiting(HubDbContext db, Case c, UserContext me, DateTimeOffset now, string? note = null)
    {
        if (c.WaitingReason is null) return;
        foreach (var w in c.WaitingIntervals.Where(w => w.EndedAt is null)) { w.EndedAt = now; w.EndedById = me.UserId; }
        AddEvent(db, c, CaseEventType.WaitingEnded, c.WaitingReason.ToString(), null, note, me, now);
        c.WaitingReason = null;
        c.WaitingSince = null;
    }

    public static void AddEvent(HubDbContext db, Case c, CaseEventType type, string? from, string? to, string? note, UserContext me, DateTimeOffset now) =>
        db.CaseEvents.Add(new CaseEvent { CaseId = c.Id, Type = type, FromValue = Trunc(from), ToValue = Trunc(to), Note = note?.Length > 2000 ? note[..2000] : note, ById = me.UserId, At = now });

    private static string? Trunc(string? s) => s is { Length: > 400 } ? s[..400] : s;

    private static (DateTimeOffset At, string Zone)? ParseDue(Check check, string? local, string? zone, bool required = false)
    {
        if (string.IsNullOrWhiteSpace(local) && !required) return null;
        var at = Zones.ToUtc(check, "dueLocal", local, zone, "dueTimeZone");
        return at is null ? null : (at.Value, zone!.Trim());
    }

    private static string AffectedSummary(Case c) =>
        $"Env:{string.Join(',', c.Environments.Select(e => e.EnvironmentId).Order())} Assets:{string.Join(',', c.Assets.Select(e => e.AssetId).Order())} Comp:{string.Join(',', c.Components.Select(e => e.ComponentId).Order())} Unknown:{c.UnknownEnvironmentReason}";

    /// <summary>WRK-02: affected records must be in the same client and visible; internal work need not invent an environment.</summary>
    private static async Task ApplyAffectedAsync(Case c, AffectedInput? a, HubDbContext db, CancellationToken ct)
    {
        a ??= new AffectedInput([], [], [], [], null);
        var check = new Check().Text("affected.unknownEnvironmentReason", a.UnknownEnvironmentReason, 1000, "Reason");
        var envIds = (a.EnvironmentIds ?? []).Distinct().ToList();
        var assetIds = (a.AssetIds ?? []).Distinct().ToList();
        var compIds = (a.ComponentIds ?? []).Distinct().ToList();
        if (c.ClientId is null && envIds.Count + assetIds.Count + compIds.Count > 0)
            check.Add("affected.environmentIds", "Internal work has no client, so it cannot link client environments or infrastructure.");
        else if (c.ClientId is { } cid)
        {
            if (await db.Environments.CountAsync(e => envIds.Contains(e.Id) && e.ClientId == cid, ct) != envIds.Count) check.Add("affected.environmentIds", "Affected environments must belong to the case's client.");
            if (await db.Assets.CountAsync(e => assetIds.Contains(e.Id) && e.ClientId == cid, ct) != assetIds.Count) check.Add("affected.assetIds", "Affected assets must belong to the case's client.");
            if (await db.Components.CountAsync(e => compIds.Contains(e.Id) && e.ClientId == cid, ct) != compIds.Count) check.Add("affected.componentIds", "Affected components must belong to the case's client.");
        }
        if (envIds.Count > 0 && !string.IsNullOrWhiteSpace(a.UnknownEnvironmentReason)) check.Add("affected.unknownEnvironmentReason", "Clear the unknown-environment reason when an environment is selected.");
        check.ThrowIfAny();
        var clientId = c.ClientId ?? 0;
        c.Environments.RemoveAll(x => !envIds.Contains(x.EnvironmentId));
        foreach (var id in envIds.Where(id => c.Environments.All(x => x.EnvironmentId != id))) c.Environments.Add(new CaseEnvironment { EnvironmentId = id, ClientId = clientId });
        c.Assets.RemoveAll(x => !assetIds.Contains(x.AssetId));
        foreach (var id in assetIds.Where(id => c.Assets.All(x => x.AssetId != id))) c.Assets.Add(new CaseAsset { AssetId = id, ClientId = clientId });
        c.Components.RemoveAll(x => !compIds.Contains(x.ComponentId));
        foreach (var id in compIds.Where(id => c.Components.All(x => x.ComponentId != id))) c.Components.Add(new CaseComponent { ComponentId = id, ClientId = clientId });
        c.UnknownEnvironmentReason = Text.Clean(a.UnknownEnvironmentReason);
    }

    /// <summary>Only visible matching cases are disclosed; inaccessible Jira references are not counted.</summary>
    public static async Task<object> ReuseAsync(HubDbContext db, HubAccess access, long instanceId, string key, long? exceptCaseId, CancellationToken ct)
    {
        var visible = await VisibleJiraMatches(db, instanceId, key, exceptCaseId)
            .Select(c => new { c.Id, c.Ref, c.Title }).ToListAsync(ct);
        return new { reused = visible.Count > 0, visible };
    }

    public static IQueryable<Case> VisibleJiraMatches(HubDbContext db, long instanceId, string key, long? exceptCaseId) =>
        db.Cases.AsNoTracking().Where(c => c.Id != exceptCaseId && db.JiraReferences.Any(j => j.CaseId == c.Id
            && j.JiraInstanceId == instanceId && j.IssueKey == key && j.RemovedAt == null));

    public static void CheckJiraLinkReason(Check check, string? reason) =>
        check.Text("reuseReason", reason, 1000, "the reason for linking this issue", required: true);

    private static async Task<JiraReference> AddJiraAsync(HubDbContext db, HubAccess access, Case c, JiraInput input, DateTimeOffset now, CancellationToken ct)
    {
        var check = new Check();
        var instance = input.JiraInstanceId is null ? null : await db.JiraInstances.AsNoTracking().FirstOrDefaultAsync(j => j.Id == input.JiraInstanceId && j.IsActive, ct);
        if (instance is null) check.Add("jiraInstanceId", "Select Customer Cloud or Internal On-prem Jira.");
        var key = JiraKeys.Normalize(input.IssueKey);
        if (!JiraKeys.IsValid(key)) check.Add("issueKey", "Enter a Jira issue key such as ABC-123.");
        if (instance is not null && JiraKeys.IsValid(key))
        {
            if (string.IsNullOrWhiteSpace(instance.ApprovedHost)) check.Add("url", "No approved host is configured for this Jira instance. Ask an administrator.");
            else if (JiraKeys.UrlProblem(input.Url ?? "", key, instance.ApprovedHost) is { } p) check.Add("url", p);
        }
        // A reason is required for every link. Making it conditional on hidden reuse would reveal hidden cases.
        CheckJiraLinkReason(check, input.ReuseReason);
        check.ThrowIfAny();
        if (await db.JiraReferences.AnyAsync(j => j.CaseId == c.Id && j.JiraInstanceId == instance!.Id && j.IssueKey == key && j.RemovedAt == null, ct))
            throw new ConflictException("This Jira reference is already linked to the case.");
        var j = new JiraReference { CaseId = c.Id, ClientId = c.ClientId, JiraInstanceId = instance!.Id, IssueKey = key, Url = input.Url!.Trim(), ReuseReason = input.ReuseReason!.Trim() };
        db.JiraReferences.Add(j);
        AddEvent(db, c, CaseEventType.JiraAdded, null, $"{instance.Name} {key}", j.ReuseReason, access.Me, now);
        return j;
    }
}
