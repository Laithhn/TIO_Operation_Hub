using System.Globalization;
using System.IO.Compression;
using System.Text;

namespace TioHub.Api.Common;

/// <summary>
/// A70: minimal PDF 1.4 writer (no third-party package) for management reports: A4 landscape pages, the built-in Helvetica fonts
/// (WinAnsi; characters outside it are written as "?"), text, filled rectangles and lines. Coordinates are points from the top-left
/// corner. Content streams are deflate-compressed. It is deliberately small: no embedded fonts, no links. A71: JPEG and PNG images
/// (client logos) can be drawn; see <see cref="PdfImage"/>.
/// </summary>
public sealed class PdfDocument
{
    public const double Width = 842, Height = 595;
    private readonly List<StringBuilder> _pages = [];
    private readonly List<PdfImage> _images = [];
    private StringBuilder Page => _pages[^1];
    public int PageCount => _pages.Count;

    public PdfDocument NewPage() { _pages.Add(new StringBuilder()); return this; }

    private static string N(double v) => Math.Round(v, 2).ToString("0.##", CultureInfo.InvariantCulture);
    private static string Rgb(string hex) => $"{N(Convert.ToInt32(hex[1..3], 16) / 255.0)} {N(Convert.ToInt32(hex[3..5], 16) / 255.0)} {N(Convert.ToInt32(hex[5..7], 16) / 255.0)}";

    public PdfDocument Rect(double x, double y, double w, double h, string fill)
    {
        Page.Append($"{Rgb(fill)} rg {N(x)} {N(Height - y - h)} {N(w)} {N(h)} re f\n");
        return this;
    }

    public PdfDocument Line(double x1, double y1, double x2, double y2, string color, double width = 0.5)
    {
        Page.Append($"{Rgb(color)} RG {N(width)} w {N(x1)} {N(Height - y1)} m {N(x2)} {N(Height - y2)} l S\n");
        return this;
    }

    /// <summary>A71: draws the image scaled to fit the box (aspect ratio kept, centred). The same image object is shared by every use.</summary>
    public PdfDocument Image(double x, double y, double boxW, double boxH, PdfImage img)
    {
        var n = _images.IndexOf(img);
        if (n < 0) { _images.Add(img); n = _images.Count - 1; }
        var scale = Math.Min(boxW / img.Width, boxH / img.Height);
        double w = img.Width * scale, h = img.Height * scale;
        var left = x + (boxW - w) / 2;
        var top = y + (boxH - h) / 2;
        Page.Append($"q {N(w)} 0 0 {N(h)} {N(left)} {N(Height - top - h)} cm /Im{n} Do Q\n");
        return this;
    }

    /// <summary>Text with its baseline at y.</summary>
    public PdfDocument Text(double x, double y, string text, double size = 9, bool bold = false, string color = "#1A1A1A")
    {
        Page.Append($"BT {Rgb(color)} rg /{(bold ? "F2" : "F1")} {N(size)} Tf {N(x)} {N(Height - y)} Td ({Escape(text)}) Tj ET\n");
        return this;
    }

    public PdfDocument TextRight(double right, double y, string text, double size = 9, bool bold = false, string color = "#1A1A1A") =>
        Text(right - Measure(text, size, bold), y, text, size, bold, color);

    /// <summary>Shortens text with an ellipsis to fit the width (visual only: the full value is in the Excel export).</summary>
    public static string Fit(string text, double width, double size, bool bold = false)
    {
        if (Measure(text, size, bold) <= width) return text;
        var s = text;
        while (s.Length > 0 && Measure(s + "...", size, bold) > width) s = s[..^1];
        return s.Length == 0 ? "" : s.TrimEnd() + "...";
    }

    // Helvetica advance widths (1/1000 em) for ASCII 32–126; other characters use an average width.
    private static readonly int[] Widths =
    [
        278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
        1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
        333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
    ];

    public static double Measure(string text, double size, bool bold = false) =>
        text.Sum(ch => ch is >= ' ' and <= '~' ? Widths[ch - 32] : 556) * size / 1000.0 * (bold ? 1.06 : 1.0);

    private static string Escape(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var ch in s)
        {
            var c = ch is >= ' ' and <= '~' || ch is >= ' ' and <= 'ÿ' ? ch : ch == '–' || ch == '—' ? '-' : ch == '…' ? '.' : '?';
            if (c is '(' or ')' or '\\') sb.Append('\\');
            if (c > '~') sb.Append('\\').Append(Convert.ToString(c, 8).PadLeft(3, '0'));
            else sb.Append(c);
        }
        return sb.ToString();
    }

    public byte[] Build(string title)
    {
        if (_pages.Count == 0) NewPage();
        var objects = new List<byte[]>();
        byte[] Ascii(string s) => Encoding.ASCII.GetBytes(s);
        // 1 catalog, 2 pages, 3 font, 4 bold font, 5 info, then (page, content) pairs, then the images (each with its optional alpha mask).
        var firstImage = 6 + _pages.Count * 2;
        var imageNumbers = new List<int>();
        for (int i = 0, next = firstImage; i < _images.Count; i++) { imageNumbers.Add(next); next += _images[i].Alpha is null ? 1 : 2; }
        var xobjects = _images.Count == 0 ? "" : " /XObject << " + string.Join(" ", imageNumbers.Select((num, i) => $"/Im{i} {num} 0 R")) + " >>";
        var kids = string.Join(" ", _pages.Select((_, i) => $"{6 + i * 2} 0 R"));
        objects.Add(Ascii("<< /Type /Catalog /Pages 2 0 R >>"));
        objects.Add(Ascii($"<< /Type /Pages /Kids [{kids}] /Count {_pages.Count} >>"));
        objects.Add(Ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
        objects.Add(Ascii("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
        objects.Add(Ascii($"<< /Title ({Escape(title)}) /Producer (TIO Operations Hub) /CreationDate (D:{DateTime.UtcNow:yyyyMMddHHmmss}Z) >>"));
        for (var i = 0; i < _pages.Count; i++)
        {
            objects.Add(Ascii($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {N(Width)} {N(Height)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>{xobjects} >> /Contents {7 + i * 2} 0 R >>"));
            using var ms = new MemoryStream();
            using (var z = new ZLibStream(ms, CompressionLevel.Optimal, true)) z.Write(Encoding.Latin1.GetBytes(_pages[i].ToString()));
            var data = ms.ToArray();
            objects.Add([.. Ascii($"<< /Length {data.Length} /Filter /FlateDecode >>\nstream\n"), .. data, .. Ascii("\nendstream")]);
        }
        for (var i = 0; i < _images.Count; i++)
        {
            var img = _images[i];
            var mask = img.Alpha is null ? "" : $" /SMask {imageNumbers[i] + 1} 0 R";
            var decode = img.ColorSpace == "DeviceCMYK" && img.Filter == "DCTDecode" ? " /Decode [1 0 1 0 1 0 1 0]" : "";
            objects.Add([.. Ascii($"<< /Type /XObject /Subtype /Image /Width {img.Width} /Height {img.Height} /ColorSpace /{img.ColorSpace} /BitsPerComponent 8{decode} /Filter /{img.Filter}{mask} /Length {img.Data.Length} >>\nstream\n"), .. img.Data, .. Ascii("\nendstream")]);
            if (img.Alpha is { } a)
                objects.Add([.. Ascii($"<< /Type /XObject /Subtype /Image /Width {img.Width} /Height {img.Height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length {a.Length} >>\nstream\n"), .. a, .. Ascii("\nendstream")]);
        }
        using var pdf = new MemoryStream();
        void W(byte[] b) => pdf.Write(b);
        W(Encoding.Latin1.GetBytes("%PDF-1.4\n%âãÏÓ\n"));
        var offsets = new List<long>();
        for (var i = 0; i < objects.Count; i++)
        {
            offsets.Add(pdf.Position);
            W(Ascii($"{i + 1} 0 obj\n")); W(objects[i]); W(Ascii("\nendobj\n"));
        }
        var xref = pdf.Position;
        var sb = new StringBuilder($"xref\n0 {objects.Count + 1}\n0000000000 65535 f \n");
        foreach (var o in offsets) sb.Append(o.ToString("D10", CultureInfo.InvariantCulture)).Append(" 00000 n \n");
        sb.Append($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n{xref}\n%%EOF\n");
        W(Ascii(sb.ToString()));
        return pdf.ToArray();
    }
}

/// <summary>
/// A71: an image for <see cref="PdfDocument.Image"/>. JPEG is embedded as is (DCTDecode); PNG (grey, RGB or palette, any bit depth, with or
/// without transparency, not interlaced; 16-bit is reduced to 8) is decoded and stored as deflate-compressed pixels plus an alpha mask.
/// WebP and interlaced PNG are not supported by this writer: <see cref="From"/> returns null and the caller draws its fallback instead.
/// </summary>
public sealed class PdfImage
{
    public int Width { get; private init; }
    public int Height { get; private init; }
    public string ColorSpace { get; private init; } = "DeviceRGB";
    public string Filter { get; private init; } = "FlateDecode";
    public byte[] Data { get; private init; } = [];
    public byte[]? Alpha { get; private init; }

    public static PdfImage? From(byte[] data, string contentType)
    {
        try { return contentType switch { "image/jpeg" => Jpeg(data), "image/png" => Png(data), _ => null }; }
        catch (Exception ex) when (ex is IndexOutOfRangeException or ArgumentException or InvalidDataException or IOException or OverflowException or EndOfStreamException) { return null; }
    }

    private static PdfImage? Jpeg(byte[] b)
    {
        var i = 2;
        while (i + 9 < b.Length && b[i] == 0xFF)
        {
            var m = b[i + 1];
            if (m == 0xFF) { i++; continue; }
            var len = b[i + 2] << 8 | b[i + 3];
            if (m is >= 0xC0 and <= 0xCF and not 0xC4 and not 0xC8 and not 0xCC)
            {
                var comps = b[i + 9];
                return new PdfImage { Height = b[i + 5] << 8 | b[i + 6], Width = b[i + 7] << 8 | b[i + 8], ColorSpace = comps switch { 1 => "DeviceGray", 4 => "DeviceCMYK", _ => "DeviceRGB" }, Filter = "DCTDecode", Data = b };
            }
            i += 2 + len;
        }
        return null;
    }

    private static PdfImage? Png(byte[] b)
    {
        int width = 0, height = 0, depth = 0, type = 0;
        byte[]? palette = null, trns = null;
        using var idat = new MemoryStream();
        for (var p = 8; p + 8 <= b.Length;)
        {
            var len = (int)System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(b.AsSpan(p));
            var name = Encoding.ASCII.GetString(b, p + 4, 4);
            var body = b.AsSpan(p + 8, len);
            switch (name)
            {
                case "IHDR":
                    width = (int)System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(body);
                    height = (int)System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(body[4..]);
                    depth = body[8]; type = body[9];
                    if (body[12] != 0) return null;   // interlaced
                    break;
                case "PLTE": palette = body.ToArray(); break;
                case "tRNS": trns = body.ToArray(); break;
                case "IDAT": idat.Write(body); break;
            }
            if (name == "IEND") break;
            p += 12 + len;
        }
        var channels = type switch { 0 => 1, 2 => 3, 3 => 1, 4 => 2, 6 => 4, _ => 0 };
        if (width <= 0 || height <= 0 || channels == 0 || depth is not (1 or 2 or 4 or 8 or 16) || (long)width * height > 25_000_000) return null;
        if (type == 3 && palette is null) return null;
        idat.Position = 0;
        using var z = new ZLibStream(idat, CompressionMode.Decompress);
        var stride = (width * channels * depth + 7) / 8;
        var raw = new byte[(stride + 1) * height];
        z.ReadExactly(raw);
        var bpp = Math.Max(1, channels * depth / 8);
        var prev = new byte[stride];
        var line = new byte[stride];
        var rgb = new byte[width * height * 3];
        var alpha = new byte[width * height];
        var anyAlpha = false;
        for (var y = 0; y < height; y++)
        {
            var off = y * (stride + 1);
            var filter = raw[off];
            for (var x = 0; x < stride; x++)
            {
                int a = x >= bpp ? line[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0, v = raw[off + 1 + x];
                line[x] = (byte)(filter switch { 1 => v + a, 2 => v + up, 3 => v + (a + up) / 2, 4 => v + Paeth(a, up, c), _ => v });
            }
            for (var x = 0; x < width; x++)
            {
                int Sample(int ch)
                {
                    if (depth == 16) return line[(x * channels + ch) * 2];
                    if (depth == 8) return line[x * channels + ch];
                    var bit = (x * channels + ch) * depth;
                    return line[bit / 8] >> (8 - depth - bit % 8) & ((1 << depth) - 1);
                }
                int r, g, bl, al = 255;
                switch (type)
                {
                    case 3:
                        var idx = Sample(0);
                        r = palette![idx * 3]; g = palette[idx * 3 + 1]; bl = palette[idx * 3 + 2];
                        if (trns is not null && idx < trns.Length) al = trns[idx];
                        break;
                    case 0 or 4:
                        var gv = Sample(0);
                        if (depth < 8) gv = gv * 255 / ((1 << depth) - 1);
                        r = g = bl = gv;
                        if (type == 4) al = Sample(1);
                        break;
                    default:
                        r = Sample(0); g = Sample(1); bl = Sample(2);
                        if (type == 6) al = Sample(3);
                        break;
                }
                var o = y * width + x;
                rgb[o * 3] = (byte)r; rgb[o * 3 + 1] = (byte)g; rgb[o * 3 + 2] = (byte)bl;
                alpha[o] = (byte)al;
                anyAlpha |= al != 255;
            }
            (prev, line) = (line, prev);
        }
        return new PdfImage { Width = width, Height = height, Data = Deflate(rgb), Alpha = anyAlpha ? Deflate(alpha) : null };
    }

    private static int Paeth(int a, int b, int c)
    {
        int p = a + b - c, pa = Math.Abs(p - a), pb = Math.Abs(p - b), pc = Math.Abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }

    private static byte[] Deflate(byte[] data)
    {
        using var ms = new MemoryStream();
        using (var z = new ZLibStream(ms, CompressionLevel.Optimal, true)) z.Write(data);
        return ms.ToArray();
    }
}
