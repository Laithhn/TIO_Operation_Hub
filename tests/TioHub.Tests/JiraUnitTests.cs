using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Modules.Jira;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Tests;

/// <summary>A76: database-free rules of the Jira integration. Every Jira answer here is a literal; no test reaches a network.</summary>
public class JiraUnitTests
{
    private static JsonElement Json(string s) => JsonDocument.Parse(s).RootElement;
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 10, 0, 0, TimeSpan.Zero);

    // ---- read-only guarantee ----
    [Theory]
    [InlineData("GET", "/rest/api/3/issue/1/comment", true)]
    [InlineData("POST", "/rest/api/3/search/jql", true)]
    [InlineData("POST", "/ex/jira/abc/rest/api/3/search/jql", true)]
    [InlineData("POST", "/rest/api/3/issue/1/comment", false)]
    [InlineData("POST", "/rest/api/3/issue", false)]
    [InlineData("POST", "/rest/api/3/issue/1/transitions", false)]
    [InlineData("PUT", "/rest/api/3/issue/1/assignee", false)]
    [InlineData("PUT", "/rest/api/3/issue/1", false)]
    [InlineData("DELETE", "/rest/api/3/issue/1", false)]
    [InlineData("PATCH", "/rest/api/3/issue/1", false)]
    public void Only_reads_may_leave_the_server(string method, string path, bool allowed) =>
        Assert.Equal(allowed, JiraReadOnlyHandler.IsAllowed(new HttpMethod(method), path));

    [Fact]
    public void The_client_interface_has_no_operation_that_writes()
    {
        var names = typeof(IJiraApiClient).GetMethods().Select(m => m.Name).ToArray();
        Assert.All(names, n => Assert.True(n.StartsWith("Get", StringComparison.Ordinal) || n.StartsWith("Search", StringComparison.Ordinal), n));
    }

    [Fact]
    public async Task The_handler_refuses_a_write_before_it_is_sent()
    {
        var inner = new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.OK));
        using var http = new HttpClient(new JiraReadOnlyHandler { InnerHandler = inner });
        await Assert.ThrowsAsync<InvalidOperationException>(() => http.PostAsync("https://x.atlassian.net/rest/api/3/issue/1/comment", new StringContent("{}")));
        Assert.Equal(0, inner.Calls);
    }

    // ---- request behaviour ----
    private static JiraApiClient Client(HttpMessageHandler handler, int retries = 2) =>
        new(new HttpClient(handler), Options.Create(new JiraOptions { MaxRetries = retries, RequestTimeoutSeconds = 5 }), TimeProvider.System);
    private static readonly JiraAuth Auth = new("https://x.atlassian.net", JiraAuthMode.ApiTokenBasic, "svc@example.org", "SECRET-TOKEN-VALUE", null);

    [Fact]
    public async Task A_rate_limit_is_retried_after_the_time_jira_asks_for()
    {
        var calls = 0;
        var handler = new FakeHandler(_ =>
        {
            if (++calls == 1)
            {
                var limited = new HttpResponseMessage(HttpStatusCode.TooManyRequests);
                limited.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(TimeSpan.FromSeconds(1));
                return limited;
            }
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"accountId\":\"a1\",\"displayName\":\"Svc\",\"timeZone\":\"Asia/Dubai\"}") };
        });
        var me = await Client(handler).GetMyselfAsync(Auth, CancellationToken.None);
        Assert.Equal(2, calls);
        Assert.Equal("Asia/Dubai", me.TimeZone);
    }

    [Fact]
    public async Task Errors_never_contain_the_token_or_the_response_body()
    {
        var handler = new FakeHandler(_ => new HttpResponseMessage(HttpStatusCode.Unauthorized) { Content = new StringContent("token SECRET-TOKEN-VALUE rejected") });
        var ex = await Assert.ThrowsAsync<JiraApiException>(() => Client(handler).GetMyselfAsync(Auth, CancellationToken.None));
        Assert.DoesNotContain("SECRET", ex.Message);
        Assert.Equal(1, handler.Calls); // an authentication failure is not retried
    }

    [Fact]
    public async Task Basic_authentication_and_the_scoped_gateway_are_used()
    {
        HttpRequestMessage? seen = null;
        var handler = new FakeHandler(r => { seen = r; return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"accountId\":\"a\"}") }; });
        await Client(handler).GetMyselfAsync(Auth with { Mode = JiraAuthMode.ScopedApiToken, CloudId = "cloud-1" }, CancellationToken.None);
        Assert.Equal("https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/myself", seen!.RequestUri!.ToString());
        Assert.Equal("Basic", seen.Headers.Authorization!.Scheme);
        Assert.Equal("svc@example.org:SECRET-TOKEN-VALUE", Encoding.UTF8.GetString(Convert.FromBase64String(seen.Headers.Authorization.Parameter!)));
    }

    [Fact]
    public async Task Search_uses_the_v3_endpoint_with_next_page_tokens()
    {
        string? body = null; string? url = null;
        var handler = new FakeHandler(r => { url = r.RequestUri!.ToString(); body = r.Content!.ReadAsStringAsync().Result; return new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"issues\":[],\"nextPageToken\":\"p2\"}") }; });
        var page = await Client(handler).SearchAsync(Auth, "project = \"TAH\"", [], "p1", 50, CancellationToken.None);
        Assert.Equal("https://x.atlassian.net/rest/api/3/search/jql", url);
        Assert.Contains("\"nextPageToken\":\"p1\"", body);
        Assert.Equal("p2", page.NextPageToken);
    }

    [Fact]
    public void Printing_the_credentials_never_shows_the_token() => Assert.DoesNotContain("SECRET", Auth.ToString());

    // ---- parsing ----
    [Fact]
    public void Atlassian_document_format_becomes_plain_text()
    {
        var adf = Json("""{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello "},{"type":"mention","attrs":{"text":"@Sam"}},{"type":"hardBreak"},{"type":"text","text":"<script>x</script>","marks":[{"type":"strong"}]}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"one"}]}]}]}]}""");
        var text = AdfText.ToPlain(adf);
        Assert.Contains("Hello @Sam\n<script>x</script>", text); // stays text: React renders it, it is never markup
        Assert.Contains("- one", text);
    }

    [Fact]
    public void An_issue_with_only_nulls_still_parses()
    {
        var i = JiraJson.Issue(Json("""{"id":"10","key":"TAH-1","fields":{"summary":null,"description":null,"status":null,"assignee":null,"reporter":null,"priority":null,"duedate":null,"resolution":null,"labels":[],"components":[]}}"""), []);
        Assert.Equal("TAH-1", i.Key);
        Assert.Null(i.AssigneeId);
        Assert.Null(i.StatusId);
        Assert.Equal("", i.Summary);
    }

    [Fact]
    public void Issue_fields_are_read_without_relying_on_email_addresses()
    {
        var i = JiraJson.Issue(Json("""{"id":"10","key":"TAH-2355","fields":{"summary":"Centralized","status":{"id":"3","name":"In Progress","statusCategory":{"key":"indeterminate"}},"assignee":{"accountId":"acc-1","displayName":"Sam"},"project":{"id":"100","key":"TAH"},"updated":"2026-10-28T13:31:00.000+0400","labels":["a"],"components":[{"name":"CM/MC"}],"customfield_1":{"value":"MOI-DP"}}}"""), ["customfield_1"]);
        Assert.Equal("acc-1", i.AssigneeId);
        Assert.Equal("indeterminate", i.StatusCategory);
        Assert.Equal("100", i.ProjectId);
        Assert.Equal(new DateTimeOffset(2026, 10, 28, 9, 31, 0, TimeSpan.Zero), i.UpdatedAt);
        Assert.Equal("MOI-DP", i.Details["customfield_1"]);
        Assert.Equal("CM/MC", i.Components[0]);
    }

    [Fact]
    public void Changelog_items_get_stable_identities()
    {
        var items = JiraJson.Changelog(Json("""{"values":[{"id":"55","author":{"displayName":"Sam"},"created":"2026-10-28T10:00:00.000+0000","items":[{"field":"status","fromString":"To Do","toString":"Done"},{"field":"assignee","fromString":"A","toString":"B"}]}]}"""));
        Assert.Equal(["55:0", "55:1"], items.Select(i => i.EventId));
        Assert.Equal("Done", items[0].ToText);
    }

    [Fact]
    public void Project_statuses_are_listed_once()
    {
        var s = JiraJson.ProjectStatuses(Json("""[{"statuses":[{"id":"1","name":"To Do","statusCategory":{"key":"new"}}]},{"statuses":[{"id":"1","name":"To Do","statusCategory":{"key":"new"}},{"id":"2","name":"Done","statusCategory":{"key":"done"}}]}]"""));
        Assert.Equal(2, s.Count);
    }

    // ---- queries and schedule ----
    [Fact]
    public void Each_space_gets_its_own_query()
    {
        Assert.Equal("project = \"TAH\" ORDER BY updated DESC", JiraQueries.Issues("TAH", null, null, null, newestFirst: true));
        Assert.Equal("project = \"MOB\" ORDER BY updated ASC", JiraQueries.Issues("MOB", null, null, null));
    }

    [Fact]
    public void The_checkpoint_is_converted_to_the_time_zone_jira_reads_it_in()
    {
        var jql = JiraQueries.Issues("TAH", new DateTimeOffset(2026, 10, 28, 9, 31, 0, TimeSpan.Zero), "Asia/Dubai", new DateOnly(2026, 1, 1));
        Assert.Contains("updated >= \"2026-10-28 13:31\"", jql);
        Assert.Contains("created >= \"2026-01-01\"", jql);
    }

    [Fact]
    public void Quotes_cannot_change_a_query() => Assert.Equal("project = \"AOR 1=1\" ORDER BY updated ASC", JiraQueries.Issues("A\"OR 1=1", null, null, null));

    [Fact]
    public void A_space_is_due_every_fifteen_minutes_by_default()
    {
        var settings = new ClientJiraSettings();
        Assert.Equal(15, settings.SyncIntervalMinutes);
        var state = new JiraSpaceSyncState { LastRunAt = Now };
        Assert.False(JiraQueries.IsDue(state, settings, Now.AddMinutes(14), false));
        Assert.True(JiraQueries.IsDue(state, settings, Now.AddMinutes(15), false));
        Assert.True(JiraQueries.IsDue(null, settings, Now, false));
    }

    [Fact]
    public void Failures_back_off_and_a_manual_run_goes_at_once()
    {
        var settings = new ClientJiraSettings();
        var state = new JiraSpaceSyncState { LastRunAt = Now, ConsecutiveFailures = 3 };
        Assert.False(JiraQueries.IsDue(state, settings, Now.AddMinutes(59), false));
        Assert.True(JiraQueries.IsDue(state, settings, Now.AddMinutes(60), false));
        state.ManualRequestedAt = Now;
        Assert.True(JiraQueries.IsDue(state, settings, Now.AddMinutes(1), false));
    }

    [Fact]
    public void Sync_on_startup_applies_only_when_enabled()
    {
        var state = new JiraSpaceSyncState { LastRunAt = Now };
        Assert.False(JiraQueries.IsDue(state, new ClientJiraSettings(), Now.AddMinutes(1), true));
        Assert.True(JiraQueries.IsDue(state, new ClientJiraSettings { SyncOnStartup = true }, Now.AddMinutes(1), true));
    }

    [Fact]
    public void Run_types_follow_the_checkpoints()
    {
        var s = new ClientJiraSettings();
        Assert.Equal(JiraSyncType.Initial, JiraQueries.TypeFor(new JiraSpaceSyncState(), s, Now));
        Assert.Equal(JiraSyncType.Incremental, JiraQueries.TypeFor(new JiraSpaceSyncState { LastSuccessAt = Now, LastFullAt = Now }, s, Now.AddHours(1)));
        Assert.Equal(JiraSyncType.FullReconciliation, JiraQueries.TypeFor(new JiraSpaceSyncState { LastSuccessAt = Now, LastFullAt = Now }, s, Now.AddDays(7)));
        Assert.Equal(JiraSyncType.FullReconciliation, JiraQueries.TypeFor(new JiraSpaceSyncState { LastSuccessAt = Now, LastFullAt = Now, ForceFullNext = true }, s, Now));
        Assert.Equal(JiraSyncType.Incremental, JiraQueries.TypeFor(new JiraSpaceSyncState { LastSuccessAt = Now }, new ClientJiraSettings { FullReconciliation = false }, Now));
    }

    // ---- workflow ----
    [Theory]
    [InlineData(CaseStatus.New, CaseStatus.PendingValidation, new[] { CaseStatus.Triaged, CaseStatus.InProgress, CaseStatus.PendingValidation })]
    [InlineData(CaseStatus.New, CaseStatus.Triaged, new[] { CaseStatus.Triaged })]
    [InlineData(CaseStatus.Triaged, CaseStatus.InProgress, new[] { CaseStatus.InProgress })]
    [InlineData(CaseStatus.PendingValidation, CaseStatus.InProgress, new[] { CaseStatus.InProgress })]
    [InlineData(CaseStatus.InProgress, CaseStatus.InProgress, new CaseStatus[0])]
    [InlineData(CaseStatus.New, CaseStatus.Closed, new[] { CaseStatus.Closed })]
    [InlineData(CaseStatus.InProgress, CaseStatus.Closed, new[] { CaseStatus.Closed })]
    [InlineData(CaseStatus.Closed, CaseStatus.Closed, new CaseStatus[0])]
    [InlineData(CaseStatus.InProgress, CaseStatus.New, new[] { CaseStatus.New })]
    [InlineData(CaseStatus.PendingValidation, CaseStatus.Triaged, new[] { CaseStatus.Triaged })]
    [InlineData(CaseStatus.Closed, CaseStatus.InProgress, new[] { CaseStatus.Triaged, CaseStatus.InProgress })]
    [InlineData(CaseStatus.Cancelled, CaseStatus.Triaged, new[] { CaseStatus.Triaged })]
    [InlineData(CaseStatus.Closed, CaseStatus.New, new[] { CaseStatus.Triaged, CaseStatus.New })]
    public void Every_mapped_status_has_a_path(CaseStatus from, CaseStatus to, CaseStatus[] expected) => Assert.Equal(expected, JiraWorkflow.Path(from, to));

    [Theory]
    [InlineData(CaseStatusBehavior.Initial, CaseStatus.New)]
    [InlineData(CaseStatusBehavior.Opened, CaseStatus.Triaged)]
    [InlineData(CaseStatusBehavior.Reopened, CaseStatus.Triaged)]
    [InlineData(CaseStatusBehavior.Active, CaseStatus.InProgress)]
    [InlineData(CaseStatusBehavior.Resolved, CaseStatus.PendingValidation)]
    [InlineData(CaseStatusBehavior.Closed, CaseStatus.Closed)]
    public void Each_behavior_belongs_to_one_stage(CaseStatusBehavior behavior, CaseStatus stage) => Assert.Equal(stage, CaseStatuses.StageOf(behavior));

    [Fact]
    public void Waiting_does_not_change_the_stage_and_nothing_can_be_mapped_to_cancelled()
    {
        Assert.Null(CaseStatuses.StageOf(CaseStatusBehavior.WaitingForCustomer));
        Assert.DoesNotContain(Enum.GetValues<CaseStatusBehavior>(), b => CaseStatuses.StageOf(b) == CaseStatus.Cancelled);
    }

    [Fact]
    public void The_initial_list_is_the_owners_and_covers_the_required_behaviors()
    {
        Assert.Equal(["New", "Opened", "In-progress", "Waiting for customer", "Closed", "Re-opened"], CaseStatuses.Initial.Select(s => s.Label));
        Assert.All(CaseStatuses.Required, b => Assert.Contains(CaseStatuses.Initial, s => s.Behavior == b));
        Assert.DoesNotContain(CaseStatuses.Initial, s => s.Behavior == CaseStatusBehavior.Resolved);
    }

    // ---- security ----
    [Theory]
    [InlineData("https://poliscan.atlassian.net", "https://poliscan.atlassian.net")]
    [InlineData("https://POLISCAN.atlassian.net/jira/x", "https://poliscan.atlassian.net")]
    [InlineData("http://poliscan.atlassian.net", null)]
    [InlineData("https://localhost", null)]
    [InlineData("https://10.0.0.5", null)]
    [InlineData("https://evil.example.org", null)]
    [InlineData("https://atlassian.net.evil.example", null)]
    [InlineData("https://user:pw@poliscan.atlassian.net", null)]
    [InlineData("https://poliscan.atlassian.net:8443", null)]
    public void Only_jira_cloud_sites_are_accepted(string site, string? expected) =>
        Assert.Equal(expected, JiraSecretStore.NormalizeSite(site, [".atlassian.net"]).Site);

    [Theory]
    [InlineData("TIOHUB_JIRA_POLISCAN", true)]
    [InlineData("PATH", false)]
    [InlineData("ConnectionStrings__TioHub", false)]
    [InlineData(null, false)]
    public void Only_jira_environment_variables_can_be_referenced(string? name, bool ok) => Assert.Equal(ok, JiraSecretStore.IsValidVariableName(name));

    [Fact]
    public void Restricted_comments_are_hidden_from_people_who_do_not_coordinate_the_case()
    {
        var c = new JiraComment { BodyText = "internal", VisibilityType = "role", VisibilityValue = "Administrators" };
        Assert.Equal((null, true), JiraCaseEndpoints.CommentBody(c, false));
        Assert.Equal(("internal", false), JiraCaseEndpoints.CommentBody(c, true));
        Assert.Equal(("open", false), JiraCaseEndpoints.CommentBody(new JiraComment { BodyText = "open" }, false));
    }

    [Theory]
    [InlineData("/admin/jira-connections", "GET", "AdminIntegrations:View")]
    [InlineData("/admin/jira-connections", "POST", "AdminIntegrations:Create")]
    [InlineData("/admin/jira-connections/{id:long}/credentials", "POST", "AdminIntegrations:Maintain")]
    [InlineData("/admin/JIRA-issues/{id:long}/resolve", "POST", "AdminIntegrations:Maintain")]
    [InlineData("/clients/{id:long}/jira", "GET", "tab.ClientStructure.jira:View")]
    [InlineData("/clients/{id:long}/jira/spaces", "POST", "tab.ClientStructure.jira:View")]
    public void Every_jira_route_has_a_permission(string path, string method, string key) =>
        Assert.Contains(key, EndpointRights.For(method, path)!.Rights, StringComparer.OrdinalIgnoreCase);

    [Fact]
    public void A_case_change_from_jira_uses_the_case_modules_own_events()
    {
        Assert.Equal(CaseEventType.Triaged, JiraWorkflow.EventFor(CaseStatus.New, CaseStatus.Triaged));
        Assert.Equal(CaseEventType.Started, JiraWorkflow.EventFor(CaseStatus.Triaged, CaseStatus.InProgress));
        Assert.Equal(CaseEventType.Started, JiraWorkflow.EventFor(CaseStatus.PendingValidation, CaseStatus.InProgress));
        Assert.Equal(CaseEventType.ValidationRequested, JiraWorkflow.EventFor(CaseStatus.InProgress, CaseStatus.PendingValidation));
        Assert.Equal(CaseEventType.Closed, JiraWorkflow.EventFor(CaseStatus.InProgress, CaseStatus.Closed));
        Assert.Equal(CaseEventType.StatusChanged, JiraWorkflow.EventFor(CaseStatus.InProgress, CaseStatus.New));
        Assert.Equal(CaseEventType.Reopened, JiraWorkflow.EventFor(CaseStatus.Closed, CaseStatus.Triaged));
    }

    private sealed class FakeHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) { Calls++; return Task.FromResult(respond(request)); }
    }
}
