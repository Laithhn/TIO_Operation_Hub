using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Attachments;

/// <summary>
/// A46 (owner request, 21 Oct 2026): files attached to operational records (clients, regions, projects, contracts and their SLAs,
/// environments, servers, installations, components, cases, commitments, escalations, products, teams). The file content is stored on disk
/// under <c>Attachments:Path</c> (relative to the application folder, or an absolute or network path); the database keeps only the metadata:
/// original name, size, SHA-256, type, who uploaded it and when. Who can see the record can see and download its files; Edit records is
/// needed to upload; the uploader or a holder of Delete records removes one. Files never pass through the database.
/// </summary>
public class Attachment : Entity, IClientOwned
{
    public string RecordType { get; set; } = "";
    public long RecordId { get; set; }
    public long? ClientId { get; set; }
    public long? TeamId { get; set; }
    public string FileName { get; set; } = "";
    /// <summary>Path relative to the storage root: yyyy/MM/{guid}. No user-supplied part.</summary>
    public string StoredPath { get; set; } = "";
    public string ContentType { get; set; } = "application/octet-stream";
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = "";
    public string? Description { get; set; }
    public long? UploadedById { get; set; }
    public User? UploadedBy { get; set; }
    public long? ScopeClientId => ClientId;
}

public sealed class AttachmentOptions
{
    /// <summary>Where files are stored. Relative paths are under the application folder; App_Data is kept across upgrades.</summary>
    public string Path { get; set; } = "App_Data/attachments";
    public int MaxFileMB { get; set; } = 25;
    public int MaxFilesPerUpload { get; set; } = 10;
    /// <summary>Office documents, PDF, images, text and archives. Executables, scripts and key or certificate files are never accepted.</summary>
    public string[] AllowedExtensions { get; set; } =
        [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".ppt", ".pptx", ".vsd", ".vsdx", ".txt", ".log", ".md", ".rtf", ".odt", ".ods", ".odp",
         ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".msg", ".eml", ".zip", ".7z", ".xml", ".json"];
}

/// <summary>Reads and writes attachment files on disk. Every path is generated here and checked to stay inside the root.</summary>
public sealed class AttachmentStore(IOptions<AttachmentOptions> options, IWebHostEnvironment env, ILogger<AttachmentStore> log)
{
    // A48: the effective settings — the configuration file's values, overridden by what an administrator saved under Settings.
    private volatile AttachmentOptions current = Copy(options.Value);
    public AttachmentOptions Options => current;
    /// <summary>The values from the configuration file (appsettings / environment), used when nothing is saved under Settings.</summary>
    public AttachmentOptions Defaults => options.Value;
    public string Root => Resolve(current.Path);
    public string Resolve(string path) => System.IO.Path.GetFullPath(path, env.ContentRootPath);
    public string ContentRoot => env.ContentRootPath;
    public string? WebRoot => env.WebRootPath;
    public void Apply(AttachmentOptions o) { current = Copy(o); log.LogInformation("Attachments are stored in {Root}", Root); }
    public static AttachmentOptions Copy(AttachmentOptions o) => new() { Path = o.Path, MaxFileMB = o.MaxFileMB, MaxFilesPerUpload = o.MaxFilesPerUpload, AllowedExtensions = [.. o.AllowedExtensions] };

    private string Full(string relative)
    {
        var root = Root.TrimEnd(System.IO.Path.DirectorySeparatorChar) + System.IO.Path.DirectorySeparatorChar;
        var full = System.IO.Path.GetFullPath(System.IO.Path.Combine(root, relative));
        if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Attachment path outside the storage root.");
        return full;
    }

    /// <summary>Checks the storage folder at startup and logs where files go; a missing or read-only folder is reported, not fatal.</summary>
    public void Prepare()
    {
        try
        {
            Directory.CreateDirectory(Root);
            var probe = System.IO.Path.Combine(Root, $".write-test-{Guid.NewGuid():N}");
            File.WriteAllText(probe, "ok");
            File.Delete(probe);
            log.LogInformation("Attachments are stored in {Root}", Root);
        }
        catch (Exception ex) { log.LogError(ex, "Attachment storage {Root} is not writable; uploads will fail until it is", Root); }
    }

    /// <summary>Streams the upload to a temporary file (size limit enforced while reading), then moves it in place.</summary>
    public async Task<(string Relative, long Size, string Sha256)> SaveAsync(Stream input, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var relative = $"{now:yyyy}/{now:MM}/{Guid.NewGuid():N}";
        var full = Full(relative);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(full)!);
        var temp = full + ".part";
        var max = (long)current.MaxFileMB * 1024 * 1024;
        long size = 0;
        using var sha = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
        try
        {
            await using (var output = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            {
                var buffer = new byte[81920];
                int n;
                while ((n = await input.ReadAsync(buffer, ct)) > 0)
                {
                    size += n;
                    if (size > max) throw new ValidationException("files", $"Files can be at most {current.MaxFileMB} MB.");
                    sha.AppendData(buffer, 0, n);
                    await output.WriteAsync(buffer.AsMemory(0, n), ct);
                }
            }
            File.Move(temp, full);
        }
        catch
        {
            TryDelete(temp);
            throw;
        }
        return (relative, size, Convert.ToHexString(sha.GetHashAndReset()).ToLowerInvariant());
    }

    /// <summary>A71: writes a small file that was already read and validated (a client logo) as <c>{folder}/{random id}{extension}</c>.
    /// Folder and extension are fixed by the caller's code, never taken from the upload.</summary>
    public async Task<string> SaveBytesAsync(byte[] data, string folder, string extension, CancellationToken ct)
    {
        var relative = $"{folder}/{Guid.NewGuid():N}{extension}";
        var full = Full(relative);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(full)!);
        var temp = full + ".part";
        try
        {
            await File.WriteAllBytesAsync(temp, data, ct);
            File.Move(temp, full);
        }
        catch
        {
            TryDelete(temp);
            throw;
        }
        return relative;
    }

    public Stream Open(string relative) =>new FileStream(Full(relative), FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true);
    public bool Exists(string relative) => File.Exists(Full(relative));

    public void Delete(IEnumerable<string> relatives) { foreach (var r in relatives) TryDelete(Full(r)); }

    private void TryDelete(string full)
    {
        try { if (File.Exists(full)) File.Delete(full); }
        catch (Exception ex) { log.LogWarning(ex, "Could not delete attachment file {File}", full); }
    }
}

public static partial class AttachmentEndpoints
{
    public sealed record Target(string Type, long Id, long? ClientId, long? TeamId, string Label);

    /// <summary>Record types that take attachments, read through the scope filters (an invisible record is "not found").</summary>
    public static readonly string[] Types = [RecordTypes.Client, RecordTypes.Region, RecordTypes.Project, RecordTypes.Contract, RecordTypes.Environment, RecordTypes.Asset,
        RecordTypes.Installation, RecordTypes.Component, RecordTypes.Case, RecordTypes.Commitment, RecordTypes.Escalation, "Product", "Team"];

    public static async Task<Target?> ResolveAsync(HubDbContext db, string? type, long id, CancellationToken ct) => type switch
    {
        RecordTypes.Client => await db.Clients.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.Id, null, x.Code)).FirstOrDefaultAsync(ct),
        RecordTypes.Region => await db.Regions.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Code)).FirstOrDefaultAsync(ct),
        RecordTypes.Project => await db.Projects.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Code)).FirstOrDefaultAsync(ct),
        RecordTypes.Contract => await db.Contracts.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Ref)).FirstOrDefaultAsync(ct),
        RecordTypes.Environment => await db.Environments.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Name)).FirstOrDefaultAsync(ct),
        RecordTypes.Asset => await db.Assets.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Name)).FirstOrDefaultAsync(ct),
        RecordTypes.Installation => await db.Installations.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.InstanceName)).FirstOrDefaultAsync(ct),
        RecordTypes.Component => await db.Components.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Name)).FirstOrDefaultAsync(ct),
        RecordTypes.Case => await db.Cases.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, x.ClientId == null ? x.ResponsibleTeamId : null, x.Ref)).FirstOrDefaultAsync(ct),
        RecordTypes.Commitment => await db.Commitments.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, x.ClientId == null ? x.ResponsibleTeamId : null, x.Ref)).FirstOrDefaultAsync(ct),
        RecordTypes.Escalation => await db.Escalations.Where(x => x.Id == id).Select(x => new Target(type, x.Id, x.ClientId, null, x.Ref)).FirstOrDefaultAsync(ct),
        "Product" => await db.Products.Where(x => x.Id == id).Select(x => new Target(type, x.Id, null, null, x.Code)).FirstOrDefaultAsync(ct),
        "Team" => await db.Teams.Where(x => x.Id == id).Select(x => new Target(type, x.Id, null, null, x.Code)).FirstOrDefaultAsync(ct),
        _ => null
    };

    [GeneratedRegex(@"[\x00-\x1F\x7F""<>|:*?\\/]+")]
    private static partial Regex UnsafeChars();

    /// <summary>The original name, without folders and characters that are unsafe in file systems or headers.</summary>
    public static string CleanName(string? name)
    {
        var n = UnsafeChars().Replace(Path.GetFileName(name ?? "").Trim(), "_").Trim(' ', '.');
        if (n.Length > 200) n = n[..(200 - Path.GetExtension(n).Length)] + Path.GetExtension(n);
        return n.Length == 0 ? "file" : n;
    }

    private static object Row(Attachment a) => new
    {
        a.Id, a.RecordType, a.RecordId, a.FileName, a.ContentType, a.SizeBytes, a.Sha256, a.Description, a.CreatedAt,
        uploadedBy = a.UploadedBy == null ? null : new UserRef(a.UploadedBy.Id, a.UploadedBy.DisplayName, a.UploadedBy.IsActive), a.UploadedById
    };

    public static void MapAttachmentEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/attachments").WithTags("Attachments");
        var types = new FileExtensionContentTypeProvider();

        // The storage folder is shown to administrators only (Administration → Settings).
        g.MapGet("/limits", (AttachmentStore store, UserContext me) => Results.Ok(new { store.Options.MaxFileMB, store.Options.MaxFilesPerUpload, extensions = store.Options.AllowedExtensions,
            location = me.IsAdministrator ? store.Root : null }));

        g.MapGet("", async (string recordType, long recordId, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            _ = await ResolveAsync(db, recordType, recordId, ct) ?? throw new NotFoundException("The record");
            var rows = await db.Attachments.AsNoTracking().Include(a => a.UploadedBy).Where(a => a.RecordType == recordType && a.RecordId == recordId)
                .OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
            return Results.Ok(rows.Select(Row));
        });

        // Multipart upload: recordType, recordId, description (optional) and one or more "files".
        g.MapPost("", async (HttpRequest req, HubDbContext db, HubAccess access, AttachmentStore store, CancellationToken ct) =>
        {
            access.Me.RequirePermission(ResourcePermissions.Other, ResourcePermissions.Maintain);
            if (!req.HasFormContentType) throw new ValidationException("files", "Send the files as a multipart form.");
            var form = await req.ReadFormAsync(ct);
            var type = form["recordType"].ToString();
            if (!long.TryParse(form["recordId"], out var recordId)) throw new ValidationException("recordId", "Say which record the files belong to.");
            var target = await ResolveAsync(db, type, recordId, ct) ?? throw new NotFoundException("The record");
            access.RequireMaintain(ResourcePermissions.Other, target.ClientId, target.TeamId);
            var description = Text.Clean(form["description"].ToString());
            var check = new Check().Text("description", description, 500, "Description");
            var files = form.Files.GetFiles("files");
            if (files.Count == 0) check.Add("files", "Choose at least one file.");
            if (files.Count > store.Options.MaxFilesPerUpload) check.Add("files", $"Upload at most {store.Options.MaxFilesPerUpload} files at a time.");
            foreach (var f in files)
            {
                var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                if (!store.Options.AllowedExtensions.Contains(ext, StringComparer.OrdinalIgnoreCase))
                    check.Add("files", $"{CleanName(f.FileName)}: {(ext.Length == 0 ? "files without an extension" : $"{ext} files")} are not accepted. Accepted: {string.Join(", ", store.Options.AllowedExtensions)}.");
                if (f.Length > (long)store.Options.MaxFileMB * 1024 * 1024) check.Add("files", $"{CleanName(f.FileName)} is larger than {store.Options.MaxFileMB} MB.");
                if (f.Length == 0) check.Add("files", $"{CleanName(f.FileName)} is empty.");
            }
            check.ThrowIfAny();
            var saved = new List<Attachment>();
            try
            {
                foreach (var f in files)
                {
                    await using var s = f.OpenReadStream();
                    var (rel, size, hash) = await store.SaveAsync(s, ct);
                    var name = CleanName(f.FileName);
                    var a = new Attachment
                    {
                        RecordType = type, RecordId = recordId, ClientId = target.ClientId, TeamId = target.TeamId, FileName = name, StoredPath = rel,
                        ContentType = types.TryGetContentType(name, out var ctype) ? ctype : "application/octet-stream", SizeBytes = size, Sha256 = hash,
                        Description = description, UploadedById = access.Me.UserId
                    };
                    saved.Add(a);
                    db.Attachments.Add(a);
                }
                db.AuditReason = $"Attached to {type} {target.Label}";
                await db.SaveChangesAsync(ct);
            }
            catch
            {
                store.Delete(saved.Select(a => a.StoredPath));   // no orphan files when the save fails
                throw;
            }
            return Results.Ok(saved.Select(a => new { a.Id, a.FileName, a.SizeBytes }));
        }).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(260L * 1024 * 1024))
          .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestFormLimitsAttribute { MultipartBodyLengthLimit = 260L * 1024 * 1024 });

        g.MapGet("/{id:long}/download", async (long id, HubDbContext db, HubAccess access, AttachmentStore store, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var a = await db.Attachments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The file");
            _ = await ResolveAsync(db, a.RecordType, a.RecordId, ct) ?? throw new NotFoundException("The file");
            if (!store.Exists(a.StoredPath)) throw new NotFoundException("The file content (it is missing from the storage folder)");
            // Always a download, never rendered by the browser as a page.
            return Results.Stream(store.Open(a.StoredPath), a.ContentType, a.FileName, enableRangeProcessing: true);
        });

        g.MapPut("/{id:long}", async (long id, DescriptionInput input, HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            var a = await db.Attachments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The file");
            access.RequireMaintain(ResourcePermissions.Other, a.ClientId, a.TeamId);
            new Check().Text("description", input.Description, 500, "Description").ThrowIfAny();
            a.Description = Text.Clean(input.Description);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        g.MapDelete("/{id:long}", async (long id, HubDbContext db, HubAccess access, AttachmentStore store, CancellationToken ct) =>
        {
            var a = await db.Attachments.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The file");
            if (!(a.UploadedById == access.Me.UserId && access.Me.HasPermission(ResourcePermissions.Other, ResourcePermissions.Maintain)) && !access.Me.HasPermission(ResourcePermissions.Other, ResourcePermissions.Delete))
                throw new ForbiddenException("Only the person who uploaded the file, or someone with the Delete records right, can remove it.");
            if (!access.Me.SeesScope(a.ClientId, a.TeamId)) throw new NotFoundException("The file");
            db.Attachments.Remove(a);
            db.AuditReason = $"File {a.FileName} removed";
            await db.SaveChangesAsync(ct);
            store.Delete([a.StoredPath]);
            return Results.NoContent();
        });
    }

    public sealed record DescriptionInput(string? Description);
}

