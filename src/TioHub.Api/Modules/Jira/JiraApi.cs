using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TioHub.Api.Modules.Jira;

public sealed class JiraOptions
{
    /// <summary>Feature flag of the scheduled and manual synchronization. Off until an owner enables it.</summary>
    public bool Enabled { get; set; }
    /// <summary>How often the worker looks for due spaces. 0 = worker off.</summary>
    public int WorkerSeconds { get; set; } = 60;
    /// <summary>Connections may only point at these host suffixes, so the hub cannot be used to reach internal addresses.</summary>
    public string[] AllowedHostSuffixes { get; set; } = [".atlassian.net"];
    public int MaxIssuesPerRun { get; set; } = 5000;
    public int CheckpointOverlapMinutes { get; set; } = 5;
    public int RequestTimeoutSeconds { get; set; } = 30;
    public int MaxRetries { get; set; } = 4;
    public int LeaseMinutes { get; set; } = 30;
    public int PreviewMaxIssues { get; set; } = 2000;
}

public sealed record JiraAuth(string SiteUrl, JiraAuthMode Mode, string? Email, string Token, string? CloudId)
{
    public string ApiBase => Mode == JiraAuthMode.ScopedApiToken ? $"https://api.atlassian.com/ex/jira/{Uri.EscapeDataString(CloudId ?? "")}" : SiteUrl;
    /// <summary>A record prints every value by default; the token must never reach a log.</summary>
    public override string ToString() => $"JiraAuth {{ SiteUrl = {SiteUrl}, Mode = {Mode} }}";
}

public sealed record JiraMyself(string AccountId, string? DisplayName, string? TimeZone);
public sealed record JiraProject(string Id, string Key, string Name);
public sealed record JiraStatusInfo(string Id, string Name, string? Category);
public sealed record JiraField(string Id, string Name);
public sealed record JiraIssue(string Id, string Key, string ProjectId, string ProjectKey, string Summary, string? DescriptionText, string? StatusId, string? StatusName, string? StatusCategory,
    string? PriorityName, string? IssueTypeName, string? AssigneeId, string? AssigneeName, string? ReporterName, DateTimeOffset? CreatedAt, DateTimeOffset? UpdatedAt, DateOnly? DueDate, string? Resolution,
    IReadOnlyList<string> Labels, IReadOnlyList<string> Components, IReadOnlyDictionary<string, string> Details, int CommentTotal);
public sealed record JiraSearchPage(IReadOnlyList<JiraIssue> Issues, string? NextPageToken);
public sealed record JiraCommentInfo(string Id, string? AuthorId, string? AuthorName, string BodyText, DateTimeOffset Created, DateTimeOffset? Updated, string? VisibilityType, string? VisibilityValue);
public sealed record JiraChangeItem(string EventId, string? ActorName, DateTimeOffset At, string Field, string? FromId, string? FromText, string? ToId, string? ToText);

/// <summary>A failed Jira request. The message is safe to show and to store: it is built from the status only, never from headers or response bodies.</summary>
public sealed class JiraApiException(HttpStatusCode? status, string message) : Exception(message)
{
    public HttpStatusCode? Status { get; } = status;
}

/// <summary>The hub's whole view of Jira. Every operation reads; there is deliberately no operation that writes.</summary>
public interface IJiraApiClient
{
    Task<string?> GetCloudIdAsync(string siteUrl, CancellationToken ct);
    Task<JiraMyself> GetMyselfAsync(JiraAuth auth, CancellationToken ct);
    Task<IReadOnlyList<JiraProject>> GetProjectsAsync(JiraAuth auth, CancellationToken ct);
    Task<IReadOnlyList<JiraStatusInfo>> GetProjectStatusesAsync(JiraAuth auth, string projectId, CancellationToken ct);
    Task<IReadOnlyList<JiraField>> GetFieldsAsync(JiraAuth auth, CancellationToken ct);
    Task<JiraSearchPage> SearchAsync(JiraAuth auth, string jql, IReadOnlyCollection<string> extraFields, string? nextPageToken, int maxResults, CancellationToken ct);
    /// <summary>Null when Jira no longer has it or the account cannot see it.</summary>
    Task<JiraIssue?> GetIssueAsync(JiraAuth auth, string issueId, IReadOnlyCollection<string> extraFields, CancellationToken ct);
    Task<IReadOnlyList<JiraCommentInfo>> GetCommentsAsync(JiraAuth auth, string issueId, CancellationToken ct);
    Task<IReadOnlyList<JiraChangeItem>> GetChangelogAsync(JiraAuth auth, string issueId, CancellationToken ct);
}

/// <summary>
/// A76 "No Jira write operations": the last check before anything leaves the server. GET is allowed everywhere; POST only for the
/// search endpoint, which reads despite its method. Everything else is refused, whatever code asked for it.
/// </summary>
public sealed class JiraReadOnlyHandler : DelegatingHandler
{
    public static bool IsAllowed(HttpMethod method, string path) =>
        method == HttpMethod.Get || method == HttpMethod.Head
        || (method == HttpMethod.Post && path.EndsWith("/rest/api/3/search/jql", StringComparison.OrdinalIgnoreCase));

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (!IsAllowed(request.Method, request.RequestUri?.AbsolutePath ?? ""))
            throw new InvalidOperationException($"Refused an outbound Jira {request.Method} request: the integration is read-only.");
        return base.SendAsync(request, ct);
    }
}

public sealed class JiraApiClient(HttpClient http, IOptions<JiraOptions> options, TimeProvider clock) : IJiraApiClient
{
    private const int PageSize = 100;
    private static readonly string[] IssueFields =
        ["summary", "description", "status", "priority", "issuetype", "assignee", "reporter", "created", "updated", "duedate", "resolution", "labels", "components", "project", "comment"];

    public async Task<string?> GetCloudIdAsync(string siteUrl, CancellationToken ct)
    {
        using var doc = await SendAsync(null, HttpMethod.Get, $"{siteUrl}/_edge/tenant_info", null, ct);
        return doc?.RootElement.Str("cloudId");
    }

    public async Task<JiraMyself> GetMyselfAsync(JiraAuth auth, CancellationToken ct)
    {
        using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/myself", null, ct);
        var r = doc!.RootElement;
        return new(r.Str("accountId") ?? "", r.Str("displayName"), r.Str("timeZone"));
    }

    public async Task<IReadOnlyList<JiraProject>> GetProjectsAsync(JiraAuth auth, CancellationToken ct)
    {
        var all = new List<JiraProject>();
        for (var start = 0; ; start += PageSize)
        {
            using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/project/search?startAt={start}&maxResults={PageSize}", null, ct);
            all.AddRange(JiraJson.Projects(doc!.RootElement));
            if (doc.RootElement.Bool("isLast") != false || !doc.RootElement.Has("values") || doc.RootElement.GetProperty("values").GetArrayLength() == 0) return all;
        }
    }

    public async Task<IReadOnlyList<JiraStatusInfo>> GetProjectStatusesAsync(JiraAuth auth, string projectId, CancellationToken ct)
    {
        using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/project/{Uri.EscapeDataString(projectId)}/statuses", null, ct);
        return JiraJson.ProjectStatuses(doc!.RootElement);
    }

    public async Task<IReadOnlyList<JiraField>> GetFieldsAsync(JiraAuth auth, CancellationToken ct)
    {
        using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/field", null, ct);
        return doc!.RootElement.EnumerateArray().Select(f => new JiraField(f.Str("id") ?? "", f.Str("name") ?? "")).Where(f => f.Id.Length > 0).ToList();
    }

    public async Task<JiraSearchPage> SearchAsync(JiraAuth auth, string jql, IReadOnlyCollection<string> extraFields, string? nextPageToken, int maxResults, CancellationToken ct)
    {
        var body = new Dictionary<string, object?> { ["jql"] = jql, ["maxResults"] = maxResults, ["fields"] = IssueFields.Concat(extraFields.Select(x => x)).Distinct().ToArray() };
        if (nextPageToken is not null) body["nextPageToken"] = nextPageToken;
        using var doc = await SendAsync(auth, HttpMethod.Post, $"{auth.ApiBase}/rest/api/3/search/jql", JsonSerializer.Serialize(body), ct);
        return JiraJson.SearchPage(doc!.RootElement, extraFields);
    }

    public async Task<JiraIssue?> GetIssueAsync(JiraAuth auth, string issueId, IReadOnlyCollection<string> extraFields, CancellationToken ct)
    {
        var fields = string.Join(',', IssueFields.Concat(extraFields).Distinct());
        try
        {
            using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/issue/{Uri.EscapeDataString(issueId)}?fields={Uri.EscapeDataString(fields)}", null, ct);
            return JiraJson.Issue(doc!.RootElement, extraFields);
        }
        catch (JiraApiException ex) when (ex.Status == HttpStatusCode.NotFound) { return null; }
    }

    public async Task<IReadOnlyList<JiraCommentInfo>> GetCommentsAsync(JiraAuth auth, string issueId, CancellationToken ct)
    {
        var all = new List<JiraCommentInfo>();
        for (var start = 0; ; start += PageSize)
        {
            using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/issue/{Uri.EscapeDataString(issueId)}/comment?startAt={start}&maxResults={PageSize}&orderBy=created", null, ct);
            var page = JiraJson.Comments(doc!.RootElement);
            all.AddRange(page);
            if (page.Count == 0 || all.Count >= (doc.RootElement.Int("total") ?? 0)) return all;
        }
    }

    public async Task<IReadOnlyList<JiraChangeItem>> GetChangelogAsync(JiraAuth auth, string issueId, CancellationToken ct)
    {
        var all = new List<JiraChangeItem>();
        for (var start = 0; ; start += PageSize)
        {
            using var doc = await SendAsync(auth, HttpMethod.Get, $"{auth.ApiBase}/rest/api/3/issue/{Uri.EscapeDataString(issueId)}/changelog?startAt={start}&maxResults={PageSize}", null, ct);
            all.AddRange(JiraJson.Changelog(doc!.RootElement));
            if (doc.RootElement.Bool("isLast") != false || doc.RootElement.GetProperty("values").GetArrayLength() == 0) return all;
        }
    }

    /// <summary>Bounded retries for rate limits (honouring Retry-After), server errors and timeouts. Exceptions carry a safe message only.</summary>
    private async Task<JsonDocument?> SendAsync(JiraAuth? auth, HttpMethod method, string url, string? json, CancellationToken ct)
    {
        var o = options.Value;
        for (var attempt = 0; ; attempt++)
        {
            using var request = new HttpRequestMessage(method, url);
            request.Headers.Accept.ParseAdd("application/json");
            if (auth is not null)
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{auth.Email}:{auth.Token}")));
            if (json is not null) request.Content = new StringContent(json, Encoding.UTF8, "application/json");
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(Math.Max(1, o.RequestTimeoutSeconds)));
            TimeSpan? wait;
            JiraApiException failure;
            try
            {
                using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
                if (response.IsSuccessStatusCode)
                {
                    await using var stream = await response.Content.ReadAsStreamAsync(timeout.Token);
                    return await JsonDocument.ParseAsync(stream, default, timeout.Token);
                }
                failure = new JiraApiException(response.StatusCode, JiraErrors.Message(response.StatusCode));
                wait = RetryDelay(response, attempt);
            }
            catch (OperationCanceledException) when (!ct.IsCancellationRequested)
            {
                failure = new JiraApiException(null, "Jira did not answer in time.");
                wait = Backoff(attempt);
            }
            catch (HttpRequestException)
            {
                failure = new JiraApiException(null, "Jira could not be reached.");
                wait = Backoff(attempt);
            }
            catch (JsonException)
            {
                throw new JiraApiException(null, "Jira returned an unreadable answer.");
            }
            if (wait is null || attempt >= o.MaxRetries) throw failure;
            await Task.Delay(wait.Value, clock, ct);
        }
    }

    private static TimeSpan Backoff(int attempt) => TimeSpan.FromSeconds(Math.Min(60, Math.Pow(2, attempt + 1)));

    public static TimeSpan? RetryDelay(HttpResponseMessage r, int attempt) => r.StatusCode switch
    {
        HttpStatusCode.TooManyRequests => r.Headers.RetryAfter?.Delta is { } d && d > TimeSpan.Zero ? (d > TimeSpan.FromMinutes(5) ? TimeSpan.FromMinutes(5) : d) : Backoff(attempt),
        HttpStatusCode.InternalServerError or HttpStatusCode.BadGateway or HttpStatusCode.ServiceUnavailable or HttpStatusCode.GatewayTimeout => Backoff(attempt),
        _ => null
    };
}

public static class JiraErrors
{
    public static string Message(HttpStatusCode s) => s switch
    {
        HttpStatusCode.Unauthorized => "Jira refused the credentials (401). Check the account e-mail and API token.",
        HttpStatusCode.Forbidden => "The Jira account is not allowed to do this (403). Check its permissions and the token's scopes.",
        HttpStatusCode.NotFound => "Jira did not find this (404), or the account cannot see it.",
        HttpStatusCode.BadRequest => "Jira refused the request (400).",
        HttpStatusCode.TooManyRequests => "Jira is limiting requests (429). The run is retried later.",
        _ => $"Jira answered with an error ({(int)s})."
    };
}

/// <summary>Parses Jira answers. Every field may be missing or null; user e-mail addresses are not relied on.</summary>
public static class JiraJson
{
    public static bool Has(this JsonElement e, string name) => e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind != JsonValueKind.Null;
    public static JsonElement? Obj(this JsonElement e, string name) => e.Has(name) ? e.GetProperty(name) : null;
    public static string? Str(this JsonElement e, string name) => e.Has(name) ? AsText(e.GetProperty(name)) : null;
    public static bool? Bool(this JsonElement e, string name) => e.Has(name) && e.GetProperty(name).ValueKind is JsonValueKind.True or JsonValueKind.False ? e.GetProperty(name).GetBoolean() : null;
    public static int? Int(this JsonElement e, string name) => e.Has(name) && e.GetProperty(name).TryGetInt32(out var v) ? v : null;

    private static string? AsText(JsonElement v) => v.ValueKind switch
    {
        JsonValueKind.String => v.GetString(),
        JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False => v.ToString(),
        _ => null
    };

    public static DateTimeOffset? Date(string? s) =>
        DateTimeOffset.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var d) ? d.ToUniversalTime() : null;

    public static IReadOnlyList<JiraProject> Projects(JsonElement root) => root.Has("values")
        ? root.GetProperty("values").EnumerateArray().Select(p => new JiraProject(p.Str("id") ?? "", p.Str("key") ?? "", p.Str("name") ?? "")).Where(p => p.Id.Length > 0).ToList()
        : [];

    /// <summary>The project's statuses across its issue types, once each.</summary>
    public static IReadOnlyList<JiraStatusInfo> ProjectStatuses(JsonElement root)
    {
        var found = new Dictionary<string, JiraStatusInfo>();
        foreach (var type in root.EnumerateArray())
            if (type.Has("statuses"))
                foreach (var s in type.GetProperty("statuses").EnumerateArray())
                    if (s.Str("id") is { } id)
                        found[id] = new JiraStatusInfo(id, s.Str("name") ?? id, s.Obj("statusCategory")?.Str("key"));
        return found.Values.OrderBy(s => s.Name, StringComparer.OrdinalIgnoreCase).ToList();
    }

    public static JiraSearchPage SearchPage(JsonElement root, IReadOnlyCollection<string> extraFields) => new(
        root.Has("issues") ? root.GetProperty("issues").EnumerateArray().Select(i => Issue(i, extraFields)).ToList() : [],
        root.Str("nextPageToken"));

    public static JiraIssue Issue(JsonElement i, IReadOnlyCollection<string> extraFields)
    {
        var f = i.Obj("fields") ?? default;
        var status = f.ValueKind == JsonValueKind.Object ? f.Obj("status") : null;
        var assignee = f.ValueKind == JsonValueKind.Object ? f.Obj("assignee") : null;
        var project = f.ValueKind == JsonValueKind.Object ? f.Obj("project") : null;
        var details = new Dictionary<string, string>();
        foreach (var field in extraFields)
            if (f.ValueKind == JsonValueKind.Object && f.Has(field) && FieldText(f.GetProperty(field)) is { Length: > 0 } text) details[field] = text;
        return new JiraIssue(i.Str("id") ?? "", i.Str("key") ?? "", project?.Str("id") ?? "", project?.Str("key") ?? "", f.ValueKind == JsonValueKind.Object ? f.Str("summary") ?? "" : "",
            f.ValueKind == JsonValueKind.Object && f.Has("description") ? AdfText.ToPlain(f.GetProperty("description")) : null,
            status?.Str("id"), status?.Str("name"), status?.Obj("statusCategory")?.Str("key"),
            f.ValueKind == JsonValueKind.Object ? f.Obj("priority")?.Str("name") : null, f.ValueKind == JsonValueKind.Object ? f.Obj("issuetype")?.Str("name") : null,
            assignee?.Str("accountId"), assignee?.Str("displayName"), f.ValueKind == JsonValueKind.Object ? f.Obj("reporter")?.Str("displayName") : null,
            f.ValueKind == JsonValueKind.Object ? Date(f.Str("created")) : null, f.ValueKind == JsonValueKind.Object ? Date(f.Str("updated")) : null,
            f.ValueKind == JsonValueKind.Object && DateOnly.TryParse(f.Str("duedate"), CultureInfo.InvariantCulture, out var due) ? due : null,
            f.ValueKind == JsonValueKind.Object ? f.Obj("resolution")?.Str("name") : null,
            f.ValueKind == JsonValueKind.Object && f.Has("labels") ? f.GetProperty("labels").EnumerateArray().Select(l => l.GetString() ?? "").Where(l => l.Length > 0).ToList() : [],
            f.ValueKind == JsonValueKind.Object && f.Has("components") ? f.GetProperty("components").EnumerateArray().Select(c => c.Str("name") ?? "").Where(c => c.Length > 0).ToList() : [],
            details, f.ValueKind == JsonValueKind.Object ? f.Obj("comment")?.Int("total") ?? 0 : 0);
    }

    /// <summary>Text of a custom field: option, user, array, rich text or a plain value.</summary>
    public static string? FieldText(JsonElement v) => v.ValueKind switch
    {
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        JsonValueKind.Array => string.Join(", ", v.EnumerateArray().Select(FieldText).Where(x => !string.IsNullOrEmpty(x))),
        JsonValueKind.Object => v.Str("type") == "doc" ? AdfText.ToPlain(v) : v.Str("value") ?? v.Str("name") ?? v.Str("displayName"),
        _ => AsText(v)
    };

    public static IReadOnlyList<JiraCommentInfo> Comments(JsonElement root) => root.Has("comments")
        ? root.GetProperty("comments").EnumerateArray().Select(c => new JiraCommentInfo(c.Str("id") ?? "", c.Obj("author")?.Str("accountId"), c.Obj("author")?.Str("displayName"),
            c.Has("body") ? AdfText.ToPlain(c.GetProperty("body")) : "", Date(c.Str("created")) ?? DateTimeOffset.MinValue, Date(c.Str("updated")),
            c.Obj("visibility")?.Str("type"), c.Obj("visibility")?.Str("value"))).Where(c => c.Id.Length > 0).ToList()
        : [];

    public static IReadOnlyList<JiraChangeItem> Changelog(JsonElement root)
    {
        var list = new List<JiraChangeItem>();
        if (!root.Has("values")) return list;
        foreach (var h in root.GetProperty("values").EnumerateArray())
        {
            var at = Date(h.Str("created"));
            if (at is null || h.Str("id") is not { } id || !h.Has("items")) continue;
            var n = 0;
            foreach (var item in h.GetProperty("items").EnumerateArray())
            {
                list.Add(new JiraChangeItem($"{id}:{n++}", h.Obj("author")?.Str("displayName"), at.Value, item.Str("field") ?? "",
                    item.Str("from"), item.Str("fromString"), item.Str("to"), item.Str("toString")));
            }
        }
        return list;
    }
}

/// <summary>
/// Atlassian Document Format to plain text. Plain text only: marks are dropped and no HTML is produced, so Jira content cannot
/// inject markup into the hub (React renders it as text).
/// </summary>
public static class AdfText
{
    public static string ToPlain(JsonElement adf)
    {
        if (adf.ValueKind == JsonValueKind.String) return (adf.GetString() ?? "").Trim();
        if (adf.ValueKind != JsonValueKind.Object) return "";
        var sb = new StringBuilder();
        Walk(adf, sb, "");
        return string.Join('\n', sb.ToString().Split('\n').Select(l => l.TrimEnd())).Trim();
    }

    private static void Children(JsonElement node, StringBuilder sb, string indent)
    {
        if (!node.Has("content")) return;
        foreach (var child in node.GetProperty("content").EnumerateArray()) Walk(child, sb, indent);
    }

    private static void Walk(JsonElement node, StringBuilder sb, string indent)
    {
        switch (node.Str("type"))
        {
            case "text": sb.Append(node.Str("text")); break;
            case "hardBreak": sb.Append('\n'); break;
            case "mention": sb.Append(node.Obj("attrs")?.Str("text") ?? "@someone"); break;
            case "emoji": sb.Append(node.Obj("attrs")?.Str("text") ?? node.Obj("attrs")?.Str("shortName")); break;
            case "date": sb.Append(node.Obj("attrs")?.Str("timestamp") is { } ts && long.TryParse(ts, out var ms) ? DateTimeOffset.FromUnixTimeMilliseconds(ms).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture) : ""); break;
            case "status": sb.Append(node.Obj("attrs")?.Str("text")); break;
            case "inlineCard" or "blockCard": sb.Append(node.Obj("attrs")?.Str("url")); break;
            case "mediaSingle" or "mediaGroup" or "media": sb.Append("[attachment in Jira]\n"); break;
            case "listItem":
                sb.Append(indent).Append("- ");
                if (node.Has("content"))
                    foreach (var child in node.GetProperty("content").EnumerateArray())
                    {
                        if (child.Str("type") == "paragraph") { Children(child, sb, indent); sb.Append('\n'); }
                        else Walk(child, sb, indent + "  ");
                    }
                break;
            case "paragraph" or "heading" or "blockquote" or "codeBlock" or "panel":
                Children(node, sb, indent);
                sb.Append("\n\n");
                break;
            case "tableRow":
                var cells = node.Has("content") ? node.GetProperty("content").EnumerateArray().Select(c => ToPlain(c).Replace('\n', ' ')) : [];
                sb.Append(string.Join(" | ", cells)).Append('\n');
                break;
            default: Children(node, sb, indent); if (node.Str("type") is "bulletList" or "orderedList" or "table") sb.Append('\n'); break;
        }
    }
}
