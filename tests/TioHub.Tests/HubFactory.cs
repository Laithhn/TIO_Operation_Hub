using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;

namespace TioHub.Tests;

/// <summary>
/// The real API against a throwaway SQL Server (LocalDB by default) database, migrated and seeded with the fictional development data.
/// Sign-in uses the Testing-only X-Test-User header. Set TIOHUB_TEST_SQL to use another SQL Server.
/// </summary>
public sealed class HubFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public string AttachmentRoot { get; } = Path.Combine(Path.GetTempPath(), "tiohub-test-attachments", Guid.NewGuid().ToString("N"));
    public const string Manager = @"DEV\manager", Lead = @"DEV\lead", Engineer = @"DEV\engineer", Engineer2 = @"DEV\engineer2", Viewer = @"DEV\viewer", Admin = @"DEV\admin";
    private readonly string _db = "TioHub_Test_" + Guid.NewGuid().ToString("N")[..8];
    private static string SqlServer => Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
    public string ConnectionString => $"Server={SqlServer};Database={_db};Trusted_Connection=True;TrustServerCertificate=True";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:TioHub", ConnectionString);
        builder.UseSetting("Auth:Mode", "Development");
        builder.UseSetting("Auth:CacheSeconds", "5");
        builder.UseSetting("Database:ApplyMigrationsOnStartup", "true");
        builder.UseSetting("Database:SeedDevelopmentData", "true");
        builder.UseSetting("Quality:ScanMinutes", "0");
        // A46: attachment files of this test run go to their own temporary folder, 1 MB maximum so the limit can be tested.
        builder.UseSetting("Attachments:Path", AttachmentRoot);
        builder.UseSetting("Attachments:MaxFileMB", "1");
        builder.UseSetting("Serilog:MinimumLevel:Default", "Warning");
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        SqlConnection.ClearAllPools();
        await using var conn = new SqlConnection($"Server={SqlServer};Database=master;Trusted_Connection=True;TrustServerCertificate=True");
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"IF DB_ID('{_db}') IS NOT NULL BEGIN ALTER DATABASE [{_db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{_db}]; END";
        await cmd.ExecuteNonQueryAsync();
    }

    private readonly Dictionary<string, Api> _clients = [];

    /// <summary>A signed-in client for one account with the antiforgery token already fetched.</summary>
    public async Task<Api> As(string account, string? groups = null)
    {
        var key = groups is null ? account : $"{account}|{groups}";
        if (_clients.TryGetValue(key, out var cached)) return cached;
        var http = CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true });
        http.DefaultRequestHeaders.Add("X-Test-User", account);
        if (groups is not null) http.DefaultRequestHeaders.Add("X-Test-Groups", groups);
        var me = await http.GetAsync("/api/v1/me");
        var api = new Api(http, me.StatusCode);
        if (me.IsSuccessStatusCode)
        {
            var cookie = me.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("XSRF-TOKEN="));
            http.DefaultRequestHeaders.Add("X-XSRF-TOKEN", Uri.UnescapeDataString(cookie.Split(';')[0]["XSRF-TOKEN=".Length..]));
            api.Me = JsonNode.Parse(await me.Content.ReadAsStringAsync())!;
        }
        _clients[key] = api;
        return api;
    }

    public async Task<long> ClientId(string code)
    {
        var m = await As(Manager);
        var r = await m.Get($"/clients?q={code}");
        return r.Body!["items"]!.AsArray().First(x => x!["code"]!.GetValue<string>() == code)!["id"]!.GetValue<long>();
    }

    public async Task<long> UserId(string account)
    {
        var a = await As(Admin);
        var r = await a.Get("/admin/users");
        return r.Body!.AsArray().First(x => x!["accountName"]!.GetValue<string>() == account)!["id"]!.GetValue<long>();
    }
}

[CollectionDefinition("hub")]
public sealed class HubCollection : ICollectionFixture<HubFactory>;

public sealed class Api(HttpClient http, HttpStatusCode signIn)
{
    public HttpStatusCode SignInStatus { get; } = signIn;
    public JsonNode Me { get; set; } = new JsonObject();
    public HttpClient Http => http;
    public long UserId => Me["id"]!.GetValue<long>();

    public async Task<Res> Send(HttpMethod method, string path, object? body = null, string? ifMatch = null)
    {
        var req = new HttpRequestMessage(method, "/api/v1" + path);
        if (body is not null) req.Content = JsonContent.Create(body);
        if (ifMatch is not null) req.Headers.IfMatch.Add(new EntityTagHeaderValue($"\"{ifMatch}\""));
        var res = await http.SendAsync(req);
        var text = await res.Content.ReadAsStringAsync();
        JsonNode? json = null;
        if (text.Length > 0 && (res.Content.Headers.ContentType?.MediaType?.Contains("json") ?? false)) json = JsonNode.Parse(text);
        return new Res(res.StatusCode, json, res.Headers.ETag?.Tag.Trim('"'), text);
    }

    public Task<Res> Get(string path) => Send(HttpMethod.Get, path);
    public Task<Res> Post(string path, object? body = null, string? ifMatch = null) => Send(HttpMethod.Post, path, body ?? new { }, ifMatch);
    public Task<Res> Put(string path, object body, string? ifMatch = null) => Send(HttpMethod.Put, path, body, ifMatch);

    public async Task<long> Create(string path, object body)
    {
        var r = await Post(path, body);
        Assert.True(r.Status == HttpStatusCode.Created, $"POST {path} returned {(int)r.Status}: {r.Text}");
        return r.Body!["id"]!.GetValue<long>();
    }

    public async Task Ok(string path, object? body = null, string? ifMatch = null)
    {
        var r = await Post(path, body, ifMatch);
        Assert.True(r.Status is HttpStatusCode.NoContent or HttpStatusCode.OK or HttpStatusCode.Created, $"POST {path} returned {(int)r.Status}: {r.Text}");
    }

    public async Task<string> Version(string path) => (await Get(path)).ETag ?? throw new InvalidOperationException("No ETag on " + path);
}

public sealed record Res(HttpStatusCode Status, JsonNode? Body, string? ETag, string Text)
{
    public string? Error(string field) => Body?["errors"]?.AsObject().FirstOrDefault(e => string.Equals(e.Key, field, StringComparison.OrdinalIgnoreCase)).Value?[0]?.GetValue<string>();
    public long Id => Body!["id"]!.GetValue<long>();
    public int Total => Body!["totalCount"]!.GetValue<int>();
}
