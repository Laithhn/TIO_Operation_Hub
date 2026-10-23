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
        // A62: the list-page download buttons use the Reporting Center's report definitions; the file is also kept in the export history.
        api.MapGet("/export/{report}", async (string report, HttpContext ctx, ExportService svc, ExportStore store, UserContext me, CancellationToken ct) =>
        {
            ExportService.RequireExport(me);
            var def = ReportCatalog.Find(report) ?? throw new NotFoundException("The report");
            var raw = ctx.Request.Query.ToDictionary(kv => kv.Key, kv => (string?)kv.Value.ToString());
            var f = await svc.ValidateAsync(def, raw, strict: false, ct);
            var job = await svc.ExportAsync(def, f, ExportFormat.Csv, null, svc.ZoneOf(raw.GetValueOrDefault("timeZone")), "List export", null, null, ct);
            if (job.Status != ExportStatus.Completed || job.StoredPath is null)
                return Results.Problem(statusCode: StatusCodes.Status422UnprocessableEntity, title: "The export could not be generated", detail: job.Error);
            return Results.File(store.Open(job.StoredPath)!, "text/csv; charset=utf-8", job.FileName);
        }).WithTags("Exports");
    }
}
