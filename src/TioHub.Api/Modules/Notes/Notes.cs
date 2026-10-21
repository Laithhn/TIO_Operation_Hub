using System.Linq.Expressions;
using System.Net;
using System.Text.RegularExpressions;
using Ganss.Xss;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Attachments;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Notes;

/// <summary>
/// A47 (owner request, 21 Oct 2026): personal notes in the style of OneNote — notebooks, coloured sections and pages (with one level of
/// sub-pages), a rich-text page with autosave, pasted images and files, search, pinning, moving pages and a recycle bin. A page can be linked
/// to a client or a project, or stay personal. Notes are private: every row carries its owner, a query filter limits every read to the
/// signed-in user, and the endpoints check ownership again. Nobody else — administrators included — can list, open or count them; note
/// content is not copied into the change history. Pasted images and files are stored on disk with the attachment store, never in the database.
/// </summary>
public class Notebook : Entity
{
    public long OwnerUserId { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "blue";
    public int SortOrder { get; set; }
}

public class NoteSection : Entity
{
    public long OwnerUserId { get; set; }
    public long NotebookId { get; set; }
    public Notebook? Notebook { get; set; }
    public string Name { get; set; } = "";
    public string Color { get; set; } = "blue";
    public int SortOrder { get; set; }
}

public class NotePage : Entity
{
    public long OwnerUserId { get; set; }
    public long SectionId { get; set; }
    public NoteSection? Section { get; set; }
    public string Title { get; set; } = "";
    /// <summary>Sanitized HTML.</summary>
    public string ContentHtml { get; set; } = "";
    /// <summary>Plain text of the content, for search and previews.</summary>
    public string ContentText { get; set; } = "";
    public int SortOrder { get; set; }
    /// <summary>0 = page, 1 = sub-page of the page above it.</summary>
    public int Level { get; set; }
    public bool IsPinned { get; set; }
    public long? ClientId { get; set; }
    public long? ProjectId { get; set; }
    /// <summary>The linked record's name when linked; kept if the record is deleted later (the link is then cleared).</summary>
    public string? LinkLabel { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}

/// <summary>A file or image pasted into a page; the content is on disk (attachment store).</summary>
public class NoteFile
{
    public long Id { get; set; }
    public long OwnerUserId { get; set; }
    public long PageId { get; set; }
    public string FileName { get; set; } = "";
    public string StoredPath { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public static partial class NoteEndpoints
{
    public static readonly string[] Colors = ["blue", "orange", "green", "purple", "red", "teal", "yellow", "gray"];
    private const int MaxHtml = 2_000_000;
    private static readonly string[] ImageTypes = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];

    public sealed record NotebookInput(string? Name, string? Color);
    public sealed record SectionInput(long? NotebookId, string? Name, string? Color);
    public sealed record PageInput(long? SectionId, string? Title, string? ContentHtml, int? Level, bool? IsPinned, long? ClientId, long? ProjectId, long? AfterPageId);
    public sealed record OrderInput(List<long>? Ids);
    public sealed record LinkInput(long? ClientId, long? ProjectId);

    // ---- sanitizing ----
    private static readonly HtmlSanitizer Sanitizer = BuildSanitizer();
    private static HtmlSanitizer BuildSanitizer()
    {
        var s = new HtmlSanitizer();
        s.AllowedTags.Clear();
        foreach (var t in new[] { "p", "br", "div", "span", "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup", "mark", "h1", "h2", "h3", "h4", "ul", "ol", "li",
                                  "blockquote", "pre", "code", "a", "table", "thead", "tbody", "tr", "th", "td", "hr", "img" })
            s.AllowedTags.Add(t);
        s.AllowedAttributes.Clear();
        foreach (var a in new[] { "href", "src", "alt", "title", "colspan", "rowspan", "data-checked", "data-checklist", "data-file", "style" }) s.AllowedAttributes.Add(a);
        s.AllowedCssProperties.Clear();
        foreach (var c in new[] { "color", "background-color", "text-align", "text-decoration", "font-weight", "font-style", "width" }) s.AllowedCssProperties.Add(c);
        s.AllowedSchemes.Clear();
        foreach (var sc in new[] { "http", "https", "mailto" }) s.AllowedSchemes.Add(sc);
        s.AllowDataAttributes = false;
        // Images only from this module's own file endpoint (pasted images are uploaded first).
        s.FilterUrl += (_, e) => { if (e.Tag?.NodeName == "IMG" && !(e.OriginalUrl ?? "").StartsWith("/api/v1/notes/files/", StringComparison.Ordinal)) e.SanitizedUrl = null; };
        s.PostProcessNode += (_, e) =>
        {
            if (e.Node is AngleSharp.Dom.IElement el && el.TagName == "A") { el.SetAttribute("rel", "noopener noreferrer"); el.SetAttribute("target", "_blank"); }
        };
        return s;
    }

    [GeneratedRegex(@"<[^>]+>")]
    private static partial Regex Tags();
    [GeneratedRegex(@"\s+")]
    private static partial Regex Spaces();
    [GeneratedRegex(@"/api/v1/notes/files/(\d+)")]
    private static partial Regex FileRefs();

    public static string Sanitize(string? html) => Sanitizer.Sanitize(html ?? "").Replace(" target=\"_blank\" rel=", " rel=");
    public static string PlainText(string html) =>
        Spaces().Replace(WebUtility.HtmlDecode(Tags().Replace(html.Replace("</p>", " </p>").Replace("<br>", " ").Replace("</li>", " </li>"), " ")), " ").Trim();

    private static long MeId(UserContext me) => me.UserId ?? throw new ForbiddenException("Sign in to use notes.");

    private static object PageRow(NotePage p, string? notebook, string? section, string? sectionColor) => new
    {
        p.Id, p.SectionId, p.Title, snippet = p.ContentText.Length > 160 ? p.ContentText[..160] + "…" : p.ContentText, p.Level, p.IsPinned, p.SortOrder,
        p.ClientId, p.ProjectId, p.LinkLabel, linkGone = p.LinkLabel != null && p.ClientId == null && p.ProjectId == null, p.CreatedAt, p.UpdatedAt, p.DeletedAt,
        notebook, section, sectionColor
    };

    /// <summary>The first notebook and section are created on first use.</summary>
    private static async Task EnsureStarterAsync(HubDbContext db, long me, CancellationToken ct)
    {
        if (await db.Notebooks.AnyAsync(n => n.OwnerUserId == me, ct)) return;
        var nb = new Notebook { OwnerUserId = me, Name = "My notebook", Color = "blue" };
        db.Notebooks.Add(nb);
        await db.SaveChangesAsync(ct);
        db.NoteSections.Add(new NoteSection { OwnerUserId = me, NotebookId = nb.Id, Name = "Quick notes", Color = "orange" });
        await db.SaveChangesAsync(ct);
    }

    private static async Task<(long? ClientId, long? ProjectId, string? Label)> LinkAsync(HubDbContext db, Check check, long? clientId, long? projectId, CancellationToken ct)
    {
        if (projectId is not null)
        {
            var p = await db.Projects.Where(x => x.Id == projectId).Select(x => new { x.ClientId, label = x.Client!.Code + " · " + x.Code + " " + x.Name }).FirstOrDefaultAsync(ct);
            if (p is null) { check.Add("projectId", "Select a project you can access."); return (null, null, null); }
            if (clientId is not null && clientId != p.ClientId) check.Add("projectId", "The project belongs to another client.");
            return (p.ClientId, projectId, p.label);
        }
        if (clientId is not null)
        {
            var c = await db.Clients.Where(x => x.Id == clientId).Select(x => x.Code + " · " + x.Name).FirstOrDefaultAsync(ct);
            if (c is null) { check.Add("clientId", "Select a client you can access."); return (null, null, null); }
            return (clientId, null, c);
        }
        return (null, null, null);
    }

    private static async Task RemoveFilesAsync(HubDbContext db, AttachmentStore store, IQueryable<NoteFile> files, CancellationToken ct)
    {
        var paths = await files.Select(f => f.StoredPath).ToListAsync(ct);
        await files.ExecuteDeleteAsync(ct);
        store.Delete(paths);
    }

    public static void MapNoteEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/notes").WithTags("Notes");
        var types = new FileExtensionContentTypeProvider();

        // ---- tree ----
        g.MapGet("/tree", async (HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            await EnsureStarterAsync(db, uid, ct);
            var notebooks = await db.Notebooks.AsNoTracking().Where(n => n.OwnerUserId == uid).OrderBy(n => n.SortOrder).ThenBy(n => n.Id).ToListAsync(ct);
            var sections = await db.NoteSections.AsNoTracking().Where(s => s.OwnerUserId == uid).OrderBy(s => s.SortOrder).ThenBy(s => s.Id).ToListAsync(ct);
            var counts = await db.NotePages.AsNoTracking().Where(p => p.OwnerUserId == uid && p.DeletedAt == null).GroupBy(p => p.SectionId).Select(x => new { x.Key, n = x.Count() }).ToDictionaryAsync(x => x.Key, x => x.n, ct);
            var deleted = await db.NotePages.CountAsync(p => p.OwnerUserId == uid && p.DeletedAt != null, ct);
            var pinned = await db.NotePages.CountAsync(p => p.OwnerUserId == uid && p.DeletedAt == null && p.IsPinned, ct);
            return Results.Ok(new
            {
                notebooks = notebooks.Select(n => new
                {
                    n.Id, n.Name, n.Color, n.SortOrder, version = Convert.ToBase64String(n.RowVersion),
                    sections = sections.Where(s => s.NotebookId == n.Id).Select(s => new { s.Id, s.Name, s.Color, s.SortOrder, pages = counts.GetValueOrDefault(s.Id), version = Convert.ToBase64String(s.RowVersion) })
                }),
                deleted, pinned, colors = Colors
            });
        });

        // ---- notebooks ----
        g.MapPost("/notebooks", async (NotebookInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            Check(i.Name, i.Color);
            var order = (await db.Notebooks.Where(n => n.OwnerUserId == uid).MaxAsync(n => (int?)n.SortOrder, ct) ?? 0) + 1;
            var nb = new Notebook { OwnerUserId = uid, Name = i.Name!.Trim(), Color = i.Color ?? "blue", SortOrder = order };
            db.Notebooks.Add(nb);
            await db.SaveChangesAsync(ct);
            db.NoteSections.Add(new NoteSection { OwnerUserId = uid, NotebookId = nb.Id, Name = "New section", Color = "orange" });
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/notes/notebooks/{nb.Id}", new { nb.Id });
        });
        g.MapPut("/notebooks/{id:long}", async (long id, NotebookInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var nb = await db.Notebooks.FirstOrDefaultAsync(n => n.Id == id && n.OwnerUserId == uid, ct) ?? throw new NotFoundException("The notebook");
            Check(i.Name, i.Color);
            nb.Name = i.Name!.Trim(); nb.Color = i.Color ?? nb.Color;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapDelete("/notebooks/{id:long}", async (long id, HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var nb = await db.Notebooks.FirstOrDefaultAsync(n => n.Id == id && n.OwnerUserId == uid, ct) ?? throw new NotFoundException("The notebook");
            if (await db.Notebooks.CountAsync(n => n.OwnerUserId == uid, ct) == 1) throw new ValidationException("notebook", "Keep at least one notebook.");
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var pages = db.NotePages.Where(p => p.OwnerUserId == uid && p.Section!.NotebookId == id);
            await RemoveFilesAsync(db, store, db.NoteFiles.Where(f => f.OwnerUserId == uid && pages.Select(p => p.Id).Contains(f.PageId)), ct);
            await pages.ExecuteDeleteAsync(ct);
            await db.NoteSections.Where(s => s.OwnerUserId == uid && s.NotebookId == id).ExecuteDeleteAsync(ct);
            db.Notebooks.Remove(nb);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/notebooks/reorder", async (OrderInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var ids = i.Ids ?? [];
            var rows = await db.Notebooks.Where(n => n.OwnerUserId == uid && ids.Contains(n.Id)).ToListAsync(ct);
            foreach (var n in rows) n.SortOrder = ids.IndexOf(n.Id);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- sections ----
        g.MapPost("/sections", async (SectionInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            Check(i.Name, i.Color);
            if (i.NotebookId is null || !await db.Notebooks.AnyAsync(n => n.Id == i.NotebookId && n.OwnerUserId == uid, ct)) throw new ValidationException("notebookId", "Choose one of your notebooks.");
            var order = (await db.NoteSections.Where(s => s.NotebookId == i.NotebookId).MaxAsync(s => (int?)s.SortOrder, ct) ?? 0) + 1;
            var s = new NoteSection { OwnerUserId = uid, NotebookId = i.NotebookId.Value, Name = i.Name!.Trim(), Color = i.Color ?? "blue", SortOrder = order };
            db.NoteSections.Add(s);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/notes/sections/{s.Id}", new { s.Id });
        });
        g.MapPut("/sections/{id:long}", async (long id, SectionInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var s = await db.NoteSections.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct) ?? throw new NotFoundException("The section");
            Check(i.Name, i.Color);
            if (i.NotebookId is not null && i.NotebookId != s.NotebookId)
            {
                if (!await db.Notebooks.AnyAsync(n => n.Id == i.NotebookId && n.OwnerUserId == uid, ct)) throw new ValidationException("notebookId", "Choose one of your notebooks.");
                s.NotebookId = i.NotebookId.Value;
            }
            s.Name = i.Name!.Trim(); s.Color = i.Color ?? s.Color;
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapDelete("/sections/{id:long}", async (long id, HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var s = await db.NoteSections.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct) ?? throw new NotFoundException("The section");
            if (await db.NoteSections.CountAsync(x => x.OwnerUserId == uid, ct) == 1) throw new ValidationException("section", "Keep at least one section.");
            await using var tx = await db.Database.BeginTransactionAsync(ct);
            var pages = db.NotePages.Where(p => p.OwnerUserId == uid && p.SectionId == id);
            await RemoveFilesAsync(db, store, db.NoteFiles.Where(f => f.OwnerUserId == uid && pages.Select(p => p.Id).Contains(f.PageId)), ct);
            await pages.ExecuteDeleteAsync(ct);
            db.NoteSections.Remove(s);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/sections/reorder", async (OrderInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var ids = i.Ids ?? [];
            var rows = await db.NoteSections.Where(s => s.OwnerUserId == uid && ids.Contains(s.Id)).ToListAsync(ct);
            foreach (var s in rows) s.SortOrder = ids.IndexOf(s.Id);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // ---- pages ----
        g.MapGet("/pages", async (long? sectionId, string? q, long? clientId, long? projectId, string? link, bool? pinned, bool? deleted, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var query = db.NotePages.AsNoTracking().Where(p => p.OwnerUserId == uid);
            query = deleted == true ? query.Where(p => p.DeletedAt != null) : query.Where(p => p.DeletedAt == null);
            if (sectionId is not null) query = query.Where(p => p.SectionId == sectionId);
            if (clientId is not null) query = query.Where(p => p.ClientId == clientId);
            if (projectId is not null) query = query.Where(p => p.ProjectId == projectId);
            if (pinned == true) query = query.Where(p => p.IsPinned);
            query = link switch
            {
                "personal" => query.Where(p => p.ClientId == null && p.ProjectId == null),
                "client" => query.Where(p => p.ClientId != null && p.ProjectId == null),
                "project" => query.Where(p => p.ProjectId != null),
                "linked" => query.Where(p => p.ClientId != null),
                _ => query
            };
            if (!string.IsNullOrWhiteSpace(q)) query = query.Where(p => p.Title.Contains(q) || p.ContentText.Contains(q) || (p.LinkLabel != null && p.LinkLabel.Contains(q)));
            var ordered = sectionId is not null && string.IsNullOrWhiteSpace(q) && deleted != true ? query.OrderBy(p => p.SortOrder).ThenBy(p => p.Id) : query.OrderByDescending(p => p.UpdatedAt);
            var rows = await ordered.Take(500).Select(p => new { p, notebook = p.Section!.Notebook!.Name, section = p.Section.Name, color = p.Section.Color }).ToListAsync(ct);
            return Results.Ok(rows.Select(r => PageRow(r.p, r.notebook, r.section, r.color)));
        });

        g.MapGet("/pages/{id:long}", async (long id, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var p = await db.NotePages.AsNoTracking().Include(x => x.Section).ThenInclude(s => s!.Notebook).FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct)
                ?? throw new NotFoundException("The page");
            return ctx.WithETag(p, new
            {
                p.Id, p.SectionId, p.Title, p.ContentHtml, p.Level, p.IsPinned, p.ClientId, p.ProjectId, p.LinkLabel,
                linkGone = p.LinkLabel != null && p.ClientId == null && p.ProjectId == null, p.CreatedAt, p.UpdatedAt, p.DeletedAt,
                section = p.Section!.Name, sectionColor = p.Section.Color, notebookId = p.Section.NotebookId, notebook = p.Section.Notebook!.Name
            });
        });

        g.MapPost("/pages", async (PageInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            await EnsureStarterAsync(db, uid, ct);
            var sectionId = i.SectionId ?? await db.NoteSections.Where(s => s.OwnerUserId == uid).OrderBy(s => s.Notebook!.SortOrder).ThenBy(s => s.SortOrder).Select(s => (long?)s.Id).FirstAsync(ct);
            if (!await db.NoteSections.AnyAsync(s => s.Id == sectionId && s.OwnerUserId == uid, ct)) throw new ValidationException("sectionId", "Choose one of your sections.");
            var p = new NotePage { OwnerUserId = uid, SectionId = sectionId!.Value };
            var check = new Check();
            await ApplyAsync(db, check, p, i, ct);
            await SetLinkAsync(db, check, p, i.ClientId, i.ProjectId, ct);
            check.ThrowIfAny();
            // New pages go after the given page (sub-pages right under their parent), otherwise at the end.
            var siblings = await db.NotePages.Where(x => x.SectionId == p.SectionId && x.DeletedAt == null).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).ToListAsync(ct);
            var at = i.AfterPageId is { } after && siblings.FindIndex(x => x.Id == after) is var idx and >= 0 ? idx + 1 : siblings.Count;
            for (var k = 0; k < siblings.Count; k++) siblings[k].SortOrder = k < at ? k : k + 1;
            p.SortOrder = at;
            db.NotePages.Add(p);
            await db.SaveChangesAsync(ct);
            return Results.Created($"/api/v1/notes/pages/{p.Id}", new { p.Id, version = Convert.ToBase64String(p.RowVersion) });
        });

        // Autosave: If-Match keeps two open windows from overwriting each other; the answer carries the new version.
        g.MapPut("/pages/{id:long}", async (long id, PageInput i, HttpContext ctx, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var p = await db.NotePages.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct) ?? throw new NotFoundException("The page");
            db.ExpectVersion(ctx, p);
            var check = new Check();
            if (i.SectionId is not null && i.SectionId != p.SectionId)
            {
                if (!await db.NoteSections.AnyAsync(s => s.Id == i.SectionId && s.OwnerUserId == uid, ct)) check.Add("sectionId", "Choose one of your sections.");
                else { p.SectionId = i.SectionId.Value; p.SortOrder = (await db.NotePages.Where(x => x.SectionId == i.SectionId).MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1; p.Level = 0; }
            }
            await ApplyAsync(db, check, p, i, ct);
            check.ThrowIfAny();
            await db.SaveChangesAsync(ct);
            // Files no longer referenced by the page (removed from its content more than an hour ago) leave the disk.
            var refs = FileRefs().Matches(p.ContentHtml).Select(m => long.Parse(m.Groups[1].Value)).ToHashSet();
            var cutoff = DateTimeOffset.UtcNow.AddHours(-1);
            var stale = await db.NoteFiles.Where(f => f.PageId == id && f.OwnerUserId == uid && f.CreatedAt < cutoff).Select(f => f.Id).ToListAsync(ct);
            var drop = stale.Where(x => !refs.Contains(x)).ToList();
            if (drop.Count > 0) await RemoveFilesAsync(db, ctx.RequestServices.GetRequiredService<AttachmentStore>(), db.NoteFiles.Where(f => drop.Contains(f.Id)), ct);
            return Results.Ok(new { version = Convert.ToBase64String(p.RowVersion), p.UpdatedAt });
        });

        // The page's link: a client, a project (its client follows), or neither (personal).
        g.MapPut("/pages/{id:long}/link", async (long id, LinkInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var p = await db.NotePages.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct) ?? throw new NotFoundException("The page");
            var check = new Check();
            await SetLinkAsync(db, check, p, i.ClientId, i.ProjectId, ct);
            check.ThrowIfAny();
            await db.SaveChangesAsync(ct);
            return Results.Ok(new { p.ClientId, p.ProjectId, p.LinkLabel, version = Convert.ToBase64String(p.RowVersion) });
        });

        g.MapPost("/pages/reorder", async (OrderInput i, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var ids = i.Ids ?? [];
            var rows = await db.NotePages.Where(p => p.OwnerUserId == uid && ids.Contains(p.Id)).ToListAsync(ct);
            if (rows.Select(r => r.SectionId).Distinct().Count() > 1) throw new ValidationException("ids", "Reorder pages of one section at a time.");
            foreach (var p in rows) p.SortOrder = ids.IndexOf(p.Id);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Recycle bin: delete moves a page there; restore brings it back; permanent delete and emptying the bin remove it and its files.
        g.MapDelete("/pages/{id:long}", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var p = await db.NotePages.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct) ?? throw new NotFoundException("The page");
            p.DeletedAt = DateTimeOffset.UtcNow;
            // Its sub-pages go with it.
            if (p.Level == 0)
            {
                var after = await db.NotePages.Where(x => x.SectionId == p.SectionId && x.DeletedAt == null && x.SortOrder > p.SortOrder).OrderBy(x => x.SortOrder).ToListAsync(ct);
                foreach (var sub in after.TakeWhile(x => x.Level > 0)) sub.DeletedAt = p.DeletedAt;
            }
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/pages/{id:long}/restore", async (long id, HubDbContext db, UserContext me, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var p = await db.NotePages.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid && x.DeletedAt != null, ct) ?? throw new NotFoundException("The page");
            // Sub-pages deleted together with the page come back with it, in their order.
            var together = p.Level == 0
                ? await db.NotePages.Where(x => x.SectionId == p.SectionId && x.Id != p.Id && x.DeletedAt == p.DeletedAt && x.Level > 0 && x.SortOrder > p.SortOrder).OrderBy(x => x.SortOrder).ToListAsync(ct)
                : [];
            var next = (await db.NotePages.Where(x => x.SectionId == p.SectionId && x.DeletedAt == null).MaxAsync(x => (int?)x.SortOrder, ct) ?? 0) + 1;
            p.DeletedAt = null;
            p.SortOrder = next++;
            p.Level = 0;
            foreach (var sub in together) { sub.DeletedAt = null; sub.SortOrder = next++; }
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapDelete("/pages/{id:long}/permanent", async (long id, HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var p = await db.NotePages.FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid && x.DeletedAt != null, ct) ?? throw new NotFoundException("The page in the recycle bin");
            await RemoveFilesAsync(db, store, db.NoteFiles.Where(f => f.PageId == id && f.OwnerUserId == uid), ct);
            db.NotePages.Remove(p);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });
        g.MapPost("/recycle-bin/empty", async (HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var pages = db.NotePages.Where(p => p.OwnerUserId == uid && p.DeletedAt != null);
            await RemoveFilesAsync(db, store, db.NoteFiles.Where(f => f.OwnerUserId == uid && pages.Select(p => p.Id).Contains(f.PageId)), ct);
            var n = await pages.ExecuteDeleteAsync(ct);
            return Results.Ok(new { removed = n });
        });

        // ---- pasted images and files (on disk) ----
        g.MapPost("/pages/{id:long}/files", async (long id, HttpRequest req, HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            var uid = MeId(me);
            if (!await db.NotePages.AnyAsync(p => p.Id == id && p.OwnerUserId == uid, ct)) throw new NotFoundException("The page");
            if (!req.HasFormContentType) throw new ValidationException("file", "Send the file as a multipart form.");
            var form = await req.ReadFormAsync(ct);
            var f = form.Files.GetFile("file") ?? throw new ValidationException("file", "Choose a file.");
            var name = AttachmentEndpoints.CleanName(f.FileName);
            var ext = Path.GetExtension(name).ToLowerInvariant();
            if (!store.Options.AllowedExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase)) throw new ValidationException("file", $"{(ext.Length == 0 ? "Files without an extension" : $"{ext} files")} are not accepted.");
            if (f.Length == 0) throw new ValidationException("file", "The file is empty.");
            await using var s = f.OpenReadStream();
            var (rel, size, hash) = await store.SaveAsync(s, ct);
            var nf = new NoteFile { OwnerUserId = uid, PageId = id, FileName = name, StoredPath = rel, ContentType = types.TryGetContentType(name, out var c) ? c : "application/octet-stream",
                SizeBytes = size, Sha256 = hash, CreatedAt = DateTimeOffset.UtcNow };
            db.NoteFiles.Add(nf);
            try { await db.SaveChangesAsync(ct); } catch { store.Delete([rel]); throw; }
            return Results.Ok(new { nf.Id, nf.FileName, nf.SizeBytes, url = $"/api/v1/notes/files/{nf.Id}", isImage = ImageTypes.Contains(ext) });
        }).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(30L * 1024 * 1024));

        g.MapGet("/files/{id:long}", async (long id, HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            var uid = MeId(me);
            var f = await db.NoteFiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && x.OwnerUserId == uid, ct) ?? throw new NotFoundException("The file");
            if (!store.Exists(f.StoredPath)) throw new NotFoundException("The file content");
            var image = ImageTypes.Contains(Path.GetExtension(f.FileName).ToLowerInvariant());
            // Images show inside the page; everything else is downloaded.
            return Results.Stream(store.Open(f.StoredPath), f.ContentType, image ? null : f.FileName);
        });
    }

    private static void Check(string? name, string? color)
    {
        new Check().Text("name", name, 100, "the name", required: true)
            .When(color is not null && !Colors.Contains(color), "color", "Choose one of the colours.").ThrowIfAny();
    }

    private static async Task ApplyAsync(HubDbContext db, Check check, NotePage p, PageInput i, CancellationToken ct)
    {
        if (i.Title is not null) { check.Text("title", i.Title, 300, "the title"); p.Title = i.Title.Trim(); }
        if (i.ContentHtml is not null)
        {
            if (i.ContentHtml.Length > MaxHtml) check.Add("contentHtml", "The page is too long; split it into several pages.");
            else { p.ContentHtml = Sanitize(i.ContentHtml); p.ContentText = PlainText(p.ContentHtml); }
        }
        if (i.Level is not null) p.Level = Math.Clamp(i.Level.Value, 0, 1);
        if (i.IsPinned is not null) p.IsPinned = i.IsPinned.Value;
    }

    private static async Task SetLinkAsync(HubDbContext db, Check check, NotePage p, long? clientId, long? projectId, CancellationToken ct)
    {
        var (c, pr, label) = await LinkAsync(db, check, clientId, projectId, ct);
        p.ClientId = c; p.ProjectId = pr; p.LinkLabel = label;
    }
}
