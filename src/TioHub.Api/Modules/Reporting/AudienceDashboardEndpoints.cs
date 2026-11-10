using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

/// <summary>
/// A108 (owner request, 10 Nov 2026): four dashboards, one per audience and question, beside the Operations Command Center —
/// Operational (what to act on today), SLA &amp; Contracts (are obligations met), Management (trend and where to step in) and
/// Project (what is the status of this project) — and the project status reports the last one is built on.
/// </summary>
public static class AudienceDashboardEndpoints
{
    public sealed record StatusReportInput(ProjectReportedStatus? Status, string? Summary, DateOnly? NextReviewOn);

    public static void MapAudienceDashboardEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/dashboard").WithTags("Dashboard");

        g.MapGet("/operational", async (string? view, long? teamId, long? clientId, long? productId, OperationalDashboard dash, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            if (view is not null && !OperationalDashboard.Views.Contains(view)) throw new ValidationException("view", "Unknown view.");
            return Results.Ok(await dash.BuildAsync(view, teamId, clientId, productId, access.Me, ct));
        });

        g.MapGet("/sla-contracts", async ([AsParameters] SlaContractsDashboard.Query p, SlaContractsDashboard dash, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            if (p.Period is not null && !SlaContractsDashboard.Periods.Contains(p.Period)) throw new ValidationException("period", "Unknown reporting period.");
            if (p.Period == "custom" && (p.From is null || p.To is null || p.From >= p.To)) throw new ValidationException("from", "Give a start before the end for a custom period.");
            if (p.Period == "custom" && p.To - p.From > TimeSpan.FromDays(731)) throw new ValidationException("to", "A custom period can cover at most two years.");
            return Results.Ok(await dash.BuildAsync(p, access.Me, ct));
        });

        g.MapGet("/management", async (string? period, string? country, long? teamId, long? productId, ManagementDashboard dash, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            if (period is not null && !ManagementDashboard.Periods.Contains(period)) throw new ValidationException("period", "Unknown reporting period.");
            return Results.Ok(await dash.BuildAsync(period, country, teamId, productId, access.Me, ct));
        });

        g.MapGet("/projects", async (long? clientId, string? country, long? productId, long? ownerId, ProjectInsight insight, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var now = DateTimeOffset.UtcNow;
            return Results.Ok(new { evaluatedAt = now, items = await insight.PortfolioAsync(clientId, country, productId, ownerId, now, ct) });
        });

        g.MapGet("/projects/{id:long}", async (long id, ProjectInsight insight, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            return Results.Ok(await insight.ProjectAsync(id, access.Me, ct));
        });

        // ---- project status reports: recorded by a person, kept as history ----
        var pg = api.MapGroup("/projects").WithTags("Projects");
        pg.MapGet("/{id:long}/status-reports", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            if (!await db.Projects.AnyAsync(p => p.Id == id, ct)) throw new NotFoundException("The project");
            return Results.Ok(await db.ProjectStatusReports.AsNoTracking().Where(r => r.ProjectId == id).OrderByDescending(r => r.RecordedAt).ThenByDescending(r => r.Id)
                .Select(r => new { r.Id, status = r.Status.ToString(), r.Summary, r.NextReviewOn, r.RecordedAt, recordedBy = r.RecordedBy == null ? null : r.RecordedBy.DisplayName }).ToListAsync(ct));
        });

        pg.MapPost("/{id:long}/status-reports", async (long id, StatusReportInput input, HubDbContext db, HubAccess access, HubSettings settings, TimeProvider clock, CancellationToken ct) =>
        {
            var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The project");
            access.RequireMaintain(RightKeys.Projects, p.ClientId, null, p.OwnerUserId);
            var now = clock.GetUtcNow();
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            var check = new Check();
            check.When(input.Status is null, "status", "Select the project status.")
                 .Text("summary", input.Summary, 1000, "the reason for this status", required: true)
                 .When(p.Status is ProjectStatus.Completed or ProjectStatus.Archived, "status", "A completed or archived project takes no new status.")
                 .When(input.NextReviewOn is { } d && d < today.AddDays(-1), "nextReviewOn", "The next review date cannot be in the past.")
                 .When(input.NextReviewOn is { } far && far > today.AddDays(366), "nextReviewOn", "Choose a next review date within a year.");
            check.ThrowIfAny();
            var report = new ProjectStatusReport
            {
                ProjectId = id, ClientId = p.ClientId, Status = input.Status!.Value, Summary = input.Summary!.Trim(), NextReviewOn = input.NextReviewOn, RecordedAt = now, RecordedById = access.Me.UserId
            };
            db.ProjectStatusReports.Add(report);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/projects/{id}/status-reports/{report.Id}", new { report.Id });
        });
    }
}
