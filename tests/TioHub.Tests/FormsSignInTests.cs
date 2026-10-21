using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.SqlClient;

namespace TioHub.Tests;

/// <summary>The real API in forms sign-in mode against an empty database (no demo data), as a fresh production installation.</summary>
public sealed class FormsFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly string _db = "TioHub_Forms_" + Guid.NewGuid().ToString("N")[..8];
    private static string SqlServer => Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
    public string ConnectionString => $"Server={SqlServer};Database={_db};Trusted_Connection=True;TrustServerCertificate=True";
    public string SetupFile { get; } = Path.Combine(Path.GetTempPath(), $"tiohub-setup-{Guid.NewGuid():N}.txt");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:TioHub", ConnectionString);
        builder.UseSetting("Auth:Mode", "Forms");
        builder.UseSetting("Auth:LockoutAttempts", "3");
        builder.UseSetting("Auth:SetupCodeFile", SetupFile);
        builder.UseSetting("Auth:CacheSeconds", "5");
        builder.UseSetting("Database:ApplyMigrationsOnStartup", "true");
        builder.UseSetting("Database:SeedDevelopmentData", "false");
        builder.UseSetting("Quality:ScanMinutes", "0");
        builder.UseSetting("Serilog:MinimumLevel:Default", "Warning");
    }

    /// <summary>A browser-like session: cookies kept, the readable XSRF token echoed on every change.</summary>
    public async Task<Session> NewSession()
    {
        var s = new Session(CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true, AllowAutoRedirect = false }));
        await s.Send(HttpMethod.Get, "/auth/config");
        return s;
    }

    public async Task<long> Scalar(string sql)
    {
        await using var c = new SqlConnection(ConnectionString);
        await c.OpenAsync();
        await using var cmd = c.CreateCommand();
        cmd.CommandText = sql;
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        if (File.Exists(SetupFile)) File.Delete(SetupFile);
        SqlConnection.ClearAllPools();
        await using var conn = new SqlConnection($"Server={SqlServer};Database=master;Trusted_Connection=True;TrustServerCertificate=True");
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"IF DB_ID('{_db}') IS NOT NULL BEGIN ALTER DATABASE [{_db}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{_db}]; END";
        await cmd.ExecuteNonQueryAsync();
    }
}

public sealed class Session(HttpClient http)
{
    private string? _xsrf;
    public bool SendToken { get; set; } = true;

    public async Task<Res> Send(HttpMethod method, string path, object? body = null, string? ifMatch = null)
    {
        var req = new HttpRequestMessage(method, "/api/v1" + path);
        if (body is not null) req.Content = JsonContent.Create(body);
        if (SendToken && _xsrf is not null && method != HttpMethod.Get) req.Headers.Add("X-XSRF-TOKEN", _xsrf);
        if (ifMatch is not null) req.Headers.IfMatch.Add(new System.Net.Http.Headers.EntityTagHeaderValue($"\"{ifMatch}\""));
        var res = await http.SendAsync(req);
        if (res.Headers.TryGetValues("Set-Cookie", out var cookies))
            foreach (var c in cookies.Where(c => c.StartsWith("XSRF-TOKEN=")))
                _xsrf = Uri.UnescapeDataString(c.Split(';')[0]["XSRF-TOKEN=".Length..]);
        var text = await res.Content.ReadAsStringAsync();
        JsonNode? json = null;
        if (text.Length > 0 && (res.Content.Headers.ContentType?.MediaType?.Contains("json") ?? false)) json = JsonNode.Parse(text);
        return new Res(res.StatusCode, json, res.Headers.ETag?.Tag.Trim('"'), text);
    }

    public Task<Res> Get(string path) => Send(HttpMethod.Get, path);
    public Task<Res> Post(string path, object? body = null, string? ifMatch = null) => Send(HttpMethod.Post, path, body ?? new { }, ifMatch);
    public Task<Res> Login(string account, string password) => Post("/auth/login", new { accountName = account, password });
}

/// <summary>ACC-01 / IAM-03 with forms sign-in: setup, passwords, lockout, sessions, no hash anywhere outside the credential table.</summary>
public class FormsSignInTests(FormsFactory hub) : IClassFixture<FormsFactory>
{
    private const string AdminPw = "Correct horse battery 42", TempPw = "temporary-Blue-Lantern-7", ManagerPw = "my own passphrase 2026!";

    private static object NewUser(string account, string role) => new
    {
        accountName = account, displayName = "UAT " + role, email = (string?)null, workingTimeZone = "Asia/Dubai", roles = new[] { role }, allClients = true, allInternal = true,
        export = true, technicalDetail = true, audit = true, scopes = Array.Empty<object>()
    };

    [Fact]
    public async Task Forms_sign_in_from_an_empty_installation_to_a_working_manager()
    {
        // ---- empty installation: setup required, nothing reachable without a session ----
        var anon = await hub.NewSession();
        var cfg = await anon.Get("/auth/config");
        Assert.Equal("Forms", cfg.Body!["mode"]!.GetValue<string>());
        Assert.True(cfg.Body["setupRequired"]!.GetValue<bool>());
        Assert.True(File.Exists(hub.SetupFile));
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.Get("/me")).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.Get("/clients")).Status);
        Assert.Equal(0, await hub.Scalar("SELECT COUNT(*) FROM clients.Client"));
        // The SPA shell (no data) loads on any deep link without a session, so the sign-in page can show.
        foreach (var page in new[] { "/login", "/clients", "/account/password" })
        {
            var html = await hub.CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false }).GetAsync(page);
            Assert.Equal(HttpStatusCode.OK, html.StatusCode);
            Assert.Equal("text/html", html.Content.Headers.ContentType?.MediaType);
        }

        // ---- one-time setup: wrong code and weak password refused, then the first administrator ----
        var bad = await anon.Post("/auth/setup", new { setupCode = "WRONG", accountName = "hub.admin", displayName = "Hub Admin", password = "short" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.Status);
        Assert.NotNull(bad.Body!["errors"]!["setupCode"]);
        Assert.NotNull(bad.Body["errors"]!["password"]);
        var code = await File.ReadAllTextAsync(hub.SetupFile);
        var admin = anon;
        var setup = await admin.Post("/auth/setup", new { setupCode = code.ToLowerInvariant(), accountName = "hub.admin", displayName = "Hub Admin", password = AdminPw, timeZone = "Asia/Dubai" });
        Assert.Equal(HttpStatusCode.OK, setup.Status);
        Assert.False(File.Exists(hub.SetupFile));
        var me = (await admin.Get("/me")).Body!;
        Assert.Equal("hub.admin", me["account"]!.GetValue<string>());
        Assert.Equal(["TIO Manager"], me["roles"]!.AsArray().Select(r => r!.GetValue<string>()));
        Assert.Contains("Administer", me["rights"]!.AsArray().Select(r => r!.GetValue<string>()));
        Assert.Equal("Manager", me["businessRole"]!.GetValue<string>());
        // A44: the setting-up computer's time zone becomes the administrator's and the hub default (the shipped default was UTC).
        Assert.Equal("Asia/Dubai", me["timeZone"]!.GetValue<string>());
        Assert.Contains((await admin.Get("/admin/settings")).Body!.AsArray(), x => x!["key"]!.GetValue<string>() == "DefaultTimeZone" && x["value"]!.GetValue<string>() == "Asia/Dubai");
        Assert.Equal(HttpStatusCode.Conflict, (await (await hub.NewSession()).Post("/auth/setup", new { setupCode = code, accountName = "x.admin", displayName = "X", password = AdminPw })).Status);
        Assert.False((await (await hub.NewSession()).Get("/auth/config")).Body!["setupRequired"]!.GetValue<bool>());

        // ---- administrator creates a Manager and issues a temporary password; never for themselves ----
        var managerId = (await admin.Post("/admin/users", NewUser("uat.manager", "Manager"))).Body!["id"]!.GetValue<long>();
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.Post($"/admin/users/{managerId}/password", new { temporaryPassword = "uat.manager-12345" })).Status); // contains the account name
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Post($"/admin/users/{managerId}/password", new { temporaryPassword = TempPw })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await admin.Post($"/admin/users/{me["id"]!.GetValue<long>()}/password", new { temporaryPassword = TempPw })).Status);
        var status = (await admin.Get("/admin/users/sign-in-status")).Body!.AsArray();
        Assert.Equal("TemporaryPassword", status.First(s => s!["userId"]!.GetValue<long>() == managerId)!["state"]!.GetValue<string>());

        // ---- generic failures: wrong password and unknown account look the same ----
        var s1 = await hub.NewSession();
        var wrong = await s1.Login("uat.manager", "not the password at all");
        var unknown = await s1.Login("nobody.here", "not the password at all");
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.Status);
        Assert.Equal(wrong.Body!["detail"]!.GetValue<string>(), unknown.Body!["detail"]!.GetValue<string>());

        // ---- temporary password: signed in, but only /me and password change until it is replaced ----
        var mgr = await hub.NewSession();
        Assert.True((await mgr.Login("uat.manager", TempPw)).Body!["mustChangePassword"]!.GetValue<bool>());
        Assert.True((await mgr.Get("/me")).Body!["app"]!["mustChangePassword"]!.GetValue<bool>());
        var blocked = await mgr.Get("/clients");
        Assert.Equal(HttpStatusCode.Forbidden, blocked.Status);
        Assert.Equal("Password change required", blocked.Body!["title"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await mgr.Post("/auth/password", new { currentPassword = "wrong one entirely", newPassword = ManagerPw })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await mgr.Post("/auth/password", new { currentPassword = TempPw, newPassword = TempPw })).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await mgr.Post("/auth/password", new { currentPassword = TempPw, newPassword = ManagerPw })).Status);
        Assert.Equal(HttpStatusCode.OK, (await mgr.Get("/clients")).Status);
        Assert.Equal("Manager", (await mgr.Get("/me")).Body!["businessRole"]!.GetValue<string>());

        // ---- a password change ends the account's other sessions ----
        var other = await hub.NewSession();
        Assert.Equal(HttpStatusCode.OK, (await other.Login("uat.manager", ManagerPw)).Status);
        Assert.Equal(HttpStatusCode.OK, (await other.Get("/me")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await mgr.Post("/auth/password", new { currentPassword = ManagerPw, newPassword = ManagerPw + "x" })).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await other.Get("/me")).Status);
        Assert.Equal(HttpStatusCode.OK, (await mgr.Get("/me")).Status);

        // ---- antiforgery on sign-in and sign-out ----
        var noToken = await hub.NewSession();
        noToken.SendToken = false;
        Assert.Equal(HttpStatusCode.BadRequest, (await noToken.Login("uat.manager", ManagerPw + "x")).Status);

        // ---- lockout after 3 failures, even for the right password; an administrator reset clears it ----
        var attacker = await hub.NewSession();
        for (var i = 0; i < 3; i++) await attacker.Login("uat.manager", "guess number " + i + " wrong");
        Assert.Equal(HttpStatusCode.Unauthorized, (await attacker.Login("uat.manager", ManagerPw + "x")).Status);
        Assert.Equal(1, await hub.Scalar("SELECT COUNT(*) FROM audit.AuditEntry WHERE Action = 'SignInLocked'"));
        Assert.Equal("Locked", (await admin.Get("/admin/users/sign-in-status")).Body!.AsArray().First(s => s!["userId"]!.GetValue<long>() == managerId)!["state"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.OK, (await mgr.Get("/me")).Status); // a lock blocks new sign-ins, not the owner's open session
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Post($"/admin/users/{managerId}/password", new { temporaryPassword = TempPw })).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await mgr.Get("/me")).Status); // reset ended the session
        var again = await hub.NewSession();
        Assert.True((await again.Login("uat.manager", TempPw)).Body!["mustChangePassword"]!.GetValue<bool>());

        // ---- sign-out ends the session; a deactivated account cannot sign in ----
        Assert.Equal(HttpStatusCode.NoContent, (await again.Post("/auth/logout")).Status);
        Assert.Equal(HttpStatusCode.Unauthorized, (await again.Get("/me")).Status);
        var version = (await admin.Get($"/admin/users/{managerId}")).ETag;
        Assert.True((await admin.Post($"/admin/users/{managerId}/deactivate", new { reason = "Left the UAT" }, version)).Status is HttpStatusCode.OK or HttpStatusCode.NoContent);
        Assert.Equal(HttpStatusCode.Unauthorized, (await (await hub.NewSession()).Login("uat.manager", TempPw)).Status);

        // ---- the hash exists only in the credential table: never in audit, user APIs or the session cookie ----
        Assert.Equal(0, await hub.Scalar("SELECT COUNT(*) FROM audit.AuditEntry WHERE Changes LIKE '%pbkdf2%' OR Changes LIKE '%PasswordHash%' OR Changes LIKE '%" + TempPw + "%'"));
        Assert.Equal(2, await hub.Scalar("SELECT COUNT(*) FROM iam.UserCredential WHERE PasswordHash LIKE 'pbkdf2-sha256$600000$%'"));
        var users = await admin.Get("/admin/users");
        Assert.DoesNotContain("pbkdf2", users.Text);
        Assert.DoesNotContain("pbkdf2", (await admin.Get("/admin/users/sign-in-status")).Text);
        // Setup 1 + issued 1 + changed 2 + reset 1, each without any value.
        Assert.Equal(5, await hub.Scalar("SELECT COUNT(*) FROM audit.AuditEntry WHERE Action IN ('FirstAdministratorSetUp','PasswordIssued','PasswordChanged','PasswordReset') AND Changes IS NULL"));
    }
}
