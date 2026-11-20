using System.Net;
using System.Text.Json.Nodes;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A124 (owner request, 19 Nov 2026): contract payment terms follow the payment milestone template; one milestone is updated without editing the contract.</summary>
[Collection("hub")]
public class AC124_PaymentMilestoneTemplate(HubFactory hub) : Scenario(hub)
{
    private async Task<(Api M, long Client, long Project)> Setup()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional AI agent", status = "Active", ownerUserId = m.UserId });
        return (m, c, project);
    }

    private static object Milestone(string condition, decimal pct, decimal amount, string due, string status = "Pending", string? paidOn = null, string? invoiceDate = null,
        string? invoiceNumber = null, string? workStatus = null, string? clientApproval = null, decimal? amountReceived = null, string? notes = null) =>
        new { condition, percentage = (decimal?)pct, amount = (decimal?)amount, dueDate = due, status, paidOn, invoiceDate, invoiceNumber, workStatus, clientApproval, amountReceived, notes };

    private static object ContractBody(long projectId, long ownerId, object payments) => new
    {
        projectId, title = "Fictional AI agent PM", contractReference = "FIC-A124-" + Guid.NewGuid().ToString("N")[..6], type = "Implementation", status = "Active", ownerUserId = ownerId,
        startDate = "2025-07-01", endDate = "2026-12-31", renewalTerms = "FixedTerm", supportModel = "Remote", currency = "AED", payments
    };

    private static object[] ThreeMilestones() =>
    [
        Milestone("Requirements & analysis", 30, 90000, "2025-07-01", "Paid", "2026-02-25", "2026-02-19", "INV-FIC-1", "Done", "Approved", 90000),
        Milestone("System & architecture design", 30, 90000, "2025-10-01", "Invoiced", null, "2026-04-14", "INV-FIC-2", "Done", "Approved", 40000),
        Milestone("Project management and reporting", 25, 75000, "2026-01-01")
    ];

    private static JsonNode Row(JsonNode contract, int n) => contract["payments"]![n]!;

    [Fact]
    public async Task The_contract_records_every_template_column_and_derives_what_is_outstanding()
    {
        var (m, _, project) = await Setup();
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, ThreeMilestones()));
        var d = (await m.Get($"/contracts/{k}")).Body!;

        var first = Row(d, 0);
        Assert.Equal("2026-02-19", first["invoiceDate"]!.GetValue<string>());
        Assert.Equal("INV-FIC-1", first["invoiceNumber"]!.GetValue<string>());
        Assert.Equal("Done", first["workStatus"]!.GetValue<string>());
        Assert.Equal("Done", first["workState"]!.GetValue<string>());
        Assert.Equal("Approved", first["clientApproval"]!.GetValue<string>());
        Assert.Equal("Approved", first["approvalState"]!.GetValue<string>());
        Assert.Equal(90000m, first["received"]!.GetValue<decimal>());
        Assert.Equal(0m, first["outstanding"]!.GetValue<decimal>());

        // Part received: the rest is outstanding. Nothing recorded yet: the whole amount is.
        Assert.Equal(50000m, Row(d, 1)["outstanding"]!.GetValue<decimal>());
        Assert.Null(Row(d, 2)["workStatus"]);
        Assert.Equal(75000m, Row(d, 2)["outstanding"]!.GetValue<decimal>());

        // The configured lists are validated like contract types.
        var bad = await m.Post("/contracts", ContractBody(project, m.UserId, new[] { Milestone("Bad", 10, 1000, "2026-01-01", workStatus: "NoSuchStatus") }));
        Assert.NotNull(bad.Error("payments[0]"));
        bad = await m.Post("/contracts", ContractBody(project, m.UserId, new[] { Milestone("Bad", 10, 1000, "2026-01-01", amountReceived: -1) }));
        Assert.NotNull(bad.Error("payments[0]"));
    }

    [Fact]
    public async Task A_paid_row_recorded_before_the_template_counts_as_fully_received()
    {
        var (m, _, project) = await Setup();
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, new[] { Milestone("Signature", 100, 10000, "2026-01-01", "Paid", "2026-01-05") }));
        var p = Row((await m.Get($"/contracts/{k}")).Body!, 0);
        Assert.Null(p["amountReceived"]);
        Assert.Equal(10000m, p["received"]!.GetValue<decimal>());
        Assert.Equal(0m, p["outstanding"]!.GetValue<decimal>());
    }

    [Fact]
    public async Task One_milestone_is_updated_without_editing_the_contract()
    {
        var (m, _, project) = await Setup();
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, ThreeMilestones()));
        var before = await m.Version($"/contracts/{k}");
        var d = (await m.Get($"/contracts/{k}")).Body!;
        var id = Row(d, 2)["id"]!.GetValue<long>();
        var path = $"/contracts/{k}/payments/{id}";
        object Body(string status = "Invoiced", string? paidOn = null, decimal pct = 25, decimal? received = null, string? invoiceDate = "2026-04-14", string? work = "Done") => new
        {
            id, condition = "Project management, KPIs and reporting", percentage = (decimal?)pct, amount = (decimal?)75000m, dueDate = "2026-01-01", status, paidOn,
            invoiceDate, invoiceNumber = "INV-FIC-3", workStatus = work, clientApproval = "Approved", amountReceived = received, notes = "Part of the April batch"
        };

        var ok = await m.Put(path, Body("Paid", "2026-04-20", received: 75000m));
        Assert.Equal(HttpStatusCode.OK, ok.Status);
        var after = (await m.Get($"/contracts/{k}")).Body!;
        var row = Row(after, 2);
        Assert.Equal("Project management, KPIs and reporting", row["condition"]!.GetValue<string>());
        Assert.Equal("INV-FIC-3", row["invoiceNumber"]!.GetValue<string>());
        Assert.Equal("Paid", row["status"]!.GetValue<string>());
        Assert.Equal(0m, row["outstanding"]!.GetValue<decimal>());
        Assert.Equal("Part of the April batch", row["notes"]!.GetValue<string>());
        // The other milestones and the contract itself are unchanged; its version moves so an older contract form cannot save over it.
        Assert.Equal("INV-FIC-2", Row(after, 1)["invoiceNumber"]!.GetValue<string>());
        Assert.Equal(40000m, Row(after, 1)["amountReceived"]!.GetValue<decimal>());
        Assert.Equal(d["title"]!.GetValue<string>(), after["title"]!.GetValue<string>());
        Assert.NotEqual(before, await m.Version($"/contracts/{k}"));

        // Checks: paid needs a date, lists come from the configuration, percentages stay within 100 %, no future invoice date, amounts not negative.
        Assert.NotNull((await m.Put(path, Body("Paid"))).Error("payment"));
        Assert.NotNull((await m.Put(path, Body(work: "NoSuchStatus"))).Error("payment"));
        Assert.NotNull((await m.Put(path, Body(pct: 50))).Error("percentage"));
        Assert.NotNull((await m.Put(path, Body(invoiceDate: DateTime.UtcNow.AddDays(10).ToString("yyyy-MM-dd")))).Error("invoiceDate"));
        Assert.NotNull((await m.Put(path, Body(received: -5))).Error("payment"));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Put($"/contracts/{k}/payments/999999999", Body())).Status);
    }

    [Fact]
    public async Task Updating_a_milestone_needs_Contracts_Maintain()
    {
        var (m, _, project) = await Setup();
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, ThreeMilestones()));
        var id = Row((await m.Get($"/contracts/{k}")).Body!, 2)["id"]!.GetValue<long>();
        var body = new { id, condition = "Project management", percentage = (decimal?)25, amount = (decimal?)75000m, dueDate = "2026-01-01", status = "Invoiced", invoiceNumber = "INV-FIC-9" };

        var viewer = await PersonWith("Contracts:View", "Contracts:DetailsView", "Projects:View");
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Put($"/contracts/{k}/payments/{id}", body)).Status);
        var maintainer = await PersonWith("Contracts:View", "Contracts:DetailsView", "Contracts:Maintain", "Projects:View");
        Assert.Equal(HttpStatusCode.OK, (await maintainer.Put($"/contracts/{k}/payments/{id}", body)).Status);
        Assert.Equal("INV-FIC-9", Row((await m.Get($"/contracts/{k}")).Body!, 2)["invoiceNumber"]!.GetValue<string>());
    }

    [Fact]
    public async Task The_payment_list_and_the_financial_dashboard_show_the_template_columns()
    {
        var (m, c, project) = await Setup();
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, ThreeMilestones()));
        var list = (await m.Get($"/payments?clientId={c}&state=all")).Body!["items"]!.AsArray();
        var second = list.Single(x => x!["invoiceNumber"]?.GetValue<string>() == "INV-FIC-2")!;
        Assert.Equal("Done", second["workStatus"]!.GetValue<string>());
        Assert.Equal(50000m, second["outstanding"]!.GetValue<decimal>());

        var dash = (await m.Get($"/dashboard/payments?clientIds={c}&years=2025,2026")).Body!["items"]!.AsArray();
        var paid = dash.Single(x => x!["contractId"]!.GetValue<long>() == k && x["invoiceNumber"]?.GetValue<string>() == "INV-FIC-1")!;
        Assert.Equal("Approved", paid["clientApproval"]!.GetValue<string>());
        Assert.Equal(90000m, paid["received"]!.GetValue<decimal>());
    }

    private async Task<Api> PersonWith(params string[] rights)
    {
        var m = await Hub.As(HubFactory.Manager);
        var roleId = await m.Create("/admin/roles", new { name = U("A124"), rights = Fixture.Rights(rights, Flag.None) });
        var account = $@"DEV\{U("a124")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "A124 test", workingTimeZone = "UTC", allClients = true, allInternal = true, roleId });
        return await Hub.As(account);
    }
}
