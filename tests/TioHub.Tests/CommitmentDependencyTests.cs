using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Notifications;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A114: forecast rules of commitment dependencies, without a database.</summary>
public class DependencyForecastTests
{
    // The owner's example: the external party delivers 11 Dec, we need 7 days, the client is promised 20 Dec.
    private static readonly DateTimeOffset Now = new(2026, 11, 13, 9, 0, 0, TimeSpan.Zero);
    private static readonly DateTimeOffset ClientDue = new(2026, 12, 20, 13, 0, 0, TimeSpan.Zero);

    private static DependencyFact Dep(DateTimeOffset due, CommitmentStatus status = CommitmentStatus.Open, DateTimeOffset? completed = null, int lead = 7, long id = 9) =>
        new(1, id, "CM-" + id, "Pilot capability", CommitmentDirection.External, "Example Supplier GmbH", status, due, completed, "Europe/Berlin", lead, "Integration and SIT");

    private static DependencyForecast Forecast(params DependencyFact[] deps) => DependencyRules.Compute(CommitmentStatus.Open, ClientDue, "Asia/Dubai", deps, Now, 2)!;

    [Fact]
    public void On_time_with_two_days_of_buffer_is_on_track()
    {
        var f = Forecast(Dep(new DateTimeOffset(2026, 12, 11, 16, 0, 0, TimeSpan.Zero)));
        Assert.Equal(DependencyHealth.OnTrack, f.Health);
        Assert.Equal(2, f.BufferDays);
        Assert.Equal(new DateTimeOffset(2026, 12, 18, 16, 0, 0, TimeSpan.Zero), f.ForecastAt);
        Assert.Equal(ClientDue.AddDays(-7), f.NeededBy);
        Assert.Contains("can slip up to 2 days", f.Message);
    }

    [Fact]
    public void Less_buffer_than_the_warning_is_at_risk()
    {
        var f = Forecast(Dep(new DateTimeOffset(2026, 12, 12, 13, 0, 0, TimeSpan.Zero)));
        Assert.Equal(DependencyHealth.AtRisk, f.Health);
        Assert.Equal(1, f.BufferDays);
        Assert.Equal(9, f.CauseCommitmentId);
    }

    [Fact]
    public void A_delivery_moved_past_the_needed_by_date_will_be_late()
    {
        var f = Forecast(Dep(new DateTimeOffset(2026, 12, 15, 16, 0, 0, TimeSpan.Zero)));
        Assert.Equal(DependencyHealth.WillBeLate, f.Health);
        Assert.Equal(new DateTimeOffset(2026, 12, 22, 16, 0, 0, TimeSpan.Zero), f.ForecastAt);
        Assert.Contains("forecast 22 Dec 2026", f.Message);
        Assert.Contains("2 days after the deadline", f.Message);
        Assert.Equal(-2, f.BufferDays);
    }

    [Fact]
    public void A_cancelled_dependency_blocks()
    {
        var f = Forecast(Dep(new DateTimeOffset(2026, 12, 11, 16, 0, 0, TimeSpan.Zero), CommitmentStatus.Cancelled));
        Assert.Equal(DependencyHealth.Blocked, f.Health);
        Assert.Null(f.ForecastAt);
        Assert.Contains("was cancelled", f.Message);
    }

    [Fact]
    public void An_overdue_dependency_is_expected_no_earlier_than_now()
    {
        var due = new DateTimeOffset(2026, 12, 20, 13, 0, 0, TimeSpan.Zero);
        var f = DependencyRules.Compute(CommitmentStatus.Open, due, "UTC", [Dep(Now.AddDays(-3), lead: 2)], Now, 2)!;
        Assert.Equal(Now.AddDays(2), f.ForecastAt);
        Assert.Equal(DependencyHealth.AtRisk, f.Health);
        Assert.Equal("Overdue", f.Dependencies.Single().State);
    }

    [Fact]
    public void A_delivered_dependency_counts_from_its_delivery()
    {
        var delivered = new DateTimeOffset(2026, 12, 9, 10, 0, 0, TimeSpan.Zero);
        var f = Forecast(Dep(new DateTimeOffset(2026, 12, 11, 16, 0, 0, TimeSpan.Zero), CommitmentStatus.Completed, delivered));
        Assert.Equal(DependencyHealth.OnTrack, f.Health);
        Assert.Equal(delivered.AddDays(7), f.ForecastAt);
        Assert.Equal("Delivered", f.Dependencies.Single().State);
    }

    [Fact]
    public void The_latest_dependency_decides_the_forecast()
    {
        var f = Forecast(Dep(new DateTimeOffset(2026, 12, 5, 16, 0, 0, TimeSpan.Zero), id: 1), Dep(new DateTimeOffset(2026, 12, 16, 16, 0, 0, TimeSpan.Zero), lead: 3, id: 2));
        Assert.Equal(new DateTimeOffset(2026, 12, 19, 16, 0, 0, TimeSpan.Zero), f.ForecastAt);
        Assert.Equal(DependencyHealth.AtRisk, f.Health);
        Assert.Equal(2, f.CauseCommitmentId);
    }

    [Fact]
    public void A_finished_commitment_has_no_health()
    {
        var f = DependencyRules.Compute(CommitmentStatus.Completed, ClientDue, "UTC", [Dep(ClientDue.AddDays(5))], Now, 2)!;
        Assert.Null(f.Health);
        Assert.Null(DependencyRules.Compute(CommitmentStatus.Open, ClientDue, "UTC", [], Now, 2));
    }

    [Fact]
    public void Lateness_is_attributed_to_the_dependency_that_went_past_the_deadline()
    {
        var done = ClientDue.AddDays(2);
        var late = Dep(ClientDue.AddDays(-5), CommitmentStatus.Completed, ClientDue.AddDays(-5), lead: 7, id: 4);
        var early = Dep(ClientDue.AddDays(-20), CommitmentStatus.Completed, ClientDue.AddDays(-20), lead: 7, id: 5);
        Assert.Equal(4, DependencyRules.LateCause(ClientDue, [late, early], done));
        Assert.Null(DependencyRules.LateCause(ClientDue, [early], done));
    }

    [Fact]
    public void A_title_comes_from_the_first_line_of_the_description_when_none_is_sent()
    {
        Assert.Equal("Explicit", CommitmentEndpoints.TitleOf(" Explicit ", "ignored"));
        Assert.Equal("Send the report", CommitmentEndpoints.TitleOf(null, "\r\n  Send the report\r\nwith details"));
        Assert.Equal(200, CommitmentEndpoints.TitleOf(null, new string('x', 300))!.Length);
        Assert.Null(CommitmentEndpoints.TitleOf("", " "));
    }
}

/// <summary>A114: External commitments, dependencies, their rights, history, completion and notifications, through the API.</summary>
[Collection("hub")]
public class CommitmentDependencyTests(HubFactory hub) : Scenario(hub)
{
    private async Task<long> PartyAsync(Api m, string? name = null)
    {
        var r = await m.Post("/commitments/external-parties", new { name = name ?? U("Example Supplier") });
        Assert.True(r.Status is HttpStatusCode.Created or HttpStatusCode.OK, r.Text);
        return r.Body!["id"]!.GetValue<long>();
    }

    private async Task<(Api M, long Client, long External, long Ours)> ChainAsync(int externalInDays, int oursInDays, int lead)
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await Hub.ClientId("DEMO-NTA");
        var party = await PartyAsync(m);
        var ext = await m.Create("/commitments", new { scope = "Client", clientId = client, direction = "External", externalOrganizationId = party, title = U("Pilot capability"), type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(externalInDays, 12), timeZone = "UTC" });
        var ours = await m.Create("/commitments", new { scope = "Client", clientId = client, title = U("Deliver pilot"), description = "Integrated pilot", type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(oursInDays, 12), timeZone = "UTC" });
        var r = await m.Post($"/commitments/{ours}/dependencies", new { dependsOnCommitmentId = ext, leadTimeDays = lead, note = "Integration and SIT" }, await m.Version($"/commitments/{ours}"));
        Assert.Equal(HttpStatusCode.NoContent, r.Status);
        return (m, client, ext, ours);
    }

    private static string? Health(Res detail) => detail.Body!["forecast"]?["health"]?.GetValue<string>();

    [Fact]
    public async Task An_external_commitment_needs_an_external_party_and_takes_its_name()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await Hub.ClientId("DEMO-NTA");
        var missing = await m.Post("/commitments", new { scope = "Client", clientId = client, direction = "External", title = "No party", type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "UTC" });
        Assert.NotNull(missing.Error("externalOrganizationId"));
        var name = U("Example Supplier");
        var party = await PartyAsync(m, name);
        Assert.Equal(party, await PartyAsync(m, name));   // the same name is not added twice
        var id = await m.Create("/commitments", new { scope = "Client", clientId = client, direction = "External", externalOrganizationId = party, title = "Cameras", type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "Europe/Berlin" });
        var c = (await m.Get($"/commitments/{id}")).Body!;
        Assert.Equal("External", c["direction"]!.GetValue<string>());
        Assert.Equal(name, c["externalParty"]!["name"]!.GetValue<string>());
        Assert.Equal("Vendor", c["responsibleParty"]!.GetValue<string>());
        var ours = await m.Post("/commitments", new { scope = "Client", clientId = client, externalOrganizationId = party, title = "Ours", type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "UTC" });
        Assert.NotNull(ours.Error("externalOrganizationId"));
        var list = await m.Get($"/commitments?direction=External&externalOrganizationId={party}");
        Assert.Equal(id, list.Body!["items"]!.AsArray().Single()!["id"]!.GetValue<long>());
    }

    [Fact]
    public async Task A_title_is_required_and_older_clients_get_one_from_the_description()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await Hub.ClientId("DEMO-NTA");
        Assert.NotNull((await m.Post("/commitments", new { scope = "Client", clientId = client, type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "UTC" })).Error("title"));
        var id = await m.Create("/commitments", new { scope = "Client", clientId = client, description = "Send the report\nwith all details", type = "CustomerUpdate", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "UTC" });
        var c = (await m.Get($"/commitments/{id}")).Body!;
        Assert.Equal("Send the report", c["title"]!.GetValue<string>());
        Assert.Equal("Send the report\nwith all details", c["description"]!.GetValue<string>());
    }

    [Fact]
    public async Task A_dependency_gives_the_forecast_and_the_health()
    {
        var (m, _, ext, ours) = await ChainAsync(externalInDays: 10, oursInDays: 20, lead: 7);
        var d = await m.Get($"/commitments/{ours}");
        Assert.Equal("OnTrack", Health(d));
        Assert.Equal(3, d.Body!["forecast"]!["bufferDays"]!.GetValue<int>());
        var dep = d.Body["forecast"]!["dependencies"]!.AsArray().Single()!;
        Assert.Equal(ext, dep["commitmentId"]!.GetValue<long>());
        Assert.Equal(7, dep["leadTimeDays"]!.GetValue<int>());
        var up = await m.Get($"/commitments/{ext}");
        Assert.Equal(ours, up.Body!["dependents"]!.AsArray().Single()!["id"]!.GetValue<long>());
        Assert.Contains(d.Body["events"]!.AsArray(), e => e!["type"]!.GetValue<string>() == "DependencyAdded");

        // The external party moves its date past the needed-by date: the client deadline is forecast late, and does not move by itself.
        var moved = await m.Post($"/commitments/{ext}/revise", new { dueLocal = Future(16, 12), timeZone = "UTC", reason = "Firmware certification delayed" }, await m.Version($"/commitments/{ext}"));
        Assert.Equal(HttpStatusCode.NoContent, moved.Status);
        d = await m.Get($"/commitments/{ours}");
        Assert.Equal("WillBeLate", Health(d));
        Assert.Equal(0, d.Body!["revisionCount"]!.GetValue<int>());
        var risky = await m.Get("/commitments?health=risk&pageSize=100");
        Assert.Contains(risky.Body!["items"]!.AsArray(), r => r!["id"]!.GetValue<long>() == ours && r["health"]!.GetValue<string>() == "WillBeLate");
        Assert.DoesNotContain(risky.Body["items"]!.AsArray(), r => r!["id"]!.GetValue<long>() == ext);

        // Revising the client deadline can name the dependency as the cause.
        var revised = await m.Post($"/commitments/{ours}/revise", new { dueLocal = Future(24, 12), timeZone = "UTC", reason = "Supplier slipped", causeCommitmentId = ext }, await m.Version($"/commitments/{ours}"));
        Assert.Equal(HttpStatusCode.NoContent, revised.Status);
        d = await m.Get($"/commitments/{ours}");
        var ev = d.Body!["events"]!.AsArray().Last(e => e!["type"]!.GetValue<string>() == "Revised")!;
        Assert.Equal(ext, ev["causeCommitmentId"]!.GetValue<long>());
        Assert.StartsWith("CM-", ev["causeRef"]!.GetValue<string>());
        Assert.NotNull((await m.Post($"/commitments/{ours}/revise", new { dueLocal = Future(25, 12), timeZone = "UTC", reason = "x", causeCommitmentId = ours }, await m.Version($"/commitments/{ours}"))).Error("causeCommitmentId"));

        // Cancelling the external commitment blocks the one that waits for it.
        await m.Post($"/commitments/{ext}/cancel", new { reason = "Supplier withdrew" }, await m.Version($"/commitments/{ext}"));
        Assert.Equal("Blocked", Health(await m.Get($"/commitments/{ours}")));
    }

    [Fact]
    public async Task Self_links_other_scopes_duplicates_and_loops_are_refused()
    {
        var (m, _, ext, ours) = await ChainAsync(10, 20, 2);
        async Task<string?> Link(long from, long to) => (await m.Post($"/commitments/{from}/dependencies", new { dependsOnCommitmentId = to, leadTimeDays = 1 }, await m.Version($"/commitments/{from}"))).Error("dependsOnCommitmentId");
        Assert.Contains("itself", await Link(ours, ours));
        Assert.Contains("already exists", await Link(ours, ext));
        Assert.Contains("loop", await Link(ext, ours));
        var other = await m.Create("/commitments", new { scope = "Client", clientId = await Hub.ClientId("DEMO-HCP"), title = "Other client", type = "Delivery", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "UTC" });
        Assert.Contains("same client", await Link(ours, other));
        Assert.NotNull((await m.Post($"/commitments/{ours}/dependencies", new { dependsOnCommitmentId = ext, leadTimeDays = 400 }, await m.Version($"/commitments/{ours}"))).Error("leadTimeDays"));
        var options = await m.Get($"/commitments/{ext}/dependency-options");
        Assert.DoesNotContain(options.Body!["items"]!.AsArray(), o => o!["id"]!.GetValue<long>() == ours);
    }

    [Fact]
    public async Task Removing_a_dependency_needs_a_reason_and_is_kept_in_the_history()
    {
        var (m, _, _, ours) = await ChainAsync(10, 20, 2);
        var depId = (await m.Get($"/commitments/{ours}")).Body!["forecast"]!["dependencies"]!.AsArray().Single()!["dependencyId"]!.GetValue<long>();
        var edited = await m.Put($"/commitments/{ours}/dependencies/{depId}", new { leadTimeDays = 5, note = "Longer SIT" }, await m.Version($"/commitments/{ours}"));
        Assert.Equal(HttpStatusCode.NoContent, edited.Status);
        Assert.NotNull((await m.Post($"/commitments/{ours}/dependencies/{depId}/remove", new { reason = "" }, await m.Version($"/commitments/{ours}"))).Error("reason"));
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/commitments/{ours}/dependencies/{depId}/remove", new { reason = "Delivered by another route" }, await m.Version($"/commitments/{ours}"))).Status);
        var d = (await m.Get($"/commitments/{ours}")).Body!;
        Assert.Null(d["forecast"]);
        Assert.Contains(d["events"]!.AsArray(), e => e!["type"]!.GetValue<string>() == "DependencyRemoved" && e["reason"]!.GetValue<string>().Contains("Delivered by another route"));
    }

    [Fact]
    public async Task Completing_before_a_dependency_is_delivered_needs_a_reason_and_late_completion_names_the_cause()
    {
        var (m, _, ext, ours) = await ChainAsync(10, 20, 2);
        var early = await m.Post($"/commitments/{ours}/complete", new { completedAt = DateTimeOffset.UtcNow.AddMinutes(-1) }, await m.Version($"/commitments/{ours}"));
        Assert.Contains("not yet delivered", early.Error("reason"));

        // Put the chain in the past: the external party delivered late, and so did we.
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var due = DateTimeOffset.UtcNow.AddDays(-3);
            await db.Commitments.IgnoreQueryFilters().Where(c => c.Id == ours).ExecuteUpdateAsync(s => s.SetProperty(c => c.CurrentDueAt, due).SetProperty(c => c.OriginalDueAt, due));
        }
        await m.Post($"/commitments/{ext}/complete", new { completedAt = DateTimeOffset.UtcNow.AddDays(-2), evidence = "Delivery note" }, await m.Version($"/commitments/{ext}"));
        var done = await m.Post($"/commitments/{ours}/complete", new { completedAt = DateTimeOffset.UtcNow.AddMinutes(-1) }, await m.Version($"/commitments/{ours}"));
        Assert.Equal(HttpStatusCode.NoContent, done.Status);
        var d = (await m.Get($"/commitments/{ours}")).Body!;
        Assert.Equal("Completed late", d["timeliness"]!.GetValue<string>());
        Assert.Equal(ext, d["lateCause"]!["id"]!.GetValue<long>());
        await m.Post($"/commitments/{ours}/reopen", new { reason = "Acceptance failed" }, await m.Version($"/commitments/{ours}"));
        Assert.Null((await m.Get($"/commitments/{ours}")).Body!["lateCause"]);
        var reliability = await m.Get("/commitments/external-reliability");
        Assert.Equal(HttpStatusCode.OK, reliability.Status);
        Assert.NotEmpty(reliability.Body!["items"]!.AsArray());
    }

    [Fact]
    public async Task Linking_needs_the_maintain_right_and_adding_an_external_party_the_structure_create_right()
    {
        var (_, _, ext, ours) = await ChainAsync(10, 20, 2);
        // A person who may read commitments but not maintain them or add organizations.
        var m = await Hub.As(HubFactory.Manager);
        var roleId = await m.Create("/admin/roles", new { name = U("A114"), rights = Fixture.Rights(["Commitments:View", "Commitments:DetailsView"], Flag.None) });
        var account = $@"DEV\{U("a114")}";
        await m.Create("/admin/users", new { accountName = account, displayName = "A114 reader", workingTimeZone = "UTC", allClients = true, allInternal = true, roleId });
        var viewer = await Hub.As(account);
        Assert.Equal(HttpStatusCode.OK, (await viewer.Get($"/commitments/{ours}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await viewer.Get("/commitments/external-parties")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Post($"/commitments/{ours}/dependencies", new { dependsOnCommitmentId = ext, leadTimeDays = 1 }, await viewer.Version($"/commitments/{ours}"))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Get($"/commitments/{ours}/dependency-options")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Post("/commitments/external-parties", new { name = U("Blocked supplier") })).Status);
    }

    [Fact]
    public async Task The_owner_and_the_project_manager_are_told_when_a_dependency_puts_the_deadline_at_risk()
    {
        var (m, client, ext, ours) = await ChainAsync(10, 12, 7);
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        var clientOwner = await db.Clients.IgnoreQueryFilters().Where(c => c.Id == client).Select(c => c.OwnerUserId).SingleAsync();
        await NotificationScanner.ScanAsync(db, DateTimeOffset.UtcNow, default);
        var notices = await db.Notifications.Where(n => n.Link == $"/commitments/{ours}" && n.Kind == NotificationKinds.ForecastLate && n.ResolvedAt == null).ToListAsync();
        Assert.Contains(notices, n => n.UserId == m.UserId);
        if (clientOwner is { } pm) Assert.Contains(notices, n => n.UserId == pm);
        Assert.Contains("forecast late", notices[0].Title);

        // Once the dependency is removed, the alert resolves at the next scan.
        var depId = (await m.Get($"/commitments/{ours}")).Body!["forecast"]!["dependencies"]!.AsArray().Single()!["dependencyId"]!.GetValue<long>();
        await m.Post($"/commitments/{ours}/dependencies/{depId}/remove", new { reason = "Not needed" }, await m.Version($"/commitments/{ours}"));
        await NotificationScanner.ScanAsync(db, DateTimeOffset.UtcNow, default);
        Assert.False(await db.Notifications.AnyAsync(n => n.Link == $"/commitments/{ours}" && n.Kind == NotificationKinds.ForecastLate && n.ResolvedAt == null));
        Assert.Equal(NotificationSeverity.Critical, NotificationSeverity.Of(NotificationKinds.ForecastLate));
        Assert.Equal(NotificationSeverity.Action, NotificationSeverity.Of(NotificationKinds.AtRisk));
        _ = ext;
    }

    [Fact]
    public async Task Deleting_with_everything_takes_the_links_and_keeps_the_waiting_commitment()
    {
        var (m, _, ext, ours) = await ChainAsync(10, 20, 2);
        var preview = await m.Get($"/dependents/commitments/{ext}");
        Assert.Equal(HttpStatusCode.OK, preview.Status);
        var del = await m.Send(HttpMethod.Delete, $"/dependents/commitments/{ext}?expected={preview.Body!["total"]!.GetValue<int>()}");
        Assert.Equal(HttpStatusCode.OK, del.Status);
        var d = await m.Get($"/commitments/{ours}");
        Assert.Equal(HttpStatusCode.OK, d.Status);
        Assert.Null(d.Body!["forecast"]);
    }

    [Fact]
    public async Task Deleting_a_commitment_removes_its_links()
    {
        var (m, _, ext, ours) = await ChainAsync(10, 20, 2);
        var del = await m.Send(HttpMethod.Delete, $"/commitments/{ext}");
        Assert.True(del.Status is HttpStatusCode.NoContent or HttpStatusCode.OK, del.Text);
        var d = (await m.Get($"/commitments/{ours}")).Body!;
        Assert.Null(d["forecast"]);
        Assert.All(d["events"]!.AsArray(), e => Assert.Null(e!["causeCommitmentId"]?.GetValue<long?>()));
    }
}
