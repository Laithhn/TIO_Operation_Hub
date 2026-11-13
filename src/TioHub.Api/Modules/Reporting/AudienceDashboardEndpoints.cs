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
/// Client (what is the status of this client, across its projects; A109 — 2.59.0 had a Project dashboard) — and the client status reports the last one is built on.
/// </summary>
public static class AudienceDashboardEndpoints
{
    public sealed record StatusReportInput(ReportedStatus? Status, string? Summary, DateOnly? NextReviewOn);

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

        // A115: Paid, Upcoming and Overdue payment terms for any years, clients, contract owners, products and currencies, and the same view in Excel.
        g.MapGet("/payments", async (string? years, string? clientIds, string? ownerIds, string? productIds, string? currencies, PaymentsDashboard dash, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            return Results.Ok(await dash.BuildAsync(PaymentsDashboard.Filters.Parse(years, clientIds, ownerIds, productIds, currencies), access.Me, ct));
        });

        g.MapGet("/payments/export", async (string? years, string? clientIds, string? ownerIds, string? productIds, string? currencies, PaymentsDashboard dash, HubAccess access, HubDbContext db, CancellationToken ct) =>
        {
            access.RequireAccess();
            var f = PaymentsDashboard.Filters.Parse(years, clientIds, ownerIds, productIds, currencies);
            var (bytes, name, rows) = await dash.ExportAsync(f, access.Me, ct);
            // Exports are audited with the filters used, never the data itself (as the other exports).
            await db.AuditActionAsync("Export", "PaymentsDashboard", null, "Payments dashboard", f.ClientIds.Count == 1 ? f.ClientIds[0] : null, null,
                new { years = years ?? "", clients = f.ClientIds, owners = f.OwnerIds, products = f.ProductIds, f.Currencies, rows }, ct);
            return Results.File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", name);
        });

        g.MapGet("/clients", async (long? clientId, string? country, long? productId, long? ownerId, ClientInsight insight, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            var now = DateTimeOffset.UtcNow;
            return Results.Ok(new { evaluatedAt = now, items = await insight.PortfolioAsync(clientId, country, productId, ownerId, now, ct) });
        });

        g.MapGet("/clients/{id:long}", async (long id, string? years, ClientInsight insight, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            return Results.Ok(await insight.ClientAsync(id, access.Me, ct, years));
        });

        // ---- client status reports: recorded by a person, kept as history ----
        var cg = api.MapGroup("/clients").WithTags("Clients");
        cg.MapGet("/{id:long}/status-reports", async (long id, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireAccess();
            if (!await db.Clients.AnyAsync(c => c.Id == id, ct)) throw new NotFoundException("The client");
            return Results.Ok(await db.ClientStatusReports.AsNoTracking().Where(r => r.ClientId == id).OrderByDescending(r => r.RecordedAt).ThenByDescending(r => r.Id)
                .Select(r => new { r.Id, status = r.Status.ToString(), r.Summary, r.NextReviewOn, r.RecordedAt, recordedBy = r.RecordedBy == null ? null : r.RecordedBy.DisplayName }).ToListAsync(ct));
        });

        cg.MapPost("/{id:long}/status-reports", async (long id, StatusReportInput input, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            // Who may record: ClientStructure:Maintain in the client's scope (A109, owner decision 10 Nov 2026).
            access.RequireMaintain(RightKeys.Structure, c.Id, null, c.OwnerUserId, c.CoordinatorUserId);
            var now = clock.GetUtcNow();
            var today = DateOnly.FromDateTime(now.UtcDateTime);
            var check = new Check();
            check.When(input.Status is null, "status", "Select the client status.")
                 .Text("summary", input.Summary, 1000, "the reason for this status", required: true)
                 .When(c.Status == ClientStatus.Archived, "status", "An archived client takes no new status.")
                 .When(input.NextReviewOn is { } d && d < today.AddDays(-1), "nextReviewOn", "The next review date cannot be in the past.")
                 .When(input.NextReviewOn is { } far && far > today.AddDays(366), "nextReviewOn", "Choose a next review date within a year.");
            check.ThrowIfAny();
            var report = new ClientStatusReport
            {
                ClientId = id, Status = input.Status!.Value, Summary = input.Summary!.Trim(), NextReviewOn = input.NextReviewOn, RecordedAt = now, RecordedById = access.Me.UserId
            };
            db.ClientStatusReports.Add(report);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/clients/{id}/status-reports/{report.Id}", new { report.Id });
        });
    }
}
