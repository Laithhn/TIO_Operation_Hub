using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Attachments;

/// <summary>
/// A48 (owner request, 21 Oct 2026): the attachment storage location and limits are edited under Administration → Settings. Saved values
/// override the configuration file and apply at once (no restart). A new location must be writable and outside the published web folder;
/// the existing files are moved there in the same step (or left in place on request, with a warning). Executables, scripts, web pages,
/// SVG and key or certificate files can never be allowed. Changes are audited like any setting.
/// </summary>
public static partial class StorageSettings
{
    public const string PathKey = "Attachments.Path", MaxFileKey = "Attachments.MaxFileMB", MaxFilesKey = "Attachments.MaxFilesPerUpload", ExtensionsKey = "Attachments.AllowedExtensions";
    public static readonly string[] Keys = [PathKey, MaxFileKey, MaxFilesKey, ExtensionsKey];

    /// <summary>Never accepted, whatever an administrator enters.</summary>
    public static readonly HashSet<string> Blocked = new(StringComparer.OrdinalIgnoreCase)
    {
        ".exe", ".dll", ".com", ".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".msi", ".msp", ".scr", ".cpl", ".jar", ".hta", ".lnk",
        ".reg", ".sh", ".py", ".html", ".htm", ".xhtml", ".svg", ".mht", ".php", ".asp", ".aspx", ".cshtml", ".config", ".pem", ".key", ".pfx", ".p12", ".cer", ".crt",
        ".kdbx", ".ppk", ".iso", ".img", ".vhd", ".vhdx"
    };

    [GeneratedRegex(@"^\.[a-z0-9]{1,10}$")]
    private static partial Regex ExtensionPattern();

    public sealed record StorageInput(string? Path, int? MaxFileMB, int? MaxFilesPerUpload, List<string>? Extensions, bool MoveFiles = true);

    /// <summary>At startup: saved values override the configuration file.</summary>
    public static async Task LoadAsync(HubDbContext db, AttachmentStore store, CancellationToken ct)
    {
        var saved = await db.Settings.AsNoTracking().Where(s => Keys.Contains(s.Key)).ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        if (saved.Count == 0) return;
        store.Apply(Merge(store.Defaults, saved));
    }

    private static AttachmentOptions Merge(AttachmentOptions defaults, Dictionary<string, string> saved)
    {
        var o = AttachmentStore.Copy(defaults);
        if (saved.TryGetValue(PathKey, out var p) && !string.IsNullOrWhiteSpace(p)) o.Path = p;
        if (saved.TryGetValue(MaxFileKey, out var mf) && int.TryParse(mf, out var mfv)) o.MaxFileMB = mfv;
        if (saved.TryGetValue(MaxFilesKey, out var mx) && int.TryParse(mx, out var mxv)) o.MaxFilesPerUpload = mxv;
        if (saved.TryGetValue(ExtensionsKey, out var ex) && !string.IsNullOrWhiteSpace(ex))
            o.AllowedExtensions = ex.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Where(x => !Blocked.Contains(x)).ToArray();
        return o;
    }

    private static (int Files, long Bytes) Measure(string root)
    {
        if (!Directory.Exists(root)) return (0, 0);
        var files = Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories).Where(f => !Path.GetFileName(f).StartsWith(".write-test-")).Select(f => new FileInfo(f)).ToList();
        return (files.Count, files.Sum(f => f.Length));
    }

    private static bool Inside(string path, string? folder) =>
        folder is not null && (path.TrimEnd('\\', '/') + Path.DirectorySeparatorChar).StartsWith(Path.GetFullPath(folder).TrimEnd('\\', '/') + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);

    public static void MapStorageSettingsEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/admin/attachment-storage").WithTags("Administration");

        g.MapGet("", async (HubDbContext db, UserContext me, AttachmentStore store, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var saved = await db.Settings.AsNoTracking().Where(s => Keys.Contains(s.Key)).ToDictionaryAsync(s => s.Key, s => s.Value, ct);
            var (files, bytes) = Measure(store.Root);
            var o = store.Options;
            return Results.Ok(new
            {
                location = store.Root, path = saved.GetValueOrDefault(PathKey), defaultLocation = store.Resolve(store.Defaults.Path), overridden = saved.Count > 0,
                o.MaxFileMB, o.MaxFilesPerUpload, extensions = o.AllowedExtensions, files, bytes,
                defaults = new { store.Defaults.MaxFileMB, store.Defaults.MaxFilesPerUpload, extensions = store.Defaults.AllowedExtensions },
                blocked = Blocked.Order(), limits = new { maxFileMB = 250, maxFilesPerUpload = 50 }
            });
        });

        g.MapPut("", async (StorageInput i, HubDbContext db, UserContext me, AttachmentStore store, ILogger<AttachmentStore> log, CancellationToken ct) =>
        {
            me.RequireAdministrator();
            var check = new Check()
                .When(i.MaxFileMB is < 1 or > 250, "maxFileMB", "Enter a size between 1 and 250 MB (the published web.config accepts up to 260 MB per upload).")
                .When(i.MaxFilesPerUpload is < 1 or > 50, "maxFilesPerUpload", "Enter between 1 and 50 files.")
                .Text("path", i.Path, 400, "the folder");
            var exts = (i.Extensions ?? [.. store.Options.AllowedExtensions]).Select(x => x.Trim().ToLowerInvariant()).Select(x => x.StartsWith('.') ? x : "." + x).Distinct().ToList();
            if (exts.Count == 0) check.Add("extensions", "Allow at least one file type.");
            foreach (var x in exts)
            {
                if (!ExtensionPattern().IsMatch(x)) check.Add("extensions", $"{x} is not a file extension (letters and digits after a dot).");
                else if (Blocked.Contains(x)) check.Add("extensions", $"{x} files can never be accepted (programs, scripts, web pages, keys and certificates).");
            }
            // The new folder: empty = back to the configuration file's folder.
            var raw = string.IsNullOrWhiteSpace(i.Path) ? null : i.Path.Trim();
            string newRoot = store.Root;
            try { newRoot = store.Resolve(raw ?? store.Defaults.Path); }
            catch (Exception) { check.Add("path", "Enter a valid folder, for example D:\\TioHub\\attachments or \\\\fileserver\\TioHub\\attachments."); }
            if (Inside(newRoot, store.WebRoot)) check.Add("path", "Choose a folder outside the application's published web folder (wwwroot); files there could be served without a sign-in.");
            if (string.Equals(newRoot.TrimEnd('\\', '/'), store.ContentRoot.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase)) check.Add("path", "Choose a dedicated folder, not the application folder itself.");
            check.ThrowIfAny();
            var oldRoot = store.Root;
            var moving = !string.Equals(oldRoot.TrimEnd('\\', '/'), newRoot.TrimEnd('\\', '/'), StringComparison.OrdinalIgnoreCase);
            if (moving)
            {
                if (Inside(newRoot, oldRoot) || Inside(oldRoot, newRoot)) throw new ValidationException("path", "The new folder cannot be inside the current one (or the other way round).");
                try
                {
                    Directory.CreateDirectory(newRoot);
                    var probe = Path.Combine(newRoot, $".write-test-{Guid.NewGuid():N}");
                    await File.WriteAllTextAsync(probe, "ok", ct);
                    File.Delete(probe);
                }
                catch (Exception ex) { throw new ValidationException("path", $"The hub cannot write to {newRoot}: {ex.Message} Give the application's account modify rights on it."); }
            }

            // Move the files first; only when every copy succeeded are the originals removed and the setting saved.
            var moved = 0; var left = 0;
            if (moving && Directory.Exists(oldRoot))
            {
                var all = Directory.EnumerateFiles(oldRoot, "*", SearchOption.AllDirectories).Where(f => !Path.GetFileName(f).StartsWith(".write-test-")).ToList();
                if (i.MoveFiles)
                {
                    var copied = new List<string>();
                    try
                    {
                        foreach (var f in all)
                        {
                            var rel = Path.GetRelativePath(oldRoot, f);
                            var dest = Path.Combine(newRoot, rel);
                            Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
                            if (!File.Exists(dest) || new FileInfo(dest).Length != new FileInfo(f).Length) File.Copy(f, dest, overwrite: true);
                            copied.Add(f);
                        }
                    }
                    catch (Exception ex)
                    {
                        throw new ConflictException($"Copying the files to {newRoot} failed after {copied.Count} of {all.Count}: {ex.Message} Nothing was changed; the hub still uses {oldRoot}.");
                    }
                    foreach (var f in copied) { try { File.Delete(f); } catch (Exception ex) { log.LogWarning(ex, "Could not remove {File} after moving it", f); } }
                    moved = copied.Count;
                }
                else left = all.Count;
            }

            var values = new Dictionary<string, string?>
            {
                [PathKey] = raw, [MaxFileKey] = (i.MaxFileMB ?? store.Options.MaxFileMB).ToString(), [MaxFilesKey] = (i.MaxFilesPerUpload ?? store.Options.MaxFilesPerUpload).ToString(),
                [ExtensionsKey] = string.Join(",", exts)
            };
            var rows = await db.Settings.Where(s => Keys.Contains(s.Key)).ToListAsync(ct);
            foreach (var (k, v) in values)
            {
                var row = rows.FirstOrDefault(r => r.Key == k);
                if (row is null) db.Settings.Add(row = new AppSetting { Key = k, Description = "File attachments (Administration → Settings)." });
                row.Value = v ?? "";
            }
            db.AuditReason = moving ? $"Attachment storage moved from {oldRoot} to {newRoot} ({moved} file(s) moved)" : "Attachment limits changed";
            await db.SaveChangesAsync(ct);
            store.Apply(Merge(store.Defaults, values.Where(x => x.Value is not null).ToDictionary(x => x.Key, x => x.Value!)));
            return Results.Ok(new { location = store.Root, moved, left });
        });
    }
}
