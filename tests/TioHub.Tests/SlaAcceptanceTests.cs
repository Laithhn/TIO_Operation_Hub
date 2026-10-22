using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;

namespace TioHub.Tests;

[Collection("hub")]
public class AC61_ContractualSla(HubFactory hub) : Scenario(hub)
{
    private static object Contract(long projectId, long ownerId, int responseMinutes, string reference) => new
    {
        projectId, title = "Fictional SLA agreement", contractReference = reference, type = "SlaSupport", status = "Active", ownerUserId = ownerId,
        startDate = "2026-01-01", endDate = "2027-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai",
        support24x7 = true, slaPauseWhileWaitingOnCustomer = true, coverage = "PSOP", obligations = "Monthly report",
        slaTargets = new[] { new { priority = "High", responseMinutes, resolutionMinutes = 480, basis = "CalendarHours" } }
    };

    private async Task<long> SlaCase(Api a, long clientId, long? contractId) => await a.Create("/cases", new
    {
        title = "Interface queue stalled " + Guid.NewGuid().ToString("N")[..4], type = "Incident", scope = "Client", clientId, contractId,
        responsibleTeamId = await Team(), impactSummary = "Messages delayed", priority = "High", nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
    });

    /// <summary>Moves a case's creation (and its waiting periods) into the past, as if it had been open for some hours.</summary>
    private async Task Backdate(long caseId, double hours)
    {
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>();
        var at = DateTimeOffset.UtcNow.AddHours(-hours);
        await db.Cases.IgnoreQueryFilters().Where(c => c.Id == caseId).ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, at).SetProperty(c => c.ResponseDueAt, at.AddMinutes(60)));
        await db.CaseWaitingIntervals.Where(w => w.CaseId == caseId).ExecuteUpdateAsync(s => s.SetProperty(w => w.StartedAt, at));
        // First responses count from the tracking start; keep the backdated case inside the tracked period.
        var since = DateTimeOffset.UtcNow.AddDays(-1).ToString("O");
        await db.Settings.Where(x => x.Key == TioHub.Api.Modules.Admin.SettingKeys.SlaTrackingFrom && string.Compare(x.Value, since) > 0).ExecuteUpdateAsync(u => u.SetProperty(x => x.Value, since));
    }

    private async Task<int> Sweep()
    {
        using var scope = Hub.Services.CreateScope();
        return await TioHub.Api.Modules.Work.SlaSweep.SweepAsync(scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>(), DateTimeOffset.UtcNow, CancellationToken.None);
    }

    /// <summary>A61: contract linking, snapshots, first response, resolution, pauses, the sweep, list filters, dashboard figures and access.</summary>
    [Fact]
    public async Task Cases_are_measured_against_the_linked_contract_and_reported_with_their_denominators()
    {
        var m = await Hub.As(HubFactory.Manager);
        var norole = await Hub.As("DEV\\" + U("norole").ToLowerInvariant());
        var c = await NewClient();
        var other = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional SLA project", status = "Active", ownerUserId = m.UserId });
        var otherProject = await m.Create("/projects", new { clientId = other, code = U("PRJ"), name = "Other SLA project", status = "Active", ownerUserId = m.UserId });
        var k1 = await m.Create("/contracts", Contract(project, m.UserId, 60, "FIC-SLA-1"));
        var k2 = await m.Create("/contracts", Contract(otherProject, m.UserId, 60, "FIC-SLA-2"));
        Assert.True((await m.Get($"/contracts/{k1}")).Body!["slaPauseWhileWaitingOnCustomer"]!.GetValue<bool>());
        string V(long id) => m.Version($"/cases/{id}").GetAwaiter().GetResult();

        // Linking: the contract must belong to the case's client; internal work has none.
        var team = await Team();
        Assert.NotNull((await m.Post("/cases", new { title = "x", type = "Incident", scope = "Client", clientId = c, contractId = k2, responsibleTeamId = team, impactSummary = "x", priority = "High", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) })).Error("contractId"));
        Assert.NotNull((await m.Post("/cases", new { title = "x", type = "Incident", scope = "Internal", contractId = k1, responsibleTeamId = team, impactSummary = "x", priority = "High", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) })).Error("contractId"));

        // A linked case snapshots the target; the clock starts at creation.
        var a = await SlaCase(m, c, k1);
        var d = (await m.Get($"/cases/{a}")).Body!;
        Assert.Equal(k1, d["contract"]!["id"]!.GetValue<long>());
        var sla = d["sla"]!;
        Assert.Equal(60, sla["applied"]!["responseMinutes"]!.GetValue<int>());
        Assert.Equal("Pending", sla["response"]!["status"]!.GetValue<string>());
        var start = sla["startAt"]!.GetValue<DateTimeOffset>();
        Assert.Equal(start.AddMinutes(60), sla["response"]!["dueAt"]!.GetValue<DateTimeOffset>());
        Assert.Equal(start.AddMinutes(480), sla["resolution"]!["dueAt"]!.GetValue<DateTimeOffset>());

        // Without a contract the case is not applicable, never "met".
        var none = await SlaCase(m, c, null);
        var nd = (await m.Get($"/cases/{none}")).Body!["sla"]!;
        Assert.Equal("NotApplicable", nd["response"]!["status"]!.GetValue<string>());
        Assert.Contains("No contract", nd["note"]!.GetValue<string>());

        // Editing the contract later does not rewrite the snapshot of existing cases; new cases take the new target.
        var put = await m.Put($"/contracts/{k1}", Contract(project, m.UserId, 15, "FIC-SLA-1"), await m.Version($"/contracts/{k1}"));
        Assert.True(put.Status is HttpStatusCode.OK or HttpStatusCode.NoContent, put.Text);
        Assert.Equal(60, (await m.Get($"/cases/{a}")).Body!["sla"]!["applied"]!["responseMinutes"]!.GetValue<int>());
        var f = await SlaCase(m, c, k1);
        Assert.Equal(15, (await m.Get($"/cases/{f}")).Body!["sla"]!["applied"]!["responseMinutes"]!.GetValue<int>());

        // First response: not in the future, not before the case, with a channel, recorded once.
        Assert.NotNull((await m.Post($"/cases/{a}/first-response", new { respondedAt = DateTimeOffset.UtcNow.AddHours(1), channel = "Email" }, V(a))).Error("respondedAt"));
        Assert.NotNull((await m.Post($"/cases/{a}/first-response", new { respondedAt = DateTimeOffset.UtcNow.AddDays(-2), channel = "Email" }, V(a))).Error("respondedAt"));
        Assert.NotNull((await m.Post($"/cases/{a}/first-response", new { channel = "" }, V(a))).Error("channel"));
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Post($"/cases/{a}/first-response", new { channel = "Email" }, V(a))).Status);
        await m.Ok($"/cases/{a}/first-response", new { channel = "Email", note = "Acknowledged the incident" }, V(a));
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post($"/cases/{a}/first-response", new { channel = "Phone" }, V(a))).Status);
        d = (await m.Get($"/cases/{a}")).Body!;
        Assert.Equal("Met", d["sla"]!["response"]!["status"]!.GetValue<string>());
        Assert.Contains(d["events"]!.AsArray(), e => e!["type"]!.GetValue<string>() == "FirstResponse");

        // A progress update marked as sent to the customer is a first response; an internal one is not.
        var b = await SlaCase(m, c, k1);
        await m.Ok($"/cases/{b}/progress", new { progressSummary = "Internal analysis", nextAction = "Check logs", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V(b));
        Assert.Null((await m.Get($"/cases/{b}")).Body!["sla"]!["response"]!["actualAt"]);
        await m.Ok($"/cases/{b}/progress", new { progressSummary = "Workaround shared with the customer", nextAction = "Fix", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1), customerResponse = true }, V(b));
        Assert.Equal("Met", (await m.Get($"/cases/{b}")).Body!["sla"]!["response"]!["status"]!.GetValue<string>());

        // Resolution: requesting validation resolves, a rejected validation clears it, closing and reopening keep the first resolution.
        await m.Ok($"/cases/{a}/triage", new { responsibleTeamId = team, impactSummary = "Messages delayed", priority = "High", nextAction = "Assign", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V(a));
        await m.Ok($"/cases/{a}/assign", new { ownerUserId = m.UserId }, V(a));
        await m.Ok($"/cases/{a}/start", new { progressSummary = "Investigating" }, V(a));
        await m.Ok($"/cases/{a}/request-validation", new { progressSummary = "Queue drained", validationRequest = "Customer to confirm" }, V(a));
        Assert.Equal("Met", (await m.Get($"/cases/{a}")).Body!["sla"]!["resolution"]!["status"]!.GetValue<string>());
        await m.Ok($"/cases/{a}/resume", new { reason = "Still delayed" }, V(a));
        var resumed = (await m.Get($"/cases/{a}")).Body!["sla"]!["resolution"]!;
        Assert.Null(resumed["actualAt"]);
        Assert.Equal("Pending", resumed["status"]!.GetValue<string>());
        await m.Ok($"/cases/{a}/request-validation", new { progressSummary = "Fixed", validationRequest = "Customer to confirm" }, V(a));
        var resolvedAt = (await m.Get($"/cases/{a}")).Body!["sla"]!["resolution"]!["actualAt"]!.GetValue<DateTimeOffset>();
        await m.Ok($"/cases/{a}/close", new { outcome = "Fixed", validationEvidence = "Customer confirmed by email" }, V(a));
        await m.Ok($"/cases/{a}/reopen", new { reason = "Recurred", nextAction = "Re-check", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V(a));
        Assert.Equal(resolvedAt, (await m.Get($"/cases/{a}")).Body!["sla"]!["resolution"]!["actualAt"]!.GetValue<DateTimeOffset>());

        // Waiting on the customer pauses the clock under this contract: opened three hours ago and waiting since, still within target.
        var w = await SlaCase(m, c, k1);
        await m.Ok($"/cases/{w}/waiting", new { reason = "Customer", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V(w));
        await Backdate(w, 3);
        // Opened three hours ago with no response and no pause (15-minute target since the contract edit): breached at once on screen; the sweep stores it.
        var late = await SlaCase(m, c, k1);
        await Backdate(late, 3);
        Assert.Equal("Breached", (await m.Get($"/cases/{late}")).Body!["sla"]!["response"]!["status"]!.GetValue<string>());
        Assert.True(await Sweep() >= 2);
        var wd = (await m.Get($"/cases/{w}")).Body!["sla"]!;
        Assert.Equal("Pending", wd["response"]!["status"]!.GetValue<string>());
        Assert.InRange(wd["pausedMinutes"]!.GetValue<int>(), 170, 190);
        var ld = (await m.Get($"/cases/{late}")).Body!["sla"]!;
        Assert.Equal("Breached", ld["response"]!["status"]!.GetValue<string>());
        Assert.InRange(ld["response"]!["breachMinutes"]!.GetValue<int>(), 160, 170);

        // Changing the contract: same client only, not the same one again, and a reason once one is linked.
        Assert.NotNull((await m.Post($"/cases/{b}/contract", new { contractId = k2, reason = "x" }, V(b))).Error("contractId"));
        Assert.NotNull((await m.Post($"/cases/{b}/contract", new { contractId = (long?)null }, V(b))).Error("reason"));
        Assert.NotNull((await m.Post($"/cases/{b}/contract", new { contractId = k1, reason = "same" }, V(b))).Error("contractId"));
        await m.Ok($"/cases/{none}/contract", new { contractId = k1 }, V(none));
        Assert.Equal(15, (await m.Get($"/cases/{none}")).Body!["sla"]!["applied"]!["responseMinutes"]!.GetValue<int>());
        await m.Ok($"/cases/{none}/contract", new { contractId = (long?)null, reason = "Linked by mistake" }, V(none));
        var nd2 = (await m.Get($"/cases/{none}")).Body!;
        Assert.Equal("NotApplicable", nd2["sla"]!["response"]!["status"]!.GetValue<string>());
        Assert.Null(nd2["sla"]!["applied"]);
        Assert.Equal(2, nd2["events"]!.AsArray().Count(e => e!["type"]!.GetValue<string>() == "ContractChanged"));

        // List filters.
        Assert.Equal(5, (await m.Get($"/cases?clientId={c}&status=all&contractId={k1}")).Total);
        Assert.Equal(1, (await m.Get($"/cases?clientId={c}&status=all&sla=noContract")).Total);
        Assert.Equal(1, (await m.Get($"/cases?clientId={c}&status=all&sla=responseBreached")).Total);

        // Dashboard: rates are met ÷ (met + breached), with every count shown; each count equals its drill-down.
        Assert.Equal(HttpStatusCode.Forbidden, (await norole.Get("/dashboard/command-center")).Status);
        var cc = (await m.Get($"/dashboard/command-center?clientId={c}&period=7d")).Body!;
        var s = cc["sla"]!;
        Assert.Equal(6, s["casesInPeriod"]!.GetValue<int>());
        Assert.Equal(5, s["withContract"]!.GetValue<int>());
        Assert.Equal(1, s["withoutContract"]!.GetValue<int>());
        var resp = s["response"]!;
        Assert.Equal(2, resp["met"]!.GetValue<int>());
        Assert.Equal(1, resp["breached"]!.GetValue<int>());
        Assert.Equal(2, resp["pending"]!.GetValue<int>());
        Assert.Equal(66.7, resp["rate"]!.GetValue<double>());
        Assert.Equal(1, s["resolution"]!["met"]!.GetValue<int>());
        Assert.Equal(1, s["overall"]!["completed"]!.GetValue<int>());
        Assert.Equal(100.0, s["overall"]!["rate"]!.GetValue<double>());
        Assert.Equal(1, s["breachedOpen"]!.GetValue<int>());
        Assert.Contains("met ÷ (met + breached)", s["definition"]!.GetValue<string>());
        Assert.Equal(5, s["byContract"]!.AsArray().Single()!["cases"]!.GetValue<int>());
        Assert.Equal(5, s["byPriority"]!.AsArray().Single(x => x!["priority"]!.GetValue<string>() == "High")!["cases"]!.GetValue<int>());
        var from = Uri.EscapeDataString(cc["period"]!["from"]!.GetValue<DateTimeOffset>().ToString("O"));
        var to = Uri.EscapeDataString(cc["period"]!["to"]!.GetValue<DateTimeOffset>().AddSeconds(1).ToString("O"));
        Assert.Equal(2, (await m.Get($"/cases?clientId={c}&status=all&sla=responseMet&createdFrom={from}&createdTo={to}")).Total);
        Assert.Equal(1, (await m.Get($"/cases?clientId={c}&status=all&sla=responseBreached&createdFrom={from}&createdTo={to}")).Total);
        Assert.Equal(1, (await m.Get($"/cases?clientId={c}&status=all&sla=resolutionMet&createdFrom={from}&createdTo={to}")).Total);
        var narrowed = (await m.Get($"/dashboard/command-center?clientId={c}&period=7d&slaContractId={k2}")).Body!["sla"]!;
        Assert.Equal(0, narrowed["withContract"]!.GetValue<int>());
        Assert.Null(narrowed["response"]!["rate"]);

        // Deleting a contract with everything that belongs to it unlinks its cases, which are then no longer measured.
        var k3 = await m.Create("/contracts", Contract(project, m.UserId, 60, "FIC-SLA-3"));
        var gone = await SlaCase(m, c, k3);
        await m.Ok($"/cases/{gone}/first-response", new { channel = "Email" }, V(gone));
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/contracts/{k3}")).Status);
        var gd = (await m.Get($"/cases/{gone}")).Body!;
        Assert.Null(gd["contract"]);
        Assert.Null(gd["sla"]!["applied"]);
        Assert.Equal("NotApplicable", gd["sla"]!["response"]!["status"]!.GetValue<string>());
        Assert.Equal(2, (await m.Get($"/cases?clientId={c}&status=all&sla=responseMet")).Total); // still only the two cases measured earlier
    }
}
