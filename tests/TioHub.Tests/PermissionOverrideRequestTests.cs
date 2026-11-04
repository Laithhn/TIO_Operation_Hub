using System.Text.Json;
using TioHub.Api.Modules.Admin;

namespace TioHub.Tests;

/// <summary>Unsupported constraints must never turn a scoped request into a global grant.</summary>
public sealed class PermissionOverrideRequestTests
{
    private static readonly JsonSerializerOptions WebOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Supported_override_fields_deserialize_normally()
    {
        const string json = """{"exceptions":[{"key":"Cases:View","effect":"Allow","expiresAt":"2030-01-01T00:00:00Z"}]}""";
        var request = JsonSerializer.Deserialize<UserRightExceptionEndpoints.ReplaceInput>(json, WebOptions);
        var entry = Assert.Single(request!.Exceptions!);
        Assert.Equal("Cases:View", entry.Key);
        Assert.Equal("Allow", entry.Effect);
        Assert.Equal(DateTimeOffset.Parse("2030-01-01T00:00:00Z"), entry.ExpiresAt);
    }

    [Fact]
    public void Scope_columns_deserialize_so_the_server_can_validate_them()
    {
        const string json = """{"exceptions":[{"key":"Contracts:Maintain","effect":"Deny","expiresAt":null,"projectId":9}]}""";
        var entry = Assert.Single(JsonSerializer.Deserialize<UserRightExceptionEndpoints.ReplaceInput>(json, WebOptions)!.Exceptions!);
        Assert.Equal(9, entry.ProjectId);
        Assert.Null(entry.ClientId);
    }

    [Theory]
    [InlineData("scope", "{\"kind\":\"client\",\"id\":3}")]
    [InlineData("scopeId", "3")]
    [InlineData("expires_at", "\"2030-01-01T00:00:00Z\"")]
    [InlineData("expiration", "\"2030-01-01T00:00:00Z\"")]
    [InlineData("effects", "\"Deny\"")]
    public void Unknown_override_fields_are_rejected(string field, string value)
    {
        var json = "{\"exceptions\":[{\"key\":\"Cases:View\",\"effect\":\"Allow\",\"" + field + "\":" + value + "}]}";
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<UserRightExceptionEndpoints.ReplaceInput>(json, WebOptions));
    }

    [Theory]
    [InlineData("scope")]
    [InlineData("override")]
    public void Unknown_request_fields_are_rejected(string field)
    {
        var json = "{\"exceptions\":[],\"" + field + "\":null}";
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<UserRightExceptionEndpoints.ReplaceInput>(json, WebOptions));
    }
}
