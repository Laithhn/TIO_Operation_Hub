using TioHub.Api.Common;
using TioHub.Api.Security;
using TioHub.Api.Modules.Access;

namespace TioHub.Tests;

public sealed class RoleConflictTests
{
    [Fact]
    public void Missing_policy_is_empty_and_conflicts_require_both_active_roles()
    {
        Assert.Empty(RoleConflicts.Parse(null));
        var pairs = RoleConflicts.Parse("[{\"FirstRoleId\":1,\"SecondRoleId\":4}]");
        Assert.True(RoleConflicts.Conflicts([1, 2, 4], pairs));
        Assert.False(RoleConflicts.Conflicts([1, 2], pairs));
        Assert.False(RoleConflicts.Conflicts([4], pairs));
    }

    [Theory]
    [InlineData("")]
    [InlineData("null")]
    [InlineData("[null]")]
    [InlineData("[{\"FirstRoleId\":4,\"SecondRoleId\":1}]")]
    [InlineData("[{\"FirstRoleId\":1,\"SecondRoleId\":1}]")]
    [InlineData("[{\"FirstRoleId\":1,\"SecondRoleId\":2},{\"FirstRoleId\":1,\"SecondRoleId\":2}]")]
    public void Invalid_stored_policy_fails_closed(string value) => Assert.Throws<ForbiddenException>(() => RoleConflicts.Parse(value));

    [Fact]
    public void Recovery_requires_active_role_maintenance_and_its_prerequisites_after_direct_denies()
    {
        var now = DateTimeOffset.Parse("2026-11-02T00:00:00Z");
        var active = RightsCatalog.AllKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        Assert.True(RoleConflicts.HasRecoveryRights([], active, now));
        Assert.False(RoleConflicts.HasRecoveryRights([new UserRightException { RightKey = "AdminRoles:Maintain", Effect = "Deny" }], active, now));
        Assert.False(RoleConflicts.HasRecoveryRights([new UserRightException { RightKey = "AdminRoles:View", Effect = "Deny" }], active, now));
        Assert.True(RoleConflicts.HasRecoveryRights([new UserRightException { RightKey = "AdminRoles:Maintain", Effect = "Deny", ExpiresAt = now }], active, now));
        active.Remove("AdminRoles:Maintain");
        Assert.False(RoleConflicts.HasRecoveryRights([], active, now));
    }

    [Fact]
    public void Forms_recovery_rejects_missing_or_malformed_credentials()
    {
        Assert.False(RoleConflicts.IsUsableFormsCredential(null));
        Assert.False(RoleConflicts.IsUsableFormsCredential(""));
        Assert.False(RoleConflicts.IsUsableFormsCredential("pbkdf2-sha256$600000$not-base64$also-invalid"));
        Assert.False(RoleConflicts.IsUsableFormsCredential("pbkdf2-sha256$1$AQ==$AQ=="));
        Assert.True(RoleConflicts.IsUsableFormsCredential(PasswordHasher.Hash("a valid test passphrase")));
    }

    [Fact]
    public void Forms_user_administrator_must_retain_effective_user_maintenance()
    {
        var now = DateTimeOffset.Parse("2026-11-02T00:00:00Z");
        var active = RightsCatalog.AllKeys.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var manager = new AppRole { Key = BuiltInRoles.ManagerKey, IsActive = true };
        Assert.True(RoleConflicts.HasUserAdministrationRights([manager], [], active, now));
        Assert.False(RoleConflicts.HasUserAdministrationRights([manager],
            [new UserRightException { RightKey = "AdminUsers:View", Effect = "Deny" }], active, now));
        Assert.False(RoleConflicts.HasUserAdministrationRights([], [], active, now));
        manager.IsActive = false;
        Assert.False(RoleConflicts.HasUserAdministrationRights([manager], [], active, now));
    }
}
