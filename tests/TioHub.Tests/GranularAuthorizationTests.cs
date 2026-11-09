using TioHub.Api.Common;
using System.Net;
using System.Security.Claims;
using System.Text.Json.Nodes;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using TioHub.Api.Data;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Read access is an explicit module grant; action rights never imply visibility.</summary>
[Collection("hub")]
public sealed class GranularAuthorizationTests(HubFactory hub) : Scenario(hub)
{
    private async Task<long> Role(Api manager, params string[] permissions) =>
        await manager.Create("/admin/roles", new { name = U("Granular"), rights = Fixture.Rights(permissions, Flag.None) });

    private async Task<(Api Api, long Id)> User(Api manager, params long[] roleIds)
    {
        var accountName = $@"DEV\{U("granular")}";
        var id = await manager.Create("/admin/users", new { accountName, displayName = "Granular authorization test", workingTimeZone = "UTC", allClients = true, allInternal = true, roleIds });
        return (await Hub.As(accountName), id);
    }

    private static async Task SavePermissions(Api manager, long roleId, params string[] permissions)
    {
        var row = (await manager.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r) == roleId)!;
        var result = await manager.Put($"/admin/roles/{roleId}", new
        {
            name = row["name"]!.GetValue<string>(), rights = Fixture.Rights(permissions, Flag.None)
        }, row["version"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.NoContent, result.Status);
    }

    private static async Task<long> Upload(Api actor, long caseId)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent("Case"), "recordType");
        form.Add(new StringContent(caseId.ToString()), "recordId");
        form.Add(new ByteArrayContent("Protected attachment content"u8.ToArray()), "files", "permission-test.txt");
        using var upload = await actor.Http.PostAsync("/api/v1/attachments", form);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        return Id(Assert.Single(JsonNode.Parse(await upload.Content.ReadAsStringAsync())!.AsArray()));
    }

    [Fact]
    public async Task New_role_with_no_grants_authenticates_but_cannot_read_business_modules()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var (limited, _) = await User(manager, await Role(manager));
        Assert.Equal(HttpStatusCode.OK, limited.SignInStatus);
        Assert.Empty(limited.Me["rights"]!.AsArray());
        foreach (var path in new[] { "/clients", "/cases", "/products", "/commitments", "/teams" })
            Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get(path)).Status);
    }

    [Fact]
    public async Task Maintaining_cases_does_not_grant_case_visibility_or_other_module_visibility()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var work = await NewCase(client);
        var (limited, userId) = await User(manager, await Role(manager, "Cases:Maintain", "ClientStructure:View", "ClientStructure:DetailsView"));

        Assert.Equal(HttpStatusCode.OK, (await limited.Get($"/clients/{client}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get($"/cases/{work}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/products")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Put($"/cases/{work}", new { title = "Must remain unreadable" })).Status);
        Assert.DoesNotContain(limited.Me["rights"]!.AsArray(), p => p!.GetValue<string>() == "Cases:Maintain");
        var inspector = (await manager.Get($"/admin/users/{userId}/access")).Body!;
        Assert.DoesNotContain(inspector["effectiveRights"]!.AsArray(), p => p!["key"]!.GetValue<string>() == "Cases:Maintain");
    }

    [Fact]
    public async Task Multiple_roles_union_explicit_visibility_and_revocation_applies_on_the_next_request()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var first = await Role(manager, "ClientStructure:View", "Cases:Maintain");
        var second = await Role(manager, "Cases:View");
        var (limited, userId) = await User(manager, first, second);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/clients")).Status);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/cases")).Status);

        await SavePermissions(manager, second);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/clients")).Status);
        var inspector = (await manager.Get($"/admin/users/{userId}/access")).Body!;
        Assert.Contains(inspector["restrictedRights"]!.AsArray(), p => p!["key"]!.GetValue<string>() == "Cases:View");
        Assert.DoesNotContain(inspector["effectiveRights"]!.AsArray(), p => p!["key"]!.GetValue<string>() == "Cases:View");
    }

    [Fact]
    public async Task Synchronizing_permission_metadata_twice_does_not_restore_a_revoked_grant()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var roleId = await Role(manager, "Cases:View", "ClientStructure:View");
        var (limited, _) = await User(manager, roleId);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/cases")).Status);
        await SavePermissions(manager, roleId, "ClientStructure:View");

        await using (var scope = Hub.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
            await RightsCatalog.SynchronizeAsync(db);
            await RightsCatalog.SynchronizeAsync(db);
            Assert.False(await db.RoleRights.AnyAsync(p => p.AppRoleId == roleId && p.RightKey == "Cases:View"));
            Assert.Equal(RightsCatalog.All.Length, await db.RightDefinitions.CountAsync(p => p.IsActive));
        }

        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/cases")).Status);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/clients")).Status);
    }

    [Fact]
    public async Task My_dashboard_needs_its_own_right_as_well_as_ticket_access()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var (ticketsOnly, _) = await User(manager, await Role(manager, "Cases:View"));
        Assert.Equal(HttpStatusCode.Forbidden, (await ticketsOnly.Get("/dashboard/me")).Status);
        var (both, _) = await User(manager, await Role(manager, "Cases:View", "MyDashboard:View"));
        Assert.Equal(HttpStatusCode.OK, (await both.Get("/dashboard/me")).Status);
    }

    [Fact]
    public async Task Revocation_invalidates_an_independent_instance_cache_without_waiting_for_expiration()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var roleId = await Role(manager, "Cases:View");
        var (limited, _) = await User(manager, roleId);
        var account = limited.Me["account"]!.GetValue<string>();
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, account)], "Testing"));
        using var otherInstanceCache = new MemoryCache(new MemoryCacheOptions());

        async Task<ResolvedUser?> ResolveFromOtherInstance()
        {
            // Each call represents a request on another app instance: a fresh scoped DbContext, its own long-lived cache.
            await using var scope = Hub.Services.CreateAsyncScope();
            var resolver = new UserResolver(scope.ServiceProvider.GetRequiredService<HubDbContext>(), otherInstanceCache,
                Options.Create(new AuthOptions { Mode = "Development", CacheSeconds = 3600 }), TimeProvider.System, NullLogger<UserResolver>.Instance,
                scope.ServiceProvider.GetRequiredService<IDirectoryGroupLookup>());
            return await resolver.ResolveAsync(principal, CancellationToken.None);
        }

        Assert.Contains("Cases:View", (await ResolveFromOtherInstance())!.Rights);
        await SavePermissions(manager, roleId);
        Assert.DoesNotContain("Cases:View", (await ResolveFromOtherInstance())!.Rights);
    }

    [Fact]
    public async Task Structure_coordination_does_not_bypass_a_delegated_administrators_grant_ceiling()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var delegatedRole = await manager.Create("/admin/roles", new
        {
            name = U("DelegatedAdmin"), rights = Fixture.Rights(new[] { "ClientStructure:View", "ClientStructure:Coordinate" }, Flag.Administer)
        });
        var (delegated, _) = await User(manager, delegatedRole);
        Assert.Equal(HttpStatusCode.OK, (await delegated.Get("/admin/roles")).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await delegated.Post("/admin/roles", new
        {
            name = U("EscalatedRole"), rights = Fixture.Rights(new[] { "Cases:View", "Cases:Delete" }, Flag.None)
        })).Status);

        var managerRole = (await manager.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => r!["isLocked"]!.GetValue<bool>())!;
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await delegated.Post("/admin/users", new
        {
            accountName = $@"DEV\{U("escalation")}", displayName = "Must not receive privileged role", workingTimeZone = "UTC",
            roleIds = new[] { Id(managerRole) }
        })).Status);
    }

    [Fact]
    public async Task Assigning_a_prerequisite_role_cannot_enable_another_roles_permission_above_the_actors_ceiling()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var retained = await manager.Create("/admin/roles", new
        {
            name = U("RetainedDelete"), rights = new[] { "Cases:Delete" }
        });
        var parent = await manager.Create("/admin/roles", new
        {
            name = U("CaseParent"), rights = new[] { "Cases:View" }
        });
        var delegatedRole = await manager.Create("/admin/roles", new
        {
            name = U("DelegatedParent"), rights = Fixture.Rights(new[] { "Cases:View" }, Flag.Administer)
        });
        var (delegated, _) = await User(manager, delegatedRole);
        var (target, targetId) = await User(manager, retained);
        Assert.Equal(HttpStatusCode.Forbidden, (await target.Get("/cases")).Status);
        var current = await manager.Get($"/admin/users/{targetId}");
        var result = await delegated.Put($"/admin/users/{targetId}", new
        {
            displayName = "Granular authorization test", workingTimeZone = "UTC", roleIds = new[] { retained, parent }
        }, current.ETag);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await target.Get("/cases")).Status);
    }

    [Fact]
    public async Task Delegated_admin_cannot_map_an_unknown_directory_group_without_full_capability_authority()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var engineer = (await manager.Get("/admin/roles")).Body!["roles"]!.AsArray()
            .Single(role => role!["key"]?.GetValue<string>() == BuiltInRoles.EngineerKey)!;
        var engineerKeys = engineer["rights"]!.AsArray().Select(key => key!.GetValue<string>()).ToArray();
        var delegatedRole = await manager.Create("/admin/roles", new
        {
            name = U("DelegatedMapping"), rights = Fixture.Rights(engineerKeys, Flag.Administer)
        });
        var (delegated, _) = await User(manager, delegatedRole);
        var result = await delegated.Post("/admin/group-mappings", new { groupName = $@"DEV\{U("unmapped")}", role = "Engineer" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, result.Status);
    }

    [Fact]
    public async Task Detail_visibility_does_not_expose_protected_history_or_attachment_payloads()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var work = await NewCase(await NewClient());
        var role = await manager.Create("/admin/roles", new
        {
            name = U("DetailReader"), rights = Fixture.Rights(new[] { "Cases:View", "Cases:DetailsView" }, Flag.None)
        });
        var (limited, _) = await User(manager, role);
        Assert.NotEmpty((await manager.Get($"/cases/{work}")).Body!["events"]!.AsArray());
        var details = await limited.Get($"/cases/{work}");
        Assert.Equal(HttpStatusCode.OK, details.Status);
        Assert.Empty(details.Body!["events"]!.AsArray());
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get($"/admin/audit?entityType=Case&entityId={work}")).Status);

        var attachmentId = await Upload(manager, work);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get($"/attachments?recordType=Case&recordId={work}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get($"/attachments/{attachmentId}/download")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get($"/attachments/{attachmentId}/preview")).Status);
    }

    [Fact]
    public async Task Attachment_upload_and_own_file_deletion_are_independent_of_record_edit_and_any_file_deletion()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var work = await NewCase(await NewClient());
        var managersFile = await Upload(manager, work);
        var role = await Role(manager, "Cases:View", "Cases:DetailsView", "Cases:AttachmentsView", "Cases:AttachmentsUpload", "Cases:AttachmentsDeleteOwn");
        var (limited, _) = await User(manager, role);
        var ownFile = await Upload(limited, work);

        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Put($"/cases/{work}", new { title = "No record editing authority" })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Send(HttpMethod.Delete, $"/attachments/{managersFile}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await limited.Send(HttpMethod.Delete, $"/attachments/{ownFile}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await manager.Get($"/attachments/{managersFile}/download")).Status);
    }

    [Fact]
    public async Task Cross_cutting_export_right_does_not_bypass_the_source_modules_export_permission()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var name = U("CaseExporter");
        var role = await manager.Create("/admin/roles", new
        {
            name, rights = Fixture.Rights(new[] { "Reporting:View", "Cases:View" }, Flag.Export)
        });
        var (limited, _) = await User(manager, role);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/export/cases")).Status);
        var row = (await manager.Get("/admin/roles")).Body!["roles"]!.AsArray().Single(r => Id(r) == role)!;
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/admin/roles/{role}", new
        {
            name, rights = Fixture.Rights(new[] { "Reporting:View", "Cases:View", "Cases:Export" }, Flag.Export)
        }, row["version"]!.GetValue<string>())).Status);
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/export/cases")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/export/clients")).Status);
    }

    [Fact]
    public async Task Deactivated_user_is_denied_and_access_inspector_reports_no_effective_grants()
    {
        var manager = await Hub.As(HubFactory.Manager);
        var (limited, id) = await User(manager, await Role(manager, "Cases:View"));
        Assert.Equal(HttpStatusCode.OK, (await limited.Get("/cases")).Status);
        var current = await manager.Get($"/admin/users/{id}");
        Assert.Equal(HttpStatusCode.OK, (await manager.Post($"/admin/users/{id}/deactivate", new { reason = "Authorization regression test" }, current.ETag)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await limited.Get("/cases")).Status);
        var inspector = (await manager.Get($"/admin/users/{id}/access")).Body!;
        Assert.Empty(inspector["effectiveRights"]!.AsArray());
        Assert.Empty(inspector["effectiveRights"]!.AsArray());
    }
}

/// <summary>Exercises the deployed pre-upgrade schema and the real upgrade SQL in a uniquely named disposable database.</summary>
[Collection("hub")]
public sealed class GranularAuthorizationUpgradeTests
{
    [Fact]
    public async Task Upgrade_preserves_old_visibility_and_converts_file_and_export_authority_without_broadening_grants()
    {
        var server = Environment.GetEnvironmentVariable("TIOHUB_TEST_SQL") ?? @"(localdb)\MSSQLLocalDB";
        var database = "TioHub_TestAuthorizationUpgrade_" + Guid.NewGuid().ToString("N");
        var connection = new SqlConnectionStringBuilder { DataSource = server, InitialCatalog = database, IntegratedSecurity = true, TrustServerCertificate = true }.ConnectionString;
        var options = new DbContextOptionsBuilder<HubDbContext>().UseSqlServer(connection,
            sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "admin")).Options;
        await using var db = new HubDbContext(options, new UserContext(), TimeProvider.System);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync("20261030062806_PermissionRegistry");
            await db.Database.ExecuteSqlRawAsync("""
                INSERT [iam].[AppRole] ([Name],[Rights],[IsActive],[CreatedAt],[UpdatedAt]) VALUES
                    (N'Upgrade reader',0,1,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET()),
                    (N'Upgrade upload owner',0,1,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET()),
                    (N'Upgrade file administrator',0,1,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET()),
                    (N'Upgrade exporter',16,1,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET());
                INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
                SELECT Id,N'OtherOperations',N'Maintain' FROM [iam].[AppRole] WHERE [Name]=N'Upgrade upload owner';
                INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
                SELECT Id,N'OtherOperations',N'Delete' FROM [iam].[AppRole] WHERE [Name]=N'Upgrade file administrator';
                """);
            await db.Database.MigrateAsync();
            var roles = await db.AppRoles.AsNoTracking().Include(r => r.Rights).Where(r => r.Name.StartsWith("Upgrade ")).ToListAsync();
            Assert.Equal(4, roles.Count);
            // The resources that existed at that release: rights added later (tabs, features) were never part of this role's old visibility.
            var readKeys = RightsCatalog.All.Where(p => p.Action is "View" or "DetailsView" or "HistoryView" or "AttachmentsView"
                && !p.Key.StartsWith("tab.", StringComparison.Ordinal) && (RightsCatalog.BusinessResources.Contains(p.Feature) && p.Feature != RightKeys.Projects || p.Feature is RightKeys.Dashboard or RightKeys.Reporting or RightKeys.PersonalNotes or RightKeys.Notifications))
                .Select(p => p.Key).ToHashSet();
            foreach (var role in roles)
                Assert.True(readKeys.IsSubsetOf(role.Rights.Select(p => p.RightKey)), role.Name + " lost existing visibility.");

            // These are the file-capable resources that existed before Projects became independent.
            var resources = RightsCatalog.All.Where(p => p.Action == RightKeys.AttachmentsUpload && p.Feature != RightKeys.Projects).Select(p => p.Feature).ToArray();
            var reader = roles.Single(r => r.Name == "Upgrade reader");
            Assert.DoesNotContain(reader.Rights, p => p.RightKey.Split(':')[1] is "AttachmentsUpload" or "AttachmentsDeleteOwn" or "AttachmentsDelete" or "Export");
            var uploader = roles.Single(r => r.Name == "Upgrade upload owner");
            var administrator = roles.Single(r => r.Name == "Upgrade file administrator");
            var exporter = roles.Single(r => r.Name == "Upgrade exporter");
            foreach (var resource in resources)
            {
                Assert.Contains(uploader.Rights, p => p.RightKey == $"{resource}:AttachmentsUpload");
                Assert.Contains(uploader.Rights, p => p.RightKey == $"{resource}:AttachmentsDeleteOwn");
                Assert.DoesNotContain(uploader.Rights, p => p.RightKey == $"{resource}:AttachmentsDelete");
                Assert.Contains(administrator.Rights, p => p.RightKey == $"{resource}:AttachmentsDelete");
                Assert.DoesNotContain(administrator.Rights, p => p.RightKey == $"{resource}:AttachmentsUpload" || p.RightKey == $"{resource}:AttachmentsDeleteOwn");
                Assert.Contains(exporter.Rights, p => p.RightKey == $"{resource}:Export");
            }
            var upgradeAudits = await db.AuditEntries.Where(a => a.Action == "PermissionUpgrade" && a.EntityType == "AppRole").ToListAsync();
            foreach (var role in roles) Assert.Contains(upgradeAudits, audit => audit.EntityId == role.Id);
        }
        finally
        {
            SqlConnection.ClearAllPools();
            await db.Database.EnsureDeletedAsync(); // Only this test's generated TioHub_TestAuthorizationUpgrade_* database.
        }
    }
}
