using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Text.Json;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>
/// Uses a uniquely named, migrated and subsequently dropped database only after explicit approval.
/// The configured SQL server must be a separately approved development instance.
/// </summary>
public sealed class FormsRecoverySqlIntegrationTests
{
    private static void RequireApproval()
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
    }

    [ApprovedOverrideSqlFact]
    public async Task Setup_is_required_until_an_active_account_has_usable_effective_user_administration()
    {
        RequireApproval();
        var hub = new HubFactory();
        try
        {
            using var client = hub.CreateClient(); // Starts the explicitly approved isolated test host.
            using var scope = hub.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var manager = await db.Users.SingleAsync(u => u.AccountName == HubFactory.Manager);
            Assert.True(await SetupCode.RequiredAsync(db, CancellationToken.None));
            var credential = new UserCredential { UserId = manager.Id, PasswordHash = "" };
            db.UserCredentials.Add(credential);
            await db.SaveChangesAsync();
            Assert.True(await SetupCode.RequiredAsync(db, CancellationToken.None));

            credential.PasswordHash = PasswordHasher.Hash("a valid test passphrase");
            await db.SaveChangesAsync();
            Assert.False(await SetupCode.RequiredAsync(db, CancellationToken.None));

            var deny = new UserRightException { UserId = manager.Id, RightKey = "AdminUsers:View", Effect = "Deny" };
            db.UserRightExceptions.Add(deny);
            await db.SaveChangesAsync();
            Assert.True(await SetupCode.RequiredAsync(db, CancellationToken.None));

            db.UserRightExceptions.Remove(deny);
            manager.IsActive = false;
            await db.SaveChangesAsync();
            Assert.True(await SetupCode.RequiredAsync(db, CancellationToken.None));
        }
        finally { await hub.DisposeAsync(); }
    }

    [ApprovedOverrideSqlFact]
    public async Task Setup_retains_code_and_rolls_back_until_the_provisioned_manager_is_effective()
    {
        RequireApproval();
        var hub = new FormsFactory();
        try
        {
            var session = await hub.NewSession();
            var code = await File.ReadAllTextAsync(hub.SetupFile);
            using var scope = hub.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            var managerRoleId = (await BuiltInRoles.EnsureAsync(db, CancellationToken.None))[BuiltInRoles.ManagerKey];
            var user = new User { AccountName = "old.manager", DisplayName = "Old manager", WorkingTimeZone = "UTC", IsActive = false };
            user.Roles.Add(new UserRole { AppRoleId = managerRoleId });
            db.Users.Add(user);
            await db.SaveChangesAsync();
            object Request(string account) => new { setupCode = code, accountName = account, displayName = "Recovery manager", password = "A valid long passphrase 2026" };

            Assert.Equal(HttpStatusCode.Conflict, (await session.Post("/auth/setup", Request(user.AccountName))).Status);
            Assert.True(File.Exists(hub.SetupFile));
            Assert.False(await db.UserCredentials.AnyAsync(c => c.UserId == user.Id));

            user.IsActive = true;
            db.UserRightExceptions.Add(new UserRightException { UserId = user.Id, RightKey = "AdminUsers:View", Effect = "Deny" });
            await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await session.Post("/auth/setup", Request(user.AccountName))).Status);
            Assert.True(File.Exists(hub.SetupFile));
            Assert.False(await db.UserCredentials.AnyAsync(c => c.UserId == user.Id));

            db.UserRightExceptions.RemoveRange(await db.UserRightExceptions.Where(o => o.UserId == user.Id).ToListAsync());
            var roleA = new AppRole { Name = "Conflicting A", IsActive = true };
            var roleB = new AppRole { Name = "Conflicting B", IsActive = true };
            db.AppRoles.AddRange(roleA, roleB);
            await db.SaveChangesAsync();
            db.UserRoles.AddRange(new UserRole { UserId = user.Id, AppRoleId = roleA.Id }, new UserRole { UserId = user.Id, AppRoleId = roleB.Id });
            db.Settings.Add(new AppSetting { Key = RoleConflicts.SettingKey, Value = JsonSerializer.Serialize(new[] { new RoleConflicts.Pair(Math.Min(roleA.Id, roleB.Id), Math.Max(roleA.Id, roleB.Id)) }) });
            await db.SaveChangesAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await session.Post("/auth/setup", Request(user.AccountName))).Status);
            Assert.True(File.Exists(hub.SetupFile));
            Assert.False(await db.UserCredentials.AnyAsync(c => c.UserId == user.Id));

            var permission = await db.RightDefinitions.SingleAsync(p => p.Key == "AdminUsers:View");
            permission.IsActive = false;
            await db.SaveChangesAsync();
            var versionBeforeFailure = await db.AuthorizationVersions.AsNoTracking().Select(v => v.Version).SingleAsync();
            Assert.Equal(HttpStatusCode.Conflict, (await session.Post("/auth/setup", Request("new.manager"))).Status);
            Assert.True(File.Exists(hub.SetupFile));
            Assert.False(await db.Users.AnyAsync(u => u.AccountName == "new.manager"));
            Assert.Equal(versionBeforeFailure, await db.AuthorizationVersions.AsNoTracking().Select(v => v.Version).SingleAsync());

            permission.IsActive = true;
            db.Settings.Remove(await db.Settings.SingleAsync(s => s.Key == RoleConflicts.SettingKey));
            await db.SaveChangesAsync();
            var versionBeforeSuccess = await db.AuthorizationVersions.AsNoTracking().Select(v => v.Version).SingleAsync();
            Assert.Equal(HttpStatusCode.OK, (await session.Post("/auth/setup", Request(user.AccountName))).Status);
            Assert.False(File.Exists(hub.SetupFile));
            var recovered = await db.Users.AsNoTracking().SingleAsync(u => u.Id == user.Id);
            Assert.True(recovered.AllClients && recovered.AllInternal);
            Assert.True(await db.AuthorizationVersions.AsNoTracking().Select(v => v.Version).SingleAsync() > versionBeforeSuccess);
        }
        finally { await hub.DisposeAsync(); }
    }
}
