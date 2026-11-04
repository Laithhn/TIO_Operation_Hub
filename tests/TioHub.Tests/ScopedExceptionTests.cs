using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Reporting;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Contextual decisions without a database. Context comes from stored records; these build it directly.</summary>
public sealed class ScopedExceptionTests
{
    private const string Maintain = "Contracts:Maintain";
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);
    private static readonly string[] Prerequisites = [.. Fixture.Rights(RightsCatalog.Dependencies(Maintain))];
    private static string[] RoleWithMaintain => [.. Prerequisites, Maintain];

    private static ResourceContext Contract(long client, long project) => ResourceContext.ForRecord(client, null, [project]);
    private static ScopedException Allow(long? client = null, long? project = null, long? team = null, DateTimeOffset? expires = null) => new(Maintain, true, client, project, team, expires);
    private static ScopedException Deny(long? client = null, long? project = null, long? team = null, DateTimeOffset? expires = null) => new(Maintain, false, client, project, team, expires);
    private static bool Decide(string[] assigned, ResourceContext context, params ScopedException[] scoped) => AuthorizationDecisions.Decide(assigned, scoped, Maintain, context, Now).Allowed;

    [Fact]
    public void Default_deny_without_role_or_exception() => Assert.False(Decide(Prerequisites, Contract(1, 10)));

    [Fact]
    public void Role_allow_applies_without_exceptions() => Assert.True(Decide(RoleWithMaintain, Contract(1, 10)));

    [Fact]
    public void Client_allow_applies_inside_the_client_only()
    {
        Assert.True(Decide(Prerequisites, Contract(1, 10), Allow(client: 1)));
        Assert.False(Decide(Prerequisites, Contract(2, 20), Allow(client: 1)));
    }

    [Fact]
    public void Project_allow_needs_the_whole_record_in_that_project()
    {
        Assert.True(Decide(Prerequisites, Contract(1, 10), Allow(project: 10)));
        Assert.False(Decide(Prerequisites, Contract(1, 11), Allow(project: 10)));
        // A record spanning two projects, or part outside any project, is not covered by one project's allow.
        Assert.False(Decide(Prerequisites, ResourceContext.ForRecord(1, null, [10, 11]), Allow(project: 10)));
        Assert.False(Decide(Prerequisites, ResourceContext.ForRecord(1, null, [10, null]), Allow(project: 10)));
        Assert.False(Decide(Prerequisites, ResourceContext.ForRecord(1, null, [null]), Allow(project: 10)));
    }

    [Fact]
    public void Unknown_project_association_cannot_become_an_allow_and_a_project_deny_fails_closed()
    {
        var unknown = ResourceContext.ForRecord(1, null);
        Assert.False(Decide(Prerequisites, unknown, Allow(project: 10)));
        Assert.False(Decide(RoleWithMaintain, unknown, Deny(project: 10)));
        // A client-wide allow does not depend on knowing the project.
        Assert.True(Decide(Prerequisites, unknown, Allow(client: 1)));
    }

    [Fact]
    public void A_record_known_to_have_no_project_is_outside_a_project_deny()
    {
        Assert.True(Decide(RoleWithMaintain, ResourceContext.ForRecord(1, null, [null]), Deny(project: 10)));
        Assert.True(Decide(RoleWithMaintain, ResourceContext.ForRecord(1, null, []), Deny(project: 10)));
    }

    [Fact]
    public void Deny_overrides_role_and_direct_allow_when_any_part_intersects()
    {
        Assert.False(Decide(RoleWithMaintain, Contract(1, 10), Deny(client: 1)));
        Assert.True(Decide(RoleWithMaintain, Contract(2, 20), Deny(client: 1)));
        Assert.False(Decide(Prerequisites, Contract(1, 10), Allow(client: 1), Deny(project: 10)));
        Assert.True(Decide(Prerequisites, Contract(1, 11), Allow(client: 1), Deny(project: 10)));
        Assert.False(Decide(RoleWithMaintain, ResourceContext.ForRecord(1, null, [10, 11]), Deny(project: 11)));
    }

    [Fact]
    public void Team_scope_applies_to_internal_records_and_not_to_client_records_of_that_team()
    {
        var internalRecord = ResourceContext.ForRecord(null, 7, []);
        var clientRecord = ResourceContext.ForRecord(1, 7, []);
        Assert.True(Decide(Prerequisites, internalRecord, Allow(team: 7)));
        Assert.False(Decide(Prerequisites, ResourceContext.ForRecord(null, 8, []), Allow(team: 7)));
        Assert.False(Decide(Prerequisites, clientRecord, Allow(team: 7)));
        Assert.False(Decide(RoleWithMaintain, internalRecord, Deny(team: 7)));
        Assert.True(Decide(RoleWithMaintain, clientRecord, Deny(team: 7)));
    }

    [Fact]
    public void Identifiers_are_distinct_namespaces()
    {
        Assert.False(Decide(Prerequisites, Contract(5, 6), Allow(project: 5)));
        Assert.False(Decide(Prerequisites, Contract(6, 5), Allow(client: 5)));
        Assert.False(Decide(Prerequisites, ResourceContext.ForRecord(null, 5, []), Allow(client: 5)));
    }

    [Fact]
    public void Moves_need_authority_over_both_the_old_and_the_proposed_context()
    {
        var move = Contract(1, 10).Merge(Contract(1, 11));
        Assert.False(Decide(Prerequisites, move, Allow(project: 10)));
        Assert.False(Decide(RoleWithMaintain, move, Deny(project: 11)));
        Assert.True(Decide(Prerequisites, move, Allow(client: 1)));
        Assert.False(Decide(Prerequisites, Contract(1, 10).Merge(Contract(2, 20)), Allow(client: 1)));
    }

    [Fact]
    public void Expiry_is_strict_at_the_boundary()
    {
        Assert.True(Decide(Prerequisites, Contract(1, 10), Allow(client: 1, expires: Now.AddTicks(1))));
        Assert.False(Decide(Prerequisites, Contract(1, 10), Allow(client: 1, expires: Now)));
        Assert.True(Decide(RoleWithMaintain, Contract(1, 10), Deny(client: 1, expires: Now)));
        Assert.False(Decide(RoleWithMaintain, Contract(1, 10), Deny(client: 1, expires: Now.AddTicks(1))));
    }

    [Fact]
    public void Scoped_allow_cannot_bypass_missing_or_scoped_denied_prerequisites()
    {
        Assert.False(Decide([], Contract(1, 10), Allow(client: 1)));
        var parent = Prerequisites.First(k => k.EndsWith(":View", StringComparison.Ordinal));
        var decision = AuthorizationDecisions.Decide(Prerequisites, [Allow(client: 1), new(parent, false, 1, null, null, null)], Maintain, Contract(1, 10), Now);
        Assert.False(decision.Allowed);
        Assert.Contains("prerequisite", decision.Reason);
        // The same prerequisite denied for another client does not reach this record.
        Assert.True(AuthorizationDecisions.Decide(Prerequisites, [Allow(client: 1), new(parent, false, 2, null, null, null)], Maintain, Contract(1, 10), Now).Allowed);
    }

    private static UserContext Holding(bool active, string[] permissions, ScopedException[] scoped, string[]? assigned = null)
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(7, "t", "T", "UTC", active, ["R"], permissions, true, [], [], [], [], true, [],
            AssignedRights: assigned ?? permissions, ScopedExceptions: scoped));
        return user;
    }

    [Fact]
    public void A_scoped_allow_is_never_a_global_decision()
    {
        var user = Holding(true, Prerequisites, [Allow(client: 1)]);
        Assert.False(user.HasRight(Maintain));
        Assert.True(user.HasRightIn(RightKeys.Contracts, RightKeys.Maintain, Contract(1, 10)));
        Assert.False(user.HasRightIn(RightKeys.Contracts, RightKeys.Maintain, Contract(2, 20)));
        Assert.Throws<ForbiddenException>(() => user.RequireRightIn(RightKeys.Contracts, RightKeys.Maintain, Contract(2, 20)));
    }

    [Fact]
    public void Inactive_accounts_get_nothing_from_exceptions()
    {
        var user = Holding(false, RoleWithMaintain, [Allow(client: 1)]);
        Assert.Empty(user.ScopedExceptions);
        Assert.False(user.HasRightIn(RightKeys.Contracts, RightKeys.Maintain, Contract(1, 10)));
    }

    [Fact]
    public void Scoped_rows_never_change_global_resolution_and_administrators_get_no_scoped_allow()
    {
        var rows = new[]
        {
            new UserRightException { RightKey = Maintain, Effect = "Allow", ClientId = 1 },
            new UserRightException { RightKey = Prerequisites[0], Effect = "Deny", ClientId = 2 }
        };
        Assert.DoesNotContain(Maintain, RightExceptions.Resolve(Prerequisites, rows, Now));
        Assert.Contains(Prerequisites[0], RightExceptions.Resolve(Prerequisites, rows, Now));
        Assert.Equal(2, RightExceptions.Scoped(rows, false).Length);
        Assert.False(Assert.Single(RightExceptions.Scoped(rows, true)).Allow);
        // Inactive permission definitions contribute no scoped allow, but a scoped deny always stays.
        Assert.Single(RightExceptions.Scoped(rows, false, new HashSet<string>()));
    }

    [Fact]
    public void Delegation_counts_a_scoped_allow_as_reachable_and_ignores_a_scoped_deny()
    {
        var active = RoleWithMaintain.ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.Contains(Maintain, RightExceptions.PotentiallyEffective(Prerequisites, [new() { RightKey = Maintain, Effect = "Allow", ProjectId = 3 }], Now, active));
        Assert.Contains(Maintain, RightExceptions.PotentiallyEffective(RoleWithMaintain, [new() { RightKey = Maintain, Effect = "Deny", ClientId = 3 }], Now, active));
        Assert.Contains(Maintain, RightExceptions.NewlyEffective([], Prerequisites, [new() { RightKey = Maintain, Effect = "Allow", TeamId = 3 }], Now, active));
    }

    [Fact]
    public void Export_fingerprint_changes_with_scoped_exception_state_and_stays_stable_without_any()
    {
        var plain = Holding(true, RoleWithMaintain, []);
        var same = Holding(true, RoleWithMaintain, []);
        Assert.Equal(ExportAccessFingerprint.For(plain), ExportAccessFingerprint.For(same));
        var scoped = ExportAccessFingerprint.For(Holding(true, RoleWithMaintain, [Deny(client: 1)]));
        Assert.NotEqual(ExportAccessFingerprint.For(plain), scoped);
        Assert.NotEqual(scoped, ExportAccessFingerprint.For(Holding(true, RoleWithMaintain, [Deny(client: 2)])));
        Assert.NotEqual(scoped, ExportAccessFingerprint.For(Holding(true, RoleWithMaintain, [Deny(project: 1)])));
        Assert.NotEqual(scoped, ExportAccessFingerprint.For(Holding(true, RoleWithMaintain, [Deny(client: 1, expires: Now)])));
        Assert.Equal(scoped, ExportAccessFingerprint.For(Holding(true, RoleWithMaintain, [Deny(client: 1)])));
    }

    [Fact]
    public void Simulation_uses_the_same_contextual_decision()
    {
        var user = new ResolvedUser(7, "t", "T", "UTC", true, ["R"], RoleWithMaintain, true, [], [], [], [], true, [],
            AssignedRights: RoleWithMaintain, ScopedExceptions: [Deny(client: 1)]);
        Assert.Equal("denied", AccessSimulation.Evaluate(user, Maintain, "client", 1, null, true, ResourceContext.ForRecord(1, null, [])).Status);
        Assert.Equal("conditional", AccessSimulation.Evaluate(user, Maintain, "client", 2, null, true, ResourceContext.ForRecord(2, null, [])).Status);
    }

    [Theory]
    [InlineData("clients")]
    [InlineData("teams")]
    public void Deleting_a_scope_removes_its_exceptions_and_never_unlinks_them_into_global_ones(string path)
    {
        using var db = new DesignTimeFactory().CreateDbContext([]);
        var (owned, unlinked) = Cascade.Describe(db, path);
        Assert.Contains(nameof(UserRightException), owned);
        Assert.DoesNotContain(unlinked, u => u.StartsWith(nameof(UserRightException), StringComparison.Ordinal));
    }

    [Fact]
    public void Exception_model_has_a_single_scope_check_and_per_scope_uniqueness()
    {
        using var db = new DesignTimeFactory().CreateDbContext([]);
        var entity = db.GetService<Microsoft.EntityFrameworkCore.Metadata.IDesignTimeModel>().Model.FindEntityType(typeof(UserRightException))!;
        Assert.Contains(entity.GetCheckConstraints(), c => c.Name == "CK_UserRightException_SingleScope");
        var unique = entity.GetIndexes().Where(i => i.IsUnique).Select(i => i.GetDatabaseName()).ToArray();
        Assert.Equal(["UX_UserRightException_Client", "UX_UserRightException_Global", "UX_UserRightException_Project", "UX_UserRightException_Team"], unique.Order());
    }

    [Fact]
    public void Live_directory_lookup_builds_a_principal_name_only_from_configuration()
    {
        Assert.Equal("alex@corp.example", WindowsDirectoryGroupLookup.UserPrincipalName(@"CORP\alex", "corp.example"));
        Assert.Equal("alex@corp.example", WindowsDirectoryGroupLookup.UserPrincipalName(@"CORP\alex", "@corp.example"));
        Assert.Equal(@"CORP\alex", WindowsDirectoryGroupLookup.UserPrincipalName(@"CORP\alex", null));
    }
}

/// <summary>
/// The rule behind the allowlist: a permission that accepts a scope must never be checked globally, or a scoped deny would be ignored there.
/// This reads the source, so a new global check on an eligible key fails the build rather than becoming a silent bypass.
/// </summary>
public sealed class ScopedPermissionCoverageTests
{
    private static readonly string Api = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../src/TioHub.Api"));

    private static IEnumerable<(string File, int Line, string Text)> Source() =>
        Directory.EnumerateFiles(Api, "*.cs", SearchOption.AllDirectories)
            .Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}") && !f.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}") && !f.Contains("Migrations"))
            .SelectMany(f => File.ReadLines(f).Select((text, i) => (Path.GetRelativePath(Api, f), i + 1, text)));

    [Theory]
    [InlineData("Contracts")]
    [InlineData("Commitments")]
    [InlineData("Environments")]
    public void Eligible_permissions_have_no_global_check_or_uncontextual_maintain(string resource)
    {
        Assert.Contains($"{resource}:Maintain", ScopedRights.Eligible);
        var global = new Regex($@"(HasPermission|RequirePermission)\(\s*ResourcePermissions\.{resource}\s*,\s*ResourcePermissions\.Maintain|(HasPermission|RequirePermission)\(\s*""{resource}:Maintain""|RequireMaintain\(\s*ResourcePermissions\.{resource}\b");
        var offenders = Source().Where(s => global.IsMatch(s.Text)).Select(s => $"{s.File}:{s.Line}").ToArray();
        Assert.True(offenders.Length == 0, "Global check on a scope-eligible permission: " + string.Join(", ", offenders));
    }

    [Theory]
    [InlineData("Commitments", "CommitmentEndpoints.cs", 5)]
    [InlineData("Contracts", "ContractEndpoints.cs", 1)]
    [InlineData("Environments", "EnvironmentEndpoints.cs", 2)]
    public void Every_known_edit_path_stays_contextual(string resource, string file, int minimum)
    {
        var count = Source().Count(s => s.File.EndsWith(file, StringComparison.Ordinal)
            && s.Text.Contains($"access.RequireIn(RightKeys.{resource}, RightKeys.Maintain", StringComparison.Ordinal));
        Assert.True(count >= minimum, $"{file}: {count} contextual checks, expected at least {minimum}");
    }

    [Fact]
    public void Record_deletion_uses_full_client_scope_like_edit_and_archive()
    {
        var deletion = Source().Where(s => s.File.EndsWith("Deletion.cs", StringComparison.Ordinal)).Select(s => s.Text).ToArray();
        Assert.DoesNotContain(deletion, line => line.Contains("SeesClient", StringComparison.Ordinal));
        Assert.Contains(deletion, line => line.Contains("static void Scope(HubAccess access, long clientId) => RequireWholeClientScope", StringComparison.Ordinal));
    }

    [Fact]
    public void Only_edit_capabilities_are_eligible_so_no_read_path_can_ignore_a_scoped_deny() =>
        Assert.All(ScopedRights.Eligible, key => Assert.EndsWith(":Maintain", key));

    [Fact]
    public void Unsupported_scopes_are_refused_by_key_not_by_convention()
    {
        Assert.True(ScopedRights.IsEligible("contracts:maintain"));
        Assert.False(ScopedRights.IsEligible("Contracts:View"));
        Assert.False(ScopedRights.IsEligible("Cases:Maintain"));
        Assert.False(ScopedRights.IsEligible(null));
    }
}
