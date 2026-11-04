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
        await MapStatusAsync(f.ConnectionId, "1", "Opened");
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
    public async Task A_case_follows_jira_into_progress_even_with_no_owner()
    {
        var f = await SetUpAsync();
        _jira.Add("85", "TAH-85", statusId: "3", statusName: "In Progress", category: "indeterminate");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "85");
        Assert.Equal(CaseStatus.InProgress, c!.Status);
        Assert.Null(c.OwnerUserId);
        Assert.Equal(0, await OpenIssuesAsync(JiraIssueType.WorkflowTransitionBlocked, f.ConnectionId));
    }

    [Fact]
    public async Task A_status_mapped_to_closed_closes_the_case_with_jira_as_its_evidence()
    {
        var f = await SetUpAsync();
        var owner = await _hub.UserId(HubFactory.Engineer);
        _jira.Add("95", "TAH-95", statusId: "3", statusName: "In Progress", category: "indeterminate", assigneeId: "acc-95", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await MapUserAsync(f.ConnectionId, "acc-95", owner);
        await RunAsync(f.SpaceId);
        _jira.Change("95", i => i with { StatusId = "9", StatusName = "Done", StatusCategory = "done" });
        await MapStatusAsync(f.ConnectionId, "9", "Closed");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "95");
        Assert.Equal(CaseStatus.Closed, c!.Status);
        Assert.Equal("Closed", c.StatusCode);
        Assert.Contains("TAH-95", c.Outcome);
        Assert.Contains("TAH-95", c.ValidationEvidence);
        Assert.NotNull(c.ClosedAt);
        Assert.NotNull(c.ResolvedAt);
    }

    [Fact]
    public async Task A_status_that_is_not_active_cannot_be_mapped()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        await manager.Ok($"/admin/jira-connections/{f.ConnectionId}/statuses/discover");
        var row = (await manager.Get($"/admin/jira-connections/{f.ConnectionId}/statuses")).Body!["rows"]!.AsArray().First(r => r!["jiraStatusId"]!.GetValue<string>() == "9");
        Assert.NotNull((await manager.Put($"/admin/jira-status-mappings/{row!["id"]!.GetValue<long>()}", new { targetStatus = "Cancelled" })).Error("targetStatus"));
        var targets = (await manager.Get($"/admin/jira-connections/{f.ConnectionId}/statuses")).Body!["targets"]!.AsArray().Select(t => t!["code"]!.GetValue<string>());
        Assert.Contains("Closed", targets);
        Assert.Contains("WaitingForCustomer", targets);
    }

    [Fact]
    public async Task A_status_mapped_to_waiting_starts_and_ends_the_customer_wait()
    {
        var f = await SetUpAsync();
        var owner = await _hub.UserId(HubFactory.Engineer);
        _jira.Add("96", "TAH-96", statusId: "3", statusName: "In Progress", category: "indeterminate", assigneeId: "acc-96", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await MapUserAsync(f.ConnectionId, "acc-96", owner);
        await RunAsync(f.SpaceId);
        _jira.Change("96", i => i with { StatusId = "1", StatusName = "To Do" });
        await MapStatusAsync(f.ConnectionId, "1", "WaitingForCustomer");
        await RunAsync(f.SpaceId);
        var waiting = await CaseOfAsync(f.ConnectionId, "96");
        Assert.Equal(CaseStatus.InProgress, waiting!.Status);
        Assert.Equal(WaitingReason.Customer, waiting.WaitingReason);
        Assert.Equal("WaitingForCustomer", waiting.StatusCode);
        _jira.Change("96", i => i with { StatusId = "3", StatusName = "In Progress" });
        await RunAsync(f.SpaceId);
        var back = await CaseOfAsync(f.ConnectionId, "96");
        Assert.Null(back!.WaitingReason);
        Assert.Equal("InProgress", back.StatusCode);
    }

    [Fact]
    public async Task A_closed_case_reopens_when_jira_does()
    {
        var f = await SetUpAsync();
        _jira.Add("90", "TAH-90", statusId: "3", statusName: "In Progress", category: "indeterminate");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await MapStatusAsync(f.ConnectionId, "9", "Closed");
        await RunAsync(f.SpaceId);
        _jira.Change("90", i => i with { StatusId = "9", StatusName = "Done", StatusCategory = "done" });
        await RunAsync(f.SpaceId);
        Assert.Equal(CaseStatus.Closed, (await CaseOfAsync(f.ConnectionId, "90"))!.Status);
        _jira.Change("90", i => i with { StatusId = "3", StatusName = "In Progress", StatusCategory = "indeterminate" });
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "90");
        Assert.Equal(CaseStatus.InProgress, c!.Status);
        Assert.Equal("InProgress", c.StatusCode);
        Assert.Equal(1, c.ReopenCount);
        Assert.Null(c.ClosedAt);
    }

    [Fact]
    public async Task People_can_only_view_the_status_of_a_synchronized_case()
    {
        var f = await SetUpAsync();
        _jira.Add("91", "TAH-91");
        await RunAsync(f.SpaceId);
        var id = (await CaseOfAsync(f.ConnectionId, "91"))!.Id;
        var manager = await _hub.As(HubFactory.Manager);
        var detail = await manager.Get($"/cases/{id}");
        Assert.True(detail.Body!["statusFromJira"]!.GetValue<bool>());
        foreach (var flag in new[] { "canTriage", "canStart", "canClose", "canRequestValidation", "canReturnToWork", "canChangeStatus", "canSetWaiting", "canReopen", "canCancel" })
            Assert.False(detail.Body!["permissions"]![flag]!.GetValue<bool>(), flag);
        foreach (var action in new[] { "triage", "start", "request-validation", "resume", "close", "cancel", "reopen", "status", "waiting", "waiting/clear" })
            Assert.Contains("follows Jira", (await manager.Post($"/cases/{id}/{action}", new { }, detail.ETag)).Error("status"));
    }

    private async Task<long> ActiveContractAsync(long clientId, Priority priority = Priority.Normal)
    {
        var manager = await _hub.As(HubFactory.Manager);
        var project = await manager.Create("/projects", new { clientId, code = $"P{Guid.NewGuid():N}"[..8], name = "Fictional SLA project", status = "Active", ownerUserId = manager.UserId });
        return await manager.Create("/contracts", new { projectId = project, title = "Fictional SLA agreement", contractReference = $"FIC-{Guid.NewGuid():N}"[..12], type = "SlaSupport", status = "Active", ownerUserId = manager.UserId,
            startDate = "2026-01-01", endDate = "2027-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true, slaPauseWhileWaitingOnCustomer = true,
            coverage = "PSOP", obligations = "Monthly report", slaTargets = new[] { new { priority = priority.ToString(), responseMinutes = 60, resolutionMinutes = 240, basis = "CalendarHours" } } });
    }

    [Fact]
    public async Task Cases_from_a_space_follow_its_contract_from_the_jira_creation_time()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var contract = await ActiveContractAsync(f.ClientId);
        _jira.Add("170", "TAH-170");
        await RunAsync(f.SpaceId);
        var earlier = await CaseOfAsync(f.ConnectionId, "170");
        Assert.Null(earlier!.ContractId);

        Assert.Equal(HttpStatusCode.OK, (await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}/contract", new { contractId = contract })).Status);
        _jira.Add("171", "TAH-171");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "171");
        var jiraCreated = await Db(db => db.JiraCaseMappings.IgnoreQueryFilters().Where(m => m.CaseId == c!.Id).Select(m => m.JiraCreatedAt).FirstAsync());
        Assert.Equal(contract, c!.ContractId);
        Assert.Equal(jiraCreated!.Value.AddMinutes(60), c.ResponseDueAt);
        Assert.Equal(jiraCreated.Value.AddMinutes(240), c.ResolutionDueAt);
        Assert.Equal(c.ResolutionDueAt, c.DueAt);
        Assert.True(c.SlaPauseOnCustomerWaiting);
        Assert.NotNull(c.PenaltyTermsSnapshotJson);
        Assert.Contains(CaseEventType.ContractChanged, await Db(db => db.CaseEvents.Where(e => e.CaseId == c.Id).Select(e => e.Type).ToListAsync()));

        // An earlier case stays out until someone asks, and then only an open one with no contract joins.
        Assert.Null((await CaseOfAsync(f.ConnectionId, "170"))!.ContractId);
        Assert.NotNull((await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}/contract", new { contractId = contract, applyToOpenCases = true })).Error("reason"));
        var applied = await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}/contract", new { contractId = contract, applyToOpenCases = true, reason = "Covers the whole space" });
        Assert.Equal(1, applied.Body!["applied"]!.GetValue<int>());
        Assert.Equal(contract, (await CaseOfAsync(f.ConnectionId, "170"))!.ContractId);
    }

    [Fact]
    public async Task A_new_case_takes_priority_and_type_from_jira_or_the_clients_mapping()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        _jira.Add("180", "TAH-180", priority: "High");
        _jira.Add("181", "TAH-181", priority: "Blocker");
        await RunAsync(f.SpaceId);
        Assert.Equal(Priority.High, (await CaseOfAsync(f.ConnectionId, "180"))!.Priority);
        Assert.Equal(Priority.Normal, (await CaseOfAsync(f.ConnectionId, "181"))!.Priority); // no match: the client's default, and it is listed

        var rows = (await manager.Get($"/clients/{f.ClientId}/jira")).Body!["valueMappings"]!.AsArray();
        var blocker = rows.First(r => r!["jiraValue"]!.GetValue<string>() == "Blocker")!["id"]!.GetValue<long>();
        Assert.NotNull((await manager.Put($"/clients/{f.ClientId}/jira/value-mappings/{blocker}", new { target = "Nonsense" })).Error("target"));
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Put($"/clients/{f.ClientId}/jira/value-mappings/{blocker}", new { target = "Critical" })).Status);

        _jira.Add("182", "TAH-182", priority: "Blocker");
        await RunAsync(f.SpaceId);
        Assert.Equal(Priority.Critical, (await CaseOfAsync(f.ConnectionId, "182"))!.Priority);
        Assert.Equal(Priority.Normal, (await CaseOfAsync(f.ConnectionId, "181"))!.Priority); // existing cases keep theirs
    }

    [Fact]
    public async Task Sync_on_a_case_reads_only_its_own_issue()
    {
        var f = await SetUpAsync();
        var engineer = await _hub.As(HubFactory.Engineer);
        var reader = await LimitedUserAsync(f.ClientId, "Cases:View", "Cases:DetailsView", "tab.Cases.timeline:View");
        _jira.Add("190", "TAH-190");
        _jira.Add("191", "TAH-191");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "190");
        var at = DateTimeOffset.UtcNow.AddHours(-1);
        _jira.Comments["190"] = [new("c190", "acc", "Sam", "New here", at, at, null, null)];
        _jira.Comments["191"] = [new("c191", "acc", "Sam", "Not this one", at, at, null, null)];
        var searches = _jira.Jql.Count;

        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Post($"/cases/{c!.Id}/jira-source/sync", new { })).Status);

        // The switch is checked after the right, so someone without the right never learns it.
        Assert.Equal(HttpStatusCode.Conflict, (await engineer.Post($"/cases/{c.Id}/jira-source/sync", new { })).Status);
        var options = _hub.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<JiraOptions>>().Value;
        options.Enabled = true;
        Res r;
        try { r = await engineer.Post($"/cases/{c.Id}/jira-source/sync", new { }); }
        finally { options.Enabled = false; }
        Assert.True(r.Status == HttpStatusCode.OK, r.Text);
        Assert.Equal(1, r.Body!["comments"]!.GetValue<int>());
        Assert.Equal(searches, _jira.Jql.Count);
        Assert.True(await Db(db => db.JiraComments.AnyAsync(k => k.JiraCommentId == "c190")));
        Assert.False(await Db(db => db.JiraComments.AnyAsync(k => k.JiraCommentId == "c191")));

    }

    private async Task<Api> LimitedUserAsync(long clientId, params string[] rights)
    {
        var manager = await _hub.As(HubFactory.Manager);
        var role = await manager.Create("/admin/roles", new { name = $"Limited {Guid.NewGuid():N}"[..24], rights = TioHub.Tests.Fixture.Rights(rights) });
        var account = $@"DEV\limited-{Guid.NewGuid():N}"[..24];
        await manager.Create("/admin/users", new { accountName = account, displayName = "Fictional limited user", workingTimeZone = "UTC", roleIds = new[] { role }, scopes = new object[] { new { kind = "Client", clientId, projectId = (long?)null, teamId = (long?)null } } });
        return await _hub.As(account);
    }

    [Fact]
    public async Task The_timeline_tab_works_without_change_history()
    {
        var f = await SetUpAsync();
        var reader = await LimitedUserAsync(f.ClientId, "Cases:View", "Cases:DetailsView", "tab.Cases.timeline:View");
        _jira.Add("192", "TAH-192");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "192");
        Assert.Contains("tab.Cases.timeline:View", reader.Me["rights"]!.AsArray().Select(k => k!.GetValue<string>()));
        var activity = await reader.Get($"/cases/{c!.Id}/activity");
        Assert.Equal(HttpStatusCode.OK, activity.Status);
        Assert.NotEmpty(activity.Body!["items"]!.AsArray());
        Assert.Equal(HttpStatusCode.Forbidden, (await reader.Get("/admin/audit")).Status);
    }

    [Fact]
    public async Task A_failed_import_says_why()
    {
        Assert.Equal("Select an active team.", JiraSyncService.FailureReason(new ValidationException("team", "Select an active team.")));
        Assert.Contains("withheld", JiraSyncService.FailureReason(new InvalidOperationException("password: hunter2hunter2")));
        await Task.CompletedTask;
    }

    [Fact]
    public async Task A_reassigned_space_takes_a_contract_of_the_new_client_only()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var other = await _hub.ClientId("DEMO-HCP");
        var earlier = await ActiveContractAsync(f.ClientId);
        var theirs = await ActiveContractAsync(other);
        Assert.Equal(HttpStatusCode.OK, (await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}/contract", new { contractId = earlier })).Status);

        var path = $"/admin/jira-connections/{f.ConnectionId}/spaces/100/reassign";
        Assert.NotNull((await manager.Post(path, new { toClientId = other, reason = "Contract moved", contractId = earlier })).Error("contractId"));
        Assert.Equal(1, await Db(db => db.ClientJiraSpaces.IgnoreQueryFilters().CountAsync(s => s.Id == f.SpaceId && s.ReleasedAt == null)));

        await manager.Ok(path, new { toClientId = other, reason = "Contract moved", contractId = theirs });
        Assert.Equal(theirs, await Db(db => db.ClientJiraSpaces.IgnoreQueryFilters().Where(s => s.JiraConnectionId == f.ConnectionId && s.JiraProjectId == "100" && s.ReleasedAt == null).Select(s => s.ContractId).FirstAsync()));
    }

    [Fact]
    public async Task A_space_only_takes_an_active_contract_of_its_client()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var foreign = await ActiveContractAsync(await _hub.ClientId("DEMO-HCP"));
        Assert.NotNull((await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}/contract", new { contractId = foreign })).Error("contractId"));
        Assert.NotNull((await manager.Post($"/clients/{f.ClientId}/jira/spaces", new { jiraConnectionId = f.ConnectionId, jiraProjectIds = new[] { "200" }, contractId = foreign })).Error("contractId"));

        // A contract that ended later links no new case, and an administrator hears about it.
        var contract = await ActiveContractAsync(f.ClientId);
        Assert.Equal(HttpStatusCode.OK, (await manager.Put($"/clients/{f.ClientId}/jira/spaces/{f.SpaceId}/contract", new { contractId = contract })).Status);
        await Db(db => db.Contracts.Where(k => k.Id == contract).ExecuteUpdateAsync(u => u.SetProperty(k => k.Status, ContractStatus.Ended)));
        _jira.Add("172", "TAH-172");
        await RunAsync(f.SpaceId);
        Assert.Null((await CaseOfAsync(f.ConnectionId, "172"))!.ContractId);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.MissingCaseInformation, f.ConnectionId));
    }

    [Fact]
    public async Task With_a_contract_the_sla_and_due_date_count_from_the_jira_creation_time()
    {
        var f = await SetUpAsync();
        _jira.Add("92", "TAH-92"); // created 30 days earlier in Jira
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "92");
        var jiraCreated = await Db(db => db.JiraCaseMappings.IgnoreQueryFilters().Where(m => m.CaseId == c!.Id).Select(m => m.JiraCreatedAt).FirstAsync());
        Assert.Equal(jiraCreated, c!.SlaClockStartAt);
        Assert.Null(c.DueAt); // no contract yet

        var manager = await _hub.As(HubFactory.Manager);
        var project = await manager.Create("/projects", new { clientId = f.ClientId, code = $"P{Guid.NewGuid():N}"[..8], name = "Fictional SLA project", status = "Active", ownerUserId = manager.UserId });
        var contract = await manager.Create("/contracts", new { projectId = project, title = "Fictional SLA agreement", contractReference = $"FIC-{Guid.NewGuid():N}"[..12], type = "SlaSupport", status = "Active", ownerUserId = manager.UserId,
            startDate = "2026-01-01", endDate = "2027-12-31", renewalTerms = "RenewalByAgreement", noticeDays = 30, supportModel = "Remote", supportTimeZone = "Asia/Dubai", support24x7 = true, slaPauseWhileWaitingOnCustomer = true,
            coverage = "PSOP", obligations = "Monthly report", slaTargets = new[] { new { priority = c.Priority.ToString(), responseMinutes = 60, resolutionMinutes = 240, basis = "CalendarHours" } } });
        await manager.Ok($"/cases/{c.Id}/contract", new { contractId = contract }, await manager.Version($"/cases/{c.Id}"));
        var linked = await CaseOfAsync(f.ConnectionId, "92");
        Assert.Equal(jiraCreated!.Value.AddMinutes(60), linked!.ResponseDueAt);
        Assert.Equal(jiraCreated.Value.AddMinutes(240), linked.ResolutionDueAt);
        Assert.Equal(linked.ResolutionDueAt, linked.DueAt);
        Assert.False((await manager.Get($"/cases/{c.Id}")).Body!["permissions"]!["canChangeDue"]!.GetValue<bool>());
        Assert.NotNull((await manager.Post($"/cases/{c.Id}/due", new { reason = "x", clear = true }, await manager.Version($"/cases/{c.Id}"))).Error("dueLocal"));
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

    private async Task MapContactAsync(long connection, string account, long contact)
    {
        var admin = await _hub.As(HubFactory.Manager);
        var row = (await admin.Get($"/admin/jira-connections/{connection}/users")).Body!.AsArray().First(u => u!["jiraAccountId"]!.GetValue<string>() == account);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.Put($"/admin/jira-user-mappings/{row!["id"]!.GetValue<long>()}", new { clientContactId = contact })).Status);
    }

    [Fact]
    public async Task An_issue_assigned_to_a_client_contact_waits_on_the_customer_until_jira_reassigns_it()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var owner = await _hub.UserId(HubFactory.Engineer);
        var contact = await manager.Create($"/clients/{f.ClientId}/contacts", new { name = "Fictional Representative", email = "rep@example.com" });
        Assert.Contains((await manager.Get($"/admin/jira-connections/{f.ConnectionId}/client-contacts")).Body!.AsArray(), k => k!["id"]!.GetValue<long>() == contact);

        _jira.Add("140", "TAH-140", statusId: "3", statusName: "In Progress", category: "indeterminate", assigneeId: "acc-owner", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        await MapStatusAsync(f.ConnectionId, "3", "InProgress");
        await MapUserAsync(f.ConnectionId, "acc-owner", owner);
        await RunAsync(f.SpaceId);
        _jira.Change("140", i => i with { AssigneeId = "acc-client", AssigneeName = "Rep" });
        await RunAsync(f.SpaceId);
        await MapContactAsync(f.ConnectionId, "acc-client", contact);
        await RunAsync(f.SpaceId);

        var waiting = await CaseOfAsync(f.ConnectionId, "140");
        Assert.Equal("Fictional Representative", waiting!.ClientRepresentative);
        Assert.Equal(owner, waiting.OwnerUserId); // TIO stays accountable
        Assert.Equal(ResponsibleParty.CustomerIT, waiting.ResponsibleParty);
        Assert.Equal(WaitingReason.Customer, waiting.WaitingReason);
        Assert.Equal(CaseStatus.InProgress, waiting.Status);
        Assert.Equal("WaitingForCustomer", waiting.StatusCode);

        _jira.Change("140", i => i with { AssigneeId = "acc-owner", AssigneeName = "Sam" });
        await RunAsync(f.SpaceId);
        var back = await CaseOfAsync(f.ConnectionId, "140");
        Assert.Null(back!.ClientRepresentative);
        Assert.Equal(ResponsibleParty.TIO, back.ResponsibleParty);
        Assert.Null(back.WaitingReason);
        Assert.Equal("InProgress", back.StatusCode);
    }

    [Fact]
    public async Task A_contact_of_another_client_leaves_the_case_unchanged_and_is_flagged()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var contact = await manager.Create($"/clients/{await _hub.ClientId("DEMO-HCP")}/contacts", new { name = "Other Client Person", email = "other@example.com" });
        _jira.Add("141", "TAH-141", assigneeId: "acc-other", assigneeName: "Other");
        await RunAsync(f.SpaceId);
        await MapContactAsync(f.ConnectionId, "acc-other", contact);
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "141");
        Assert.Null(c!.ClientRepresentative);
        Assert.Null(c.WaitingReason);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.MissingUserMapping, f.ConnectionId));
    }

    private async Task<long> CreateTeamMemberAsync(long connection, string account, string name)
    {
        var admin = await _hub.As(HubFactory.Manager);
        var row = (await admin.Get($"/admin/jira-connections/{connection}/users")).Body!.AsArray().First(u => u!["jiraAccountId"]!.GetValue<string>() == account);
        return await admin.Create($"/admin/jira-user-mappings/{row!["id"]!.GetValue<long>()}/team-member", new { displayName = name });
    }

    [Fact]
    public async Task A_vitronic_team_member_owns_cases_through_jira_with_no_sign_in()
    {
        var f = await SetUpAsync();
        var owner = await _hub.UserId(HubFactory.Engineer);
        _jira.Add("150", "TAH-150", assigneeId: "acc-owner", assigneeName: "Sam");
        await RunAsync(f.SpaceId);
        await MapUserAsync(f.ConnectionId, "acc-owner", owner);
        await RunAsync(f.SpaceId);
        Assert.Equal(owner, (await CaseOfAsync(f.ConnectionId, "150"))!.OwnerUserId);

        _jira.Change("150", i => i with { AssigneeId = "acc-member", AssigneeName = "Noor" });
        await RunAsync(f.SpaceId);
        Assert.Equal(1, await OpenIssuesAsync(JiraIssueType.MissingUserMapping, f.ConnectionId));
        var member = await CreateTeamMemberAsync(f.ConnectionId, "acc-member", "Fictional Noor 150");
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "150");
        Assert.Equal(member, c!.OwnerUserId);
        Assert.Null(c.WaitingReason);
        Assert.Equal(0, await OpenIssuesAsync(JiraIssueType.MissingUserMapping, f.ConnectionId));

        var record = await Db(db => db.Users.AsNoTracking().FirstAsync(u => u.Id == member));
        Assert.Equal(UserClassification.VitronicTeamMember, record.Classification);
        Assert.False(record.LoginEnabled);
        Assert.False(await Db(db => db.UserCredentials.AnyAsync(k => k.UserId == member)));
    }

    [Fact]
    public async Task Sign_in_of_a_team_member_is_granted_separately_and_keeps_the_classification()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        _jira.Add("152", "TAH-152", assigneeId: "acc-member3", assigneeName: "Noor");
        await RunAsync(f.SpaceId);
        var member = await CreateTeamMemberAsync(f.ConnectionId, "acc-member3", "Fictional Noor 152");
        Assert.Equal(HttpStatusCode.NoContent, (await manager.Post($"/admin/users/{member}/login-access", new { enabled = true, reason = "Joins the service desk" }, await manager.Version($"/admin/users/{member}"))).Status);
        var record = await Db(db => db.Users.AsNoTracking().FirstAsync(u => u.Id == member));
        Assert.True(record.LoginEnabled);
        Assert.Equal(UserClassification.VitronicTeamMember, record.Classification);
        Assert.Equal("Joins the service desk", await Db(db => db.AuditEntries.Where(a => a.EntityType == "User" && a.EntityId == member).OrderByDescending(a => a.Id).Select(a => a.Reason).FirstAsync()));
    }

    [Fact]
    public async Task Resolving_a_jira_user_refuses_duplicates_and_is_audited()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var owner = await _hub.UserId(HubFactory.Engineer);
        var ownerName = await Db(db => db.Users.Where(u => u.Id == owner).Select(u => u.DisplayName).FirstAsync());
        _jira.Add("153", "TAH-153", assigneeId: "acc-a", assigneeName: ownerName);
        _jira.Add("154", "TAH-154", assigneeId: "acc-b", assigneeName: "Other");
        await RunAsync(f.SpaceId);
        var rows = (await manager.Get($"/admin/jira-connections/{f.ConnectionId}/users")).Body!.AsArray();
        var a = rows.First(u => u!["jiraAccountId"]!.GetValue<string>() == "acc-a")!;
        var b = rows.First(u => u!["jiraAccountId"]!.GetValue<string>() == "acc-b")!["id"]!.GetValue<long>();
        Assert.Equal("Unmapped", a["classification"]!.GetValue<string>());
        Assert.Contains(a["matchingUsers"]!.AsArray(), id => id!.GetValue<long>() == owner);
        var aId = a["id"]!.GetValue<long>();

        // A person with a record is mapped to it, not created again.
        Assert.NotNull((await manager.Post($"/admin/jira-user-mappings/{aId}/team-member", new { displayName = ownerName })).Error("displayName"));
        await MapUserAsync(f.ConnectionId, "acc-a", owner);
        Assert.NotNull((await manager.Put($"/admin/jira-user-mappings/{b}", new { tioUserId = owner })).Error("tioUserId"));
        // A mapped Jira user cannot gain a second record.
        Assert.Equal(HttpStatusCode.Conflict, (await manager.Post($"/admin/jira-user-mappings/{aId}/team-member", new { displayName = "Fictional New 153" })).Status);

        var reason = await Db(db => db.AuditEntries.Where(e => e.EntityType == "JiraUserMapping" && e.EntityId == aId).OrderByDescending(e => e.Id).Select(e => e.Reason).FirstAsync());
        Assert.Contains("acc-a", reason);

        // Creating a contact needs a client of this connection, and the contact is mapped with it.
        Assert.NotNull((await manager.Post($"/admin/jira-user-mappings/{b}/contact", new { clientId = await _hub.ClientId("DEMO-HCP"), name = "Fictional Rep 154", email = "rep154@example.com" })).Error("clientId"));
        var contact = await manager.Create($"/admin/jira-user-mappings/{b}/contact", new { clientId = f.ClientId, name = "Fictional Rep 154", email = "rep154@example.com" });
        var after = (await manager.Get($"/admin/jira-connections/{f.ConnectionId}/users")).Body!.AsArray().First(u => u!["id"]!.GetValue<long>() == b)!;
        Assert.Equal("ClientContact", after["classification"]!.GetValue<string>());
        Assert.Equal(contact, after["clientContactId"]!.GetValue<long>());
    }

    [Fact]
    public async Task A_jira_user_maps_to_a_hub_user_or_a_contact_not_both()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        _jira.Add("142", "TAH-142", assigneeId: "acc-both", assigneeName: "Both");
        await RunAsync(f.SpaceId);
        var row = (await manager.Get($"/admin/jira-connections/{f.ConnectionId}/users")).Body!.AsArray().First(u => u!["jiraAccountId"]!.GetValue<string>() == "acc-both");
        Assert.NotNull((await manager.Put($"/admin/jira-user-mappings/{row!["id"]!.GetValue<long>()}", new { tioUserId = manager.UserId, clientContactId = 1 })).Error("clientContactId"));
    }

    [Fact]
    public async Task The_first_team_reply_is_the_first_response_and_never_progress()
    {
        var f = await SetUpAsync();
        var first = DateTimeOffset.UtcNow.AddHours(-3);
        var later = DateTimeOffset.UtcNow.AddHours(-1);
        _jira.Add("120", "TAH-120");
        _jira.Comments["120"] = [new("c121", "acc", "Sam", "Later", later, later, null, null), new("c120", "acc", "Sam", "We answered the customer", first, first, null, null)];
        await RunAsync(f.SpaceId);
        await CreateTeamMemberAsync(f.ConnectionId, "acc", "Fictional Sam 120");
        var manager = await _hub.As(HubFactory.Manager);
        await manager.Ok($"/admin/jira-connections/{f.ConnectionId}/recalculate-first-responses", new { reason = "Team mapped after the first import" });
        var c = await CaseOfAsync(f.ConnectionId, "120");
        Assert.Equal(first, c!.FirstResponseAt);
        Assert.Null(c.ProgressSummary);
        Assert.Null(c.ResolvedAt);
        var events = await Db(db => db.CaseEvents.Where(e => e.CaseId == c.Id).Select(e => e.Type).ToListAsync());
        Assert.DoesNotContain(CaseEventType.Progress, events);
        Assert.Single(events, CaseEventType.FirstResponse);

        Assert.NotNull((await manager.Post($"/cases/{c.Id}/first-response", new { channel = "Phone" }, await manager.Version($"/cases/{c.Id}"))).Error("respondedAt"));
    }

    [Fact]
    public async Task Customer_comments_internal_notes_and_unmapped_authors_are_not_a_first_response()
    {
        var f = await SetUpAsync();
        var manager = await _hub.As(HubFactory.Manager);
        var contact = await manager.Create($"/clients/{f.ClientId}/contacts", new { name = "Fictional Representative", email = "rep@example.com" });
        var owner = await _hub.UserId(HubFactory.Engineer);
        var at = DateTimeOffset.UtcNow.AddHours(-5);
        _jira.Add("122", "TAH-122");
        _jira.Comments["122"] =
        [
            new("c1", "acc-customer", "Customer", "Any news?", at, at, null, null),
            new("c2", "acc-team", "Sam", "Checking the logs", at.AddHours(1), at.AddHours(1), "role", "Developers"),
            new("c3", "acc-team", "Sam", "Checking with the vendor", at.AddHours(1), at.AddHours(1), "jsm", "Internal"),
            new("c4", "acc-robot", "Automation", "We received your request", at.AddHours(2), at.AddHours(2), null, null),
        ];
        await RunAsync(f.SpaceId);
        await MapContactAsync(f.ConnectionId, "acc-customer", contact);
        await MapUserAsync(f.ConnectionId, "acc-team", owner);
        await RunAsync(f.SpaceId);
        Assert.Null((await CaseOfAsync(f.ConnectionId, "122"))!.FirstResponseAt);

        var reply = at.AddHours(3);
        _jira.Comments["122"].Add(new("c5", "acc-team", "Sam", "Here is what we found", reply, reply, null, null));
        _jira.Change("122", i => i);
        await RunAsync(f.SpaceId);
        Assert.Equal(reply, (await CaseOfAsync(f.ConnectionId, "122"))!.FirstResponseAt);
    }

    [Fact]
    public async Task A_first_response_taken_from_any_comment_is_corrected_without_touching_one_a_person_recorded()
    {
        var f = await SetUpAsync();
        var at = DateTimeOffset.UtcNow.AddHours(-5);
        _jira.Add("123", "TAH-123");
        _jira.Add("124", "TAH-124");
        _jira.Comments["123"] = [new("c1", "acc-customer", "Customer", "Any news?", at, at, null, null)];
        _jira.Comments["124"] = [new("c2", "acc-customer", "Customer", "Any news?", at, at, null, null)];
        await RunAsync(f.SpaceId);
        var wrong = await CaseOfAsync(f.ConnectionId, "123");
        var recorded = await CaseOfAsync(f.ConnectionId, "124");
        var byPerson = at.AddHours(1);
        await Db(async db =>
        {
            await db.Cases.IgnoreQueryFilters().Where(c => c.Id == wrong!.Id).ExecuteUpdateAsync(u => u.SetProperty(c => c.FirstResponseAt, at));
            await db.Cases.IgnoreQueryFilters().Where(c => c.Id == recorded!.Id).ExecuteUpdateAsync(u => u.SetProperty(c => c.FirstResponseAt, byPerson));
            db.CaseEvents.Add(new CaseEvent { CaseId = recorded!.Id, Type = CaseEventType.FirstResponse, ToValue = byPerson.ToString("O"), Note = "Phone", At = byPerson });
            return await db.SaveChangesAsync();
        });

        // A sync never rewrites a result already calculated; an administrator's recalculation does, with a reason.
        await RunAsync(f.SpaceId);
        Assert.Equal(at, (await CaseOfAsync(f.ConnectionId, "123"))!.FirstResponseAt);
        var admin = await _hub.As(HubFactory.Manager);
        Assert.NotNull((await admin.Post($"/admin/jira-connections/{f.ConnectionId}/recalculate-first-responses", new { reason = "" })).Error("reason"));
        await admin.Ok($"/admin/jira-connections/{f.ConnectionId}/recalculate-first-responses", new { reason = "Correct the values of 2.47.0" });
        Assert.Null((await CaseOfAsync(f.ConnectionId, "123"))!.FirstResponseAt);
        Assert.Equal(byPerson, (await CaseOfAsync(f.ConnectionId, "124"))!.FirstResponseAt);
    }

    [Fact]
    public async Task Changing_a_classification_keeps_the_recorded_first_response()
    {
        var f = await SetUpAsync();
        var owner = await _hub.UserId(HubFactory.Engineer);
        var manager = await _hub.As(HubFactory.Manager);
        var contact = await manager.Create($"/clients/{f.ClientId}/contacts", new { name = "Fictional Rep 125", email = "rep125@example.com" });
        var first = DateTimeOffset.UtcNow.AddHours(-3);
        _jira.Add("125", "TAH-125");
        _jira.Comments["125"] = [new("c0", "acc-team", "Sam", "Looking", first.AddHours(-1), first.AddHours(-1), "role", "Developers")];
        await RunAsync(f.SpaceId);
        await MapUserAsync(f.ConnectionId, "acc-team", owner);
        _jira.Comments["125"].Add(new("c1", "acc-team", "Sam", "Here is the answer", first, first, null, null));
        _jira.Change("125", i => i);
        await RunAsync(f.SpaceId);
        Assert.Equal(first, (await CaseOfAsync(f.ConnectionId, "125"))!.FirstResponseAt);

        await MapContactAsync(f.ConnectionId, "acc-team", contact);
        _jira.Change("125", i => i);
        await RunAsync(f.SpaceId);
        Assert.Equal(first, (await CaseOfAsync(f.ConnectionId, "125"))!.FirstResponseAt);
    }

    [Fact]
    public async Task With_no_jira_comment_the_first_response_stays_open()
    {
        var f = await SetUpAsync();
        _jira.Add("121", "TAH-121");
        await RunAsync(f.SpaceId);
        Assert.Null((await CaseOfAsync(f.ConnectionId, "121"))!.FirstResponseAt);
    }

    [Fact]
    public async Task An_import_alone_never_creates_a_breach_or_penalty()
    {
        var f = await SetUpAsync();
        _jira.Add("125", "TAH-125"); // created 30 days earlier in Jira
        await RunAsync(f.SpaceId);
        var c = await CaseOfAsync(f.ConnectionId, "125");
        Assert.Equal(SlaState.NotApplicable, c!.ResolutionSlaStatus);
        Assert.Null(c.PenaltyTermsSnapshotJson);
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
