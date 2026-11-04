using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Data;

namespace TioHub.Tests;

/// <summary>A91: a commitment can be completed early. The time must fall between its creation and now; timeliness is derived, never validated.</summary>
[Collection("hub")]
public class CommitmentCompletionTests(HubFactory hub) : Scenario(hub)
{
    /// <summary>A commitment with a chosen creation time and deadline, as if it had been recorded earlier.</summary>
    private async Task<(Api Api, long Id, DateTimeOffset Created)> CommitmentAsync(DateTimeOffset due, int createdDaysAgo = 10)
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await Hub.ClientId("DEMO-NTA");
        var id = await m.Create("/commitments", new { scope = "Client", clientId = client, description = U("Early completion"), type = "CustomerUpdate", ownerUserId = m.UserId, dueLocal = Future(5), timeZone = "UTC" });
        var created = DateTimeOffset.UtcNow.AddDays(-createdDaysAgo);
        using var scope = Hub.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
        await db.Commitments.IgnoreQueryFilters().Where(c => c.Id == id).ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatedAt, created).SetProperty(c => c.OriginalDueAt, due).SetProperty(c => c.CurrentDueAt, due));
        return (m, id, created);
    }

    private static async Task<Res> CompleteAsync(Api m, long id, DateTimeOffset at) => await m.Post($"/commitments/{id}/complete", new { completedAt = at, evidence = "mail" }, await m.Version($"/commitments/{id}"));

    private static string Text(Res r, string field) => r.Body![field]!.GetValue<string>();

    [Fact]
    public async Task Completion_before_the_deadline_is_accepted_and_on_time()
    {
        var (m, id, _) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(8));
        var at = DateTimeOffset.UtcNow.AddMinutes(-5);
        var saved = await CompleteAsync(m, id, at);
        Assert.Null(saved.Error("completedAt"));
        var c = await m.Get($"/commitments/{id}");
        Assert.Equal("Completed", Text(c, "status"));
        Assert.Equal("Completed on time", Text(c, "timeliness"));
        Assert.Equal("OnTime", Text(c, "originalDeadlineResult"));
        Assert.Equal(at, c.Body!["completedAt"]!.GetValue<DateTimeOffset>());
    }

    [Fact]
    public async Task Completion_exactly_at_the_deadline_is_on_time()
    {
        var due = DateTimeOffset.UtcNow.AddDays(-1);
        var (m, id, _) = await CommitmentAsync(due);
        await CompleteAsync(m, id, due);
        var c = await m.Get($"/commitments/{id}");
        Assert.Equal("Completed on time", Text(c, "timeliness"));
        Assert.Equal("OnTime", Text(c, "originalDeadlineResult"));
    }

    [Fact]
    public async Task Completion_after_the_deadline_stays_completed_and_is_late()
    {
        var (m, id, _) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(-2));
        await CompleteAsync(m, id, DateTimeOffset.UtcNow.AddDays(-1));
        var c = await m.Get($"/commitments/{id}");
        Assert.Equal("Completed", Text(c, "status"));
        Assert.Equal("Completed late", Text(c, "timeliness"));
        Assert.Equal("Late", Text(c, "originalDeadlineResult"));
    }

    [Fact]
    public async Task A_future_completion_is_refused()
    {
        var (m, id, _) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(8));
        Assert.Contains("future", (await CompleteAsync(m, id, DateTimeOffset.UtcNow.AddHours(2))).Error("completedAt"));
        Assert.Equal("Open", Text(await m.Get($"/commitments/{id}"), "status"));
    }

    [Fact]
    public async Task A_completion_before_the_commitment_was_created_is_refused_early_or_late()
    {
        var (m, id, created) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(8));
        Assert.Contains("created", (await CompleteAsync(m, id, created.AddDays(-1))).Error("completedAt"));
        var (m2, id2, created2) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(-20));
        Assert.Contains("created", (await CompleteAsync(m2, id2, created2.AddDays(-1))).Error("completedAt"));
    }

    [Fact]
    public async Task A_completion_in_the_same_minute_as_creation_is_accepted()
    {
        // The form sends minutes, so a commitment created at 14:05:30 and completed at once arrives as 14:05:00.
        var (m, id, created) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(8));
        Assert.Null((await CompleteAsync(m, id, created.AddSeconds(-30))).Error("completedAt"));
    }

    [Fact]
    public async Task A_revised_deadline_keeps_both_results_apart()
    {
        // Late against the original deadline, on time against the later deadline in force.
        var (m, id, _) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(-5));
        await m.Ok($"/commitments/{id}/revise", new { dueLocal = Future(3), timeZone = "UTC", reason = "Customer agreed a later date" }, await m.Version($"/commitments/{id}"));
        await CompleteAsync(m, id, DateTimeOffset.UtcNow.AddDays(-1));
        var c = await m.Get($"/commitments/{id}");
        Assert.Equal("Completed on time", Text(c, "timeliness"));
        Assert.Equal("Late", Text(c, "originalDeadlineResult"));
        Assert.Equal(c.Body!["currentDueAt"]!.GetValue<DateTimeOffset>(), c.Body!["dueAtCompletion"]!.GetValue<DateTimeOffset>());

        // On time against the original deadline, late against an earlier deadline in force.
        var (m2, id2, _) = await CommitmentAsync(DateTimeOffset.UtcNow.AddDays(8));
        await m2.Ok($"/commitments/{id2}/revise", new { dueLocal = Future(-3), timeZone = "UTC", reason = "Customer brought the date forward" }, await m2.Version($"/commitments/{id2}"));
        await CompleteAsync(m2, id2, DateTimeOffset.UtcNow.AddDays(-1));
        var c2 = await m2.Get($"/commitments/{id2}");
        Assert.Equal("Completed late", Text(c2, "timeliness"));
        Assert.Equal("OnTime", Text(c2, "originalDeadlineResult"));
    }
}
