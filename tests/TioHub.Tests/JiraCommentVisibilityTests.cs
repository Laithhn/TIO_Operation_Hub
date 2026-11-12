using System.Text.Json;
using TioHub.Api.Modules.Jira;

namespace TioHub.Tests;

/// <summary>A82: which Jira comments count as hidden from the customer. The payloads are written by hand, not captured from a real site.</summary>
public class JiraCommentVisibilityTests
{
    private static JiraCommentInfo Parse(string fields)
    {
        using var doc = JsonDocument.Parse($$"""{"comments":[{"id":"1","created":"2026-11-03T10:00:00.000+0000",{{fields}}}]}""");
        return JiraJson.Comments(doc.RootElement).Single();
    }

    [Fact]
    public void A_service_management_internal_note_is_restricted() =>
        Assert.Equal("Internal", Parse("""
            "properties":[{"key":"sd.public.comment","value":{"internal":true}}]
            """).VisibilityValue);

    [Fact]
    public void A_service_management_public_comment_is_not_restricted() =>
        Assert.Null(Parse("""
            "properties":[{"key":"sd.public.comment","value":{"internal":false}},{"key":"other","value":{"internal":true}}]
            """).VisibilityValue);

    [Fact]
    public void A_role_restriction_keeps_its_value() =>
        Assert.Equal("Developers", Parse("""
            "visibility":{"type":"role","value":"Developers"}
            """).VisibilityValue);

    [Fact]
    public void A_plain_comment_is_not_restricted() =>
        Assert.Null(Parse("""
            "updated":"2026-11-03T10:00:00.000+0000"
            """).VisibilityValue);
}
