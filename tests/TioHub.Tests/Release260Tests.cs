using System.Net;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A110 (owner requests, 10 Nov 2026): server GPU, contract text without a length limit, contract amount in the register, payment status on its own.</summary>
[Collection("hub")]
public class AC110_ServerGpuContractsPayments(HubFactory hub) : Scenario(hub)
{
    private async Task<(Api M, long Client, long Project)> Setup()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional delivery", status = "Active", ownerUserId = m.UserId });
        return (m, c, project);
    }

    private static object ContractBody(long projectId, long ownerId, string obligations = "Monthly report", string? supportHours = null, object? fees = null, object? payments = null) => new
    {
        projectId, title = "Fictional agreement", contractReference = "FIC-A110-" + Guid.NewGuid().ToString("N")[..6], type = "SlaSupport", status = "Active", ownerUserId = ownerId,
        startDate = "2026-01-01", endDate = "2028-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true,
        currency = "AED", obligations, supportHours, fees, payments
    };

    [Fact]
    public async Task A_server_records_an_optional_gpu_specification()
    {
        var (m, c, _) = await Setup();
        var env = await NewEnv(c, "Production");
        var plain = await m.Create("/assets", new { environmentId = env, name = U("app"), type = "VM", lifecycle = "Active", ownerUserId = m.UserId });
        var a = (await m.Get($"/assets/{plain}")).Body!;
        Assert.Null(a["gpuCount"]);
        Assert.Null(a["gpuModel"]);

        var gpu = await m.Create("/assets", new
        {
            environmentId = env, name = U("ai"), type = "VM", lifecycle = "Active", ownerUserId = m.UserId,
            cpuQuantity = 64, cpuUnit = "PhysicalCore", ramQuantity = 512, ramUnit = "GB", gpuCount = 2, gpuModel = "NVIDIA A100", gpuMemoryQuantity = 80, gpuMemoryUnit = "GB"
        });
        a = (await m.Get($"/assets/{gpu}")).Body!;
        Assert.Equal(2, a["gpuCount"]!.GetValue<int>());
        Assert.Equal("NVIDIA A100", a["gpuModel"]!.GetValue<string>());
        Assert.Equal(80m, a["gpuMemoryQuantity"]!.GetValue<decimal>());
        Assert.Equal("GB", a["gpuMemoryUnit"]!.GetValue<string>());
        Assert.Contains((await m.Get($"/assets?environmentId={env}")).Body!["items"]!.AsArray(), x => x!["id"]!.GetValue<long>() == gpu && x["gpuCount"]!.GetValue<int>() == 2);

        // Validated like CPU and RAM: a positive count, memory with its unit.
        Assert.NotNull((await m.Post("/assets", new { environmentId = env, name = U("bad"), type = "VM", lifecycle = "Active", ownerUserId = m.UserId, gpuCount = 0 })).Error("gpuCount"));
        Assert.NotNull((await m.Post("/assets", new { environmentId = env, name = U("bad"), type = "VM", lifecycle = "Active", ownerUserId = m.UserId, gpuMemoryQuantity = 16 })).Error("gpuMemoryUnit"));
    }

    [Fact]
    public async Task Contract_obligations_and_support_notes_have_no_length_limit()
    {
        var (m, _, project) = await Setup();
        var obligations = string.Join(" ", Enumerable.Repeat("The supplier delivers a monthly service report and keeps two engineers on site.", 120));
        var support = string.Join(" ", Enumerable.Repeat("Support on working days, public holidays excluded.", 20));
        Assert.True(obligations.Length > 4000 && support.Length > 200);
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, obligations, support));
        var d = (await m.Get($"/contracts/{k}")).Body!;
        Assert.Equal(obligations, d["obligations"]!.GetValue<string>());
        Assert.Equal(support, d["supportHours"]!.GetValue<string>());
    }

    [Fact]
    public async Task The_contract_register_shows_the_client_and_the_contract_amount()
    {
        var (m, c, project) = await Setup();
        var priced = await m.Create("/contracts", ContractBody(project, m.UserId, fees: new[]
        {
            new { description = "Implementation", unit = "lump sum", quantity = (decimal?)null, unitPrice = (decimal?)100000m },
            new { description = "Support", unit = "month", quantity = (decimal?)12, unitPrice = (decimal?)5000m }
        }));
        var unpriced = await m.Create("/contracts", ContractBody(project, m.UserId));
        var items = (await m.Get($"/contracts?clientId={c}&sort=-amount")).Body!["items"]!.AsArray();
        Assert.Equal(priced, items[0]!["id"]!.GetValue<long>());
        Assert.Equal(160000m, items[0]!["amount"]!.GetValue<decimal>());
        Assert.Equal("AED", items[0]!["currency"]!.GetValue<string>());
        Assert.Equal(c, items[0]!["clientId"]!.GetValue<long>());
        Assert.Null(items.Single(x => x!["id"]!.GetValue<long>() == unpriced)!["amount"]);
    }

    [Fact]
    public async Task A_payment_status_changes_without_editing_the_contract()
    {
        var (m, _, project) = await Setup();
        var k = await m.Create("/contracts", ContractBody(project, m.UserId, payments: new[]
        {
            new { condition = "Signature", percentage = (decimal?)30, amount = (decimal?)30000m, dueDate = (DateOnly?)new DateOnly(2026, 2, 1), status = "Invoiced", paidOn = (DateOnly?)null }
        }));
        var before = await m.Version($"/contracts/{k}");
        var paymentId = (await m.Get($"/contracts/{k}")).Body!["payments"]![0]!["id"]!.GetValue<long>();
        var path = $"/contracts/{k}/payments/{paymentId}/status";

        Assert.NotNull((await m.Post(path, new { status = "Paid" })).Error("paidOn"));
        Assert.NotNull((await m.Post(path, new { })).Error("status"));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post($"/contracts/{k}/payments/999999999/status", new { status = "Waived" })).Status);

        var ok = await m.Post(path, new { status = "Paid", paidOn = "2026-02-03", notes = "Invoice 4711" });
        Assert.Equal(HttpStatusCode.OK, ok.Status);
        var p = (await m.Get($"/contracts/{k}")).Body!["payments"]![0]!;
        Assert.Equal("Paid", p["status"]!.GetValue<string>());
        Assert.Equal("2026-02-03", p["paidOn"]!.GetValue<string>());
        Assert.Equal("Invoice 4711", p["notes"]!.GetValue<string>());
        // The contract's version moved, so a contract form opened earlier cannot save the old status back.
        Assert.NotEqual(before, await m.Version($"/contracts/{k}"));
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await m.Put($"/contracts/{k}", ContractBody(project, m.UserId), before)).Status);

        // Back to Invoiced clears the paid date. The right is Contracts:Maintain.
        await m.Ok(path, new { status = "Invoiced" });
        Assert.Null((await m.Get($"/contracts/{k}")).Body!["payments"]![0]!["paidOn"]);
        var viewer = await ViewerWith("Contracts:View", "Contracts:DetailsView", "Projects:View");
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Post(path, new { status = "Waived" })).Status);
    }

    private async Task<Api> ViewerWith(params string[] rights)
    {
        var m = await Hub.As(HubFactory.Manager);
        var roleId = await m.Create("/admin/roles", new { name = U("A110"), rights = Fixture.Rights(rights, Flag.None) });
        var account = $@"DEV\{U("a110")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "A110 test", workingTimeZone = "UTC", allClients = true, allInternal = true, roleId });
        return await Hub.As(account);
    }
}
