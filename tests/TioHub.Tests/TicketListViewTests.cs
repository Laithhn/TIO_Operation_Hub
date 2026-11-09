using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Tests;

/// <summary>A102: the ticket list's priority group, wider search and quick views. A count must equal the list it opens (AC-11).</summary>
[Collection("hub")]
public class TicketListViewTests(HubFactory hub) : Scenario(hub)
{
    private static List<long> Ids(Res r) => r.Body!["items"]!.AsArray().Select(x => x!["id"]!.GetValue<long>()).ToList();

    private async Task<long> Ticket(long client, Priority priority, string title)
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await NewCase(client, owner: m.UserId);
        using var scope = Hub.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<HubDbContext>().Cases.IgnoreQueryFilters().Where(c => c.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.Priority, priority).SetProperty(c => c.Title, title));
        return id;
    }

    [Fact]
    public async Task Critical_or_high_opens_both_priorities_and_matches_the_dashboard_count()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var critical = await Ticket(client, Priority.Critical, "Critical one");
        var high = await Ticket(client, Priority.High, "High one");
        var normal = await Ticket(client, Priority.Normal, "Normal one");

        var both = Ids(await m.Get($"/cases?clientId={client}&priority=Critical,High&pageSize=200"));
        Assert.Contains(critical, both);
        Assert.Contains(high, both);
        Assert.DoesNotContain(normal, both);
        Assert.Equal(new[] { critical }, Ids(await m.Get($"/cases?clientId={client}&priority=Critical&pageSize=200")));

        var dashboard = (await m.Get($"/dashboard/command-center?clientId={client}")).Body!["cases"]!["criticalHigh"]!.GetValue<int>();
        Assert.Equal(dashboard, both.Count);
    }

    [Fact]
    public async Task A_name_that_is_not_a_priority_is_refused()
    {
        var m = await Hub.As(HubFactory.Manager);
        Assert.Equal((HttpStatusCode)422, (await m.Get("/cases?priority=Critical,Urgent")).Status);
    }

    [Fact]
    public async Task The_export_uses_the_same_priorities_as_the_list()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        await Ticket(client, Priority.Critical, "Export critical");
        await Ticket(client, Priority.High, "Export high");
        await Ticket(client, Priority.Normal, "Export normal");
        var csv = await (await m.Http.GetAsync($"/api/v1/export/cases?clientId={client}&priority=Critical,High")).Content.ReadAsStringAsync();
        Assert.Contains("Export critical", csv);
        Assert.Contains("Export high", csv);
        Assert.DoesNotContain("Export normal", csv);
    }

    [Fact]
    public async Task One_search_finds_a_ticket_on_any_page_by_its_client()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var code = (await m.Get($"/clients/{client}")).Body!["code"]!.GetValue<string>();
        var id = await Ticket(client, Priority.Normal, "Nothing about the client here");
        var found = await m.Get($"/cases?q={Uri.EscapeDataString(code)}&pageSize=1&page=1");
        Assert.True(found.Total >= 1);
        Assert.Contains(id, Ids(await m.Get($"/cases?q={Uri.EscapeDataString(code)}&pageSize=200")));
    }

    [Fact]
    public async Task Each_quick_view_count_equals_the_list_it_opens()
    {
        var m = await Hub.As(HubFactory.Manager);
        await NewCase(await NewClient(), owner: m.UserId);
        var counts = (await m.Get("/cases/quick-views")).Body!;
        async Task<int> Total(string query) => (await m.Get($"/cases?{query}&pageSize=1")).Total;
        Assert.Equal(await Total("status=open"), counts["open"]!.GetValue<int>());
        Assert.Equal(await Total($"ownerId={m.UserId}"), counts["mine"]!.GetValue<int>());
        Assert.Equal(await Total("due=overdue"), counts["overdue"]!.GetValue<int>());
        Assert.Equal(await Total("unassigned=true"), counts["unassigned"]!.GetValue<int>());
        Assert.Equal(await Total("waitingFor=Customer"), counts["waitingForCustomer"]!.GetValue<int>());
    }

    [Fact]
    public async Task Waiting_for_customer_leaves_out_other_waiting_reasons()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var customer = await NewCase(client, owner: m.UserId);
        var vendor = await NewCase(client, owner: m.UserId);
        async Task Wait(long id, string reason) =>
            Assert.True((await m.Post($"/cases/{id}/waiting", new { reason, nextReviewAt = DateTimeOffset.UtcNow.AddDays(2) }, await m.Version($"/cases/{id}"))).Status is HttpStatusCode.OK or HttpStatusCode.NoContent);
        await Wait(customer, "Customer");
        await Wait(vendor, "Vendor");
        var list = Ids(await m.Get($"/cases?clientId={client}&waitingFor=Customer&pageSize=200"));
        Assert.Contains(customer, list);
        Assert.DoesNotContain(vendor, list);
    }

    [Fact]
    public async Task Quick_views_need_the_ticket_view_right_and_count_only_authorized_tickets()
    {
        var viewer = await Hub.As(HubFactory.Engineer);
        var res = await viewer.Get("/cases/quick-views");
        Assert.Equal(HttpStatusCode.OK, res.Status);
        Assert.Equal((await viewer.Get("/cases?pageSize=1")).Total, res.Body!["open"]!.GetValue<int>());
    }

    [Fact]
    public async Task One_priority_still_works_as_before()
    {
        var m = await Hub.As(HubFactory.Manager);
        Assert.Equal(HttpStatusCode.OK, (await m.Get("/cases?priority=low")).Status);
    }
}
