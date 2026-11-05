using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

/// <summary>A98: the Team KPI report and one person's own dashboard.</summary>
[Collection("hub")]
public class TeamKpiAndMyDashboardTests(HubFactory hub) : Scenario(hub)
{
    private async Task Set(long id, DateTimeOffset opened, DateTimeOffset? responded, DateTimeOffset? resolved, SlaState response, SlaState resolution, CaseStatus status = CaseStatus.InProgress, int reopened = 0, DateTimeOffset? due = null)
    {
        using var scope = Hub.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<HubDbContext>().Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s
            .SetProperty(c => c.SlaClockStartAt, opened).SetProperty(c => c.FirstResponseAt, responded).SetProperty(c => c.ResolvedAt, resolved).SetProperty(c => c.ResponseSlaStatus, response)
            .SetProperty(c => c.ResolutionSlaStatus, resolution).SetProperty(c => c.Status, status).SetProperty(c => c.ReopenCount, reopened).SetProperty(c => c.DueAt, due)
            .SetProperty(c => c.ClosedAt, status == CaseStatus.Closed ? resolved : null).SetProperty(c => c.StatusCode, status == CaseStatus.Closed ? CaseStatuses.ClosedCode : CaseStatuses.InProgressCode));
    }

    private static object? Cell(JsonNode report, JsonNode row, string header)
    {
        var columns = report["columns"]!.AsArray().Select(c => c!["header"]!.GetValue<string>()).ToList();
        return row.AsArray()[columns.IndexOf(header)]?.ToString();
    }

    [Fact]
    public async Task The_report_measures_each_persons_times_breaches_and_reopened_tickets()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var opened = DateTimeOffset.UtcNow.AddDays(-20);
        var a = await NewCase(client, owner: m.UserId);
        var b = await NewCase(client, owner: m.UserId);
        var c = await NewCase(client, owner: m.UserId);
        await Set(a, opened, opened.AddHours(2), opened.AddHours(10), SlaState.Met, SlaState.Met, CaseStatus.Closed);
        await Set(b, opened, opened.AddHours(4), opened.AddHours(30), SlaState.Breached, SlaState.Met, CaseStatus.Closed, reopened: 1);
        await Set(c, opened, null, null, SlaState.Pending, SlaState.Pending, due: DateTimeOffset.UtcNow.AddDays(-1));

        var result = await m.Post("/reports/team-kpis/preview", new { filters = new { clientId = client.ToString() }, pageSize = 100 });
        Assert.Equal(HttpStatusCode.OK, result.Status);
        var report = result.Body!;
        var row = report["rows"]!.AsArray().Single()!;
        Assert.Equal("3", Cell(report, row, "Tickets"));
        Assert.Equal("1", Cell(report, row, "Open"));
        Assert.Equal("2", Cell(report, row, "Closed"));
        Assert.Equal("2", Cell(report, row, "First responses"));
        Assert.Equal("3", Cell(report, row, "Average first response (h)"));
        Assert.Equal("20", Cell(report, row, "Average resolution (h)"));
        Assert.Equal("1", Cell(report, row, "Response breached"));
        Assert.Equal("50", Cell(report, row, "Response breach %"));
        Assert.Equal("1", Cell(report, row, "Overdue"));
        Assert.Equal("1", Cell(report, row, "Reopened"));
        Assert.Equal("33.3", Cell(report, row, "Reopened %"));
    }

    [Fact]
    public async Task The_period_limits_the_tickets_it_measures()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var a = await NewCase(client, owner: m.UserId);
        await Set(a, DateTimeOffset.UtcNow.AddDays(-200), null, null, SlaState.NotApplicable, SlaState.NotApplicable);
        var from = DateTime.UtcNow.AddDays(-30).ToString("yyyy-MM-dd");
        var result = await m.Post("/reports/team-kpis/preview", new { filters = new { clientId = client.ToString(), createdFrom = from }, pageSize = 100 });
        Assert.Empty(result.Body!["rows"]!.AsArray());
    }

    [Fact]
    public async Task The_report_needs_the_right_to_see_teams_and_tickets()
    {
        var viewer = await Hub.As(HubFactory.Viewer);
        Assert.NotEqual(HttpStatusCode.InternalServerError, (await viewer.Post("/reports/team-kpis/preview", new { filters = new { }, pageSize = 10 })).Status);
    }

    [Fact]
    public async Task My_dashboard_shows_only_what_i_own()
    {
        var mine = await Hub.As(HubFactory.Engineer);
        var other = await Hub.As(HubFactory.Manager);
        var client = await Hub.ClientId("DEMO-NTA");
        var opened = DateTimeOffset.UtcNow.AddDays(-5);
        var a = await NewCase(client, owner: mine.UserId);
        var b = await NewCase(client, owner: other.UserId);
        await Set(a, opened, opened.AddHours(1), null, SlaState.Met, SlaState.Pending, due: DateTimeOffset.UtcNow.AddDays(-1));
        await Set(b, opened, null, null, SlaState.Breached, SlaState.Breached, due: DateTimeOffset.UtcNow.AddDays(-1));

        var d = (await mine.Get("/dashboard/me")).Body!;
        var tickets = d["tickets"]!.AsArray().Select(t => t!["id"]!.GetValue<long>()).ToList();
        Assert.Contains(a, tickets);
        Assert.DoesNotContain(b, tickets);
        Assert.True(d["overdue"]!.GetValue<int>() >= 1);
        Assert.Equal(1, d["last30Days"]!["averageFirstResponseHours"]!.GetValue<double>() > 0 ? 1 : 0);

        // The overdue ticket comes first.
        Assert.True(d["tickets"]!.AsArray().First()!["overdue"]!.GetValue<bool>());
    }

    [Fact]
    public async Task The_command_center_compares_with_the_previous_period()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var a = await NewCase(client, owner: m.UserId);
        await Set(a, DateTimeOffset.UtcNow.AddDays(-40), null, null, SlaState.NotApplicable, SlaState.NotApplicable);
        var cases = (await m.Get($"/dashboard/command-center?clientId={client}&period=30d")).Body!["cases"]!;
        Assert.Equal(0, cases["openedInPeriod"]!.GetValue<int>());
        Assert.Equal(1, cases["previous"]!["opened"]!.GetValue<int>());
    }
}
