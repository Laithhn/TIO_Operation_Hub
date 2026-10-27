using System.Net;

namespace TioHub.Tests;

[Collection("hub")]
public class Stage2WorkflowTests(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Blank_next_action_is_optional_through_case_lifecycle_but_progress_and_review_remain_required()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var team = await Team();
        var id = await NewCase(client, owner: manager.UserId, nextAction: null);
        Task<string> Version() => manager.Version($"/cases/{id}");
        await manager.Ok($"/cases/{id}/triage", new { responsibleTeamId = team, impactSummary = "Confirmed impact", priority = "Normal", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await Version());
        Assert.Equal("", (await manager.Get($"/cases/{id}")).Body!["nextAction"]!.GetValue<string>());
        await manager.Ok($"/cases/{id}/start", new { }, await Version());

        var missing = await manager.Post($"/cases/{id}/progress", new { nextAction = "" }, await Version());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, missing.Status);
        Assert.NotNull(missing.Error("progressSummary"));
        Assert.NotNull(missing.Error("nextReviewAt"));
        Assert.Null(missing.Error("nextAction"));
        await manager.Ok($"/cases/{id}/progress", new { progressSummary = "Work completed", nextAction = "   ", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await Version());
        var noRequest = await manager.Post($"/cases/{id}/request-validation", new { progressSummary = "Delivery complete" }, await Version());
        Assert.NotNull(noRequest.Error("validationRequest")); // Meaningful validation instructions are still required.
        await manager.Ok($"/cases/{id}/request-validation", new { progressSummary = "Delivery complete", validationRequest = "Confirm the restored imports" }, await Version());
        await manager.Ok($"/cases/{id}/close", new { outcome = "Imports restored", validationEvidence = "Customer confirmed recovery" }, await Version());
        await manager.Ok($"/cases/{id}/reopen", new { reason = "Issue returned", nextAction = (string?)null, nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await Version());
        var reopened = (await manager.Get($"/cases/{id}")).Body!;
        Assert.Equal("Triaged", reopened["status"]!.GetValue<string>());
        Assert.Equal("", reopened["nextAction"]!.GetValue<string>());
        Assert.Equal(1, reopened["reopenCount"]!.GetValue<int>());
    }

    [Fact]
    public async Task Optional_next_action_can_be_cleared_but_length_limit_is_preserved()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var id = await NewCase(await NewClient(), owner: manager.UserId);
        var oversized = await manager.Post($"/cases/{id}/progress", new { progressSummary = "Updated", nextAction = new string('x', 1001), nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await manager.Version($"/cases/{id}"));
        Assert.NotNull(oversized.Error("nextAction"));
        await manager.Ok($"/cases/{id}/progress", new { progressSummary = "No further action pending", nextAction = "  ", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await manager.Version($"/cases/{id}"));
        Assert.Equal("", (await manager.Get($"/cases/{id}")).Body!["nextAction"]!.GetValue<string>());
    }

    [Fact]
    public async Task Triage_cannot_promote_backup_without_changing_the_backup_assignment()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var backup = await Hub.As(HubFactory.Engineer);
        var client = await NewClient();
        var team = await Team();
        var id = await manager.Create("/cases", new { title = U("Backup"), type = "Incident", scope = "Client", clientId = client, responsibleTeamId = team,
            impactSummary = "Coverage must remain real", priority = "Critical", ownerUserId = manager.UserId, backupOwnerUserId = backup.UserId, nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
        var invalid = await manager.Post($"/cases/{id}/triage", new { responsibleTeamId = team, impactSummary = "Confirmed", priority = "Critical", ownerUserId = backup.UserId, nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await manager.Version($"/cases/{id}"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, invalid.Status);
        Assert.Contains("Assign owner", invalid.Error("ownerUserId"));
        var unchanged = (await manager.Get($"/cases/{id}")).Body!;
        Assert.Equal("New", unchanged["status"]!.GetValue<string>());
        Assert.Equal(manager.UserId, unchanged["owner"]!["id"]!.GetValue<long>());
        Assert.Equal(backup.UserId, unchanged["backupOwner"]!["id"]!.GetValue<long>());

        await manager.Ok($"/cases/{id}/assign", new { ownerUserId = backup.UserId, backupOwnerUserId = manager.UserId, reason = "Swap coverage" }, await manager.Version($"/cases/{id}"));
        await manager.Ok($"/cases/{id}/triage", new { responsibleTeamId = team, impactSummary = "Confirmed", priority = "Critical", ownerUserId = backup.UserId, nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, await manager.Version($"/cases/{id}"));
        var valid = (await manager.Get($"/cases/{id}")).Body!;
        Assert.Equal(backup.UserId, valid["owner"]!["id"]!.GetValue<long>());
        Assert.Equal(manager.UserId, valid["backupOwner"]!["id"]!.GetValue<long>());
    }

    private async Task<(long Id, string Account)> Receiver()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var account = $@"DEV\{U("receiver")}";
        var id = await manager.Create("/admin/users", new { accountName = account, displayName = U("Receiver"), workingTimeZone = "UTC", roles = new[] { "Engineer" } });
        return (id, account);
    }

    private static object Exception(Api manager) => new { reason = "Receiver travelling", followUpOwnerId = manager.UserId, followUpDate = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd") };

    private static Task<long> Handover(Api manager, long receiver, params long[] cases) => manager.Create("/handovers", new
    {
        outgoingOwnerId = manager.UserId, receivingOwnerId = receiver, effectiveAt = DateTimeOffset.UtcNow, summary = "Operational coverage",
        items = cases.Select(id => new { recordType = "Case", recordId = id }).ToArray()
    });

    [Fact]
    public async Task Manager_exception_rejects_deactivated_receiver_without_partial_changes()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var receiver = await Receiver();
        var client = await NewClient();
        var first = await NewCase(client, owner: manager.UserId);
        var second = await NewCase(client, owner: manager.UserId);
        var handover = await Handover(manager, receiver.Id, first, second);
        await manager.Ok($"/admin/users/{receiver.Id}/deactivate", new { reason = "Left team" }, await manager.Version($"/admin/users/{receiver.Id}"));
        var rejected = await manager.Post($"/handovers/{handover}/exception", Exception(manager), await manager.Version($"/handovers/{handover}"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, rejected.Status);
        Assert.NotNull(rejected.Error("receivingOwnerId"));
        foreach (var id in new[] { first, second }) Assert.Equal(manager.UserId, (await manager.Get($"/cases/{id}")).Body!["owner"]!["id"]!.GetValue<long>());
        await AssertPending(manager, handover);
    }

    [Fact]
    public async Task Revoked_business_role_blocks_acknowledgement_and_manager_exception_even_with_stored_scope()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var receiver = await Receiver();
        var receiverApi = await Hub.As(receiver.Account); // Warm the sign-in cache before revocation.
        var id = await NewCase(await NewClient(), owner: manager.UserId);
        var handover = await Handover(manager, receiver.Id, id);
        var updated = await manager.Put($"/admin/users/{receiver.Id}", new { displayName = "Role removed", workingTimeZone = "UTC", roles = Array.Empty<string>(), allClients = true, allInternal = true }, await manager.Version($"/admin/users/{receiver.Id}"));
        Assert.Equal(HttpStatusCode.NoContent, updated.Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await receiverApi.Post($"/handovers/{handover}/acknowledge", new { }, await manager.Version($"/handovers/{handover}"))).Status);
        var rejected = await manager.Post($"/handovers/{handover}/exception", Exception(manager), await manager.Version($"/handovers/{handover}"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, rejected.Status);
        Assert.NotNull(rejected.Error("items[0]"));
        Assert.Equal(manager.UserId, (await manager.Get($"/cases/{id}")).Body!["owner"]!["id"]!.GetValue<long>());
        await AssertPending(manager, handover);
    }

    private static async Task AssertPending(Api manager, long id)
    {
        var row = (await manager.Get($"/handovers/{id}")).Body!;
        Assert.Equal("PendingAcknowledgment", row["status"]!.GetValue<string>());
        Assert.Null(row["completedAt"]);
        Assert.Null(row["exception"]);
        Assert.All(row["items"]!.AsArray(), item => Assert.False(item!["applied"]!.GetValue<bool>()));
    }

    [Fact]
    public async Task Eligible_receiver_can_acknowledge_and_backup_is_cleared_when_promoted()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var receiver = await Receiver();
        var team = await Team();
        var id = await manager.Create("/cases", new { title = U("Handover backup"), type = "Incident", scope = "Client", clientId = await NewClient(), responsibleTeamId = team,
            impactSummary = "Coverage", priority = "Critical", ownerUserId = manager.UserId, backupOwnerUserId = receiver.Id, nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
        var handover = await Handover(manager, receiver.Id, id);
        var receiving = await Hub.As(receiver.Account);
        await receiving.Ok($"/handovers/{handover}/acknowledge", new { note = "Accepted" }, await receiving.Version($"/handovers/{handover}"));
        var c = (await manager.Get($"/cases/{id}")).Body!;
        Assert.Equal(receiver.Id, c["owner"]!["id"]!.GetValue<long>());
        Assert.Null(c["backupOwner"]);
        Assert.Contains(c["events"]!.AsArray(), e => e!["type"]!.GetValue<string>() == "OwnerChanged" && e["note"]!.GetValue<string>().StartsWith("Handover"));
        Assert.Equal("Completed", (await manager.Get($"/handovers/{handover}")).Body!["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task Handover_preserves_changed_owner_skip_policy_but_roleless_recipient_cannot_complete_skipped_handover()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var receiver = await Receiver();
        var alternate = await Hub.As(HubFactory.Engineer2);
        var id = await NewCase(await NewClient(), owner: manager.UserId);
        var handover = await Handover(manager, receiver.Id, id);
        await manager.Ok($"/cases/{id}/assign", new { ownerUserId = alternate.UserId, reason = "Reassigned outside this handover" }, await manager.Version($"/cases/{id}"));
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/admin/users/{receiver.Id}", new { displayName = "No role", workingTimeZone = "UTC", roles = Array.Empty<string>() }, await manager.Version($"/admin/users/{receiver.Id}"))).Status);
        var denied = await manager.Post($"/handovers/{handover}/exception", Exception(manager), await manager.Version($"/handovers/{handover}"));
        Assert.NotNull(denied.Error("receivingOwnerId"));
        await AssertPending(manager, handover);

        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/admin/users/{receiver.Id}", new { displayName = "Restored role", workingTimeZone = "UTC", roles = new[] { "Engineer" } }, await manager.Version($"/admin/users/{receiver.Id}"))).Status);
        await manager.Ok($"/handovers/{handover}/exception", Exception(manager), await manager.Version($"/handovers/{handover}"));
        var completed = (await manager.Get($"/handovers/{handover}")).Body!;
        Assert.Equal("CompletedByException", completed["status"]!.GetValue<string>());
        Assert.False(completed["items"]![0]!["applied"]!.GetValue<bool>());
        Assert.Contains("owner changed", completed["items"]![0]!["notAppliedReason"]!.GetValue<string>());
        Assert.Equal(alternate.UserId, (await manager.Get($"/cases/{id}")).Body!["owner"]!["id"]!.GetValue<long>());
    }

    private static object Escalation(Api manager, long client, DateTimeOffset receivedAt, long? owner = null) => new
    {
        clientId = client, title = "Workflow chronology", channel = "Email", ownerUserId = owner ?? manager.UserId, receivedAt,
        responseDueAt = receivedAt.AddHours(3), resolutionDueAt = receivedAt.AddDays(1)
    };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Communications_reject_before_receipt_and_future_times_but_accept_receipt_boundary(bool outgoing)
    {
        var manager = await Hub.As(HubFactory.Manager);
        var receivedAt = DateTimeOffset.UtcNow.AddHours(-1);
        var id = await manager.Create("/escalations", Escalation(manager, await NewClient(), receivedAt));
        var before = await manager.Post($"/escalations/{id}/communications", new { channel = "Email", outgoing, at = receivedAt.AddTicks(-1), note = "Too early" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, before.Status);
        Assert.NotNull(before.Error("at"));
        Assert.NotNull((await manager.Post($"/escalations/{id}/communications", new { channel = "Email", outgoing, at = DateTimeOffset.UtcNow.AddMinutes(6), note = "Future" })).Error("at"));
        var unchanged = (await manager.Get($"/escalations/{id}")).Body!;
        Assert.Equal("Open", unchanged["status"]!.GetValue<string>());
        Assert.Null(unchanged["acknowledgedAt"]);
        Assert.Single(unchanged["events"]!.AsArray());
        await manager.Ok($"/escalations/{id}/communications", new { channel = "Email", outgoing, at = receivedAt, note = "At receipt" });
        var valid = (await manager.Get($"/escalations/{id}")).Body!;
        Assert.Equal(outgoing ? "Acknowledged" : "Open", valid["status"]!.GetValue<string>());
        if (outgoing) Assert.Equal(receivedAt, valid["acknowledgedAt"]!.GetValue<DateTimeOffset>());
    }

    [Fact]
    public async Task Receipt_can_be_corrected_with_creation_event_but_cannot_cross_an_existing_communication()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var received = DateTimeOffset.UtcNow.AddHours(-3);
        var id = await manager.Create("/escalations", Escalation(manager, client, received));
        var corrected = received.AddHours(1);
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/escalations/{id}", Escalation(manager, client, corrected), await manager.Version($"/escalations/{id}"))).Status);
        var row = (await manager.Get($"/escalations/{id}")).Body!;
        Assert.Equal(corrected, row["events"]![0]!["at"]!.GetValue<DateTimeOffset>());
        var communicationAt = corrected.AddMinutes(30);
        await manager.Ok($"/escalations/{id}/communications", new { channel = "Email", outgoing = false, at = communicationAt, note = "Customer update" });
        var rejected = await manager.Put($"/escalations/{id}", Escalation(manager, client, communicationAt.AddTicks(1)), await manager.Version($"/escalations/{id}"));
        Assert.NotNull(rejected.Error("receivedAt"));
        Assert.Equal(corrected, (await manager.Get($"/escalations/{id}")).Body!["receivedAt"]!.GetValue<DateTimeOffset>());
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/escalations/{id}", Escalation(manager, client, communicationAt), await manager.Version($"/escalations/{id}"))).Status);
    }

    [Fact]
    public async Task Receipt_cannot_move_after_lifecycle_history_and_future_receipt_cannot_be_acknowledged_early()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var id = await manager.Create("/escalations", Escalation(manager, client, DateTimeOffset.UtcNow.AddMinutes(1)));
        Assert.NotNull((await manager.Post($"/escalations/{id}/communications", new { channel = "Email", note = "Early acknowledgement" })).Error("at"));
        Assert.NotNull((await manager.Post($"/escalations/{id}/status", new { status = "Acknowledged" })).Error("status"));
        Assert.NotNull((await manager.Post($"/escalations/{id}/raise-level", new { note = "Early level change" })).Error("note"));
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/escalations/{id}", Escalation(manager, client, DateTimeOffset.UtcNow.AddHours(-1)), await manager.Version($"/escalations/{id}"))).Status);
        await manager.Ok($"/escalations/{id}/status", new { status = "Resolved", resolutionSummary = "Restored" });
        await manager.Ok($"/escalations/{id}/status", new { status = "Closed" });
        var rejected = await manager.Put($"/escalations/{id}", Escalation(manager, client, DateTimeOffset.UtcNow.AddMinutes(1)), await manager.Version($"/escalations/{id}"));
        Assert.NotNull(rejected.Error("receivedAt"));
        Assert.Equal("Closed", (await manager.Get($"/escalations/{id}")).Body!["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task Owner_change_cannot_create_history_before_an_unchanged_future_receipt()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var alternate = await Hub.As(HubFactory.Engineer);
        var client = await NewClient();
        var received = DateTimeOffset.UtcNow.AddMinutes(1);
        var id = await manager.Create("/escalations", Escalation(manager, client, received));
        var rejected = await manager.Put($"/escalations/{id}", Escalation(manager, client, received, alternate.UserId), await manager.Version($"/escalations/{id}"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, rejected.Status);
        Assert.NotNull(rejected.Error("receivedAt"));
        var row = (await manager.Get($"/escalations/{id}")).Body!;
        Assert.Equal(manager.UserId, row["owner"]!["id"]!.GetValue<long>());
        Assert.Single(row["events"]!.AsArray());
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/escalations/{id}", Escalation(manager, client, DateTimeOffset.UtcNow.AddMinutes(-1), alternate.UserId), await manager.Version($"/escalations/{id}"))).Status);
    }
}
