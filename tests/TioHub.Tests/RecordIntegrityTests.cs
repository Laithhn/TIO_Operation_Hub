using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;

namespace TioHub.Tests;

/// <summary>
/// A111 (independent audit of 2.60.0, findings 001–005, 008, 011 and 035): what was measured or finished stays as it was.
/// SLA results survive priority changes; contract changes, cancellation and back-dated responses on a ticket that has a result
/// need ticket coordination; finished tickets and commitments are not edited; a passed deadline is moved only by coordination;
/// delete-with-everything needs the reviewed count and never removes SLA evidence; change history follows the data scope.
/// </summary>
[Collection("hub")]
public class A111_RecordIntegrity(HubFactory hub) : Scenario(hub)
{
    private static object Contract(long projectId, long ownerId, string reference) => new
    {
        projectId, title = "Fictional integrity agreement", contractReference = reference, type = "SlaSupport", status = "Active", ownerUserId = ownerId,
        startDate = "2026-01-01", endDate = "2027-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai",
        support24x7 = true,
        slaTargets = new[]
        {
            new { priority = "High", responseMinutes = 60, resolutionMinutes = 480, basis = "CalendarHours" },
            new { priority = "Low", responseMinutes = 6000, resolutionMinutes = 60000, basis = "CalendarHours" }
        }
    };

    private async Task<(Api Manager, Api Engineer, long Client, long Contract)> Setup()
    {
        var m = await Hub.As(HubFactory.Manager);
        var account = $@"DEV\a111{Guid.NewGuid().ToString("N")[..6]}";
        await m.Create("/admin/users", new { accountName = account, displayName = "Fictional Engineer", workingTimeZone = "UTC", allClients = true, allInternal = true, roles = new[] { "Engineer" } });
        var client = await NewClient();
        var project = await m.Create("/projects", new { clientId = client, code = U("PRJ"), name = "Fictional integrity project", status = "Active", ownerUserId = m.UserId });
        var contract = await m.Create("/contracts", Contract(project, m.UserId, U("FIC")));
        return (m, await Hub.As(account), client, contract);
    }

    private async Task<long> SlaCase(Api a, long clientId, long contractId, long? owner = null) => await a.Create("/cases", new
    {
        title = "Queue stalled " + Guid.NewGuid().ToString("N")[..4], type = "Incident", scope = "Client", clientId, contractId, ownerUserId = owner,
        responsibleTeamId = await Team(), impactSummary = "Messages delayed", priority = "High", nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
    });

    /// <summary>Makes the ticket five hours old and lets the sweep record what that means: response (60 min) breached, resolution (480 min) still running.</summary>
    private async Task BreachResponse(long caseId)
    {
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>();
        var at = DateTimeOffset.UtcNow.AddHours(-5);
        await db.Cases.IgnoreQueryFilters().Where(c => c.Id == caseId).ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, at).SetProperty(c => c.ResponseDueAt, at.AddMinutes(60)));
        var since = DateTimeOffset.UtcNow.AddDays(-1).ToString("O");
        await db.Settings.Where(x => x.Key == TioHub.Api.Modules.Admin.SettingKeys.SlaTrackingFrom && string.Compare(x.Value, since) > 0).ExecuteUpdateAsync(u => u.SetProperty(x => x.Value, since));
        await TioHub.Api.Modules.Work.SlaSweep.SweepAsync(db, DateTimeOffset.UtcNow, CancellationToken.None);
    }

    private static string Sla(Res r, string obligation) => r.Body!["sla"]![obligation]!["status"]!.GetValue<string>();

    private static object Edit(Res current, string priority, string? title = null) => new
    {
        title = title ?? current.Body!["title"]!.GetValue<string>(), type = current.Body!["type"]!.GetValue<string>(), responsibleTeamId = current.Body!["team"]!["id"]!.GetValue<long>(),
        impactSummary = current.Body!["impactSummary"]!.GetValue<string>(), priority, nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1), changeNote = "Fictional change"
    };

    [Fact]
    public async Task A_priority_change_keeps_the_result_already_reached_and_retargets_only_what_is_still_running()
    {
        var (m, _, client, contract) = await Setup();
        var id = await SlaCase(m, client, contract);
        await BreachResponse(id);
        var before = await m.Get($"/cases/{id}");
        Assert.Equal("Breached", Sla(before, "response"));
        Assert.Equal("Pending", Sla(before, "resolution"));
        var resolutionDue = before.Body!["sla"]!["resolution"]!["dueAt"]!.GetValue<DateTimeOffset>();

        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/cases/{id}", Edit(before, "Low"), before.ETag)).Status);
        var after = await m.Get($"/cases/{id}");
        Assert.Equal("Low", after.Body!["priority"]!.GetValue<string>());
        Assert.Equal("Breached", Sla(after, "response"));
        Assert.Equal(60, after.Body!["sla"]!["applied"]!["responseMinutes"]!.GetValue<int>());
        // The running obligation takes the new priority's target.
        Assert.Equal("Pending", Sla(after, "resolution"));
        Assert.Equal(60000, after.Body!["sla"]!["applied"]!["resolutionMinutes"]!.GetValue<int>());
        Assert.True(after.Body!["sla"]!["resolution"]!["dueAt"]!.GetValue<DateTimeOffset>() > resolutionDue);
    }

    [Fact]
    public async Task Contract_change_cancellation_and_backdated_response_on_a_ticket_with_a_result_need_coordination()
    {
        var (m, e, client, contract) = await Setup();
        var id = await SlaCase(m, client, contract, owner: e.UserId);
        await BreachResponse(id);
        string V() => m.Version($"/cases/{id}").GetAwaiter().GetResult();
        var created = (await m.Get($"/cases/{id}")).Body!["createdAt"]!.GetValue<DateTimeOffset>();

        // The engineer who maintains the ticket cannot take it out of measurement or claim an earlier response.
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/cases/{id}/contract", new { contractId = (long?)null, reason = "Wrong contract" }, V())).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/cases/{id}/cancel", new { reason = "Raised by mistake" }, V())).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/cases/{id}/first-response", new { respondedAt = created.AddMinutes(10), channel = "Call", note = "Spoke to the customer" }, V())).Status);
        Assert.Equal("Breached", Sla(await m.Get($"/cases/{id}"), "response"));

        // A response recorded at its real, late time is still the engineer's to record, and stays a breach.
        Assert.Equal(HttpStatusCode.NoContent, (await e.Post($"/cases/{id}/first-response", new { channel = "E-mail" }, V())).Status);
        Assert.Equal("Breached", Sla(await m.Get($"/cases/{id}"), "response"));

        // Coordination may change the contract, with a reason; the earlier result stays on the timeline.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/cases/{id}/contract", new { contractId = (long?)null, reason = "Linked to the wrong agreement" }, V())).Status);
        var events = (await m.Get($"/cases/{id}")).Body!["events"]!.AsArray();
        Assert.Contains(events, x => x!["type"]!.GetValue<string>() == "ContractChanged" && x["note"]!.GetValue<string>().Contains("response Breached"));

        // Coordination needs a note for a back-dated response that turns a missed deadline into a met one.
        var second = await SlaCase(m, client, contract);
        await BreachResponse(second);
        var claim = created.AddHours(-5).AddMinutes(10);
        var opened = (await m.Get($"/cases/{second}")).Body!["createdAt"]!.GetValue<DateTimeOffset>();
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post($"/cases/{second}/first-response", new { respondedAt = opened.AddMinutes(10), channel = "Call" }, await m.Version($"/cases/{second}"))).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/cases/{second}/first-response", new { respondedAt = opened.AddMinutes(10), channel = "Call", note = "Call log 4711" }, await m.Version($"/cases/{second}"))).Status);
        Assert.Equal("Met", Sla(await m.Get($"/cases/{second}"), "response"));
        _ = claim;
    }

    [Fact]
    public async Task Finished_tickets_and_commitments_are_not_edited_and_a_passed_deadline_needs_coordination()
    {
        var (m, e, client, _) = await Setup();
        var id = await NewCase(client, owner: e.UserId);
        string V() => m.Version($"/cases/{id}").GetAwaiter().GetResult();
        await m.Ok($"/cases/{id}/triage", new { responsibleTeamId = await Team(), impactSummary = "Confirmed", priority = "High", nextAction = "Work", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V());
        await e.Ok($"/cases/{id}/start", new { }, V());
        var beforeClose = await m.Get($"/cases/{id}");
        if (beforeClose.Body!["permissions"]!["canRequestValidation"]!.GetValue<bool>())
            await e.Ok($"/cases/{id}/request-validation", new { progressSummary = "Fixed", validationRequest = "Please confirm" }, V());
        await e.Ok($"/cases/{id}/close", new { outcome = "Resolved", validationEvidence = "Customer e-mail" }, V());

        var closed = await m.Get($"/cases/{id}");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Put($"/cases/{id}", Edit(closed, "High", "Changed after closing"), closed.ETag)).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Put($"/cases/{id}", Edit(closed, "Low"), closed.ETag)).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Post($"/cases/{id}/due", new { dueLocal = Future(30), dueTimeZone = "Asia/Dubai", reason = "After closing" }, closed.ETag)).Status);
        Assert.Equal(closed.Body!["title"]!.GetValue<string>(), (await m.Get($"/cases/{id}")).Body!["title"]!.GetValue<string>());

        // Commitments: completed ones are not edited.
        object Commitment(string dueLocal) => new
        {
            scope = "Client", clientId = client, responsibleTeamId = Team().GetAwaiter().GetResult(), description = "Fictional delivery " + Guid.NewGuid().ToString("N")[..4], type = "Delivery",
            ownerUserId = e.UserId, dueLocal, timeZone = "Asia/Dubai", nextReviewAt = DateTimeOffset.UtcNow.AddDays(2)
        };
        var done = await m.Create("/commitments", Commitment(Future(20)));
        await e.Ok($"/commitments/{done}/complete", new { completedAt = DateTimeOffset.UtcNow, evidence = "Delivery note" }, await m.Version($"/commitments/{done}"));
        var edit = new { description = "Changed after completion", type = "Delivery", ownerUserId = e.UserId, nextReviewAt = DateTimeOffset.UtcNow.AddDays(2) };
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Put($"/commitments/{done}", edit, await m.Version($"/commitments/{done}"))).Status);

        // A deadline that has passed is moved by coordination only; then the original result is still reported as late.
        var late = await m.Create("/commitments", Commitment(DateTime.UtcNow.AddDays(-3).ToString("yyyy-MM-dd") + "T10:00"));
        var move = new { dueLocal = Future(30), timeZone = "Asia/Dubai", reason = "Agreed with the customer" };
        Assert.False((await e.Get($"/commitments/{late}")).Body!["permissions"]!["canRevise"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/commitments/{late}/revise", move, await m.Version($"/commitments/{late}"))).Status);
        await e.Ok($"/commitments/{late}/complete", new { completedAt = DateTimeOffset.UtcNow, evidence = "Delivered late" }, await m.Version($"/commitments/{late}"));
        Assert.Equal("Completed late", (await m.Get($"/commitments/{late}")).Body!["timeliness"]!.GetValue<string>());

        // Before the deadline the owner still revises with a reason.
        var open = await m.Create("/commitments", Commitment(Future(10)));
        Assert.Equal(HttpStatusCode.NoContent, (await e.Post($"/commitments/{open}/revise", move, await m.Version($"/commitments/{open}"))).Status);
        // Coordination may move a passed deadline.
        var overdue = await m.Create("/commitments", Commitment(DateTime.UtcNow.AddDays(-3).ToString("yyyy-MM-dd") + "T10:00"));
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/commitments/{overdue}/revise", move, await m.Version($"/commitments/{overdue}"))).Status);
    }

    [Fact]
    public async Task Delete_with_everything_needs_the_reviewed_count_and_never_removes_sla_evidence()
    {
        var (m, _, client, contract) = await Setup();
        var plain = await NewCase(client);
        var preview = await m.Get($"/dependents/cases/{plain}");
        var total = preview.Body!["total"]!.GetValue<int>();

        Assert.Equal((HttpStatusCode)428, (await m.Send(HttpMethod.Delete, $"/dependents/cases/{plain}")).Status);
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await m.Send(HttpMethod.Delete, $"/dependents/cases/{plain}?expected={total + 1}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/cases/{plain}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/cases/{plain}?expected={total}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/cases/{plain}")).Status);

        // A ticket with an SLA result is evidence: not deleted alone, with its dependents, or through its contract or client.
        var measured = await SlaCase(m, client, contract);
        await BreachResponse(measured);
        async Task<int> Total(string path) => (await m.Get(path)).Body!["total"]!.GetValue<int>();
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/cases/{measured}", ifMatch: await m.Version($"/cases/{measured}"))).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/dependents/cases/{measured}?expected={await Total($"/dependents/cases/{measured}")}")).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/dependents/contracts/{contract}?expected={await Total($"/dependents/contracts/{contract}")}")).Status);
        var refused = await m.Send(HttpMethod.Delete, $"/dependents/clients/{client}?expected={await Total($"/dependents/clients/{client}")}");
        Assert.Equal(HttpStatusCode.Conflict, refused.Status);
        Assert.Contains("SLA result", refused.Text);
        Assert.Equal("Breached", Sla(await m.Get($"/cases/{measured}"), "response"));

        // A ticket raised by mistake: coordination cancels it with a reason (the earlier result goes on the timeline); then it can be deleted.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/cases/{measured}/cancel", new { reason = "Duplicate of another ticket" }, await m.Version($"/cases/{measured}"))).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/cases/{measured}?expected={await Total($"/dependents/cases/{measured}")}")).Status);
    }

    [Fact]
    public async Task Change_history_and_export_log_follow_the_readers_data_scope()
    {
        var (m, _, client, _) = await Setup();
        var other = await NewClient();
        var otherProject = await m.Create("/projects", new { clientId = other, code = U("PRJ"), name = "Other fictional project", status = "Active", ownerUserId = m.UserId });
        var otherContract = await m.Create("/contracts", Contract(otherProject, m.UserId, U("OTH")));
        await m.Get($"/export/cases?clientId={other}&status=all");

        var account = $@"DEV\a111s{Guid.NewGuid().ToString("N")[..6]}";
        await m.Create("/admin/users", new { accountName = account, displayName = "Fictional Scoped Engineer", workingTimeZone = "UTC", allClients = false, allInternal = false,
            roles = new[] { "Engineer" }, scopes = new[] { new { kind = "Client", clientId = client } } });
        var scoped = await Hub.As(account);
        Assert.Equal(HttpStatusCode.NotFound, (await scoped.Get($"/contracts/{otherContract}")).Status);

        // SLA targets are rows without a client of their own: they now carry the client of their contract.
        var targets = (await scoped.Get("/admin/audit?entityType=SlaTarget&pageSize=100")).Body!["items"]!.AsArray();
        Assert.DoesNotContain(targets, a => a!["changes"]!.ToString().Contains($"\"ContractId\":[null,{otherContract}]"));
        Assert.Contains(targets, a => a!["clientId"]?.GetValue<long?>() == client);
        var mine = (await m.Get($"/admin/audit?entityType=SlaTarget&clientId={other}&pageSize=100")).Body!["items"]!.AsArray();
        Assert.Contains(mine, a => a!["changes"]!.ToString().Contains($"\"ContractId\":[null,{otherContract}]"));

        // Nothing unscoped except global catalogue and configuration history, or the reader's own entries.
        var all = (await scoped.Get("/admin/audit?pageSize=100")).Body!["items"]!.AsArray();
        Assert.DoesNotContain(all, a => a!["clientId"] is null && a["entityType"]!.GetValue<string>() is "SlaTarget" or "ProjectProduct" or "Handover" or "ContractPayment" && a["userName"]!.GetValue<string>() != account);

        // The export log names clients in its filter text: a scoped reader sees only their own exports.
        var exports = (await scoped.Get("/admin/exports?pageSize=100")).Body!["items"]!.AsArray();
        Assert.All(exports, x => Assert.Equal(account, x!["user"]!.GetValue<string>()));
        Assert.NotEmpty((await m.Get("/admin/exports?pageSize=100")).Body!["items"]!.AsArray());
    }
}
