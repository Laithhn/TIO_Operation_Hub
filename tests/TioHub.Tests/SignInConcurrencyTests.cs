using System.Net;
using Microsoft.Data.SqlClient;

namespace TioHub.Tests;

/// <summary>
/// The first requests of a new session run in parallel (the SPA's start-up calls) and each records the sign-in on the same user row.
/// A read must never fail because another of these requests saved that row first (412 seen in Playwright on 29 Oct 2026).
/// </summary>
[Collection("hub")]
public class SignInConcurrencyTests(HubFactory hub)
{
    private const int Parallel = 8;

    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";

    private async Task<HttpStatusCode[]> FirstRequestsAsync(string account, string groups)
    {
        // A new client and a group set not seen before: no cached snapshot, so every request resolves the user from the database.
        var http = hub.CreateClient();
        http.DefaultRequestHeaders.Add("X-Test-User", account);
        http.DefaultRequestHeaders.Add("X-Test-Groups", groups);
        var paths = new[] { "/me", "/clients", "/me", "/clients", "/me", "/clients", "/me", "/clients" };
        var responses = await Task.WhenAll(paths.Take(Parallel).Select(p => http.GetAsync("/api/v1" + p)));
        return responses.Select(r => r.StatusCode).ToArray();
    }

    [Fact]
    public async Task Parallel_first_reads_of_an_existing_user_all_succeed_while_the_sign_in_is_recorded()
    {
        Assert.Equal(HttpStatusCode.OK, (await hub.As(HubFactory.Viewer)).SignInStatus); // host started, data seeded
        for (var round = 0; round < 5; round++)
        {
            await using (var c = new SqlConnection(hub.ConnectionString))
            {
                await c.OpenAsync();
                await using var cmd = new SqlCommand("UPDATE iam.[User] SET LastSignInAt = NULL WHERE AccountName = @a", c);
                cmd.Parameters.AddWithValue("@a", HubFactory.Viewer);
                Assert.Equal(1, await cmd.ExecuteNonQueryAsync());
            }
            var statuses = await FirstRequestsAsync(HubFactory.Viewer, $@"DEV\{Unique("unmapped")}");
            Assert.All(statuses, s => Assert.Equal(HttpStatusCode.OK, s));
        }
        await using var check = new SqlConnection(hub.ConnectionString);
        await check.OpenAsync();
        await using var read = new SqlCommand("SELECT LastSignInAt FROM iam.[User] WHERE AccountName = @a", check);
        read.Parameters.AddWithValue("@a", HubFactory.Viewer);
        Assert.IsType<DateTimeOffset>(await read.ExecuteScalarAsync());
    }

    [Fact]
    public async Task Parallel_first_reads_of_a_mapped_account_provision_it_once_and_all_succeed()
    {
        var admin = await hub.As(HubFactory.Admin);
        var group = $@"DEV\{Unique("Hub-Engineers")}";
        await admin.Create("/admin/group-mappings", new { groupName = group, role = "Engineer", allClients = true, allInternal = false, export = false, technicalDetail = false, audit = false, scopes = Array.Empty<object>() });
        for (var round = 0; round < 3; round++)
        {
            var account = $@"DEV\{Unique("first-timer")}";
            var statuses = await FirstRequestsAsync(account, group);
            Assert.All(statuses, s => Assert.Equal(HttpStatusCode.OK, s));
            await using var c = new SqlConnection(hub.ConnectionString);
            await c.OpenAsync();
            await using var cmd = new SqlCommand("SELECT COUNT(*) FROM iam.[User] WHERE AccountName = @a", c);
            cmd.Parameters.AddWithValue("@a", account);
            Assert.Equal(1, (int)(await cmd.ExecuteScalarAsync())!);
        }
    }
}
