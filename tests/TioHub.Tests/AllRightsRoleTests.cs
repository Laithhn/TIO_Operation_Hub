using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A120/A127: any role can hold every right; the one built-in role (System Administrator) is the sole all-access role and cannot be changed.</summary>
public sealed class AllRightsRoleTests(HubFactory hub) : IClassFixture<HubFactory>
{
    private const string Itd = "ITD Manager";
    private const string ItdAccount = @"DEV\itd.manager";

    [Fact]
    public void A_role_holding_every_right_carries_the_whole_catalog_whatever_is_stored()
    {
        var full = new AppRole { Name = Itd, HoldsAllRights = true, Rights = [new RoleRight { RightKey = "Cases:View" }] };
        Assert.Equal(RightsCatalog.AllKeys, RoleAccess.KeysOf(full));
        var ordinary = new AppRole { Name = "Ordinary", Rights = [new RoleRight { RightKey = "Cases:View" }] };
        Assert.Equal(["Cases:View"], RoleAccess.KeysOf(ordinary));
    }

    [Fact]
    public async Task ITD_Manager_holds_every_right_including_one_added_after_it_was_saved()
    {
        var (roleId, userId) = await EnsureItdAsync();
        var m = await hub.As(HubFactory.Manager);
        var row = await RoleRow(m, Itd);
        Assert.True(row["holdsAllRights"]!.GetValue<bool>());
        Assert.Equal(RightsCatalog.AllKeys.Order(), row["rights"]!.AsArray().Select(r => r!.GetValue<string>()).Order());

        // A right that a later release adds is not stored for the role yet. Remove every stored right to stand for that.
        using (var scope = hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            await db.RoleRights.Where(p => p.AppRoleId == roleId).ExecuteDeleteAsync();
            UserResolver.InvalidateAll(scope.ServiceProvider.GetRequiredService<IMemoryCache>());
            var active = await db.RightDefinitions.AsNoTracking().Where(d => d.IsActive).Select(d => d.Key).ToListAsync();
            var resolved = await scope.ServiceProvider.GetRequiredService<UserResolver>().ForUserAsync(userId, default);
            Assert.NotNull(resolved);
            Assert.Empty(active.Except(resolved!.Rights, StringComparer.OrdinalIgnoreCase));
        }
        var itd = await hub.As(ItdAccount);
        Assert.Equal(HttpStatusCode.OK, (await itd.Get("/admin/roles")).Status);
        Assert.Equal(HttpStatusCode.OK, (await itd.Get("/admin/users")).Status);
    }

    [Fact]
    public async Task Operation_Engineer_is_ordinary_but_the_built_in_System_Administrator_cannot_be_changed()
    {
        await EnsureItdAsync();
        var itd = await hub.As(ItdAccount);
        var roles = (await itd.Get("/admin/roles")).Body!["roles"]!.AsArray();
        Assert.All(roles, r => Assert.Null(r!["key"]));
        Assert.All(roles, r => Assert.Null(r!["isLocked"]));

        // Operation Engineer: rename, change rights, deactivate and reactivate, then restore.
        var engineer = await RoleRow(itd, RoleAccess.DefaultEngineerName);
        var id = Id(engineer);
        var rights = engineer["rights"]!.AsArray().Select(r => r!.GetValue<string>()).ToArray();
        Assert.Equal(HttpStatusCode.NoContent, (await itd.Put($"/admin/roles/{id}", new { name = "Operations Engineer", rights = rights.Where(r => r != "Cases:Export").ToArray() }, Version(engineer))).Status);
        engineer = await RoleRow(itd, "Operations Engineer");
        Assert.DoesNotContain("Cases:Export", engineer["rights"]!.AsArray().Select(r => r!.GetValue<string>()));
        Assert.Equal(HttpStatusCode.NoContent, (await itd.Put($"/admin/roles/{id}", new { name = "Operations Engineer", isActive = false }, Version(engineer))).Status);
        engineer = await RoleRow(itd, "Operations Engineer");
        Assert.Equal(HttpStatusCode.NoContent, (await itd.Put($"/admin/roles/{id}", new { name = RoleAccess.DefaultEngineerName, isActive = true, rights }, Version(engineer))).Status);
        // Deleting is refused only because people hold it, not because it is built in.
        var delete = await itd.Send(HttpMethod.Delete, $"/admin/roles/{id}", ifMatch: Version(await RoleRow(itd, RoleAccess.DefaultEngineerName)));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, delete.Status);
        Assert.Contains("user(s) still hold", delete.Text);

        // A127: the built-in System Administrator role is the sole all-access role and cannot be changed in any way.
        var sysadmin = await RoleRow(itd, RoleAccess.SystemAdministratorName);
        Assert.True(sysadmin["holdsAllRights"]!.GetValue<bool>());
        Assert.True(sysadmin["isBuiltIn"]!.GetValue<bool>());
        var sysId = Id(sysadmin);
        // Rename, clear the mark, reduce rights and deactivate are all refused, as is deletion.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await itd.Put($"/admin/roles/{sysId}", new { name = "Renamed", holdsAllRights = true }, Version(sysadmin))).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await itd.Put($"/admin/roles/{sysId}", new { name = RoleAccess.SystemAdministratorName, holdsAllRights = false }, Version(sysadmin))).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await itd.Put($"/admin/roles/{sysId}", new { name = RoleAccess.SystemAdministratorName, isActive = false }, Version(sysadmin))).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await itd.Send(HttpMethod.Delete, $"/admin/roles/{sysId}", ifMatch: Version(sysadmin))).Status);
        // It may, however, be cloned into an ordinary (non-built-in, non-all-rights) role.
        var clone = await itd.Create($"/admin/roles/{sysId}/clone", new { name = "System Administrator copy" });
        var cloneRow = await RoleRow(itd, "System Administrator copy");
        Assert.False(cloneRow["holdsAllRights"]!.GetValue<bool>());
        Assert.False(cloneRow["isBuiltIn"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.NoContent, (await itd.Send(HttpMethod.Delete, $"/admin/roles/{clone}", ifMatch: Version(cloneRow))).Status);
    }

    [Fact]
    public async Task A_marked_role_cannot_be_reduced_deactivated_deleted_or_have_its_own_holder_clear_the_mark()
    {
        var (itdRoleId, _) = await EnsureItdAsync();
        var m = await hub.As(HubFactory.Manager);
        var itd = await hub.As(ItdAccount);
        var row = await RoleRow(m, Itd);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Put($"/admin/roles/{itdRoleId}", new { name = Itd, rights = new[] { "Cases:View" } }, Version(row))).Status);
        var inactive = await m.Put($"/admin/roles/{itdRoleId}", new { name = Itd, isActive = false }, Version(row));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, inactive.Status);
        Assert.NotNull(inactive.Error("isActive"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Send(HttpMethod.Delete, $"/admin/roles/{itdRoleId}", ifMatch: Version(row))).Status);
        // Nobody changes the mark on their own role.
        var own = await itd.Put($"/admin/roles/{itdRoleId}", new { name = Itd, holdsAllRights = false }, Version(row));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, own.Status);
        Assert.NotNull(own.Error("role"));

        // A127: the built-in System Administrator is always an active all-rights role, so another admin-created all-rights
        // role (ITD Manager) is never "the last one" and its mark can be cleared by someone who does not hold it.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/roles/{itdRoleId}", new { name = Itd, holdsAllRights = false }, Version(await RoleRow(m, Itd)))).Status);
        Assert.False((await RoleRow(m, Itd))["holdsAllRights"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Only_someone_holding_every_right_can_mark_a_role_to_hold_every_right()
    {
        var m = await hub.As(HubFactory.Manager);
        var delegateRole = await m.Create("/admin/roles", new
        {
            name = "Role delegate " + Guid.NewGuid().ToString("N")[..6],
            rights = new[] { "Platform:Administration", "AdminRoles:View", "AdminRoles:Create", "AdminRoles:Maintain", "AdminUsers:View", "AdminUsers:Create", "AdminUsers:Maintain", "Cases:View" }
        });
        var account = $@"DEV\delegate.{Guid.NewGuid():N}"[..24];
        await m.Create("/admin/users", new { accountName = account, displayName = "Delegate", workingTimeZone = "UTC", allClients = true, allInternal = true, roleIds = new[] { delegateRole } });
        var delegated = await hub.As(account);
        var refused = await delegated.Post("/admin/roles", new { name = "Everything " + Guid.NewGuid().ToString("N")[..6], rights = Array.Empty<string>(), holdsAllRights = true });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.Status);
        var allowed = await m.Post("/admin/roles", new { name = "Everything " + Guid.NewGuid().ToString("N")[..6], rights = Array.Empty<string>(), holdsAllRights = true });
        Assert.Equal(HttpStatusCode.Created, allowed.Status);
        var row = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r!) == allowed.Id)!;
        Assert.True(row["holdsAllRights"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/roles/{allowed.Id}", new { name = row["name"]!.GetValue<string>(), holdsAllRights = false }, Version(row))).Status);
    }

    /// <summary>An ITD Manager role holding every right and one person holding only it, created once per test database.</summary>
    private async Task<(long RoleId, long UserId)> EnsureItdAsync()
    {
        var m = await hub.As(HubFactory.Manager);
        var existing = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().FirstOrDefault(r => r!["name"]!.GetValue<string>() == Itd);
        var roleId = existing is null
            ? await m.Create("/admin/roles", new { name = Itd, description = "The owner's manager.", rights = Array.Empty<string>(), holdsAllRights = true })
            : Id(existing);
        var user = (await m.Get("/admin/users?q=itd.manager")).Body!.AsArray().FirstOrDefault(u => u!["accountName"]!.GetValue<string>() == ItdAccount);
        var userId = user is null
            ? await m.Create("/admin/users", new { accountName = ItdAccount, displayName = "ITD Manager (test)", workingTimeZone = "UTC", allClients = true, allInternal = true, roleIds = new[] { roleId } })
            : Id(user);
        return (roleId, userId);
    }

    private static async Task<JsonNode> RoleRow(Api api, string name) =>
        (await api.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => r!["name"]!.GetValue<string>() == name)!;

    private static long Id(JsonNode row) => row["id"]!.GetValue<long>();
    private static string Version(JsonNode row) => row["version"]!.GetValue<string>();
}
