using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

/// <summary>
/// A91: opened and hub-created are different dates. A case with a Jira creation time is seeded directly here, so the rules are tested
/// without Jira; JiraIntegrationTests covers the same dates through a synchronization.
/// </summary>
[Collection("hub")]
public class CaseDatesAndStatusTests(HubFactory hub) : Scenario(hub)
{
    private async Task WithDb(Func<HubDbContext, Task> work)
    {
        using var scope = Hub.Services.CreateScope();
        await work(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    /// <summary>A case as an import leaves it: created in the hub now, opened in Jira earlier.</summary>
    private async Task<long> ImportedCaseAsync(long client, DateTimeOffset jiraCreated, Api m)
    {
        var id = await NewCase(client, owner: m.UserId);
        await WithDb(db => db.Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.SlaClockStartAt, jiraCreated)));
        return id;
    }

    private static DateTimeOffset At(JsonNode? node) => node!.GetValue<DateTimeOffset>();

    private static async Task<List<string>> RefsAsync(Api m, string query) =>
        (await m.Get($"/cases?{query}&pageSize=200")).Body!["items"]!.AsArray().Select(x => x!["ref"]!.GetValue<string>()).ToList();

    [Fact]
    public async Task The_detail_shows_the_opening_and_clock_start_that_deadlines_use()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var jira = DateTimeOffset.UtcNow.AddDays(-200);
        var id = await ImportedCaseAsync(client, jira, m);
        var c = (await m.Get($"/cases/{id}")).Body!;
        Assert.Equal(jira, At(c["openedAt"]));
        Assert.True(c["openedFromJira"]!.GetValue<bool>());
        Assert.Equal(jira, At(c["sla"]!["startAt"]));
        Assert.True(c["sla"]!["startsAtJiraCreation"]!.GetValue<bool>());
        Assert.True(At(c["createdAt"]) > DateTimeOffset.UtcNow.AddHours(-1)); // the hub's import time stays available
        Assert.InRange(c["ageDays"]!.GetValue<double>(), 199.5, 200.5);
    }

    [Fact]
    public async Task A_case_made_in_the_hub_opens_when_it_was_created()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await NewCase(await NewClient(), owner: m.UserId);
        var c = (await m.Get($"/cases/{id}")).Body!;
        Assert.Equal(At(c["createdAt"]), At(c["openedAt"]));
        Assert.False(c["openedFromJira"]!.GetValue<bool>());
        Assert.Equal(At(c["createdAt"]), At(c["sla"]!["startAt"]));
        Assert.InRange(c["ageDays"]!.GetValue<double>(), 0, 0.1);
    }

    [Fact]
    public void Deadlines_elapsed_time_and_breaches_count_from_the_opening_not_from_the_import()
    {
        var now = new DateTimeOffset(2026, 11, 4, 12, 0, 0, TimeSpan.Zero);
        var jira = new DateTimeOffset(2026, 1, 18, 8, 0, 0, TimeSpan.Zero);
        var c = new Case { Scope = WorkScope.Client, ClientId = 1, ContractId = 1, Status = CaseStatus.InProgress, CreatedAt = now.AddHours(-2), SlaClockStartAt = jira, SlaContractRef = "CT-1",
            SlaResolutionMinutes = 480, SlaResponseMinutes = 60, SlaBasis = SlaBasis.CalendarHours, SlaContractStart = new DateOnly(2026, 1, 1) };
        CaseSla.Evaluate(c, [], now, null);
        Assert.Equal(jira.AddHours(8), c.ResolutionDueAt);
        Assert.Equal(jira.AddHours(1), c.ResponseDueAt);
        Assert.Equal(SlaState.Breached, c.ResolutionSlaStatus);
        Assert.Equal((int)(now - jira).TotalMinutes, c.ResolutionElapsedMinutes);
        Assert.Equal(jira.AddHours(8), c.DueAt); // A78: the case's due date is the resolution deadline
    }

    [Fact]
    public void Work_opened_before_the_contract_is_not_measured_and_loses_its_old_due_date()
    {
        var now = new DateTimeOffset(2026, 11, 4, 12, 0, 0, TimeSpan.Zero);
        var jira = new DateTimeOffset(2026, 1, 18, 8, 0, 0, TimeSpan.Zero);
        var c = new Case { Scope = WorkScope.Client, ClientId = 1, ContractId = 1, Status = CaseStatus.InProgress, CreatedAt = now.AddHours(-2), SlaClockStartAt = jira, SlaContractRef = "CT-1",
            SlaResolutionMinutes = 480, SlaResponseMinutes = 60, SlaBasis = SlaBasis.CalendarHours };
        CaseSla.Evaluate(c, [], now, null); // measured, as before the contract start date was recorded
        Assert.Equal(jira.AddHours(8), c.DueAt);

        c.SlaContractStart = new DateOnly(2026, 3, 1);
        CaseSla.Evaluate(c, [], now, null);
        Assert.Equal(SlaState.NotApplicable, c.ResolutionSlaStatus);
        Assert.Equal(SlaState.NotApplicable, c.ResponseSlaStatus);
        Assert.Null(c.ResolutionDueAt);
        Assert.Null(c.DueAt); // otherwise it would stay overdue on the dashboard
        Assert.Contains("before CT-1 started on 2026-03-01", c.SlaNote);
    }

    [Fact]
    public void A_due_date_people_agreed_is_kept_on_a_case_that_is_not_measured()
    {
        var now = new DateTimeOffset(2026, 11, 4, 12, 0, 0, TimeSpan.Zero);
        var agreed = now.AddDays(3);
        var c = new Case { Scope = WorkScope.Client, ClientId = 1, Status = CaseStatus.InProgress, CreatedAt = now, SlaClockStartAt = now.AddDays(-1), DueAt = agreed };
        CaseSla.Evaluate(c, [], now, null);
        Assert.Equal(agreed, c.DueAt);
    }

    [Theory]
    [InlineData("2026-02-28T22:00:00Z", "Asia/Riyadh", false)] // 1 March, 01:00 in the contract's time zone: inside the contract
    [InlineData("2026-02-28T20:00:00Z", "Asia/Riyadh", true)]  // 28 February, 23:00 there
    [InlineData("2026-02-28T22:00:00Z", null, true)]           // no time zone recorded: UTC
    public void The_contract_start_date_is_read_in_the_contract_time_zone(string opened, string? zone, bool before)
    {
        var at = DateTimeOffset.Parse(opened);
        var c = new Case { Scope = WorkScope.Client, ClientId = 1, ContractId = 1, Status = CaseStatus.InProgress, CreatedAt = at, SlaClockStartAt = at, SlaContractRef = "CT-1",
            SlaResolutionMinutes = 480, SlaBasis = SlaBasis.CalendarHours, SlaTimeZone = zone, SlaContractStart = new DateOnly(2026, 3, 1) };
        CaseSla.Evaluate(c, [], at.AddHours(1), null);
        Assert.Equal(before, c.ResolutionSlaStatus == SlaState.NotApplicable);
    }

    [Fact]
    public async Task Closed_and_reopened_cases_age_from_opening_to_closing_and_then_run_on()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var opened = DateTimeOffset.UtcNow.AddDays(-40);
        var closed = DateTimeOffset.UtcNow.AddDays(-30);
        var id = await ImportedCaseAsync(client, opened, m);
        await WithDb(db => db.Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CaseStatus.Closed).SetProperty(c => c.StatusCode, CaseStatuses.ClosedCode).SetProperty(c => c.ClosedAt, closed)));
        Assert.Equal(10, (await m.Get($"/cases/{id}")).Body!["ageDays"]!.GetValue<double>());

        var reopenedCycle = DateTimeOffset.UtcNow.AddDays(-2);
        await WithDb(db => db.Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CaseStatus.Triaged).SetProperty(c => c.StatusCode, CaseStatuses.ReopenedCode).SetProperty(c => c.ClosedAt, (DateTimeOffset?)null)
            .SetProperty(c => c.ReopenCount, 1).SetProperty(c => c.CycleStartedAt, reopenedCycle)));
        var reopened = (await m.Get($"/cases/{id}")).Body!;
        Assert.InRange(reopened["ageDays"]!.GetValue<double>(), 39.5, 40.5);
        Assert.InRange(reopened["currentCycleAgeDays"]!.GetValue<double>(), 1.5, 2.5);
    }

    [Fact]
    public async Task Age_is_never_negative_when_jira_closed_the_issue_before_the_import()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await NewCase(await NewClient(), owner: m.UserId);
        await WithDb(db => db.Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CaseStatus.Closed).SetProperty(c => c.StatusCode, CaseStatuses.ClosedCode).SetProperty(c => c.ClosedAt, DateTimeOffset.UtcNow.AddDays(-3))));
        Assert.Equal(0, (await m.Get($"/cases/{id}")).Body!["ageDays"]!.GetValue<double>());
    }

    [Fact]
    public async Task List_dashboard_and_report_builder_place_an_imported_case_by_its_opening()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var opened = DateTimeOffset.UtcNow.AddDays(-60);
        var id = await ImportedCaseAsync(client, opened, m);
        var reference = (await m.Get($"/cases/{id}")).Body!["ref"]!.GetValue<string>();
        string Window(DateTimeOffset from, DateTimeOffset to) => $"clientId={client}&status=all&createdFrom={Uri.EscapeDataString(from.ToString("O"))}&createdTo={Uri.EscapeDataString(to.ToString("O"))}";

        // List: found in the Jira period, not in the period of the import.
        Assert.Contains(reference, await RefsAsync(m, Window(opened.AddDays(-1), opened.AddDays(1))));
        Assert.DoesNotContain(reference, await RefsAsync(m, Window(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1))));
        var row = (await m.Get($"/cases?clientId={client}&status=all")).Body!["items"]!.AsArray().First(x => x!["id"]!.GetValue<long>() == id)!;
        Assert.Equal(opened, At(row["openedAt"]));

        // Dashboard age: in the over-30-days bucket, whose link holds the same case; the open-cases age agrees.
        var insights = (await m.Get($"/dashboard/insights?clientId={client}")).Body!;
        var over30 = insights["cases"]!["age"]!.AsArray().First(b => b!["key"]!.GetValue<string>() == "31+")!;
        Assert.Equal(1, over30["value"]!.GetValue<int>());
        var drill = over30["link"]!.GetValue<string>();
        Assert.Contains(reference, await RefsAsync(m, drill[(drill.IndexOf('?') + 1)..]));
        var measures = (await m.Get($"/dashboard?clientId={client}")).Body!;
        Assert.InRange(measures["caseAge"]!["oldestDays"]!.GetValue<double>(), 59.5, 60.5);

        // Command center: the import is not newly opened work this week.
        var center = (await m.Get($"/dashboard/command-center?clientId={client}&period=7d")).Body!;
        Assert.Equal(0, center["cases"]!["openedInPeriod"]!.GetValue<int>());

        // Report builder: "createdAt" is labelled and valued as the opening; the hub's own date has its own field.
        Assert.Equal(1, await InRangeAsync(m, client, "createdAt", opened));
        Assert.Equal(0, await InRangeAsync(m, client, "createdAt", DateTimeOffset.UtcNow));
        Assert.Equal(0, await InRangeAsync(m, client, "hubCreatedAt", opened));
        Assert.Equal(1, await InRangeAsync(m, client, "hubCreatedAt", DateTimeOffset.UtcNow));
        var age = await PreviewAsync(m, new { clientIds = new[] { client } }, ["caseId", "ageDays"]);
        Assert.InRange(age.Body!["rows"]!.AsArray().Single()!["cells"]![1]!.GetValue<int>(), 59, 61);
    }

    [Fact]
    public async Task A_closed_import_counts_as_opened_and_closed_in_its_own_periods_in_the_builder()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var opened = DateTimeOffset.UtcNow.AddDays(-50);
        var closed = DateTimeOffset.UtcNow.AddDays(-45);
        var id = await ImportedCaseAsync(client, opened, m);
        await WithDb(db => db.Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CaseStatus.Closed).SetProperty(c => c.StatusCode, CaseStatuses.ClosedCode).SetProperty(c => c.ClosedAt, closed)));
        var preview = await PreviewAsync(m, new { clientIds = new[] { client } }, ["caseId", "ageDays"]);
        Assert.Equal(5, preview.Body!["rows"]!.AsArray().Single()!["cells"]![1]!.GetValue<int>());
        Assert.Equal(1, await InRangeAsync(m, client, "closedAt", closed));
        Assert.Equal(1, await InRangeAsync(m, client, "createdAt", opened));
    }

    [Fact]
    public async Task Dashboard_and_report_builder_count_the_same_statuses_with_matching_drilldowns()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var plain = await NewCase(client, owner: m.UserId);
        var customer = await NewCase(client, owner: m.UserId);
        var vendor = await NewCase(client, owner: m.UserId);
        await m.Ok($"/cases/{customer}/waiting", new { reason = "Customer", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{customer}"));
        await m.Ok($"/cases/{vendor}/waiting", new { reason = "Vendor", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{vendor}"));

        var bars = (await m.Get($"/dashboard/insights?clientId={client}")).Body!["cases"]!["byStatus"]!.AsArray();
        int Bar(string code) => bars.First(b => b!["key"]!.GetValue<string>() == code)!["value"]!.GetValue<int>();
        Assert.Equal(2, Bar(CaseStatuses.NewCode));     // no waiting, and waiting on the vendor, which keeps the status
        Assert.Equal(1, Bar(CaseStatuses.WaitingCode)); // waiting on the customer is its own status, on the same stage
        Assert.Equal("Waiting for customer", bars.First(b => b!["key"]!.GetValue<string>() == CaseStatuses.WaitingCode)!["label"]!.GetValue<string>());

        // Every bar equals the list it opens.
        foreach (var bar in bars)
        {
            var link = bar!["link"]!.GetValue<string>();
            var list = await m.Get($"/cases?{link[(link.IndexOf('?') + 1)..]}&pageSize=200");
            Assert.Equal(bar["value"]!.GetValue<int>(), list.Body!["totalCount"]!.GetValue<int>());
        }
        Assert.Equal([await RefAsync(m, customer)], await RefsAsync(m, $"clientId={client}&status=code:{CaseStatuses.WaitingCode}"));

        // The report builder groups by the same codes.
        var preview = await PreviewAsync(m, new { clientIds = new[] { client }, statuses = new[] { CaseStatuses.AllOpen } }, ["caseId", "status"]);
        var byStatus = preview.Body!["summary"]!["byStatus"]!;
        Assert.Equal(2, byStatus[CaseStatuses.NewCode]!.GetValue<int>());
        Assert.Equal(1, byStatus[CaseStatuses.WaitingCode]!.GetValue<int>());

        // "Waiting cases" is a separate measure: every waiting reason, whichever status it shows.
        var measures = (await m.Get($"/dashboard?clientId={client}")).Body!["cases"]!.AsArray();
        Assert.Equal(2, measures.First(x => x!["key"]!.GetValue<string>() == "waitingCases")!["value"]!.GetValue<int>());
        Assert.Equal(2, (await RefsAsync(m, $"clientId={client}&waiting=true")).Count);
        Assert.DoesNotContain(await RefAsync(m, plain), await RefsAsync(m, $"clientId={client}&waiting=true"));
    }

    [Fact]
    public async Task An_added_status_and_a_retired_status_in_use_keep_their_own_bars()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var name = U("With vendor");
        var added = await m.Create("/admin/lookups", new { listName = CaseStatuses.List, label = name, category = nameof(CaseStatusBehavior.Initial), isRetired = false });
        var code = (await m.Get("/admin/lookups")).Body!.AsArray().First(l => l!["id"]!.GetValue<long>() == added)!["code"]!.GetValue<string>();
        var id = await NewCase(client, owner: m.UserId);
        await WithDb(db => db.Cases.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.StatusCode, code)));

        var bars = (await m.Get($"/dashboard/insights?clientId={client}")).Body!["cases"]!["byStatus"]!.AsArray();
        var bar = bars.First(b => b!["key"]!.GetValue<string>() == code)!;
        Assert.Equal(name, bar["label"]!.GetValue<string>());
        Assert.Equal(1, bar["value"]!.GetValue<int>());
        Assert.Contains(Uri.EscapeDataString(code), bar["link"]!.GetValue<string>());
        Assert.DoesNotContain(bars, b => b!["key"]!.GetValue<string>() == CaseStatuses.ClosedCode); // closed is not an open status
    }

    private static Task<Res> PreviewAsync(Api m, object filters, string[] columns) =>
        m.Post("/reporting/reports/cases/preview", new { definition = new { schemaVersion = 1, filters, columns, sort = new[] { new { field = "caseId", direction = "asc" } } } });

    /// <summary>How many of the client's cases the report builder finds with the date field near a time.</summary>
    private static async Task<int> InRangeAsync(Api m, long client, string dateField, DateTimeOffset near)
    {
        var r = await PreviewAsync(m, new { clientIds = new[] { client }, dateField, dateRange = new { fromDay = near.AddDays(-1).ToString("yyyy-MM-dd"), toDay = near.AddDays(1).ToString("yyyy-MM-dd") } }, ["caseId"]);
        return r.Body!["total"]!.GetValue<int>();
    }

    private static async Task<string> RefAsync(Api m, long id) => (await m.Get($"/cases/{id}")).Body!["ref"]!.GetValue<string>();
}
