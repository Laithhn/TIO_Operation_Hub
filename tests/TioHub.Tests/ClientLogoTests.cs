using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json.Nodes;
using TioHub.Api.Common;
using TioHub.Api.Modules.Clients;
using Microsoft.Extensions.DependencyInjection;

namespace TioHub.Tests;

/// <summary>Fictional logo files built in memory (no real organization's logo is used anywhere in the tests).</summary>
internal static class LogoFiles
{
    /// <summary>A 1 × 1 RGBA PNG.</summary>
    public static readonly byte[] Png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");

    /// <summary>A PNG of the given size and colour (8-bit RGB, filter 0), written with real chunks and CRCs.</summary>
    public static byte[] SolidPng(int w, int h, byte r = 0, byte g = 30, byte b = 70)
    {
        var raw = new byte[(w * 3 + 1) * h];
        for (var y = 0; y < h; y++)
            for (var x = 0; x < w; x++) { var o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; }
        using var z = new MemoryStream();
        using (var zs = new ZLibStream(z, CompressionLevel.Optimal, true)) zs.Write(raw);
        var ihdr = new byte[13];
        System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(ihdr, w);
        System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(ihdr.AsSpan(4), h);
        ihdr[8] = 8; ihdr[9] = 2;
        using var png = new MemoryStream();
        png.Write([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        void Chunk(string type, byte[] data)
        {
            var len = new byte[4]; System.Buffers.Binary.BinaryPrimitives.WriteInt32BigEndian(len, data.Length);
            png.Write(len);
            var td = Encoding.ASCII.GetBytes(type).Concat(data).ToArray();
            png.Write(td);
            var crc = new byte[4]; System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(crc, Crc32(td));
            png.Write(crc);
        }
        Chunk("IHDR", ihdr); Chunk("IDAT", z.ToArray()); Chunk("IEND", []);
        return png.ToArray();
    }

    private static uint Crc32(byte[] data)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var b in data)
        {
            crc ^= b;
            for (var k = 0; k < 8; k++) crc = (crc & 1) != 0 ? 0xEDB88320u ^ (crc >> 1) : crc >> 1;
        }
        return ~crc;
    }

    /// <summary>The header of a baseline JPEG (SOI, APP0, SOF0 with 40 × 20 pixels) — enough for the content check.</summary>
    public static readonly byte[] Jpeg =
    [
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
        0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x14, 0x00, 0x28, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xFF, 0xD9
    ];

    /// <summary>A WebP header with a VP8X chunk declaring 64 × 32 pixels.</summary>
    public static byte[] WebP()
    {
        var b = new byte[40];
        Encoding.ASCII.GetBytes("RIFF").CopyTo(b, 0); b[4] = 32;
        Encoding.ASCII.GetBytes("WEBPVP8X").CopyTo(b, 8); b[16] = 10;
        b[24] = 63; b[27] = 31;
        return b;
    }

    public static readonly byte[] Svg = Encoding.UTF8.GetBytes("<?xml version=\"1.0\"?><svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>");
}

/// <summary>A71: client logos — upload, validation by content, replace, remove, edits that keep the logo, authorization, cleanup.</summary>
[Collection("hub")]
public class A71_ClientLogos(HubFactory hub) : Scenario(hub)
{
    private static async Task<Res> PutLogo(Api a, long client, byte[] bytes, string name)
    {
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");   // the browser's type is never trusted
        form.Add(file, "file", name);
        var res = await a.Http.PutAsync($"/api/v1/clients/{client}/logo", form);
        var text = await res.Content.ReadAsStringAsync();
        return new Res(res.StatusCode, text.TrimStart().StartsWith('{') ? JsonNode.Parse(text) : null, null, text);
    }

    /// <summary>Runs the upload and returns the one file it added under logos/.</summary>
    private async Task<(Res Res, string? File)> Stored(Func<Task<Res>> upload)
    {
        var before = LogoFilesOnDisk().ToHashSet();
        var res = await upload();
        return (res, LogoFilesOnDisk().Except(before).SingleOrDefault());
    }

    private string[] LogoFilesOnDisk() => Directory.Exists(Path.Combine(Hub.AttachmentRoot, "logos"))
        ? Directory.GetFiles(Path.Combine(Hub.AttachmentRoot, "logos")) : [];

    [Fact]
    public async Task Valid_logo_is_stored_on_disk_served_and_listed()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var up = await PutLogo(m, c, LogoFiles.Png, "brand.png");
        Assert.Equal(HttpStatusCode.OK, up.Status);
        var url = up.Body!["logoUrl"]!.GetValue<string>();
        Assert.StartsWith($"/api/v1/clients/{c}/logo?v=", url);

        // Served as the checked type, cached only under its versioned address, never as a page.
        var res = await m.Http.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("image/png", res.Content.Headers.ContentType!.MediaType);
        Assert.Equal(LogoFiles.Png, await res.Content.ReadAsByteArrayAsync());
        Assert.Contains("immutable", res.Headers.CacheControl!.ToString());
        Assert.Equal("nosniff", res.Headers.GetValues("X-Content-Type-Options").First());
        var stale = await m.Http.GetAsync($"/api/v1/clients/{c}/logo?v=old");
        Assert.True(stale.Headers.CacheControl!.NoCache);

        // The file is on disk under logos/, the client row only refers to it; every client payload carries the address.
        Assert.Contains(LogoFilesOnDisk(), f => File.ReadAllBytes(f).SequenceEqual(LogoFiles.Png));
        Assert.Equal(url, (await m.Get($"/clients/{c}")).Body!["logoUrl"]!.GetValue<string>());
        var code = (await m.Get($"/clients/{c}")).Body!["code"]!.GetValue<string>();
        var row = (await m.Get($"/clients?q={code}")).Body!["items"]!.AsArray().Single(x => Id(x) == c)!;
        Assert.Equal(url, row["logoUrl"]!.GetValue<string>());
        Assert.Contains((await m.Get("/clients/logos")).Body!.AsArray(), x => Id(x) == c && x!["logoUrl"]!.GetValue<string>() == url);
        Assert.Equal(2048, (await m.Get("/clients/logo-rules")).Body!["maxFileKB"]!.GetValue<int>());
        // JPEG and WebP are accepted too.
        Assert.Equal(HttpStatusCode.OK, (await PutLogo(m, await NewClient(), LogoFiles.Jpeg, "brand.jpeg")).Status);
        Assert.Equal(HttpStatusCode.OK, (await PutLogo(m, await NewClient(), LogoFiles.WebP(), "brand.webp")).Status);
    }

    [Fact]
    public async Task Invalid_files_are_refused_by_content_not_by_name()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var before = LogoFilesOnDisk().Length;   // the collection's tests run one after another
        var text = await PutLogo(m, c, Encoding.UTF8.GetBytes("MZ fictional program"), "logo.png");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, text.Status);
        Assert.Contains("not a PNG, JPEG or WebP", text.Error("file"));
        var svg = await PutLogo(m, c, LogoFiles.Svg, "logo.svg");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, svg.Status);
        Assert.Contains("SVG", svg.Error("file"));
        // A JPEG renamed .png, a PNG named .gif and an empty file.
        Assert.Contains("JPEG", (await PutLogo(m, c, LogoFiles.Jpeg, "logo.png")).Error("file"));
        Assert.NotNull((await PutLogo(m, c, LogoFiles.Png, "logo.gif")).Error("file"));
        Assert.NotNull((await PutLogo(m, c, [], "logo.png")).Error("file"));
        // Over the 2 MB default.
        var big = LogoFiles.Png.Concat(new byte[2 * 1024 * 1024]).ToArray();
        var oversized = await PutLogo(m, c, big, "logo.png");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, oversized.Status);
        Assert.Contains("2 MB", oversized.Error("file"));
        // Too many pixels.
        Assert.Contains("pixels", (await PutLogo(m, c, LogoFiles.SolidPng(5001, 1), "wide.png")).Error("file"));
        // Nothing was stored, the client still has no logo.
        Assert.Equal(before, LogoFilesOnDisk().Length);
        Assert.Null((await m.Get($"/clients/{c}")).Body!["logoUrl"]);
    }

    [Fact]
    public async Task Replace_and_remove_clean_up_files_and_editing_other_fields_keeps_the_logo()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var (up1, firstFile) = await Stored(() => PutLogo(m, c, LogoFiles.Png, "a.png"));
        var first = up1.Body!["logoUrl"]!.GetValue<string>();
        Assert.NotNull(firstFile);

        // Editing the client's fields (no logo in the request) keeps the logo.
        var dto = (await m.Get($"/clients/{c}")).Body!;
        Assert.Equal(HttpStatusCode.NoContent, (await m.Put($"/clients/{c}", new { code = dto["code"]!.GetValue<string>(), name = "Fictional renamed", country = "Oman", status = "Active", ownerUserId = m.UserId },
            await m.Version($"/clients/{c}"))).Status);
        Assert.Equal(first, (await m.Get($"/clients/{c}")).Body!["logoUrl"]!.GetValue<string>());

        // Replacing gives a new address (no stale cache) and removes the old file.
        var (up2, secondFile) = await Stored(() => PutLogo(m, c, LogoFiles.Jpeg, "b.jpg"));
        var second = up2.Body!["logoUrl"]!.GetValue<string>();
        Assert.NotEqual(first, second);
        Assert.False(File.Exists(firstFile));
        var res = await m.Http.GetAsync(second);
        Assert.Equal("image/jpeg", res.Content.Headers.ContentType!.MediaType);
        Assert.EndsWith(".jpg", secondFile);
        Assert.True(File.Exists(secondFile));

        // The change history names the logo change.
        var history = (await m.Get($"/admin/audit?entityType=Client&entityId={c}")).Text;
        Assert.Contains("Client logo replaced", history);

        // Removing clears the address and the file; removing again is harmless.
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/clients/{c}/logo")).Status);
        Assert.Null((await m.Get($"/clients/{c}")).Body!["logoUrl"]);
        Assert.False(File.Exists(secondFile));
        Assert.Equal(HttpStatusCode.NotFound, (await m.Http.GetAsync(second)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/clients/{c}/logo")).Status);
        Assert.DoesNotContain((await m.Get("/clients/logos")).Body!.AsArray(), x => Id(x) == c);
    }

    [Fact]
    public async Task Only_people_who_may_edit_the_client_change_its_logo_and_deleting_the_client_removes_the_file()
    {
        var m = await Hub.As(HubFactory.Manager);
        var c = await NewClient();
        var role = await m.Create("/admin/roles", new { name = U("LogoViewer"), description = "Read only", rights = Array.Empty<string>() });
        var acct = $@"DEV\{U("logoviewer")}";
        await m.Create("/admin/users", new { accountName = acct, displayName = "Fictional Logo Viewer", workingTimeZone = "UTC", roleId = role });
        var v = await Hub.As(acct);
        Assert.Equal(HttpStatusCode.Forbidden, (await PutLogo(v, c, LogoFiles.Png, "x.png")).Status);
        var (up, file) = await Stored(() => PutLogo(m, c, LogoFiles.SolidPng(3, 2), "x.png"));
        var url = up.Body!["logoUrl"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.Forbidden, (await v.Send(HttpMethod.Delete, $"/clients/{c}/logo")).Status);
        // Who can see the client can see its logo.
        Assert.Equal(HttpStatusCode.OK, (await v.Http.GetAsync(url)).StatusCode);

        Assert.True(File.Exists(file));
        Assert.Equal(HttpStatusCode.NoContent, (await m.Send(HttpMethod.Delete, $"/clients/{c}")).Status);
        Assert.False(File.Exists(file));
    }
}

/// <summary>A71: logo checks and the export writers' image support, without a database.</summary>
public class A71_LogoUnitTests
{
    [Fact]
    public void Content_check_identifies_types_and_sizes()
    {
        Assert.Equal(("PNG", 1, 1), Info(ClientLogos.Inspect(LogoFiles.Png, "a.png", 5000)));
        Assert.Equal(("JPEG", 40, 20), Info(ClientLogos.Inspect(LogoFiles.Jpeg, "a.jpg", 5000)));
        Assert.Equal(("WebP", 64, 32), Info(ClientLogos.Inspect(LogoFiles.WebP(), "a.webp", 5000)));
        Assert.Throws<ValidationException>(() => ClientLogos.Inspect(LogoFiles.Svg, "a.svg", 5000));
        Assert.Throws<ValidationException>(() => ClientLogos.Inspect(LogoFiles.Png, "../../a.exe", 5000));
        static (string, int, int) Info(LogoImage i) => (i.Kind, i.Width, i.Height);
    }

    [Fact]
    public void Pdf_embeds_png_and_jpeg_logos_and_skips_webp()
    {
        var png = PdfImage.From(LogoFiles.SolidPng(4, 3), "image/png");
        Assert.NotNull(png);
        Assert.Equal((4, 3), (png!.Width, png.Height));
        Assert.NotNull(PdfImage.From(LogoFiles.Png, "image/png")!.Alpha);   // RGBA keeps its transparency as a soft mask
        Assert.Equal("DCTDecode", PdfImage.From(LogoFiles.Jpeg, "image/jpeg")!.Filter);
        Assert.Null(PdfImage.From(LogoFiles.WebP(), "image/webp"));
        Assert.Null(PdfImage.From([1, 2, 3], "image/png"));

        var pdf = new PdfDocument().NewPage().Image(10, 10, 40, 40, png).Image(60, 10, 20, 20, png).Build("Fictional");
        var text = Encoding.Latin1.GetString(pdf);
        Assert.StartsWith("%PDF-1.4", text);
        Assert.Contains("/Subtype /Image /Width 4 /Height 3", text);
        Assert.Contains("/XObject << /Im0", text);
        Assert.Equal(1, text.Split("/Subtype /Image").Length - 1);   // one object, drawn twice
    }

    [Fact]
    public void Xlsx_places_a_picture_with_its_relationships()
    {
        var bytes = Xlsx.Build([new XlsxSheet("Summary", ["A"], [["x"]], [new XlsxImage(4, 0, LogoFiles.Png, "png", 40, 40, "Logo of Fictional Client")])]);
        using var zip = new ZipArchive(new MemoryStream(bytes));
        Assert.NotNull(zip.GetEntry("xl/media/image1_1.png"));
        string Read(string n) { using var r = new StreamReader(zip.GetEntry(n)!.Open()); return r.ReadToEnd(); }
        Assert.Contains("<drawing r:id=\"rId1\"/>", Read("xl/worksheets/sheet1.xml"));
        Assert.Contains("../drawings/drawing1.xml", Read("xl/worksheets/_rels/sheet1.xml.rels"));
        Assert.Contains("descr=\"Logo of Fictional Client\"", Read("xl/drawings/drawing1.xml"));
        Assert.Contains("/xl/drawings/drawing1.xml", Read("[Content_Types].xml"));
        // A sheet without pictures stays as before.
        using var plain = new ZipArchive(new MemoryStream(Xlsx.Build([new XlsxSheet("S", null, [["x"]])])));
        Assert.Null(plain.GetEntry("xl/drawings/drawing1.xml"));
    }
}

/// <summary>A71: the Cases Report Builder files carry the logo of a one-client report (PDF header and table, Excel Summary sheet).</summary>
[Collection("hub")]
public class A71_LogoExports(HubFactory hub) : Scenario(hub)
{
    [Fact]
    public async Task One_client_report_files_embed_its_logo()
    {
        var m = await Hub.As(HubFactory.Manager);
        var client = await NewClient();
        using (var form = new MultipartFormDataContent { { new ByteArrayContent(LogoFiles.SolidPng(8, 4)), "file", "brand.png" } })
            Assert.Equal(HttpStatusCode.OK, (await m.Http.PutAsync($"/api/v1/clients/{client}/logo", form)).StatusCode);
        await m.Create("/cases", new
        {
            title = "Logo case", type = "Incident", scope = "Client", clientId = client, responsibleTeamId = await Team(), impactSummary = "Logo export test", priority = "High",
            ownerUserId = m.UserId, nextAction = "Check", nextReviewAt = DateTimeOffset.UtcNow.AddDays(1)
        });
        var definition = new { schemaVersion = 1, filters = new { clientIds = new[] { client } }, columns = new[] { "caseId", "clientCode", "title" } };
        async Task<byte[]> Export(string format, object options)
        {
            var job = await m.Post("/reporting/exports", new { definition, format, options });
            Assert.Equal(HttpStatusCode.Accepted, job.Status);
            await TioHub.Api.Modules.Reporting.ExportWorker.RunAllAsync(Hub.Services.GetRequiredService<Microsoft.Extensions.DependencyInjection.IServiceScopeFactory>(), CancellationToken.None);
            return await m.Http.GetByteArrayAsync($"/api/v1/reporting/exports/{job.Id}/download");
        }
        var pdf = Encoding.Latin1.GetString(await Export("pdf", new { pdfMode = "detailed" }));
        Assert.Contains("/Subtype /Image /Width 8 /Height 4", pdf);
        using var xlsx = new ZipArchive(new MemoryStream(await Export("xlsx", new { includeSummary = true })));
        Assert.NotNull(xlsx.Entries.FirstOrDefault(e => e.FullName.StartsWith("xl/media/") && e.FullName.EndsWith(".png")));

        // The preview rows carry the client id, so the screen shows the logo from the shared lookup.
        var preview = await m.Post("/reporting/reports/cases/preview", new { definition });
        Assert.Equal(client, preview.Body!["rows"]!.AsArray()[0]!["clientId"]!.GetValue<long>());
    }
}
