using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Reporting;

public sealed record SearchHit(string Group, string Title, string Subtitle, string Link);

public static class SearchExportEndpoints
{
    public static void MapSearchExportEndpoints(this RouteGroupBuilder api)
    {
        // Global search (UX-01). Every query runs through scope filters; technical values are searched only with the grant.
        api.MapGet("/search", async (string q, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var t = (q ?? "").Trim();
            if (t.Length < 2) return Results.Ok(Array.Empty<SearchHit>());
            const int n = 6;
            var hits = new List<SearchHit>();
            hits.AddRange((await db.Clients.AsNoTracking().Where(c => c.Name.Contains(t) || c.Code.Contains(t)).OrderBy(c => c.Name).Take(n).Select(c => new { c.Id, c.Code, c.Name, c.Country }).ToListAsync(ct))
                .Select(c => new SearchHit("Clients", $"{c.Code} · {c.Name}", c.Country ?? "Country unknown", $"/clients/{c.Id}")));
            hits.AddRange((await db.Regions.AsNoTracking().Where(r => r.Name.Contains(t) || r.Code.Contains(t)).Take(n).Select(r => new { r.Id, r.Code, r.Name, client = r.Client!.Code }).ToListAsync(ct))
                .Select(r => new SearchHit("Regions", $"{r.Code} · {r.Name}", r.client, $"/regions/{r.Id}")));
            hits.AddRange((await db.Environments.AsNoTracking().Where(e => e.Name.Contains(t) || e.Client!.Code.Contains(t)).Take(n).Select(e => new { e.Id, e.Name, e.Type, client = e.Client!.Code, region = e.Region == null ? null : e.Region.Code }).ToListAsync(ct))
                .Select(e => new SearchHit("Environments", e.Name, $"{e.client}{(e.region is null ? "" : " / " + e.region)} · {e.Type}", $"/environments/{e.Id}")));
            hits.AddRange((await db.Installations.AsNoTracking().Where(i => i.InstanceName.Contains(t) || i.Product!.Code.Contains(t)).Take(n).Select(i => new { i.Id, i.InstanceName, product = i.Product!.Code, env = i.Environment!.Name, client = i.Environment.Client!.Code }).ToListAsync(ct))
                .Select(i => new SearchHit("Installations", $"{i.product} · {i.InstanceName}", $"{i.client} / {i.env}", $"/installations/{i.Id}")));
            hits.AddRange((await db.Assets.AsNoTracking().Where(a => a.Name.Contains(t)).Take(n).Select(a => new { a.Id, a.Name, a.Type, env = a.Environment!.Name, client = a.Environment.Client!.Code }).ToListAsync(ct))
                .Select(a => new SearchHit("Assets", a.Name, $"{a.Type} · {a.client} / {a.env}", $"/assets/{a.Id}")));
            hits.AddRange((await db.Projects.AsNoTracking().Where(p => p.Name.Contains(t) || p.Code.Contains(t)).Take(n).Select(p => new { p.Id, p.Code, p.Name, client = p.Client!.Code }).ToListAsync(ct))
                .Select(p => new SearchHit("Projects", $"{p.Code} · {p.Name}", p.client, $"/projects/{p.Id}")));
            var key = t.ToUpperInvariant();
            hits.AddRange((await db.Cases.AsNoTracking().Where(c => c.Ref.Contains(t) || c.Title.Contains(t) || c.JiraReferences.Any(j => j.RemovedAt == null && j.IssueKey == key)).OrderByDescending(c => c.Id).Take(n)
                .Select(c => new { c.Id, c.Ref, c.Title, c.Status, client = c.Client == null ? "Internal" : c.Client.Code, jira = c.JiraReferences.Where(j => j.RemovedAt == null && j.IssueKey == key).Select(j => j.JiraInstance!.Name + " " + j.IssueKey).FirstOrDefault() }).ToListAsync(ct))
                .Select(c => new SearchHit(c.jira is null ? "Cases" : "Jira references", $"{c.Ref} · {c.Title}", c.jira is null ? $"{c.client} · {c.Status}" : $"{c.jira} · {c.client}", $"/cases/{c.Id}")));
            hits.AddRange((await db.Commitments.AsNoTracking().Where(c => c.Ref.Contains(t) || c.Description.Contains(t)).Take(n).Select(c => new { c.Id, c.Ref, c.Description, c.Status }).ToListAsync(ct))
                .Select(c => new SearchHit("Commitments", $"{c.Ref} · {c.Description}", c.Status.ToString(), $"/commitments/{c.Id}")));
            hits.AddRange((await db.Escalations.AsNoTracking().Where(e => e.Ref.Contains(t) || e.Title.Contains(t) || (e.ChannelReference != null && e.ChannelReference.Contains(t))).OrderByDescending(e => e.Id).Take(n)
                    .Select(e => new { e.Id, e.Ref, e.Title, e.Status, code = e.Client!.Code }).ToListAsync(ct))
                .Select(e => new SearchHit("Escalations", $"{e.Ref} · {e.Title}", $"{e.code} · {e.Status}", $"/escalations/{e.Id}")));
            hits.AddRange((await db.Contracts.AsNoTracking().Where(c => c.Ref.Contains(t) || c.Title.Contains(t) || (c.ContractReference != null && c.ContractReference.Contains(t))).Take(n)
                    .Select(c => new { c.Id, c.Ref, c.Title, c.Status, code = c.Client!.Code }).ToListAsync(ct))
                .Select(c => new SearchHit("Contracts", $"{c.Ref} · {c.Title}", $"{c.code} · {c.Status}", $"/contracts/{c.Id}")));
            return Results.Ok(hits);
        }).WithTags("Search");

        // DAS-09 / NFR-10: CSV exports need the Export grant, use the same filters and scope as the screen, and are logged and audited.
        api.MapGet("/export/{report}", async (string report, HttpContext ctx, HubDbContext db, HubAccess access, HubSettings settings, FreshnessService fresh, Dashboard dash, TimeProvider clock, CancellationToken ct) =>
        {
            access.RequireBusiness();
            access.Me.RequireGrant(Grant.Export);
            var qsv = ctx.Request.Query;
            string? S(string k) => qsv.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v) ? v.ToString() : null;
            long? L(string k) => long.TryParse(S(k), out var x) ? x : null;
            bool? B(string k) => bool.TryParse(S(k), out var x) ? x : null;
            DateTimeOffset? D(string k) => DateTimeOffset.TryParse(S(k), out var x) ? x : null;
            T? E<T>(string k) where T : struct, Enum => Enum.TryParse<T>(S(k), true, out var x) ? x : null;
            var now = D("asOf") ?? clock.GetUtcNow();
            var zone = Zones.Find(S("timeZone")) ?? Zones.Find(access.Me.TimeZone) ?? TimeZoneInfo.Utc;
            var filters = string.Join("; ", qsv.Where(kv => kv.Key is not ("timeZone")).Select(kv => $"{kv.Key}={kv.Value}"));
            var days = await settings.UpcomingDaysAsync(ct);
            var tech = access.Me.SeesTechnical;
            byte[] file;
            int rows;
            switch (report.ToLowerInvariant())
            {
                case "cases":
                {
                    var policy = (await fresh.PoliciesAsync(ct)).GetValueOrDefault((RecordTypes.Case, ReviewScope.Record));
                    var f = new CaseFilter(L("clientId"), L("regionId"), L("environmentId"), L("productId"), L("teamId"), L("ownerId"), B("unassigned"), S("status"), E<Priority>("priority"), E<WorkScope>("scope"),
                        S("due"), B("waiting"), B("reviewOverdue"), B("stale"), S("jiraKey"), S("q"), D("createdFrom"), D("createdTo"), B("coverageGap"), B("deactivatedOwner"), S("country"));
                    var data = await CaseQuery.Apply(db.Cases.AsNoTracking(), f, now, days, policy, db, await settings.CoveragePrioritiesAsync(ct)).OrderBy(c => c.Id).Select(CaseEndpoints.Row(now, policy)).ToListAsync(ct);
                    rows = data.Count;
                    file = Csv.Build("Cases", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<CaseEndpoints.CaseRow>("Reference", "Hub case reference", r => r.Ref),
                        new("Title", "Case title", r => r.Title), new("Type", "Case type", r => r.Type), new("Scope", "Client-related or Internal", r => r.Scope),
                        new("Client", "Client alias; empty for internal work", r => r.ClientCode), new("Team", "Responsible team", r => r.TeamName),
                        new("Status", "Hub status (independent of Jira)", r => r.Status), new("Priority", "Priority", r => r.Priority),
                        new("Owner", "Accountable owner or Unassigned", r => r.OwnerName ?? "Unassigned"), new("Owner deactivated", "Owner account deactivated", r => r.OwnerDeactivated),
                        new("Waiting", "Recorded waiting reason; deadlines are not paused", r => r.WaitingReason), new("Next action", "Next action", r => r.NextAction),
                        new("Next review", "Next review time", r => r.NextReviewAt), new("Due", "Due time; empty = no deadline (not overdue)", r => r.DueAt),
                        new("Overdue", "Open with due time strictly before the evaluation time", r => r.Overdue), new("Stale", "Meaningful review older than policy or next review passed", r => r.Stale),
                        new("Jira keys", "Manual Jira references (instance + key)", r => string.Join(" ", r.JiraKeys)), new("Created", "Creation time", r => r.CreatedAt)], data);
                    break;
                }
                case "commitments":
                {
                    var f = new CommitmentFilter(L("clientId"), L("teamId"), L("ownerId"), E<WorkScope>("scope"), E<CommitmentType>("type"), S("status"), S("due"), B("late"), B("stale"), L("projectId"), L("caseId"), S("q"), D("completedFrom"), D("completedTo"), B("deactivatedOwner"), S("country"), L("productId"));
                    var data = await CommitmentQuery.Apply(db.Commitments.AsNoTracking(), f, now, days, db).OrderBy(c => c.CurrentDueAt).Select(CommitmentEndpoints.Row(now)).ToListAsync(ct);
                    rows = data.Count;
                    file = Csv.Build("Commitments", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<CommitmentEndpoints.CommitmentRow>("Reference", "Commitment reference", r => r.Ref), new("Description", "Promise", r => r.Description),
                        new("Type", "Recorded contractual deadlines are manual entries, not verified SLA results", r => r.Type), new("Status", "Open, Completed or Cancelled", r => r.Status),
                        new("Client", "Client alias; empty for internal", r => r.ClientCode), new("Owner", "Accountable owner", r => r.OwnerName),
                        new("Original deadline", "First recorded deadline", r => r.OriginalDueAt), new("Current deadline", "Deadline in force", r => r.CurrentDueAt),
                        new("Entry time zone", "Original IANA zone", r => r.TimeZone), new("Revisions", "Number of deadline revisions", r => r.RevisionCount),
                        new("Completed", "Completion time", r => r.CompletedAt), new("Completed late", "Derived: completion after the deadline in force", r => r.CompletedLate),
                        new("Overdue", "Open and deadline before evaluation time", r => r.Overdue)], data);
                    break;
                }
                case "contracts":
                {
                    var f = new ContractFilter(L("clientId"), E<ContractStatus>("status"), S("type"), S("renewal"), L("ownerId"), L("productId"), S("country"), S("q"), L("projectId"));
                    var data = (await ContractQuery.Apply(db.Contracts.AsNoTracking(), f, now, db).OrderBy(c => c.EndDate).Select(ContractEndpoints.ExportRow).ToListAsync(ct))
                        .Select(r => r with { RenewalState = ContractQuery.State(new Contract { Status = r.Status, EndDate = r.EndDate, NoticeDays = r.NoticeDays }, now) }).ToList();
                    rows = data.Count;
                    file = Csv.Build("Contracts", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<ContractEndpoints.ContractExport>("Reference", "Hub contract reference", r => r.Ref), new("Title", "Contract title", r => r.Title),
                        new("Contract reference", "Number on the contract document", r => r.ContractReference), new("Client", "Client alias", r => r.ClientCode),
                        new("Project", "Project the contract belongs to", r => r.ProjectCode), new("Type", "Contract type", r => r.Type), new("Status", "Draft, Active, Ended or Terminated", r => r.Status), new("Owner", "Contract owner", r => r.Owner),
                        new("Start", "Start date; empty = unknown", r => r.StartDate), new("End", "End date; empty = unknown", r => r.EndDate),
                        new("Notice days", "Notice period; empty = unknown", r => r.NoticeDays), new("Renewal terms", "Recorded renewal terms", r => r.RenewalTerms),
                        new("Renewal state", $"Derived for Active contracts; renewal due = notice deadline or end within {ContractQuery.RenewalWindowDays} days", r => r.RenewalState),
                        new("Support model", "Remote, on-site or hybrid", r => r.SupportModel), new("Support hours", "Recorded support hours", r => r.SupportHours),
                        new("Support time zone", "IANA zone of the support hours", r => r.SupportTimeZone), new("On-site engineers required", "Recorded staffing obligation", r => r.OnSiteEngineersRequired)], data);
                    break;
                }
                case "actions":
                {
                    var data = await dash.ActionsAsync(new DashboardQuery(L("clientId"), L("teamId"), L("ownerId"), L("productId"), S("country"), now, S("category")), ct);
                    rows = data.Count;
                    file = Csv.Build("Action list", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<ActionItem>("Category", "Action-list category", r => r.Category), new("Record type", "Source record type", r => r.RecordType),
                        new("Reference", "Source record", r => r.Reference), new("Title", "Title", r => r.Title), new("Owner", "Owner or Unassigned", r => r.Owner),
                        new("Reason", "Why it needs attention", r => r.Reason), new("Next action", "Next action", r => r.NextAction), new("Due", "Due or review time", r => r.DueAt)], data);
                    break;
                }
                case "environments":
                {
                    var q = db.Environments.AsNoTracking().AsQueryable();
                    if (L("clientId") is { } cid) q = q.Where(e => e.ClientId == cid);
                    if (L("regionId") is { } rid) q = q.Where(e => e.RegionId == rid);
                    var data = await q.OrderBy(e => e.Client!.Code).ThenBy(e => e.Name).Select(e => new EnvRow(e.Client!.Code, e.Region == null ? null : e.Region.Code, e.Name, e.Type.ToString(), e.Criticality.ToString(), e.Hosting.ToString(),
                        e.Owner == null ? null : e.Owner.DisplayName, e.BackupOwner == null ? null : e.BackupOwner.DisplayName, e.BackupGapReason, e.ConditionObservedAt == null ? "Unknown" : e.Condition.ToString(), e.ConditionObservedAt, e.InventoryReviewedAt)).ToListAsync(ct);
                    rows = data.Count;
                    file = Csv.Build("Environments", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<EnvRow>("Client", "Client alias", r => r.Client), new("Region", "Region code; empty = direct-client environment (valid)", r => r.Region), new("Environment", "Name", r => r.Name),
                        new("Type", "Environment type", r => r.Type), new("Criticality", "Criticality", r => r.Criticality), new("Hosting", "Hosting; empty = Unknown", r => r.Hosting),
                        new("Technical owner", "Owner; empty = assignment gap", r => r.Owner), new("Backup owner", "Backup; empty = coverage gap", r => r.Backup), new("Coverage gap reason", "Recorded gap", r => r.Gap),
                        new("Reported condition", "Manually reported; not live health", r => r.Condition), new("Condition observed", "Observation time", r => r.Observed), new("Inventory reviewed", "Last inventory review", r => r.Inventory)], data);
                    break;
                }
                case "versions":
                {
                    var q = Catalogue.CatalogueEndpoints.Filter(db.Installations.AsNoTracking(), L("clientId"), L("regionId"), L("environmentId"), L("productId"), null, B("unknownVersion"), S("q"));
                    var data = await q.OrderBy(i => i.Environment!.Client!.Code).ThenBy(i => i.Environment!.Name).Select(i => new VerRow(i.Environment!.Client!.Code, i.Environment.Region == null ? null : i.Environment.Region.Code, i.Environment.Name,
                        i.Product!.Code, i.InstanceName, i.ProductVersion == null ? "Unknown" : i.ProductVersion.Version, i.DeployedOn, i.LastReviewedAt)).ToListAsync(ct);
                    rows = data.Count;
                    file = Csv.Build("Version matrix", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<VerRow>("Client", "Client alias", r => r.Client), new("Region", "Region; empty = direct", r => r.Region), new("Environment", "Environment", r => r.Env),
                        new("Product", "Product code", r => r.Product), new("Instance", "Named installation", r => r.Instance), new("Version", "Product-specific version or Unknown", r => r.Version),
                        new("Deployed on", "Deployment date when known", r => r.Deployed), new("Last confirmed", "Last version confirmation or review", r => r.Reviewed)], data);
                    break;
                }
                case "assets":
                {
                    var q = Inventory.InventoryEndpoints.FilterAssets(db, L("clientId"), L("regionId"), L("environmentId"), L("productId"), S("type"), E<AssetLifecycle>("lifecycle"), S("role"), S("phase"), tech ? S("zone") : null, S("q")).AsNoTracking();
                    var data = await q.OrderBy(a => a.Name).Select(a => new AssetRow(a.Environment!.Client!.Code, a.Environment.Name, a.Name, a.Type, a.Role, a.Lifecycle.ToString(),
                        tech ? a.NetworkZone : (a.NetworkZone == null ? null : "Restricted"), a.CpuQuantity, a.CpuUnit == null ? null : a.CpuUnit.ToString(), a.RamQuantity, a.RamUnit == null ? null : a.RamUnit.ToString(), a.OsFamily, a.VerifiedAt)).ToListAsync(ct);
                    rows = data.Count;
                    file = Csv.Build("Assets", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<AssetRow>("Client", "Client alias", r => r.Client), new("Environment", "Environment", r => r.Env), new("Asset", "Asset name", r => r.Name),
                        new("Type", "VM, Physical or LogicalEndpoint (never counted as VM)", r => r.Type), new("Role", "Role", r => r.Role), new("Lifecycle", "Documented lifecycle", r => r.Lifecycle),
                        new("Network zone", "Restricted technical detail", r => r.Zone), new("CPU", "Recorded quantity; empty = unknown (not zero)", r => r.Cpu), new("CPU unit", "vCPU or PhysicalCore", r => r.CpuUnit),
                        new("RAM", "Recorded quantity; empty = unknown", r => r.Ram), new("RAM unit", "GB or GiB", r => r.RamUnit), new("OS", "OS family", r => r.Os),
                        new("Verified", "Last verification", r => r.Verified)], data);
                    break;
                }
                case "data-quality":
                {
                    var data = await QualityEndpoints.Filter(db.DataQualityItems.AsNoTracking(), S("rule"), L("clientId"), L("coordinatorId"), S("status"), S("recordType")).OrderBy(i => i.Rule)
                        .Select(i => new DqRow(i.Rule, i.RecordType, i.RecordLabel, i.Detail, i.Coordinator == null ? null : i.Coordinator.DisplayName, i.NextAction, i.Status.ToString(), i.OpenedAt)).ToListAsync(ct);
                    rows = data.Count;
                    file = Csv.Build("Data quality", access.Me.AccountName, filters, zone, now, [
                        new CsvColumn<DqRow>("Rule", "Quality rule", r => r.Rule), new("Record type", "Affected record type", r => r.Type), new("Record", "Affected record", r => r.Label),
                        new("Detail", "Safe detail", r => r.Detail), new("Coordinator", "Accountable internal coordinator", r => r.Coordinator), new("Next action", "Next action", r => r.Next),
                        new("Status", "Open or Resolved (by rule re-evaluation only)", r => r.Status), new("Opened", "When the rule first failed", r => r.Opened)], data);
                    break;
                }
                default:
                    throw new NotFoundException("The report");
            }
            db.ExportLogs.Add(new Admin.ExportLog { UserId = access.Me.UserId!.Value, Report = report, Filters = filters.Length > 2000 ? filters[..2000] : filters, RowCount = rows, At = now });
            await db.AuditActionAsync("Export", "Report", null, report, L("clientId"), null, new { filters, rows, timeZone = zone.Id }, ct);
            return Results.File(file, "text/csv; charset=utf-8", Csv.FileName(report, now));
        }).WithTags("Exports");
    }

    private sealed record EnvRow(string Client, string? Region, string Name, string Type, string Criticality, string? Hosting, string? Owner, string? Backup, string? Gap, string Condition, DateTimeOffset? Observed, DateTimeOffset? Inventory);
    private sealed record VerRow(string Client, string? Region, string Env, string Product, string Instance, string Version, DateOnly? Deployed, DateTimeOffset? Reviewed);
    private sealed record AssetRow(string Client, string Env, string Name, string Type, string? Role, string Lifecycle, string? Zone, decimal? Cpu, string? CpuUnit, decimal? Ram, string? RamUnit, string? Os, DateTimeOffset? Verified);
    private sealed record DqRow(string Rule, string Type, string Label, string Detail, string? Coordinator, string? Next, string Status, DateTimeOffset Opened);
}
