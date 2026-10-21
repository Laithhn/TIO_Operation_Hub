using System.Diagnostics;
using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;
using Xunit.Abstractions;

namespace TioHub.Tests;

/// <summary>AC-15 recovery: back up the database, restore it into an isolated database, and verify sign-in, scope, records and audit there.</summary>
[Collection("hub")]
public class AC15_RestoreDrill(HubFactory hub, ITestOutputHelper output)
{
    [Fact]
    public async Task Backup_restores_into_an_isolated_database_with_sign_in_scope_records_and_audit()
    {
        var m = await hub.As(HubFactory.Manager);
        _ = await m.Get("/clients"); // ensure seeded
        var source = new SqlConnectionStringBuilder(hub.ConnectionString);
        var restored = source.InitialCatalog + "_Restore";
        var file = Path.Combine(Path.GetTempPath(), $"{source.InitialCatalog}.bak");
        var master = new SqlConnectionStringBuilder(hub.ConnectionString) { InitialCatalog = "master" }.ConnectionString;
        var sw = Stopwatch.StartNew();
        await using (var c = new SqlConnection(master))
        {
            await c.OpenAsync();
            await Exec(c, $"BACKUP DATABASE [{source.InitialCatalog}] TO DISK = N'{file}' WITH INIT, COPY_ONLY");
            var files = new List<(string Logical, string Type)>();
            await using (var cmd = new SqlCommand($"RESTORE FILELISTONLY FROM DISK = N'{file}'", c))
            await using (var r = await cmd.ExecuteReaderAsync())
                while (await r.ReadAsync()) files.Add((r.GetString(0), r.GetString(2)));
            var dir = Path.GetTempPath();
            var moves = string.Join(", ", files.Select(f => $"MOVE N'{f.Logical}' TO N'{Path.Combine(dir, restored + (f.Type == "L" ? "_log.ldf" : ".mdf"))}'"));
            await Exec(c, $"RESTORE DATABASE [{restored}] FROM DISK = N'{file}' WITH {moves}, REPLACE");
        }
        var restoreTime = sw.Elapsed;
        try
        {
            var restoredCs = new SqlConnectionStringBuilder(hub.ConnectionString) { InitialCatalog = restored }.ConnectionString;
            await using var app = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            {
                b.UseEnvironment("Testing");
                b.UseSetting("ConnectionStrings:TioHub", restoredCs);
                b.UseSetting("Auth:Mode", "Development");
                b.UseSetting("Database:ApplyMigrationsOnStartup", "true");
                b.UseSetting("Database:SeedDevelopmentData", "false");
                b.UseSetting("Quality:ScanMinutes", "0");
            });
            async Task<HttpResponseMessage> As(string user, string path)
            {
                var http = app.CreateClient();
                http.DefaultRequestHeaders.Add("X-Test-User", user);
                return await http.GetAsync("/api/v1" + path);
            }
            // Sign-in works and scope is preserved after restore.
            Assert.Equal(HttpStatusCode.OK, (await As(HubFactory.Manager, "/me")).StatusCode);
            var scoped = await (await As(HubFactory.Engineer2, "/clients?pageSize=200")).Content.ReadAsStringAsync();
            Assert.Contains("DEMO-HCP", scoped);
            Assert.Contains("DEMO-NTA", scoped);
            Assert.Equal(HttpStatusCode.Forbidden, (await As(@"DEV\former", "/clients")).StatusCode); // deactivation survives the restore
            // Records and audit match the source.
            foreach (var table in new[] { "clients.Client", "env.Environment", "work.[Case]", "work.Commitment", "audit.AuditEntry" })
                Assert.Equal(await Count(hub.ConnectionString, table), await Count(restoredCs, table));
            output.WriteLine($"Restore drill: backup + restore took {restoreTime.TotalSeconds:0.0} s; sign-in, scope, records and audit verified.");
        }
        finally
        {
            SqlConnection.ClearAllPools();
            await using var c = new SqlConnection(master);
            await c.OpenAsync();
            await Exec(c, $"IF DB_ID('{restored}') IS NOT NULL BEGIN ALTER DATABASE [{restored}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{restored}]; END");
            File.Delete(file);
        }
    }

    private static async Task Exec(SqlConnection c, string sql)
    {
        await using var cmd = new SqlCommand(sql, c) { CommandTimeout = 300 };
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task<int> Count(string cs, string table)
    {
        await using var c = new SqlConnection(cs);
        await c.OpenAsync();
        await using var cmd = new SqlCommand($"SELECT COUNT(*) FROM {table}", c);
        return (int)(await cmd.ExecuteScalarAsync())!;
    }
}

/// <summary>
/// NFR-05 smoke: p95 of list/dashboard requests ≤ 3 s and saves ≤ 2 s, measured in-process (no user network) with 8 concurrent users
/// on the development data volume. Pilot volume and concurrency are an open decision; repeat with agreed figures before the pilot.
/// </summary>
[Collection("hub")]
public class AC15_PerformanceSmoke(HubFactory hub, ITestOutputHelper output)
{
    [Fact]
    public async Task Lists_dashboard_and_saves_meet_the_targets()
    {
        var m = await hub.As(HubFactory.Manager);
        var nta = await hub.ClientId("DEMO-NTA");
        var team = (await m.Get("/teams")).Body!.AsArray()[0]!["id"]!.GetValue<long>();
        string[] reads = ["/dashboard", "/dashboard/actions", "/cases", "/commitments", "/clients", "/environments", $"/clients/{nta}/overview", "/version-matrix", "/data-quality", "/search?q=PSOP"];
        var readTimes = new List<double>();
        var saveTimes = new List<double>();
        await Parallel.ForEachAsync(Enumerable.Range(0, 8), async (worker, ct) =>
        {
            for (var i = 0; i < 10; i++)
            {
                foreach (var path in reads)
                {
                    var sw = Stopwatch.StartNew();
                    var r = await m.Get(path);
                    sw.Stop();
                    Assert.Equal(HttpStatusCode.OK, r.Status);
                    lock (readTimes) readTimes.Add(sw.Elapsed.TotalMilliseconds);
                }
                var s = Stopwatch.StartNew();
                var created = await m.Post("/cases", new { title = $"Perf {worker}-{i}", type = "Request", scope = "Client", clientId = nta, responsibleTeamId = team, impactSummary = "x", priority = "Low", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
                s.Stop();
                Assert.Equal(HttpStatusCode.Created, created.Status);
                lock (saveTimes) saveTimes.Add(s.Elapsed.TotalMilliseconds);
            }
        });
        double P95(List<double> v) { var o = v.Order().ToList(); return o[(int)Math.Ceiling(o.Count * 0.95) - 1]; }
        output.WriteLine($"Reads: n={readTimes.Count}, p95={P95(readTimes):0} ms, max={readTimes.Max():0} ms. Saves: n={saveTimes.Count}, p95={P95(saveTimes):0} ms, max={saveTimes.Max():0} ms.");
        Assert.True(P95(readTimes) <= 3000, $"p95 read {P95(readTimes):0} ms");
        Assert.True(P95(saveTimes) <= 2000, $"p95 save {P95(saveTimes):0} ms");
    }
}
