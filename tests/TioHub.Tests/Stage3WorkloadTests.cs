using System.Net;
using System.Text.Json.Nodes;

namespace TioHub.Tests;

[Collection("hub")]
public class Stage3WorkloadTests(HubFactory hub) : Scenario(hub)
{
    private static Task<long> User(Api m, string name) => m.Create("/admin/users", new
    {
        accountName = $@"DEV\{U("workload-user")}", displayName = name, workingTimeZone = "UTC", roles = new[] { "Engineer" }
    });

    private static Task<long> NewTeam(Api m, string name) => m.Create("/teams", new { code = U("WLT"), name, isActive = true });

    private static Task<long> Case(Api m, long client, long team, long? owner, long? contract = null) => m.Create("/cases", new
    {
        title = U("Workload case"), type = "Incident", scope = "Client", clientId = client, contractId = contract, responsibleTeamId = team,
        ownerUserId = owner, impactSummary = "Workload regression", priority = "Normal", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
    });

    private static Task<long> Commitment(Api m, long client, long? team, long owner, bool overdue = false) => m.Create("/commitments", new
    {
        scope = "Client", clientId = client, responsibleTeamId = team, ownerUserId = owner, description = U("Workload commitment"), type = "Delivery",
        dueLocal = DateTime.UtcNow.AddDays(overdue ? -1 : 1).ToString("yyyy-MM-ddTHH:mm:ss"), timeZone = "UTC"
    });

    private static async Task<JsonNode> Workload(Api m, long client, long? team = null)
    {
        var result = await m.Post("/reports/team-workload/preview", new { filters = new { clientId = client.ToString(), teamId = team?.ToString() }, pageSize = 100 });
        Assert.Equal(HttpStatusCode.OK, result.Status);
        return result.Body!;
    }

    private static string Metric(JsonNode report, string label) => report["summary"]!.AsArray().Single(x => x!["label"]!.GetValue<string>() == label)!["value"]!.GetValue<string>();

    [Fact]
    public async Task Same_named_teams_and_owners_keep_separate_workload_rows_and_team_totals()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var teamA = await NewTeam(m, "Shared team name");
        var teamB = await NewTeam(m, "Shared team name");
        var ownerA = await User(m, "Shared owner name");
        var ownerB = await User(m, "Shared owner name");
        await Case(m, client, teamA, ownerA);
        await Case(m, client, teamA, ownerB);
        await Case(m, client, teamA, ownerB);
        await Case(m, client, teamB, ownerA);
        await Commitment(m, client, teamA, ownerA);
        await Commitment(m, client, teamB, ownerA);

        var report = await Workload(m, client);
        Assert.Equal(3, report["total"]!.GetValue<int>());
        var rows = report["rows"]!.AsArray();
        Assert.Equal(3, rows.Count);
        Assert.Equal(new[] { 1, 1, 2 }, rows.Select(x => x![2]!.GetValue<int>()).Order().ToArray());
        Assert.Equal("4", Metric(report, "Open cases"));
        Assert.Equal("2", Metric(report, "Open commitments"));
        Assert.Equal("3", Metric(report, "Average per owner")); // Six items divided by two user identities.

        var byTeam = report["breakdowns"]!.AsArray().Single(x => x!["title"]!.GetValue<string>() == "By team")!["rows"]!.AsArray();
        Assert.Equal(2, byTeam.Count);
        Assert.Equal(new[] { 1, 3 }, byTeam.Select(x => x![1]!.GetValue<int>()).Order().ToArray());
        Assert.All(byTeam, row => Assert.Equal(1, row![4]!.GetValue<int>()));
        Assert.Equal(2, (await Workload(m, client, teamA))["total"]!.GetValue<int>());
        Assert.Equal(1, (await Workload(m, client, teamB))["total"]!.GetValue<int>());
        var performance = (await m.Post("/reports/commitment-performance/preview", new { filters = new { clientId = client.ToString() } })).Body!;
        var commitmentTeams = performance["breakdowns"]!.AsArray().Single(x => x!["title"]!.GetValue<string>() == "By team")!["rows"]!.AsArray();
        Assert.Equal(2, commitmentTeams.Count);
        Assert.All(commitmentTeams, row => Assert.Equal(1, row![1]!.GetValue<int>()));
        var aging = (await m.Post("/reports/case-aging/preview", new { filters = new { clientId = client.ToString() } })).Body!;
        var agingOwners = aging["breakdowns"]!.AsArray().Single(x => x!["title"]!.GetValue<string>() == "By owner")!["rows"]!.AsArray();
        Assert.Equal(2, agingOwners.Count);
        Assert.All(agingOwners, row => Assert.Equal(2, row![1]!.GetValue<int>()));
    }

    [Fact]
    public async Task Owner_average_counts_a_person_once_across_teams_and_uses_identity_for_unassigned_work()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        Assert.Equal("Not available", Metric(await Workload(m, client), "Average per owner"));
        var teamA = await NewTeam(m, U("Team A"));
        var teamB = await NewTeam(m, U("Team B"));
        var owner = await User(m, "Unassigned"); // A display name must not act as an ownership sentinel.
        await Case(m, client, teamA, owner);
        await Case(m, client, teamB, owner);
        await Commitment(m, client, teamA, owner);
        await Commitment(m, client, teamB, owner);
        await Case(m, client, teamB, null);
        var cancelled = await Case(m, client, teamA, owner);
        await m.Ok($"/cases/{cancelled}/cancel", new { reason = "Excluded from open workload" }, await m.Version($"/cases/{cancelled}"));
        var cancelledCommitment = await Commitment(m, client, teamA, owner);
        await m.Ok($"/commitments/{cancelledCommitment}/cancel", new { reason = "Excluded from open workload" }, await m.Version($"/commitments/{cancelledCommitment}"));

        var report = await Workload(m, client);
        Assert.Equal("3", Metric(report, "Open cases"));
        Assert.Equal("2", Metric(report, "Open commitments"));
        Assert.Equal("1", Metric(report, "Unassigned cases"));
        Assert.Equal("4", Metric(report, "Average per owner")); // Four assigned items, one person, two teams.
        Assert.Equal(3, report["total"]!.GetValue<int>());
        var aging = (await m.Post("/reports/case-aging/preview", new { filters = new { clientId = client.ToString() } })).Body!;
        Assert.Equal("1", Metric(aging, "Unassigned"));
        Assert.Equal(2, aging["breakdowns"]!.AsArray().Single(x => x!["title"]!.GetValue<string>() == "By owner")!["rows"]!.AsArray().Count);
    }

    [Fact]
    public async Task Assignment_counters_follow_the_commitments_responsible_team_instead_of_owner_memberships()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var teamA = await NewTeam(m, U("Accountable A"));
        var teamB = await NewTeam(m, U("Accountable B"));
        var member = await User(m, U("Member"));
        var nonmember = await User(m, U("Nonmember"));
        await m.Create($"/teams/{teamA}/members", new { userId = member, isActive = true });
        await m.Create($"/teams/{teamB}/members", new { userId = member, isActive = true });
        await Case(m, client, teamA, member);
        await Case(m, client, teamB, member);
        var nonmemberCase = await Case(m, client, teamA, nonmember);
        await Commitment(m, client, teamA, member);
        await Commitment(m, client, teamB, member, overdue: true);
        await Commitment(m, client, null, member, overdue: true);
        await Commitment(m, client, teamA, nonmember);

        var a = (await m.Get($"/teams/{teamA}/assignments")).Body!;
        var b = (await m.Get($"/teams/{teamB}/assignments")).Body!;
        var personA = Assert.Single(a["people"]!.AsArray())!;
        var personB = Assert.Single(b["people"]!.AsArray())!;
        Assert.Equal(1, personA["openCases"]!.GetValue<int>());
        Assert.Equal(1, personB["openCases"]!.GetValue<int>());
        Assert.Equal(1, personA["openCommitments"]!.GetValue<int>());
        Assert.Equal(1, personB["openCommitments"]!.GetValue<int>());
        Assert.Equal(0, personA["overdue"]!.GetValue<int>());
        Assert.Equal(1, personB["overdue"]!.GetValue<int>());
        Assert.Contains(a["cases"]!.AsArray(), row => row!["id"]!.GetValue<long>() == nonmemberCase);

        // Nonmember work remains in the responsible team's report without being attributed to a different member.
        var reportA = await Workload(m, client, teamA);
        Assert.Equal("2", Metric(reportA, "Open commitments"));
        Assert.Equal("2", Metric(reportA, "Open cases"));
        Assert.Equal("1", Metric(await Workload(m, client, teamB), "Open commitments"));
        Assert.Equal("4", Metric(await Workload(m, client), "Open commitments")); // Includes the independent, no-team promise once.
    }

    [Fact]
    public async Task Sla_summary_does_not_label_contract_linkage_as_successful_measurement()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var team = await NewTeam(m, U("SLA team"));
        var project = await m.Create("/projects", new { clientId = client, code = U("SLAPRJ"), name = "Missing targets", ownerUserId = m.UserId, status = "Active" });
        var contract = await m.Create("/contracts", new { clientId = client, projectId = project, title = "Targets not recorded", type = "SlaSupport", status = "Active", ownerUserId = m.UserId });
        await Case(m, client, team, null, contract);
        var result = await m.Post("/reports/sla-compliance/preview", new { filters = new { clientId = client.ToString() } });
        Assert.Equal(HttpStatusCode.OK, result.Status);
        Assert.Equal("1", Metric(result.Body!, "Contract-linked cases"));
        Assert.Equal("1", Metric(result.Body!, "Not measurable"));
        Assert.Equal("Not available", Metric(result.Body!, "Response compliance"));
        Assert.DoesNotContain(result.Body!["summary"]!.AsArray(), row => row!["label"]!.GetValue<string>() == "Cases measured");
    }

    [Fact]
    public async Task Sla_breakdowns_do_not_merge_distinct_teams_or_owners_with_identical_labels()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        var teamA = await NewTeam(m, "Shared SLA team");
        var teamB = await NewTeam(m, "Shared SLA team");
        var ownerA = await User(m, "Shared SLA owner");
        var ownerB = await User(m, "Shared SLA owner");
        var project = await m.Create("/projects", new { clientId = client, code = U("SLAGROUP"), name = "SLA identity grouping", ownerUserId = m.UserId, status = "Active" });
        var contract = await m.Create("/contracts", new { clientId = client, projectId = project, title = "SLA grouping", type = "SlaSupport", status = "Active", ownerUserId = m.UserId });
        await Case(m, client, teamA, ownerA, contract);
        await Case(m, client, teamB, ownerB, contract);
        await Case(m, client, teamB, ownerB, contract);
        var result = await m.Post("/reports/sla-compliance/preview", new { filters = new { clientId = client.ToString() } });
        Assert.Equal(HttpStatusCode.OK, result.Status);
        Assert.Equal("3", Metric(result.Body!, "Contract-linked cases"));
        foreach (var title in new[] { "By team", "By owner" })
        {
            var rows = result.Body!["breakdowns"]!.AsArray().Single(x => x!["title"]!.GetValue<string>() == title)!["rows"]!.AsArray();
            Assert.Equal(2, rows.Count);
            Assert.Equal(new[] { 1, 2 }, rows.Select(row => row![1]!.GetValue<int>()).Order().ToArray());
        }
    }
}
