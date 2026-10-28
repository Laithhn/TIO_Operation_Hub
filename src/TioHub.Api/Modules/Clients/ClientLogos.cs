using System.Buffers.Binary;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Attachments;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Clients;

/// <summary>A71: limits of client logos (configuration section <c>ClientLogos</c>).</summary>
public sealed class ClientLogoOptions
{
    /// <summary>Largest accepted logo file; default 2 MB.</summary>
    public int MaxFileKB { get; set; } = 2048;
    /// <summary>Largest accepted width or height in pixels (protects browsers and the PDF writer from huge images).</summary>
    public int MaxPixels { get; set; } = 5000;
}

/// <summary>What a logo file really is, read from its content (magic bytes and header), never from its name or the browser's type.</summary>
public sealed record LogoImage(string Kind, string ContentType, string Extension, int Width, int Height);

/// <summary>A logo read back from storage for an export file.</summary>
public sealed record LogoFile(byte[] Data, string ContentType);

/// <summary>
/// A71 (client logo brief, 28 Oct 2026): every client may have one logo (PNG, JPEG or WebP; SVG is refused because the hub has no safe
/// SVG sanitizer and an SVG can carry scripts). The file is stored like attachments (A46), on disk under the attachment storage root as
/// <c>logos/{random id}.{png|jpg|webp}</c>; the client row keeps only the relative path, the checked type and a random version that is part
/// of the logo URL, so a replaced logo is never served from a cache. Changing the logo needs the same right as editing the client.
/// </summary>
public static class ClientLogos
{
    public const string Folder = "logos";
    public static readonly string[] Extensions = [".png", ".jpg", ".jpeg", ".webp"];

    /// <summary>The address of a client's logo; null when it has none. The version makes every upload a new address.</summary>
    public static string? Url(long clientId, string? version) => version is null ? null : $"/api/v1/clients/{clientId}/logo?v={version}";

    /// <summary>Identifies PNG, JPEG and WebP by their content; refuses SVG, other files and images that are empty or too large in pixels.</summary>
    public static LogoImage Inspect(ReadOnlySpan<byte> b, string? fileName, int maxPixels)
    {
        var image = Detect(b);
        if (image is null)
        {
            var head = Encoding.UTF8.GetString(b[..Math.Min(b.Length, 1024)]).TrimStart('﻿', ' ', '\t', '\r', '\n');
            if (head.StartsWith('<') && head.Contains("<svg", StringComparison.OrdinalIgnoreCase))
                throw new ValidationException("file", "SVG logos are not accepted: an SVG file can contain scripts and the hub cannot clean it safely. Save the logo as PNG or WebP and upload that.");
            throw new ValidationException("file", "The file is not a PNG, JPEG or WebP image. Choose a logo in one of those formats.");
        }
        var ext = Path.GetExtension(fileName ?? "").ToLowerInvariant();
        if (!Extensions.Contains(ext))
            throw new ValidationException("file", $"{(ext.Length == 0 ? "Files without an extension" : $"{ext} files")} are not accepted. Accepted: PNG, JPG, JPEG and WebP.");
        if (ext != image.Extension && !(ext == ".jpeg" && image.Extension == ".jpg"))
            throw new ValidationException("file", $"The file is named {ext} but its content is a {image.Kind} image. Save it with the right extension and upload it again.");
        if (image.Width <= 0 || image.Height <= 0) throw new ValidationException("file", "The image has no readable size. Save it again as PNG or JPEG.");
        if (image.Width > maxPixels || image.Height > maxPixels)
            throw new ValidationException("file", $"The image is {image.Width} × {image.Height} pixels; logos can be at most {maxPixels} pixels wide and high.");
        return image;
    }

    private static LogoImage? Detect(ReadOnlySpan<byte> b)
    {
        // PNG: signature, then the IHDR chunk with width and height (big-endian).
        if (b.Length >= 24 && b[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }) && b.Slice(12, 4).SequenceEqual("IHDR"u8))
            return new("PNG", "image/png", ".png", (int)Math.Min(int.MaxValue, BinaryPrimitives.ReadUInt32BigEndian(b[16..])), (int)Math.Min(int.MaxValue, BinaryPrimitives.ReadUInt32BigEndian(b[20..])));
        // JPEG: SOI marker, then segments until a start-of-frame marker with the size.
        if (b.Length >= 4 && b[0] == 0xFF && b[1] == 0xD8 && b[2] == 0xFF)
        {
            var (w, h) = JpegSize(b);
            return new("JPEG", "image/jpeg", ".jpg", w, h);
        }
        // WebP: RIFF container with the WEBP form type; size from the VP8X, VP8 (lossy) or VP8L (lossless) chunk.
        if (b.Length >= 30 && b[..4].SequenceEqual("RIFF"u8) && b.Slice(8, 4).SequenceEqual("WEBP"u8))
        {
            var chunk = Encoding.ASCII.GetString(b.Slice(12, 4));
            var (w, h) = chunk switch
            {
                "VP8X" => (1 + (b[24] | b[25] << 8 | b[26] << 16), 1 + (b[27] | b[28] << 8 | b[29] << 16)),
                "VP8 " when b[23] == 0x9D && b[24] == 0x01 && b[25] == 0x2A => (BinaryPrimitives.ReadUInt16LittleEndian(b[26..]) & 0x3FFF, BinaryPrimitives.ReadUInt16LittleEndian(b[28..]) & 0x3FFF),
                "VP8L" when b[20] == 0x2F => (1 + ((b[21] | b[22] << 8) & 0x3FFF), 1 + ((b[22] >> 6 | b[23] << 2 | b[24] << 10) & 0x3FFF)),
                _ => (0, 0)
            };
            return new("WebP", "image/webp", ".webp", w, h);
        }
        return null;
    }

    private static (int W, int H) JpegSize(ReadOnlySpan<byte> b)
    {
        var i = 2;
        while (i + 9 < b.Length)
        {
            if (b[i] != 0xFF) return (0, 0);
            var marker = b[i + 1];
            if (marker == 0xFF) { i++; continue; }
            if (marker is 0xD8 or 0x01 or >= 0xD0 and <= 0xD7) { i += 2; continue; }
            var len = BinaryPrimitives.ReadUInt16BigEndian(b[(i + 2)..]);
            if (marker is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC)
                return (BinaryPrimitives.ReadUInt16BigEndian(b[(i + 7)..]), BinaryPrimitives.ReadUInt16BigEndian(b[(i + 5)..]));
            if (len < 2) return (0, 0);
            i += 2 + len;
        }
        return (0, 0);
    }

    /// <summary>Logos of the given clients for an export file, read through the caller's scope (one query; missing files are skipped).</summary>
    public static async Task<IReadOnlyDictionary<long, LogoFile>> LoadAsync(HubDbContext db, AttachmentStore store, IEnumerable<long> clientIds, CancellationToken ct, int max = 200)
    {
        var ids = clientIds.Distinct().Take(max).ToList();
        if (ids.Count == 0) return new Dictionary<long, LogoFile>();
        var rows = await db.Clients.AsNoTracking().Where(c => ids.Contains(c.Id) && c.LogoPath != null).Select(c => new { c.Id, c.LogoPath, c.LogoContentType }).ToListAsync(ct);
        var result = new Dictionary<long, LogoFile>();
        foreach (var r in rows)
        {
            try
            {
                if (!store.Exists(r.LogoPath!)) continue;
                await using var s = store.Open(r.LogoPath!);
                using var ms = new MemoryStream();
                await s.CopyToAsync(ms, ct);
                result[r.Id] = new LogoFile(ms.ToArray(), r.LogoContentType ?? "application/octet-stream");
            }
            catch (IOException) { /* an unreadable logo is left out of the file, never fails the export */ }
        }
        return result;
    }

    public static void MapClientLogoEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/clients").WithTags("Clients");

        g.MapGet("/logo-rules", (IOptions<ClientLogoOptions> o) => Results.Ok(new { o.Value.MaxFileKB, o.Value.MaxPixels, extensions = Extensions }));

        // Every visible client that has a logo, in one request: screens look logos up by client id instead of asking per client.
        g.MapGet("/logos", async (HubDbContext db, HubAccess access, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var rows = await db.Clients.AsNoTracking().Where(c => c.LogoVersion != null).OrderBy(c => c.Id).Select(c => new { c.Id, c.Code, c.LogoVersion }).ToListAsync(ct);
            return Results.Ok(rows.Select(r => new { r.Id, r.Code, logoUrl = Url(r.Id, r.LogoVersion) }));
        });

        g.MapGet("/{id:long}/logo", async (long id, string? v, HttpContext ctx, HubDbContext db, HubAccess access, AttachmentStore store, CancellationToken ct) =>
        {
            access.RequireBusiness();
            var c = await db.Clients.AsNoTracking().Where(x => x.Id == id).Select(x => new { x.LogoPath, x.LogoContentType, x.LogoVersion }).FirstOrDefaultAsync(ct);
            if (c?.LogoPath is null || !store.Exists(c.LogoPath)) throw new NotFoundException("The logo");
            var h = ctx.Response.Headers;
            // The versioned address never changes content, so browsers may keep it; without the current version they must ask again.
            h.CacheControl = v == c.LogoVersion ? "private, max-age=31536000, immutable" : "private, no-cache";
            h.ContentSecurityPolicy = "default-src 'none'; sandbox";
            h.ContentDisposition = $"inline; filename=\"logo{Path.GetExtension(c.LogoPath)}\"";
            return Results.Stream(store.Open(c.LogoPath), c.LogoContentType ?? "application/octet-stream");
        });

        // Multipart upload with one "file". Adds or replaces the logo; the replaced file is removed from disk after the save.
        g.MapPut("/{id:long}/logo", async (long id, HttpRequest req, HubDbContext db, HubAccess access, AttachmentStore store, IOptions<ClientLogoOptions> options, CancellationToken ct) =>
        {
            var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireMaintain(ResourcePermissions.Structure, c.Id, null, c.OwnerUserId, c.CoordinatorUserId);
            if (!req.HasFormContentType) throw new ValidationException("file", "Send the logo as a multipart form.");
            var form = await req.ReadFormAsync(ct);
            var f = form.Files.GetFile("file") ?? throw new ValidationException("file", "Choose a logo file.");
            var max = (long)options.Value.MaxFileKB * 1024;
            if (f.Length == 0) throw new ValidationException("file", "The file is empty.");
            if (f.Length > max) throw new ValidationException("file", $"The logo is larger than {SizeText(max)}. Choose a smaller file.");
            byte[] data;
            await using (var s = f.OpenReadStream())
            {
                using var ms = new MemoryStream((int)f.Length);
                await s.CopyToAsync(ms, ct);
                data = ms.ToArray();
            }
            if (data.Length > max) throw new ValidationException("file", $"The logo is larger than {SizeText(max)}. Choose a smaller file.");
            var image = Inspect(data, AttachmentEndpoints.CleanName(f.FileName), options.Value.MaxPixels);
            var old = c.LogoPath;
            var rel = await store.SaveBytesAsync(data, Folder, image.Extension, ct);
            c.LogoPath = rel;
            c.LogoContentType = image.ContentType;
            c.LogoVersion = Guid.NewGuid().ToString("N");
            db.AuditReason = old is null ? "Client logo added" : "Client logo replaced";
            try { await db.SaveChangesAsync(ct); }
            catch { store.Delete([rel]); throw; }   // no orphan file when the save fails
            if (old is not null) store.Delete([old]);
            return Results.Ok(new { logoUrl = Url(c.Id, c.LogoVersion), image.Width, image.Height, contentType = image.ContentType });
        }).WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(20L * 1024 * 1024))
          .WithMetadata(new Microsoft.AspNetCore.Mvc.RequestFormLimitsAttribute { MultipartBodyLengthLimit = 20L * 1024 * 1024 });

        g.MapDelete("/{id:long}/logo", async (long id, HubDbContext db, HubAccess access, AttachmentStore store, CancellationToken ct) =>
        {
            var c = await db.Clients.FirstOrDefaultAsync(x => x.Id == id, ct) ?? throw new NotFoundException("The client");
            access.RequireMaintain(ResourcePermissions.Structure, c.Id, null, c.OwnerUserId, c.CoordinatorUserId);
            if (c.LogoPath is null) return Results.NoContent();
            var old = c.LogoPath;
            c.LogoPath = c.LogoContentType = c.LogoVersion = null;
            db.AuditReason = "Client logo removed";
            await db.SaveChangesAsync(ct);
            store.Delete([old]);
            return Results.NoContent();
        });
    }

    private static string SizeText(long bytes) => bytes % (1024 * 1024) == 0 ? $"{bytes / (1024 * 1024)} MB" : $"{bytes / 1024} KB";
}
