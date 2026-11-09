using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>
/// The upgrade from the 2.47 schema, on a generated database holding every case in docs/RIGHTS-MODEL-DESIGN.md section 5.
/// Each person's access is worked out independently from the old rules and compared with what the new code resolves.
/// </summary>
public sealed class RightsModelUpgradeTests
{
    private const string Previous = "20261103142553_JiraInternalMember";
    private static string Server => Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
    private static string Review => Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../database/05-rights-model-upgrade-review.sql"));

    private static async Task WithDatabase(Func<HubDbContext, Task> test)
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var connection = new SqlConnectionStringBuilder { DataSource = Server, InitialCatalog = "TioHub_TestRights_" + Guid.NewGuid().ToString("N"), IntegratedSecurity = true, TrustServerCertificate = true }.ConnectionString;
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer(connection, sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "admin")).Options;
        await using var db = new HubDbContext(options, new UserContext(), TimeProvider.System);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync(Previous);
            await db.Database.ExecuteSqlRawAsync(Fixture247);
            await test(db);
        }
        finally
        {
            SqlConnection.ClearAllPools();
            await db.Database.EnsureDeletedAsync(); // Only this test's generated TioHub_TestRights_* database.
        }
    }

    // Old keys are stored as Resource + Action.
    private const string Fixture247 = """
        DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
        -- Earlier migrations created the two built-in roles. Pin them to known grants.
        UPDATE [iam].[AppRole] SET [Name] = N'TIO Manager' WHERE [Key] = N'Manager';
        UPDATE [iam].[AppRole] SET [Name] = N'Operation Engineer', [Rights] = 64 WHERE [Key] = N'Engineer';
        DELETE p FROM [iam].[AppRolePermission] p JOIN [iam].[AppRole] r ON r.Id = p.AppRoleId WHERE r.[Key] = N'Engineer';
        INSERT [iam].[AppRole] ([Name],[Key],[Rights],[IsActive],[CreatedAt],[UpdatedAt]) VALUES
            (N'Complete',NULL,48,1,@now,@now), (N'Composed',NULL,0,1,@now,@now), (N'Orphan',NULL,0,1,@now,@now), (N'Mixed',NULL,0,1,@now,@now),
            (N'Contracts base',NULL,0,1,@now,@now), (N'Administrators',NULL,128,1,@now,@now), (N'Switched off',NULL,16,0,@now,@now);
        DECLARE @g TABLE (RoleName nvarchar(60), [Resource] nvarchar(60), [Action] nvarchar(40));
        INSERT @g VALUES
            (N'Complete',N'module.cases',N'Access'), (N'Complete',N'area.Cases',N'Access'), (N'Complete',N'Cases',N'View'), (N'Complete',N'Cases',N'Maintain'), (N'Complete',N'Cases',N'Export'),
            (N'Operation Engineer',N'module.cases',N'Access'), (N'Operation Engineer',N'area.Cases',N'Access'), (N'Operation Engineer',N'tab.Cases.history',N'Access'), (N'Operation Engineer',N'Cases',N'View'), (N'Operation Engineer',N'Cases',N'DetailsView'), (N'Operation Engineer',N'Cases',N'HistoryView'),
            (N'Composed',N'Cases',N'Coordinate'),
            (N'Orphan',N'Cases',N'Delete'),
            (N'Mixed',N'Contracts',N'Maintain'),
            (N'Contracts base',N'module.clients',N'Access'), (N'Contracts base',N'area.Contracts',N'Access'), (N'Contracts base',N'Contracts',N'View'),
            (N'Administrators',N'module.admin',N'Access'), (N'Administrators',N'area.AdminUsers',N'Access'), (N'Administrators',N'AdminUsers',N'View'), (N'Administrators',N'AdminUsers',N'Maintain'), (N'Administrators',N'module.clients',N'Access'), (N'Administrators',N'area.Contracts',N'Access'), (N'Administrators',N'Contracts',N'View'),
            (N'Switched off',N'module.cases',N'Access'), (N'Switched off',N'area.Cases',N'Access'), (N'Switched off',N'Cases',N'View');
        INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action]) SELECT r.Id, g.[Resource], g.[Action] FROM @g g JOIN [iam].[AppRole] r ON r.Name = g.RoleName;
        INSERT [iam].[User] ([AccountName],[DisplayName],[WorkingTimeZone],[IsActive],[AllClients],[AllInternal],[Grants],[MappedGroups],[CreatedAt],[UpdatedAt]) VALUES
            (N'T\complete',N'Complete',N'UTC',1,1,0,7,NULL,@now,@now), (N'T\composed',N'Composed',N'UTC',1,1,1,0,NULL,@now,@now), (N'T\orphan',N'Orphan',N'UTC',1,1,1,0,NULL,@now,@now),
            (N'T\mixedok',N'Mixed OK',N'UTC',1,1,1,0,NULL,@now,@now), (N'T\mixedno',N'Mixed no',N'UTC',1,1,1,0,NULL,@now,@now), (N'T\admin',N'Admin',N'UTC',1,1,1,0,NULL,@now,@now),
            (N'T\denied',N'Denied',N'UTC',1,1,1,0,NULL,@now,@now), (N'T\allowed',N'Allowed',N'UTC',1,1,1,0,NULL,@now,@now), (N'T\member',N'Member',N'UTC',1,1,1,0,NCHAR(0)+N'v4:d:["T\\Ops"]',@now,@now);
        DECLARE @ur TABLE (Account nvarchar(100), RoleName nvarchar(60));
        INSERT @ur VALUES (N'T\complete',N'Complete'), (N'T\complete',N'Switched off'), (N'T\composed',N'Complete'), (N'T\composed',N'Composed'), (N'T\orphan',N'Orphan'),
            (N'T\mixedok',N'Mixed'), (N'T\mixedok',N'Contracts base'), (N'T\mixedno',N'Mixed'), (N'T\admin',N'Administrators'), (N'T\admin',N'Mixed'),
            (N'T\denied',N'Complete'), (N'T\allowed',N'Contracts base'), (N'T\member',N'Composed');
        INSERT [iam].[UserRole] ([UserId],[AppRoleId]) SELECT u.Id, r.Id FROM @ur x JOIN [iam].[User] u ON u.AccountName = x.Account JOIN [iam].[AppRole] r ON r.Name = x.RoleName;
        INSERT [iam].[GroupMapping] ([GroupName],[Role],[AllClients],[AllInternal],[Grants],[CreatedAt],[UpdatedAt]) VALUES (N'T\Ops',N'Engineer',1,0,4,@now,@now), (N'T\Nobody',NULL,0,1,0,@now,@now);
        DECLARE @o TABLE (Account nvarchar(100), [Key] nvarchar(120), Effect nvarchar(5), ExpiresAt datetimeoffset NULL);
        INSERT @o VALUES (N'T\denied',N'area.Cases:Access',N'Deny',NULL), (N'T\allowed',N'Contracts:Maintain',N'Allow',DATEADD(day,3,@now)), (N'T\orphan',N'Cases:View',N'Allow',NULL);
        INSERT [iam].[UserPermissionOverride] ([UserId],[PermissionKey],[Effect],[ExpiresAt]) SELECT u.Id, o.[Key], o.Effect, o.ExpiresAt FROM @o o JOIN [iam].[User] u ON u.AccountName = o.Account;
        """;

    private static async Task<string[]> RoleRights(HubDbContext db, string role) =>
        (await db.RoleRights.AsNoTracking().Where(r => r.AppRole!.Name == role).Select(r => r.RightKey).ToListAsync()).Order(StringComparer.Ordinal).ToArray();

    private static async Task<ResolvedUser> Effective(HubDbContext db, string account, params string[] groups)
    {
        var user = await db.Users.AsNoTracking().Include(u => u.Roles).Include(u => u.Scopes).SingleAsync(u => u.AccountName == account);
        var mappings = await db.GroupMappings.AsNoTracking().Include(m => m.Scopes).Include(m => m.Roles).Where(m => groups.Contains(m.GroupName)).ToListAsync();
        return await AccessCalculator.ComputeAsync(db, user, mappings, CancellationToken.None);
    }

    private static async Task Upgrade(HubDbContext db)
    {
        await db.GetService<IMigrator>().MigrateAsync();
        // A later release's grant, not part of this upgrade. My_dashboard_goes_to_every_role_holding_ticket_view tests it.
        await db.Database.ExecuteSqlRawAsync("DELETE g FROM [iam].[RoleRight] g JOIN [iam].[AppRole] r ON r.Id = g.AppRoleId WHERE g.[RightKey] = N'MyDashboard:View' AND ISNULL(r.[Key], N'') <> N'Manager'");
        await RightsCatalog.SynchronizeAsync(db);
    }

    [ApprovedOverrideSqlFact]
    public Task My_dashboard_goes_to_every_role_holding_ticket_view() => WithDatabase(async db =>
    {
        await db.GetService<IMigrator>().MigrateAsync();
        var complete = await RoleRights(db, "Complete");
        Assert.Contains("Cases:View", complete);
        Assert.Contains("MyDashboard:View", complete);
        Assert.DoesNotContain("MyDashboard:View", await RoleRights(db, "Composed"));
        Assert.Empty(await RoleRights(db, "Orphan"));
        await RightsCatalog.SynchronizeAsync(db);
        var row = await db.RightDefinitions.AsNoTracking().SingleAsync(r => r.Key == "MyDashboard:View");
        Assert.Equal(("Dashboard", "MyDashboard", true), (row.Module, row.Feature, row.IsActive));
    });

    [ApprovedOverrideSqlFact]
    public Task Role_grants_convert_by_the_documented_rules() => WithDatabase(async db =>
    {
        await Upgrade(db);
        // Rule 1: the action and its containers on one role. Containers themselves have no successor.
        Assert.Equal(["Cases:Export", "Cases:Maintain", "Cases:View", "Platform:Export", "Platform:TechnicalDetail"], await RoleRights(db, "Complete"));
        // Rule 2: every holder of this role got the containers from another role.
        Assert.Equal(["Cases:Coordinate"], await RoleRights(db, "Composed"));
        // Stored but never usable: not carried.
        Assert.Empty(await RoleRights(db, "Orphan"));
        // Rule 3: one holder could use it and another could not, so the role keeps nothing and the first person keeps it directly.
        Assert.Empty(await RoleRights(db, "Mixed"));
        var mixedOk = await db.Users.SingleAsync(u => u.AccountName == @"T\mixedok");
        var allow = await db.UserRightExceptions.AsNoTracking().SingleAsync(e => e.UserId == mixedOk.Id);
        Assert.Equal(("Contracts:Maintain", "Allow", null), (allow.RightKey, allow.Effect, (DateTimeOffset?)allow.ExpiresAt));
        // Old flags become rights. A flag on an inactive role stays stored there and gives nobody anything.
        Assert.Contains("Platform:Administration", await RoleRights(db, "Administrators"));
        Assert.Equal(["Cases:View", "Platform:Export"], await RoleRights(db, "Switched off"));
        Assert.Equal(RightsCatalog.AllKeys.Length, (await RoleRights(db, "TIO Manager")).Length);
    });

    [ApprovedOverrideSqlFact]
    public Task Effective_access_does_not_change_for_anyone() => WithDatabase(async db =>
    {
        await Upgrade(db);
        Assert.Equal(["Cases:Export", "Cases:Maintain", "Cases:View", "Platform:Export", "Platform:TechnicalDetail"], (await Effective(db, @"T\complete")).Rights);
        // Composed through two roles, and still working.
        Assert.Contains("Cases:Coordinate", (await Effective(db, @"T\composed")).Rights);
        // The direct allow on View did not give this person the containers before, and does not make Delete work now.
        Assert.Empty((await Effective(db, @"T\orphan")).Rights);
        Assert.Equal(["Contracts:Maintain", "Contracts:View"], (await Effective(db, @"T\mixedok")).Rights);
        Assert.Empty((await Effective(db, @"T\mixedno")).Rights);
        // A deny on a container denies everything below it.
        Assert.Equal(["Platform:Export", "Platform:TechnicalDetail"], (await Effective(db, @"T\denied")).Rights);
        // A temporary allow keeps its expiry.
        var allowed = await Effective(db, @"T\allowed");
        Assert.Contains("Contracts:Maintain", allowed.Rights);
        Assert.NotNull(allowed.NextRightExpiry);
        // A mapped built-in role still works through the mapping, and supplied this person's containers.
        var member = await Effective(db, @"T\member", @"T\Ops");
        Assert.Contains("Cases:HistoryView", member.Rights);
        Assert.Contains("Cases:Coordinate", member.Rights);
        Assert.Contains("Platform:Audit", member.Rights);
    });

    [ApprovedOverrideSqlFact]
    public Task A_flag_on_a_user_or_mapping_that_never_had_any_effect_gives_no_access() => WithDatabase(async db =>
    {
        await Upgrade(db);
        // T\complete stored Grants = 7, which 2.47 ignored. Complete has no Audit flag, so the person must not gain it.
        var rights = (await Effective(db, @"T\complete")).Rights;
        Assert.DoesNotContain("Platform:Audit", rights);
        Assert.Contains("Platform:Export", rights);
    });

    [ApprovedOverrideSqlFact]
    public Task Directory_mappings_keep_their_role_and_scope() => WithDatabase(async db =>
    {
        await Upgrade(db);
        var ops = await db.GroupMappings.AsNoTracking().Include(m => m.Roles).ThenInclude(r => r.AppRole).SingleAsync(m => m.GroupName == @"T\Ops");
        Assert.Equal("Engineer", Assert.Single(ops.Roles).AppRole!.Key);
        Assert.True(ops.AllClients);
        var nobody = await db.GroupMappings.AsNoTracking().Include(m => m.Roles).SingleAsync(m => m.GroupName == @"T\Nobody");
        Assert.Empty(nobody.Roles);
        Assert.True(nobody.AllInternal);
    });

    [ApprovedOverrideSqlFact]
    public Task An_administrator_who_used_a_right_through_another_role_is_reported_not_silently_dropped() => WithDatabase(async db =>
    {
        await Upgrade(db);
        // T\admin held Mixed (Contracts:Maintain) plus containers from Administrators. Direct allows do not apply to administrators.
        Assert.DoesNotContain("Contracts:Maintain", (await Effective(db, @"T\admin")).Rights);
        var audit = await db.AuditEntries.AsNoTracking().SingleAsync(a => a.Action == "RightsModelUpgrade" && a.EntityType == "User" && a.EntityLabel == @"T\admin");
        Assert.Contains("OWNER REVIEW", audit.Reason);
        Assert.Contains("Contracts:Maintain", audit.Changes);
    });

    [ApprovedOverrideSqlFact]
    public Task The_upgrade_is_audited_and_old_data_is_left_in_place() => WithDatabase(async db =>
    {
        async Task<int> Count(string table) => await db.Database.SqlQueryRaw<int>($"SELECT COUNT(*) AS [Value] FROM {table}").SingleAsync();
        var (grants, exceptions) = (await Count("[iam].[AppRolePermission]"), await Count("[iam].[UserPermissionOverride]"));
        var history = await db.AuditEntries.CountAsync();
        var version = await db.AuthorizationVersions.AsNoTracking().Select(v => v.Version).SingleAsync();
        await Upgrade(db);
        Assert.Equal(grants, await Count("[iam].[AppRolePermission]"));
        Assert.Equal(exceptions, await Count("[iam].[UserPermissionOverride]"));
        Assert.Equal(7, await db.Database.SqlQueryRaw<int>("SELECT [Grants] AS [Value] FROM [iam].[User] WHERE [AccountName] = N'T\\complete'").SingleAsync());
        Assert.True(await db.AuditEntries.CountAsync() > history);
        Assert.Equal(await db.AppRoles.CountAsync(), await db.AuditEntries.CountAsync(a => a.Action == "RightsModelUpgrade" && a.EntityType == "AppRole"));
        Assert.True(await db.AuthorizationVersions.AsNoTracking().Select(v => v.Version).SingleAsync() > version);
        // Retired columns no longer block writes by the new code, and retired rows no longer block deletes.
        db.AppRoles.Add(new AppRole { Name = "After upgrade" });
        await db.SaveChangesAsync();
        var user = await db.Users.SingleAsync(u => u.AccountName == @"T\orphan");
        await db.UserRightExceptions.Where(e => e.UserId == user.Id).ExecuteDeleteAsync();
        await db.UserRoles.Where(r => r.UserId == user.Id).ExecuteDeleteAsync();
        await db.Users.Where(u => u.Id == user.Id).ExecuteDeleteAsync();
    });

    [ApprovedOverrideSqlFact]
    public Task The_review_script_writes_nothing_and_reports_what_the_migration_will_do() => WithDatabase(async db =>
    {
        var connection = db.Database.GetConnectionString()!;
        await using var sql = new SqlConnection(connection);
        await sql.OpenAsync();
        await using var cmd = sql.CreateCommand();
        cmd.CommandText = await File.ReadAllTextAsync(Review);
        cmd.CommandTimeout = 300;
        var sets = new List<List<object[]>>();
        await using (var reader = await cmd.ExecuteReaderAsync())
            do
            {
                var rows = new List<object[]>();
                while (await reader.ReadAsync()) { var v = new object[reader.FieldCount]; reader.GetValues(v); rows.Add(v); }
                sets.Add(rows);
            } while (await reader.NextResultAsync());
        Assert.Equal(9, sets.Count);
        Assert.Contains(sets[1], r => (string)r[0] == @"T\admin" && (string)r[1] == "Contracts:Maintain");
        Assert.Contains(sets[2], r => (string)r[0] == @"T\mixedok" && (string)r[1] == "Contracts:Maintain");
        Assert.Contains(sets[3], r => (string)r[0] == @"T\denied" && (string)r[1] == "Cases:View");
        Assert.Contains(sets[4], r => (string)r[0] == "Composed" && (string)r[1] == "Cases:Coordinate");
        Assert.Contains(sets[5], r => (string)r[0] == "Orphan" && (string)r[1] == "Cases:Delete");
        Assert.Contains(sets[6], r => (string)r[1] == @"T\complete");
        Assert.Contains(Previous, await db.Database.GetAppliedMigrationsAsync());
        Assert.DoesNotContain(await db.Database.GetAppliedMigrationsAsync(), m => m.EndsWith("_RightsModel", StringComparison.Ordinal));
    });

    [ApprovedOverrideSqlFact]
    public Task Down_restores_the_previous_schema_with_the_old_rows() => WithDatabase(async db =>
    {
        await Upgrade(db);
        var migrator = db.GetService<IMigrator>();
        await migrator.MigrateAsync(Previous);
        Assert.Equal(0, await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM sys.tables WHERE [name] IN ('RoleRight','RightDefinition','UserRightException','GroupMappingRole')").SingleAsync());
        Assert.True(await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM [iam].[AppRolePermission]").SingleAsync() > 0);
        Assert.Equal(1, await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM sys.foreign_keys WHERE [name] = 'FK_UserPermissionOverride_User_UserId'").SingleAsync());
        await migrator.MigrateAsync();
        Assert.NotEmpty(await RoleRights(db, "Complete"));
    });
}
