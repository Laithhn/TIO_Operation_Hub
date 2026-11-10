using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>A running contractual SLA clock of a case, counted now in the contract's calendar (A61 rules), with the share of the target already used.</summary>
public sealed record SlaClockView(string Kind, DateTimeOffset DueAt, int TargetMinutes, int UsedMinutes, int UsedPercent, int RemainingMinutes, bool Breached, bool AtRisk);

public static class SlaClocks
{
    /// <summary>
    /// The pending clocks of a case, the one that runs out first in front. A clock is at risk when the share of the target left is at or
    /// below <paramref name="atRiskPercent"/>; past its deadline it is breached (the same rule as the SLA figures). Nothing is estimated:
    /// a case without a usable calendar or target has no clock.
    /// </summary>
    public static List<SlaClockView> Of(Case c, IEnumerable<CaseWaitingInterval> waits, DateTimeOffset now, int atRiskPercent)
    {
        var list = new List<SlaClockView>();
        if (c.ContractId is null || !CaseQuery.IsOpen(c.Status)) return list;
        var (cal, _) = CaseSla.Calendar(c);
        if (cal is null) return list;
        var pauses = CaseSla.Pauses(c, waits, now);
        void Add(string kind, SlaState state, DateTimeOffset? due, int? target)
        {
            if (state != SlaState.Pending || due is null || target is not > 0) return;
            var used = (int)SlaClock.Counted(c.CreatedAt, now, cal, pauses).TotalMinutes;
            var remaining = target.Value - used;
            var breached = now > due;
            list.Add(new SlaClockView(kind, due.Value, target.Value, used, (int)Math.Round(100.0 * used / target.Value), remaining, breached,
                !breached && remaining * 100.0 <= target.Value * (double)atRiskPercent));
        }
        Add("Response", c.ResponseSlaStatus, c.ResponseDueAt, c.SlaResponseMinutes);
        Add("Resolution", c.ResolutionSlaStatus, c.ResolutionDueAt, c.SlaResolutionMinutes);
        return list.OrderBy(x => x.DueAt).ToList();
    }
}

/// <summary>
/// A63 (owner request, 10 Nov 2026): the Operational dashboard — what an engineer or a team must act on today. Every figure is as of
/// now, through the caller's scope filters; counts use the shared case and commitment filters so each equals the list it opens.
/// </summary>
public sealed class OperationalDashboard(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    public static readonly string[] Views = ["mine", "team", "all"];
    public sealed record QueueRow(string Type, long Id, string Ref, string Title, long? ClientId, string? ClientCode, string? Priority, string? Owner, bool Unassigned,
        SlaClockView? Clock, DateTimeOffset? DueAt, DateTimeOffset Deadline, string? NextAction, string? Waiting, string Link);

    public async Task<object> BuildAsync(string? view, long? teamId, long? clientId, long? productId, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        view = Views.Contains(view) ? view! : "mine";
        var myTeams = await db.Teams.AsNoTracking().Where(t => me.TeamIds.Contains(t.Id)).OrderBy(t => t.Name).Select(t => new { t.Id, t.Name }).ToListAsync(ct);
        // Team view: the chosen team, else the caller's first team; without any team it shows everything the caller can see.
        long? team = view == "team" ? teamId ?? myTeams.FirstOrDefault()?.Id : view == "all" ? teamId : null;
        long? owner = view == "mine" ? me.UserId : null;
        var days = await settings.UpcomingDaysAsync(ct);
        var atRisk = await settings.SlaAtRiskPercentAsync(ct);
        var policies = await fresh.PoliciesAsync(ct);
        var policy = policies.GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var crit = (await settings.CoverageCriticalitiesAsync(ct)).ToList();
        var scopeCase = new CaseFilter(ClientId: clientId, TeamId: team, ProductId: productId);
        var baseCase = scopeCase with { OwnerId = owner };
        var baseCom = new CommitmentFilter(ClientId: clientId, TeamId: team, OwnerId: owner, ProductId: productId);
        IQueryable<Case> Cases(CaseFilter f) => CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, prios);
        IQueryable<Commitment> Coms(CommitmentFilter f) => CommitmentQuery.Apply(db.Commitments.AsNoTracking(), f, now, days, db);
        string Q(params string?[] parts) => string.Join("&", parts.Append(clientId is null ? null : $"clientId={clientId}").Append(team is null ? null : $"teamId={team}")
            .Append(owner is null ? null : $"ownerId={owner}").Append(productId is null ? null : $"productId={productId}").Where(x => !string.IsNullOrEmpty(x)));
        string CaseLink(params string?[] parts) => "/cases?" + Q(parts);
        string ComLink(params string?[] parts) => "/commitments?" + Q(parts);

        // ---- open work in scope ----
        var open = await Cases(baseCase).Select(c => new { c.Priority, c.OwnerUserId, c.WaitingReason, c.WaitingSince }).ToListAsync(ct);
        // Unassigned critical/high work is a team concern: it is shown whatever the "mine" choice, within the team, client and product filters.
        var unassigned = await Cases(scopeCase with { Unassigned = true }).Where(c => c.Priority == Priority.Critical || c.Priority == Priority.High).Select(c => c.CreatedAt).ToListAsync(ct);
        var in24 = now.AddHours(24);
        var casesDue24 = await Cases(baseCase with { Due = "24h" }).CountAsync(ct);
        var casesOverdue = await Cases(baseCase with { Due = "overdue" }).CountAsync(ct);
        var comOpen = await Coms(baseCom).Select(c => new { c.Id, c.Ref, c.Description, c.ClientId, code = c.Client == null ? null : c.Client.Code, owner = c.Owner == null ? null : c.Owner.DisplayName, c.CurrentDueAt, c.Type }).ToListAsync(ct);

        // ---- running SLA clocks (client cases with a contract and a pending obligation) ----
        var clockCases = await Cases(baseCase with { Scope = WorkScope.Client, Sla = "withContract" })
            .Where(c => c.ResponseSlaStatus == SlaState.Pending || c.ResolutionSlaStatus == SlaState.Pending)
            .Include(c => c.WaitingIntervals).Include(c => c.Client).Include(c => c.Owner).ToListAsync(ct);
        var clocks = clockCases.Select(c => new { c, clock = SlaClocks.Of(c, c.WaitingIntervals, now, atRisk).FirstOrDefault() }).Where(x => x.clock is not null).ToList();

        // ---- the queue: what runs out first ----
        var queue = new Dictionary<long, QueueRow>();
        foreach (var x in clocks.Where(x => x.clock!.Breached || x.clock.AtRisk || x.clock.DueAt <= in24))
            queue[x.c.Id] = new QueueRow("Case", x.c.Id, x.c.Ref, x.c.Title, x.c.ClientId, x.c.Client?.Code, x.c.Priority.ToString(), x.c.Owner?.DisplayName, x.c.OwnerUserId is null, x.clock,
                x.c.DueAt, x.c.DueAt is { } d && d < x.clock!.DueAt ? d : x.clock!.DueAt, x.c.NextAction, x.c.WaitingReason?.ToString(), $"/cases/{x.c.Id}");
        var dueCases = await Cases(baseCase).Where(c => c.DueAt != null && c.DueAt <= in24)
            .Select(c => new { c.Id, c.Ref, c.Title, c.ClientId, code = c.Client == null ? null : c.Client.Code, c.Priority, owner = c.Owner == null ? null : c.Owner.DisplayName, c.OwnerUserId, c.DueAt, c.NextAction, c.WaitingReason }).ToListAsync(ct);
        foreach (var c in dueCases.Where(c => !queue.ContainsKey(c.Id)))
            queue[c.Id] = new QueueRow("Case", c.Id, c.Ref, c.Title, c.ClientId, c.code, c.Priority.ToString(), c.owner, c.OwnerUserId is null, null, c.DueAt, c.DueAt!.Value, c.NextAction, c.WaitingReason?.ToString(), $"/cases/{c.Id}");
        var rows = queue.Values.Concat(comOpen.Where(c => c.CurrentDueAt <= in24).Select(c =>
            new QueueRow("Commitment", c.Id, c.Ref, c.Description, c.ClientId, c.code, null, c.owner, c.owner is null, null, c.CurrentDueAt, c.CurrentDueAt, null, null, $"/commitments/{c.Id}")))
            .OrderBy(r => r.Deadline).ToList();

        // ---- production environments: manually reported condition ----
        var envQ = db.Environments.AsNoTracking().Where(e => e.TypeCategory == EnvironmentType.Production && db.Clients.Any(c => c.Id == e.ClientId));
        if (clientId is not null) envQ = envQ.Where(e => e.ClientId == clientId);
        if (productId is not null) envQ = envQ.Where(e => db.Installations.Any(i => i.EnvironmentId == e.Id && i.ProductId == productId));
        var condPolicy = policies.GetValueOrDefault((RecordTypes.Environment, ReviewScope.Condition));
        var envs = (await envQ.Select(e => new { e.Id, e.Name, e.ClientId, client = e.Client!.Code, e.Condition, e.ConditionObservedAt, e.ConditionReason, e.Criticality, e.OwnerUserId, e.BackupOwnerUserId,
                backupActive = e.BackupOwner != null && e.BackupOwner.IsActive }).ToListAsync(ct))
            .Select(e => new { e.Id, e.Name, e.ClientId, e.client, view = EnvironmentEndpoints.ConditionView(e.Condition, e.ConditionObservedAt, condPolicy, now), reason = e.ConditionReason }).ToList();
        int Env(Condition c) => envs.Count(e => e.view.Reported == c);
        static int Order(Condition c) => c switch { Condition.Unavailable => 0, Condition.Degraded => 1, Condition.Unknown => 2, _ => 4 };

        // ---- workload: open cases per owner in the team/client/product scope (not narrowed to "mine") ----
        var load = await Cases(scopeCase).Select(c => new { c.OwnerUserId, owner = c.Owner == null ? null : c.Owner.DisplayName, c.Priority }).ToListAsync(ct);
        var workload = load.GroupBy(c => new { c.OwnerUserId, c.owner }).Select(g => new
        {
            ownerId = g.Key.OwnerUserId, owner = g.Key.owner ?? "Unassigned", total = g.Count(),
            critical = g.Count(x => x.Priority == Priority.Critical), high = g.Count(x => x.Priority == Priority.High), normal = g.Count(x => x.Priority == Priority.Normal), low = g.Count(x => x.Priority == Priority.Low),
            link = "/cases?" + string.Join("&", new[] { g.Key.OwnerUserId is null ? "unassigned=true" : $"ownerId={g.Key.OwnerUserId}", clientId is null ? null : $"clientId={clientId}", team is null ? null : $"teamId={team}", productId is null ? null : $"productId={productId}" }.Where(x => x is not null))
        }).OrderByDescending(x => x.total).Take(12).ToList();

        // ---- the next 7 days ----
        var week = now.AddDays(7);
        var maintenance = await Cases(baseCase).Where(c => c.TypeCategory == CaseType.MaintenanceCoordination && c.DueAt != null && c.DueAt > now && c.DueAt <= week)
            .Select(c => new { c.Id, c.Ref, c.Title, code = c.Client == null ? null : c.Client.Code, c.DueAt }).ToListAsync(ct);
        var upcoming = comOpen.Where(c => c.CurrentDueAt > now && c.CurrentDueAt <= week)
            .Select(c => new { kind = "Commitment", c.Id, c.Ref, title = c.Description, client = c.code, at = c.CurrentDueAt, link = $"/commitments/{c.Id}" })
            .Concat(maintenance.Select(c => new { kind = "Maintenance", c.Id, c.Ref, title = c.Title, client = c.code, at = c.DueAt!.Value, link = $"/cases/{c.Id}" }))
            .OrderBy(x => x.at).Take(12).ToList();

        // ---- hygiene: always the caller's own ----
        var uid = me.UserId;
        var myCases = new CaseFilter(OwnerId: uid);
        object H(string key, string label, int value, string link) => new { key, label, value, link };
        var hygiene = new[]
        {
            H("handovers", "Handovers awaiting my acknowledgment", await db.Handovers.CountAsync(h => h.Status == HandoverStatus.PendingAcknowledgment && h.ReceivingOwnerId == uid, ct), "/handovers"),
            H("reviewOverdue", "My cases with the next review passed", await Cases(myCases with { ReviewOverdue = true }).CountAsync(ct), $"/cases?ownerId={uid}&reviewOverdue=true"),
            H("noFirstResponse", "My cases with a response clock still running", await Cases(myCases with { Sla = "responsePending" }).CountAsync(ct), $"/cases?ownerId={uid}&sla=responsePending"),
            H("coverage", "My environments without an active backup owner",
                await db.Environments.CountAsync(e => e.OwnerUserId == uid && crit.Contains(e.Criticality) && (e.BackupOwnerUserId == null || !e.BackupOwner!.IsActive), ct), "/actions?category=CoverageGap"),
            H("dataQuality", "Data-quality items I coordinate", await db.DataQualityItems.CountAsync(i => i.Status == DataQualityStatus.Open && i.CoordinatorUserId == uid, ct), "/data-quality"),
            H("notifications", "Unread notifications", await db.Notifications.CountAsync(n => n.UserId == uid && n.ReadAt == null, ct), "/notifications")
        };

        var waiting = open.Where(c => c.WaitingReason == WaitingReason.Customer).ToList();
        return new
        {
            evaluatedAt = now,
            view, teamId = team, teams = myTeams, atRiskPercent = atRisk,
            kpis = new
            {
                openCases = new { value = open.Count, mine = open.Count(c => c.OwnerUserId == uid), criticalHigh = open.Count(c => c.Priority is Priority.Critical or Priority.High), link = CaseLink("status=open") },
                unassigned = new { value = unassigned.Count, oldestMinutes = unassigned.Count == 0 ? (int?)null : (int)(now - unassigned.Min()).TotalMinutes,
                    link = "/cases?" + string.Join("&", new[] { "unassigned=true", clientId is null ? null : $"clientId={clientId}", team is null ? null : $"teamId={team}", productId is null ? null : $"productId={productId}" }.Where(x => x is not null)) },
                slaAtRisk = new { value = clocks.Count(x => x.clock!.AtRisk), breached = clocks.Count(x => x.clock!.Breached), running = clocks.Count, link = CaseLink("sla=approaching") },
                due24h = new { value = casesDue24 + comOpen.Count(c => c.CurrentDueAt >= now && c.CurrentDueAt <= in24), cases = casesDue24, commitments = comOpen.Count(c => c.CurrentDueAt >= now && c.CurrentDueAt <= in24), link = CaseLink("due=24h") },
                overdue = new { value = casesOverdue + comOpen.Count(c => c.CurrentDueAt < now), cases = casesOverdue, commitments = comOpen.Count(c => c.CurrentDueAt < now), link = CaseLink("due=overdue"), commitmentsLink = ComLink("due=overdue") },
                waitingCustomer = new { value = waiting.Count, long5d = waiting.Count(c => c.WaitingSince < now.AddDays(-5)), link = CaseLink("waiting=true") },
                environments = new { total = envs.Count, healthy = Env(Condition.Healthy), degraded = Env(Condition.Degraded), unavailable = Env(Condition.Unavailable), unknown = Env(Condition.Unknown),
                    needsVerification = envs.Count(e => e.view.NeedsVerification), link = "/environments?type=Production" + (clientId is null ? "" : $"&clientId={clientId}") }
            },
            queue = new { total = rows.Count, items = rows.Take(25).ToList() },
            environments = envs.OrderBy(e => e.view.NeedsVerification && e.view.Reported == Condition.Healthy ? 3 : Order(e.view.Reported)).ThenBy(e => e.client).ThenBy(e => e.Name).Take(60)
                .Select(e => new { e.Id, e.Name, e.ClientId, e.client, condition = e.view, e.reason }).ToList(),
            workload,
            upcoming,
            hygiene,
            note = "Everything is as of now. SLA clocks are counted in each contract's support calendar; environment condition is manually reported, not monitored."
        };
    }
}
