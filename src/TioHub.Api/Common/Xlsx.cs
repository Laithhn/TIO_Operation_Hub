using System.Globalization;
using System.IO.Compression;
using System.Security;
using System.Text;

namespace TioHub.Api.Common;

/// <summary>One worksheet: a name, an optional bold header row and the rows (strings, numbers, booleans, local DateTime values; everything else as text).</summary>
public sealed record XlsxSheet(string Name, IReadOnlyList<string>? Header, IEnumerable<IReadOnlyList<object?>> Rows, IReadOnlyList<XlsxImage>? Images = null);

/// <summary>A71: a picture placed over the sheet with its top-left corner in a cell (0-based column and row), sized in pixels.
/// Extension is "png" or "jpeg" (the formats every Excel version shows); Description is the picture's alternative text.</summary>
public sealed record XlsxImage(int Column, int Row, byte[] Data, string Extension, int WidthPx, int HeightPx, string? Description = null);

/// <summary>
/// A62: minimal Office Open XML workbook writer (no third-party package). Text is written as inline strings, so a cell is never
/// evaluated as a formula; numbers stay numeric; the header row is bold, frozen and filterable.
/// </summary>
public static class Xlsx
{
    public static byte[] Build(IReadOnlyList<XlsxSheet> sheets)
    {
        using var ms = new MemoryStream();
        using (var zip = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            Entry(zip, "[Content_Types].xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/><Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Default Extension=\"png\" ContentType=\"image/png\"/><Default Extension=\"jpeg\" ContentType=\"image/jpeg\"/>" +
                string.Concat(sheets.Select((s, i) => s.Images is { Count: > 0 } ? $"<Override PartName=\"/xl/drawings/drawing{i + 1}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.drawing+xml\"/>" : "")) +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" +
                string.Concat(sheets.Select((_, i) => $"<Override PartName=\"/xl/worksheets/sheet{i + 1}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>")) +
                "</Types>");
            Entry(zip, "_rels/.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            Entry(zip, "xl/workbook.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets>" +
                string.Concat(sheets.Select((s, i) => $"<sheet name=\"{Esc(SheetName(s.Name, i))}\" sheetId=\"{i + 1}\" r:id=\"rId{i + 1}\"/>")) + "</sheets></workbook>");
            Entry(zip, "xl/_rels/workbook.xml.rels",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
                string.Concat(sheets.Select((_, i) => $"<Relationship Id=\"rId{i + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{i + 1}.xml\"/>")) +
                $"<Relationship Id=\"rId{sheets.Count + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
            Entry(zip, "xl/styles.xml",
                "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">" +
                "<numFmts count=\"1\"><numFmt numFmtId=\"164\" formatCode=\"yyyy-mm-dd hh:mm\"/></numFmts>" +
                "<fonts count=\"2\"><font><sz val=\"10\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"10\"/><color rgb=\"FFFFFFFF\"/><name val=\"Calibri\"/></font></fonts>" +
                "<fills count=\"3\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill><fill><patternFill patternType=\"solid\"><fgColor rgb=\"FF0C1B37\"/></patternFill></fill></fills>" +
                "<borders count=\"1\"><border/></borders><cellStyleXfs count=\"1\"><xf/></cellStyleXfs>" +
                // Style 2 (A70): local date and time cells, stored as real Excel dates so they sort and filter as dates.
                "<cellXfs count=\"3\"><xf fontId=\"0\" fillId=\"0\"/><xf fontId=\"1\" fillId=\"2\" applyFont=\"1\" applyFill=\"1\"/><xf numFmtId=\"164\" fontId=\"0\" fillId=\"0\" applyNumberFormat=\"1\"/></cellXfs></styleSheet>");
            for (var i = 0; i < sheets.Count; i++)
            {
                Entry(zip, $"xl/worksheets/sheet{i + 1}.xml", Sheet(sheets[i]));
                if (sheets[i].Images is { Count: > 0 } images) Drawing(zip, i + 1, images);
            }
        }
        return ms.ToArray();
    }

    private static string Sheet(XlsxSheet s)
    {
        var rows = new List<IReadOnlyList<object?>>();
        if (s.Header is not null) rows.Add(s.Header.Cast<object?>().ToList());
        rows.AddRange(s.Rows);
        var cols = rows.Count == 0 ? 0 : rows.Max(r => r.Count);
        var widths = new double[cols];
        foreach (var r in rows.Take(500))
            for (var c = 0; c < r.Count; c++) widths[c] = Math.Max(widths[c], Math.Min(60, Text(r[c]).Length + 2));
        var sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">");
        if (s.Header is not null) sb.Append("<sheetViews><sheetView workbookViewId=\"0\"><pane ySplit=\"1\" topLeftCell=\"A2\" activePane=\"bottomLeft\" state=\"frozen\"/></sheetView></sheetViews>");
        if (cols > 0) sb.Append("<cols>").Append(string.Concat(widths.Select((w, i) => $"<col min=\"{i + 1}\" max=\"{i + 1}\" width=\"{Math.Max(8, w).ToString(CultureInfo.InvariantCulture)}\" customWidth=\"1\"/>"))).Append("</cols>");
        sb.Append("<sheetData>");
        for (var r = 0; r < rows.Count; r++)
        {
            sb.Append($"<row r=\"{r + 1}\">");
            var header = s.Header is not null && r == 0;
            for (var c = 0; c < rows[r].Count; c++)
            {
                var v = rows[r][c];
                var at = $"{Column(c)}{r + 1}";
                var style = header ? " s=\"1\"" : "";
                switch (v)
                {
                    case null: break;
                    case int or long or decimal or double or float:
                        sb.Append($"<c r=\"{at}\"{style}><v>{Convert.ToString(v, CultureInfo.InvariantCulture)}</v></c>"); break;
                    case DateTime dt:
                        sb.Append($"<c r=\"{at}\" s=\"{(header ? 1 : 2)}\"><v>{dt.ToOADate().ToString(CultureInfo.InvariantCulture)}</v></c>"); break;
                    case bool b:
                        sb.Append($"<c r=\"{at}\"{style} t=\"inlineStr\"><is><t>{(b ? "Yes" : "No")}</t></is></c>"); break;
                    default:
                        sb.Append($"<c r=\"{at}\"{style} t=\"inlineStr\"><is><t xml:space=\"preserve\">{Esc(Text(v))}</t></is></c>"); break;
                }
            }
            sb.Append("</row>");
        }
        sb.Append("</sheetData>");
        if (s.Header is not null && cols > 0 && rows.Count > 1) sb.Append($"<autoFilter ref=\"A1:{Column(cols - 1)}{rows.Count}\"/>");
        if (s.Images is { Count: > 0 }) sb.Append("<drawing r:id=\"rId1\"/>");
        sb.Append("</worksheet>");
        return sb.ToString();
    }

    private static string Text(object? v) => v switch
    {
        null => "",
        DateOnly d => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        DateTime dt => dt.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        bool b => b ? "Yes" : "No",
        _ => Convert.ToString(v, CultureInfo.InvariantCulture) ?? ""
    };

    public static string Column(int index)
    {
        var s = "";
        for (var n = index + 1; n > 0; n = (n - 1) / 26) s = (char)('A' + (n - 1) % 26) + s;
        return s;
    }

    private static string SheetName(string name, int i)
    {
        var clean = new string(name.Where(ch => !"[]:*?/\\".Contains(ch)).ToArray()).Trim();
        if (clean.Length == 0) clean = $"Sheet{i + 1}";
        return clean.Length > 31 ? clean[..31] : clean;
    }

    // XML 1.0 forbids most control characters; they are dropped rather than written.
    private static string Esc(string s) => SecurityElement.Escape(new string(s.Where(ch => ch is '\t' or '\n' or '\r' || ch >= ' ').ToArray())) ?? "";

    /// <summary>A71: the drawing part of one sheet with its pictures (one-cell anchors, aspect ratio as given).</summary>
    private static void Drawing(ZipArchive zip, int sheet, IReadOnlyList<XlsxImage> images)
    {
        const string Rel = "http://schemas.openxmlformats.org/package/2006/relationships";
        Entry(zip, $"xl/worksheets/_rels/sheet{sheet}.xml.rels",
            $"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"{Rel}\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing\" Target=\"../drawings/drawing{sheet}.xml\"/></Relationships>");
        var rels = new StringBuilder($"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"{Rel}\">");
        var xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><xdr:wsDr xmlns:xdr=\"http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">");
        for (var k = 0; k < images.Count; k++)
        {
            var img = images[k];
            var ext = img.Extension == "png" ? "png" : "jpeg";
            var media = $"image{sheet}_{k + 1}.{ext}";
            var e = zip.CreateEntry($"xl/media/{media}", CompressionLevel.NoCompression);
            using (var w = e.Open()) w.Write(img.Data);
            rels.Append($"<Relationship Id=\"rId{k + 1}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/{media}\"/>");
            long cx = img.WidthPx * 9525L, cy = img.HeightPx * 9525L;   // EMU per pixel at 96 dpi
            xml.Append($"<xdr:oneCellAnchor><xdr:from><xdr:col>{img.Column}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{img.Row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx=\"{cx}\" cy=\"{cy}\"/>")
               .Append($"<xdr:pic><xdr:nvPicPr><xdr:cNvPr id=\"{k + 2}\" name=\"Picture {k + 1}\" descr=\"{Esc(img.Description ?? "")}\"/><xdr:cNvPicPr><a:picLocks noChangeAspect=\"1\"/></xdr:cNvPicPr></xdr:nvPicPr>")
               .Append($"<xdr:blipFill><a:blip r:embed=\"rId{k + 1}\"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>")
               .Append($"<xdr:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"{cx}\" cy=\"{cy}\"/></a:xfrm><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>");
        }
        Entry(zip, $"xl/drawings/_rels/drawing{sheet}.xml.rels", rels.Append("</Relationships>").ToString());
        Entry(zip, $"xl/drawings/drawing{sheet}.xml", xml.Append("</xdr:wsDr>").ToString());
    }

    private static void Entry(ZipArchive zip, string name, string content)
    {
        var e = zip.CreateEntry(name, CompressionLevel.Optimal);
        using var w = new StreamWriter(e.Open(), new UTF8Encoding(false));
        w.Write(content);
    }
}
