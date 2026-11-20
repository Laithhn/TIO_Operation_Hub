using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A123 (owner request, 19 Nov 2026): the Tickets dashboard in the Tickets menu, modelled on a Jira board — tickets by status with the share
/// done, the unresolved tickets per responsible party, statistics per owner, priority, type and client, and a stream of recent ticket activity.
/// Every count uses the shared case filter, so a figure equals the ticket list its link opens; data scope applies through the query filters.
/// </summary>
public sealed class TicketDashboard(HubDbContext db, HubSettings settings, FreshnessService fresh)
{
    /// <summary>The "created in the last N days" choices; empty means every ticket.</summary>
    public static readonly int[] Periods = [7, 30, 90, 365];
    public const int ListSize = 10, ActivitySize = 30, TopClients = 10;

    public sealed record OpenRow(long Id, string Ref, string Title, string Priority, string StatusCode, string Status, string? Owner, string? ClientCode,
        DateTimeOffset OpenedAt, DateTimeOffset? DueAt, bool Overdue, string? Waiting);
    public sealed record ActivityItem(string Key, string Source, string Kind, string Category, string? Actor, DateTimeOffset At, string? From, string? To, string? Body,
        bool Restricted, bool Edited, long CaseId, string Ref, string Title, bool Closed);

    public async Task<object> BuildAsync(long? clientId, long? teamId, long? productId, int? days, UserContext me, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        DateTimeOffset? from = days is null ? null : now.AddDays(-days.Value);
        var upcoming = await settings.UpcomingDaysAsync(ct);
        var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
        var prios = await settings.CoveragePrioritiesAsync(ct);
        var scope = new CaseFilter(ClientId: clientId, TeamId: teamId, ProductId: productId, CreatedFrom: from);
        IQueryable<Case> Cases(CaseFilter f) => CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, upcoming, policy, db, prios);
        // createdFrom is a whole timestamp so the list counts exactly what the dashboard counted.
        string LinkFor(long? client, params string?[] parts) => "/cases?" + string.Join("&", parts
            .Append(client is null ? null : $"clientId={client}").Append(teamId is null ? null : $"teamId={teamId}")
            .Append(productId is null ? null : $"productId={productId}").Append(from is null ? null : $"createdFrom={Uri.EscapeDataString(from.Value.ToString("O"))}")
            .Where(x => !string.IsNullOrEmpty(x)));
        string Link(params string?[] parts) => LinkFor(clientId, parts);
        string ClientLink(long client) => LinkFor(client, "status=open");

        var labels = await db.LookupValues.AsNoTracking().Where(l => l.ListName == CaseStatuses.List)
            .OrderBy(l => l.SortOrder).Select(l => new { l.Code, l.Label, l.SortOrder }).ToListAsync(ct);
        string StatusLabel(string code) => labels.FirstOrDefault(l => l.Code == code)?.Label ?? code;

        // ---- every ticket in view, light columns only ----
        var all = await Cases(scope with { Status = "all" })
            .Select(c => new { c.Status, c.StatusCode, c.Priority, c.Type, c.OwnerUserId, owner = c.Owner == null ? null : c.Owner.DisplayName, c.ClientId, code = c.Client == null ? null : c.Client.Code, c.ResponsibleParty, c.WaitingReason })
            .ToListAsync(ct);
        var open = all.Where(c => CaseQuery.IsOpen(c.Status)).ToList();
        var done = all.Count - open.Count;
        var overdue = await Cases(scope with { Due = "overdue" }).CountAsync(ct);

        // ---- by status: configured statuses in their order; a cancelled ticket counts as Cancelled whatever its last status ----
        var byStatus = all.GroupBy(c => c.Status == CaseStatus.Cancelled ? "@cancelled" : c.StatusCode)
            .Select(g => new
            {
                key = g.Key, label = g.Key == "@cancelled" ? "Cancelled" : StatusLabel(g.Key), value = g.Count(),
                done = g.All(x => !CaseQuery.IsOpen(x.Status)),
                order = g.Key == "@cancelled" ? int.MaxValue : labels.FirstOrDefault(l => l.Code == g.Key)?.SortOrder ?? int.MaxValue - 1,
                link = Link(g.Key == "@cancelled" ? "status=Cancelled" : $"status={Uri.EscapeDataString("code:" + g.Key)}")
            })
            .OrderBy(x => x.order).ThenBy(x => x.label).Select(x => new { x.key, x.label, x.value, x.done, x.link }).ToList();

        // ---- unresolved tickets per responsible party (the board's "non-resolved" filters) ----
        var openRows = await Cases(scope)
            .OrderBy(c => c.Priority).ThenBy(c => c.SlaClockStartAt ?? c.CreatedAt)
            .Select(c => new { c.Id, c.Ref, c.Title, c.Priority, c.StatusCode, owner = c.Owner == null ? null : c.Owner.DisplayName, code = c.Client == null ? null : c.Client.Code,
                opened = c.SlaClockStartAt ?? c.CreatedAt, c.DueAt, c.WaitingReason, c.ResponsibleParty })
            .ToListAsync(ct);
        var unresolved = openRows.GroupBy(c => c.ResponsibleParty).OrderBy(g => g.Key)
            .Select(g => new
            {
                party = g.Key.ToString(), total = g.Count(),
                items = g.Take(ListSize).Select(c => new OpenRow(c.Id, c.Ref, c.Title, c.Priority.ToString(), c.StatusCode, StatusLabel(c.StatusCode), c.owner, c.code,
                    c.opened, c.DueAt, c.DueAt < now, c.WaitingReason?.ToString())).ToList()
            }).ToList();

        // ---- statistics ----
        var byOwner = open.GroupBy(c => new { c.OwnerUserId, c.owner }).Select(g => new
        {
            ownerId = g.Key.OwnerUserId, owner = g.Key.owner ?? "Unassigned", value = g.Count(),
            critical = g.Count(x => x.Priority == Priority.Critical), high = g.Count(x => x.Priority == Priority.High),
            link = Link(g.Key.OwnerUserId is null ? "unassigned=true" : $"ownerId={g.Key.OwnerUserId}")
        }).OrderByDescending(x => x.value).ThenBy(x => x.owner).ToList();
        var byPriority = Enum.GetValues<Priority>().Select(p => new { key = p.ToString(), label = p.ToString(), value = open.Count(c => c.Priority == p), link = Link($"priority={p}") }).ToList();
        var byType = all.GroupBy(c => string.IsNullOrWhiteSpace(c.Type) ? "Not set" : c.Type).Select(g => new { key = g.Key, label = g.Key, value = g.Count(), open = g.Count(x => CaseQuery.IsOpen(x.Status)) })
            .OrderByDescending(x => x.value).ToList();
        // One client chosen: the split per client says nothing, so it is left out.
        var byClient = open.Where(c => clientId is null && c.ClientId is not null).GroupBy(c => new { c.ClientId, c.code })
            .Select(g => new { key = g.Key.ClientId!.Value.ToString(), label = g.Key.code ?? "?", value = g.Count(), link = (string?)ClientLink(g.Key.ClientId!.Value) })
            .OrderByDescending(x => x.value).ThenBy(x => x.label).Take(TopClients).ToList();
        var internalOpen = open.Count(c => c.ClientId is null);

        // ---- activity stream: the ticket Activity tab's sources (hub events, TIO comments, Jira comments and Jira workflow and assignment
        // changes) across every ticket in view, under the same right. Field-level system changes are left out, as the tab's "system" switch does.
        List<ActivityItem>? activity = null;
        if (me.HasRight(RightKeys.Tab(RightKeys.Cases, "timeline", RightKeys.View)))
        {
            // Recent activity is not narrowed by the creation period: a long-open ticket that moved today belongs here.
            var ids = Cases(scope with { Status = "all", CreatedFrom = null }).Select(c => c.Id);
            var seesRestricted = me.HasRight(RightKeys.Cases, RightKeys.Coordinate);
            var rows = new List<(long CaseId, Jira.JiraCaseEndpoints.ActivityRow Row)>();
            var shownEvents = Enum.GetValues<CaseEventType>().Where(t => Jira.JiraCaseEndpoints.CategoryOf(t) != "system" || t == CaseEventType.StatusChanged).ToList();
            var events = await db.CaseEvents.AsNoTracking().Where(e => ids.Contains(e.CaseId) && shownEvents.Contains(e.Type)).OrderByDescending(e => e.At).ThenByDescending(e => e.Id).Take(ActivitySize)
                .Select(e => new { e.Id, e.CaseId, e.Type, e.FromValue, e.ToValue, e.Note, e.At, by = e.By == null ? null : e.By.DisplayName }).ToListAsync(ct);
            rows.AddRange(events.Select(e =>
            {
                // Status codes are shown with their configured labels.
                var status = e.Type == CaseEventType.StatusChanged;
                return (e.CaseId, new Jira.JiraCaseEndpoints.ActivityRow($"e{e.Id}", "TIO", e.Type.ToString(), status ? "workflow" : Jira.JiraCaseEndpoints.CategoryOf(e.Type), e.Type.ToString(), e.by, e.At,
                    status && e.FromValue is not null ? StatusLabel(e.FromValue) : e.FromValue, status && e.ToValue is not null ? StatusLabel(e.ToValue) : e.ToValue, e.Note, false, null, false));
            }));
            var comments = await db.CaseComments.AsNoTracking().Where(x => ids.Contains(x.CaseId)).OrderByDescending(x => x.At).ThenByDescending(x => x.Id).Take(ActivitySize)
                .Select(x => new { x.Id, x.CaseId, x.Body, x.At, by = x.Author!.DisplayName }).ToListAsync(ct);
            rows.AddRange(comments.Select(x => (x.CaseId, new Jira.JiraCaseEndpoints.ActivityRow($"c{x.Id}", "TIO", "Comment", "tioComments", "TIO comment", x.by, x.At, null, null, x.Body, false, null, false))));
            var jiraComments = await db.JiraComments.AsNoTracking().Where(x => ids.Contains(x.CaseId) && x.DeletedInJiraAt == null).OrderByDescending(x => x.JiraCreatedAt).ThenByDescending(x => x.Id).Take(ActivitySize).ToListAsync(ct);
            foreach (var x in jiraComments)
            {
                var (body, hidden) = Jira.JiraCaseEndpoints.CommentBody(x, seesRestricted);
                rows.Add((x.CaseId, new Jira.JiraCaseEndpoints.ActivityRow($"j{x.Id}", "Jira", "JiraComment", "jiraComments", "Jira comment", x.AuthorName, x.JiraCreatedAt, null, null, body, hidden, null, x.JiraUpdatedAt > x.JiraCreatedAt.AddSeconds(1))));
            }
            var jiraChanges = await db.JiraActivities.AsNoTracking().Where(x => ids.Contains(x.CaseId) && (x.Type == Jira.JiraActivityType.Status || x.Type == Jira.JiraActivityType.Assignee))
                .OrderByDescending(x => x.At).ThenByDescending(x => x.Id).Take(ActivitySize).ToListAsync(ct);
            rows.AddRange(jiraChanges.Select(x => (x.CaseId, x.Type == Jira.JiraActivityType.Status
                ? new Jira.JiraCaseEndpoints.ActivityRow($"a{x.Id}", "Jira", "JiraWorkflow", "workflow", "Jira workflow change", x.ActorName, x.At, x.FromValue, x.ToValue, null, false, null, false)
                : new Jira.JiraCaseEndpoints.ActivityRow($"a{x.Id}", "Jira", "JiraAssignment", "assignments", "Jira assignment", x.ActorName, x.At, x.FromValue, x.ToValue, null, false, null, false))));
            var newest = rows.OrderByDescending(r => r.Row.At).ThenByDescending(r => r.Row.Key, StringComparer.Ordinal).Take(ActivitySize).ToList();
            var caseIds = newest.Select(r => r.CaseId).Distinct().ToList();
            var cases = await db.Cases.AsNoTracking().Where(c => caseIds.Contains(c.Id)).Select(c => new { c.Id, c.Ref, c.Title, c.Status }).ToDictionaryAsync(c => c.Id, ct);
            activity = newest.Where(r => cases.ContainsKey(r.CaseId)).Select(r =>
            {
                var c = cases[r.CaseId];
                return new ActivityItem(r.Row.Key, r.Row.Source, r.Row.Kind, r.Row.Category, r.Row.Actor, r.Row.At, r.Row.From, r.Row.To, r.Row.Body, r.Row.Restricted, r.Row.Edited, c.Id, c.Ref, c.Title, !CaseQuery.IsOpen(c.Status));
            }).ToList();
        }

        return new
        {
            evaluatedAt = now, days, createdFrom = from,
            kpis = new
            {
                total = new { value = all.Count, link = Link("status=all") },
                open = new { value = open.Count, criticalHigh = open.Count(c => c.Priority is Priority.Critical or Priority.High), link = Link("status=open") },
                done = new { value = done, percent = all.Count == 0 ? 0 : (int)Math.Round(100.0 * done / all.Count), link = Link("status=done") },
                unassigned = new { value = open.Count(c => c.OwnerUserId is null), link = Link("unassigned=true") },
                overdue = new { value = overdue, link = Link("due=overdue") },
                waitingCustomer = new { value = open.Count(c => c.WaitingReason == WaitingReason.Customer), link = Link("waitingFor=Customer") }
            },
            byStatus, unresolved, byOwner, byPriority, byType, byClient, internalOpen,
            activity,
            note = "Counts include every ticket you are authorized to see that matches the filters; the period is the date the ticket was opened."
        };
    }
}
