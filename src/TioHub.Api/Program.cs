using Microsoft.AspNetCore.Authentication.Cookies;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Negotiate;
using Microsoft.EntityFrameworkCore;
using Serilog;
using TioHub.Api;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Security;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;
var env = builder.Environment;

builder.Host.UseSerilog((ctx, services, log) => log
    .ReadFrom.Configuration(ctx.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.Configure<AuthOptions>(config.GetSection("Auth"));
builder.Services.Configure<AppOptions>(config.GetSection("App"));
builder.Services.AddScoped<UserContext>();
builder.Services.AddScoped<UserResolver>();
builder.Services.AddSingleton<SetupCode>(); // used only in forms mode; the setup endpoint answers 404 otherwise
builder.Services.AddHubServices();

var connectionString = config.GetConnectionString("TioHub");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("ConnectionStrings:TioHub is not configured.");
builder.Services.AddDbContext<HubDbContext>(o => o
    .UseSqlServer(connectionString, sql => sql
        .UseCompatibilityLevel(config.GetValue("Database:CompatibilityLevel", 150))
        .MigrationsHistoryTable("__EFMigrationsHistory", "admin")
        .CommandTimeout(60))
    // Link tables are only reached through their scope-filtered parents.
    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning)));

// ---- Sign-in: the organization's Windows sign-in in every real environment (ACC-01, NFR-01) ----
var authMode = config.GetValue("Auth:Mode", "Windows")!;
if (string.Equals(authMode, "Development", StringComparison.OrdinalIgnoreCase))
{
    // Unsafe outside a developer machine or the automated tests: refuse to start rather than run silently.
    if (!(env.IsDevelopment() || env.IsEnvironment("Testing")))
        throw new InvalidOperationException("Auth:Mode=Development is only allowed in the Development and Testing environments. Configure Forms or Windows sign-in.");
    builder.Services.AddAuthentication(DevAuthHandler.SchemeName)
        .AddScheme<AuthenticationSchemeOptions, DevAuthHandler>(DevAuthHandler.SchemeName, _ => { });
}
else if (string.Equals(authMode, "Windows", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddAuthentication(NegotiateDefaults.AuthenticationScheme).AddNegotiate();
}
else if (string.Equals(authMode, "Forms", StringComparison.OrdinalIgnoreCase))
{
    // Account name + password held by the hub (Security/AuthEndpoints.cs). Session cookie only: HttpOnly, SameSite=Strict,
    // Secure on HTTPS, ended by browser close or inactivity, and invalidated when the account's session stamp changes.
    builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
    {
        o.Cookie.Name = "TioHub.Session";
        o.Cookie.HttpOnly = true;
        o.Cookie.SameSite = SameSiteMode.Strict;
        o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        o.ExpireTimeSpan = TimeSpan.FromMinutes(Math.Max(5, config.GetValue("Auth:SessionMinutes", 480)));
        o.SlidingExpiration = true;
        // The SPA shows its own sign-in page: the API answers 401/403 instead of redirecting.
        o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = StatusCodes.Status401Unauthorized; return Task.CompletedTask; };
        o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = StatusCodes.Status403Forbidden; return Task.CompletedTask; };
        o.Events.OnValidatePrincipal = AuthEndpoints.ValidateSessionAsync;
    });
}
else
{
    throw new InvalidOperationException($"Auth:Mode '{authMode}' is not supported. Use Forms or Windows.");
}
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddAntiforgery(o =>
{
    o.HeaderName = "X-XSRF-TOKEN";
    o.Cookie.Name = "TioHub.Antiforgery";
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
});

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
    o.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
});
builder.Services.AddOpenApi("v1", o => o.AddDocumentTransformer((doc, _, _) =>
{
    doc.Info.Title = "TIO Operations Hub API";
    doc.Info.Version = "v1";
    doc.Info.Description = "Versioned REST API of the TIO Operations Hub. Every operation enforces sign-in, role, scope and grants on the server. No Jira integration exists.";
    return Task.CompletedTask;
}));

var app = builder.Build();
app.Services.GetRequiredService<TioHub.Api.Modules.Attachments.AttachmentStore>().Prepare();

// ---- Database: optional migration, then reference data ----
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<HubDbContext>();
    if (config.GetValue("Database:ApplyMigrationsOnStartup", false))
        await db.Database.MigrateAsync();
    if (config.GetValue("Database:SeedReferenceData", true))
        await ReferenceData.SeedAsync(db);
    if (config.GetValue("Database:SeedDevelopmentData", false))
    {
        if (!(env.IsDevelopment() || env.IsEnvironment("Testing")))
            throw new InvalidOperationException("Database:SeedDevelopmentData is only allowed in Development and Testing.");
        var seedClock = scope.ServiceProvider.GetRequiredService<TimeProvider>();
        if (string.Equals(config["Database:DevelopmentDataProfile"], "Portfolio", StringComparison.OrdinalIgnoreCase))
        {
            await PortfolioData.SeedAsync(db, seedClock);
            // Real names for the demo personas come only from a git-ignored local file, never from source.
            if (config["Database:LocalPeopleFile"] is { Length: > 0 } peopleFile)
                await PortfolioData.ApplyLocalPeopleAsync(db, Path.GetFullPath(peopleFile, env.ContentRootPath), app.Logger);
        }
        else await DevelopmentData.SeedAsync(db, seedClock);
    }
    if (string.Equals(authMode, "Forms", StringComparison.OrdinalIgnoreCase))
        await scope.ServiceProvider.GetRequiredService<SetupCode>().EnsureAsync(db, CancellationToken.None);
    // A48: the attachment folder and limits saved under Settings override the configuration file.
    var attachmentStore = scope.ServiceProvider.GetRequiredService<TioHub.Api.Modules.Attachments.AttachmentStore>();
    await TioHub.Api.Modules.Attachments.StorageSettings.LoadAsync(db, attachmentStore, CancellationToken.None);
    // A61: start of first-response tracking, resolution times from the status history, first SLA evaluation (re-runnable).
    await TioHub.Api.Modules.Work.CaseSla.BackfillAsync(db, DateTimeOffset.UtcNow, app.Logger, CancellationToken.None);
    attachmentStore.Prepare();
}

app.UseSerilogRequestLogging(o =>
{
    // Never log query strings: they can contain search terms with client data.
    o.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0} ms";
    o.GetLevel = (ctx, _, ex) => ex is not null || ctx.Response.StatusCode >= 500 ? Serilog.Events.LogEventLevel.Error
        : ctx.Request.Path.StartsWithSegments("/api") ? Serilog.Events.LogEventLevel.Information : Serilog.Events.LogEventLevel.Debug;
});
app.UseMiddleware<ErrorMiddleware>();
if (!env.IsDevelopment() && !env.IsEnvironment("Testing"))
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseDefaultFiles();
// index.html is never cached (also when served for a deep link by the fallback below), so an upgrade is picked up at once; hashed assets are cached for a year.
var staticFiles = new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        if (ctx.File.Name.Equals("index.html", StringComparison.OrdinalIgnoreCase))
            ctx.Context.Response.Headers.CacheControl = "no-cache, no-store";
        else if (ctx.Context.Request.Path.StartsWithSegments("/assets"))
            ctx.Context.Response.Headers.CacheControl = "public, max-age=31536000, immutable";
    }
};
app.UseStaticFiles(staticFiles);
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<UserContextMiddleware>();
app.Use(async (ctx, next) =>
{
    // Windows credentials are sent automatically by the browser, so every state-changing API call needs the antiforgery header.
    if (ctx.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(ctx.Request.Method) && !HttpMethods.IsHead(ctx.Request.Method) && !HttpMethods.IsOptions(ctx.Request.Method))
        await ctx.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(ctx);
    await next(ctx);
});

app.MapGet("/api/health/live", () => Results.Ok(new { status = "live" })).AllowAnonymous().ExcludeFromDescription();
app.MapGet("/api/health/ready", async (HubDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok(new { status = "ready" }) : Results.Json(new { status = "database unreachable" }, statusCode: 503))
    .AllowAnonymous().ExcludeFromDescription();
app.MapOpenApi("/openapi/{documentName}.json");

app.MapGroup("/api/v1").MapHubModules();

app.Map("/api/{**rest}", (HttpContext ctx) => ProblemWriter.WriteAsync(ctx, 404, "Not found", "There is no API endpoint at this address.")).ExcludeFromDescription();
// The SPA shell holds no data (every /api call is authorized), so it loads without a session and shows the sign-in page.
app.MapFallbackToFile("index.html", staticFiles).AllowAnonymous();

app.Run();

public partial class Program;

namespace TioHub.Api
{
    public sealed class AppOptions
    {
        /// <summary>Shown in the status bar, for example "UAT" or "Production".</summary>
        public string EnvironmentName { get; set; } = "Production";
        public string SupportContact { get; set; } = "";
        /// <summary>
        /// Map tile template for the dashboard map, e.g. https://tile.openstreetmap.org/{z}/{x}/{y}.png. The user's browser loads
        /// the tiles (the server never calls it). Empty = offline vector map. Only https templates with {z}/{x}/{y} are accepted.
        /// </summary>
        public string MapTileUrl { get; set; } = "";
        public string MapAttribution { get; set; } = "";

        /// <summary>The tile template when it is safe to use, otherwise null.</summary>
        public string? SafeMapTileUrl => TileUri is null ? null : MapTileUrl;

        /// <summary>Origin allowed in the CSP img-src for tiles; a {s} subdomain placeholder becomes a wildcard.</summary>
        public string? MapTileOrigin => TileUri is not { } u ? null : MapTileUrl.Contains("://{s}.") ? $"https://*.{u.Authority[(u.Authority.IndexOf('.') + 1)..]}" : $"https://{u.Authority}";

        private Uri? TileUri =>
            MapTileUrl is { Length: > 0 } t && t.StartsWith("https://", StringComparison.OrdinalIgnoreCase) && t.Contains("{z}") && t.Contains("{x}") && t.Contains("{y}")
            && Uri.TryCreate(t.Replace("{s}", "a").Replace("{z}", "0").Replace("{x}", "0").Replace("{y}", "0"), UriKind.Absolute, out var u) ? u : null;
    }

    public sealed class SecurityHeadersMiddleware(RequestDelegate next, Microsoft.Extensions.Options.IOptions<AppOptions> app)
    {
        private readonly string Csp = $"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:{(app.Value.MapTileOrigin is { } o ? " " + o : "")}; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

        public Task InvokeAsync(HttpContext ctx)
        {
            var h = ctx.Response.Headers;
            h["X-Content-Type-Options"] = "nosniff";
            h["Referrer-Policy"] = "same-origin";
            h["X-Frame-Options"] = "DENY";
            h["Content-Security-Policy"] = Csp;
            h["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
            if (ctx.Request.Path.StartsWithSegments("/api")) h.CacheControl = "no-store";
            return next(ctx);
        }
    }
}
