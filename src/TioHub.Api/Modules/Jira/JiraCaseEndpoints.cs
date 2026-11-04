using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Jira;

/// <summary>A76: the case page's Jira summary, the unified activity and local comments. Nothing here calls Jira.</summary>
public static class JiraCaseEndpoints
{
    public sealed record CommentInput(string? Body);
    public sealed record ActivityRow(string Key, string Source, string Kind, string Category, string Title, string? Actor, DateTimeOffset At, string? From, string? To, string? Body, bool Restricted, string? Reference, bool Edited);

    public static async Task<object?> SourceAsync(HubDbContext db, long caseId, DateTimeOffset now, CancellationToken ct)
    {
        var m = await db.JiraCaseMappings.AsNoTracking().Include(x => x.JiraConnection).FirstOrDefaultAsync(x => x.CaseId == caseId, ct);
        if (m is null) return null;
        var state = await db.JiraSpaceSyncStates.AsNoTracking().FirstOrDefaultAsync(s => s.ClientJiraSpaceId == m.ClientJiraSpaceId, ct);
        var settings = await db.ClientJiraSettings.AsNoTracking().FirstOrDefaultAsync(s => s.ClientId == m.ClientId, ct);
        var active = settings?.IsEnabled == true && m.JiraConnection?.IsEnabled == true;
        return new
        {
            m.IssueKey, m.Url, m.Source, connection = m.JiraConnection?.Name, connectionStatus = !active ? "Disabled" : state?.LastStatus == JiraSyncStatus.Failed ? "Error" : m.MissingInJiraAt is not null ? "Missing" : "Synchronized",
            status = m.StatusName, statusCategory = m.StatusCategory, assignee = m.AssigneeName, reporter = m.ReporterName, priority = m.PriorityName, issueType = m.IssueTypeName, m.Resolution, m.Components, m.Labels, description = m.DescriptionText, m.Summary,
            jiraCreatedAt = m.JiraCreatedAt, jiraUpdatedAt = m.JiraUpdatedAt, jiraDueDate = m.JiraDueDate, ownerFromJira = m.OwnerFromJira,
            lastSync = m.LastSyncedAt, nextSync = active && state?.LastRunAt is { } last ? last.AddMinutes(settings!.SyncIntervalMinutes) : (DateTimeOffset?)null,
            details = m.DetailsJson is null ? (JsonElement?)null : JsonSerializer.Deserialize<JsonElement>(m.DetailsJson)
        };
    }

    public static string CategoryOf(CaseEventType t) => t switch
    {
        CaseEventType.Created or CaseEventType.Triaged or CaseEventType.Started or CaseEventType.ValidationRequested or CaseEventType.Closed or CaseEventType.Cancelled or CaseEventType.Reopened => "workflow",
        CaseEventType.OwnerChanged => "assignments",
        _ => "system"
    };

    /// <summary>Jira visibility is not one of the hub's roles, so a restricted comment's text goes only to people who coordinate this case. Others see that it exists.</summary>
    public static (string? Body, bool Hidden) CommentBody(JiraComment c, bool canSeeRestricted)
    {
        if (c.Withheld) return ("[Withheld: this comment looks like it contains a credential. Read it in Jira.]", false);
        if (c.VisibilityValue is not null && !canSeeRestricted) return (null, true);
        return (c.BodyText, false);
    }

    public static void MapJiraCaseEndpoints(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/cases/{id:long}").WithTags("Cases");

        g.MapGet("/activity", async (long id, string? filter, bool? system, int? page, int? pageSize, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var me = access.Me;
            me.RequireRight(RightKeys.Tab("Cases", "timeline", "View"));
            var c = await db.Cases.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Id, x.ClientId, x.ResponsibleTeamId }).FirstOrDefaultAsync(ct) ?? throw new NotFoundException("The case");
            var seesRestricted = me.HasRight(RightKeys.Cases, RightKeys.Coordinate);
            var rows = new List<ActivityRow>();
            {
                var events = await db.CaseEvents.AsNoTracking().Where(e => e.CaseId == id).Select(e => new { e.Id, e.Type, e.FromValue, e.ToValue, e.Note, e.At, by = e.By == null ? null : e.By.DisplayName }).ToListAsync(ct);
                rows.AddRange(events.Select(e => new ActivityRow($"e{e.Id}", "TIO", e.Type.ToString(), CategoryOf(e.Type), e.Type.ToString(), e.by, e.At, e.FromValue, e.ToValue, e.Note, false, null, false)));
            }
            var comments = await db.CaseComments.AsNoTracking().Where(x => x.CaseId == id).Select(x => new { x.Id, x.Body, x.At, by = x.Author!.DisplayName }).ToListAsync(ct);
            rows.AddRange(comments.Select(x => new ActivityRow($"c{x.Id}", "TIO", "Comment", "tioComments", "TIO comment", x.by, x.At, null, null, x.Body, false, "Local only", false)));
            var jiraComments = await db.JiraComments.AsNoTracking().Where(x => x.CaseId == id && x.DeletedInJiraAt == null).ToListAsync(ct);
            var keys = await db.JiraCaseMappings.AsNoTracking().Where(m => m.CaseId == id).Select(m => new { m.JiraIssueId, m.IssueKey }).ToDictionaryAsync(m => m.JiraIssueId, m => m.IssueKey, ct);
            foreach (var x in jiraComments)
            {
                var (body, hidden) = CommentBody(x, seesRestricted);
                var key = keys.GetValueOrDefault(x.JiraIssueId);
                rows.Add(new ActivityRow($"j{x.Id}", "Jira", "JiraComment", "jiraComments", "Jira comment", x.AuthorName, x.JiraCreatedAt, null, null, body, hidden, key is null ? null : $"{key} · Comment #{x.JiraCommentId}", x.JiraUpdatedAt > x.JiraCreatedAt.AddSeconds(1)));
            }
            var activity = await db.JiraActivities.AsNoTracking().Where(x => x.CaseId == id).ToListAsync(ct);
            foreach (var x in activity)
            {
                var (kind, category, title) = x.Type switch
                {
                    JiraActivityType.Status => ("JiraWorkflow", "workflow", "Jira workflow change"),
                    JiraActivityType.Assignee => ("JiraAssignment", "assignments", "Jira assignment"),
                    _ => ("JiraField", "system", $"Jira {x.Field} change")
                };
                rows.Add(new ActivityRow($"a{x.Id}", "Jira", kind, category, title, x.ActorName, x.At, x.FromValue, x.ToValue, null, false, keys.GetValueOrDefault(x.JiraIssueId), false));
            }
            var counts = new { all = rows.Count(r => r.Category != "system" || system != false), jiraComments = rows.Count(r => r.Category == "jiraComments"), tioComments = rows.Count(r => r.Category == "tioComments"), workflow = rows.Count(r => r.Category == "workflow"), assignments = rows.Count(r => r.Category == "assignments") };
            IEnumerable<ActivityRow> shown = rows;
            if (system == false) shown = shown.Where(r => r.Category != "system");
            if (filter is "jiraComments" or "tioComments" or "workflow" or "assignments") shown = shown.Where(r => r.Category == filter);
            var ordered = shown.OrderByDescending(r => r.At).ThenByDescending(r => r.Key, StringComparer.Ordinal).ToList();
            var p = PageQuery.From(page, pageSize ?? 25);
            return Results.Ok(new { counts, totalCount = ordered.Count, p.Page, p.PageSize, items = ordered.Skip((p.Page - 1) * p.PageSize).Take(p.PageSize) });
        });

        // Saved here only. There is no Jira call, queue or event behind this endpoint, and imported Jira comments have no edit endpoint at all.
        // A86: reads only this case's issue, at once. The run itself works as the system, like the scheduled one, so it sees what a person's scope would hide.
        g.MapPost("/jira-source/sync", async (long id, HubDbContext db, HubAccess access, IServiceScopeFactory scopes, CancellationToken ct) =>
        {
            var c = await db.Cases.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.ClientId, x.ResponsibleTeamId, x.OwnerUserId, x.BackupOwnerUserId, x.CoordinatorUserId }).FirstOrDefaultAsync(ct) ?? throw new NotFoundException("The case");
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId, c.OwnerUserId, c.BackupOwnerUserId, c.CoordinatorUserId);
            using var scope = scopes.CreateScope();
            return Results.Ok(await scope.ServiceProvider.GetRequiredService<JiraSyncService>().SyncCaseAsync(id, ct));
        });

        g.MapPost("/comments", async (long id, CommentInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Cases.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.Id, x.ClientId, x.ResponsibleTeamId }).FirstOrDefaultAsync(ct) ?? throw new NotFoundException("The case");
            access.RequireMaintain(RightKeys.Cases, c.ClientId, c.ResponsibleTeamId);
            new Check().Text("body", input.Body, 8000, "the comment", true).ThrowIfAny();
            var row = new CaseComment { CaseId = id, AuthorId = access.Me.UserId ?? throw new ForbiddenException("Only a signed-in person can comment."), Body = input.Body!.Trim(), At = clock.GetUtcNow() };
            db.CaseComments.Add(row);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/cases/{id}/activity", new { row.Id });
        });
    }
}
