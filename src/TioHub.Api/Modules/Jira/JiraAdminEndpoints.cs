using System.Diagnostics;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Jira;

/// <summary>A76: Administration → Integrations. Credentials go in through these endpoints and never come out.</summary>
public static class JiraAdminEndpoints
{
    public sealed record ConnectionInput(string? Name, string? SiteUrl, JiraAuthMode? AuthMode, string? AccountEmail, string? CloudId, long? JiraInstanceId, string? DetailFieldNames,
        JiraSecretProvider? SecretProvider = null, string? ApiToken = null, string? SecretVariable = null);
    public sealed record CredentialInput(string? AccountEmail, JiraSecretProvider? SecretProvider, string? ApiToken, string? SecretVariable);
    public sealed record EnabledInput(bool Enabled, string? Reason);
    public sealed record UserMappingInput(long? TioUserId, long? ClientContactId = null, bool IsInternalMember = false);
    public sealed record StatusMappingInput(string? TargetStatus);
    public sealed record ResolveInput(string? Action, long? CaseId, string? Note);
    public sealed record ReassignInput(long? ToClientId, string? Reason);
    public sealed record TestStep(string Name, bool Passed, string Detail);

    public static string Health(bool enabled, bool? lastTestOk, IEnumerable<JiraSyncStatus?> lastStatuses)
    {
        if (!enabled) return "Disabled";
        var statuses = lastStatuses.Where(s => s is not null).ToList();
        if (lastTestOk == false || statuses.Contains(JiraSyncStatus.Failed)) return "Error";
        if (statuses.Contains(JiraSyncStatus.Warning)) return "Warning";
        return statuses.Count > 0 ? "Healthy" : "NotConfigured";
    }

    private static void RequireAdmin(UserContext me) => me.RequireAdministrator();

    private static object Dto(JiraConnection c, bool hasCredential, int spaces, int assigned, int clients, DateTimeOffset? lastSync, string health) => new
    {
        c.Id, c.Name, c.SiteUrl, type = "JiraCloud", c.AuthMode, c.AccountEmail, c.CloudId, c.IsEnabled, c.JiraInstanceId, instance = c.JiraInstance?.Name, c.DetailFieldNames,
        status = c.IsEnabled ? "Active" : "Disabled", health, spaces, assignedSpaces = assigned, connectedClients = clients, lastSync,
        c.LastTestAt, c.LastTestOk, c.LastTestDurationMs, c.LastSuccessfulTestAt, c.LastDiscoveryAt, c.LastDiscoveryError, c.AccountTimeZone,
        lastTest = c.LastTestJson is null ? null : JsonSerializer.Deserialize<TestStep[]>(c.LastTestJson),
        // The token itself is never selected. Only whether one exists, where it lives and when it changed.
        credential = new { hasToken = hasCredential, provider = c.SecretProvider, reference = c.SecretReference, rotatedAt = c.CredentialRotatedAt, masked = hasCredential ? "••••••••••••••••" : null },
        version = Convert.ToBase64String(c.RowVersion)
    };

    private static void Validate(Check check, JiraSecretStore secrets, ConnectionInput i, out string? site)
    {
        check.Text("name", i.Name, 100, "the connection name", true).Text("accountEmail", i.AccountEmail, 254, "the Atlassian account e-mail", true).Text("cloudId", i.CloudId, 64, "Cloud ID").Text("detailFieldNames", i.DetailFieldNames, 500, "Jira detail fields");
        if (i.AccountEmail is { Length: > 0 } mail && !mail.Contains('@')) check.Add("accountEmail", "Enter the account's e-mail address.");
        if (i.AuthMode is null) check.Add("authMode", "Select the authentication type.");
        if (i.AuthMode == JiraAuthMode.ScopedApiToken && string.IsNullOrWhiteSpace(i.CloudId)) check.Add("cloudId", "A scoped API token goes through the Atlassian gateway and needs the site's Cloud ID.");
        var (normalized, problem) = secrets.NormalizeSite(i.SiteUrl);
        if (problem is not null) check.Add("siteUrl", problem);
        site = normalized;
    }

    private static void ValidateCredential(Check check, JiraSecretProvider? provider, string? token, string? variable)
    {
        if (provider == JiraSecretProvider.EnvironmentVariable)
        {
            if (!JiraSecretStore.IsValidVariableName(variable)) check.Add("secretVariable", "Enter a variable name starting with TIOHUB_JIRA_, in capital letters, digits and underscores.");
        }
        else if (string.IsNullOrWhiteSpace(token)) check.Add("apiToken", "Enter the API token.");
        else if (token.Length > 4000) check.Add("apiToken", "The API token is too long.");
    }

    public static void MapJiraAdminEndpoints(RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin").WithTags("Jira integration");

        g.MapGet("/jira-connections", async (HubDbContext db, UserContext me, JiraSecretStore secrets, IOptions<JiraOptions> options, TimeProvider clock, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var connections = await db.JiraConnections.AsNoTracking().Include(c => c.JiraInstance).OrderBy(c => c.Name).ToListAsync(ct);
            var discovered = await db.JiraDiscoveredSpaces.AsNoTracking().Where(s => !s.Missing).GroupBy(s => s.JiraConnectionId).Select(g => new { g.Key, n = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
            var spaces = await db.ClientJiraSpaces.IgnoreQueryFilters().AsNoTracking().Where(s => s.ReleasedAt == null).Select(s => new { s.Id, s.JiraConnectionId, s.ClientId }).ToListAsync(ct);
            var ids = spaces.Select(s => s.Id).ToList();
            var states = await db.JiraSpaceSyncStates.AsNoTracking().Where(s => ids.Contains(s.ClientJiraSpaceId)).ToDictionaryAsync(s => s.ClientJiraSpaceId, ct);
            var rows = new List<object>();
            foreach (var c in connections)
            {
                var mine = spaces.Where(s => s.JiraConnectionId == c.Id).ToList();
                var st = mine.Select(s => states.GetValueOrDefault(s.Id)).ToList();
                rows.Add(Dto(c, await secrets.HasCredentialAsync(c, ct), discovered.GetValueOrDefault(c.Id), mine.Count, mine.Select(s => s.ClientId).Distinct().Count(), st.Max(s => s?.LastSuccessAt),
                    Health(c.IsEnabled, c.LastTestOk, st.Select(s => s?.LastStatus))));
            }
            return Results.Ok(new
            {
                summary = new { total = connections.Count, active = connections.Count(c => c.IsEnabled), spacesDiscovered = discovered.Values.Sum(), lastGlobalSync = states.Values.Max(s => s.LastSuccessAt) },
                syncEnabled = options.Value.Enabled && options.Value.WorkerSeconds > 0,
                instances = await db.JiraInstances.AsNoTracking().Where(i => i.IsActive && i.Kind == JiraInstanceKind.CustomerCloud).Select(i => new { i.Id, i.Name, i.ApprovedHost }).ToListAsync(ct),
                connections = rows
            });
        });

        g.MapPost("/jira-connections", async (ConnectionInput i, HubDbContext db, UserContext me, JiraSecretStore secrets, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var check = new Check();
            Validate(check, secrets, i, out var site);
            ValidateCredential(check, i.SecretProvider ?? JiraSecretProvider.DataProtected, i.ApiToken, i.SecretVariable);
            var instance = i.JiraInstanceId ?? await db.JiraInstances.AsNoTracking().Where(x => x.Kind == JiraInstanceKind.CustomerCloud && x.IsActive).Select(x => (long?)x.Id).FirstOrDefaultAsync(ct);
            if (instance is null || !await db.JiraInstances.AnyAsync(x => x.Id == instance && x.Kind == JiraInstanceKind.CustomerCloud, ct)) check.Add("jiraInstanceId", "Select the Customer Cloud Jira instance.");
            if (site is not null && await db.JiraConnections.AnyAsync(c => c.SiteUrl == site, ct)) check.Add("siteUrl", "This Jira site already has a connection.");
            if (await db.JiraConnections.AnyAsync(c => c.Name == i.Name!.Trim(), ct)) check.Add("name", "This name is already used.");
            check.ThrowIfAny();
            var c = new JiraConnection { Name = i.Name!.Trim(), SiteUrl = site!, AuthMode = i.AuthMode!.Value, AccountEmail = i.AccountEmail!.Trim(), CloudId = Text.Clean(i.CloudId), JiraInstanceId = instance!.Value, SecretProvider = i.SecretProvider ?? JiraSecretProvider.DataProtected };
            if (!string.IsNullOrWhiteSpace(i.DetailFieldNames)) c.DetailFieldNames = i.DetailFieldNames.Trim();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            db.JiraConnections.Add(c);
            await db.SaveChangesAsync(ct);
            await secrets.SetAsync(c, i.SecretProvider ?? JiraSecretProvider.DataProtected, i.ApiToken?.Trim(), i.SecretVariable, ct);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.Created($"/api/v1/admin/jira-connections/{c.Id}", new { c.Id });
        });

        g.MapPut("/jira-connections/{id:long}", async (long id, ConnectionInput i, HttpContext ctx, HubDbContext db, UserContext me, JiraSecretStore secrets, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var c = await db.JiraConnections.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira connection");
            db.ExpectVersion(ctx, c);
            var check = new Check();
            Validate(check, secrets, i, out var site);
            if (site is not null && await db.JiraConnections.AnyAsync(x => x.SiteUrl == site && x.Id != id, ct)) check.Add("siteUrl", "This Jira site already has a connection.");
            if (await db.JiraConnections.AnyAsync(x => x.Name == i.Name!.Trim() && x.Id != id, ct)) check.Add("name", "This name is already used.");
            // Issue and project ids belong to one site; moving the connection would attach them to the wrong issues.
            if (site != c.SiteUrl && await db.JiraCaseMappings.IgnoreQueryFilters().AnyAsync(m => m.JiraConnectionId == id, ct)) check.Add("siteUrl", "Cases were imported from this site, so its address cannot change. Create a new connection.");
            check.ThrowIfAny();
            c.Name = i.Name!.Trim(); c.SiteUrl = site!; c.AuthMode = i.AuthMode!.Value; c.AccountEmail = i.AccountEmail!.Trim(); c.CloudId = Text.Clean(i.CloudId);
            if (!string.IsNullOrWhiteSpace(i.DetailFieldNames)) c.DetailFieldNames = i.DetailFieldNames.Trim();
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/jira-connections/{id:long}/enabled", async (long id, EnabledInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var c = await db.JiraConnections.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira connection");
            db.AuditReason = Rules.RequireReason(i.Reason, "reason", i.Enabled ? "why the connection is enabled" : "why the connection is disabled");
            c.IsEnabled = i.Enabled;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapPost("/jira-connections/{id:long}/credentials", async (long id, CredentialInput i, HubDbContext db, UserContext me, JiraSecretStore secrets, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var c = await db.JiraConnections.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira connection");
            var check = new Check();
            ValidateCredential(check, i.SecretProvider ?? JiraSecretProvider.DataProtected, i.ApiToken, i.SecretVariable);
            check.Text("accountEmail", i.AccountEmail, 254, "the Atlassian account e-mail");
            check.ThrowIfAny();
            if (Text.Clean(i.AccountEmail) is { } mail) c.AccountEmail = mail;
            await secrets.SetAsync(c, i.SecretProvider ?? JiraSecretProvider.DataProtected, i.ApiToken?.Trim(), i.SecretVariable, ct);
            c.LastTestOk = null;
            db.AuditReason = "API token rotated";
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Each step separately, so the page says what works. Messages come from JiraApiException and hold no secret.
        g.MapPost("/jira-connections/{id:long}/test", async (long id, HubDbContext db, UserContext me, JiraSecretStore secrets, IJiraApiClient jira, TimeProvider clock, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var c = await db.JiraConnections.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira connection");
            var watch = Stopwatch.StartNew();
            var steps = new List<TestStep>();
            async Task<T?> Step<T>(string name, Func<Task<T>> call, Func<T, string> detail) where T : class
            {
                try { var r = await call(); steps.Add(new(name, true, detail(r))); return r; }
                catch (JiraApiException ex) { steps.Add(new(name, false, ex.Message)); return null; }
            }
            var cloud = await Step("Site reachability", async () => await jira.GetCloudIdAsync(c.SiteUrl, ct) ?? "", id => id.Length > 0 ? "The site answered." : "The site answered without a Cloud ID.");
            if (!string.IsNullOrEmpty(cloud) && string.IsNullOrEmpty(c.CloudId)) c.CloudId = cloud;
            JiraAuth? auth = null;
            try { auth = await secrets.AuthAsync(c, ct); }
            catch (JiraApiException ex) { steps.Add(new("Authentication", false, ex.Message)); }
            if (auth is not null)
            {
                var myself = await Step("Authentication", () => jira.GetMyselfAsync(auth, ct), m => $"Signed in as {m.DisplayName ?? "the configured account"}.");
                if (myself is not null)
                {
                    c.AccountTimeZone = myself.TimeZone;
                    var projects = await Step("Project discovery", () => jira.GetProjectsAsync(auth, ct), p => $"{p.Count} accessible space(s).");
                    if (projects is { Count: > 0 })
                        await Step("Issue search", () => jira.SearchAsync(auth, JiraQueries.Issues(projects[0].Key, null, null, null, newestFirst: true), [], null, 1, ct), _ => "Issue search is allowed.");
                    else if (projects is not null) steps.Add(new("Issue search", false, "The account sees no space, so issue search could not be tested."));
                }
            }
            watch.Stop();
            var ok = steps.Count > 0 && steps.All(s => s.Passed);
            var now = clock.GetUtcNow();
            c.LastTestAt = now; c.LastTestOk = ok; c.LastTestDurationMs = (int)watch.ElapsedMilliseconds;
            if (ok) c.LastSuccessfulTestAt = now;
            c.LastTestJson = JsonSerializer.Serialize(steps);
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { ok, durationMs = c.LastTestDurationMs, steps });
        });

        // Discovery lists spaces and refreshes names; it never assigns a space to a client.
        g.MapPost("/jira-connections/{id:long}/discover", async (long id, HubDbContext db, UserContext me, JiraSecretStore secrets, IJiraApiClient jira, TimeProvider clock, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var c = await db.JiraConnections.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira connection");
            var now = clock.GetUtcNow();
            c.LastDiscoveryAt = now;
            try
            {
                var auth = await secrets.AuthAsync(c, ct);
                var projects = await jira.GetProjectsAsync(auth, ct);
                var rows = await db.JiraDiscoveredSpaces.Where(s => s.JiraConnectionId == id).ToDictionaryAsync(s => s.JiraProjectId, ct);
                foreach (var p in projects)
                {
                    if (!rows.TryGetValue(p.Id, out var row)) db.JiraDiscoveredSpaces.Add(row = new JiraDiscoveredSpace { JiraConnectionId = id, JiraProjectId = p.Id, FirstSeenAt = now });
                    row.ProjectKey = p.Key; row.ProjectName = p.Name; row.LastSeenAt = now; row.Missing = false;
                }
                var seen = projects.Select(p => p.Id).ToHashSet();
                foreach (var gone in rows.Values.Where(r => !seen.Contains(r.JiraProjectId))) gone.Missing = true;
                foreach (var s in await db.ClientJiraSpaces.IgnoreQueryFilters().Where(s => s.JiraConnectionId == id && s.ReleasedAt == null).ToListAsync(ct))
                    if (projects.FirstOrDefault(p => p.Id == s.JiraProjectId) is { } p && (p.Key != s.ProjectKey || p.Name != s.ProjectName)) { s.ProjectKey = p.Key; s.ProjectName = p.Name; }
                c.LastDiscoveryError = null;
                await db.SaveChangesAsync(ct);
                return Results.Ok(new { discovered = projects.Count, missing = rows.Values.Count(r => r.Missing) });
            }
            catch (JiraApiException ex)
            {
                c.LastDiscoveryError = JiraCaseBridge.Trim(ex.Message, 1000);
                await db.SaveChangesAsync(ct);
                throw new ValidationException("discovery", ex.Message);
            }
        });

        g.MapGet("/jira-connections/{id:long}/spaces", async (long id, string? q, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var query = db.JiraDiscoveredSpaces.AsNoTracking().Where(s => s.JiraConnectionId == id);
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(s => s.ProjectKey.Contains(q) || s.ProjectName.Contains(q));
            var found = await query.OrderBy(s => s.ProjectKey).Take(500).ToListAsync(ct);
            return Results.Ok(await SpaceRowsAsync(db, me, id, found, ct));
        });

        // Explicit reassignment: the old mapping is released, the new client owns future issues, and existing cases stay where they are.
        g.MapPost("/jira-connections/{id:long}/spaces/{projectId}/reassign", async (long id, string projectId, ReassignInput i, HubDbContext db, HubAccess access, TimeProvider clock, CancellationToken ct) =>
        {
            RequireAdmin(access.Me);
            var reason = Rules.RequireReason(i.Reason, "reason", "why the space changes client");
            var current = await db.ClientJiraSpaces.IgnoreQueryFilters().FirstOrDefaultAsync(s => s.JiraConnectionId == id && s.JiraProjectId == projectId && s.ReleasedAt == null, ct) ?? throw new NotFoundException("The assigned space");
            if (i.ToClientId is not { } target || !await db.Clients.AnyAsync(c => c.Id == target, ct)) throw new ValidationException("toClientId", "Select the new client.");
            if (target == current.ClientId) throw new ValidationException("toClientId", "The space already belongs to this client.");
            access.RequireIn(RightKeys.Structure, RightKeys.Coordinate, ResourceContext.ForRecord(current.ClientId, null));
            access.RequireIn(RightKeys.Structure, RightKeys.Coordinate, ResourceContext.ForRecord(target, null));
            var now = clock.GetUtcNow();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            current.ReleasedAt = now; current.ReleaseReason = reason; current.IsEnabled = false;
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            db.ClientJiraSpaces.Add(new ClientJiraSpace { ClientId = target, JiraConnectionId = id, JiraProjectId = projectId, ProjectKey = current.ProjectKey, ProjectName = current.ProjectName });
            db.JiraIntegrationIssues.Add(new JiraIntegrationIssue { Type = JiraIssueType.SpaceReassignment, Status = JiraIssueStatus.Resolved, Fingerprint = $"reassign:{id}:{projectId}:{now.ToUnixTimeSeconds()}", JiraConnectionId = id, ClientId = target, ProjectKey = current.ProjectKey, JiraProjectId = projectId,
                Description = $"Space {current.ProjectKey} moved from client {current.ClientId} to client {target}. Existing cases stayed with the earlier client.", SuggestedAction = "Issues of existing cases appear here if they change again.", LastSeenAt = now, Resolution = "Reassigned", ResolutionNote = reason, ResolvedById = access.Me.UserId, ResolvedAt = now });
            db.AuditReason = reason;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });

        // ---- user and workflow mappings ----
        g.MapGet("/jira-connections/{id:long}/users", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            return Results.Ok(await db.JiraUserMappings.AsNoTracking().Where(u => u.JiraConnectionId == id).OrderBy(u => u.TioUserId != null).ThenBy(u => u.JiraDisplayName)
                .Select(u => new { u.Id, u.JiraAccountId, u.JiraDisplayName, u.TioUserId, tioUser = u.TioUser == null ? null : u.TioUser.DisplayName, u.ClientContactId, u.IsInternalMember, u.LastSeenAt, version = Convert.ToBase64String(u.RowVersion) }).ToListAsync(ct));
        });
        // A79: who a Jira user can represent: the contacts of the clients using this connection.
        g.MapGet("/jira-connections/{id:long}/client-contacts", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var clients = await db.ClientJiraSpaces.AsNoTracking().Where(s => s.JiraConnectionId == id).Select(s => s.ClientId).Distinct().ToListAsync(ct);
            return Results.Ok(await db.Contacts.AsNoTracking().Where(k => clients.Contains(k.ClientId) && k.ArchivedAt == null)
                .Join(db.Clients.AsNoTracking(), k => k.ClientId, c => c.Id, (k, c) => new { k.Id, k.Name, k.Role, clientCode = c.Code }).OrderBy(k => k.clientCode).ThenBy(k => k.Name).ToListAsync(ct));
        });
        g.MapPut("/jira-user-mappings/{id:long}", async (long id, UserMappingInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var m = await db.JiraUserMappings.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira user mapping");
            if (i.TioUserId is { } uid && !await db.Users.AnyAsync(u => u.Id == uid && u.IsActive, ct)) throw new ValidationException("tioUserId", "Select an active hub user.");
            if ((i.TioUserId is not null ? 1 : 0) + (i.ClientContactId is not null ? 1 : 0) + (i.IsInternalMember ? 1 : 0) > 1) throw new ValidationException("clientContactId", "Map this Jira user to one of: a hub user, a client contact or a Vitronic team member.");
            if (i.ClientContactId is { } contact && !await db.Contacts.AnyAsync(k => k.Id == contact && k.ArchivedAt == null, ct)) throw new ValidationException("clientContactId", "Select a current client contact.");
            m.TioUserId = i.TioUserId;
            m.ClientContactId = i.ClientContactId;
            m.IsInternalMember = i.IsInternalMember;
            await db.SaveChangesAsync(ct);
            // Issues of this person are applied again at the next run, without a Jira request.
            await db.JiraCaseMappings.IgnoreQueryFilters().Where(x => x.JiraConnectionId == m.JiraConnectionId && x.AssigneeAccountId == m.JiraAccountId).ExecuteUpdateAsync(u => u.SetProperty(x => x.AppliedAssigneeAccountId, (string?)null), ct);
            return Results.NoContent();
        });

        g.MapGet("/jira-connections/{id:long}/statuses", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var spaces = await db.JiraDiscoveredSpaces.AsNoTracking().Where(s => s.JiraConnectionId == id).Select(s => new { s.JiraProjectId, s.ProjectKey }).ToDictionaryAsync(s => s.JiraProjectId, s => s.ProjectKey, ct);
            var rows = await db.JiraWorkflowStatusMappings.AsNoTracking().Where(s => s.JiraConnectionId == id).OrderBy(s => s.JiraProjectId).ThenBy(s => s.JiraStatusName).ToListAsync(ct);
            var targets = await db.LookupValues.AsNoTracking().Where(l => l.ListName == CaseStatuses.List && !l.IsRetired).OrderBy(l => l.SortOrder).Select(l => new { l.Code, l.Label, behavior = l.Category }).ToListAsync(ct);
            return Results.Ok(new { targets, rows = rows.Select(s => new { s.Id, s.JiraProjectId, projectKey = spaces.GetValueOrDefault(s.JiraProjectId), s.JiraStatusId, s.JiraStatusName, s.JiraStatusCategory, targetStatus = s.TargetStatusCode }) });
        });
        // Workflow discovery lists a project's statuses, unmapped. Nothing is mapped by name or category.
        g.MapPost("/jira-connections/{id:long}/statuses/discover", async (long id, HubDbContext db, UserContext me, JiraSecretStore secrets, IJiraApiClient jira, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var c = await db.JiraConnections.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The Jira connection");
            var projects = await db.ClientJiraSpaces.IgnoreQueryFilters().AsNoTracking().Where(s => s.JiraConnectionId == id && s.ReleasedAt == null).Select(s => s.JiraProjectId).ToListAsync(ct);
            var existing = await db.JiraWorkflowStatusMappings.Where(s => s.JiraConnectionId == id).ToListAsync(ct);
            var added = 0;
            try
            {
                var auth = await secrets.AuthAsync(c, ct);
                foreach (var project in projects)
                    foreach (var s in await jira.GetProjectStatusesAsync(auth, project, ct))
                    {
                        var row = existing.FirstOrDefault(x => x.JiraProjectId == project && x.JiraStatusId == s.Id);
                        if (row is null) { db.JiraWorkflowStatusMappings.Add(new JiraWorkflowStatusMapping { JiraConnectionId = id, JiraProjectId = project, JiraStatusId = s.Id, JiraStatusName = s.Name, JiraStatusCategory = s.Category }); added++; }
                        else { row.JiraStatusName = s.Name; row.JiraStatusCategory = s.Category; }
                    }
            }
            catch (JiraApiException ex) { throw new ValidationException("discovery", ex.Message); }
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { added });
        });
        g.MapPut("/jira-status-mappings/{id:long}", async (long id, StatusMappingInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var m = await db.JiraWorkflowStatusMappings.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The status mapping");
            if (i.TargetStatus is { } t && !await db.LookupValues.AnyAsync(l => l.ListName == CaseStatuses.List && l.Code == t && !l.IsRetired, ct))
                throw new ValidationException("targetStatus", "Select an active case status.");
            m.TargetStatusCode = i.TargetStatus;
            await db.SaveChangesAsync(ct);
            await db.JiraCaseMappings.IgnoreQueryFilters().Where(x => x.JiraConnectionId == m.JiraConnectionId && x.StatusId == m.JiraStatusId && (m.JiraProjectId == "" || x.JiraProjectId == m.JiraProjectId)).ExecuteUpdateAsync(u => u.SetProperty(x => x.AppliedStatusId, (string?)null), ct);
            return Results.NoContent();
        });

        // ---- monitoring ----
        g.MapGet("/jira-sync/runs", async (long? connectionId, long? clientId, long? spaceId, JiraSyncStatus? status, int? page, int? pageSize, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var q = db.JiraSyncRuns.AsNoTracking();
            if (connectionId is not null) q = q.Where(r => r.JiraConnectionId == connectionId);
            if (clientId is not null) q = q.Where(r => r.ClientId == clientId);
            if (spaceId is not null) q = q.Where(r => r.ClientJiraSpaceId == spaceId);
            if (status is not null) q = q.Where(r => r.Status == status);
            return Results.Ok(await q.OrderByDescending(r => r.StartedAt).ThenByDescending(r => r.Id).ToPagedAsync(PageQuery.From(page, pageSize), ct));
        });

        g.MapGet("/jira-sync/health", async (long? connectionId, HubDbContext db, UserContext me, TimeProvider clock, IOptions<JiraOptions> options, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var since = clock.GetUtcNow().AddHours(-24);
            var runs = db.JiraSyncRuns.AsNoTracking().Where(r => r.StartedAt >= since && (connectionId == null || r.JiraConnectionId == connectionId));
            var day = await runs.GroupBy(_ => 1).Select(g => new { created = g.Sum(r => r.CasesCreated), updated = g.Sum(r => r.CasesUpdated), comments = g.Sum(r => r.CommentsImported), activities = g.Sum(r => r.ActivitiesImported), failed = g.Sum(r => r.FailedRecords), issues = g.Sum(r => r.IssuesRetrieved), count = g.Count() }).FirstOrDefaultAsync(ct);
            var finished = await runs.Where(r => r.EndedAt != null).OrderByDescending(r => r.StartedAt).Take(50).Select(r => new { r.StartedAt, r.EndedAt }).ToListAsync(ct);
            var spaces = await db.ClientJiraSpaces.AsNoTracking().Where(s => s.ReleasedAt == null && (connectionId == null || s.JiraConnectionId == connectionId)).Select(s => s.Id).ToListAsync(ct);
            var states = await db.JiraSpaceSyncStates.AsNoTracking().Where(s => spaces.Contains(s.ClientJiraSpaceId)).ToListAsync(ct);
            var open = await db.JiraIntegrationIssues.AsNoTracking().Where(i => i.Status == JiraIssueStatus.Open && (connectionId == null || i.JiraConnectionId == connectionId)).GroupBy(i => i.Type).Select(g => new { type = g.Key, n = g.Count() }).ToListAsync(ct);
            int Open(params JiraIssueType[] t) => open.Where(o => t.Contains(o.type)).Sum(o => o.n);
            var lastRunFailed = states.Any(s => s.LastStatus == JiraSyncStatus.Failed);
            string Area(int problems) => lastRunFailed ? "Error" : problems > 0 ? "Warning" : states.Count == 0 || states.All(s => s.LastStatus is null) ? "NotConfigured" : "Healthy";
            return Results.Ok(new
            {
                syncEnabled = options.Value.Enabled && options.Value.WorkerSeconds > 0,
                issueSync = Area(Open(JiraIssueType.FailedIssueImport)), commentSync = Area(Open(JiraIssueType.FailedCommentImport)), activitySync = Area(Open(JiraIssueType.FailedActivityImport, JiraIssueType.MissingUserMapping)),
                lastFullReconciliation = states.Max(s => s.LastFullAt), lastSuccess = states.Max(s => s.LastSuccessAt),
                last24h = new { created = day?.created ?? 0, updated = day?.updated ?? 0, comments = day?.comments ?? 0, activities = day?.activities ?? 0, failed = day?.failed ?? 0, issues = day?.issues ?? 0, runs = day?.count ?? 0 },
                averageDurationSeconds = finished.Count == 0 ? (double?)null : Math.Round(finished.Average(r => (r.EndedAt!.Value - r.StartedAt).TotalSeconds), 1),
                pendingConflicts = open.Sum(o => o.n), openByType = open
            });
        });

        // ---- import review and conflict resolution ----
        g.MapGet("/jira-issues", async (JiraIssueStatus? status, JiraIssueType? type, long? connectionId, long? clientId, int? page, int? pageSize, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            RequireAdmin(me);
            var q = db.JiraIntegrationIssues.AsNoTracking();
            if (status is not null) q = q.Where(i => i.Status == status);
            if (type is not null) q = q.Where(i => i.Type == type);
            if (connectionId is not null) q = q.Where(i => i.JiraConnectionId == connectionId);
            if (clientId is not null) q = q.Where(i => i.ClientId == clientId);
            var paged = await q.OrderByDescending(i => i.LastSeenAt).ThenByDescending(i => i.Id).ToPagedAsync(PageQuery.From(page, pageSize), ct);
            var clientIds = paged.Items.Select(i => i.ClientId).OfType<long>().Distinct().ToList();
            var clients = await db.Clients.AsNoTracking().Where(c => clientIds.Contains(c.Id)).Select(c => new { c.Id, c.Code }).ToDictionaryAsync(c => c.Id, c => c.Code, ct);
            var connectionIds = paged.Items.Select(i => i.JiraConnectionId).Distinct().ToList();
            var connections = await db.JiraConnections.AsNoTracking().Where(c => connectionIds.Contains(c.Id)).Select(c => new { c.Id, c.Name }).ToDictionaryAsync(c => c.Id, c => c.Name, ct);
            var caseIds = paged.Items.SelectMany(i => new[] { i.CaseId, i.CandidateCaseId }).OfType<long>().Distinct().ToList();
            // A candidate of a client outside the caller's scope stays hidden: the query filter leaves it out.
            var cases = await db.Cases.AsNoTracking().Where(c => caseIds.Contains(c.Id)).Select(c => new { c.Id, c.Ref, c.Title }).ToDictionaryAsync(c => c.Id, ct);
            return Results.Ok(new
            {
                paged.Page, paged.PageSize, paged.TotalCount,
                items = paged.Items.Select(i => new
                {
                    i.Id, i.Type, i.Status, connection = connections.GetValueOrDefault(i.JiraConnectionId), i.JiraConnectionId, i.ProjectKey, i.IssueKey, i.ClientId, client = i.ClientId is { } cid ? clients.GetValueOrDefault(cid) : null,
                    caseRef = i.CaseId is { } a ? cases.GetValueOrDefault(a) : null, candidate = i.CandidateCaseId is { } b ? cases.GetValueOrDefault(b) : null, i.Subject, i.Description, i.SuggestedAction, i.LastSeenAt, i.Occurrences, i.Resolution, i.ResolutionNote, i.ResolvedAt,
                    actions = ActionsFor(i.Type, i.Status)
                })
            });
        });

        g.MapPost("/jira-issues/{id:long}/resolve", async (long id, ResolveInput input, HubDbContext db, HubAccess access, JiraCaseBridge bridge, TimeProvider clock, CancellationToken ct) =>
        {
            RequireAdmin(access.Me);
            var issue = await db.JiraIntegrationIssues.FirstOrDefaultAsync(i => i.Id == id, ct) ?? throw new NotFoundException("The integration issue");
            if (issue.Status != JiraIssueStatus.Open) throw new ConflictException("This issue was already resolved.");
            var action = input.Action ?? "";
            if (!ActionsFor(issue.Type, issue.Status).Contains(action)) throw new ValidationException("action", "This action does not apply to this issue.");
            var note = Rules.RequireReason(input.Note, "note", "the reason for this decision");
            if (issue.ClientId is { } clientId) access.RequireIn(RightKeys.Cases, RightKeys.Coordinate, ResourceContext.ForRecord(clientId, null));
            var now = clock.GetUtcNow();
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var space = issue.JiraProjectId is null ? null : await db.ClientJiraSpaces.FirstOrDefaultAsync(s => s.JiraConnectionId == issue.JiraConnectionId && s.JiraProjectId == issue.JiraProjectId && s.ReleasedAt == null, ct);
            if (action == "Adopt")
            {
                if (space is null || issue.JiraIssueId is null || issue.IssueKey is null) throw new ValidationException("action", "The space of this issue is no longer assigned.");
                var conn = await db.JiraConnections.AsNoTracking().FirstAsync(c => c.Id == issue.JiraConnectionId, ct);
                var caseId = input.CaseId ?? issue.CandidateCaseId ?? throw new ValidationException("caseId", "Select the case to adopt.");
                var c = await db.Cases.FirstOrDefaultAsync(x => x.Id == caseId, ct) ?? throw new NotFoundException("The case");
                // Never by title: the case must already reference this issue, and belong to the space's client.
                var referenced = await db.JiraReferences.AnyAsync(j => j.CaseId == caseId && j.JiraInstanceId == conn.JiraInstanceId && j.IssueKey == issue.IssueKey && j.RemovedAt == null, ct);
                if (!referenced || c.ClientId != space.ClientId) throw new ValidationException("caseId", "Only a case of this client that references this Jira issue can be adopted.");
                if (await db.JiraCaseMappings.AnyAsync(m => m.CaseId == caseId, ct)) throw new ConflictException("This case is already synchronized from another Jira issue.");
                if (await db.JiraCaseMappings.AnyAsync(m => m.JiraConnectionId == conn.Id && m.JiraIssueId == issue.JiraIssueId, ct)) throw new ConflictException("This Jira issue is already synchronized.");
                await bridge.AdoptAsync(conn, space, c, issue.JiraIssueId, issue.IssueKey, now, ct);
            }
            issue.Status = action == "Dismiss" ? JiraIssueStatus.Dismissed : JiraIssueStatus.Resolved;
            issue.Resolution = action; issue.ResolutionNote = note; issue.ResolvedById = access.Me.UserId; issue.ResolvedAt = now;
            db.AuditReason = note;
            await db.SaveChangesAsync(ct);
            // The next run reads the whole space, so the decision takes effect without waiting for the issue to change in Jira.
            if (space is not null && action is "Adopt" or "CreateNew")
                await db.JiraSpaceSyncStates.Where(s => s.ClientJiraSpaceId == space.Id).ExecuteUpdateAsync(u => u.SetProperty(s => s.ForceFullNext, true), ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
    }

    public static string[] ActionsFor(JiraIssueType type, JiraIssueStatus status) => status != JiraIssueStatus.Open ? [] : type switch
    {
        JiraIssueType.DuplicateCaseCandidate => ["Adopt", "CreateNew", "Ignore"],
        JiraIssueType.ClientOwnershipConflict => ["Ignore", "Dismiss"],
        JiraIssueType.MissingCaseInformation => ["Ignore", "Dismiss"],
        _ => ["Dismiss"]
    };

    /// <summary>Discovered spaces with their owner. Another client's name is only shown to someone who can see that client.</summary>
    public static async Task<List<object>> SpaceRowsAsync(HubDbContext db, UserContext me, long connectionId, List<JiraDiscoveredSpace> found, CancellationToken ct, long? forClientId = null)
    {
        var projects = found.Select(s => s.JiraProjectId).ToList();
        var owners = await db.ClientJiraSpaces.IgnoreQueryFilters().AsNoTracking().Where(s => s.JiraConnectionId == connectionId && s.ReleasedAt == null && projects.Contains(s.JiraProjectId))
            .Select(s => new { s.Id, s.JiraProjectId, s.ClientId, s.IsEnabled, code = s.Client!.Code }).ToListAsync(ct);
        var ids = owners.Select(o => o.Id).ToList();
        var states = await db.JiraSpaceSyncStates.AsNoTracking().Where(s => ids.Contains(s.ClientJiraSpaceId)).ToDictionaryAsync(s => s.ClientJiraSpaceId, ct);
        var counts = await db.JiraCaseMappings.IgnoreQueryFilters().AsNoTracking().Where(m => ids.Contains(m.ClientJiraSpaceId) && m.CaseId != null).GroupBy(m => m.ClientJiraSpaceId).Select(g => new { g.Key, n = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
        return found.Select(s =>
        {
            var owner = owners.FirstOrDefault(o => o.JiraProjectId == s.JiraProjectId);
            var state = owner is null ? null : states.GetValueOrDefault(owner.Id);
            var visible = owner is not null && me.HasClient(owner.ClientId);
            return (object)new
            {
                s.Id, s.JiraProjectId, s.ProjectKey, s.ProjectName, s.Missing, s.LastSeenAt,
                assignedClientId = visible ? owner!.ClientId : (long?)null, assignedClient = owner is null ? null : visible ? owner.code : "Another client",
                availability = s.Missing ? "NotAccessible" : owner is null ? "Available" : owner.ClientId == forClientId ? "AlreadyAssigned" : "Conflict",
                state = owner is null ? "NotConfigured" : owner.IsEnabled ? "Enabled" : "Disabled",
                lastSync = state?.LastSuccessAt, health = state?.LastStatus, cases = owner is null ? 0 : counts.GetValueOrDefault(owner.Id)
            };
        }).ToList();
    }
}
