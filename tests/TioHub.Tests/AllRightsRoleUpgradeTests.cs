using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A120: the AllRightsRoles migration on a 2.67.0 database, with and without the owner's ITD Manager role.</summary>
public sealed class AllRightsRoleUpgradeTests
{
    private const string Previous = "20261118072809_ClientStatusFreeText";
    private static string Server => Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";

    private static async Task WithDatabase(string? before, Func<HubDbContext, Task> test)
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var connection = new SqlConnectionStringBuilder { DataSource = Server, InitialCatalog = "TioHub_TestRoles_" + Guid.NewGuid().ToString("N"), IntegratedSecurity = true, TrustServerCertificate = true }.ConnectionString;
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer(connection, sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "admin")).Options;
        await using var db = new HubDbContext(options, new UserContext(), TimeProvider.System);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync(Previous);
            // 2.67.0 state: the two built-in roles, and what an administrator set up on top.
            await db.Database.ExecuteSqlRawAsync("""
                DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
                UPDATE [iam].[AppRole] SET [Name] = N'Operation Engineer', [Description] = N'Edited by an administrator' WHERE [Key] = N'Engineer';
                DELETE FROM [iam].[RoleRight] WHERE [AppRoleId] = (SELECT [Id] FROM [iam].[AppRole] WHERE [Key] = N'Manager') AND [RightKey] = N'Cases:View';
                INSERT [iam].[AppRole] ([Name],[Description],[Key],[Rights],[IsActive],[CreatedAt],[UpdatedAt]) VALUES (N'Auditor', NULL, NULL, 0, 1, @now, @now);
                INSERT [iam].[RoleRight] ([AppRoleId],[RightKey]) SELECT [Id], N'Cases:View' FROM [iam].[AppRole] WHERE [Name] = N'Auditor';
                """);
            if (before is not null) await db.Database.ExecuteSqlRawAsync(before);
            await RightsCatalog.SynchronizeAsync(db); // As the running 2.67.0 application left it.
            await test(db);
        }
        finally
        {
            SqlConnection.ClearAllPools();
            await db.Database.EnsureDeletedAsync(); // Only this test's generated TioHub_TestRoles_* database.
        }
    }

    private static async Task Upgrade(HubDbContext db)
    {
        await db.GetService<IMigrator>().MigrateAsync();
        // What every start does: catalog and reference data. Neither may re-create or re-mark roles.
        await RightsCatalog.SynchronizeAsync(db);
        await ReferenceData.SeedAsync(db);
        await RightsCatalog.SynchronizeAsync(db);
        db.ChangeTracker.Clear();
    }

    private static Task<AppRole> Role(HubDbContext db, string name) => db.AppRoles.AsNoTracking().Include(r => r.Rights).SingleAsync(r => r.Name == name);

    [ApprovedOverrideSqlFact]
    public Task ITD_Manager_gets_every_right_and_the_former_built_in_roles_become_ordinary() => WithDatabase(
        "DECLARE @now datetimeoffset = SYSDATETIMEOFFSET(); INSERT [iam].[AppRole] ([Name],[Description],[Key],[Rights],[IsActive],[CreatedAt],[UpdatedAt]) VALUES (N'ITD Manager', N'Owner''s manager', NULL, 0, 1, @now, @now); "
        + "INSERT [iam].[RoleRight] ([AppRoleId],[RightKey]) SELECT r.[Id], d.[Key] FROM [iam].[AppRole] r CROSS JOIN [iam].[RightDefinition] d WHERE r.[Name] = N'ITD Manager' AND d.[Key] LIKE N'Cases:%';",
        async db =>
        {
            var engineerBefore = (await db.Database.SqlQueryRaw<string>("SELECT g.[RightKey] AS [Value] FROM [iam].[RoleRight] g JOIN [iam].[AppRole] r ON r.[Id] = g.[AppRoleId] WHERE r.[Key] = N'Engineer'").ToListAsync()).Order().ToArray();
            var count = await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM [iam].[AppRole]").SingleAsync();
            await Upgrade(db);

            var itd = await Role(db, "ITD Manager");
            Assert.True(itd.HoldsAllRights);
            Assert.True(itd.IsActive);
            Assert.Equal("Owner's manager", itd.Description);
            Assert.Equal(RightsCatalog.AllKeys, RoleAccess.KeysOf(itd));

            // TIO Manager is an ordinary role now. It keeps everything it effectively held, including what was missing from storage.
            var manager = await Role(db, "TIO Manager");
            Assert.False(manager.HoldsAllRights);
            var active = await db.RightDefinitions.AsNoTracking().Where(d => d.IsActive).Select(d => d.Key).ToListAsync();
            Assert.Empty(active.Except(RoleAccess.KeysOf(manager), StringComparer.OrdinalIgnoreCase));
            Assert.Contains("Cases:View", RoleAccess.KeysOf(manager));

            // Operation Engineer and other roles keep the administrator's changes.
            var engineer = await Role(db, "Operation Engineer");
            Assert.False(engineer.HoldsAllRights);
            Assert.Equal("Edited by an administrator", engineer.Description);
            // A123's later upgrade adds the Tickets dashboard to every role that can see tickets; nothing else changes.
            Assert.Equal(engineerBefore.Append("TicketDashboard:View").Order().ToArray(), RoleAccess.KeysOf(engineer).Order().ToArray());
            Assert.Equal(["Cases:View", "TicketDashboard:View"], RoleAccess.KeysOf(await Role(db, "Auditor")).Order().ToArray());

            Assert.Equal(1, await db.AppRoles.CountAsync(r => r.HoldsAllRights));
            Assert.Equal(count, await db.AppRoles.CountAsync());
            Assert.Equal(itd.Id, await RoleAccess.EnsureFullAccessRoleAsync(db, default));
        });

    [ApprovedOverrideSqlFact]
    public Task Tickets_dashboard_goes_to_every_role_holding_ticket_view() => WithDatabase(
        "DECLARE @now datetimeoffset = SYSDATETIMEOFFSET(); INSERT [iam].[AppRole] ([Name],[Description],[Key],[Rights],[IsActive],[CreatedAt],[UpdatedAt]) VALUES (N'Contracts reader', NULL, NULL, 0, 1, @now, @now); "
        + "INSERT [iam].[RoleRight] ([AppRoleId],[RightKey]) SELECT [Id], N'Contracts:View' FROM [iam].[AppRole] WHERE [Name] = N'Contracts reader';",
        async db =>
        {
            // A123: the upgrade grants TicketDashboard:View to roles holding Cases:View, and to no other role.
            await Upgrade(db);
            Assert.Contains("TicketDashboard:View", RoleAccess.KeysOf(await Role(db, "Auditor")));
            Assert.Contains("TicketDashboard:View", RoleAccess.KeysOf(await Role(db, "Operation Engineer")));
            Assert.DoesNotContain("TicketDashboard:View", RoleAccess.KeysOf(await Role(db, "Contracts reader")));
            var row = await db.RightDefinitions.AsNoTracking().SingleAsync(r => r.Key == "TicketDashboard:View");
            Assert.Equal(("Tickets", "TicketDashboard", true), (row.Module, row.Feature, row.IsActive));
        });

    [ApprovedOverrideSqlFact]
    public Task Without_ITD_Manager_TIO_Manager_keeps_every_right() => WithDatabase(null, async db =>
    {
        await Upgrade(db);
        var manager = await Role(db, "TIO Manager");
        Assert.True(manager.HoldsAllRights);
        Assert.Equal(RightsCatalog.AllKeys, RoleAccess.KeysOf(manager));
        Assert.False((await Role(db, "Operation Engineer")).HoldsAllRights);
        Assert.Equal(1, await db.AppRoles.CountAsync(r => r.HoldsAllRights));
    });

    [ApprovedOverrideSqlFact]
    public Task An_inactive_ITD_Manager_stays_inactive_and_TIO_Manager_keeps_every_right() => WithDatabase(
        "DECLARE @now datetimeoffset = SYSDATETIMEOFFSET(); INSERT [iam].[AppRole] ([Name],[Description],[Key],[Rights],[IsActive],[CreatedAt],[UpdatedAt]) VALUES (N'ITD Manager', NULL, NULL, 0, 0, @now, @now);",
        async db =>
        {
            await Upgrade(db);
            var itd = await Role(db, "ITD Manager");
            Assert.False(itd.IsActive);
            Assert.False(itd.HoldsAllRights);
            Assert.True((await Role(db, "TIO Manager")).HoldsAllRights);
        });
}
