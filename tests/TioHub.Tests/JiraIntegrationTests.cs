using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Jira;
using TioHub.Api.Modules.Work;

namespace TioHub.Tests;

/// <summary>An in-memory Jira. It is the only Jira these tests can reach, and its results are not evidence that a real site works.</summary>
public sealed class FakeJira : IJiraApiClient
{
    public readonly List<JiraIssue> Issues = [];
    public readonly Dictionary<string, List<JiraCommentInfo>> Comments = [];
    public readonly Dictionary<string, List<JiraChangeItem>> Changes = [];
    public List<JiraProject> Projects = [new("100", "TAH", "Tahakom"), new("200", "MOB", "Mobile Platform"), new("300", "OPS", "Operations")];
    public readonly List<string> Jql = [];
    public bool FailComments;
    public bool FailAuth;

    public Task<string?> GetCloudIdAsync(string siteUrl, CancellationToken ct) => Task.FromResult<string?>("cloud-1");
    public Task<JiraMyself> GetMyselfAsync(JiraAuth auth, CancellationToken ct) =>
        FailAuth ? throw new JiraApiException(HttpStatusCode.Unauthorized, "Jira refused the credentials (401).") : Task.FromResult(new JiraMyself("svc", "Service", "UTC"));
    public Task<IReadOnlyList<JiraProject>> GetProjectsAsync(JiraAuth auth, CancellationToken ct) => Task.FromResult<IReadOnlyList<JiraProject>>(Projects);
    public Task<IReadOnlyList<JiraStatusInfo>> GetProjectStatusesAsync(JiraAuth auth, string projectId, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<JiraStatusInfo>>([new("1", "To Do", "new"), new("3", "In Progress", "indeterminate"), new("9", "Done", "done")]);
    public Task<IReadOnlyList<JiraField>> GetFieldsAsync(JiraAuth auth, CancellationToken ct) => Task.FromResult<IReadOnlyList<JiraField>>([new("customfield_1", "Program")]);
    public Task<JiraSearchPage> SearchAsync(JiraAuth auth, string jql, IReadOnlyCollection<string> extraFields, string? nextPageToken, int maxResults, CancellationToken ct)
    {
        Jql.Add(jql);
        var key = jql.Split('"')[1];
        return Task.FromResult(new JiraSearchPage(Issues.Where(i => i.ProjectKey == key).OrderBy(i => i.UpdatedAt).ToList(), null));
    }
    public Task<JiraIssue?> GetIssueAsync(JiraAuth auth, string issueId, IReadOnlyCollection<string> extraFields, CancellationToken ct) => Task.FromResult(Issues.FirstOrDefault(i => i.Id == issueId));
    public Task<IReadOnlyList<JiraCommentInfo>> GetCommentsAsync(JiraAuth auth, string issueId, CancellationToken ct) =>
        FailComments ? throw new JiraApiException(HttpStatusCode.InternalServerError, "Jira answered with an error (500).") : Task.FromResult<IReadOnlyList<JiraCommentInfo>>(Comments.GetValueOrDefault(issueId) ?? []);
    public Task<IReadOnlyList<JiraChangeItem>> GetChangelogAsync(JiraAuth auth, string issueId, CancellationToken ct) => Task.FromResult<IReadOnlyList<JiraChangeItem>>(Changes.GetValueOrDefault(issueId) ?? []);

    private int _clock;
    public JiraIssue Add(string id, string key, string projectId = "100", string projectKey = "TAH", string? statusId = null, string? statusName = null, string? category = null, string? assigneeId = null, string? assigneeName = null, string summary = "Imported issue", string? priority = "P3 - Normal")
    {
        var i = new JiraIssue(id, key, projectId, projectKey, summary, "Description text", statusId, statusName, category, priority, "Task", assigneeId, assigneeName, "Reporter", DateTimeOffset.UtcNow.AddDays(-30), DateTimeOffset.UtcNow.AddMinutes(-60 + _clock++), null, null, [], [], new Dictionary<string, string> { ["customfield_1"] = "MOI-DP" }, 0);
        Issues.RemoveAll(x => x.Id == id);
        Issues.Add(i);
        return i;
    }
    public void Change(string id, Func<JiraIssue, JiraIssue> f)
    {
        var i = Issues.Single(x => x.Id == id);
        Issues.Remove(i);
        Issues.Add(f(i) with { UpdatedAt = DateTimeOffset.UtcNow });
    }
}

/// <summary>
/// A76 against real SQL Server, the real case rules and a fake Jira. Each test uses its own client and Jira site, because one fresh database serves the class.
/// These are SQL-gated like the rest of the suite: they create and drop their own test database.
/// </summary>
public sealed class JiraIntegrationTests : IAsyncLifetime
{
    private readonly HubFactory _hub = new();
    private readonly FakeJira _jira = new();
    private int _site;

    public Task InitializeAsync()
    {
        _hub.ExtraServices = s => { s.RemoveAll<IJiraApiClient>(); s.AddSingleton<IJiraApiClient>(_jira); };
        return _hub.InitializeAsync();
    }
    public Task DisposeAsync() => _hub.DisposeAsync();

    private sealed record Fixture(long ConnectionId, long ClientId, long SpaceId, long TeamId);

    private async Task<long> ConnectionAsync()
    {
        var admin = await _hub.As(HubFactory.Manager);
        var id = await admin.Create("/admin/jira-connections", new { name = $"Poliscan {++_site}", siteUrl = $"https://site{_site}.atlassian.net", authMode = "ApiTokenBasic", accountEmail = "svc@example.org", apiToken = "very-secret-api-token-value" });
        await admin.Ok($"/admin/jira-connections/{id}/discover");
        return id;
    }

    private async Task<long> TeamAsync()
    {
        using var scope = _hub.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<HubDbContext>().Teams.Where(t => t.Code == "OPS").Select(t => t.Id).FirstAsync();
    }

    private async Task<Fixture> SetUpAsync(string clientCode = "DEMO-NTA", string projectId = "100", bool enable = true, long? connection = null)
    {
        var admin = await _hub.As(HubFactory.Manager);
        var conn = connection ?? await ConnectionAsync();
        var client = await _hub.ClientId(clientCode);
        var team = await TeamAsync();
        var added = await admin.Post($"/clients/{client}/jira/spaces", new { jiraConnectionId = conn, jiraProjectIds = new[] { projectId } });
        Assert.True(added.Status == HttpStatusCode.OK, added.Text);
        var dto = (await admin.Get($"/clients/{client}/jira")).Body!;
        var space = dto["spaces"]!.AsArray().First(s => s!["jiraProjectId"]!.GetValue<string>() == projectId && s["jiraConnectionId"]!.GetValue<long>() == conn)!["id"]!.GetValue<long>();
        if (enable)
        {
            await admin.Ok($"/clients/{client}/jira/preview");
            var type = await CaseTypeAsync();
            var version = (await admin.Get($"/clients/{client}/jira")).Body!["settings"]!["version"]!.GetValue<string>();
            var put = await admin.Put($"/clients/{client}/jira", new { isEnabled = true, jiraConnectionId = conn, defaultResponsibleTeamId = team, defaultCaseType = type, defaultPriority = "Normal", nextReviewHours = 48, importDoneIssues = false, syncOnStartup = false, fullReconciliation = true, fullReconciliationDays = 7, syncIntervalMinutes = 15 }, version);
            Assert.True(put.Status == HttpStatusCode.NoContent, put.Text);
        }
        return new Fixture(conn, client, space, team);
    }

    private async Task<string> CaseTypeAsync()
    {
        using var scope = _hub.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<HubDbContext>().LookupValues.Where(l => l.ListName == TioHub.Api.Modules.Admin.LookupLists.CaseType && !l.IsRetired).Select(l => l.Code).FirstAsync();
    }

    private async Task<JiraSyncRun> RunAsync(long spaceId)
    {
        using var scope = _hub.Services.CreateScope();
        var run = await scope.ServiceProvider.GetRequiredService<JiraSyncService>().RunSpaceAsync(spaceId, JiraSyncTrigger.Manual, CancellationToken.None);
        Assert.NotNull(run);
        return run!;
    }

    private async Task<T> Db<T>(Func<HubDbContext, Task<T>> read)
    {
        using var scope = _hub.Services.CreateScope();
        return await read(scope.ServiceProvider.GetRequiredService<HubDbContext>());
    }

    private Task<Case?> CaseOfAsync(long connection, string issueId) => Db(db => db.JiraCaseMappings.IgnoreQueryFilters().Where(m => m.JiraConnectionId == connection && m.JiraIssueId == issueId).Select(m => m.Case).FirstOrDefaultAsync());
    private Task<int> OpenIssuesAsync(JiraIssueType type, long connection) => Db(db => db.JiraIntegrationIssues.IgnoreQueryFilters().CountAsync(i => i.Type == type && i.Status == JiraIssueStatus.Open && i.JiraConnectionId == connection));

    private async Task MapStatusAsync(long connection, string statusId, string target)
    {
        var admin = await _hub.As(HubFactory.Manager);
        await admin.Ok($"/admin/jira-connections/{connection}/statuses/discover");
        var rows = (await admin.Get($"/admin/jira-connections/{connection}/statuses")).Body!["rows"]!.AsArray();
        foreach (var r in rows.Where(r => r!["jiraStatusId"]!.GetValue<string>() == statusId))
            Assert.Equal(HttpStatusCode.NoContent, (await admin.Put($"/admin/jira-status-mappings/{r!["id"]!.GetValue<long>()}", new { targetStatus = target })).Status);
    }

    private async Task MapUserAsync(long connection, string account, long tioUserId)
    {
        var admin = await _hub.As(HubFactory.Manager);
        var row = (await admin.Get($"/admin/jira-connections/{connection}/users")).Body!.AsArray().First(u => u!["jiraAccountId"]!.GetValue<string>() == account);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Put($"/admin/jira-user-mappings/{row!["id"]!.GetValue<long>()}", new { tioUserId })).Status);
    }

    [Fact]
    public async Task Credentials_go_in_and_never_come_out()
    {
        var conn = await ConnectionAsync();
        var admin = await _hub.As(HubFactory.Manager);
        var list = await admin.Get("/admin/jira-connections");
        Assert.DoesNotContain("very-secret-api-token-value", list.Text);
        Assert.True(list.Body!["connections"]![0]!["credential"]!["hasToken"]!.GetValue<bool>());
        var (stored, audit) = await Db(async db => (await db.JiraCredentials.Select(c => c.Ciphertext).FirstAsync(), await db.AuditEntries.Where(a => a.EntityType.StartsWith("Jira")).Select(a => a.Changes ?? "").ToListAsync()));
        Assert.DoesNotContain("very-secret-api-token-value", stored); // encrypted at rest
        Assert.All(audit, c => Assert.DoesNotContain("very-secret-api-token-value", c));
        Assert.DoesNotContain(stored, string.Join(' ', audit));
        var bad = await admin.Post("/admin/jira-connections", new { name = "Internal", siteUrl = "https://intranet.example.org", authMode = "ApiTokenBasic", accountEmail = "a@example.org", apiToken = "x" });
        Assert.NotNull(bad.Error("siteUrl"));
        Assert.Equal(conn, list.Body["connections"]![0]!["id"]!.GetValue<long>());
    }

    [Fact]
    public async Task Connection_test_reports_each_step_and_a_failure_is_safe()
    {
        var conn = await ConnectionAsync();
        var admin = await _hub.As(HubFactory.Manager);
        var ok = await admin.Post($"/admin/jira-connections/{conn}/test");
        Assert.True(ok.Body!["ok"]!.GetValue<bool>(), ok.Text);
        Assert.Equal(4, ok.Body["steps"]!.AsArray().Count);
        _jira.FailAuth = true;
        var failed = await admin.Post($"/admin/jira-connections/{conn}/test");
        _jira.FailAuth = false;
        Assert.False(failed.Body!["ok"]!.GetValue<bool>());
        Assert.DoesNotContain("very-secret", failed.Text);
    }

    [Fact]
    public async Task Discovery_never_assigns_a_space()
    {
        var conn = await ConnectionAsync();
        Assert.Equal(3, await Db(db => db.JiraDiscoveredSpaces.CountAsync(s => s.JiraConnectionId == conn)));
        Assert.Equal(0, await Db(db => db.ClientJiraSpaces.IgnoreQueryFilters().CountAsync(s => s.JiraConnectionId == conn)));
    }

    [Fact]
    public async Task Integration_screens_need_the_integrations_right()
    {
        var engineer = await _hub.As(HubFactory.Engineer);
        Assert.Equal(HttpStatusCode.Forbidden, (await engineer.Get("/admin/jira-connections")).Status);
        Assert.Equal(HttpStatusCode.Forbidden, (await engineer.Post("/admin/jira-connections", new { name = "x" })).Status);
    }

    [Fact]
    public async Task One_client_can_have_several_spaces_but_a_space_has_one_client()
    {
        var a = await SetUpAsync("DEMO-NTA", "100", enable: false);
        var admin = await _hub.As(HubFactory.Manager);
        Assert.Equal(HttpStatusCode.OK, (await admin.Post($"/clients/{a.ClientId}/jira/spaces", new { jiraConnectionId = a.ConnectionId, jiraProjectIds = new[] { "200" } })).Status);
        Assert.Equal(2, (await admin.Get($"/clients/{a.ClientId}/jira")).Body!["spaces"]!.AsArray().Count);
        var other = await _hub.ClientId("DEMO-HCP");
        var refused = await admin.Post($"/clients/{other}/jira/spaces", new { jiraConnectionId = a.ConnectionId, jiraProjectIds = new[] { "100", "300" } });
        Assert.Contains("TAH is already assigned", refused.Error("jiraProjectIds"));
        // All or nothing: the free space of the same selection was not assigned.
        Assert.Equal(0, await Db(db => db.ClientJiraSpaces.IgnoreQueryFilters().CountAsync(s => s.ClientId == other)));
        // The database itself refuses a second active owner.
        await Assert.ThrowsAsync<DbUpdateException>(() => Db(async db =>
        {
            db.ClientJiraSpaces.Add(new ClientJiraSpace { ClientId = other, JiraConnectionId = a.ConnectionId, JiraProjectId = "100", ProjectKey = "TAH", ProjectName = "Tahakom" });
            return await db.SaveChangesAsync();
        }));
    }

    [Fact]
    public async Task Multiple_connections_can_use_the_same_project_id()
    {
        var a = await SetUpAsync("DEMO-NTA", "100", enable: false);
        var b = await SetUpAsync("DEMO-HCP", "100", enable: false);
        Assert.NotEqual(a.ConnectionId, b.ConnectionId);
        Assert.Equal(2, await Db(db => db.ClientJiraSpaces.IgnoreQueryFilters().CountAsync(s => s.JiraProjectId == "100" && s.ReleasedAt == null)));
    }

    [Fact]
    public async Task A_new_role_grant_is_needed_before_a_client_jira_page_opens()
    {
        var a = await SetUpAsync("DEMO-NTA", "100", enable: false);
        var viewer = await _hub.As(HubFactory.Viewer);
        var nta = a.ClientId;
        Assert.Equal(HttpStatusCode.Forbidden, (await viewer.Get($"/clients/{nta}/jira")).Status);
    }

    [Fact]
    public async Task Synchronization_cannot_be_enabled_before_a_dry_run()
    {
        var f = await SetUpAsync(enable: false);
        var admin = await _hub.As(HubFactory.Manager);
        var r = await admin.Put($"/clients/{f.ClientId}/jira", new { isEnabled = true, jiraConnectionId = f.ConnectionId, defaultResponsibleTeamId = f.TeamId, defaultCaseType = await CaseTypeAsync(), importDoneIssues = false, syncOnStartup = false, fullReconciliation = true });
        Assert.Contains("Preview", r.Error("isEnabled"));
    }

    [Fact]
    public async Task The_dry_run_changes_nothing_and_classifies_like_the_import()
    {
        var f = await SetUpAsync(enable: false);
        _jira.Add("1", "TAH-1", statusId: "9", statusName: "Done", category: "done");
        _jira.Add("2", "TAH-2", statusId: "1", statusName: "To Do", category: "new", assigneeId: "acc-1", assigneeName: "Sam");
        var cases = await Db(db => db.Cases.IgnoreQueryFilters().CountAsync());
        var issues = await Db(db => db.JiraIntegrationIssues.IgnoreQueryFilters().CountAsync());
        var admin = await _hub.As(HubFactory.Manager);
        var version = (await admin.Get($"/clients/{f.ClientId}/jira")).Body!["settings"];
        Assert.Null(version);
        await admin.Put($"/clients/{f.ClientId}/jira", new { isEnabled = false, jiraConnectionId = f.ConnectionId, defaultResponsibleTeamId = f.TeamId, defaultCaseType = await CaseTypeAsync(), importDoneIssues = false, syncOnStartup = false, fullReconciliation = true });
        var p = (await admin.Post($"/clients/{f.ClientId}/jira/preview")).Body!;
        Assert.Equal(2, p["totalIssues"]!.GetValue<int>());
        Assert.Equal(1, p["newCases"]!.GetValue<int>());
        Assert.Equal(1, p["skippedDone"]!.GetValue<int>());
        Assert.Equal(1, p["missingUserMappings"]!.GetValue<int>());
        Assert.Equal(1, p["missingWorkflowMappings"]!.GetValue<int>());
        Assert.Equal(cases, await Db(db => db.Cases.IgnoreQueryFilters().CountAsync()));
        Assert.Equal(issues, await Db(db => db.JiraIntegrationIssues.IgnoreQueryFilters().CountAsync()));
        Assert.Equal(0, await Db(db => db.JiraCaseMappings.IgnoreQueryFilters().CountAsync(m => m.JiraConnectionId == f.ConnectionId)));
        Assert.Equal(0, await Db(db => db.JiraUserMappings.CountAsync(m => m.JiraConnectionId == f.ConnectionId)));
    }

    [Fact]
    public async Task An_issue_becomes_a_real_case_with_a_source_reference_and_no_contract()
    {
        var f = await SetUpAsync();
        _jira.Add("10", "TAH-10", summary: "Centralized Multiclient");
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(JiraSyncType.Initial, run.Type);
        Assert.Equal(JiraSyncStatus.Success, run.Status);
        Assert.Equal(1, run.CasesCreated);
        var c = await CaseOfAsync(f.ConnectionId, "10");
        Assert.Equal("Centralized Multiclient", c!.Title);
        Assert.Equal(f.ClientId, c.ClientId);
        Assert.Equal(f.TeamId, c.ResponsibleTeamId);
        Assert.Equal(CaseStatus.New, c.Status);
        Assert.Null(c.ContractId);
        Assert.Equal(SlaState.NotApplicable, c.ResponseSlaStatus);
        Assert.Equal(SlaState.NotApplicable, c.ResolutionSlaStatus);
        var manager = await _hub.As(HubFactory.Manager);
        var dto = (await manager.Get($"/cases/{c.Id}")).Body!;
        Assert.Equal("TAH-10", dto["jiraSource"]!["issueKey"]!.GetValue<string>());
        Assert.Equal("ImportedSource", dto["jiraReferences"]![0]!["origin"]!.GetValue<string>());
        var list = (await manager.Get($"/cases?clientId={f.ClientId}&jiraSource=synchronized&jiraSpace=TAH")).Body!;
        Assert.Equal(1, list["totalCount"]!.GetValue<int>());
        Assert.Equal("TAH-10", list["items"]![0]!["jiraSourceKey"]!.GetValue<string>());
    }

    [Fact]
    public async Task Running_twice_creates_nothing_new()
    {
        var f = await SetUpAsync();
        _jira.Add("20", "TAH-20");
        _jira.Comments["20"] = [new("c1", "acc", "Sam", "First comment", DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddHours(-1), null, null)];
        await RunAsync(f.SpaceId);
        var second = await RunAsync(f.SpaceId);
        Assert.Equal(0, second.CasesCreated);
        Assert.Equal(0, second.CommentsImported);
        Assert.Equal(1, await Db(db => db.JiraCaseMappings.IgnoreQueryFilters().CountAsync(m => m.JiraConnectionId == f.ConnectionId)));
        Assert.Equal(1, await Db(db => db.JiraComments.CountAsync(c => c.JiraConnectionId == f.ConnectionId)));
    }

    [Fact]
    public async Task Other_clients_issues_never_land_on_a_client()
    {
        var f = await SetUpAsync();
        _jira.Add("30", "MOB-30", projectId: "200", projectKey: "MOB");
        await RunAsync(f.SpaceId);
        Assert.Null(await CaseOfAsync(f.ConnectionId, "30"));
    }

    [Fact]
    public async Task An_existing_manual_reference_is_offered_for_adoption_instead_of_a_duplicate()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var existing = await CaseWithReferenceAsync(f, "TAH-2355");
        _jira.Add("40", "TAH-2355", assigneeId: null);
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.DuplicateCaseCandidate, f.ConnectionId));
        Assert.Null(await CaseOfAsync(f.ConnectionId, "40"));

        var issue = (await manager.Get($"/admin/jira-issues?status=Open&type=DuplicateCaseCandidate&connectionId={f.ConnectionId}")).Body!["items"]![0]!;
        Assert.Equal(existing, issue["candidate"]!["id"]!.GetValue<long>());
        Assert.Contains("Adopt", issue["actions"]!.AsArray().Select(a => a!.GetValue<string>()));
        var noReason = await manager.Post($"/admin/jira-issues/{issue["id"]!.GetValue<long>()}/resolve", new { action = "Adopt" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, noReason.Status);
        await manager.Ok($"/admin/jira-issues/{issue["id"]!.GetValue<long>()}/resolve", new { action = "Adopt", note = "Same request" });

        var after = await RunAsync(f.SpaceId);
        Assert.Equal(JiraSyncType.FullReconciliation, after.Type);
        Assert.Equal(0, after.CasesCreated);
        Assert.Equal(existing, (await CaseOfAsync(f.ConnectionId, "40"))!.Id);
        var dto = (await manager.Get($"/cases/{existing}")).Body!;
        var references = dto["jiraReferences"]!.AsArray();
        Assert.Single(references); // not duplicated
        Assert.Equal("AdoptedSource", references[0]!["origin"]!.GetValue<string>());
        Assert.Equal("Track the customer issue", references[0]!["reuseReason"]!.GetValue<string>()); // the manual reference stays
    }

    [Fact]
    public async Task Two_cases_with_the_same_reference_wait_for_a_person()
    {
        var f = await SetUpAsync();
        await CaseWithReferenceAsync(f, "TAH-50");
        await CaseWithReferenceAsync(f, "TAH-50");
        _jira.Add("50", "TAH-50");
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        var row = await Db(db => db.JiraIntegrationIssues.IgnoreQueryFilters().FirstAsync(i => i.JiraIssueId == "50" && i.JiraConnectionId == f.ConnectionId));
        Assert.Contains("2 cases", row.Description);
    }

    [Fact]
    public async Task Matching_titles_alone_never_link_a_case()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        await manager.Create("/cases", new { title = "Same title", type = await CaseTypeAsync(), scope = "Client", clientId = f.ClientId, responsibleTeamId = f.TeamId, impactSummary = "x", priority = "Normal", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
        _jira.Add("55", "TAH-55", summary: "Same title");
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(1, run.CasesCreated);
    }

    [Fact]
    public async Task A_reference_on_another_clients_case_is_a_conflict_and_creates_nothing()
    {
        var f = await SetUpAsync("DEMO-NTA");
        var other = await SetUpAsync("DEMO-HCP", "200", enable: false, connection: f.ConnectionId);
        await CaseWithReferenceAsync(other, "TAH-60");
        _jira.Add("60", "TAH-60");
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.ClientOwnershipConflict, f.ConnectionId));
    }

    private async Task<long> CaseWithReferenceAsync(Fixture f, string key)
    {
        var manager = await _hub.As(HubFactory.Manager);
        var site = await Db(db => db.JiraConnections.Where(c => c.Id == f.ConnectionId).Select(c => new { c.SiteUrl, c.JiraInstanceId }).FirstAsync());
        var id = await manager.Create("/cases", new { title = "Existing case", type = await CaseTypeAsync(), scope = "Client", clientId = f.ClientId, responsibleTeamId = f.TeamId, impactSummary = "x", priority = "High", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1) });
        // The instance's approved host follows the site under test, so the manual reference passes its existing validation.
        await Db(async db => { var i = await db.JiraInstances.FirstAsync(x => x.Id == site.JiraInstanceId); i.ApprovedHost = new Uri(site.SiteUrl).Host; return await db.SaveChangesAsync(); });
        await manager.Create($"/cases/{id}/jira", new { jiraInstanceId = site.JiraInstanceId, issueKey = key, url = $"{site.SiteUrl}/browse/{key}", reuseReason = "Track the customer issue" });
        return id;
    }

    [Fact]
    public async Task An_unknown_status_changes_nothing_until_it_is_mapped()
    {
        var f = await SetUpAsync();
        _jira.Add("70", "TAH-70", statusId: "1", statusName: "To Do", category: "new");
        await RunAsync(f.SpaceId);
        Assert.Equal(CaseStatus.New, (await CaseOfAsync(f.ConnectionId, "70"))!.Status);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.UnknownWorkflowStatus, f.ConnectionId));
        await MapStatusAsync(f.ConnectionId, "1", "Triaged");
        await RunAsync(f.SpaceId);
        Assert.Equal(CaseStatus.Triaged, (await CaseOfAsync(f.ConnectionId, "70"))!.Status);
        Assert.Equal(0, await OpenIssuesAsync(JiraIssueType.UnknownWorkflowStatus, f.ConnectionId));
    }

    [Fact]
    public async Task Status_follows_jira_through_legal_steps_and_records_the_timeline()
    {
        var f = await SetUpAsync();
        var owner = await _hub.UserId(HubFactory.Engineer);
        _jira.Add("80", "TAH-80", statusId: "3", statusName: "In Progress", category: "indeterminate", assigneeId: "acc-80", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await MapUserAsync(f.ConnectionId, "acc-80", owner);
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "80");
        Assert.Equal(CaseStatus.InProgress, c!.Status);
        Assert.Equal(owner, c.OwnerUserId);
        var events = await Db(db => db.CaseEvents.Where(e => e.CaseId == c.Id).Select(e => e.Type).ToListAsync());
        Assert.Contains(CaseEventType.Triaged, events);
        Assert.Contains(CaseEventType.Started, events);
        Assert.Contains(CaseEventType.OwnerChanged, events);
    }

    [Fact]
    public async Task No_owner_blocks_in_progress_and_retries_without_a_new_jira_change()
    {
        var f = await SetUpAsync();
        _jira.Add("85", "TAH-85", statusId: "3", statusName: "In Progress", category: "indeterminate");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "85");
        Assert.Equal(CaseStatus.Triaged, c!.Status); // WRK-04 holds for the synchronization too
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.WorkflowTransitionBlocked, f.ConnectionId));
        var manager = await _hub.As(HubFactory.Manager);
        var owner = await _hub.UserId(HubFactory.Engineer);
        await manager.Ok($"/cases/{c.Id}/assign", new { ownerUserId = owner, reason = "Taking it" }, await manager.Version($"/cases/{c.Id}"));
        await RunAsync(f.SpaceId);
        Assert.Equal(CaseStatus.InProgress, (await CaseOfAsync(f.ConnectionId, "85"))!.Status);
        Assert.Equal(0, await OpenIssuesAsync(JiraIssueType.WorkflowTransitionBlocked, f.ConnectionId));
    }

    [Fact]
    public async Task Done_in_jira_never_closes_a_case_and_closed_cannot_be_mapped()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        await manager.Ok($"/admin/jira-connections/{f.ConnectionId}/statuses/discover");
        var row = (await manager.Get($"/admin/jira-connections/{f.ConnectionId}/statuses")).Body!["rows"]!.AsArray().First(r => r!["jiraStatusId"]!.GetValue<string>() == "9");
        var refused = await manager.Put($"/admin/jira-status-mappings/{row!["id"]!.GetValue<long>()}", new { targetStatus = "Closed" });
        Assert.Contains("evidence", refused.Error("targetStatus"));
        Assert.NotNull((await manager.Put($"/admin/jira-status-mappings/{row["id"]!.GetValue<long>()}", new { targetStatus = "Cancelled" })).Error("targetStatus"));
    }

    [Fact]
    public async Task A_closed_case_stays_closed_and_is_flagged()
    {
        var f = await SetUpAsync();
        var owner = await _hub.UserId(HubFactory.Engineer);
        _jira.Add("90", "TAH-90", statusId: "3", statusName: "In Progress", category: "indeterminate", assigneeId: "acc-90", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await MapUserAsync(f.ConnectionId, "acc-90", owner);
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "90");
        var manager = await _hub.As(HubFactory.Manager);
        await manager.Ok($"/cases/{c!.Id}/request-validation", new { progressSummary = "Done", validationRequest = "Check" }, await manager.Version($"/cases/{c.Id}"));
        await manager.Ok($"/cases/{c.Id}/close", new { outcome = "Done", validationEvidence = "Checked" }, await manager.Version($"/cases/{c.Id}"));
        _jira.Change("90", i => i with { StatusId = "1", StatusName = "To Do" });
        await MapStatusAsync(f.ConnectionId, "1", "InProgress");
        await RunAsync(f.SpaceId);
        Assert.Equal(CaseStatus.Closed, (await CaseOfAsync(f.ConnectionId, "90"))!.Status);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.WorkflowTransitionBlocked, f.ConnectionId));
    }

    [Fact]
    public async Task A_new_assignee_changes_only_the_owner_and_never_a_fallback()
    {
        var f = await SetUpAsync();
        _jira.Add("100", "TAH-100", assigneeId: "acc-100", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "100");
        Assert.Null(c!.OwnerUserId); // unmapped: no random fallback
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.MissingUserMapping, f.ConnectionId));

        var manager = await _hub.As(HubFactory.Manager);
        var backup = await _hub.UserId(HubFactory.Engineer2);
        await manager.Ok($"/cases/{c.Id}/assign", new { ownerUserId = (long?)null, backupOwnerUserId = backup, reason = "Backup" }, await manager.Version($"/cases/{c.Id}"));
        var before = await CaseOfAsync(f.ConnectionId, "100");

        var owner = await _hub.UserId(HubFactory.Engineer);
        await MapUserAsync(f.ConnectionId, "acc-100", owner);
        await RunAsync(f.SpaceId);
        var after = await CaseOfAsync(f.ConnectionId, "100");
        Assert.Equal(owner, after!.OwnerUserId);
        Assert.Equal(backup, after.BackupOwnerUserId);
        Assert.Equal(before!.ResponsibleTeamId, after.ResponsibleTeamId);
        Assert.Equal(before.CoordinatorUserId, after.CoordinatorUserId);
        Assert.Equal(before.ResponsibleParty, after.ResponsibleParty);
        Assert.Equal(0, await OpenIssuesAsync(JiraIssueType.MissingUserMapping, f.ConnectionId));
        Assert.True((await manager.Get($"/cases/{c.Id}")).Body!["jiraSource"]!["ownerFromJira"]!.GetValue<bool>());
    }

    [Fact]
    public async Task The_backup_owner_cannot_become_owner_through_jira()
    {
        var f = await SetUpAsync();
        _jira.Add("105", "TAH-105");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "105");
        var manager = await _hub.As(HubFactory.Manager);
        var person = await _hub.UserId(HubFactory.Engineer);
        await manager.Ok($"/cases/{c!.Id}/assign", new { ownerUserId = (long?)null, backupOwnerUserId = person, reason = "Backup" }, await manager.Version($"/cases/{c.Id}"));
        _jira.Change("105", i => i with { AssigneeId = "acc-105", AssigneeName = "Same person" });
        await RunAsync(f.SpaceId);
        await MapUserAsync(f.ConnectionId, "acc-105", person);
        await RunAsync(f.SpaceId);
        Assert.Null((await CaseOfAsync(f.ConnectionId, "105"))!.OwnerUserId);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.MissingUserMapping, f.ConnectionId));
    }

    [Fact]
    public async Task Jira_priority_never_changes_the_case_priority()
    {
        var f = await SetUpAsync();
        _jira.Add("110", "TAH-110", priority: "P1 - Critical");
        await RunAsync(f.SpaceId);
        Assert.Equal(Priority.Normal, (await CaseOfAsync(f.ConnectionId, "110"))!.Priority);
        var manager = await _hub.As(HubFactory.Manager);
        var id = (await CaseOfAsync(f.ConnectionId, "110"))!.Id;
        Assert.Equal("P1 - Critical", (await manager.Get($"/cases/{id}")).Body!["jiraSource"]!["priority"]!.GetValue<string>());
        _jira.Change("110", i => i with { PriorityName = "P4 - Low" });
        await RunAsync(f.SpaceId);
        Assert.Equal(Priority.Normal, (await CaseOfAsync(f.ConnectionId, "110"))!.Priority);
    }

    [Fact]
    public async Task Imported_comments_are_never_a_first_response_or_progress()
    {
        var f = await SetUpAsync();
        _jira.Add("120", "TAH-120");
        _jira.Comments["120"] = [new("c120", "acc", "Sam", "We answered the customer", DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddHours(-1), null, null)];
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "120");
        Assert.Null(c!.FirstResponseAt);
        Assert.Null(c.ProgressSummary);
        Assert.Null(c.ResolvedAt);
        Assert.DoesNotContain(CaseEventType.Progress, await Db(db => db.CaseEvents.Where(e => e.CaseId == c.Id).Select(e => e.Type).ToListAsync()));
    }

    [Fact]
    public async Task A_contract_linked_later_is_measured_from_the_hub_case_not_from_jira_history()
    {
        var f = await SetUpAsync();
        _jira.Add("125", "TAH-125"); // created 30 days earlier in Jira
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "125");
        Assert.True(c!.CreatedAt > DateTimeOffset.UtcNow.AddHours(-1));
        Assert.Equal(SlaState.NotApplicable, c.ResolutionSlaStatus);
        Assert.Null(c.PenaltyTermsSnapshotJson);
        Assert.NotEqual(0, await Db(db => db.JiraCaseMappings.IgnoreQueryFilters().Where(m => m.CaseId == c.Id).Select(m => m.JiraCreatedAt!.Value < DateTimeOffset.UtcNow.AddDays(-1) ? 1 : 0).FirstAsync()));
    }

    [Fact]
    public async Task Comments_are_imported_once_edits_replace_them_and_deletions_are_kept_out_of_the_timeline()
    {
        var f = await SetUpAsync();
        var created = DateTimeOffset.UtcNow.AddHours(-2);
        _jira.Add("130", "TAH-130");
        _jira.Comments["130"] = [new("c1", "a", "Sam", "Original", created, created, null, null), new("c2", "a", "Sam", "Removed later", created, created, null, null)];
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "130");
        _jira.Comments["130"] = [new("c1", "a", "Sam", "Edited", created, DateTimeOffset.UtcNow, null, null)];
        _jira.Change("130", i => i);
        await RunAsync(f.SpaceId);
        var manager = await _hub.As(HubFactory.Manager);
        var items = (await manager.Get($"/cases/{c!.Id}/activity?filter=jiraComments")).Body!["items"]!.AsArray();
        Assert.Single(items);
        Assert.Equal("Edited", items[0]!["body"]!.GetValue<string>());
        Assert.True(items[0]!["edited"]!.GetValue<bool>());
    }

    [Fact]
    public async Task Restricted_comment_text_is_only_returned_to_coordinators()
    {
        var f = await SetUpAsync();
        var now = DateTimeOffset.UtcNow.AddHours(-1);
        _jira.Add("140", "TAH-140");
        _jira.Comments["140"] = [new("c140", "a", "Sam", "Internal only text", now, now, "role", "Administrators")];
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "140");
        var manager = await _hub.As(HubFactory.Manager);
        Assert.Contains("Internal only text", (await manager.Get($"/cases/{c!.Id}/activity")).Text);
        var engineer = await _hub.As(HubFactory.Engineer);
        var seen = await engineer.Get($"/cases/{c.Id}/activity");
        Assert.Equal(HttpStatusCode.OK, seen.Status);
        Assert.DoesNotContain("Internal only text", seen.Text);
        Assert.True(seen.Body!["items"]!.AsArray().First(i => i!["kind"]!.GetValue<string>() == "JiraComment")!["restricted"]!.GetValue<bool>());
    }

    [Fact]
    public async Task A_comment_that_looks_like_a_credential_is_not_stored()
    {
        var f = await SetUpAsync();
        var now = DateTimeOffset.UtcNow.AddHours(-1);
        _jira.Add("145", "TAH-145");
        _jira.Comments["145"] = [new("c145", "a", "Sam", "password: hunter2hunter2", now, now, null, null)];
        await RunAsync(f.SpaceId);
        var row = await Db(db => db.JiraComments.FirstAsync(c => c.JiraCommentId == "c145" && c.JiraConnectionId == f.ConnectionId));
        Assert.True(row.Withheld);
        Assert.Equal("", row.BodyText);
    }

    [Fact]
    public async Task Activity_is_imported_once_and_kept_apart_by_source()
    {
        var f = await SetUpAsync();
        _jira.Add("150", "TAH-150");
        _jira.Changes["150"] = [new("h1:0", "Sam", DateTimeOffset.UtcNow.AddHours(-2), "status", "1", "To Do", "3", "In Progress"), new("h1:1", "Sam", DateTimeOffset.UtcNow.AddHours(-2), "assignee", null, "A", null, "B"), new("h2:0", "Sam", DateTimeOffset.UtcNow.AddHours(-1), "description", null, "x", null, "y")];
        var first = await RunAsync(f.SpaceId);
        Assert.Equal(2, first.ActivitiesImported); // the description is not a relevant change
        _jira.Change("150", i => i);
        Assert.Equal(0, (await RunAsync(f.SpaceId)).ActivitiesImported);
        var c = await CaseOfAsync(f.ConnectionId, "150");
        var manager = await _hub.As(HubFactory.Manager);
        var workflow = (await manager.Get($"/cases/{c!.Id}/activity?filter=workflow")).Body!["items"]!.AsArray();
        Assert.Contains(workflow, i => i!["source"]!.GetValue<string>() == "Jira" && i["to"]!.GetValue<string>() == "In Progress");
        var assignments = (await manager.Get($"/cases/{c.Id}/activity?filter=assignments")).Body!["items"]!.AsArray();
        Assert.Contains(assignments, i => i!["kind"]!.GetValue<string>() == "JiraAssignment");
    }

    [Fact]
    public async Task A_tio_comment_stays_local_and_makes_no_jira_request()
    {
        var f = await SetUpAsync();
        _jira.Add("160", "TAH-160");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "160");
        var engineer = await _hub.As(HubFactory.Engineer);
        var requests = _jira.Jql.Count;
        await engineer.Create($"/cases/{c!.Id}/comments", new { body = "Customer informed" });
        Assert.Equal(requests, _jira.Jql.Count);
        var items = (await engineer.Get($"/cases/{c.Id}/activity?filter=tioComments")).Body!["items"]!.AsArray();
        Assert.Equal("Customer informed", items.Single()!["body"]!.GetValue<string>());
        Assert.Equal("TIO", items.Single()!["source"]!.GetValue<string>());
        Assert.Equal("Local only", items.Single()!["reference"]!.GetValue<string>());
        Assert.Null((await CaseOfAsync(f.ConnectionId, "160"))!.FirstResponseAt);
        Assert.NotNull((await engineer.Post($"/cases/{c.Id}/comments", new { body = "password: hunter2hunter2" })).Error("body"));
    }

    [Fact]
    public async Task A_source_reference_cannot_be_removed_but_a_manual_one_can()
    {
        var f = await SetUpAsync();
        _jira.Add("170", "TAH-170");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "170");
        var manager = await _hub.As(HubFactory.Manager);
        var refId = (await manager.Get($"/cases/{c!.Id}")).Body!["jiraReferences"]![0]!["id"]!.GetValue<long>();
        var refused = await manager.Post($"/cases/{c.Id}/jira/{refId}/remove", new { reason = "Tidy up" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, refused.Status);
    }

    [Fact]
    public async Task A_deleted_case_is_not_imported_again()
    {
        var f = await SetUpAsync();
        _jira.Add("180", "TAH-180");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "180");
        var manager = await _hub.As(HubFactory.Manager);
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Send(HttpMethod.Delete, $"/cases/{c!.Id}")).Status);
        _jira.Change("180", i => i);
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        Assert.Null(await CaseOfAsync(f.ConnectionId, "180"));
    }

    [Fact]
    public async Task A_failed_comment_import_is_retried_and_the_checkpoint_waits()
    {
        var f = await SetUpAsync();
        _jira.Add("190", "TAH-190");
        _jira.Comments["190"] = [new("c190", "a", "Sam", "Hello", DateTimeOffset.UtcNow.AddHours(-1), DateTimeOffset.UtcNow.AddHours(-1), null, null)];
        _jira.FailComments = true;
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(JiraSyncStatus.Warning, run.Status);
        Assert.Equal(1, run.FailedRecords);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.FailedCommentImport, f.ConnectionId));
        Assert.Null(await Db(db => db.JiraSpaceSyncStates.Where(s => s.ClientJiraSpaceId == f.SpaceId).Select(s => s.IssueCheckpoint).FirstAsync()));
        _jira.FailComments = false;
        var retry = await RunAsync(f.SpaceId);
        Assert.Equal(1, retry.CommentsImported);
        Assert.Equal(JiraSyncStatus.Success, retry.Status);
        Assert.Equal(0, await OpenIssuesAsync(JiraIssueType.FailedCommentImport, f.ConnectionId));
    }

    [Fact]
    public async Task A_refused_connection_fails_the_run_without_touching_cases_and_records_why()
    {
        var f = await SetUpAsync();
        _jira.Add("195", "TAH-195");
        _jira.FailAuth = true;
        var run = await RunAsync(f.SpaceId);
        _jira.FailAuth = false;
        Assert.Equal(JiraSyncStatus.Failed, run.Status);
        Assert.Contains("401", run.Error);
        Assert.Null(await CaseOfAsync(f.ConnectionId, "195"));
        Assert.Equal(1, await Db(db => db.JiraSpaceSyncStates.Where(s => s.ClientJiraSpaceId == f.SpaceId).Select(s => s.ConsecutiveFailures).FirstAsync()));
        Assert.Equal(JiraSyncStatus.Success, (await RunAsync(f.SpaceId)).Status);
    }

    [Fact]
    public async Task A_lease_held_by_another_server_stops_a_second_run()
    {
        var f = await SetUpAsync();
        await RunAsync(f.SpaceId);
        await Db(db => db.JiraSpaceSyncStates.Where(s => s.ClientJiraSpaceId == f.SpaceId).ExecuteUpdateAsync(u => u.SetProperty(s => s.LeaseOwner, "other").SetProperty(s => s.LeaseUntil, DateTimeOffset.UtcNow.AddMinutes(10))));
        using var scope = _hub.Services.CreateScope();
        Assert.Null(await scope.ServiceProvider.GetRequiredService<JiraSyncService>().RunSpaceAsync(f.SpaceId, JiraSyncTrigger.Schedule, CancellationToken.None));
    }

    [Fact]
    public async Task An_issue_moved_to_another_clients_space_is_flagged_and_its_case_stays()
    {
        var f = await SetUpAsync("DEMO-NTA", "100");
        var other = await SetUpAsync("DEMO-HCP", "200", connection: f.ConnectionId);
        _jira.Add("200", "TAH-200");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "200");
        _jira.Change("200", i => i with { Key = "MOB-7", ProjectId = "200", ProjectKey = "MOB" });
        var run = await RunAsync(other.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.IssueMovedBetweenSpaces, f.ConnectionId));
        Assert.Equal(f.ClientId, (await Db(db => db.Cases.IgnoreQueryFilters().FirstAsync(x => x.Id == c!.Id))).ClientId);
    }

    [Fact]
    public async Task Reassigning_a_space_keeps_existing_cases_with_their_client()
    {
        var f = await SetUpAsync("DEMO-NTA", "100");
        _jira.Add("210", "TAH-210");
        await RunAsync(f.SpaceId);
        var other = await _hub.ClientId("DEMO-HCP");
        var manager = await _hub.As(HubFactory.Manager);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, (await manager.Post($"/admin/jira-connections/{f.ConnectionId}/spaces/100/reassign", new { toClientId = other })).Status);
        await manager.Ok($"/admin/jira-connections/{f.ConnectionId}/spaces/100/reassign", new { toClientId = other, reason = "Contract moved" });
        Assert.Equal(f.ClientId, (await CaseOfAsync(f.ConnectionId, "210"))!.ClientId);
        Assert.Equal(1, await Db(db => db.ClientJiraSpaces.IgnoreQueryFilters().CountAsync(s => s.JiraConnectionId == f.ConnectionId && s.JiraProjectId == "100" && s.ReleasedAt == null && s.ClientId == other)));
    }

    [Fact]
    public async Task A_client_without_the_required_defaults_gets_a_review_item_not_a_guess()
    {
        var f = await SetUpAsync(enable: false);
        await Db(async db => { db.ClientJiraSettings.Add(new ClientJiraSettings { ClientId = f.ClientId, IsEnabled = true, JiraConnectionId = f.ConnectionId }); return await db.SaveChangesAsync(); });
        _jira.Add("220", "TAH-220");
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.MissingCaseInformation, f.ConnectionId));
    }

    [Fact]
    public async Task Done_issues_are_not_imported_as_open_cases_by_default()
    {
        var f = await SetUpAsync();
        _jira.Add("230", "TAH-230", statusId: "9", statusName: "Done", category: "done");
        var run = await RunAsync(f.SpaceId);
        Assert.Equal(0, run.CasesCreated);
        Assert.Null(await CaseOfAsync(f.ConnectionId, "230"));
    }

    [Fact]
    public async Task Manual_sync_is_refused_while_the_feature_flag_is_off()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        Assert.Equal(HttpStatusCode.Conflict, (await manager.Post($"/clients/{f.ClientId}/jira/sync")).Status);
    }

    [Fact]
    public async Task The_due_list_honours_every_switch()
    {
        var f = await SetUpAsync();
        using (var s1 = _hub.Services.CreateScope())
            Assert.Contains(f.SpaceId, await s1.ServiceProvider.GetRequiredService<JiraSyncService>().DueSpacesAsync(false, CancellationToken.None));
        await RunAsync(f.SpaceId);
        using (var s2 = _hub.Services.CreateScope())
            Assert.DoesNotContain(f.SpaceId, await s2.ServiceProvider.GetRequiredService<JiraSyncService>().DueSpacesAsync(false, CancellationToken.None));
        var manager = await _hub.As(HubFactory.Manager);
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}", new { enabled = false })).Status);
        using var s3 = _hub.Services.CreateScope();
        Assert.Null(await s3.ServiceProvider.GetRequiredService<JiraSyncService>().RunSpaceAsync(f.SpaceId, JiraSyncTrigger.Manual, CancellationToken.None));
    }

    [Fact]
    public async Task An_edit_by_a_person_during_sync_keeps_its_etag_when_nothing_changed_for_the_case()
    {
        var f = await SetUpAsync();
        _jira.Add("240", "TAH-240");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "240");
        var manager = await _hub.As(HubFactory.Manager);
        var etag = await manager.Version($"/cases/{c!.Id}");
        _jira.Change("240", i => i with { Summary = "Changed in Jira", PriorityName = "P1" });
        await RunAsync(f.SpaceId);
        Assert.Equal(etag, await manager.Version($"/cases/{c.Id}")); // external values live outside the case row
        var dto = (await manager.Get($"/cases/{c.Id}")).Body!;
        Assert.Equal("Imported issue", dto["title"]!.GetValue<string>());
        Assert.Equal("Changed in Jira", dto["jiraSource"]!["summary"]!.GetValue<string>());
    }
}
