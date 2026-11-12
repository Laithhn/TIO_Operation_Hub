using System.Net;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

/// <summary>A77: case statuses are configured values whose behavior decides the stage the rules read.</summary>
[Collection("hub")]
public class CaseStatusConfigTests(HubFactory hub) : Scenario(hub)
{
    private async Task<JsonNode> LookupAsync(Api m, string code) =>
        (await m.Get("/admin/lookups")).Body!.AsArray().First(l => l!["listName"]!.GetValue<string>() == CaseStatuses.List && l["code"]!.GetValue<string>() == code)!;

    private async Task<Res> SetRetiredAsync(Api m, string code, bool retired)
    {
        var l = await LookupAsync(m, code);
        return await m.Put($"/admin/lookups/{l["id"]!.GetValue<long>()}", new { listName = CaseStatuses.List, code, label = l["label"]!.GetValue<string>(), description = (string?)null,
            sortOrder = l["sortOrder"]!.GetValue<int>(), isRetired = retired }, l["version"]!.GetValue<string>());
    }

    private async Task<long> InProgressCaseAsync(Api m)
    {
        var id = await NewCase(await NewClient(), owner: m.UserId);
        await m.Ok($"/cases/{id}/triage", new { responsibleTeamId = await Team(), impactSummary = "Impact", priority = "Normal", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{id}"));
        await m.Ok($"/cases/{id}/start", new { }, await m.Version($"/cases/{id}"));
        return id;
    }

    private static string Code(Res r) => r.Body!["statusCode"]!.GetValue<string>();

    [Fact]
    public async Task The_initial_statuses_are_seeded_with_their_behaviors()
    {
        var m = await Hub.As(HubFactory.Manager);
        foreach (var (code, label, behavior) in CaseStatuses.Initial)
        {
            var l = await LookupAsync(m, code);
            Assert.Equal(label, l["label"]!.GetValue<string>());
            Assert.Equal(behavior.ToString(), l["category"]!.GetValue<string>());
        }
        Assert.Equal(["New", "Opened", "In-progress", "Waiting for customer", "Closed", "Re-opened"], CaseStatuses.Initial.Select(s => s.Label));
    }

    [Fact]
    public async Task An_added_status_can_be_used_and_cannot_be_deleted_while_in_use()
    {
        var m = await Hub.As(HubFactory.Manager);
        var name = U("Waiting for vendor");
        var added = await m.Create("/admin/lookups", new { listName = CaseStatuses.List, label = name, category = nameof(CaseStatusBehavior.Active), isRetired = false });
        var code = (await m.Get("/admin/lookups")).Body!.AsArray().First(l => l!["id"]!.GetValue<long>() == added)!["code"]!.GetValue<string>();
        var id = await InProgressCaseAsync(m);
        Assert.Contains(code, (await m.Get($"/cases/{id}")).Body!["statusOptions"]!.AsArray().Select(x => x!.GetValue<string>()));

        await m.Ok($"/cases/{id}/status", new { code }, await m.Version($"/cases/{id}"));
        var moved = await m.Get($"/cases/{id}");
        Assert.Equal(code, Code(moved));
        Assert.Equal("InProgress", moved.Body!["status"]!.GetValue<string>()); // the stage, and so the SLA rules, did not change
        Assert.Contains((await m.Get($"/cases?status=code:{code}")).Body!["items"]!.AsArray(), r => r!["id"]!.GetValue<long>() == id);
        Assert.Equal(1, (await m.Get($"/admin/lookups/{CaseStatuses.List}/usage")).Body![code]!.GetValue<int>());

        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{added}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await SetRetiredAsync(m, code, true)).Status);
    }

    [Fact]
    public async Task A_status_of_another_stage_needs_its_own_action()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await InProgressCaseAsync(m);
        foreach (var code in new[] { CaseStatuses.ClosedCode, CaseStatuses.NewCode, CaseStatuses.WaitingCode, "NoSuchStatus" })
            Assert.NotNull((await m.Post($"/cases/{id}/status", new { code }, await m.Version($"/cases/{id}"))).Error("code"));
    }

    [Fact]
    public async Task The_last_status_of_a_required_behavior_stays()
    {
        var m = await Hub.As(HubFactory.Manager);
        var closed = await LookupAsync(m, CaseStatuses.ClosedCode);
        Assert.NotNull((await SetRetiredAsync(m, CaseStatuses.ClosedCode, true)).Error("isRetired"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{closed["id"]!.GetValue<long>()}")).Status);
    }

    [Fact]
    public async Task A_deleted_status_is_not_added_back_at_startup()
    {
        var m = await Hub.As(HubFactory.Manager);
        var name = U("Temporary");
        var added = await m.Create("/admin/lookups", new { listName = CaseStatuses.List, label = name, category = nameof(CaseStatusBehavior.Reopened), isRetired = false });
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{added}")).Status);
        using var scope = Hub.Services.CreateScope();
        await ReferenceData.SeedAsync(scope.ServiceProvider.GetRequiredService<HubDbContext>());
        Assert.DoesNotContain((await m.Get("/admin/lookups")).Body!.AsArray(), l => l!["label"]!.GetValue<string>() == name);
    }

    [Fact]
    public async Task Without_a_resolved_status_a_case_closes_from_in_progress_with_evidence()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await InProgressCaseAsync(m);
        Assert.Equal(HttpStatusCode.NoContent, (await SetRetiredAsync(m, CaseStatuses.PendingValidationCode, true)).Status);
        try
        {
            var open = await m.Get($"/cases/{id}");
            Assert.True(open.Body!["permissions"]!["canClose"]!.GetValue<bool>());
            Assert.False(open.Body!["permissions"]!["canRequestValidation"]!.GetValue<bool>());
            Assert.NotNull((await m.Post($"/cases/{id}/request-validation", new { progressSummary = "Done", validationRequest = "Check" }, open.ETag)).Error("status"));
            Assert.NotNull((await m.Post($"/cases/{id}/close", new { outcome = "Done" }, open.ETag)).Error("validationEvidence")); // the evidence rule is unchanged
            await m.Ok($"/cases/{id}/close", new { outcome = "Done", validationEvidence = "Checked" }, open.ETag);
            var closed = await m.Get($"/cases/{id}");
            Assert.Equal(CaseStatuses.ClosedCode, Code(closed));
            Assert.Equal("Closed", closed.Body!["status"]!.GetValue<string>());
        }
        finally { await SetRetiredAsync(m, CaseStatuses.PendingValidationCode, false); }
    }

    [Fact]
    public async Task With_a_resolved_status_closing_needs_that_step_first()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await InProgressCaseAsync(m);
        var open = await m.Get($"/cases/{id}");
        Assert.False(open.Body!["permissions"]!["canClose"]!.GetValue<bool>());
        Assert.NotNull((await m.Post($"/cases/{id}/close", new { outcome = "Done", validationEvidence = "Checked" }, open.ETag)).Error("status"));
        await m.Ok($"/cases/{id}/request-validation", new { progressSummary = "Done", validationRequest = "Check" }, open.ETag);
        var resolved = await m.Get($"/cases/{id}");
        Assert.Equal(CaseStatuses.PendingValidationCode, Code(resolved));
        await m.Ok($"/cases/{id}/close", new { outcome = "Done", validationEvidence = "Checked" }, resolved.ETag);
    }

    [Fact]
    public async Task Waiting_on_the_customer_shows_as_the_waiting_status_and_returns_afterwards()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await InProgressCaseAsync(m);
        await m.Ok($"/cases/{id}/waiting", new { reason = "Customer", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{id}"));
        var waiting = await m.Get($"/cases/{id}");
        Assert.Equal(CaseStatuses.WaitingCode, Code(waiting));
        Assert.Equal("InProgress", waiting.Body!["status"]!.GetValue<string>());
        await m.Ok($"/cases/{id}/waiting/clear", new { reason = "Received" }, waiting.ETag);
        Assert.Equal(CaseStatuses.InProgressCode, Code(await m.Get($"/cases/{id}")));

        await m.Ok($"/cases/{id}/waiting", new { reason = "Vendor", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await m.Version($"/cases/{id}"));
        Assert.Equal(CaseStatuses.InProgressCode, Code(await m.Get($"/cases/{id}"))); // only the customer has a status
    }

    [Fact]
    public async Task A_cancelled_case_shows_as_closed_and_keeps_its_stage_and_a_reopened_case_shows_as_reopened()
    {
        var m = await Hub.As(HubFactory.Manager);
        var id = await InProgressCaseAsync(m);
        await m.Ok($"/cases/{id}/cancel", new { reason = "No longer needed" }, await m.Version($"/cases/{id}"));
        var cancelled = await m.Get($"/cases/{id}");
        Assert.Equal(CaseStatuses.ClosedCode, Code(cancelled));
        Assert.Equal("Cancelled", cancelled.Body!["status"]!.GetValue<string>());

        await m.Ok($"/cases/{id}/reopen", new { reason = "Needed after all", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, cancelled.ETag);
        var reopened = await m.Get($"/cases/{id}");
        Assert.Equal(CaseStatuses.ReopenedCode, Code(reopened));
        Assert.Equal("Triaged", reopened.Body!["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task Stage_labels_still_read_for_screens_and_history_that_show_a_stage()
    {
        var m = await Hub.As(HubFactory.Manager);
        var labels = (await m.Get("/reference")).Body!["enumLabels"]!["CaseStatus"]!;
        Assert.Equal("Closed (cancelled)", labels["Cancelled"]!.GetValue<string>());
        Assert.NotNull(labels["Triaged"]);
    }
}
