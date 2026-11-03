using System.Net;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>Real SQL/API scope regression. Runs only with explicit isolated database approval.</summary>
public sealed class QualityScopeSqlIntegrationTests
{
    private static string Unique(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..(prefix.Length + 9)];

    [ApprovedOverrideSqlFact]
    public async Task Case_team_transfer_revokes_old_quality_finding_before_scan_and_refreshes_new_scope()
    {
        if (Environment.GetEnvironmentVariable(ApprovedOverrideSqlFactAttribute.ApprovalVariable) != "migrate-and-drop-isolated-database")
            throw new InvalidOperationException("Explicit isolated database migration and deletion approval is required.");
        var hub = new HubFactory();
        try
        {
            var admin = await hub.As(HubFactory.Manager);
            async Task<long> Team() => await admin.Create("/teams", new { code = Unique("T"), name = Unique("Team") });
            var oldTeam = await Team();
            var newTeam = await Team();
            var role = await admin.Create("/admin/roles", new
            {
                name = Unique("quality-role"),
                permissions = PermissionHierarchy.WithAncestors([.. CapabilityPermissions.BusinessViewKeys, .. CapabilityPermissions.Dependencies("DataQuality:View"), "DataQuality:View"]),
                rights = Array.Empty<string>()
            });
            async Task<Api> Reader(long team)
            {
                var account = $@"DEV\{Unique("quality-user")}";
                await admin.Create("/admin/users", new
                {
                    accountName = account, displayName = "Quality reader", workingTimeZone = "UTC", roleIds = new[] { role },
                    scopes = new[] { new { kind = "InternalTeam", clientId = (long?)null, projectId = (long?)null, teamId = team } }
                });
                var reader = await hub.As(account);
                Assert.Equal(HttpStatusCode.OK, reader.SignInStatus);
                return reader;
            }
            var oldReader = await Reader(oldTeam);
            var newReader = await Reader(newTeam);
            var title = Unique("Quality-case");
            var reviewAt = DateTimeOffset.UtcNow.AddDays(1);
            var caseId = await admin.Create("/cases", new
            {
                title, type = "Incident", scope = "Internal", responsibleTeamId = oldTeam,
                impactSummary = "Internal issue", priority = "High", nextAction = "Investigate", nextReviewAt = reviewAt,
                affected = new { unknownEnvironmentReason = "Not identified" }
            });
            Assert.Equal(HttpStatusCode.OK, (await admin.Post("/data-quality/scan")).Status);

            async Task<bool> HasFinding(Api reader)
            {
                var result = await reader.Get("/data-quality?rule=UnknownEnvironment&recordType=Case&pageSize=200");
                Assert.Equal(HttpStatusCode.OK, result.Status);
                return result.Body!["items"]!.AsArray().Any(x => x!["recordId"]!.GetValue<long>() == caseId);
            }
            Assert.True(await HasFinding(oldReader));
            Assert.False(await HasFinding(newReader));

            var version = await admin.Version($"/cases/{caseId}");
            var update = await admin.Put($"/cases/{caseId}", new
            {
                title, type = "Incident", responsibleTeamId = newTeam, impactSummary = "Internal issue", priority = "High",
                nextAction = "Investigate", nextReviewAt = reviewAt
            }, version);
            Assert.Equal(HttpStatusCode.NoContent, update.Status);
            Assert.False(await HasFinding(oldReader)); // Revocation must not wait for the scanner.
            Assert.False(await HasFinding(newReader)); // The stale finding is not yet assigned to the new scope.

            Assert.Equal(HttpStatusCode.OK, (await admin.Post("/data-quality/scan")).Status);
            Assert.False(await HasFinding(oldReader));
            Assert.True(await HasFinding(newReader));
        }
        finally { await hub.DisposeAsync(); }
    }
}
