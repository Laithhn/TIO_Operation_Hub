using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Notifications;

namespace TioHub.Tests;

/// <summary>
/// A72: read state and business resolution are separate; reminders return after RemindAfterHours; severity, entity, filters, counters,
/// batch read and per-user isolation of the notifications list.
/// </summary>
[Collection("hub")]
public class A72_NotificationLifecycle(HubFactory hub) : Scenario(hub)
{
    private async Task Scan(DateTimeOffset at, int remindAfterHours = NotificationScanner.DefaultRemindAfterHours)
    {
        using var scope = Hub.Services.CreateScope();
        await NotificationScanner.ScanAsync(scope.ServiceProvider.GetRequiredService<HubDbContext>(), at, CancellationToken.None, remindAfterHours);
    }

    private async Task Db(Func<HubDbContext, Task> action)
    {
        using var scope = Hub.Services.CreateScope();
        await action(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    private static JsonNode? Find(Res r, string link) => r.Body!["items"]!.AsArray().FirstOrDefault(n => n!["link"]?.GetValue<string>() == link && n["kind"]!.GetValue<string>() == "Overdue");

    /// <summary>An open commitment owned by the engineer, made overdue in the database (the API refuses past due dates).</summary>
    private async Task<long> OverdueCommitment(string description)
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var id = await m.Create("/commitments", new { scope = "Internal", responsibleTeamId = await Team(), description, type = "Other", ownerUserId = e.UserId, dueLocal = Future(3, 9), timeZone = "UTC" });
        await Db(db => db.Commitments.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.CurrentDueAt, DateTimeOffset.UtcNow.AddDays(-1))));
        return id;
    }

    [Fact]
    public async Task Reading_does_not_resolve_and_resolving_does_not_change_the_read_state()
    {
        var e = await Hub.As(HubFactory.Engineer);
        var id = await OverdueCommitment(U("Lifecycle"));
        var link = $"/commitments/{id}";
        await Scan(DateTimeOffset.UtcNow);

        // A critical, open, unread alert about a commitment.
        var all = await e.Get("/notifications?pageSize=200&sort=severity");
        var notice = Find(all, link)!;
        Assert.Equal("critical", notice["severity"]!.GetValue<string>());
        Assert.Equal("Commitment", notice["entityType"]!.GetValue<string>());
        Assert.Null(notice["readAt"]);
        Assert.Null(notice["resolvedAt"]);
        Assert.True(all.Body!["criticalCount"]!.GetValue<int>() >= 1);
        Assert.Equal("critical", all.Body!["items"]!.AsArray()[0]!["severity"]!.GetValue<string>());   // severity first
        var nid = Id(notice);

        // Read: still open, no longer unread.
        await e.Ok($"/notifications/{nid}/read");
        Assert.Null(Find(await e.Get("/notifications?unread=true&pageSize=200"), link));
        var open = Find(await e.Get("/notifications?state=open&severity=critical&pageSize=200"), link)!;
        Assert.NotNull(open["readAt"]);
        Assert.Null(open["resolvedAt"]);

        // Default (owner choice): the next scan reminds at once — the same notice is unread again while the commitment is overdue.
        await Scan(DateTimeOffset.UtcNow);
        Assert.Equal(nid, Id(Find(await e.Get("/notifications?unread=true&pageSize=200"), link)));

        // With Notifications:RemindAfterHours = 24 it stays read until it has been read for a day.
        await e.Ok($"/notifications/{nid}/read");
        await Scan(DateTimeOffset.UtcNow, remindAfterHours: 24);
        Assert.Null(Find(await e.Get("/notifications?unread=true&pageSize=200"), link));
        await Scan(DateTimeOffset.UtcNow.AddHours(25), remindAfterHours: 24);
        Assert.Equal(nid, Id(Find(await e.Get("/notifications?unread=true&pageSize=200"), link)));

        // The commitment is completed: the alert is resolved, its read state untouched, and it no longer counts as unread.
        var before = (await e.Get("/notifications/unread-count")).Body!["count"]!.GetValue<int>();
        await Db(db => db.Commitments.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CommitmentStatus.Completed)));
        await Scan(DateTimeOffset.UtcNow);
        var resolved = Find(await e.Get("/notifications?state=resolved&pageSize=200"), link)!;
        Assert.NotNull(resolved["resolvedAt"]);
        Assert.Null(resolved["readAt"]);
        Assert.Null(Find(await e.Get("/notifications?unread=true&pageSize=200"), link));
        Assert.Equal(before - 1, (await e.Get("/notifications/unread-count")).Body!["count"]!.GetValue<int>());
        Assert.Null(Find(await e.Get("/notifications?severity=critical&state=open&pageSize=200"), link));

        // Reading a resolved alert is allowed and keeps it resolved; when the condition returns it opens again, unread.
        await e.Ok($"/notifications/{nid}/read");
        Assert.NotNull(Find(await e.Get("/notifications?state=resolved&pageSize=200"), link)!["readAt"]);
        await Db(db => db.Commitments.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CommitmentStatus.Open)));
        await Scan(DateTimeOffset.UtcNow);
        var reopened = Find(await e.Get("/notifications?unread=true&pageSize=200"), link)!;
        Assert.Equal(nid, Id(reopened));
        Assert.Null(reopened["resolvedAt"]);
        await Db(db => db.Commitments.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CommitmentStatus.Cancelled)));
        await Scan(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task Batch_read_filters_and_search_touch_only_the_callers_notices()
    {
        var e = await Hub.As(HubFactory.Engineer);
        var m = await Hub.As(HubFactory.Manager);
        var desc = U("Searchable");
        var id = await OverdueCommitment(desc);
        await Scan(DateTimeOffset.UtcNow);
        var mine = Find(await e.Get($"/notifications?q={desc}&pageSize=50"), $"/commitments/{id}")!;
        Assert.Single((await e.Get($"/notifications?q={desc}&pageSize=50")).Body!["items"]!.AsArray());

        // The manager's own unread notice and the engineer's notice in one batch: only the caller's row changes.
        await Db(async db =>
        {
            db.Notifications.Add(new Notification { UserId = m.UserId, Kind = "Assigned", Title = "Fictional manager notice", Link = "/clients/1", Key = U("test"), CreatedAt = DateTimeOffset.UtcNow });
            await db.SaveChangesAsync();
        });
        var managerNotice = (await m.Get("/notifications?q=Fictional manager notice&pageSize=50")).Body!["items"]!.AsArray().Single()!;
        Assert.Equal("info", managerNotice["severity"]!.GetValue<string>());
        Assert.Equal("Client", managerNotice["entityType"]!.GetValue<string>());
        var batch = await e.Post("/notifications/read", new { ids = new[] { Id(mine), Id(managerNotice) } });
        Assert.Equal(1, batch.Body!["marked"]!.GetValue<int>());
        Assert.Null((await m.Get("/notifications?q=Fictional manager notice&pageSize=50")).Body!["items"]!.AsArray().Single()!["readAt"]);
        // Another person's notice is never listed or marked through a single-notice call either.
        Assert.DoesNotContain((await e.Get("/notifications?pageSize=200")).Body!["items"]!.AsArray(), x => Id(x) == Id(managerNotice));
        await e.Ok($"/notifications/{Id(managerNotice)}/read");
        Assert.Null((await m.Get("/notifications?q=Fictional manager notice&pageSize=50")).Body!["items"]!.AsArray().Single()!["readAt"]);

        // Invalid filters and batches are refused with a field error.
        Assert.NotNull((await e.Post("/notifications/read", new { ids = Array.Empty<long>() })).Error("ids"));
        Assert.NotNull((await e.Get("/notifications?severity=urgent")).Error("severity"));
        Assert.NotNull((await e.Get("/notifications?state=closed")).Error("state"));
        Assert.Equal(HttpStatusCode.OK, (await e.Get("/notifications?severity=info&state=open")).Status);
        await Db(db => db.Commitments.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.Status, CommitmentStatus.Cancelled)));
        await Scan(DateTimeOffset.UtcNow);
    }

    [Fact]
    public void Severity_and_entity_follow_the_kind_and_link()
    {
        Assert.Equal("critical", NotificationSeverity.Of(NotificationKinds.PaymentOverdue));
        Assert.Equal("action", NotificationSeverity.Of(NotificationKinds.Renewal));
        Assert.Equal("info", NotificationSeverity.Of("Report"));
        Assert.Equal("Payment", NotificationSeverity.EntityOf(NotificationKinds.PaymentDue, "/contracts/3"));
        Assert.Equal("Contract", NotificationSeverity.EntityOf(NotificationKinds.Renewal, "/contracts/3"));
        Assert.Equal("Client", NotificationSeverity.EntityOf(NotificationKinds.Assigned, "/clients/3"));
        Assert.Null(NotificationSeverity.EntityOf(NotificationKinds.Assigned, null));
    }
}
