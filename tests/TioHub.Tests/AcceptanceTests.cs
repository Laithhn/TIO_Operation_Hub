using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Text.Json.Nodes;

namespace TioHub.Tests;

/// <summary>Shared helpers for acceptance scenarios. Every test creates its own uniquely coded data.</summary>
public abstract class Scenario(HubFactory hub)
{
    protected HubFactory Hub { get; } = hub;
    protected static string U(string prefix) => $"{prefix}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    protected static string Future(int days, int hour = 17) => DateTime.UtcNow.AddDays(days).ToString("yyyy-MM-dd") + $"T{hour:00}:00";

    protected async Task<long> NewClient(string? code = null, string status = "Active")
    {
        var m = await Hub.As(HubFactory.Manager);
        return await m.Create("/clients", new { code = code ?? U("C"), name = "Fictional " + Guid.NewGuid().ToString("N")[..6], country = "Oman", ownerUserId = m.UserId, status });
    }

    protected async Task<long> NewEnv(long clientId, string name, long? regionId = null, string criticality = "Normal", long? owner = null)
    {
        var m = await Hub.As(HubFactory.Manager);
        return await m.Create("/environments", new { clientId, regionId, name, type = "Production", criticality, ownerUserId = owner ?? m.UserId, backupGapReason = "Test gap" });
    }

    protected async Task<long> Team(string code = "OPS")
    {
        var m = await Hub.As(HubFactory.Manager);
        return (await m.Get("/teams")).Body!.AsArray().First(t => t!["code"]!.GetValue<string>() == code)!["id"]!.GetValue<long>();
    }

    protected async Task<long> NewCase(long? clientId, long? envId = null, long? owner = null, string scope = "Client", string? dueLocal = null, string asUser = HubFactory.Manager)
    {
        var a = await Hub.As(asUser);
        return await a.Create("/cases", new
        {
            title = "Import stopped " + Guid.NewGuid().ToString("N")[..4], type = "Incident", scope, clientId, responsibleTeamId = await Team(), impactSummary = "Degraded imports", priority = "High",
            ownerUserId = owner, nextAction = "Investigate", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1), dueLocal, dueTimeZone = dueLocal is null ? null : "Asia/Riyadh",
            affected = new { environmentIds = envId is null ? Array.Empty<long>() : new[] { envId.Value } }
        });
    }

    protected static long Id(JsonNode? n) => n!["id"]!.GetValue<long>();
}

[Collection("hub")]
public class AC01_ClientHierarchy(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Clients_with_and_without_regions_keep_distinct_environments_and_reject_invalid_links()
    {
        var m = await Hub.As(HubFactory.Manager);
        var direct = await NewClient();
        var regional = await NewClient();
        // Client without regions: Production and Staging directly under the client.
        var dProd = await NewEnv(direct, "Production");
        var dStg = await m.Create("/environments", new { clientId = direct, name = "Staging", type = "Staging", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "gap" });
        // Client with two regions, Production in each.
        var r1 = await m.Create($"/clients/{regional}/regions", new { code = "R1", name = "R1 North", ownerUserId = m.UserId });
        var r2 = await m.Create($"/clients/{regional}/regions", new { code = "R2", name = "R2 Coast", ownerUserId = m.UserId });
        var p1 = await NewEnv(regional, "Production", r1);
        var p2 = await NewEnv(regional, "Production", r2);
        Assert.NotEqual(p1, p2);

        // Same-scope duplicate name rejected (direct scope, and within a region).
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post("/environments", new { clientId = direct, name = "production", type = "Production", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "g" })).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post("/environments", new { clientId = regional, regionId = r1, name = "Production", type = "Production", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "g" })).Status);
        // Cross-client region link rejected.
        var cross = await m.Post("/environments", new { clientId = direct, regionId = r1, name = "Sneaky", type = "Test", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "g" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, cross.Status);
        Assert.NotNull(cross.Error("regionId"));
        // Duplicate region code within a client rejected.
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post($"/clients/{regional}/regions", new { code = "R1", name = "Again", ownerUserId = m.UserId })).Status);

        // Navigation and counts stay distinct.
        Assert.Equal(2, (await m.Get($"/environments?clientId={direct}")).Total);
        Assert.Equal(1, (await m.Get($"/environments?clientId={regional}&regionId={r1}")).Total);
        Assert.Equal(2, (await m.Get($"/environments?clientId={regional}")).Total);
        var ov = (await m.Get($"/clients/{direct}/overview")).Body!;
        Assert.Equal("Direct", ov["structure"]!.GetValue<string>());
        Assert.Equal(2, ov["directEnvironments"]!.AsArray().Count);
        var ovr = (await m.Get($"/clients/{regional}/overview")).Body!;
        Assert.Equal(2, ovr["regions"]!.AsArray().Count);

        // No missing-region warning anywhere for the direct client.
        await m.Ok("/data-quality/scan");
        var dq = (await m.Get($"/data-quality?clientId={direct}&pageSize=200")).Body!["items"]!.AsArray();
        Assert.DoesNotContain(dq, i => i!["detail"]!.GetValue<string>().Contains("region", StringComparison.OrdinalIgnoreCase));
        _ = dStg; _ = dProd;
    }

    [Fact]
    public async Task Region_archival_is_blocked_while_active_environments_remain_and_reassignment_is_audited()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var r1 = await m.Create($"/clients/{c}/regions", new { code = "R1", name = "One", ownerUserId = m.UserId });
        var r2 = await m.Create($"/clients/{c}/regions", new { code = "R2", name = "Two", ownerUserId = m.UserId });
        var env = await NewEnv(c, "Production", r1);
        var blocked = await m.Post($"/regions/{r1}/archive", new { reason = "Closing region" }, await m.Version($"/regions/{r1}"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, blocked.Status);

        // Reassign with a reason (audited), then archival is allowed.
        var e = await m.Get($"/environments/{env}");
        var noReason = await m.Put($"/environments/{env}", new { clientId = c, regionId = r2, name = "Production", type = "Production", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "g" }, e.ETag);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, noReason.Status);
        var moved = await m.Put($"/environments/{env}", new { clientId = c, regionId = r2, name = "Production", type = "Production", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "g", regionChangeReason = "Region merged" }, e.ETag);
        Assert.Equal(HttpStatusCode.NoContent, moved.Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post($"/regions/{r1}/archive", new { reason = "Closing region" }, await m.Version($"/regions/{r1}"))).Status);
        var audit = (await m.Get($"/admin/audit?entityType=Environment&entityId={env}")).Body!["items"]!.AsArray();
        Assert.Contains(audit, a => a!["reason"]?.GetValue<string>()?.Contains("Region merged") == true);
    }
}

[Collection("hub")]
public class AC02_Onboarding(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Clients_need_a_listed_country_a_project_manager_and_an_opportunity_or_active_status()
    {
        // Owner decisions (UAT 19 Oct 2026): no client without a country, the country comes from the world list, status is
        // Opportunity or Active, the project manager is required; responsibility fields are out of scope (always TIO).
        var m = await Hub.As(HubFactory.Manager);
        var none = await m.Post("/clients", new { code = U("C"), name = "X", ownerUserId = m.UserId });
        Assert.NotNull(none.Error("country"));
        var invented = await m.Post("/clients", new { code = U("C"), name = "X", country = "Atlantis", ownerUserId = m.UserId });
        Assert.NotNull(invented.Error("country"));
        Assert.NotNull((await m.Post("/clients", new { code = U("C"), name = "X", country = "Oman" })).Error("ownerUserId"));
        Assert.NotNull((await m.Post("/clients", new { code = U("C"), name = "X", country = "Oman", ownerUserId = m.UserId, status = "Archived" })).Error("status"));
        var reference = (await m.Get("/reference")).Body!;
        Assert.Equal(["Opportunity", "Active", "Archived"], reference["enums"]!["ClientStatus"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.Contains("United Arab Emirates", reference["countries"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.True(reference["countries"]!.AsArray().Count > 190);
        // Spelling is normalized to the list; responsibility fields sent by an old client are ignored.
        var c = await m.Create("/clients", new { code = U("C"), name = "Fictional Opportunity", country = "saudi arabia", ownerUserId = m.UserId, status = "Opportunity",
            responsibleParty = "Vendor", responsibleOrganization = "Someone else", partner = "P", parentOrganization = "Q" });
        var created = (await m.Get($"/clients/{c}")).Body!;
        Assert.Equal("Saudi Arabia", created["country"]!.GetValue<string>());
        Assert.Equal("Opportunity", created["status"]!.GetValue<string>());
        Assert.Equal("TIO", created["responsibleParty"]!.GetValue<string>());
        Assert.True(created["responsibleOrganization"] is null);
        var noChannel = await m.Post($"/clients/{c}/contacts", new { name = "Person" });
        Assert.NotNull(noChannel.Error("email"));
        await m.Create($"/clients/{c}/contacts", new { name = "Person", email = "person@example.com" });

        // Two roles, one TIO team: every Operation Engineer sees every client, but only the TIO Manager creates clients.
        var e2 = await Hub.As(HubFactory.Engineer2);
        Assert.Equal(HttpStatusCode.OK, (await e2.Get($"/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e2.Post("/clients", new { code = U("C"), name = "X", country = "Oman", ownerUserId = e2.UserId })).Status);
    }

    [Fact]
    public async Task Duplicate_alias_is_reported_to_every_user()
    {
        foreach (var account in new[] { HubFactory.Lead, HubFactory.Engineer2 })
        {
            var dup = await (await Hub.As(account)).Get("/clients/duplicates?code=DEMO-NTA");
            Assert.Single(dup.Body!["visible"]!.AsArray());
            Assert.Equal(0, dup.Body!["hiddenCount"]!.GetValue<int>());
        }
    }
}

[Collection("hub")]
public class AC01b_EnvironmentRules(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Regional_clients_need_a_region_hosting_is_fixed_and_engineers_are_optional()
    {
        var m = await Hub.As(HubFactory.Manager);
        var direct = await NewClient();
        var regional = await NewClient();
        var r1 = await m.Create($"/clients/{regional}/regions", new { code = "R1", name = "R1 North", ownerUserId = m.UserId });
        // Owner decision: a client with regions has no environment outside them; a client without regions does.
        var outside = await m.Post("/environments", new { clientId = regional, name = "Production", type = "Production", criticality = "Critical", ownerUserId = m.UserId });
        Assert.NotNull(outside.Error("regionId"));
        // Operation engineer and backup operation engineer are optional, no coverage-gap reason is required.
        var inRegion = await m.Create("/environments", new { clientId = regional, regionId = r1, name = "Production", type = "Production", criticality = "Critical", ownerUserId = m.UserId, hosting = "Cloud" });
        var plain = await m.Create("/environments", new { clientId = direct, name = "Production", type = "Production", criticality = "Normal" });
        Assert.Equal("Cloud", (await m.Get($"/environments/{inRegion}")).Body!["hosting"]!.GetValue<string>());
        Assert.Equal("Unknown", (await m.Get($"/environments/{plain}")).Body!["hosting"]!.GetValue<string>());
        Assert.Equal(["Unknown", "OnPrem", "Cloud"], (await m.Get("/reference")).Body!["enums"]!["HostingType"]!.AsArray().Select(x => x!.GetValue<string>()));
        var oldHosting = await m.Post("/environments", new { clientId = direct, name = "Staging", type = "Staging", criticality = "Normal", hosting = "Client data centre" });
        Assert.True(oldHosting.Status is HttpStatusCode.BadRequest or HttpStatusCode.UnprocessableEntity, $"Old hosting value accepted: {(int)oldHosting.Status}");
        // A critical environment without a backup still shows as a coverage gap.
        var gaps = (await m.Get($"/dashboard/actions?clientId={regional}&category=CoverageGap")).Body!["items"]!.AsArray();
        Assert.Contains(gaps, g => g!["recordType"]!.GetValue<string>() == "Environment" && g["recordId"]!.GetValue<long>() == inRegion);
    }
}

[Collection("hub")]
public class AC03_InstallationsAndHosts(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Named_instances_many_to_many_hosts_and_version_changes_need_evidence()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        var refd = (await m.Get("/reference")).Body!;
        var psop = refd["products"]!.AsArray().First(p => p!["code"]!.GetValue<string>() == "PSOP")!;
        var pid = Id(psop);
        var v1 = psop["versions"]!.AsArray().First(v => v!["version"]!.GetValue<string>() == "4.9.0")!["id"]!.GetValue<long>();
        var v2 = psop["versions"]!.AsArray().First(v => v!["version"]!.GetValue<string>() == "4.10.1")!["id"]!.GetValue<long>();

        var main = await m.Create("/installations", new { environmentId = env, productId = pid, instanceName = "Main", productVersionId = v1, versionEvidence = "RN-1" });
        var archive = await m.Create("/installations", new { environmentId = env, productId = pid, instanceName = "Archive" });
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post("/installations", new { environmentId = env, productId = pid, instanceName = "main" })).Status);
        // Owner decision (20 Oct 2026): version evidence is optional; the initial version is still recorded in the history.
        var third = await m.Create("/installations", new { environmentId = env, productId = pid, instanceName = "Third", productVersionId = v1 });
        Assert.Single((await m.Get($"/installations/{third}")).Body!["versionHistory"]!.AsArray());

        var a1 = await m.Create("/assets", new { environmentId = env, name = "web01", type = "VM", lifecycle = "Active", ownerUserId = m.UserId });
        var a2 = await m.Create("/assets", new { environmentId = env, name = "web02", type = "VM", lifecycle = "Active", ownerUserId = m.UserId });
        var web = await m.Create("/components", new { installationId = main, name = "Web", role = "Web", ownerUserId = m.UserId, hostAssetIds = new[] { a1, a2 } });
        await m.Create("/components", new { installationId = archive, name = "Archive web", role = "Web", ownerUserId = m.UserId, hostAssetIds = new[] { a1 } });
        var asset = (await m.Get($"/assets/{a1}")).Body!;
        Assert.Equal(2, asset["components"]!.AsArray().Count);
        Assert.Equal(2, (await m.Get($"/components/{web}")).Body!["hosts"]!.AsArray().Count);
        // Removing a host link (regression: link rows must be removable without deleting history).
        var webDto = await m.Get($"/components/{web}");
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/components/{web}", new { installationId = main, name = "Web", role = "Web", ownerUserId = m.UserId, hostAssetIds = new[] { a2 } }, webDto.ETag)).Status);
        Assert.Single((await m.Get($"/components/{web}")).Body!["hosts"]!.AsArray());
        await m.Put($"/components/{web}", new { installationId = main, name = "Web", role = "Web", ownerUserId = m.UserId, hostAssetIds = new[] { a1, a2 } }, (await m.Get($"/components/{web}")).ETag);

        // Hosts must be in the same environment/client.
        var otherEnv = await NewEnv(await NewClient(), "Production");
        var foreign = await m.Create("/assets", new { environmentId = otherEnv, name = "x01", type = "VM", ownerUserId = m.UserId });
        Assert.NotNull((await m.Post("/components", new { installationId = main, name = "Bad", role = "Web", ownerUserId = m.UserId, hostAssetIds = new[] { foreign } })).Error("hostAssetIds"));

        // Version edits only through explicit confirmation with a reason (evidence optional since 20 Oct 2026); history kept.
        var inst = await m.Get($"/installations/{main}");
        var sneaky = await m.Put($"/installations/{main}", new { instanceName = "Main", productVersionId = v2 }, inst.ETag);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, sneaky.Status);
        Assert.NotNull((await m.Post($"/installations/{main}/version", new { productVersionId = v2 }, inst.ETag)).Error("reason"));
        await m.Ok($"/installations/{main}/version", new { productVersionId = v2, reason = "Upgrade" }, inst.ETag);
        var hist = (await m.Get($"/installations/{main}")).Body!["versionHistory"]!.AsArray();
        Assert.Equal(2, hist.Count);
        Assert.Equal("4.9.0", hist[0]!["from"]!.GetValue<string>());

        // Matrix: two installations, one environment counted once; unknown version listed separately.
        var mx = (await m.Get($"/version-matrix?clientId={c}")).Body!;
        var s = mx["summary"]!.AsArray().First(x => x!["productCode"]!.GetValue<string>() == "PSOP")!;
        Assert.Equal(3, s["installations"]!.GetValue<int>());
        Assert.Equal(1, s["environments"]!.GetValue<int>());
        Assert.Equal(1, s["unknownVersion"]!.GetValue<int>());
    }
}

[Collection("hub")]
public class AC04_ResourceQuality(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Units_unknowns_logical_endpoints_and_shared_storage()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        var vm = await m.Create("/assets", new { environmentId = env, name = "app01", type = "VM", cpuQuantity = 8, cpuUnit = "vCPU", ramQuantity = 32, ramUnit = "GB", osFamily = "Linux", ownerUserId = m.UserId });
        var phys = await m.Create("/assets", new { environmentId = env, name = "db01", type = "Physical", cpuQuantity = 16, cpuUnit = "PhysicalCore", ramQuantity = 128, ramUnit = "GiB", osFamily = "Linux", ownerUserId = m.UserId });
        await m.Create("/assets", new { environmentId = env, name = "app02", type = "VM", ownerUserId = m.UserId });
        await m.Create("/assets", new { environmentId = env, name = "listener", type = "LogicalEndpoint", ownerUserId = m.UserId });
        Assert.NotNull((await m.Post("/assets", new { environmentId = env, name = "lsn2", type = "LogicalEndpoint", cpuQuantity = 2, cpuUnit = "vCPU", ownerUserId = m.UserId })).Error("cpuQuantity"));
        Assert.NotNull((await m.Post("/assets", new { environmentId = env, name = "zero", type = "VM", cpuQuantity = 0, cpuUnit = "vCPU", ownerUserId = m.UserId })).Error("cpuQuantity"));
        var san = await m.Create("/shared-storage", new { clientId = c, name = "SAN", capacity = 10, unit = "TB" });
        await m.Create($"/assets/{vm}/volumes", new { label = "E:", capacity = 2, unit = "TB", sharedStorageId = san });
        await m.Create($"/assets/{phys}/volumes", new { label = "D:", capacity = 4, unit = "TB", sharedStorageId = san });
        await m.Create($"/assets/{vm}/volumes", new { label = "C:", capacity = 100, unit = "GB" });

        var s = (await m.Get($"/infrastructure/summary?environmentId={env}")).Body!;
        Assert.Equal(2, s["assets"]!["vm"]!.GetValue<int>());
        Assert.Equal(1, s["assets"]!["logicalEndpoints"]!.GetValue<int>());
        Assert.Equal(8m, s["cpu"]!["vCpu"]!.GetValue<decimal>());
        Assert.Equal(16m, s["cpu"]!["physicalCores"]!.GetValue<decimal>());
        Assert.Equal(1, s["cpu"]!["unknownCount"]!.GetValue<int>());
        Assert.Equal(10m, s["storage"]!["shared"]!["TB"]!.GetValue<decimal>());
        Assert.Equal(100m, s["storage"]!["dedicated"]!["GB"]!.GetValue<decimal>());

        await m.Ok("/data-quality/scan");
        var dq = (await m.Get($"/data-quality?clientId={c}&pageSize=200")).Body!["items"]!.AsArray();
        Assert.Contains(dq, i => i!["rule"]!.GetValue<string>() == "MissingSpecification" && i["recordLabel"]!.GetValue<string>() == "app02");
        var detail = (await m.Get($"/assets?environmentId={env}&q=app02")).Body!["items"]![0]!;
        Assert.Null(detail["placeholderFlag"]);
        Assert.Null(detail["cpuQuantity"]?.GetValue<decimal?>());
    }
}

[Collection("hub")]
public class AC05_FirewallRules(HubFactory hub) : Scenario(hub)
{
    /// <summary>A35: firewall rules between servers of one client replace network endpoints and dependencies.</summary>
    [Fact]
    public async Task Rules_between_servers_are_validated_listed_and_feed_documented_impact()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c1 = await NewClient();
        var c2 = await NewClient();
        var env1 = await NewEnv(c1, "Production");
        var env2 = await NewEnv(c2, "Production");
        var web = await m.Create("/assets", new { environmentId = env1, name = "web01", type = "VM", ownerUserId = m.UserId });
        var app = await m.Create("/assets", new { environmentId = env1, name = "app01", type = "VM", ownerUserId = m.UserId });
        var dbs = await m.Create("/assets", new { environmentId = env1, name = "db01", type = "Physical", ownerUserId = m.UserId });
        var foreign = await m.Create("/assets", new { environmentId = env2, name = "other", type = "VM", ownerUserId = m.UserId });

        // Refused: same server, another client's server, invalid or missing ports for TCP, no purpose.
        Assert.NotNull((await e.Post("/firewall-rules", new { sourceAssetId = web, destinationAssetId = web, ports = "443", purpose = "x" })).Error("destinationAssetId"));
        Assert.NotNull((await e.Post("/firewall-rules", new { sourceAssetId = web, destinationAssetId = foreign, ports = "443", purpose = "x" })).Error("destinationAssetId"));
        Assert.NotNull((await e.Post("/firewall-rules", new { sourceAssetId = web, destinationAssetId = app, ports = "70000", purpose = "API" })).Error("ports"));
        Assert.NotNull((await e.Post("/firewall-rules", new { sourceAssetId = web, destinationAssetId = app, protocol = "TCP", purpose = "API" })).Error("ports"));
        Assert.NotNull((await e.Post("/firewall-rules", new { sourceAssetId = web, destinationAssetId = app, ports = "443" })).Error("purpose"));

        var r1 = await e.Create("/firewall-rules", new { sourceAssetId = web, destinationAssetId = app, ports = "443,8080 - 8090", protocol = "TCP", direction = "OneWay", purpose = "Web to API" });
        await e.Create("/firewall-rules", new { sourceAssetId = app, destinationAssetId = dbs, ports = "1433", protocol = "TCP", direction = "Bidirectional", purpose = "Application to database" });
        await e.Create("/firewall-rules", new { sourceAssetId = app, destinationAssetId = dbs, protocol = "ICMP", purpose = "Monitoring ping" });
        var list = (await e.Get($"/firewall-rules?clientId={c1}&pageSize=50")).Body!["items"]!.AsArray();
        Assert.Equal(3, list.Count);
        var first = list.First(x => Id(x) == r1)!;
        Assert.Equal("443, 8080-8090", first["ports"]!.GetValue<string>());
        Assert.Equal("web01", first["source"]!["name"]!.GetValue<string>());
        Assert.Equal(2, (await e.Get($"/firewall-rules?assetId={dbs}")).Body!["totalCount"]!.GetValue<int>());
        Assert.Single((await e.Get($"/firewall-rules?clientId={c1}&q=database")).Body!["items"]!.AsArray());
        // The server page lists its rules.
        Assert.Equal(3, (await e.Get($"/assets/{app}")).Body!["firewallRules"]!.AsArray().Count);
        // Update and delete straight from the table.
        Assert.Equal(HttpStatusCode.NoContent, (await e.Put($"/firewall-rules/{r1}", new { sourceAssetId = web, destinationAssetId = app, ports = "443", protocol = "TCP", purpose = "Web to API (TLS only)" }, first["version"]!.GetValue<string>())).Status);
        var deleteMe = await e.Create("/firewall-rules", new { sourceAssetId = web, destinationAssetId = dbs, ports = "22", purpose = "Temporary" });
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/firewall-rules/{deleteMe}")).Status);
        Assert.Equal(3, (await e.Get($"/firewall-rules?clientId={c1}")).Body!["totalCount"]!.GetValue<int>());

        // Documented impact: a case on web01 reaches app01 through the rule and what app01 hosts.
        var inst = await m.Create("/installations", new { environmentId = env1, productId = Id((await m.Get("/reference")).Body!["products"]!.AsArray().First(x => x!["code"]!.GetValue<string>() == "PSOP")), instanceName = "Main" });
        await m.Create("/components", new { installationId = inst, name = "API", role = "Application", ownerUserId = m.UserId, hostAssetIds = new[] { app } });
        var caseId = await m.Create("/cases", new { title = "Web outage", type = "Incident", scope = "Client", clientId = c1, responsibleTeamId = await Team(), impactSummary = "x", priority = "High", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1), affected = new { assetIds = new[] { web } } });
        var impact = (await m.Get($"/cases/{caseId}/impact")).Body!;
        Assert.Contains(impact["firewallRules"]!.AsArray(), x => Id(x) == r1);
        Assert.Single(impact["installations"]!.AsArray());
        // The old network API is gone.
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get("/network/endpoints")).Status);
    }
}

[Collection("hub")]
public class AC37_DeleteContactsNotifications(HubFactory hub) : Scenario(hub)
{
    /// <summary>A36–A38: contact details, deletion from the tables, team roles and notifications.</summary>
    [Fact]
    public async Task Records_are_deleted_unless_used_contacts_are_structured_and_people_are_notified()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");

        // Server owner contact details, entered separately.
        Assert.NotNull((await e.Post("/assets", new { environmentId = env, name = "x1", type = "VM", owner = new { name = "Vendor Engineer", phone = "abc", email = "nope" } })).Error("ownerPhone"));
        var srv = await e.Create("/assets", new { environmentId = env, name = "fw01", type = "VM",
            owner = new { name = "Fictional Vendor Engineer", title = "Field engineer", organization = "Vendor Ltd (fictional)", phone = "+968 2400 0000", mobile = "+968 9000 0000", email = "eng@example.com" } });
        var od = (await e.Get($"/assets/{srv}")).Body!["ownerDetails"]!;
        Assert.Equal("Vendor Ltd (fictional)", od["organization"]!.GetValue<string>());
        Assert.Equal("eng@example.com", od["email"]!.GetValue<string>());

        // Responsibility boundary with a responsible person who is not a hub user.
        var bId = await e.Create($"/clients/{c}/boundaries", new { area = "Network", party = "CustomerIT", coordinatorUserId = e.UserId,
            person = new { name = "Fictional Network Lead", title = "Network manager", organization = "Client IT", phone = "+968 2411 1111", email = "net@example.com" } });
        var b = (await e.Get($"/clients/{c}/boundaries")).Body!.AsArray().First(x => Id(x) == bId)!;
        Assert.Equal("Fictional Network Lead", b["person"]!["name"]!.GetValue<string>());
        Assert.NotNull((await e.Post($"/clients/{c}/boundaries", new { area = "Backup", party = "TIO", responsibleUserId = e.UserId, person = new { name = "Both" } })).Error("personName"));

        // Deleting needs the Delete right; something still in use is refused with what uses it.
        var src = await e.Create("/assets", new { environmentId = env, name = "src01", type = "VM", ownerUserId = m.UserId });
        await e.Create($"/assets/{src}/volumes", new { label = "C:", capacity = 100, unit = "GB" });
        var rule = await e.Create("/firewall-rules", new { sourceAssetId = src, destinationAssetId = srv, ports = "443", purpose = "x" });
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Send(HttpMethod.Delete, $"/assets/{src}")).Status);
        var refused = await m.Send(HttpMethod.Delete, $"/assets/{src}");
        Assert.Equal(HttpStatusCode.Conflict, refused.Status);
        Assert.Contains("firewall rules", refused.Text);
        await m.Send(HttpMethod.Delete, $"/firewall-rules/{rule}");
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/assets/{src}")).Status);   // its volume goes with it
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/assets/{src}")).Status);
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/environments/{env}")).Status); // fw01 is still in it
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/boundaries/{bId}")).Status);

        // Configuration values: deleted when unused, refused when used.
        var lab = await m.Create("/admin/lookups", new { listName = "EnvironmentType", label = U("Lab"), category = "Test" });
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{lab}")).Status);
        var vmType = (await m.Get("/admin/lookups")).Body!.AsArray().First(x => x!["listName"]!.GetValue<string>() == "AssetType" && x["code"]!.GetValue<string>() == "VM")!;
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{Id(vmType)}")).Status);

        // Teams: deleted when unused.
        var team = await m.Create("/teams", new { code = U("TMP"), name = "Temporary team", leadUserId = m.UserId });
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/teams/{team}")).Status);

        // Project team roles come from the configuration list.
        Assert.NotNull((await m.Post("/clients", new { code = U("X"), name = "Fictional X", country = "Oman", status = "Active", ownerUserId = m.UserId, team = new[] { new { userId = e.UserId, role = "Astronaut" } } })).Error("team[0].role"));
        var withTeam = await m.Create("/clients", new { code = U("X"), name = "Fictional Y", country = "Oman", status = "Active", ownerUserId = m.UserId, team = new[] { new { userId = e.UserId, role = "DevOps engineer" } } });

        // Notifications: the engineer hears about the project team and about a case assigned by the manager.
        var caseId = await m.Create("/cases", new { title = "Assigned work", type = "Incident", scope = "Client", clientId = withTeam, responsibleTeamId = await Team(), impactSummary = "x", priority = "High", ownerUserId = e.UserId, nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
        var notes = (await e.Get("/notifications")).Body!;
        var items = notes["items"]!.AsArray();
        Assert.Contains(items, n => n!["link"]!.GetValue<string>() == $"/cases/{caseId}");
        Assert.Contains(items, n => n!["kind"]!.GetValue<string>() == "Team" && n["link"]!.GetValue<string>() == $"/clients/{withTeam}");
        Assert.True(notes["unreadCount"]!.GetValue<int>() >= 2);
        var one = items.First(n => n!["link"]!.GetValue<string>() == $"/cases/{caseId}")!;
        await e.Ok($"/notifications/{Id(one)}/read");
        Assert.NotNull((await e.Get("/notifications")).Body!["items"]!.AsArray().First(n => Id(n) == Id(one))!["readAt"]);
        await e.Ok("/notifications/read-all");
        Assert.Equal(0, (await e.Get("/notifications/unread-count")).Body!["count"]!.GetValue<int>());
        // The manager who assigned it is not notified about their own action; nobody sees another person's notices.
        Assert.DoesNotContain((await m.Get("/notifications?pageSize=100")).Body!["items"]!.AsArray(), n => n!["link"]!.GetValue<string>() == $"/cases/{caseId}");
    }
}

[Collection("hub")]
public class AC06_CaseLifecycle(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Gates_for_owner_outcome_evidence_and_manager_exception_with_history()
    {
        var m = await Hub.As(HubFactory.Manager);
        var lead = await Hub.As(HubFactory.Lead);
        var eng = await Hub.As(HubFactory.Engineer);
        var nta = await Hub.ClientId("DEMO-NTA");
        var id = await NewCase(nta, asUser: HubFactory.Engineer);
        string V() => m.Version($"/cases/{id}").GetAwaiter().GetResult();

        // Engineer cannot triage; lead triages.
        Assert.Equal(HttpStatusCode.Forbidden, (await eng.Post($"/cases/{id}/triage", new { responsibleTeamId = await Team(), impactSummary = "x", priority = "High", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V())).Status);
        await lead.Ok($"/cases/{id}/triage", new { responsibleTeamId = await Team(), impactSummary = "Imports degraded", priority = "High", nextAction = "Assign", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V());
        // No active owner → cannot start.
        var noOwner = await lead.Post($"/cases/{id}/start", new { }, V());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, noOwner.Status);
        Assert.NotNull(noOwner.Error("ownerUserId"));
        // Engineer may take unassigned work of own team; then start.
        await eng.Ok($"/cases/{id}/assign", new { ownerUserId = eng.UserId }, V());
        await eng.Ok($"/cases/{id}/start", new { progressSummary = "Investigating" }, V());

        // Waiting is recorded without touching the due date or status.
        var before = (await m.Get($"/cases/{id}")).Body!;
        await eng.Ok($"/cases/{id}/waiting", new { reason = "Customer", nextReviewAt = DateTimeOffset.UtcNow.AddDays(2) }, V());
        var waiting = (await m.Get($"/cases/{id}")).Body!;
        Assert.Equal("InProgress", waiting["status"]!.GetValue<string>());
        Assert.Equal(before["dueAt"]?.ToJsonString(), waiting["dueAt"]?.ToJsonString());
        Assert.Equal("Customer", waiting["waiting"]!["reason"]!.GetValue<string>());
        await eng.Ok($"/cases/{id}/waiting/clear", new { reason = "Logs received" }, V());
        Assert.Single((await m.Get($"/cases/{id}")).Body!["waitingIntervals"]!.AsArray());

        await eng.Ok($"/cases/{id}/request-validation", new { progressSummary = "Fix deployed", validationRequest = "Customer to confirm imports" }, V());
        // Outcome always required; engineer reason alone cannot waive evidence.
        Assert.NotNull((await eng.Post($"/cases/{id}/close", new { validationEvidence = "x" }, V())).Error("outcome"));
        var waive = await eng.Post($"/cases/{id}/close", new { outcome = "Fixed", evidenceExceptionReason = "Customer silent", followUpOwnerId = eng.UserId, followUpDate = DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd") }, V());
        Assert.NotNull(waive.Error("evidenceExceptionReason"));
        // Manager exception needs follow-up owner and date.
        Assert.NotNull((await m.Post($"/cases/{id}/close", new { outcome = "Fixed", evidenceExceptionReason = "Customer silent" }, V())).Error("followUpOwnerId"));
        await m.Ok($"/cases/{id}/close", new { outcome = "Fixed", evidenceExceptionReason = "Customer silent", followUpOwnerId = eng.UserId, followUpDate = DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd") }, V());
        var closed = (await m.Get($"/cases/{id}")).Body!;
        Assert.Equal("Closed", closed["status"]!.GetValue<string>());
        Assert.Equal(m.UserId, closed["evidenceException"]!["approvedBy"]!["id"]!.GetValue<long>());

        // Reopen (lead) keeps earlier closure in history; cancel needs reason.
        Assert.Equal(HttpStatusCode.Forbidden, (await eng.Post($"/cases/{id}/reopen", new { reason = "Again", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V())).Status);
        await lead.Ok($"/cases/{id}/reopen", new { reason = "Recurred", nextAction = "Re-check", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) }, V());
        Assert.NotNull((await lead.Post($"/cases/{id}/cancel", new { }, V())).Error("reason"));
        await lead.Ok($"/cases/{id}/cancel", new { reason = "Duplicate of another case" }, V());
        var events = (await m.Get($"/cases/{id}")).Body!["events"]!.AsArray().Select(e => e!["type"]!.GetValue<string>()).ToList();
        foreach (var t in new[] { "Created", "Triaged", "OwnerChanged", "Started", "WaitingStarted", "WaitingEnded", "ValidationRequested", "EvidenceException", "Closed", "Reopened", "Cancelled" })
            Assert.Contains(t, events);
        Assert.Equal(1, (await m.Get($"/cases/{id}")).Body!["reopenCount"]!.GetValue<int>());
    }

    [Fact]
    public async Task Internal_cases_have_no_client_and_are_visible_to_the_team()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e2 = await Hub.As(HubFactory.Engineer2);
        var id = await NewCase(null, scope: "Internal");
        Assert.Equal(HttpStatusCode.OK, (await e2.Get($"/cases/{id}")).Status);
        Assert.True((await m.Get($"/cases/{id}")).Body!["client"] is null);
        Assert.NotNull((await m.Post("/cases", new { title = "x", type = "Request", scope = "Client", responsibleTeamId = await Team(), impactSummary = "x", priority = "Low", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) })).Error("clientId"));
    }
}

[Collection("hub")]
public class AC07_JiraReferences(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Instance_plus_key_identity_reuse_reason_hidden_details_and_url_rules()
    {
        var m = await Hub.As(HubFactory.Manager);
        var refd = (await m.Get("/reference")).Body!["jiraInstances"]!.AsArray();
        var customer = refd.First(j => j!["kind"]!.GetValue<string>() == "CustomerCloud")!;
        var internalJ = refd.First(j => j!["kind"]!.GetValue<string>() == "InternalOnPrem")!;
        string Url(JsonNode inst, string key) => $"https://{inst["approvedHost"]!.GetValue<string>()}/browse/{key}";
        var key = $"QA{Random.Shared.Next(100, 999)}-{Random.Shared.Next(1, 9999)}";
        var nta = await Hub.ClientId("DEMO-NTA");
        var hcp = await Hub.ClientId("DEMO-HCP");
        var c1 = await NewCase(nta);
        var c2 = await NewCase(nta);
        await m.Create($"/cases/{c1}/jira", new { jiraInstanceId = Id(customer), issueKey = key.ToLowerInvariant(), url = Url(customer, key) });
        // Same key in the other instance is a different reference.
        await m.Create($"/cases/{c1}/jira", new { jiraInstanceId = Id(internalJ), issueKey = key, url = Url(internalJ, key) });
        // Same instance + key on another case: reason required.
        Assert.NotNull((await m.Post($"/cases/{c2}/jira", new { jiraInstanceId = Id(customer), issueKey = key, url = Url(customer, key) })).Error("reuseReason"));
        await m.Create($"/cases/{c2}/jira", new { jiraInstanceId = Id(customer), issueKey = key, url = Url(customer, key), reuseReason = "Same customer ticket covers two issues" });
        // Unapproved host, embedded credentials and mismatched key are refused.
        Assert.NotNull((await m.Post($"/cases/{c2}/jira", new { jiraInstanceId = Id(internalJ), issueKey = key, url = $"https://evil.example.org/browse/{key}" })).Error("url"));
        Assert.NotNull((await m.Post($"/cases/{c2}/jira", new { jiraInstanceId = Id(internalJ), issueKey = key, url = $"https://user:pw@{internalJ["approvedHost"]}/browse/{key}" })).Error("url"));
        Assert.NotNull((await m.Post($"/cases/{c2}/jira", new { jiraInstanceId = Id(internalJ), issueKey = key, url = Url(internalJ, "ZZZ-1") })).Error("url"));

        // A user without NTA scope sees only a neutral count of the reuse.
        var e2 = await Hub.As(HubFactory.Engineer2);
        var c3 = await NewCase(hcp, asUser: HubFactory.Engineer2);
        var reuse = (await e2.Get($"/jira/reuse?instanceId={Id(customer)}&key={key}&exceptCaseId={c3}")).Body!;
        Assert.True(reuse["reused"]!.GetValue<bool>());
        Assert.Equal(2, reuse["visible"]!.AsArray().Count);
        Assert.Equal(0, reuse["hiddenCount"]!.GetValue<int>());
        // Search by key finds both in scope for the manager.
        Assert.Equal(2, (await m.Get($"/cases?jiraKey={key}")).Total);
    }
}

[Collection("hub")]
public class AC08_Commitments(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Time_zones_revisions_late_completion_cancel_and_reopen()
    {
        var m = await Hub.As(HubFactory.Manager);
        var nta = await Hub.ClientId("DEMO-NTA");
        var due = Future(5);
        var id = await m.Create("/commitments", new { scope = "Client", clientId = nta, description = "Root cause report", type = "CustomerUpdate", ownerUserId = m.UserId, dueLocal = due, timeZone = "Asia/Riyadh" });
        var c = (await m.Get($"/commitments/{id}")).Body!;
        var expectedUtc = new DateTimeOffset(DateTime.Parse(due), TimeSpan.FromHours(3)).ToUniversalTime();
        Assert.Equal(expectedUtc, c["currentDueAt"]!.GetValue<DateTimeOffset>());
        Assert.Equal("Asia/Riyadh", c["timeZone"]!.GetValue<string>());

        var internalId = await m.Create("/commitments", new { scope = "Internal", responsibleTeamId = await Team(), description = "Rota", type = "Other", ownerUserId = m.UserId, dueLocal = Future(3, 9), timeZone = "Europe/Berlin" });
        Assert.Null((await m.Get($"/commitments/{internalId}")).Body!["client"]);
        // Invalid DST local time refused.
        Assert.NotNull((await m.Post("/commitments", new { scope = "Client", clientId = nta, description = "x", type = "Delivery", ownerUserId = m.UserId, dueLocal = "2027-03-28T02:30", timeZone = "Europe/Berlin" })).Error("dueLocal"));

        string V() => m.Version($"/commitments/{id}").GetAwaiter().GetResult();
        Assert.NotNull((await m.Post($"/commitments/{id}/revise", new { dueLocal = Future(8) }, V())).Error("reason"));
        await m.Ok($"/commitments/{id}/revise", new { dueLocal = Future(-2), reason = "Customer agreed earlier date" }, V());
        // Completion in the future refused; late completion stays Completed with a derived late result.
        Assert.NotNull((await m.Post($"/commitments/{id}/complete", new { completedAt = DateTimeOffset.UtcNow.AddHours(2), evidence = "mail" }, V())).Error("completedAt"));
        Assert.NotNull((await m.Post($"/commitments/{id}/complete", new { completedAt = DateTimeOffset.UtcNow }, V())).Error("evidence"));
        Assert.NotNull((await m.Post($"/commitments/{id}/complete", new { completedAt = DateTimeOffset.UtcNow.AddDays(-30), evidence = "x" }, V())).Error("completedAt"));
        await m.Ok($"/commitments/{id}/complete", new { completedAt = DateTimeOffset.UtcNow, evidence = "Email ref 55" }, V());
        c = (await m.Get($"/commitments/{id}")).Body!;
        Assert.Equal("Completed", c["status"]!.GetValue<string>());
        Assert.Equal("Completed late", c["timeliness"]!.GetValue<string>());
        Assert.Equal(expectedUtc, c["originalDueAt"]!.GetValue<DateTimeOffset>());
        Assert.Equal(1, c["revisionCount"]!.GetValue<int>());

        await m.Ok($"/commitments/{id}/reopen", new { reason = "Customer disputes" }, V());
        await m.Ok($"/commitments/{id}/cancel", new { reason = "Superseded" }, V());
        var events = (await m.Get($"/commitments/{id}")).Body!["events"]!.AsArray().Select(e => e!["type"]!.GetValue<string>()).ToList();
        Assert.Equal(["Created", "Revised", "Completed", "Reopened", "Cancelled"], events);
        Assert.Contains((await m.Get("/commitments?status=all&late=true&pageSize=200")).Body!["items"]!.AsArray(), x => x!["ref"]!.GetValue<string>() != null);
    }
}

[Collection("hub")]
public class AC09_AssignmentsAndHandover(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Deactivation_queues_work_and_handover_needs_acknowledgment_or_manager_exception()
    {
        var m = await Hub.As(HubFactory.Manager);
        var lead = await Hub.As(HubFactory.Lead);
        var admin = await Hub.As(HubFactory.Admin);
        var eng = await Hub.As(HubFactory.Engineer);
        var hcp = await Hub.ClientId("DEMO-HCP");
        // Seeded deactivated engineer still owns work: it is queued, not reassigned.
        var queue = (await m.Get("/reassignment-queue")).Body!.AsArray();
        Assert.Contains(queue, q => q!["recordType"]!.GetValue<string>() == "Case" && q["ownerName"]!.GetValue<string>().Contains("Farid"));

        // Deactivate an account through administration: history stays, records appear in the queue.
        var acct = $@"DEV\temp{Guid.NewGuid().ToString("N")[..5]}";
        var uid = await admin.Create("/admin/users", new { accountName = acct, displayName = "Temp Engineer", workingTimeZone = "UTC", roles = new[] { "Engineer" }, allClients = true, scopes = Array.Empty<object>() });
        var nta = await Hub.ClientId("DEMO-NTA");
        var caseId = await NewCase(nta, owner: uid);
        var res = await admin.Post($"/admin/users/{uid}/deactivate", new { reason = "Left" }, (await admin.Get($"/admin/users/{uid}")).ETag);
        Assert.Equal(HttpStatusCode.OK, res.Status);
        Assert.Equal(1, res.Body!["recordsAwaitingReassignment"]!.GetValue<int>());
        var c = (await m.Get($"/cases/{caseId}")).Body!;
        Assert.Equal(uid, c["owner"]!["id"]!.GetValue<long>());
        Assert.True(c["ownerDeactivated"]!.GetValue<bool>());
        Assert.Contains((await m.Get("/reassignment-queue")).Body!.AsArray(), q => Id(q) == caseId);
        // Deactivated user is refused at sign-in.
        var gone = await Hub.CreateClient().SendAsync(new HttpRequestMessage(HttpMethod.Get, "/api/v1/me") { Headers = { { "X-Test-User", acct } } });
        Assert.Equal(HttpStatusCode.Forbidden, gone.StatusCode);

        // Handover from the deactivated owner to an active engineer: only the receiver can acknowledge.
        var ho = await lead.Create("/handovers", new { outgoingOwnerId = uid, receivingOwnerId = eng.UserId, effectiveAt = DateTimeOffset.UtcNow, summary = "Cover leaver", items = new[] { new { recordType = "Case", recordId = caseId } } });
        Assert.Equal(HttpStatusCode.Forbidden, (await lead.Post($"/handovers/{ho}/acknowledge", new { }, await lead.Version($"/handovers/{ho}"))).Status);
        Assert.Equal(uid, (await m.Get($"/cases/{caseId}")).Body!["owner"]!["id"]!.GetValue<long>()); // not applied before acknowledgment
        await eng.Ok($"/handovers/{ho}/acknowledge", new { note = "Got it" }, await eng.Version($"/handovers/{ho}"));
        Assert.Equal(eng.UserId, (await m.Get($"/cases/{caseId}")).Body!["owner"]!["id"]!.GetValue<long>());
        var item = (await m.Get($"/handovers/{ho}")).Body!["items"]![0]!;
        Assert.True(item["applied"]!.GetValue<bool>());
        Assert.Equal(uid, item["previousOwnerId"]!.GetValue<long>());

        // Manager exception requires reason, follow-up owner and date; leads cannot authorize it.
        var env = (await m.Get($"/environments?clientId={hcp}&q=Staging")).Body!["items"]![0]!;
        var e2 = await Hub.As(HubFactory.Engineer2);
        var ho2 = await lead.Create("/handovers", new { outgoingOwnerId = e2.UserId, receivingOwnerId = m.UserId, effectiveAt = DateTimeOffset.UtcNow, summary = "Leave cover", items = new[] { new { recordType = "Environment", recordId = Id(env) } } });
        Assert.Equal(HttpStatusCode.Forbidden, (await (await Hub.As(HubFactory.Engineer)).Post($"/handovers/{ho2}/exception", new { reason = "x", followUpOwnerId = lead.UserId, followUpDate = "2026-12-01" }, await lead.Version($"/handovers/{ho2}"))).Status);
        Assert.NotNull((await m.Post($"/handovers/{ho2}/exception", new { reason = "Receiver travelling" }, await m.Version($"/handovers/{ho2}"))).Error("followUpOwnerId"));
        await m.Ok($"/handovers/{ho2}/exception", new { reason = "Receiver travelling", followUpOwnerId = lead.UserId, followUpDate = "2026-12-01" }, await m.Version($"/handovers/{ho2}"));
        Assert.Equal("CompletedByException", (await m.Get($"/handovers/{ho2}")).Body!["status"]!.GetValue<string>());
    }
}

[Collection("hub")]
public class AC10_Verification(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Condition_review_does_not_refresh_inventory_and_unrelated_edits_or_views_do_not_count()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        var e0 = (await m.Get($"/environments/{env}")).Body!;
        Assert.Equal("Unknown", e0["condition"]!["display"]!.GetValue<string>());
        // Non-Unknown condition needs reason and evidence; observation cannot be in the future.
        Assert.NotNull((await m.Post($"/environments/{env}/conditions", new { condition = "Healthy", observedAt = DateTimeOffset.UtcNow })).Error("evidence"));
        Assert.NotNull((await m.Post($"/environments/{env}/conditions", new { condition = "Healthy", reason = "ok", evidence = "chk", observedAt = DateTimeOffset.UtcNow.AddHours(3) })).Error("observedAt"));
        await m.Create($"/environments/{env}/conditions", new { condition = "Healthy", reason = "Morning check", evidence = "Checklist 1", observedAt = DateTimeOffset.UtcNow.AddMinutes(-5) });
        var e1 = (await m.Get($"/environments/{env}")).Body!;
        Assert.Equal("Healthy", e1["condition"]!["reported"]!.GetValue<string>());
        Assert.Null(e1["inventoryReviewedAt"]?.GetValue<DateTimeOffset?>());

        // Page views do not refresh any review; the condition report did not refresh the inventory.
        await m.Get($"/environments/{env}/overview");
        Assert.Null((await m.Get($"/environments/{env}")).Body!["lastReviewedAt"]?.GetValue<DateTimeOffset?>());
        // A52: the separate review records are gone; saving the environment confirms it (record, inventory and dependencies).
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post("/reviews", new { recordType = "Environment", recordId = env, scope = "Inventory", note = "x" })).Status);
        await m.Put($"/environments/{env}", new { clientId = c, name = "Production", type = "Production", criticality = "Normal", ownerUserId = m.UserId, backupGapReason = "g", description = "New text" }, (await m.Get($"/environments/{env}")).ETag);
        var e3 = (await m.Get($"/environments/{env}")).Body!;
        Assert.NotNull(e3["inventoryReviewedAt"]?.GetValue<DateTimeOffset?>());
        Assert.NotNull(e3["lastReviewedAt"]?.GetValue<DateTimeOffset?>());
        Assert.Equal("Current", e3["freshness"]!["inventory"]!["state"]!.GetValue<string>());

        // Missing policies surface as quality gaps; seeded stale inventory (45 days > 30) is flagged.
        await m.Ok("/data-quality/scan");
        var dq = (await m.Get("/data-quality?rule=MissingReviewPolicy&pageSize=50")).Body!["items"]!.AsArray();
        Assert.Contains(dq, i => i!["recordLabel"]!.GetValue<string>() == "Asset");
        var stale = (await m.Get("/data-quality?rule=StaleReview&pageSize=200")).Body!["items"]!.AsArray();
        Assert.Contains(stale, i => i!["recordType"]!.GetValue<string>() == "Environment" && i["detail"]!.GetValue<string>().Contains("Inventory"));
        Assert.Contains((await m.Get("/data-quality?rule=ConditionNeedsVerification&pageSize=50")).Body!["items"]!.AsArray(), i => i!["recordLabel"]!.GetValue<string>().Contains("DEMO-NTA"));
    }
}

[Collection("hub")]
public class AC11_DashboardReconciliation(HubFactory hub) : Scenario(hub)
{
    [Theory]
    [InlineData(HubFactory.Manager)]
    [InlineData(HubFactory.Engineer)]
    [InlineData(HubFactory.Engineer2)]
    public async Task Every_measure_equals_its_filtered_drilldown_at_a_fixed_evaluation_time(string account)
    {
        var a = await Hub.As(account);
        var asOf = DateTimeOffset.UtcNow.AddHours(1).ToString("O");
        var d = (await a.Get($"/dashboard?asOf={Uri.EscapeDataString(asOf)}")).Body!;
        foreach (var measure in d["cases"]!.AsArray().Concat(d["commitments"]!.AsArray()))
        {
            var drill = measure!["drilldown"]!.GetValue<string>();
            var list = await a.Get(drill.Replace("/cases?", "/cases?pageSize=1&").Replace("/commitments?", "/commitments?pageSize=1&"));
            Assert.True(list.Status == HttpStatusCode.OK, drill + " " + list.Text);
            Assert.Equal(measure["value"]!.GetValue<int>(), list.Total);
        }
        // Action-list category counts equal their item lists.
        var actions = (await a.Get($"/dashboard/actions?asOf={Uri.EscapeDataString(asOf)}")).Body!;
        foreach (var (cat, count) in actions["categories"]!.AsObject())
        {
            var only = (await a.Get($"/dashboard/actions?category={cat}&asOf={Uri.EscapeDataString(asOf)}")).Body!["items"]!.AsArray();
            Assert.Equal(count!.GetValue<int>(), only.Count);
        }
    }

    [Fact]
    public async Task Counts_are_the_same_for_both_roles_and_boundaries_are_strict()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e2 = await Hub.As(HubFactory.Engineer2);
        var nta = await Hub.ClientId("DEMO-NTA");
        // One TIO team: an engineer's open-case count equals the Manager's.
        Assert.Equal((await m.Get("/dashboard")).Body!["cases"]![0]!["value"]!.GetValue<int>(), (await e2.Get("/dashboard")).Body!["cases"]![0]!["value"]!.GetValue<int>());
        // Overdue is strictly earlier than the evaluation time; cancelled cases leave open counts.
        var id = await NewCase(nta, dueLocal: DateTime.UtcNow.AddHours(3 + 2).ToString("yyyy-MM-ddTHH:mm"));
        var dueAt = (await m.Get($"/cases/{id}")).Body!["dueAt"]!.GetValue<DateTimeOffset>();
        var atDue = Uri.EscapeDataString(dueAt.ToString("O"));
        var after = Uri.EscapeDataString(dueAt.AddSeconds(1).ToString("O"));
        Assert.DoesNotContain((await m.Get($"/cases?clientId={nta}&due=overdue&asOf={atDue}&pageSize=200")).Body!["items"]!.AsArray(), c => Id(c) == id);
        Assert.Contains((await m.Get($"/cases?clientId={nta}&due=overdue&asOf={after}&pageSize=200")).Body!["items"]!.AsArray(), c => Id(c) == id);
        var open = (await m.Get($"/cases?clientId={nta}&pageSize=1")).Total;
        await m.Ok($"/cases/{id}/cancel", new { reason = "Test" }, await m.Version($"/cases/{id}"));
        Assert.Equal(open - 1, (await m.Get($"/cases?clientId={nta}&pageSize=1")).Total);
        // No deferred capacity or task measures are present.
        var keys = (await m.Get("/dashboard")).Text;
        Assert.DoesNotContain("capacity\":", keys);
        Assert.DoesNotContain("\"tasks\"", keys);
    }
}

[Collection("hub")]
public class AC12_AccessAndExport(HubFactory hub) : Scenario(hub)
{
    /// <summary>Owner decision (19 Oct 2026): two roles. Both see every client, technical detail and history and can export.</summary>
    [Fact]
    public async Task Two_roles_both_see_everything_technical_detail_history_and_export()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer2);
        Assert.Equal(["Engineer", "Manager"], (await m.Get("/reference")).Body!["enums"]!["Role"]!.AsArray().Select(x => x!.GetValue<string>()));
        Assert.Equal((await m.Get("/clients?pageSize=1")).Total, (await e.Get("/clients?pageSize=1")).Total);
        var me = (await e.Get("/me")).Body!;
        Assert.Equal("Engineer", me["businessRole"]!.GetValue<string>());
        Assert.True(me["grants"]!["export"]!.GetValue<bool>() && me["grants"]!["technicalDetail"]!.GetValue<bool>() && me["grants"]!["audit"]!.GetValue<bool>());
        Assert.Contains((await e.Get("/assets?pageSize=200")).Body!["items"]!.AsArray(), a => a!["networkZone"]?.GetValue<string>() is not null);
        Assert.Equal(HttpStatusCode.OK, (await e.Get("/firewall-rules")).Status);
        Assert.Equal(HttpStatusCode.OK, (await e.Get("/admin/audit?pageSize=5")).Status);
        // Export: CSV with header block, logged and audited.
        var csv = await e.Http.GetAsync("/api/v1/export/cases?status=all");
        Assert.Equal(HttpStatusCode.OK, csv.StatusCode);
        var text = await csv.Content.ReadAsStringAsync();
        Assert.Contains("Generated", text);
        Assert.Contains("Column: Reference", text);
        Assert.NotEmpty((await m.Get("/admin/audit?action=Export&pageSize=5")).Body!["items"]!.AsArray());
    }

    [Fact]
    public async Task Operation_engineers_do_day_to_day_work_but_not_structure_assignment_archive_or_users()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var nta = await Hub.ClientId("DEMO-NTA");
        var r1 = (await m.Get($"/clients/{nta}/regions")).Body!.AsArray().First(r => r!["code"]!.GetValue<string>() == "R1")!;
        // Day-to-day: environments, contracts, products, cases.
        var env = await e.Create("/environments", new { clientId = nta, regionId = Id(r1), name = U("Lab"), type = "Test", criticality = "Normal" });
        var ntaProject = Id((await e.Get($"/projects?clientId={nta}")).Body!["items"]!.AsArray()[0]);
        await e.Create("/contracts", new { projectId = ntaProject, title = "Engineer contract", type = "SlaSupport", status = "Draft", ownerUserId = e.UserId });
        var pid = await e.Create("/products", new { code = U("P"), name = "Engineer product" });
        var mod = await e.Create($"/products/{pid}/modules", new { code = "CORE", name = "Core", description = "Main module" });
        await e.Create($"/products/{pid}/features", new { name = "Bulk import", moduleId = mod });
        var product = await e.Get($"/products/{pid}");
        Assert.True(product.Status == HttpStatusCode.OK, product.Text);
        Assert.Equal(1, product.Body!["modules"]![0]!["features"]!.GetValue<int>());
        var psop = (await e.Get("/products")).Body!.AsArray().First(x => x!["code"]!.GetValue<string>() == "PSOP")!;
        var used = await e.Get($"/products/{Id(psop)}");
        Assert.True(used.Status == HttpStatusCode.OK, used.Text);
        Assert.NotEmpty(used.Body!["usage"]!.AsArray());
        var caseId = await NewCase(nta, asUser: HubFactory.Engineer);
        // Manager only: clients, regions, archiving, triage, assigning someone else, handovers, users.
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post("/clients", new { code = U("C"), name = "X", country = "Oman", ownerUserId = e.UserId })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/clients/{nta}/regions", new { code = U("R"), name = "X", ownerUserId = e.UserId })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/environments/{env}/archive", new { reason = "x" }, await e.Version($"/environments/{env}"))).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/cases/{caseId}/triage", new { priority = "High" }, await e.Version($"/cases/{caseId}"))).Status);
        var assign = await e.Post($"/cases/{caseId}/assign", new { ownerUserId = m.UserId }, await e.Version($"/cases/{caseId}"));
        Assert.True(assign.Status is HttpStatusCode.Forbidden or HttpStatusCode.UnprocessableEntity, $"Engineer assigned someone else: {(int)assign.Status}");
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Get("/admin/users")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post("/handovers", new { outgoingOwnerId = e.UserId, receivingOwnerId = m.UserId, effectiveAt = DateTimeOffset.UtcNow, summary = "x" })).Status);
        // The TIO Manager administers users.
        Assert.Equal(HttpStatusCode.OK, (await m.Get("/admin/users")).Status);
    }

    [Fact]
    public async Task Removing_a_role_takes_effect_at_once_and_nobody_changes_their_own_role()
    {
        var m = await Hub.As(HubFactory.Manager);
        var acct = $@"DEV\rev{Guid.NewGuid().ToString("N")[..5]}";
        var uid = await m.Create("/admin/users", new { accountName = acct, displayName = "Revocable", workingTimeZone = "UTC", roles = new[] { "Engineer" } });
        var user = await Hub.As(acct);
        Assert.Equal(HttpStatusCode.OK, (await user.Get("/clients")).Status);
        var u = await m.Get($"/admin/users/{uid}");
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/users/{uid}", new { displayName = "Revocable", workingTimeZone = "UTC", roles = Array.Empty<string>() }, u.ETag)).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await user.Get("/clients")).Status);
        Assert.Contains((await m.Get("/admin/audit?category=Access&pageSize=100")).Body!["items"]!.AsArray(), a => a!["action"]!.GetValue<string>() == "AccessRevoked");
        var self = await m.Get($"/admin/users/{m.UserId}");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Put($"/admin/users/{m.UserId}", new { displayName = "x", workingTimeZone = "UTC", roles = new[] { "Engineer" } }, self.ETag)).Status);
    }
}

[Collection("hub")]
public class AC13_HistoryAndConflict(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Stale_save_is_refused_and_archive_restore_keep_relationships_and_gates()
    {
        var m = await Hub.As(HubFactory.Manager);
        var lead = await Hub.As(HubFactory.Lead);
        var c = await NewClient();
        var first = await m.Get($"/clients/{c}");
        var second = await lead.Get($"/clients/{c}");
        var body = new { name = "Renamed by manager", country = "Oman", ownerUserId = m.UserId, status = "Active" };
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/clients/{c}", body, first.ETag)).Status);
        var stale = await lead.Put($"/clients/{c}", body with { name = "Renamed by lead" }, second.ETag);
        Assert.Equal(HttpStatusCode.PreconditionFailed, stale.Status);
        Assert.Equal("Renamed by manager", (await m.Get($"/clients/{c}")).Body!["name"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.PreconditionRequired, (await m.Put($"/clients/{c}", body)).Status);

        // Active work blocks archival unless the Manager records an exception; history and links remain.
        var env = await NewEnv(c, "Production");
        var caseId = await NewCase(c, env);
        Assert.NotNull((await lead.Post($"/clients/{c}/archive", new { reason = "Contract ended" }, await lead.Version($"/clients/{c}"))).Error("exceptionReason"));
        var eng = await Hub.As(HubFactory.Engineer);
        Assert.Equal(HttpStatusCode.Forbidden, (await eng.Post($"/clients/{c}/archive", new { reason = "Contract ended", exceptionReason = "x" }, await eng.Version($"/clients/{c}"))).Status);
        await m.Ok($"/clients/{c}/archive", new { reason = "Contract ended", exceptionReason = "Open case handled under internal follow-up" }, await m.Version($"/clients/{c}"));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/cases/{caseId}")).Status);
        Assert.Contains((await m.Get("/admin/archived?recordType=Client")).Body!.AsArray(), a => Id(a) == c);
        // A user without scope cannot restore; Engineer role is insufficient.
        Assert.Equal(HttpStatusCode.Forbidden, (await (await Hub.As(HubFactory.Engineer)).Post($"/admin/archived/Client/{c}/restore", new { reason = "x" })).Status);
        await lead.Ok($"/admin/archived/Client/{c}/restore", new { reason = "Contract renewed" });
        var restored = (await m.Get($"/clients/{c}/overview")).Body!;
        Assert.Single(restored["directEnvironments"]!.AsArray());
        // Codes stay reserved across archive/restore.
        var code = (await m.Get($"/clients/{c}")).Body!["code"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post("/clients", new { code, name = "Clone", country = "Oman", ownerUserId = m.UserId })).Status);
        // Audit is read-only: no endpoint modifies it.
        Assert.Equal(HttpStatusCode.NotFound, (await m.Send(HttpMethod.Delete, "/admin/audit/1")).Status);
        var hist = (await m.Get($"/admin/audit?entityType=Client&entityId={c}")).Body!["items"]!.AsArray().Select(a => a!["action"]!.GetValue<string>()).ToList();
        Assert.Contains("Archive", hist);
        Assert.Contains("Restore", hist);
    }
}

[Collection("hub")]
public class AC14_SecurityAndUsability(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Secrets_are_refused_without_echo_and_errors_are_safe()
    {
        var m = await Hub.As(HubFactory.Manager);
        var nta = await Hub.ClientId("DEMO-NTA");
        var r = await m.Post("/cases", new { title = "Reset", type = "Request", scope = "Client", clientId = nta, responsibleTeamId = await Team(), impactSummary = "password=Sommer2026! for svc account", priority = "Low", nextAction = "x", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, r.Status);
        Assert.NotNull(r.Error("impactSummary"));
        Assert.DoesNotContain("Sommer2026", r.Text);
        // A52: document references were removed; their endpoint no longer exists.
        Assert.Equal(HttpStatusCode.NotFound, (await m.Post("/documents", new { recordType = "Client", recordId = nta, kind = "VaultReference", title = "x", reference = "Pa55w0rd!" })).Status);
        // Unknown routes and server errors return problem details without internals.
        var nf = await m.Get("/does-not-exist");
        Assert.Equal(HttpStatusCode.NotFound, nf.Status);
        Assert.DoesNotContain("Exception", nf.Text);
        // State-changing calls without the antiforgery header are refused.
        var bare = Hub.CreateClient();
        bare.DefaultRequestHeaders.Add("X-Test-User", HubFactory.Manager);
        var post = await bare.PostAsync("/api/v1/clients", System.Net.Http.Json.JsonContent.Create(new { code = "X" }));
        Assert.Equal(HttpStatusCode.BadRequest, post.StatusCode);
    }

    [Fact]
    public async Task Unmapped_accounts_are_refused()
    {
        var c = Hub.CreateClient();
        c.DefaultRequestHeaders.Add("X-Test-User", @"DEV\stranger");
        Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync("/api/v1/me")).StatusCode);
    }
}

[Collection("hub")]
public class AC11_DashboardInsights(HubFactory hub) : Scenario(hub)
{
    [Theory]
    [InlineData(HubFactory.Manager)]
    [InlineData(HubFactory.Engineer2)]
    public async Task Every_chart_bar_with_a_link_equals_its_drilldown_and_breakdowns_add_up(string account)
    {
        var a = await Hub.As(account);
        var asOf = Uri.EscapeDataString(DateTimeOffset.UtcNow.AddMinutes(5).ToString("O"));
        var d = (await a.Get($"/dashboard/insights?asOf={asOf}")).Body!;
        var dash = (await a.Get($"/dashboard?asOf={asOf}")).Body!;
        var openCases = dash["cases"]!.AsArray().First(m => m!["key"]!.GetValue<string>() == "openCases")!["value"]!.GetValue<int>();
        int Sum(JsonNode n) => n.AsArray().Sum(b => b!["value"]!.GetValue<int>());
        Assert.Equal(openCases, Sum(d["cases"]!["byStatus"]!));
        Assert.Equal(openCases, Sum(d["cases"]!["byPriority"]!));
        Assert.Equal(openCases, Sum(d["cases"]!["age"]!));
        var openCommitments = dash["commitments"]!.AsArray().First(m => m!["key"]!.GetValue<string>() == "openCommitments")!["value"]!.GetValue<int>();
        Assert.Equal(openCommitments, Sum(d["commitments"]!));

        foreach (var bar in d["cases"]!["byStatus"]!.AsArray().Concat(d["cases"]!["byPriority"]!.AsArray()).Concat(d["cases"]!["age"]!.AsArray()).Concat(d["commitments"]!.AsArray()))
        {
            var link = bar!["link"]?.GetValue<string>();
            if (link is null) continue;
            var path = link.Replace("/cases?", "/cases?pageSize=1&").Replace("/commitments?", "/commitments?pageSize=1&");
            Assert.Equal(bar["value"]!.GetValue<int>(), (await a.Get(path)).Total);
        }
        foreach (var bar in d["environments"]!["condition"]!.AsArray())
            Assert.Equal(bar!["value"]!.GetValue<int>(), (await a.Get(bar["link"]!.GetValue<string>().Replace("/environments?", "/environments?pageSize=1&"))).Total);

        // Map: only authorized clients, unknown countries kept off the map.
        var countries = d["countries"]!;
        var visibleClients = (await a.Get("/clients?pageSize=200")).Total;
        Assert.Equal(visibleClients, countries["rows"]!.AsArray().Sum(r => r!["clients"]!.GetValue<int>()) + countries["unknownCountryClients"]!.GetValue<int>());
        Assert.Contains(countries["rows"]!.AsArray(), r => r!["clientCodes"]!.ToJsonString().Contains("DEMO-NTA"));
    }

}

[Collection("hub")]
public class AC20_ContractsAndSla(HubFactory hub) : Scenario(hub)
{
    private static object Body(long projectId, long ownerId, string? end, int? notice, long[]? envs = null, object[]? targets = null, string status = "Active", string? reference = "FIC-2026-07") => new
    {
        projectId, title = "Fictional support agreement", contractReference = reference, type = "SlaSupport", status, ownerUserId = ownerId,
        startDate = "2026-01-01", endDate = end, renewalTerms = "RenewalByAgreement", noticeDays = notice, supportModel = "OnSite", supportHours = "Sun–Thu 08:00–17:00",
        supportTimeZone = "Asia/Riyadh", onSiteEngineersRequired = 2, coverage = "PSOP", obligations = "Monthly report",
        environmentIds = envs ?? [], slaTargets = targets ?? [new { priority = "Critical", responseMinutes = 30, resolutionMinutes = 240, basis = "SupportHours" }]
    };

    [Fact]
    public async Task Contracts_record_sla_terms_surface_renewals_and_follow_the_two_roles()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var other = await NewClient();
        var env = await NewEnv(client, "Production");
        var foreignEnv = await NewEnv(other, "Production");
        var end = DateTime.UtcNow.AddDays(40).ToString("yyyy-MM-dd");
        // Contracts belong to a project (A27): the project gives the client and the covered products.
        var psop = Id((await m.Get("/products?q=PSOP")).Body!.AsArray().First(x => x!["code"]!.GetValue<string>() == "PSOP"));
        var project = await m.Create("/projects", new { clientId = client, code = U("PRJ"), name = "Fictional support project", status = "Active", ownerUserId = m.UserId, productIds = new[] { psop } });
        var otherProject = await m.Create("/projects", new { clientId = other, code = U("PRJ"), name = "Other client project", status = "Active", ownerUserId = m.UserId });
        Assert.NotNull((await m.Post("/contracts", new { title = "No project", type = "SlaSupport", status = "Draft", ownerUserId = m.UserId })).Error("projectId"));
        Assert.NotNull((await m.Post("/contracts", new { clientId = client, projectId = otherProject, title = "Wrong client", type = "SlaSupport", status = "Draft", ownerUserId = m.UserId })).Error("projectId"));

        // Validation: secrets, foreign environments, duplicate priorities, resolution shorter than response, end before start.
        var bad = await m.Post("/contracts", Body(project, m.UserId, end, 30, [foreignEnv], [
            new { priority = "High", responseMinutes = 60, resolutionMinutes = 30, basis = "SupportHours" },
            new { priority = "High", responseMinutes = 60, resolutionMinutes = 120, basis = "SupportHours" }], reference: "password=Sommer2026!"));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.Status);
        foreach (var field in new[] { "contractReference", "environmentIds", "slaTargets", "slaTargets[0]" }) Assert.NotNull(bad.Body!["errors"]![field]);
        Assert.DoesNotContain("Sommer2026", bad.Text);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post("/contracts", Body(project, m.UserId, "2025-12-31", null))).Status);

        // Create: notice deadline = end - 30 days, within the 90-day window → renewal due; SLA shown as recorded targets only.
        var id = await m.Create("/contracts", Body(project, m.UserId, end, 30, [env]));
        var d = await m.Get($"/contracts/{id}");
        Assert.Equal("RenewalDue", d.Body!["renewalState"]!.GetValue<string>());
        Assert.Equal(DateTime.UtcNow.AddDays(10).ToString("yyyy-MM-dd"), d.Body["noticeDeadline"]!.GetValue<string>());
        Assert.StartsWith("CT-", d.Body["ref"]!.GetValue<string>());
        Assert.Contains("does not measure", d.Body["slaNote"]!.GetValue<string>());
        Assert.Single(d.Body["environments"]!.AsArray());
        Assert.Equal(client, d.Body["clientId"]!.GetValue<long>());
        Assert.Equal(project, Id(d.Body["project"]));
        Assert.Equal(["PSOP"], d.Body["products"]!.AsArray().Select(x => x!["code"]!.GetValue<string>()));
        Assert.Contains((await m.Get($"/contracts?productId={psop}&clientId={client}")).Body!["items"]!.AsArray(), x => Id(x) == id);
        // A contract can move to another project of its client, not to another client's project.
        var project2 = await m.Create("/projects", new { clientId = client, code = U("PRJ"), name = "Second project", status = "Planned", ownerUserId = m.UserId });
        Assert.NotNull((await m.Put($"/contracts/{id}", Body(otherProject, m.UserId, end, 30, [env]), d.ETag)).Error("projectId"));

        // Concurrency: stale version refused, nothing saved; current version accepted.
        var v = d.ETag!;
        await m.Put($"/contracts/{id}", Body(project, m.UserId, end, 30, [env], status: "Active"), v);
        var stale = await m.Put($"/contracts/{id}", Body(project, m.UserId, end, 45, [env]), v);
        Assert.Equal(HttpStatusCode.PreconditionFailed, stale.Status);
        Assert.Equal(30, (await m.Get($"/contracts/{id}")).Body!["noticeDays"]!.GetValue<int>());

        // An Active contract without an end date is flagged; a Draft is not.
        var unknownEnd = await m.Create("/contracts", Body(project, m.UserId, null, null));
        var draft = await m.Create("/contracts", Body(project, m.UserId, null, null, status: "Draft"));

        // Visibility: action list, dashboard bars and the filtered list agree.
        var actions = await m.Get($"/dashboard/actions?clientId={client}&category=ContractRenewal");
        var ids = actions.Body!["items"]!.AsArray().Select(i => i!["recordId"]!.GetValue<long>()).ToList();
        Assert.Contains(id, ids);
        Assert.Contains(unknownEnd, ids);
        Assert.DoesNotContain(draft, ids);
        var insights = await m.Get($"/dashboard/insights?clientId={client}");
        foreach (var bar in insights.Body!["contracts"]!["renewal"]!.AsArray())
        {
            var link = bar!["link"]!.GetValue<string>();
            var list = await m.Get(link.Replace("/contracts?", "/contracts?pageSize=200&"));
            Assert.Equal(bar["value"]!.GetValue<int>(), list.Body!["totalCount"]!.GetValue<int>());
        }
        Assert.Equal(4, insights.Body["contracts"]!["onSiteRequired"]!.GetValue<int>());

        // Two roles: every Operation Engineer sees and maintains contracts and can export them; archiving stays with the TIO Manager.
        var e2 = await Hub.As(HubFactory.Engineer2);
        Assert.Equal(3, (await e2.Get($"/contracts?clientId={client}")).Body!["totalCount"]!.GetValue<int>());
        Assert.True((await e2.Get($"/contracts/{id}")).Body!["permissions"]!["canEdit"]!.GetValue<bool>());
        Assert.False((await e2.Get($"/contracts/{id}")).Body!["permissions"]!["canArchive"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.OK, (await e2.Get("/export/contracts")).Status);

        // The project shows its contracts with their renewal state and recorded SLA targets.
        var pd = (await m.Get($"/projects/{project}")).Body!;
        var pc = pd["contracts"]!.AsArray();
        Assert.Equal(3, pc.Count);
        Assert.Equal("RenewalDue", pc.First(x => Id(x) == id)!["renewalState"]!.GetValue<string>());
        Assert.Equal(30, pc.First(x => Id(x) == id)!["slaTargets"]!.AsArray()[0]!["responseMinutes"]!.GetValue<int>());
        var row = (await m.Get($"/projects?clientId={client}")).Body!["items"]!.AsArray().First(x => Id(x) == project)!;
        Assert.Equal(3, row["contracts"]!.GetValue<int>());
        Assert.Equal(2, row["activeContracts"]!.GetValue<int>());
        Assert.Equal(2, row["renewalAttention"]!.GetValue<int>());
        Assert.Empty((await m.Get($"/projects/{project2}")).Body!["contracts"]!.AsArray());
        // A project with an Active contract cannot be archived.
        Assert.NotNull((await m.Post($"/projects/{project}/archive", new { reason = "Closing" }, await m.Version($"/projects/{project}"))).Error("reason"));

        // Archive: Active is refused; Ended can be archived, appears in archived records and can be restored.
        var cur = await m.Get($"/contracts/{id}");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await m.Post($"/contracts/{id}/archive", new { reason = "Done" }, cur.ETag)).Status);
        await m.Put($"/contracts/{id}", Body(project, m.UserId, end, 30, [env], status: "Ended"), cur.ETag);
        await m.Ok($"/contracts/{id}/archive", new { reason = "Contract ended" }, await m.Version($"/contracts/{id}"));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/contracts/{id}")).Status);
        Assert.Contains((await m.Get("/admin/archived?recordType=Contract")).Body!.AsArray(), a => a!["id"]!.GetValue<long>() == id);

        // Export: CSV with the derived renewal state and no SLA compliance column.
        var csv = await m.Get($"/export/contracts?clientId={client}");
        Assert.Equal(HttpStatusCode.OK, csv.Status);
        Assert.Contains("Renewal state", csv.Text);
        Assert.Contains("Project", csv.Text);
        Assert.DoesNotContain("compliance %", csv.Text, StringComparison.OrdinalIgnoreCase);
    }
}

[Collection("hub")]
public class AC31_RolesAndRights(HubFactory hub) : Scenario(hub)
{
    /// <summary>A31: configurable roles and rights; product deletion; free-text product and technical owners.</summary>
    [Fact]
    public async Task Roles_and_rights_are_configurable_and_enforced()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var roles = (await m.Get("/admin/roles")).Body!;
        Assert.Equal(8, roles["rights"]!.AsArray().Count);
        var manager = roles["roles"]!.AsArray().First(r => r!["key"]?.GetValue<string>() == "Manager")!;
        Assert.True(manager["isLocked"]!.GetValue<bool>());
        Assert.Equal(8, manager["rights"]!.AsArray().Count);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Get("/admin/roles")).Status);

        // A new role "Viewer" with no rights: sees records, changes nothing.
        var viewerRole = await m.Create("/admin/roles", new { name = U("Viewer"), description = "Read only", rights = Array.Empty<string>() });
        Assert.Equal(HttpStatusCode.Conflict, (await m.Post("/admin/roles", new { name = manager["name"]!.GetValue<string>(), rights = Array.Empty<string>() })).Status);
        Assert.NotNull((await m.Post("/admin/roles", new { name = U("Bad"), rights = new[] { "Fly" } })).Error("rights"));
        var acct = $@"DEV\{U("viewer")}";
        await m.Create("/admin/users", new { accountName = acct, displayName = "Fictional Viewer", workingTimeZone = "UTC", roleId = viewerRole });
        var v = await Hub.As(acct);
        var me = v.Me;
        Assert.Empty(me["rights"]!.AsArray());
        var c = await NewClient();
        Assert.Equal(HttpStatusCode.OK, (await v.Get($"/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await v.Post("/environments", new { clientId = c, name = "Production", type = "Production", criticality = "Normal" })).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await v.Get("/export/contracts")).Status);

        // Giving the role Edit lets its holders work at once; the TIO Manager role cannot lose a right; built-in roles cannot be deleted.
        var rv = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => Id(r) == viewerRole)!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/roles/{viewerRole}", new { name = rv["name"]!.GetValue<string>(), rights = new[] { "Edit", "Export" } }, rv["version"]!.GetValue<string>())).Status);
        Assert.Equal(HttpStatusCode.Created, (await v.Post("/environments", new { clientId = c, name = "Production", type = "Production", criticality = "Normal" })).Status);
        Assert.Equal(HttpStatusCode.OK, (await v.Get("/export/contracts")).Status);
        Assert.NotNull((await m.Put($"/admin/roles/{Id(manager)}", new { name = manager["name"]!.GetValue<string>(), rights = new[] { "Edit" } }, manager["version"]!.GetValue<string>())).Error("rights"));
        Assert.NotNull((await m.Send(HttpMethod.Delete, $"/admin/roles/{Id(manager)}", null, manager["version"]!.GetValue<string>())).Error("role"));
        rv = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => Id(r) == viewerRole)!;
        Assert.Equal(1, rv["userCount"]!.GetValue<int>());
        Assert.NotNull((await m.Send(HttpMethod.Delete, $"/admin/roles/{viewerRole}", null, rv["version"]!.GetValue<string>())).Error("role"));
        var spare = await m.Create("/admin/roles", new { name = U("Spare"), rights = new[] { "Audit" } });
        var sv = (await m.Get("/admin/roles")).Body!["roles"]!.AsArray().First(r => Id(r) == spare)!["version"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/admin/roles/{spare}", null, sv)).Status);

        // Products: free-text owner; only the Delete products right deletes, and only a product not in use.
        var pid = await e.Create("/products", new { code = U("DEL"), name = "Disposable product", productOwner = "Fictional Owner (external)" });
        Assert.Equal("Fictional Owner (external)", (await e.Get($"/products/{pid}")).Body!["productOwner"]!.GetValue<string>());
        await e.Create($"/products/{pid}/modules", new { code = "CORE", name = "Core" });
        var ms = await e.Create($"/products/{pid}/microservices", new { name = U("Svc") });
        await e.Create($"/products/microservices/{ms}/versions", new { version = "1.0.0" });
        Assert.False((await e.Get($"/products/{pid}")).Body!["permissions"]!["canDelete"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Send(HttpMethod.Delete, $"/products/{pid}", null, await e.Version($"/products/{pid}"))).Status);
        var used = await e.Create("/products", new { code = U("USED"), name = "Installed product" });
        var env = await NewEnv(c, "Staging");
        await m.Create("/installations", new { environmentId = env, productId = used, instanceName = "Main" });
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/products/{used}", null, await m.Version($"/products/{used}"))).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/{pid}", null, await m.Version($"/products/{pid}"))).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/products/{pid}")).Status);

        // Servers: a technical owner who is not a hub user, with contact details; no coordinator needed; not both kinds at once.
        var srv = await e.Create("/assets", new { environmentId = env, name = "ext-app01", type = "VM", ownerName = "Fictional Vendor Engineer", ownerContact = "+968 0000 0000 · vendor@example.com" });
        var a = (await e.Get($"/assets/{srv}")).Body!;
        Assert.Equal("Fictional Vendor Engineer", a["ownerName"]!.GetValue<string>());
        Assert.Contains("example.com", a["ownerContact"]!.GetValue<string>());
        Assert.NotNull((await e.Post("/assets", new { environmentId = env, name = "both01", type = "VM", ownerUserId = e.UserId, ownerName = "Someone" })).Error("ownerName"));
        Assert.NotNull((await e.Post("/assets", new { environmentId = env, name = "none01", type = "VM" })).Error("coordinatorUserId"));
    }
}

[Collection("hub")]
public class AC34_ConfigurableTypes(HubFactory hub) : Scenario(hub)
{
    /// <summary>A34: environment, server, contract and case types are configured per list; each value follows a built-in category.</summary>
    [Fact]
    public async Task Configured_types_are_offered_validated_and_follow_their_category()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var tag = U("T").Replace("-", "");
        // The code is made from the name; a type list needs a category.
        Assert.NotNull((await m.Post("/admin/lookups", new { listName = "EnvironmentType", label = $"Pre-production {tag}" })).Error("category"));
        var pre = await m.Create("/admin/lookups", new { listName = "EnvironmentType", label = $"Pre-production {tag}", category = "Staging" });
        var lab = await m.Create("/admin/lookups", new { listName = "EnvironmentType", label = $"Lab {tag}", category = "Other" });
        var appliance = await m.Create("/admin/lookups", new { listName = "AssetType", label = $"Appliance {tag}", category = "LogicalEndpoint" });
        var support = await m.Create("/admin/lookups", new { listName = "ContractType", label = $"Managed service {tag}", category = "SlaSupport" });
        var all = (await m.Get("/admin/lookups")).Body!.AsArray();
        string Code(long id) => all.First(x => Id(x) == id)!["code"]!.GetValue<string>();
        Assert.Equal($"PreProduction{tag}", Code(pre));

        // Environments: the configured type is stored; an "Other"-category type needs a description.
        var c = await NewClient();
        var envId = await e.Create("/environments", new { clientId = c, name = "Pre", type = Code(pre), criticality = "Normal" });
        Assert.Equal(Code(pre), (await e.Get($"/environments/{envId}")).Body!["type"]!.GetValue<string>());
        Assert.NotNull((await e.Post("/environments", new { clientId = c, name = "Lab", type = Code(lab), criticality = "Normal" })).Error("typeDescription"));
        Assert.NotNull((await e.Post("/environments", new { clientId = c, name = "Bad", type = "NoSuchType", criticality = "Normal" })).Error("type"));
        // Built-in names still work (they are the seeded values).
        await e.Create("/environments", new { clientId = c, name = "Production", type = "Production", criticality = "Normal" });

        // Servers: a type in the Logical endpoint category behaves like one (no CPU, not counted as a server).
        Assert.NotNull((await e.Post("/assets", new { environmentId = envId, name = "fw01", type = Code(appliance), cpuQuantity = 4, cpuUnit = "vCPU", ownerUserId = m.UserId })).Error("cpuQuantity"));
        await e.Create("/assets", new { environmentId = envId, name = "fw01", type = Code(appliance), ownerUserId = m.UserId });
        await e.Create("/assets", new { environmentId = envId, name = "app01", type = "VM", ownerUserId = m.UserId });
        var totals = (await e.Get($"/infrastructure/summary?environmentId={envId}")).Body!["assets"]!;
        Assert.Equal(1, totals["vm"]!.GetValue<int>());
        Assert.Equal(1, totals["logicalEndpoints"]!.GetValue<int>());
        Assert.Single((await e.Get($"/assets?environmentId={envId}&type={Code(appliance)}")).Body!["items"]!.AsArray());

        // Contracts and cases take configured types too.
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Typed project", status = "Active", ownerUserId = m.UserId });
        var con = await e.Create("/contracts", new { projectId = project, title = "Managed", type = Code(support), status = "Draft", ownerUserId = e.UserId });
        Assert.Equal(Code(support), (await e.Get($"/contracts/{con}")).Body!["type"]!.GetValue<string>());

        // Usage, order and retiring.
        var usage = (await m.Get("/admin/lookups/AssetType/usage")).Body!;
        Assert.Equal(1, usage[Code(appliance)]!.GetValue<int>());
        var envTypes = all.Where(x => x!["listName"]!.GetValue<string>() == "EnvironmentType").Select(x => Id(x)).ToList();
        envTypes.Remove(lab); envTypes.Insert(0, lab);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Post("/admin/lookups/EnvironmentType/order", new { ids = envTypes })).Status);
        Assert.Equal(Code(lab), (await e.Get("/reference")).Body!["lookups"]!["EnvironmentType"]!.AsArray()[0]!["code"]!.GetValue<string>());
        var preRow = (await m.Get("/admin/lookups")).Body!.AsArray().First(x => Id(x) == pre)!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/admin/lookups/{pre}", new { listName = "EnvironmentType", code = Code(pre), label = $"Pre-prod {tag}", sortOrder = 5, isRetired = true }, preRow["version"]!.GetValue<string>())).Status);
        // Retired: no longer offered for new records, kept on the record that has it.
        Assert.NotNull((await e.Post("/environments", new { clientId = c, name = "Pre2", type = Code(pre), criticality = "Normal" })).Error("type"));
        var ev = await e.Version($"/environments/{envId}");
        Assert.Equal(HttpStatusCode.NoContent, (await e.Put($"/environments/{envId}", new { clientId = c, name = "Pre", type = Code(pre), criticality = "High" }, ev)).Status);
    }
}

[Collection("hub")]
public class AC12_NoSelfGrantThroughGroups(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task Administrators_cannot_map_a_group_they_belong_to()
    {
        var admin = await Hub.As(HubFactory.Admin);
        var admins = $@"DEV\{U("Hub-Admins")}";
        var managers = $@"DEV\{U("Hub-Managers")}";
        var unmappedOwn = $@"DEV\{U("Hub-Ops")}";
        // A second administrator gets the role through a group mapping created by someone else.
        await admin.Create("/admin/group-mappings", new { groupName = admins, role = "Manager", allClients = false, allInternal = false, export = false, technicalDetail = false, audit = false, scopes = Array.Empty<object>() });
        var second = await Hub.As($@"DEV\{U("second-admin")}", groups: $"{admins};{unmappedOwn}");
        Assert.Equal(HttpStatusCode.OK, second.SignInStatus);
        Assert.Contains("TIO Manager", second.Me["roles"]!.AsArray().Select(r => r!.GetValue<string>()));

        // Mapping their own group to a business role is refused — before and after adding the group to an existing name.
        var own = await second.Post("/admin/group-mappings", new { groupName = unmappedOwn.ToLowerInvariant(), role = "Manager", allClients = true, allInternal = true, export = true, technicalDetail = true, audit = true, scopes = Array.Empty<object>() });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, own.Status);
        Assert.NotNull(own.Body!["errors"]!["groupName"]);
        var maps = (await second.Get("/admin/group-mappings")).Body!.AsArray();
        var adminsMap = maps.First(m => m!["groupName"]!.GetValue<string>() == admins)!;
        var edit = await second.Put($"/admin/group-mappings/{Id(adminsMap)}", new { groupName = admins, role = "Manager", allClients = true, allInternal = true, export = true, technicalDetail = true, audit = true, scopes = Array.Empty<object>() },
            adminsMap["version"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, edit.Status);

        // A group the administrator is not in can be mapped; renaming that mapping to their own group is refused.
        var other = await second.Create("/admin/group-mappings", new { groupName = managers, role = "Manager", allClients = true, allInternal = false, export = false, technicalDetail = false, audit = false, scopes = Array.Empty<object>() });
        var otherMap = (await second.Get("/admin/group-mappings")).Body!.AsArray().First(m => Id(m) == other)!;
        var rename = await second.Put($"/admin/group-mappings/{other}", new { groupName = admins, role = "Manager", allClients = true, allInternal = false, export = false, technicalDetail = false, audit = false, scopes = Array.Empty<object>() },
            otherMap["version"]!.GetValue<string>());
        Assert.Equal(HttpStatusCode.UnprocessableEntity, rename.Status);

        // Nothing changed: the second Manager's mappings are as created by the first one.
        Assert.Equal(2, (await second.Get("/admin/group-mappings")).Body!.AsArray().Count(x => x!["groupName"]!.GetValue<string>() is var g && (g == admins || g == managers)));
    }
}

[Collection("hub")]
public class AC01b_SubClients(HubFactory hub) : Scenario(hub)
{
    /// <summary>A29: a main client (Dubai Police) with sub-clients (Traffic, Criminal Investigation) that each keep their own structure and team.</summary>
    [Fact]
    public async Task Sub_clients_have_their_own_structure_and_project_team()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var main = await NewClient();
        object Body(string code, long? parent, object[]? team = null) => new
        {
            code, name = "Fictional " + code, country = "Oman", status = "Active", ownerUserId = m.UserId, parentClientId = parent, team = team ?? []
        };
        var trfCode = U("TRF");
        var trf = await m.Create("/clients", Body(trfCode, main, [new { userId = e.UserId, role = "Operation engineer" }, new { userId = m.UserId, role = "Project coordinator" }]));
        var cid = await m.Create("/clients", Body(U("CID"), main));

        // One level only; a person is listed once with a role.
        Assert.NotNull((await m.Post("/clients", Body(U("X"), trf))).Error("parentClientId"));
        Assert.NotNull((await m.Post("/clients", Body(U("X"), null, [new { userId = e.UserId, role = "A" }, new { userId = e.UserId, role = "B" }]))).Error("team"));
        Assert.NotNull((await m.Post("/clients", Body(U("X"), null, [new { userId = e.UserId, role = "" }]))).Error("team[0].role"));
        var other = await NewClient();
        Assert.NotNull((await m.Put($"/clients/{main}", Body("IGNORED", other), await m.Version($"/clients/{main}"))).Error("parentClientId"));

        // Each sub-client has its own regions, environments and servers.
        var r1 = await m.Create($"/clients/{trf}/regions", new { code = "R1", name = "R1 North", ownerUserId = m.UserId });
        var env = await NewEnv(trf, "Production", r1);
        await m.Create("/assets", new { environmentId = env, name = "trf-r1-app01", type = "VM", ownerUserId = m.UserId });
        await NewEnv(cid, "Production");

        var md = (await e.Get($"/clients/{main}")).Body!;
        var subs = md["subClients"]!.AsArray();
        Assert.Equal(2, subs.Count);
        var t = subs.First(x => Id(x) == trf)!;
        Assert.Equal(1, t["regionCount"]!.GetValue<int>());
        Assert.Equal(1, t["environmentCount"]!.GetValue<int>());
        Assert.Equal(1, t["serverCount"]!.GetValue<int>());
        Assert.Equal(2, t["teamSize"]!.GetValue<int>());
        Assert.Equal(0, subs.First(x => Id(x) == cid)!["regionCount"]!.GetValue<int>());
        var sd = (await e.Get($"/clients/{trf}")).Body!;
        Assert.Equal(main, Id(sd["parent"]));
        Assert.Equal(["Operation engineer", "Project coordinator"], sd["team"]!.AsArray().Select(x => x!["role"]!.GetValue<string>()));

        // Lists: by main client, and main clients only.
        Assert.Equal(2, (await e.Get($"/clients?parentId={main}")).Body!["totalCount"]!.GetValue<int>());
        Assert.DoesNotContain((await e.Get($"/clients?level=main&q={trfCode}")).Body!["items"]!.AsArray(), x => Id(x) == trf);
        Assert.Equal(trfCode, (await e.Get($"/clients?level=sub&q={trfCode}")).Body!["items"]!.AsArray()[0]!["code"]!.GetValue<string>());

        // An engineer edits the team; a sub-client can become a main client again.
        var v = await e.Version($"/clients/{trf}");
        Assert.Equal(HttpStatusCode.NoContent, (await e.Put($"/clients/{trf}", Body(trfCode, main, [new { userId = e.UserId, role = "DevOps engineer" }]), v)).Status);
        Assert.Equal("DevOps engineer", (await e.Get($"/clients/{trf}")).Body!["team"]!.AsArray().Single()!["role"]!.GetValue<string>());

        // The main client cannot be archived while it has active sub-clients.
        Assert.NotNull((await m.Post($"/clients/{main}/archive", new { reason = "Closing" }, await m.Version($"/clients/{main}"))).Error("reason"));
        await m.Ok($"/clients/{cid}/archive", new { reason = "Merged", exceptionReason = "Test" }, await m.Version($"/clients/{cid}"));
        Assert.Single((await e.Get($"/clients/{main}")).Body!["subClients"]!.AsArray());
    }
}

[Collection("hub")]
public class AC03c_CloneAcrossRegions(HubFactory hub) : Scenario(hub)
{
    /// <summary>A28: servers and installations of one region's environment copied to another region, with renamed copies and no guessed facts.</summary>
    [Fact]
    public async Task Servers_and_installations_are_copied_to_another_region()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var r1 = await m.Create($"/clients/{c}/regions", new { code = "R1", name = "R1 North", ownerUserId = m.UserId });
        var r2 = await m.Create($"/clients/{c}/regions", new { code = "R2", name = "R2 Coast", ownerUserId = m.UserId });
        var src = await NewEnv(c, "Production", r1);
        var dst = await NewEnv(c, "Production", r2);
        var dr = await NewEnv(c, "DR", r2);
        var foreign = await NewEnv(await NewClient(), "Production");
        var psop = (await m.Get("/reference")).Body!["products"]!.AsArray().First(p => p!["code"]!.GetValue<string>() == "PSOP")!;
        var pid = Id(psop);
        var v1 = Id(psop["versions"]!.AsArray().First(v => v!["version"]!.GetValue<string>() == "4.9.0"));
        var ms = await e.Create($"/products/{pid}/microservices", new { name = U("PSOP.Clone") });
        var mv = await e.Create($"/products/microservices/{ms}/versions", new { version = "3.1.0" });

        var app = await m.Create("/assets", new { environmentId = src, name = "cl-r1-app01", type = "VM", lifecycle = "Active", ownerUserId = m.UserId,
            cpuQuantity = 8, cpuUnit = "vCPU", ramQuantity = 32, ramUnit = "GB", provenance = new { sourceDocument = "Fictional sheet.xlsx", sourceSheet = "R1", sourceRange = "A4" } });
        await m.Create($"/assets/{app}/volumes", new { label = "C:", capacity = 100, unit = "GB" });
        var inst = await m.Create("/installations", new { environmentId = src, productId = pid, instanceName = "R1 Main", productVersionId = v1, versionEvidence = "RN-1" });
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/assets/{app}/microservices",
            new { microservices = new[] { new { installationId = inst, hosted = new[] { new { microserviceId = ms, versionId = (long?)mv } } } } })).Status);

        // Refused: the same name in the same environment, another client, nothing selected, versions without evidence.
        // A45: the same environment is allowed, but the copy needs a new name.
        Assert.Equal(HttpStatusCode.Conflict, (await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = src, assetIds = new[] { app } })).Status);
        Assert.NotNull((await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = foreign, assetIds = new[] { app } })).Error("targetEnvironmentId"));
        Assert.NotNull((await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = dst })).Error("assetIds"));

        // R1 → R2: names follow the rule (case kept), copies are Planned, specification and volumes copied, provenance and versions not.
        var res = await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = dst, assetIds = new[] { app }, installationIds = new[] { inst }, find = "r1", replace = "r2" });
        Assert.Equal(HttpStatusCode.OK, res.Status);
        var newApp = res.Body!["assets"]!.AsArray()[0]!["id"]!.GetValue<long>();
        var newInst = res.Body["installations"]!.AsArray()[0]!["id"]!.GetValue<long>();
        Assert.Equal("cl-r2-app01", res.Body["assets"]!.AsArray()[0]!["name"]!.GetValue<string>());
        Assert.Equal("R2 Main", res.Body["installations"]!.AsArray()[0]!["name"]!.GetValue<string>());
        var a = (await e.Get($"/assets/{newApp}")).Body!;
        Assert.Equal(dst, Id(a["environment"]));
        Assert.Equal("Planned", a["lifecycle"]!.GetValue<string>());
        Assert.Equal(8, a["cpuQuantity"]!.GetValue<decimal>());
        Assert.Single(a["volumes"]!.AsArray());
        Assert.Null(a["provenance"]);
        Assert.Null((await e.Get($"/installations/{newInst}")).Body!["version"]);
        JsonNode Hosted(JsonNode opts, long installation) => opts.AsArray().First(o => o!["installationId"]!.GetValue<long>() == installation)!["microservices"]!.AsArray().First(x => Id(x) == ms)!;
        var hosted = Hosted((await e.Get($"/environments/{dst}/microservice-options?assetId={newApp}")).Body!, newInst);
        Assert.True(hosted["selected"]!.GetValue<bool>());
        Assert.Null(hosted["versionId"]);
        // The source is untouched.
        Assert.Equal("Active", (await e.Get($"/assets/{app}")).Body!["lifecycle"]!.GetValue<string>());

        // Copying again clashes with the names now taken; nothing is saved.
        var again = await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = dst, assetIds = new[] { app }, installationIds = new[] { inst }, find = "R1", replace = "R2" });
        Assert.Equal(HttpStatusCode.Conflict, again.Status);
        Assert.Contains("cl-r2-app01", again.Text);

        // With evidence, the recorded versions are copied too (product version with history, microservice version per server).
        var withV = await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = dr, assetIds = new[] { app }, installationIds = new[] { inst }, find = "r1", replace = "dr",
            copyVersions = true, versionEvidence = "Site survey 2026-10 (fictional)", lifecycle = "Active" });
        Assert.Equal(HttpStatusCode.OK, withV.Status);
        var drInst = withV.Body!["installations"]!.AsArray()[0]!["id"]!.GetValue<long>();
        var drApp = withV.Body["assets"]!.AsArray()[0]!["id"]!.GetValue<long>();
        var di = (await e.Get($"/installations/{drInst}")).Body!;
        Assert.Equal(v1, Id(di["version"]));
        Assert.Contains("Copied from R1 / Production", di["versionHistory"]!.AsArray()[0]!["reason"]!.GetValue<string>());
        Assert.Equal(mv, Hosted((await e.Get($"/environments/{dr}/microservice-options?assetId={drApp}")).Body!, drInst)["versionId"]!.GetValue<long>());
        Assert.Equal("Active", (await e.Get($"/assets/{drApp}")).Body!["lifecycle"]!.GetValue<string>());

        // Copying only a server into a region that already has the installation attaches its microservices there.
        var second = await e.Post($"/environments/{src}/clone", new { targetEnvironmentId = dst, assetIds = new[] { app }, find = "app01", replace = "app02" });
        Assert.Equal(HttpStatusCode.OK, second.Status);
        var app02 = second.Body!["assets"]!.AsArray()[0]!["id"]!.GetValue<long>();
        Assert.True(Hosted((await e.Get($"/environments/{dst}/microservice-options?assetId={app02}")).Body!, newInst)["selected"]!.GetValue<bool>());
        var dep = (await e.Get($"/installations/{newInst}/deployment")).Body!;
        Assert.Equal(2, dep["microservices"]!.AsArray().First(x => Id(x) == ms)!["serverIds"]!.AsArray().Count);

        // A30: the whole environment copied into a third region: same set-up, all servers and installations, renamed.
        Assert.NotNull((await e.Post($"/environments/{src}/clone-environment", new { regionId = r1 })).Error("regionId"));
        Assert.Equal(HttpStatusCode.Conflict, (await e.Post($"/environments/{src}/clone-environment", new { regionId = r2 })).Status);
        var r3 = await m.Create($"/clients/{c}/regions", new { code = "R3", name = "R3 East", ownerUserId = m.UserId });
        var whole = await e.Post($"/environments/{src}/clone-environment", new { regionId = r3, find = "r1", replace = "r3" });
        Assert.Equal(HttpStatusCode.OK, whole.Status);
        var r3Env = whole.Body!["environmentId"]!.GetValue<long>();
        var ed = (await e.Get($"/environments/{r3Env}")).Body!;
        Assert.Equal("Production", ed["name"]!.GetValue<string>());
        Assert.Equal(r3, Id(ed["region"]));
        Assert.Equal("Normal", ed["criticality"]!.GetValue<string>());
        Assert.Equal(["cl-r3-app01"], (await e.Get($"/assets?environmentId={r3Env}")).Body!["items"]!.AsArray().Select(x => x!["name"]!.GetValue<string>()));
        var r3Inst = (await e.Get($"/installations?environmentId={r3Env}")).Body!["items"]!.AsArray().Single()!;
        Assert.Equal("R3 Main", r3Inst["instanceName"]!.GetValue<string>());
        var r3App = Id((await e.Get($"/assets?environmentId={r3Env}")).Body!["items"]!.AsArray()[0]);
        Assert.True(Hosted((await e.Get($"/environments/{r3Env}/microservice-options?assetId={r3App}")).Body!, Id(r3Inst))["selected"]!.GetValue<bool>());
    }
}

[Collection("hub")]
public class AC03b_MicroserviceDeployment(HubFactory hub) : Scenario(hub)
{
    /// <summary>Products are built from microservices; each installation records which microservice runs on which server.</summary>
    [Fact]
    public async Task Microservices_are_defined_on_the_product_and_chosen_per_server()
    {
        var e = await Hub.As(HubFactory.Engineer);
        var m = await Hub.As(HubFactory.Manager);
        var code = U("APP");
        var pid = await e.Create("/products", new { code, name = "Microservice product" });
        var ms = new Dictionary<string, long>();
        foreach (var (name, role) in new[] { ("Importer", "Import"), ("PlateLookup", "Application"), ("Workflow", "Workflow") })
            ms[name] = await e.Create($"/products/{pid}/microservices", new { name = $"{code}.{name}.Microservice", role });
        Assert.Equal(HttpStatusCode.Conflict, (await e.Post($"/products/{pid}/microservices", new { name = $"{code}.Importer.Microservice" })).Status);
        var other = await e.Create("/products", new { code = U("OTH"), name = "Other product" });
        var foreignMs = await e.Create($"/products/{other}/microservices", new { name = "Other.Service" });

        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        var app = await m.Create("/assets", new { environmentId = env, name = "app01", type = "VM", lifecycle = "Active", ownerUserId = m.UserId });
        var wf = await m.Create("/assets", new { environmentId = env, name = "wf01", type = "VM", lifecycle = "Active", ownerUserId = m.UserId });
        var listener = await m.Create("/assets", new { environmentId = env, name = "listener", type = "LogicalEndpoint", ownerUserId = m.UserId });
        var otherEnv = await NewEnv(c, "Staging");
        var stray = await m.Create("/assets", new { environmentId = otherEnv, name = "stg01", type = "VM", ownerUserId = m.UserId });
        var inst = await m.Create("/installations", new { environmentId = env, productId = pid, instanceName = "Main" });

        // The example: Importer + PlateLookup on the application server, Workflow on the workflow server (an Operation Engineer does it).
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{app}", new { microserviceIds = new[] { ms["Importer"], ms["PlateLookup"] } })).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{wf}", new { microserviceIds = new[] { ms["Workflow"] } })).Status);
        // Importer also runs on the workflow server: one component, two hosts.
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{wf}", new { microserviceIds = new[] { ms["Workflow"], ms["Importer"] } })).Status);
        var d = (await e.Get($"/installations/{inst}/deployment")).Body!;
        long[] On(long server) => d["servers"]!.AsArray().First(s => Id(s) == server)!["microserviceIds"]!.AsArray().Select(x => x!.GetValue<long>()).Order().ToArray();
        Assert.Equal(new[] { ms["Importer"], ms["PlateLookup"] }.Order(), On(app));
        Assert.Equal(new[] { ms["Importer"], ms["Workflow"] }.Order(), On(wf));
        Assert.DoesNotContain(d["servers"]!.AsArray(), s => Id(s) == listener);
        Assert.Empty(d["notDeployed"]!.AsArray());
        var components = (await e.Get($"/installations/{inst}")).Body!["components"]!.AsArray();
        Assert.Equal(3, components.Count);
        Assert.Equal(2, components.First(x => x!["name"]!.GetValue<string>().Contains("Importer"))!["hosts"]!.AsArray().Count);
        Assert.Equal("Workflow", components.First(x => x!["name"]!.GetValue<string>().Contains("Workflow"))!["role"]!.GetValue<string>());

        // Unticking removes the server only; a microservice running nowhere is reported.
        await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{app}", new { microserviceIds = new[] { ms["Importer"] } });
        d = (await e.Get($"/installations/{inst}/deployment")).Body!;
        Assert.Equal([ms["Importer"]], On(app));
        Assert.Contains($"{code}.PlateLookup.Microservice", d["notDeployed"]!.AsArray().Select(x => x!.GetValue<string>()));

        // Refused: another product's microservice, a logical endpoint, a server of another environment.
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{app}", new { microserviceIds = new[] { foreignMs } })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{listener}", new { microserviceIds = new[] { ms["Importer"] } })).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{stray}", new { microserviceIds = new[] { ms["Importer"] } })).Status);

        // The product page counts deployments.
        var product = (await e.Get($"/products/{pid}")).Body!;
        var importer = product["microservices"]!.AsArray().First(x => Id(x) == ms["Importer"])!;
        Assert.Equal(1, importer["installations"]!.GetValue<int>());
        Assert.Equal(2, importer["servers"]!.GetValue<int>());

        // Defining the hosted microservices while creating a server (one save), then editing them from the server.
        var app2 = await m.Create("/assets", new { environmentId = env, name = "app02", type = "VM", lifecycle = "Active", ownerUserId = m.UserId,
            microservices = new[] { new { installationId = inst, microserviceIds = new[] { ms["Importer"], ms["PlateLookup"] } } } });
        var options = (await e.Get($"/environments/{env}/microservice-options?assetId={app2}")).Body!.AsArray();
        var mine = options.First(o => o!["installationId"]!.GetValue<long>() == inst)!["microservices"]!.AsArray();
        Assert.Equal(new[] { ms["Importer"], ms["PlateLookup"] }.Order(), mine.Where(x => x!["selected"]!.GetValue<bool>()).Select(x => Id(x)).Order());
        d = (await e.Get($"/installations/{inst}/deployment")).Body!;
        Assert.Equal(new[] { ms["Importer"], ms["PlateLookup"] }.Order(), On(app2));
        Assert.Empty(d["notDeployed"]!.AsArray());
        var av = await e.Version($"/assets/{app2}");
        Assert.Equal(HttpStatusCode.NoContent, (await e.Put($"/assets/{app2}", new { environmentId = env, name = "app02", type = "VM", lifecycle = "Active", ownerUserId = m.UserId,
            microservices = new[] { new { installationId = inst, microserviceIds = new[] { ms["Workflow"] } } } }, av)).Status);
        d = (await e.Get($"/installations/{inst}/deployment")).Body!;
        Assert.Equal([ms["Workflow"]], On(app2));
        // A selection for an installation of another environment refuses the whole save: no server is created.
        var otherInst = await m.Create("/installations", new { environmentId = otherEnv, productId = pid, instanceName = "Stg" });
        var bad = await m.Post("/assets", new { environmentId = env, name = "app03", type = "VM", ownerUserId = m.UserId, microservices = new[] { new { installationId = otherInst, microserviceIds = new[] { ms["Importer"] } } } });
        Assert.NotNull(bad.Error("microservices"));
        Assert.DoesNotContain((await m.Get($"/assets?environmentId={env}&pageSize=200")).Body!["items"]!.AsArray(), a => a!["name"]!.GetValue<string>() == "app03");

        // Versions with release notes per microservice.
        var imp = ms["Importer"];
        await e.Create($"/products/microservices/{imp}/versions", new { version = "1.0.0", releasedOn = "2026-06-01", releaseNotes = "Initial release" });
        await e.Create($"/products/microservices/{imp}/versions", new { version = "1.10.0", releasedOn = "2026-09-15", releaseNotes = "Bulk import\nFaster duplicate check" });
        await e.Create($"/products/microservices/{imp}/versions", new { version = "1.2.0", releaseNotes = "Fixes" });
        Assert.Equal(HttpStatusCode.Conflict, (await e.Post($"/products/microservices/{imp}/versions", new { version = "1.2.0" })).Status);
        Assert.NotNull((await e.Post($"/products/microservices/{imp}/versions", new { version = "1.3.0", releaseNotes = "password=Sommer2026!" })).Error("releaseNotes"));
        var detail = await e.Get($"/products/microservices/{imp}");
        var versions = detail.Body!["versions"]!.AsArray();
        Assert.Equal(["1.10.0", "1.2.0", "1.0.0"], versions.Select(v => v!["version"]!.GetValue<string>()));
        Assert.Equal("Bulk import\nFaster duplicate check", versions[0]!["releaseNotes"]!.GetValue<string>());
        Assert.Single(detail.Body!["deployments"]!.AsArray());
        var v12 = versions[1]!;
        Assert.Equal(HttpStatusCode.NoContent, (await e.Put($"/products/microservice-versions/{Id(v12)}", new { version = "1.2.0", releaseNotes = "Fixes: importer retry", isActive = true }, v12["rowVersion"]!.GetValue<string>())).Status);
        var again = (await e.Get($"/products/microservices/{imp}")).Body!["versions"]!.AsArray()[1]!;
        // A56: an unused number may be corrected, but never to one the microservice already has.
        Assert.NotNull((await e.Put($"/products/microservice-versions/{Id(again)}", new { version = "1.10.0", isActive = true }, again["rowVersion"]!.GetValue<string>())).Error("version"));
        Assert.Equal("1.10.0", (await e.Get($"/products/{pid}")).Body!["microservices"]!.AsArray().First(x => Id(x) == imp)!["latestVersion"]!.GetValue<string>());

        // The deployed version per server: set while creating the server, changed from the server page, kept by the installation page.
        var v110 = Id(versions[0]); var v120 = Id(versions[1]);
        var app3 = await m.Create("/assets", new { environmentId = env, name = "app03", type = "VM", lifecycle = "Active", ownerUserId = m.UserId,
            microservices = new[] { new { installationId = inst, hosted = new[] { new { microserviceId = imp, versionId = (long?)v110 }, new { microserviceId = ms["PlateLookup"], versionId = (long?)null } } } } });
        async Task<JsonNode> Opt(long ms0) => ((await e.Get($"/environments/{env}/microservice-options?assetId={app3}")).Body!.AsArray()
            .First(o => o!["installationId"]!.GetValue<long>() == inst)!["microservices"]!.AsArray().First(x => Id(x) == ms0))!;
        Assert.Equal(v110, (await Opt(imp))["versionId"]!.GetValue<long>());
        Assert.Null((await Opt(ms["PlateLookup"]))["versionId"]);
        Assert.Equal(3, (await Opt(imp))["versions"]!.AsArray().Count);
        async Task<string?> RunningOn(long server) => ((await e.Get($"/products/microservices/{imp}")).Body!["deployments"]!.AsArray()[0]!["servers"]!.AsArray()
            .First(s => s!["assetId"]!.GetValue<long>() == server)!["version"])?.GetValue<string>();
        Assert.Equal("1.10.0", await RunningOn(app3));
        Assert.Null(await RunningOn(app));
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/assets/{app3}/microservices",
            new { microservices = new[] { new { installationId = inst, hosted = new[] { new { microserviceId = imp, versionId = (long?)v120 }, new { microserviceId = ms["PlateLookup"], versionId = (long?)null } } } } })).Status);
        Assert.Equal("1.2.0", await RunningOn(app3));
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Put, $"/installations/{inst}/deployment/{app3}", new { microserviceIds = new[] { imp } })).Status);
        Assert.Equal("1.2.0", await RunningOn(app3));
        d = (await e.Get($"/installations/{inst}/deployment")).Body!;
        Assert.Contains(d["servers"]!.AsArray().First(s => Id(s) == app3)!["versions"]!.AsArray(), x => x!["version"]!.GetValue<string>() == "1.2.0");
        // A version of another microservice is refused.
        Assert.NotNull((await e.Send(HttpMethod.Put, $"/assets/{app3}/microservices",
            new { microservices = new[] { new { installationId = inst, hosted = new[] { new { microserviceId = ms["PlateLookup"], versionId = (long?)v110 } } } } })).Error("microservices"));
        Assert.Equal("1.2.0", await RunningOn(app3));

        // Application developers replace the owning team on the product.
        var pv = await e.Version($"/products/{pid}");
        Assert.NotNull((await e.Put($"/products/{pid}", new { code, name = "Microservice product", developers = new[] { new { name = "Dev X", role = "Boss", email = (string?)null } } }, pv)).Error("developers[0]"));
        Assert.Equal(HttpStatusCode.NoContent, (await e.Put($"/products/{pid}", new { code, name = "Microservice product", developers = new object[] { new { name = "Lead Dev", role = "Lead", email = "lead@example.com" }, new { name = "Second Dev", role = "Developer" } } }, pv)).Status);
        var devs = (await e.Get($"/products/{pid}")).Body!["developers"]!.AsArray();
        Assert.Equal(["Lead Dev", "Second Dev"], devs.Select(d => d!["name"]!.GetValue<string>()));
        Assert.Equal("Lead", devs[0]!["role"]!.GetValue<string>());
        Assert.Contains((await e.Get("/products")).Body!.AsArray(), x => Id(x) == pid && x!["developers"]!.AsArray().Count == 2);
    }
}

[Collection("hub")]
public class AC41_Escalations(HubFactory hub) : Scenario(hub)
{
    /// <summary>A41: escalations through configurable channels, with owner, level, targets and a timeline.</summary>
    [Fact]
    public async Task Escalations_follow_their_lifecycle_through_configurable_channels()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var other = await NewClient();
        var foreignCase = await NewCase(other);
        object Body(string channel = "FormalLetter", long? owner = null, DateTimeOffset? received = null, long? caseId = null) => new
        {
            clientId = c, title = "Repeated outages at the depot", description = "Letter from the customer (fictional).", direction = "Received", channel, channelReference = "REF/2026/7",
            priority = "Critical", level = 1, counterpart = new { name = "Fictional Director", title = "Director of Operations", organization = "Customer IT", email = "director@example.com" },
            receivedAt = received ?? DateTimeOffset.UtcNow.AddHours(-6), ownerUserId = owner ?? e.UserId, responseDueAt = DateTimeOffset.UtcNow.AddHours(-1), resolutionDueAt = DateTimeOffset.UtcNow.AddDays(2), caseId
        };

        // Refused: unknown channel, someone else as owner (engineer), a future receipt, a case of another client.
        Assert.NotNull((await e.Post("/escalations", Body(channel: "Pigeon"))).Error("channel"));
        Assert.NotNull((await e.Post("/escalations", Body(owner: m.UserId))).Error("ownerUserId"));
        Assert.NotNull((await e.Post("/escalations", Body(received: DateTimeOffset.UtcNow.AddDays(1)))).Error("receivedAt"));
        Assert.NotNull((await e.Post("/escalations", Body(caseId: foreignCase))).Error("caseId"));

        var id = await e.Create("/escalations", Body());
        var d = (await e.Get($"/escalations/{id}")).Body!;
        Assert.StartsWith("ESC-", d["ref"]!.GetValue<string>());
        Assert.True(d["overdue"]!.GetValue<bool>());          // not acknowledged within the response target
        Assert.Equal("Fictional Director", d["counterpart"]!["name"]!.GetValue<string>());
        Assert.Single((await e.Get($"/escalations?clientId={c}&overdue=true")).Body!["items"]!.AsArray());

        // A reply through another channel acknowledges it.
        Assert.NotNull((await e.Post($"/escalations/{id}/communications", new { channel = "Email", outgoing = true })).Error("note"));
        await e.Ok($"/escalations/{id}/communications", new { channel = "Email", outgoing = true, note = "Acknowledged; engineer on site tomorrow." });
        d = (await e.Get($"/escalations/{id}")).Body!;
        Assert.Equal("Acknowledged", d["status"]!.GetValue<string>());
        Assert.False(d["overdue"]!.GetValue<bool>());

        // Levels 1 → 3, no further.
        Assert.NotNull((await e.Post($"/escalations/{id}/raise-level", new { })).Error("note"));
        await e.Ok($"/escalations/{id}/raise-level", new { note = "Second outage" });
        await e.Ok($"/escalations/{id}/raise-level", new { note = "Executive complaint" });
        Assert.NotNull((await e.Post($"/escalations/{id}/raise-level", new { note = "Again" })).Error("note"));

        // Status: resolution needs a summary; closing; reopening needs a reason; impossible moves refused.
        Assert.NotNull((await e.Post($"/escalations/{id}/status", new { status = "Closed" })).Error("status"));
        Assert.NotNull((await e.Post($"/escalations/{id}/status", new { status = "Resolved" })).Error("resolutionSummary"));
        await e.Ok($"/escalations/{id}/status", new { status = "Resolved", resolutionSummary = "Faulty switch replaced." });
        await e.Ok($"/escalations/{id}/status", new { status = "Closed" });
        Assert.NotNull((await e.Post($"/escalations/{id}/status", new { status = "InProgress" })).Error("note"));
        await e.Ok($"/escalations/{id}/status", new { status = "InProgress", note = "Outage returned" });
        d = (await e.Get($"/escalations/{id}")).Body!;
        Assert.Equal(3, d["level"]!.GetValue<int>());
        Assert.Null(d["closedAt"]);
        Assert.Equal(8, d["events"]!.AsArray().Count);   // created, communication, 2 raises, 4 status changes

        // Channels are configurable: a new one is offered at once and counted where used; a used channel cannot be deleted.
        var portal = await m.Create("/admin/lookups", new { listName = "EscalationChannel", label = U("Customer portal") });
        var code = (await m.Get("/admin/lookups")).Body!.AsArray().First(x => Id(x) == portal)!["code"]!.GetValue<string>();
        var second = await m.Create("/escalations", Body(channel: code, owner: e.UserId) );
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/admin/lookups/{portal}")).Status);
        var usage = (await m.Get("/admin/lookups/EscalationChannel/usage")).Body!;
        Assert.Contains("FormalLetter", usage.ToJsonString());

        // The manager assigned it to the engineer, who is notified.
        Assert.Contains((await e.Get("/notifications?pageSize=100")).Body!["items"]!.AsArray(), n => n!["link"]!.GetValue<string>() == $"/escalations/{second}");

        // The dashboard counts them by channel and level.
        var ins = (await m.Get($"/dashboard/insights?clientId={c}")).Body!["escalations"]!;
        Assert.Equal(2, ins["total"]!.GetValue<int>());
        Assert.Contains(ins["byChannel"]!.AsArray(), b => b!["key"]!.GetValue<string>() == code);

        // Deleting needs the Delete right; the timeline goes with it.
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Send(HttpMethod.Delete, $"/escalations/{second}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/escalations/{second}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/escalations/{second}")).Status);
    }
}

[Collection("hub")]
public class AC43_DeleteWithDependents(HubFactory hub) : Scenario(hub)
{
    /// <summary>A43: a client is deleted with everything that belongs to it, from one dialog; optional links are kept and unlinked.</summary>
    [Fact]
    public async Task A_client_and_everything_it_owns_are_listed_then_deleted_together()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var keep = await NewClient();
        var region = await m.Create($"/clients/{c}/regions", new { code = "R1", name = "North", ownerUserId = m.UserId });
        var env = await NewEnv(c, "Production", region);
        var web = await m.Create("/assets", new { environmentId = env, name = "web01", type = "VM", ownerUserId = m.UserId });
        var app = await m.Create("/assets", new { environmentId = env, name = "app01", type = "VM", ownerUserId = m.UserId });
        await m.Create($"/assets/{app}/volumes", new { label = "D:", capacity = 100, unit = "GB" });
        await m.Create("/firewall-rules", new { sourceAssetId = web, destinationAssetId = app, ports = "443", purpose = "API" });
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional project", status = "Active", ownerUserId = m.UserId });
        var contract = await m.Create("/contracts", new { projectId = project, title = "Support", type = "SlaSupport", status = "Draft", ownerUserId = m.UserId });
        var caseId = await NewCase(c, env);
        await m.Create("/commitments", new { scope = "Client", clientId = c, description = "Report", type = "CustomerUpdate", ownerUserId = m.UserId, dueLocal = Future(3), timeZone = "Asia/Riyadh", caseId });
        await m.Create("/escalations", new { clientId = c, title = "Outage letter", channel = "FormalLetter", ownerUserId = m.UserId, contractId = contract, caseId });
        await m.Create($"/clients/{c}/boundaries", new { area = "Network", party = "TIO", person = new { name = "Fictional Lead" } });
        var sub = await m.Create("/clients", new { code = U("SUB"), name = "Fictional sub-client", country = "Oman", status = "Active", ownerUserId = m.UserId, parentClientId = c });
        var keepEnv = await NewEnv(keep, "Production");

        // The plain delete is refused; the preview lists what belongs to the client and what would only be unlinked.
        Assert.Equal(HttpStatusCode.Conflict, (await m.Send(HttpMethod.Delete, $"/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Get($"/dependents/clients/{c}")).Status);
        var p = (await m.Get($"/dependents/clients/{c}")).Body!;
        int Count(string label) => p["delete"]!.AsArray().FirstOrDefault(g => g!["label"]!.GetValue<string>() == label)?["count"]!.GetValue<int>() ?? 0;
        Assert.Equal(1, Count("Regions"));
        Assert.Equal(1, Count("Environments"));
        Assert.Equal(2, Count("Servers"));
        Assert.Equal(1, Count("Volumes"));
        Assert.Equal(1, Count("Firewall rules"));
        Assert.Equal(1, Count("Projects"));
        Assert.Equal(1, Count("Contracts"));
        Assert.Equal(1, Count("Cases"));
        Assert.Equal(1, Count("Commitments"));
        Assert.Equal(1, Count("Escalations"));
        Assert.Equal(1, Count("Responsibility boundaries"));
        var envGroup = p["delete"]!.AsArray().First(g => g!["label"]!.GetValue<string>() == "Environments")!;
        Assert.Equal($"/environments/{env}", envGroup["items"]![0]!["link"]!.GetValue<string>());
        Assert.Contains(p["unlink"]!.AsArray(), g => g!["label"]!.GetValue<string>() == "Sub-clients" && g["count"]!.GetValue<int>() == 1);

        // An item can be deleted on its own from the list (the per-row button calls its own delete).
        var esc = Id((await m.Get($"/escalations?clientId={c}&status=all")).Body!["items"]!.AsArray()[0]);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/escalations/{esc}")).Status);
        Assert.Equal(0, ((await m.Get($"/dependents/clients/{c}")).Body!["delete"]!.AsArray().FirstOrDefault(g => g!["label"]!.GetValue<string>() == "Escalations")?["count"]?.GetValue<int>()) ?? 0);

        // Delete everything: the client and what it owns go; the sub-client stays as a main client; other clients are untouched.
        var r = await m.Send(HttpMethod.Delete, $"/dependents/clients/{c}");
        Assert.Equal(HttpStatusCode.OK, r.Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/clients/{c}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/assets/{app}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/cases/{caseId}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/contracts/{contract}")).Status);
        var subNow = (await m.Get($"/clients/{sub}")).Body!;
        Assert.Null(subNow["parent"]);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/environments/{keepEnv}")).Status);
        var audit = (await m.Get($"/admin/audit?entityType=Client&entityId={c}")).Body!;
        Assert.Contains("everything", audit.ToJsonString());

        // The same works for one environment of a client.
        var env2 = await NewEnv(keep, "Staging");
        var srv = await m.Create("/assets", new { environmentId = env2, name = "stg01", type = "VM", ownerUserId = m.UserId });
        var pe = (await m.Get($"/dependents/environments/{env2}")).Body!;
        Assert.Contains(pe["delete"]!.AsArray(), g => g!["label"]!.GetValue<string>() == "Servers" && g["count"]!.GetValue<int>() == 1);
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/environments/{env2}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/assets/{srv}")).Status);
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/environments/{keepEnv}")).Status);
    }
}


[Collection("hub")]
public class AC45_CopyServerToManyEnvironments(HubFactory hub) : Scenario(hub)
{
    /// <summary>A45: a server is copied into several environments at once — another environment in its region, environments in other
    /// regions and its own environment (a duplicate with a new name) — each with its own rename rule; all or nothing.</summary>
    [Fact]
    public async Task A_server_is_copied_across_environments_regions_and_within_its_environment()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var r1 = await m.Create($"/clients/{c}/regions", new { code = "R1", name = "North", ownerUserId = m.UserId });
        var r2 = await m.Create($"/clients/{c}/regions", new { code = "R2", name = "Coast", ownerUserId = m.UserId });
        var env1 = await NewEnv(c, "Production", r1);
        var stg1 = await NewEnv(c, "Staging", r1);
        var env2 = await NewEnv(c, "Production", r2);
        var foreign = await NewEnv(await NewClient(), "Production");
        var pid = Id((await m.Get("/reference")).Body!["products"]!.AsArray().First(p => p!["code"]!.GetValue<string>() == "PSOP"));
        var app = await m.Create("/assets", new { environmentId = env1, name = "PSOP-APP1", type = "VM", ownerUserId = m.UserId, cpuQuantity = 8, cpuUnit = "vCPU" });
        await m.Create($"/assets/{app}/volumes", new { label = "D:", capacity = 200, unit = "GB" });
        var inst = await m.Create("/installations", new { environmentId = env1, productId = pid, instanceName = "Main" });
        await m.Create("/components", new { installationId = inst, name = "API", role = "Application", ownerUserId = m.UserId, hostAssetIds = new[] { app } });

        // Refused: no target, the same target twice, the same environment without a rename, another client.
        Assert.NotNull((await e.Post($"/environments/{env1}/clone-to-many", new { targets = Array.Empty<object>(), assetIds = new[] { app } })).Error("targets"));
        Assert.NotNull((await e.Post($"/environments/{env1}/clone-to-many", new { targets = new[] { new { environmentId = stg1 }, new { environmentId = stg1 } }, assetIds = new[] { app } })).Error("targets"));
        Assert.NotNull((await e.Post($"/environments/{env1}/clone-to-many", new { targets = new[] { new { environmentId = env1 } }, assetIds = new[] { app } })).Error("targets[0].find"));
        var bad = await e.Post($"/environments/{env1}/clone-to-many", new { targets = new object[] { new { environmentId = stg1 }, new { environmentId = foreign } }, assetIds = new[] { app } });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.Status);
        Assert.Equal(0, (await e.Get($"/assets?environmentId={stg1}")).Total);   // all or nothing: nothing copied into Staging either

        // One request: the same region's Staging (same name), the other region's Production (R1 → R2) and a duplicate next to it (APP1 → APP2).
        var r = await e.Post($"/environments/{env1}/clone-to-many", new
        {
            targets = new object[] { new { environmentId = stg1 }, new { environmentId = env2, find = "APP1", replace = "R2-APP1" }, new { environmentId = env1, find = "APP1", replace = "APP2" } },
            assetIds = new[] { app }, lifecycle = "Planned"
        });
        Assert.Equal(HttpStatusCode.OK, r.Status);
        Assert.Equal(3, r.Body!["results"]!.AsArray().Count);
        string NameIn(long env) => e.Get($"/assets?environmentId={env}&pageSize=50").Result.Body!["items"]!.AsArray().Select(x => x!["name"]!.GetValue<string>()).OrderBy(x => x).Aggregate((a, b) => a + "," + b);
        Assert.Equal("PSOP-APP1", NameIn(stg1));
        Assert.Equal("PSOP-R2-APP1", NameIn(env2));
        Assert.Equal("PSOP-APP1,PSOP-APP2", NameIn(env1));
        // The duplicate keeps its sizing and volume and runs the same component of the same installation.
        var dup = Id((await e.Get($"/assets?environmentId={env1}&q=APP2")).Body!["items"]!.AsArray()[0]);
        var d = (await e.Get($"/assets/{dup}")).Body!;
        Assert.Equal(8, d["cpuQuantity"]!.GetValue<decimal>());
        Assert.Single(d["volumes"]!.AsArray());
        Assert.Contains(d["components"]!.AsArray(), x => x!["installationId"]!.GetValue<long>() == inst && x["name"]!.GetValue<string>() == "API");
        Assert.Equal(1, (await e.Get($"/installations?environmentId={env1}")).Total);   // no second installation in the same environment

        // A clash in one target names it and copies nothing anywhere.
        var clash = await e.Post($"/environments/{env1}/clone-to-many", new { targets = new object[] { new { environmentId = env2, find = "APP1", replace = "R2-APP9" }, new { environmentId = stg1 } }, assetIds = new[] { app } });
        Assert.Equal(HttpStatusCode.Conflict, clash.Status);
        Assert.Contains("R1 / Staging", clash.Text);
        Assert.Equal("PSOP-R2-APP1", NameIn(env2));
    }
}

[Collection("hub")]
public class AC46_Attachments(HubFactory hub) : Scenario(hub)
{
    private static async Task<Res> Upload(Api a, string recordType, long recordId, params (string Name, byte[] Bytes)[] files)
    {
        using var form = new MultipartFormDataContent { { new StringContent(recordType), "recordType" }, { new StringContent(recordId.ToString()), "recordId" }, { new StringContent("Fictional test file"), "description" } };
        foreach (var f in files) form.Add(new ByteArrayContent(f.Bytes), "files", f.Name);
        var res = await a.Http.PostAsync("/api/v1/attachments", form);
        var text = await res.Content.ReadAsStringAsync();
        return new Res(res.StatusCode, text.Length > 0 && text.TrimStart().StartsWith('{') || text.TrimStart().StartsWith('[') ? JsonNode.Parse(text) : null, null, text);
    }

    /// <summary>A46: files are attached to records, stored on disk under the configured folder (only metadata in the database), downloaded,
    /// removed, and cleaned up when their record is deleted.</summary>
    [Fact]
    public async Task Files_are_stored_on_disk_downloaded_and_removed_with_their_record()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var e2 = await Hub.As(HubFactory.Engineer2);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        var caseId = await NewCase(c, env);
        var pdf = "%PDF-1.4 fictional"u8.ToArray();
        var notes = "Fictional meeting notes\nNo credentials here."u8.ToArray();

        // Refused: an executable, an empty file, a file over the limit (1 MB in tests), an unknown record.
        Assert.NotNull((await Upload(e, "Case", caseId, ("setup.exe", [1, 2, 3]))).Error("files"));
        Assert.NotNull((await Upload(e, "Case", caseId, ("empty.txt", []))).Error("files"));
        Assert.NotNull((await Upload(e, "Case", caseId, ("big.pdf", new byte[1_200_000]))).Error("files"));
        Assert.Equal(HttpStatusCode.NotFound, (await Upload(e, "Case", 999_999_999, ("a.txt", notes))).Status);

        var up = await Upload(e, "Case", caseId, ("RCA report.pdf", pdf), (@"..\..\notes.txt", notes));
        Assert.Equal(HttpStatusCode.OK, up.Status);
        var list = (await e.Get($"/attachments?recordType=Case&recordId={caseId}")).Body!.AsArray();
        Assert.Equal(2, list.Count);
        var txt = list.First(x => x!["fileName"]!.GetValue<string>() == "notes.txt")!;   // folders stripped from the name
        Assert.Equal(notes.Length, txt["sizeBytes"]!.GetValue<long>());
        Assert.Equal(Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(notes)).ToLowerInvariant(), txt["sha256"]!.GetValue<string>());

        // The content is a file under the configured folder, not in the database.
        var stored = Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories);
        Assert.Contains(stored, f => File.ReadAllBytes(f).SequenceEqual(notes));

        // Download: same bytes, offered as a file with its name.
        var dl = await e2.Http.GetAsync($"/api/v1/attachments/{Id(txt)}/download");
        Assert.Equal(HttpStatusCode.OK, dl.StatusCode);
        Assert.Equal(notes, await dl.Content.ReadAsByteArrayAsync());
        Assert.Equal("attachment", dl.Content.Headers.ContentDisposition!.DispositionType);
        Assert.Equal("notes.txt", dl.Content.Headers.ContentDisposition.FileNameStar ?? dl.Content.Headers.ContentDisposition.FileName!.Trim('"'));

        // Removing: not by another engineer without the Delete right; by the uploader, and the file leaves the disk.
        Assert.Equal(HttpStatusCode.Forbidden, (await e2.Send(HttpMethod.Delete, $"/attachments/{Id(txt)}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/attachments/{Id(txt)}")).Status);
        Assert.DoesNotContain(Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories), f => File.ReadAllBytes(f).SequenceEqual(notes));

        // Other record types take files too; deleting the record removes its files.
        var srv = await m.Create("/assets", new { environmentId = env, name = "att-app01", type = "VM", ownerUserId = m.UserId });
        var contractProject = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional", status = "Active", ownerUserId = m.UserId });
        var contract = await m.Create("/contracts", new { projectId = contractProject, title = "Support", type = "SlaSupport", status = "Draft", ownerUserId = m.UserId });
        var letter = "Fictional SLA annex"u8.ToArray();
        Assert.Equal(HttpStatusCode.OK, (await Upload(e, "Asset", srv, ("server sheet.xlsx", "x"u8.ToArray()))).Status);
        Assert.Equal(HttpStatusCode.OK, (await Upload(e, "Contract", contract, ("SLA annex.docx", letter))).Status);
        Assert.Equal(HttpStatusCode.OK, (await Upload(e, "Client", c, ("onboarding.pdf", pdf))).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/cases/{caseId}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await e.Get($"/attachments?recordType=Case&recordId={caseId}")).Status);
        var before = Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories).Length;
        var preview = (await m.Get($"/dependents/clients/{c}")).Body!;
        Assert.Contains(preview["delete"]!.AsArray(), g => g!["label"]!.GetValue<string>() == "Attachments");
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/clients/{c}")).Status);
        Assert.DoesNotContain(Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories), f => File.ReadAllBytes(f).SequenceEqual(letter));
        Assert.True(Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories).Length <= before - 3);
    }
}

[Collection("hub")]
public class AC47_PersonalNotes(HubFactory hub) : Scenario(hub)
{
    /// <summary>A47: notebooks, sections and pages are private to their owner; pages link to a client or project or stay personal;
    /// content is sanitized; autosave is version-checked; deleted pages go to a recycle bin; pasted files are on disk and private.</summary>
    [Fact]
    public async Task Notes_are_private_linked_sanitized_and_recoverable()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var admin = await Hub.As(HubFactory.Admin);
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional project", status = "Active", ownerUserId = m.UserId });

        // First use creates a notebook with a section.
        var tree = (await e.Get("/notes/tree")).Body!;
        var nb = tree["notebooks"]!.AsArray()[0]!;
        var section = Id(nb["sections"]!.AsArray()[0]);

        // Content is sanitized: scripts, event handlers, javascript: links and outside images are removed; checklists and formatting stay.
        var page = await e.Create("/notes/pages", new
        {
            sectionId = section, title = "Site visit notes", projectId = project,
            contentHtml = "<h2>Agenda</h2><p onclick=\"alert(1)\">Met the <b>network team</b><script>alert(2)</script></p><ul data-checklist=\"true\"><li data-checked=\"true\">Check UPS</li></ul>" +
                          "<a href=\"javascript:alert(3)\">bad</a><a href=\"https://example.org/runbook\">runbook</a><img src=\"https://evil.example/x.png\">"
        });
        var got = await e.Get($"/notes/pages/{page}");
        var p = got.Body!;
        var etag = got.ETag!;
        var html = p["contentHtml"]!.GetValue<string>();
        Assert.DoesNotContain("script", html);
        Assert.DoesNotContain("onclick", html);
        Assert.DoesNotContain("javascript:", html);
        Assert.DoesNotContain("evil.example", html);
        Assert.Contains("<b>network team</b>", html);
        Assert.Contains("data-checked=\"true\"", html);
        Assert.Contains("https://example.org/runbook", html);
        Assert.Equal(c, p["clientId"]!.GetValue<long>());      // a project link carries its client
        Assert.Equal(project, p["projectId"]!.GetValue<long>());

        // Private: the manager and an administrator cannot list, open, change or delete it, nor add pages to the owner's section.
        foreach (var other in new[] { m, admin })
        {
            Assert.DoesNotContain((await other.Get("/notes/pages?q=Site")).Body!.AsArray(), x => Id(x) == page);
            Assert.Empty((await other.Get($"/notes/pages?projectId={project}")).Body!.AsArray());
            Assert.Equal(HttpStatusCode.NotFound, (await other.Get($"/notes/pages/{page}")).Status);
            Assert.Equal(HttpStatusCode.NotFound, (await other.Put($"/notes/pages/{page}", new { title = "x" }, etag)).Status);
            Assert.Equal(HttpStatusCode.NotFound, (await other.Send(HttpMethod.Delete, $"/notes/pages/{page}")).Status);
            Assert.NotNull((await other.Post("/notes/pages", new { sectionId = section, title = "Into another person's section" })).Error("sectionId"));
        }

        // Search, linked lists, and the change history holds nothing of the note.
        Assert.Contains((await e.Get("/notes/pages?q=network")).Body!.AsArray(), x => Id(x) == page);
        Assert.Contains((await e.Get($"/notes/pages?clientId={c}")).Body!.AsArray(), x => Id(x) == page);
        Assert.DoesNotContain("Site visit notes", (await m.Get("/admin/audit?pageSize=200")).Text);

        // Autosave with version check; a stale save is refused.
        var v1 = etag;
        var saved = await e.Put($"/notes/pages/{page}", new { title = "Site visit notes (day 1)", contentHtml = "<p>Updated</p>" }, v1);
        Assert.Equal(HttpStatusCode.OK, saved.Status);
        Assert.Equal(HttpStatusCode.PreconditionFailed, (await e.Put($"/notes/pages/{page}", new { title = "stale" }, v1)).Status);
        // Change the link to personal.
        Assert.Equal(HttpStatusCode.OK, (await e.Put($"/notes/pages/{page}/link", new { })).Status);
        Assert.Contains((await e.Get("/notes/pages?link=personal")).Body!.AsArray(), x => Id(x) == page);

        // A pasted image is stored on disk, shown only to the owner.
        var bytes = "fictional png bytes"u8.ToArray();
        using (var form = new MultipartFormDataContent { { new ByteArrayContent(bytes), "file", "screenshot.png" } })
        {
            var up = await e.Http.PostAsync($"/api/v1/notes/pages/{page}/files", form);
            Assert.Equal(HttpStatusCode.OK, up.StatusCode);
            var img = JsonNode.Parse(await up.Content.ReadAsStringAsync())!;
            var url = img["url"]!.GetValue<string>();
            Assert.Equal(HttpStatusCode.OK, (await e.Http.GetAsync(url)).StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, (await m.Http.GetAsync(url)).StatusCode);
            Assert.Contains(Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories), f => File.ReadAllBytes(f).SequenceEqual(bytes));
            var cur = (await e.Get($"/notes/pages/{page}")).ETag!;
            Assert.Equal(HttpStatusCode.OK, (await e.Put($"/notes/pages/{page}", new { contentHtml = $"<p>See <img src=\"{url}\"></p>" }, cur)).Status);
            Assert.Contains(url, (await e.Get($"/notes/pages/{page}")).Body!["contentHtml"]!.GetValue<string>());
        }

        // A sub-page goes to the recycle bin with its page and comes back with it.
        var sub = await e.Create("/notes/pages", new { sectionId = section, title = "Details", level = 1, afterPageId = page });
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/pages/{page}")).Status);
        Assert.Contains((await e.Get("/notes/pages?deleted=true")).Body!.AsArray(), x => Id(x) == sub);
        await e.Ok($"/notes/pages/{page}/restore");
        var back = (await e.Get($"/notes/pages?sectionId={section}")).Body!.AsArray();
        Assert.Contains(back, x => Id(x) == sub && x!["level"]!.GetValue<int>() == 1);
        Assert.Equal(Id(back.First(x => Id(x) == page)) , page);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/pages/{sub}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/pages/{sub}/permanent")).Status);

        // Recycle bin: delete, find it there, restore; permanent delete removes the page and its file.
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/pages/{page}")).Status);
        Assert.Contains((await e.Get("/notes/pages?deleted=true")).Body!.AsArray(), x => Id(x) == page);
        Assert.DoesNotContain((await e.Get($"/notes/pages?sectionId={section}")).Body!.AsArray(), x => Id(x) == page);
        await e.Ok($"/notes/pages/{page}/restore");
        Assert.Contains((await e.Get($"/notes/pages?sectionId={section}")).Body!.AsArray(), x => Id(x) == page);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/pages/{page}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/pages/{page}/permanent")).Status);
        Assert.DoesNotContain(Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories), f => File.ReadAllBytes(f).SequenceEqual(bytes));

        // Deleting the linked client clears the link on the private page and leaves the page; the delete preview never counts notes.
        var c2 = await NewClient();
        var linked = await e.Create("/notes/pages", new { sectionId = section, title = "Client call", clientId = c2, contentHtml = "<p>Call notes</p>" });
        var preview = (await m.Get($"/dependents/clients/{c2}")).Body!;
        Assert.DoesNotContain("Note", preview.ToJsonString());
        Assert.Equal(HttpStatusCode.OK, (await m.Send(HttpMethod.Delete, $"/dependents/clients/{c2}")).Status);
        var after = (await e.Get($"/notes/pages/{linked}")).Body!;
        Assert.Null(after["clientId"]);
        Assert.True(after["linkGone"]!.GetValue<bool>());

        // Notebooks and sections: create, validation, at least one notebook is kept.
        var nb2 = await e.Create("/notes/notebooks", new { name = "Projects", color = "green" });
        Assert.NotNull((await e.Post("/notes/notebooks", new { name = "", color = "green" })).Error("name"));
        Assert.NotNull((await e.Post("/notes/sections", new { notebookId = nb2, name = "Bad colour", color = "pink" })).Error("color"));
        Assert.Equal(HttpStatusCode.NoContent, (await e.Send(HttpMethod.Delete, $"/notes/notebooks/{nb2}")).Status);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await e.Send(HttpMethod.Delete, $"/notes/notebooks/{Id(nb)}")).Status);
    }
}

[Collection("hub")]
public class AC48_AttachmentStorageSettings(HubFactory hub) : Scenario(hub)
{
    /// <summary>A48: an administrator changes the attachment folder (files move with it), the limits and the accepted types; unsafe values are refused.</summary>
    [Fact]
    public async Task The_storage_folder_and_limits_are_edited_and_files_move_with_the_folder()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var before = (await m.Get("/admin/attachment-storage")).Body!;
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Get("/admin/attachment-storage")).Status);

        using (var form = new MultipartFormDataContent { { new StringContent("Client"), "recordType" }, { new StringContent(c.ToString()), "recordId" } })
        {
            form.Add(new ByteArrayContent("fictional moved file"u8.ToArray()), "files", "moved.txt");
            Assert.True((await e.Http.PostAsync("/api/v1/attachments", form)).IsSuccessStatusCode);
        }
        var file = Id((await e.Get($"/attachments?recordType=Client&recordId={c}")).Body!.AsArray()[0]);
        var newRoot = Path.Combine(Path.GetTempPath(), "tiohub-test-attachments", "moved-" + Guid.NewGuid().ToString("N")[..8]);

        // Refused: a blocked type, sizes out of range, a folder inside the published web folder.
        Assert.NotNull((await m.Put("/admin/attachment-storage", new { path = newRoot, maxFileMB = 1, maxFilesPerUpload = 10, extensions = new[] { ".txt", ".exe" } })).Error("extensions"));
        Assert.NotNull((await m.Put("/admin/attachment-storage", new { path = newRoot, maxFileMB = 999, maxFilesPerUpload = 10, extensions = new[] { ".txt" } })).Error("maxFileMB"));
        Assert.NotNull((await m.Put("/admin/attachment-storage", new { path = "wwwroot/files", maxFileMB = 1, maxFilesPerUpload = 10, extensions = new[] { ".txt" } })).Error("path"));

        // Move: the files go to the new folder, downloads still work, the limits apply at once.
        var exts = before["extensions"]!.AsArray().Select(x => x!.GetValue<string>()).ToArray();
        var r = await m.Put("/admin/attachment-storage", new { path = newRoot, maxFileMB = 1, maxFilesPerUpload = 3, extensions = exts, moveFiles = true });
        Assert.Equal(HttpStatusCode.OK, r.Status);
        Assert.True(r.Body!["moved"]!.GetValue<int>() >= 1);
        Assert.Contains(Directory.GetFiles(newRoot, "*", SearchOption.AllDirectories), f => File.ReadAllBytes(f).SequenceEqual("fictional moved file"u8.ToArray()));
        Assert.DoesNotContain(Directory.GetFiles(Hub.AttachmentRoot, "*", SearchOption.AllDirectories), f => File.ReadAllBytes(f).SequenceEqual("fictional moved file"u8.ToArray()));
        Assert.Equal("fictional moved file", await (await e.Http.GetAsync($"/api/v1/attachments/{file}/download")).Content.ReadAsStringAsync());
        var limits = (await e.Get("/attachments/limits")).Body!;
        Assert.Equal(3, limits["maxFilesPerUpload"]!.GetValue<int>());
        var now = (await m.Get("/admin/attachment-storage")).Body!;
        Assert.Equal(Path.GetFullPath(newRoot), now["location"]!.GetValue<string>());
        Assert.DoesNotContain((await m.Get("/admin/settings")).Body!.AsArray(), s => s!["key"]!.GetValue<string>().StartsWith("Attachments."));
        Assert.Contains("Attachment storage moved", (await m.Get("/admin/audit?entityType=AppSetting&pageSize=50")).Text);

        // Back to the configuration folder (the other tests use it), moving the files back.
        var back = await m.Put("/admin/attachment-storage", new { path = (string?)null, maxFileMB = before["maxFileMB"]!.GetValue<int>(), maxFilesPerUpload = before["maxFilesPerUpload"]!.GetValue<int>(), extensions = exts, moveFiles = true });
        Assert.Equal(HttpStatusCode.OK, back.Status);
        Assert.Equal(before["location"]!.GetValue<string>(), (await m.Get("/admin/attachment-storage")).Body!["location"]!.GetValue<string>());
        Assert.Equal("fictional moved file", await (await e.Http.GetAsync($"/api/v1/attachments/{file}/download")).Content.ReadAsStringAsync());
    }
}

[Collection("hub")]
public class AC49_ContractTermsAndPayments(HubFactory hub) : Scenario(hub)
{
    /// <summary>A49: support days and hours or 24×7, a time zone from the list, delivery schedule, fees and costs with a currency, payment terms and payment reminders.</summary>
    [Fact]
    public async Task Contracts_record_support_hours_schedule_fees_and_payments_with_reminders()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional", status = "Active", ownerUserId = m.UserId });
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        object Body(object? extra = null) => new
        {
            projectId = project, title = "Support and maintenance", type = "SlaSupport", status = "Active", ownerUserId = e.UserId, supportModel = "Remote",
            supportTimeZone = "Asia/Dubai", support24x7 = false, supportDays = new[] { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday" }, supportFrom = "08:00", supportTo = "17:00",
            currency = "AED",
            milestones = new[] { new { phase = "Phase 1 – Installation", description = "Servers and software", completionPercent = (int?)100, date = (DateOnly?)today.AddDays(-30) },
                                 new { phase = "Phase 2 – Go-live", description = "Acceptance", completionPercent = (int?)40, date = (DateOnly?)today.AddDays(60) } },
            fees = new[] { new { description = "Annual support", unit = "year", quantity = (decimal?)1, unitPrice = (decimal?)120000m },
                           new { description = "On-site engineer", unit = "man-day", quantity = (decimal?)20, unitPrice = (decimal?)1500m } },
            payments = new[] { new { condition = "30% on signature", percentage = (decimal?)30, amount = (decimal?)45000m, dueDate = (DateOnly?)today.AddDays(-3), status = "Pending", paidOn = (DateOnly?)null },
                               new { condition = "40% on go-live", percentage = (decimal?)40, amount = (decimal?)60000m, dueDate = (DateOnly?)today.AddDays(10), status = "Invoiced", paidOn = (DateOnly?)null },
                               new { condition = "30% after acceptance", percentage = (decimal?)30, amount = (decimal?)45000m, dueDate = (DateOnly?)today.AddDays(200), status = "Pending", paidOn = (DateOnly?)null } }
        };

        // Refused: an unknown time zone, a missing currency with amounts, percentages over 100, a percentage out of range, a paid row without a date.
        var bad = await m.Post("/contracts", new { projectId = project, title = "x", type = "SlaSupport", status = "Draft", ownerUserId = e.UserId, supportTimeZone = "Mars/Base",
            fees = new[] { new { description = "Fee", unitPrice = (decimal?)10m } },
            payments = new[] { new { condition = "a", percentage = (decimal?)80, status = "Paid" }, new { condition = "b", percentage = (decimal?)50, status = "Pending" } },
            milestones = new[] { new { phase = "P", completionPercent = (int?)140 } } });
        Assert.NotNull(bad.Error("supportTimeZone"));
        Assert.NotNull(bad.Error("currency"));
        Assert.NotNull(bad.Error("payments"));
        Assert.NotNull(bad.Error("payments[0]"));
        Assert.NotNull(bad.Error("milestones[0]"));

        var id = await m.Create("/contracts", Body());
        var d = (await e.Get($"/contracts/{id}")).Body!;
        Assert.Equal("Sun–Thu 08:00–17:00 (Asia/Dubai)", d["supportSummary"]!.GetValue<string>());
        Assert.Equal(2, d["milestones"]!.AsArray().Count);
        Assert.Equal(150000m, d["feesTotal"]!.GetValue<decimal>());
        Assert.Equal("AED", d["currency"]!.GetValue<string>());
        var pays = d["payments"]!.AsArray();
        Assert.True(pays[0]!["overdue"]!.GetValue<bool>());
        Assert.False(pays[1]!["overdue"]!.GetValue<bool>());

        // 24×7 replaces days and hours; rows keep their identity when edited; a removed row goes.
        var version = (await e.Get($"/contracts/{id}")).ETag!;
        var keepFee = Id(d["fees"]!.AsArray()[0]);
        var put = await m.Put($"/contracts/{id}", new
        {
            projectId = project, title = "Support and maintenance", type = "SlaSupport", status = "Active", ownerUserId = e.UserId, supportModel = "Remote", supportTimeZone = "Asia/Dubai",
            support24x7 = true, supportDays = new[] { "Sunday" }, supportFrom = "08:00", supportTo = "17:00", currency = "AED",
            fees = new[] { new { id = (long?)keepFee, description = "Annual support (renewed)", unit = "year", quantity = (decimal?)1, unitPrice = (decimal?)125000m } },
            payments = d["payments"]!.AsArray().Select(x => new { id = (long?)Id(x), condition = x!["condition"]!.GetValue<string>(), percentage = (decimal?)x["percentage"]!.GetValue<decimal>(),
                amount = (decimal?)x["amount"]!.GetValue<decimal>(), dueDate = (DateOnly?)DateOnly.Parse(x["dueDate"]!.GetValue<string>()), status = x["status"]!.GetValue<string>(), paidOn = (DateOnly?)null }).ToArray()
        }, version);
        Assert.Equal(HttpStatusCode.NoContent, put.Status);
        d = (await e.Get($"/contracts/{id}")).Body!;
        Assert.Equal("24 × 7", d["supportSummary"]!.GetValue<string>());
        Assert.Empty(d["supportDays"]!.AsArray());
        Assert.Equal(keepFee, Id(d["fees"]!.AsArray().Single()));
        Assert.Equal(125000m, d["feesTotal"]!.GetValue<decimal>());
        Assert.Empty(d["milestones"]!.AsArray());

        // Reminders: the overdue payment and the one due within the window reach the contract owner (and the managers); the far one does not.
        using (var scope = Hub.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>();
            await TioHub.Api.Modules.Notifications.NotificationScanner.ScanAsync(db, DateTimeOffset.UtcNow, CancellationToken.None);
        }
        var notes = (await e.Get("/notifications?pageSize=100")).Body!["items"]!.AsArray().Where(n => n!["link"]!.GetValue<string>() == $"/contracts/{id}").Select(n => n!["title"]!.GetValue<string>()).ToList();
        Assert.Contains(notes, t => t.StartsWith("Payment overdue") && t.Contains("45,000.00 AED"));
        Assert.Contains(notes, t => t.StartsWith("Payment due") && t.Contains("60,000.00 AED"));
        Assert.Equal(2, notes.Count(t => t.StartsWith("Payment")));
        Assert.Contains((await m.Get("/notifications?pageSize=100")).Body!["items"]!.AsArray(), n => n!["title"]!.GetValue<string>().StartsWith("Payment due") && n["link"]!.GetValue<string>() == $"/contracts/{id}");
    }
}

[Collection("hub")]
public class AC50_PaymentsOnDashboardAndNotifications(HubFactory hub) : Scenario(hub)
{
    /// <summary>A50: contract payments in one list by state, on the dashboard (figures, months, currencies, next payments), in the action list and in the notifications center's Payments tab.</summary>
    [Fact]
    public async Task Payments_appear_on_the_dashboard_the_action_list_and_the_notifications_center()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var c = await NewClient();
        var project = await m.Create("/projects", new { clientId = c, code = U("PRJ"), name = "Fictional", status = "Active", ownerUserId = m.UserId });
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var id = await m.Create("/contracts", new
        {
            projectId = project, title = "Fictional payments", type = "SlaSupport", status = "Active", ownerUserId = e.UserId, currency = "EUR",
            payments = new[]
            {
                new { condition = "Overdue instalment", amount = (decimal?)1000m, dueDate = (DateOnly?)today.AddDays(-5), status = "Invoiced", paidOn = (DateOnly?)null },
                new { condition = "Due instalment", amount = (decimal?)2000m, dueDate = (DateOnly?)today.AddDays(3), status = "Pending", paidOn = (DateOnly?)null },
                new { condition = "Later instalment", amount = (decimal?)4000m, dueDate = (DateOnly?)today.AddDays(120), status = "Pending", paidOn = (DateOnly?)null },
                new { condition = "Paid instalment", amount = (decimal?)500m, dueDate = (DateOnly?)today.AddDays(-40), status = "Paid", paidOn = (DateOnly?)today.AddDays(-41) }
            }
        });

        // The payment list by state, with the summary per currency.
        Assert.NotNull((await m.Get($"/payments?clientId={c}&state=late")).Error("state"));
        var list = (await m.Get($"/payments?clientId={c}")).Body!;
        Assert.Equal(new[] { "Overdue instalment", "Due instalment" }, list["items"]!.AsArray().Select(x => x!["condition"]!.GetValue<string>()));
        Assert.Equal("overdue", list["items"]![0]!["state"]!.GetValue<string>());
        Assert.Equal(-5, list["items"]![0]!["daysToDue"]!.GetValue<int>());
        Assert.Equal(1000m, list["summary"]!["overdue"]!["amounts"]![0]!["amount"]!.GetValue<decimal>());
        Assert.Equal("EUR", list["summary"]!["due"]!["amounts"]![0]!["currency"]!.GetValue<string>());
        Assert.Equal(1, list["summary"]!["upcoming"]!["count"]!.GetValue<int>());
        Assert.Single((await m.Get($"/payments?clientId={c}&state=paid")).Body!["items"]!.AsArray());
        Assert.Equal(3, (await m.Get($"/payments?clientId={c}&state=open")).Body!["items"]!.AsArray().Count);
        Assert.Equal(3, (await e.Get($"/payments?clientId={c}&state=open&mine=true")).Body!["items"]!.AsArray().Count);
        Assert.Empty((await m.Get($"/payments?clientId={c}&state=open&mine=true")).Body!["items"]!.AsArray());

        // Dashboard: summary, overdue bucket first, amounts per currency, the next payments.
        var pay = (await m.Get($"/dashboard/insights?clientId={c}")).Body!["payments"]!;
        Assert.Equal(1, pay["summary"]!["overdue"]!["count"]!.GetValue<int>());
        Assert.Equal(1, pay["summary"]!["due"]!["count"]!.GetValue<int>());
        Assert.Equal("overdue", pay["byMonth"]![0]!["key"]!.GetValue<string>());
        Assert.Equal(1, pay["byMonth"]![0]!["value"]!.GetValue<int>());
        Assert.Equal(7, pay["byMonth"]!.AsArray().Count);
        Assert.Equal(1000m, pay["amountsByMonth"]![0]!["overdue"]!.GetValue<decimal>());
        Assert.Equal(new[] { "Overdue instalment", "Due instalment", "Later instalment" }, pay["next"]!.AsArray().Select(x => x!["condition"]!.GetValue<string>()));

        // Action list: overdue and due payments under PaymentDue.
        var actions = (await m.Get($"/dashboard/actions?clientId={c}&category=PaymentDue")).Body!;
        Assert.Equal(2, actions["categories"]!["PaymentDue"]!.GetValue<int>());
        Assert.All(actions["items"]!.AsArray(), a => Assert.Equal($"/contracts/{id}", a!["link"]!.GetValue<string>()));

        // Notifications center: the Payments category holds the payment reminders only, with their own kinds.
        using (var scope = Hub.Services.CreateScope())
            await TioHub.Api.Modules.Notifications.NotificationScanner.ScanAsync(scope.ServiceProvider.GetRequiredService<TioHub.Api.Data.HubDbContext>(), DateTimeOffset.UtcNow, CancellationToken.None);
        var notes = (await e.Get("/notifications?category=payments&pageSize=100")).Body!;
        var mine = notes["items"]!.AsArray().Where(n => n!["link"]!.GetValue<string>() == $"/contracts/{id}").ToList();
        Assert.Equal(new[] { "PaymentDue", "PaymentOverdue" }, mine.Select(n => n!["kind"]!.GetValue<string>()).Order());
        Assert.All(notes["items"]!.AsArray(), n => Assert.StartsWith("Payment", n!["title"]!.GetValue<string>()));
        Assert.True(notes["unreadPayments"]!.GetValue<int>() >= 2);
        Assert.NotNull((await e.Get("/notifications?category=other")).Error("category"));
    }
}

[Collection("hub")]
public class AC52_ReviewsAndDocumentReferencesRemoved(HubFactory hub) : Scenario(hub)
{
    /// <summary>A52: no review or document-reference endpoints; inventory changes confirm the environment's inventory.</summary>
    [Fact]
    public async Task Review_and_reference_endpoints_are_gone_and_inventory_changes_count_as_review()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/reviews?recordType=Environment&recordId={env}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/documents?recordType=Environment&recordId={env}")).Status);
        Assert.Null((await m.Get($"/environments/{env}")).Body!["inventoryReviewedAt"]?.GetValue<DateTimeOffset?>());
        await m.Create("/assets", new { environmentId = env, name = "app01", type = "VM", lifecycle = "Active", ownerUserId = m.UserId });
        Assert.NotNull((await m.Get($"/environments/{env}")).Body!["inventoryReviewedAt"]?.GetValue<DateTimeOffset?>());
    }
}

[Collection("hub")]
public class AC53_TeamMembersRolesAndProducts(HubFactory hub) : Scenario(hub)
{
    /// <summary>A53: team member roles come from a configurable list, product familiarity from the configured products; members are edited and removed.</summary>
    [Fact]
    public async Task Members_take_a_listed_role_and_configured_products_and_can_be_edited_and_removed()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var team = await m.Create("/teams", new { code = U("TM"), name = "Fictional team", leadUserId = m.UserId });
        var lookups = (await m.Get("/admin/lookups")).Body!.AsArray();
        Assert.Contains(lookups, l => l!["listName"]!.GetValue<string>() == "TeamMemberRole" && l["code"]!.GetValue<string>() == "Support engineer");
        var label = U("Shift lead");
        await m.Create("/admin/lookups", new { listName = "TeamMemberRole", label });
        var role = (await m.Get("/admin/lookups")).Body!.AsArray().First(l => l!["listName"]!.GetValue<string>() == "TeamMemberRole" && l["label"]!.GetValue<string>() == label)!["code"]!.GetValue<string>();
        var product = await m.Create("/products", new { code = U("TP"), name = "Team product" });
        var code = (await m.Get($"/products/{product}")).Body!["code"]!.GetValue<string>();

        // Refused: a role that is not in the list, an unknown product; a non-manager cannot change members.
        var bad = await m.Post($"/teams/{team}/members", new { userId = e.UserId, teamRole = "Wizard", productFamiliarity = $"{code}, NOPE-1" });
        Assert.NotNull(bad.Error("teamRole"));
        Assert.NotNull(bad.Error("productFamiliarity"));
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Post($"/teams/{team}/members", new { userId = e.UserId, teamRole = role })).Status);

        var member = await m.Create($"/teams/{team}/members", new { userId = e.UserId, teamRole = role, skills = "Linux", productFamiliarity = code.ToLowerInvariant() });
        var row = (await m.Get($"/teams/{team}")).Body!["members"]!.AsArray().Single()!;
        Assert.Equal(role, row["teamRole"]!.GetValue<string>());
        Assert.Equal(code, row["productFamiliarity"]!.GetValue<string>());

        // Edit: another listed role, no products, inactive.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/teams/{team}/members/{member}", new { userId = e.UserId, teamRole = "Engineer", skills = "Linux, SQL", productFamiliarity = "", isActive = false },
            row["version"]!.GetValue<string>())).Status);
        row = (await m.Get($"/teams/{team}")).Body!["members"]!.AsArray().Single()!;
        Assert.Equal("Engineer", row["teamRole"]!.GetValue<string>());
        Assert.Null(row["productFamiliarity"]?.GetValue<string>());
        Assert.False(row["isActive"]!.GetValue<bool>());

        // The role in use is counted; removing the membership leaves the person.
        Assert.Equal(HttpStatusCode.Forbidden, (await e.Send(HttpMethod.Delete, $"/teams/{team}/members/{member}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/teams/{team}/members/{member}")).Status);
        Assert.Empty((await m.Get($"/teams/{team}")).Body!["members"]!.AsArray());
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/admin/users/{e.UserId}")).Status);
    }
}

[Collection("hub")]
public class AC56_ProductPartsEditAndDelete(HubFactory hub) : Scenario(hub)
{
    /// <summary>A56: modules, features, microservices and versions are edited and deleted; items still in use are refused with where they are used.</summary>
    [Fact]
    public async Task Product_parts_are_edited_and_deleted_unless_in_use()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var env = await NewEnv(c, "Production");
        var pid = await m.Create("/products", new { code = U("PP"), name = "Parts product" });
        var mod = await m.Create($"/products/{pid}/modules", new { code = "CORE", name = "Core" });
        var feature = await m.Create($"/products/{pid}/features", new { name = "Bulk import", moduleId = mod });
        var ms = await m.Create($"/products/{pid}/microservices", new { name = U("Svc"), moduleId = mod });
        var msv = await m.Create($"/products/microservices/{ms}/versions", new { version = "1.0.0" });
        var used = await m.Create($"/products/{pid}/versions", new { version = "1.0", isActive = true });
        var spare = await m.Create($"/products/{pid}/versions", new { version = "1.1-typo", isActive = true });
        await m.Create("/installations", new { environmentId = env, productId = pid, instanceName = "Main", productVersionId = used, versionEvidence = "RN-1" });

        // Versions: an unused label is corrected; a used one cannot change and cannot be deleted.
        var versions = (await m.Get($"/products/{pid}")).Body!["versions"]!.AsArray();
        string Rv(long id) => versions.First(v => Id(v) == id)!["rowVersion"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/products/versions/{spare}", new { version = "1.1", isActive = true }, Rv(spare))).Status);
        Assert.NotNull((await m.Put($"/products/versions/{used}", new { version = "1.0.1", isActive = true }, Rv(used))).Error("version"));
        var refused = await m.Send(HttpMethod.Delete, $"/products/versions/{used}");
        Assert.Equal(HttpStatusCode.Conflict, refused.Status);
        Assert.Contains("used by installations", refused.Text);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/versions/{spare}")).Status);
        Assert.Equal(new[] { "1.0" }, (await m.Get($"/products/{pid}")).Body!["versions"]!.AsArray().Select(v => v!["version"]!.GetValue<string>()));

        // Microservice version: number corrected while no server runs it, then deleted; the microservice is deleted with its versions.
        var mv = (await m.Get($"/products/microservices/{ms}")).Body!["versions"]!.AsArray().Single()!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/products/microservice-versions/{msv}", new { version = "1.0.1", isActive = true }, mv["rowVersion"]!.GetValue<string>())).Status);
        Assert.Equal("1.0.1", (await m.Get($"/products/microservices/{ms}")).Body!["versions"]![0]!["version"]!.GetValue<string>());
        await m.Create($"/products/microservices/{ms}/versions", new { version = "1.0.2" });
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/microservice-versions/{msv}")).Status);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/microservices/{ms}")).Status);
        Assert.Equal(HttpStatusCode.NotFound, (await m.Get($"/products/microservices/{ms}")).Status);

        // Module: deleting it unlinks its features; the feature is then deleted.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/modules/{mod}")).Status);
        var p = (await m.Get($"/products/{pid}")).Body!;
        Assert.Empty(p["modules"]!.AsArray());
        Assert.Null(p["features"]!.AsArray().Single()!["moduleId"]?.GetValue<long?>());
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/features/{feature}")).Status);
        Assert.Empty((await m.Get($"/products/{pid}")).Body!["features"]!.AsArray());
        Assert.Contains("deleted", (await m.Get("/admin/audit?entityType=ProductFeature&pageSize=50")).Text);
    }
}

[Collection("hub")]
public class AC57_VersionReleaseNotesAndFeatures(HubFactory hub) : Scenario(hub)
{
    /// <summary>A57: a product version carries release notes and the list of features it introduced (picked or created).</summary>
    [Fact]
    public async Task Versions_record_release_notes_and_their_new_features()
    {
        var m = await Hub.As(HubFactory.Manager);
        var pid = await m.Create("/products", new { code = U("RN"), name = "Release notes product" });
        var existing = await m.Create($"/products/{pid}/features", new { name = "Bulk import" });

        // Refused: a feature of another product, a new name that already exists.
        var other = await m.Create("/products", new { code = U("RO"), name = "Other product" });
        var foreign = await m.Create($"/products/{other}/features", new { name = "Foreign" });
        var bad = await m.Post($"/products/{pid}/versions", new { version = "2.0", isActive = true, featureIds = new[] { foreign }, newFeatures = new[] { "bulk import" } });
        Assert.NotNull(bad.Error("featureIds"));
        Assert.NotNull(bad.Error("newFeatures"));

        var v2 = await m.Create($"/products/{pid}/versions", new { version = "2.0", isActive = true, releaseNotes = "Faster import\nFixes login timeout",
            featureIds = new[] { existing }, newFeatures = new[] { "Duplicate check", " " } });
        var p = (await m.Get($"/products/{pid}")).Body!;
        var ver = p["versions"]!.AsArray().Single()!;
        Assert.Equal("Faster import\nFixes login timeout", ver["releaseNotes"]!.GetValue<string>());
        Assert.Equal(new[] { "Bulk import", "Duplicate check" }, ver["features"]!.AsArray().Select(f => f!["name"]!.GetValue<string>()));
        Assert.All(p["features"]!.AsArray(), f => Assert.Equal("2.0", f!["introducedIn"]!.GetValue<string>()));

        // Edit: drop one feature from the list (it stays on the product); a feature can name its version itself.
        var v21 = await m.Create($"/products/{pid}/versions", new { version = "2.1", isActive = true });
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/products/versions/{v2}", new { version = "2.0", isActive = true, releaseNotes = "Faster import", featureIds = new[] { existing } }, ver["rowVersion"]!.GetValue<string>())).Status);
        var dup = (await m.Get($"/products/{pid}")).Body!["features"]!.AsArray().First(f => f!["name"]!.GetValue<string>() == "Duplicate check")!;
        Assert.Null(dup["introducedIn"]?.GetValue<string>());
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/products/features/{Id(dup)}", new { name = "Duplicate check", isActive = true, introducedInVersionId = v21 }, dup["version"]!.GetValue<string>())).Status);
        Assert.NotNull((await m.Put($"/products/features/{Id(dup)}", new { name = "Duplicate check", isActive = true, introducedInVersionId = foreign },
            (await m.Get($"/products/{pid}")).Body!["features"]!.AsArray().First(f => Id(f) == Id(dup))!["version"]!.GetValue<string>())).Error("introducedInVersionId"));

        // Deleting a version keeps its features on the product, without a version.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/products/versions/{v21}")).Status);
        var after = (await m.Get($"/products/{pid}")).Body!["features"]!.AsArray();
        Assert.Equal(2, after.Count);
        Assert.Null(after.First(f => Id(f) == Id(dup))!["introducedIn"]?.GetValue<string>());
    }
}

[Collection("hub")]
public class AC60_OperationsCommandCenter(HubFactory hub) : Scenario(hub)
{
    /// <summary>A60: command-center figures, period handling, the action queue's new kinds and severities, and the access boundary.</summary>
    [Fact]
    public async Task Command_center_measures_risk_targets_and_attention_from_real_records()
    {
        var m = await Hub.As(HubFactory.Manager);
        var e = await Hub.As(HubFactory.Engineer);
        var viewer = await Hub.As("DEV\\" + U("norole").ToLowerInvariant()); // an account with no role at all
        var c = await NewClient();
        var env = await NewEnv(c, "Production");

        // Access and input checks: an account without a business role sees no dashboard figures.
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Get("/dashboard/command-center")).Status);
        Assert.NotNull((await m.Get("/dashboard/command-center?period=century")).Error("period"));
        Assert.NotNull((await m.Get("/dashboard/command-center?period=custom")).Error("from"));

        // Nothing yet for the new client: rates are not invented.
        var empty = (await m.Get($"/dashboard/command-center?clientId={c}&period=7d")).Body!;
        Assert.Equal(0, empty["cases"]!["openCount"]!.GetValue<int>());
        Assert.Equal(0, empty["cases"]!["adherence"]!["measured"]!.GetValue<int>());
        Assert.Equal(0, empty["escalations"]!["response"]!["measured"]!.GetValue<int>());
        Assert.Equal("day", empty["period"]!["unit"]!.GetValue<string>());
        Assert.InRange(empty["cases"]!["trend"]!.AsArray().Count, 7, 8);

        // A case due within 24 hours, an escalation past its response target, an unavailable environment.
        var local = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow.AddHours(3), TimeZoneInfo.FindSystemTimeZoneById("Asia/Riyadh"));
        var dueSoon = await NewCase(c, dueLocal: local.ToString("yyyy-MM-ddTHH:mm"));
        var esc = await e.Create("/escalations", new
        {
            clientId = c, title = "Outage letter (fictional)", direction = "Received", channel = "FormalLetter", priority = "Critical", level = 2,
            counterpart = new { name = "Fictional Director", email = "director@example.com" },
            receivedAt = DateTimeOffset.UtcNow.AddHours(-6), ownerUserId = e.UserId, responseDueAt = DateTimeOffset.UtcNow.AddHours(-1), resolutionDueAt = DateTimeOffset.UtcNow.AddDays(2), caseId = dueSoon
        });
        await m.Create($"/environments/{env}/conditions", new { condition = "Unavailable", reason = "Database down (fictional)", evidence = "Monitoring screenshot", observedAt = DateTimeOffset.UtcNow.AddMinutes(-10) });

        var cc = (await m.Get($"/dashboard/command-center?clientId={c}&period=today")).Body!;
        Assert.Equal(1, cc["cases"]!["risk"]!["approaching"]!.GetValue<int>());
        Assert.True(cc["cases"]!["openedInPeriod"]!.GetValue<int>() >= 1);
        var es = cc["escalations"]!;
        Assert.Equal(1, es["active"]!.GetValue<int>());
        Assert.Equal(1, es["overdue"]!.GetValue<int>());
        Assert.Equal(2, es["highestLevel"]!.GetValue<int>());
        Assert.Equal(1, es["response"]!["measured"]!.GetValue<int>());
        Assert.Equal(0, es["response"]!["met"]!.GetValue<int>());
        Assert.Equal(0, es["resolution"]!["measured"]!.GetValue<int>()); // still running: not counted either way
        var att = es["attention"]!.AsArray().Single()!;
        Assert.Equal("response", att["missed"]!.GetValue<string>());
        Assert.Equal(dueSoon, att["caseId"]!.GetValue<long>());
        var envRow = cc["environments"]!.AsArray().Single()!;
        Assert.Equal("Unavailable", envRow["condition"]!.GetValue<string>());

        // The action queue: each item has a severity; the new kinds appear with the right one.
        var actions = (await m.Get($"/dashboard/actions?clientId={c}")).Body!["items"]!.AsArray();
        string Sev(string cat) => actions.First(a => a!["category"]!.GetValue<string>() == cat)!["severity"]!.GetValue<string>();
        Assert.Equal("High", Sev("CaseDueSoon"));
        Assert.Equal("Critical", Sev("EscalationOverdue"));
        Assert.Equal("Critical", Sev("EnvironmentCondition"));
        Assert.Equal("High", actions.First(a => a!["category"]!.GetValue<string>() == "CaseDueSoon")!["priority"]!.GetValue<string>());
        Assert.All(actions, a => Assert.Contains(a!["severity"]!.GetValue<string>(), new[] { "Critical", "High", "Medium", "Low" }));
        Assert.Equal(HttpStatusCode.OK, (await m.Get($"/cases?due=24h&clientId={c}")).Status);
        Assert.Single((await m.Get($"/cases?due=24h&clientId={c}")).Body!["items"]!.AsArray());

        // Acknowledging late still counts as a missed response target; "my work" narrows to the owner.
        var mine = (await e.Get($"/dashboard/command-center?clientId={c}&ownerId={e.UserId}")).Body!;
        Assert.Equal(1, mine["escalations"]!["active"]!.GetValue<int>());
        var others = (await m.Get($"/dashboard/command-center?clientId={c}&ownerId={m.UserId}")).Body!;
        Assert.Equal(0, others["escalations"]!["active"]!.GetValue<int>());
        Assert.NotNull(esc);
    }
}
