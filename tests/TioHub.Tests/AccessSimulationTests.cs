using TioHub.Api.Common;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class AccessSimulationTests
{
    private static ResolvedUser User(bool active = true) => new(1, "test", "Test", "UTC", active,
        ["Tester"], ["Cases:View"],
        false, [10], [20], [], [], false, [30]);

    [Fact]
    public void Capability_and_scope_can_only_be_reported_as_conditional()
    {
        var result = AccessSimulation.Evaluate(User(), "Cases:View", "client", 10, scopeAvailable: true);
        Assert.Equal("conditional", result.Status);
        Assert.Contains("additional", result.Reason);
    }

    [Fact]
    public void Missing_permission_or_scope_is_denied()
    {
        Assert.Equal("denied", AccessSimulation.Evaluate(User(), "Cases:Delete", "none", null).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(User(), "Cases:View", "client", 11, scopeAvailable: true).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(User(), "Cases:View", "team", 31, scopeAvailable: true).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(User(false), "Cases:View", "none", null).Status);
    }

    [Fact]
    public void Project_scope_requires_a_real_project_and_a_matching_client_or_project()
    {
        Assert.Equal("conditional", AccessSimulation.Evaluate(User(), "Cases:View", "project", 20, 99, true).Status);
        Assert.Equal("conditional", AccessSimulation.Evaluate(User(), "Cases:View", "project", 21, 10, true).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(User(), "Cases:View", "project", 20, null, true).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(User(), "Cases:View", "project", 21, 99, true).Status);
    }

    [Fact]
    public void Missing_or_inaccessible_resource_is_never_reported_as_a_matching_scope()
    {
        var broad = User() with { AllClients = true, AllInternal = true };
        Assert.Equal("denied", AccessSimulation.Evaluate(broad, "Cases:View", "client", 10).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(broad, "Cases:View", "team", 30).Status);
        Assert.Equal("denied", AccessSimulation.Evaluate(broad, "Cases:View", "project", 20, 10).Status);
        Assert.Equal("conditional", AccessSimulation.Evaluate(broad, "Cases:View", "client", 10, scopeAvailable: true).Status);
        Assert.Equal("conditional", AccessSimulation.Evaluate(broad, "Cases:View", "team", 30, scopeAvailable: true).Status);
    }

    [Fact]
    public void No_specific_scope_is_not_misrepresented_as_a_scope_check()
    {
        var result = AccessSimulation.Evaluate(User(), "Cases:View", "none", null);
        Assert.Equal("conditional", result.Status);
        Assert.Contains("No resource scope was checked", result.Reason);
    }

    [Fact]
    public void Mandatory_restriction_takes_precedence_over_granted_permissions()
    {
        var blocked = User() with { AccessRestriction = "incompatible_roles" };
        var result = AccessSimulation.Evaluate(blocked, "Cases:View", "client", 10, scopeAvailable: true);
        Assert.Equal("denied", result.Status);
        Assert.Contains("separation-of-duties", result.Reason);
        Assert.Equal("Mandatory access restriction", AccessSimulation.ExplainPrerequisite(blocked, "Cases:View", ["Tester"], null, DateTimeOffset.UtcNow).Reason);
    }

    [Fact]
    public void Prerequisite_explanation_respects_denies_expiration_and_administrative_restriction()
    {
        var now = new DateTimeOffset(2026, 11, 2, 12, 0, 0, TimeSpan.Zero);
        var denied = new UserRightException { RightKey = "Cases:View", Effect = "Deny", ExpiresAt = now.AddHours(1) };
        var result = AccessSimulation.ExplainPrerequisite(User(), denied.RightKey, ["Tester"], denied, now);
        Assert.Equal("Explicitly denied or invalid exception", result.Reason);
        Assert.Equal(denied.ExpiresAt, result.ExpiresAt);
        Assert.Equal("Effective", AccessSimulation.ExplainPrerequisite(User(), denied.RightKey, ["Tester"], denied, now.AddHours(1)).Reason);

        var admin = User() with { Rights = [RightKeys.Administration] };
        var direct = new UserRightException { RightKey = "Cases:View", Effect = "Allow" };
        Assert.Equal("Direct allows are not applied to administrators", AccessSimulation.ExplainPrerequisite(admin, direct.RightKey, [], direct, now).Reason);
        Assert.Equal("A prerequisite is not effective", AccessSimulation.ExplainPrerequisite(admin, direct.RightKey, ["Role"], direct, now).Reason);
    }
}
