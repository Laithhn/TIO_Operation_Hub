using Microsoft.AspNetCore.Hosting;
using System.Reflection;
using System.Text;
using TioHub.Api.Common;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;

namespace TioHub.Tests;

public class GuardTests
{
    [Theory]
    [InlineData("password=Sommer2026!", true)]
    [InlineData("api_key: 3f9a8b7c6d5e4f3a2b1c", true)]
    [InlineData("-----BEGIN RSA PRIVATE KEY-----", true)]
    [InlineData("Server=x;User Id=sa;Password=abc", true)]
    [InlineData("https://admin:hunter2@example.com/x", true)]
    [InlineData("ghp_abcdefghijklmnopqrstuvwxyz0123456789", true)]
    [InlineData("Restart the import service after the vendor patch", false)]
    [InlineData("See https://docs.example.com/runbook/nta-r1-production-import-service", false)]
    [InlineData("vault://demo/nta/r1/db01-service", false)]
    public void Credential_guard_flags_likely_secrets(string text, bool secret) => Assert.Equal(secret, CredentialGuard.LooksLikeSecret(text));

    [Theory]
    [InlineData("https://docs.example.com/a", null)]
    [InlineData("http://docs.example.com/a", "Only HTTPS links are allowed.")]
    [InlineData("https://evil.example.org/a", "evil.example.org is not an approved link host. Ask an administrator to approve it.")]
    [InlineData("https://user:pw@docs.example.com/a", "Links must not contain a user name or password.")]
    public void Link_guard_requires_https_approved_host_and_no_credentials(string url, string? problem) =>
        Assert.Equal(problem, LinkGuard.Problem(url, ["docs.example.com"]));

    [Fact]
    public void Link_guard_supports_wildcard_hosts() => Assert.Null(LinkGuard.Problem("https://a.b.example.net/x", ["*.example.net"]));

    [Theory]
    [InlineData("abc-123", "ABC-123", true)]
    [InlineData("ABC123", "ABC123", false)]
    [InlineData("1BC-1", "1BC-1", false)]
    public void Jira_keys_are_normalized_and_validated(string input, string normalized, bool valid)
    {
        Assert.Equal(normalized, JiraKeys.Normalize(input));
        Assert.Equal(valid, JiraKeys.IsValid(JiraKeys.Normalize(input)));
    }

    [Theory]
    [InlineData("https://jira.example.com/browse/ABC-1", "ABC-1", null)]
    [InlineData("https://jira.example.com/browse/ABC-2", "ABC-1", "The link must point to ABC-1.")]
    [InlineData("https://other.example.com/browse/ABC-1", "ABC-1", "other.example.com is not an approved link host. Ask an administrator to approve it.")]
    public void Jira_url_must_match_host_and_key(string url, string key, string? problem) => Assert.Equal(problem, JiraKeys.UrlProblem(url, key, "jira.example.com"));

    [Theory]
    [InlineData("10.0.0.1", "10.0.0.1")]
    [InlineData("10.0.0.0/24", "10.0.0.0/24")]
    [InlineData("10.0.0.0/33", null)]
    [InlineData("10.1", null)]
    [InlineData("fe80::1", "fe80::1")]
    [InlineData("not-an-ip", null)]
    public void Addresses_and_subnets_are_validated(string input, string? canonical) => Assert.Equal(canonical, NetCheck.Canonical(input));

    [Theory]
    [InlineData("443", "443", null)]
    [InlineData("8090-8080", null, "In “8090-8080” the range end is before its start.")]
    [InlineData("70000", null, "Ports must be between 1 and 65535.")]
    [InlineData("0", null, "Ports must be between 1 and 65535.")]
    [InlineData("443, 80,8080-8090", "80,443,8080-8090", null)]
    public void Ports_are_validated_1_to_65535(string input, string? formatted, string? error)
    {
        var (ranges, err) = NetCheck.Ports(input);
        Assert.Equal(error, err);
        if (formatted is not null) Assert.Equal(formatted, NetCheck.FormatPorts(ranges!));
    }

    [Theory]
    [InlineData("500GB ???", true)]
    [InlineData("TBD", true)]
    [InlineData("8 vCPU / 32 GB", false)]
    public void Placeholder_notation_is_flagged(string notation, bool flagged) => Assert.Equal(flagged, SourceNotation.HasPlaceholder(notation));
}

public class TimeZoneTests
{
    [Fact]
    public void Local_time_in_zone_converts_to_utc()
    {
        var check = new Check();
        var utc = Zones.ToUtc(check, "due", "2026-11-03T17:00", "Asia/Riyadh");
        Assert.False(check.HasErrors);
        Assert.Equal(new DateTimeOffset(2026, 11, 3, 14, 0, 0, TimeSpan.Zero), utc);
    }

    [Fact]
    public void Invalid_local_time_in_DST_gap_is_refused()
    {
        var check = new Check();
        Assert.Null(Zones.ToUtc(check, "due", "2026-03-29T02:30", "Europe/Berlin"));
        Assert.True(check.Has("due"));
    }

    [Fact]
    public void Ambiguous_local_time_needs_an_offset()
    {
        var check = new Check();
        Assert.Null(Zones.ToUtc(check, "due", "2026-10-25T02:30", "Europe/Berlin"));
        Assert.True(check.Has("due"));
        var ok = new Check();
        Assert.Equal(new DateTimeOffset(2026, 10, 25, 1, 30, 0, TimeSpan.Zero), Zones.ToUtc(ok, "due", "2026-10-25T02:30+01:00", "Europe/Berlin"));
        Assert.False(ok.HasErrors);
    }

    [Fact]
    public void Windows_zone_ids_are_not_accepted_only_IANA() => Assert.Null(Zones.Find("Arab Standard Time"));
}

public class CsvTests
{
    [Theory]
    [InlineData("=HYPERLINK(\"x\")", "\"'=HYPERLINK(\"\"x\"\")\"")]
    [InlineData("+1", "'+1")]
    [InlineData("-cmd", "'-cmd")]
    [InlineData("@SUM(A1)", "'@SUM(A1)")]
    [InlineData("plain", "plain")]
    public void Cells_are_protected_against_formula_injection(string value, string expected) => Assert.Equal(expected, Csv.Cell(value));

    [Fact]
    public void Export_has_generation_time_zone_filters_and_column_definitions()
    {
        var bytes = Csv.Build("Cases", "DEV\\manager", "status=open", TimeZoneInfo.FindSystemTimeZoneById("Asia/Riyadh"), new DateTimeOffset(2026, 10, 16, 9, 0, 0, TimeSpan.Zero),
            [new CsvColumn<string>("Title", "Case title", s => s)], ["=bad"]);
        var text = Encoding.UTF8.GetString(bytes);
        Assert.Contains("Generated,2026-10-16 12:00 +03:00", text);
        Assert.Contains("Time zone,Asia/Riyadh", text);
        Assert.Contains("Filters,status=open", text);
        Assert.Contains("Column: Title,Case title", text);
        Assert.Contains("'=bad", text);
    }
}

public class FreshnessTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);
    private static ReviewPolicy P(int? days, bool next) => new() { MaxAgeDays = days, UsesNextReviewDate = next };

    [Fact]
    public void Missing_policy_is_reported_not_assumed_current() => Assert.Equal(FreshnessState.NoPolicy, FreshnessService.Evaluate(null, Now.AddDays(-100), null, null, Now).State);

    [Fact]
    public void Stale_when_max_age_exceeded() => Assert.Equal(FreshnessState.Stale, FreshnessService.Evaluate(P(30, false), Now.AddDays(-90), Now.AddDays(-31), null, Now).State);

    [Fact]
    public void Stale_when_explicit_next_review_passed_even_if_recently_reviewed() =>
        Assert.Equal(FreshnessState.Stale, FreshnessService.Evaluate(P(90, true), Now.AddDays(-90), Now.AddDays(-1), Now.AddMinutes(-1), Now).State);

    [Fact]
    public void Current_within_both_limits() => Assert.Equal(FreshnessState.Current, FreshnessService.Evaluate(P(2, true), Now.AddDays(-5), Now.AddHours(-12), Now.AddDays(1), Now).State);
}

public class InfrastructureTotalsTests
{
    [Fact]
    public void Totals_keep_units_apart_exclude_logical_endpoints_count_unknowns_and_count_shared_storage_once()
    {
        var assets = new List<InventoryEndpoints.AssetFacts>
        {
            new(AssetType.VM, AssetLifecycle.Active, 8, CpuUnit.vCPU, 32, MemoryUnit.GB, null),
            new(AssetType.Physical, AssetLifecycle.Active, 24, CpuUnit.PhysicalCore, 256, MemoryUnit.GiB, null),
            new(AssetType.VM, AssetLifecycle.Planned, null, null, null, null, null),
            new(AssetType.LogicalEndpoint, AssetLifecycle.Active, null, null, null, null, null)
        };
        var volumes = new List<InventoryEndpoints.VolumeFacts> { new(100, StorageUnit.GB, null), new(2, StorageUnit.TB, 7), new(4, StorageUnit.TB, 7), new(null, null, null) };
        var shared = new List<InventoryEndpoints.SharedFacts> { new(7, 10, StorageUnit.TB) };
        var json = System.Text.Json.JsonSerializer.Serialize(InventoryEndpoints.Summarize(assets, volumes, shared));
        Assert.Contains("\"vm\":2", json);
        Assert.Contains("\"logicalEndpoints\":1", json);
        Assert.Contains("\"vCpu\":8", json);
        Assert.Contains("\"physicalCores\":24", json);
        Assert.Contains("\"unknownCount\":1", json);           // the planned VM with unknown CPU, not counted as zero
        Assert.Contains("\"shared\":{\"TB\":10}", json);       // 10 TB once, not 2 + 4 + 10
        Assert.Contains("\"dedicated\":{\"GB\":100}", json);
        Assert.Contains("\"dedicatedUnknownCount\":1", json);
    }
}

public class StructuralTests
{
    private static readonly Assembly ApiAssembly = typeof(Program).Assembly;

    /// <summary>AC-14: no credential fields in business records.</summary>
    [Fact]
    public void No_entity_has_a_password_secret_or_token_field()
    {
        var bad = ApiAssembly.GetTypes().Where(t => t.Namespace?.StartsWith("TioHub.Api.Modules") == true && t.IsClass)
            .SelectMany(t => t.GetProperties().Select(p => $"{t.Name}.{p.Name}"))
            .Where(n => n.Contains("Password", StringComparison.OrdinalIgnoreCase) || n.EndsWith("Secret", StringComparison.OrdinalIgnoreCase) || n.EndsWith(".Token", StringComparison.OrdinalIgnoreCase) || n.Contains("PrivateKey", StringComparison.OrdinalIgnoreCase))
            .ToList();
        Assert.Empty(bad);
    }

    /// <summary>AC-16: no Jira or client-system integration — the API makes no outbound HTTP calls.</summary>
    [Fact]
    public void Api_has_no_outbound_http_client_dependencies()
    {
        var types = ApiAssembly.GetTypes();
        var uses = types.SelectMany(t => t.GetConstructors().SelectMany(c => c.GetParameters()).Select(p => p.ParameterType)
                .Concat(t.GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public).Select(f => f.FieldType)))
            .Where(t => t == typeof(HttpClient) || t.Name == "IHttpClientFactory").ToList();
        Assert.Empty(uses);
        Assert.DoesNotContain(ApiAssembly.GetReferencedAssemblies(), a => a.Name!.Contains("Atlassian", StringComparison.OrdinalIgnoreCase) || a.Name!.Contains("Jira", StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>NFR-08 / AC-14: development sign-in must not run outside Development and Testing.</summary>
    [Fact]
    public void Production_startup_rejects_development_sign_in()
    {
        using var f = new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseEnvironment("Production");
            b.UseSetting("Auth:Mode", "Development");
            b.UseSetting("ConnectionStrings:TioHub", "Server=(localdb)\\MSSQLLocalDB;Database=unused;Trusted_Connection=True");
        });
        var ex = Assert.ThrowsAny<Exception>(() => f.CreateClient());
        Assert.Contains("only allowed in the Development and Testing", ex.ToString());
    }
}

public class MapTileTests
{
    [Theory]
    [InlineData("https://tile.openstreetmap.org/{z}/{x}/{y}.png", "https://tile.openstreetmap.org")]
    [InlineData("https://{s}.tiles.example.net/{z}/{x}/{y}.png", "https://*.tiles.example.net")]
    [InlineData("http://tile.openstreetmap.org/{z}/{x}/{y}.png", null)]        // plain http refused
    [InlineData("https://tile.openstreetmap.org/tiles.png", null)]              // not a tile template
    [InlineData("javascript:alert(1)//{z}{x}{y}", null)]
    [InlineData("", null)]                                                      // empty = offline vector map
    public void Only_https_tile_templates_reach_the_page_and_the_csp(string url, string? origin)
    {
        var o = new TioHub.Api.AppOptions { MapTileUrl = url };
        Assert.Equal(origin, o.MapTileOrigin);
        Assert.Equal(origin is null ? null : url, o.SafeMapTileUrl);
    }
}

public class PasswordTests
{
    [Fact]
    public void Hashes_are_salted_verifiable_and_refuse_wrong_missing_or_malformed_values()
    {
        var a = TioHub.Api.Security.PasswordHasher.Hash("a long test passphrase");
        var b = TioHub.Api.Security.PasswordHasher.Hash("a long test passphrase");
        Assert.NotEqual(a, b);
        Assert.StartsWith("pbkdf2-sha256$600000$", a);
        Assert.DoesNotContain("passphrase", a);
        Assert.True(TioHub.Api.Security.PasswordHasher.Verify("a long test passphrase", a));
        Assert.False(TioHub.Api.Security.PasswordHasher.Verify("a long test passphrasE", a));
        Assert.False(TioHub.Api.Security.PasswordHasher.Verify("a long test passphrase", null));
        Assert.False(TioHub.Api.Security.PasswordHasher.Verify("a long test passphrase", "plain-text"));
        Assert.False(TioHub.Api.Security.PasswordHasher.Verify("a long test passphrase", a.Replace("$600000$", "$1000$")));
    }

    [Theory]
    [InlineData("short", false)]
    [InlineData("aaaaaaaaaaaaaaaa", false)]
    [InlineData(" leading space pass", false)]
    [InlineData("jane.doe-is-great-2026", false)]
    [InlineData("Correct horse battery 42", true)]
    public void Policy_requires_length_variety_and_no_account_name(string password, bool ok)
    {
        var check = new Check();
        TioHub.Api.Security.PasswordPolicy.Check(check, "p", password, @"DOMAIN\jane.doe");
        Assert.Equal(ok, !check.HasErrors);
    }

    /// <summary>IAM-03 with forms sign-in: the only password field is the hash on the sign-in credential, which the automatic audit skips.</summary>
    [Fact]
    public void Only_the_sign_in_credential_holds_a_password_hash_and_it_is_not_audited()
    {
        var holders = typeof(Program).Assembly.GetTypes().Where(t => t.IsClass && !t.Name.Contains('<') && t.Namespace?.StartsWith("TioHub.Api") == true)
            .SelectMany(t => t.GetProperties().Where(p => p.Name.Contains("Password", StringComparison.OrdinalIgnoreCase) && p.PropertyType == typeof(string)).Select(p => $"{t.Name}.{p.Name}"))
            .Where(n => !n.Contains("Input."))
            .ToList();
        Assert.Equal(["UserCredential.PasswordHash"], holders);
        var notAudited = (HashSet<Type>)typeof(TioHub.Api.Data.HubDbContext).GetField("NotAudited", BindingFlags.NonPublic | BindingFlags.Static)!.GetValue(null)!;
        Assert.Contains(typeof(TioHub.Api.Security.UserCredential), notAudited);
    }
}
