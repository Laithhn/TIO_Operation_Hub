using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>
/// Forms sign-in (account name + password held by the hub). Generic failure messages (no account enumeration), temporary lockout,
/// session stamps that end every session on a password change or reset, and a one-time setup code for the first administrator.
/// </summary>
public static partial class AuthEndpoints
{
    public const string StampClaim = "tiohub:stamp";
    public const string MustChangeClaim = "tiohub:must-change";
    /// <summary>Paths reachable without a session (forms mode).</summary>
    public static readonly string[] AnonymousPaths = ["/api/v1/auth/config", "/api/v1/auth/login", "/api/v1/auth/setup", "/api/v1/auth/logout"];
    /// <summary>Paths reachable while a temporary password must still be changed.</summary>
    public static readonly string[] MustChangePaths = ["/api/v1/me", "/api/v1/auth/password"];
    private const string Failed = "The account name or password is incorrect, or the account is temporarily locked.";

    public sealed record SignInInput(string? AccountName, string? Password);
    /// <summary><paramref name="TimeZone"/>: the setting-up computer's time zone (A44); it becomes the default while the shipped UTC is in place.</summary>
    public sealed record SetupInput(string? SetupCode, string? AccountName, string? DisplayName, string? Password, string? TimeZone = null);
    public sealed record ChangePasswordInput(string? CurrentPassword, string? NewPassword);
    public sealed record TemporaryPasswordInput(string? TemporaryPassword);

    [GeneratedRegex(@"^[A-Za-z0-9][A-Za-z0-9._@\\-]{1,199}$")]
    private static partial Regex AccountPattern();

    public static void MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var g = api.MapGroup("/auth").WithTags("Sign-in");

        g.MapGet("/config", async (HttpContext ctx, HubDbContext db, IOptions<AuthOptions> o, IAntiforgery af, CancellationToken ct) =>
        {
            IssueRequestToken(ctx, af);
            return Results.Ok(new { mode = o.Value.Mode, setupRequired = o.Value.IsForms && await SetupCode.RequiredAsync(db, ct), passwordRule = PasswordPolicy.Description });
        }).AllowAnonymous();

        g.MapPost("/login", async (SignInInput input, HttpContext ctx, HubDbContext db, IOptions<AuthOptions> o, IAntiforgery af, TimeProvider clock, ILogger<SignInInput> log, CancellationToken ct) =>
        {
            RequireForms(o.Value);
            var account = (input.AccountName ?? "").Trim();
            var password = input.Password ?? "";
            var now = clock.GetUtcNow();
            var user = account.Length == 0 ? null : await db.Users.FirstOrDefaultAsync(u => u.AccountName == account, ct);
            var cred = user is null ? null : await db.UserCredentials.FirstOrDefaultAsync(c => c.UserId == user.Id, ct);
            var locked = cred?.LockedUntil > now;
            // The hash is always derived, also for unknown accounts and locked ones, so response time reveals nothing.
            var ok = PasswordHasher.Verify(password, locked ? null : cred?.PasswordHash) && user!.IsActive;
            if (!ok)
            {
                if (cred is not null && !locked)
                {
                    cred.FailedAttempts++;
                    if (cred.FailedAttempts >= Math.Max(1, o.Value.LockoutAttempts))
                    {
                        cred.LockedUntil = now.AddMinutes(Math.Max(1, o.Value.LockoutMinutes));
                        cred.FailedAttempts = 0;
                        await db.SaveChangesAsync(ct);
                        await db.AuditActionAsync("SignInLocked", "User", user!.Id, user.AccountName, null, $"Locked after {o.Value.LockoutAttempts} failed attempts", null, ct, "Access");
                    }
                    else await db.SaveChangesAsync(ct);
                }
                log.LogWarning("Sign-in failed");
                await Task.Delay(Random.Shared.Next(150, 400), ct);
                return Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "Sign-in failed", detail: Failed);
            }
            cred!.FailedAttempts = 0;
            cred.LockedUntil = null;
            await db.SaveChangesAsync(ct);
            await SignInAsync(ctx, af, user!, cred);
            return Results.Ok(new { mustChangePassword = cred.MustChangePassword });
        }).AllowAnonymous();

        g.MapPost("/logout", async (HttpContext ctx, IOptions<AuthOptions> o) =>
        {
            if (o.Value.IsForms) await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.NoContent();
        }).AllowAnonymous();

        g.MapPost("/setup", async (SetupInput input, HttpContext ctx, HubDbContext db, SetupCode setup, IOptions<AuthOptions> o, IAntiforgery af, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            RequireForms(o.Value);
            if (!await SetupCode.RequiredAsync(db, ct)) throw new ConflictException("Setup is already complete. Sign in with an administrator account.");
            var check = new Check();
            if (!setup.Matches(input.SetupCode)) check.Add("setupCode", "The setup code is not correct. Copy it from the setup-code file on the server.");
            var account = (input.AccountName ?? "").Trim();
            check.When(!AccountPattern().IsMatch(account), "accountName", "Use 2–200 letters, digits, dots, hyphens, underscores, @ or a DOMAIN\\name form, without spaces.")
                 .Text("displayName", input.DisplayName, 150, "the display name", true);
            PasswordPolicy.Check(check, "password", input.Password, account);
            check.ThrowIfAny();
            var managerRole = (await BuiltInRoles.EnsureAsync(db, ct))[Role.Manager];
            var user = await db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.AccountName == account, ct);
            if (user is not null && !user.Roles.Any(r => r.AppRoleId == managerRole))
                throw new ConflictException("This account exists without the administrator role. Choose another account name.");
            // A44: the computer's time zone becomes the hub default (while still the shipped UTC) and the administrator's own.
            var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == Modules.Admin.SettingKeys.DefaultTimeZone, ct);
            var pcZone = Zones.Find(input.TimeZone) is not null ? input.TimeZone!.Trim() : null;
            if (pcZone is not null && setting is not null && (string.IsNullOrWhiteSpace(setting.Value) || setting.Value == "UTC")) setting.Value = pcZone;
            if (user is null)
            {
                user = new User { AccountName = account, DisplayName = input.DisplayName!.Trim(), IsActive = true, WorkingTimeZone = pcZone ?? setting?.Value ?? "UTC" };
                user.Roles.Add(new UserRole { AppRoleId = managerRole });
                db.Users.Add(user);
                await db.SaveChangesAsync(ct);
            }
            var cred = await db.UserCredentials.FirstOrDefaultAsync(c => c.UserId == user.Id, ct) ?? db.UserCredentials.Add(new UserCredential { UserId = user.Id }).Entity;
            SetPassword(cred, input.Password!, mustChange: false, clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
            setup.Consume();
            await db.AuditActionAsync("FirstAdministratorSetUp", "User", user.Id, user.AccountName, null, "One-time setup code used", null, ct, "Access");
            UserResolver.InvalidateAll(cache);
            await SignInAsync(ctx, af, user, cred);
            return Results.Ok(new { mustChangePassword = false });
        }).AllowAnonymous();

        g.MapPost("/password", async (ChangePasswordInput input, HttpContext ctx, HubDbContext db, UserContext me, IOptions<AuthOptions> o, IAntiforgery af, TimeProvider clock, CancellationToken ct) =>
        {
            RequireForms(o.Value);
            var user = await db.Users.FirstAsync(u => u.Id == me.UserId, ct);
            var cred = await db.UserCredentials.FirstOrDefaultAsync(c => c.UserId == user.Id, ct) ?? throw new ForbiddenException("This account has no password. Ask an administrator.");
            var check = new Check();
            if (!PasswordHasher.Verify(input.CurrentPassword ?? "", cred.PasswordHash)) check.Add("currentPassword", "The current password is not correct.");
            PasswordPolicy.Check(check, "newPassword", input.NewPassword, user.AccountName);
            if (!check.Has("currentPassword") && input.NewPassword is not null && PasswordHasher.Verify(input.NewPassword, cred.PasswordHash)) check.Add("newPassword", "Choose a password different from the current one.");
            check.ThrowIfAny();
            SetPassword(cred, input.NewPassword!, mustChange: false, clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
            await db.AuditActionAsync("PasswordChanged", "User", user.Id, user.AccountName, null, null, null, ct, "Access");
            // Other sessions of this account end (new stamp); this one continues with a fresh cookie.
            await SignInAsync(ctx, af, user, cred);
            return Results.NoContent();
        });

        api.MapPost("/admin/users/{id:long}/password", async (long id, TemporaryPasswordInput input, HubDbContext db, UserContext me, IOptions<AuthOptions> o, IMemoryCache cache, TimeProvider clock, CancellationToken ct) =>
        {
            RequireForms(o.Value);
            me.RequireAdministrator();
            if (id == me.UserId) throw new ValidationException("temporaryPassword", "Use Change password for your own account.");
            var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct) ?? throw new NotFoundException("The user");
            var check = new Check();
            PasswordPolicy.Check(check, "temporaryPassword", input.TemporaryPassword, user.AccountName);
            check.ThrowIfAny();
            var cred = await db.UserCredentials.FirstOrDefaultAsync(c => c.UserId == id, ct) ?? db.UserCredentials.Add(new UserCredential { UserId = id }).Entity;
            var first = cred.PasswordHash.Length == 0;
            SetPassword(cred, input.TemporaryPassword!, mustChange: true, clock.GetUtcNow());
            await db.SaveChangesAsync(ct);
            await db.AuditActionAsync(first ? "PasswordIssued" : "PasswordReset", "User", user.Id, user.AccountName, null, "Temporary password; must be changed at next sign-in", null, ct, "Access");
            UserResolver.InvalidateAll(cache);
            return Results.NoContent();
        }).WithTags("Administration");
        MapSignInStatus(api);
    }

    private static void MapSignInStatus(RouteGroupBuilder api) =>
        // Per-user sign-in state for administrators: never the hash, only whether a password exists and its state.
        api.MapGet("/admin/users/sign-in-status", async (HubDbContext db, UserContext me, IOptions<AuthOptions> o, TimeProvider clock, CancellationToken ct) =>
        {
            RequireForms(o.Value);
            me.RequireAdministrator();
            var now = clock.GetUtcNow();
            var rows = await db.UserCredentials.AsNoTracking().Select(c => new { c.UserId, c.MustChangePassword, c.LockedUntil, c.PasswordChangedAt }).ToListAsync(ct);
            return Results.Ok(rows.Select(c => new
            {
                userId = c.UserId,
                state = c.LockedUntil > now ? "Locked" : c.MustChangePassword ? "TemporaryPassword" : "Active",
                lockedUntil = c.LockedUntil > now ? c.LockedUntil : null,
                changedAt = c.PasswordChangedAt
            }));
        }).WithTags("Administration");

    private static void SetPassword(UserCredential cred, string password, bool mustChange, DateTimeOffset now)
    {
        cred.PasswordHash = PasswordHasher.Hash(password);
        cred.PasswordChangedAt = now;
        cred.MustChangePassword = mustChange;
        cred.FailedAttempts = 0;
        cred.LockedUntil = null;
        cred.SessionStamp = Guid.NewGuid();
    }

    private static async Task SignInAsync(HttpContext ctx, IAntiforgery af, User user, UserCredential cred)
    {
        List<Claim> claims = [new(ClaimTypes.Name, user.AccountName), new(StampClaim, cred.SessionStamp.ToString())];
        if (cred.MustChangePassword) claims.Add(new(MustChangeClaim, "1"));
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, new AuthenticationProperties { IsPersistent = false, AllowRefresh = true });
        // The antiforgery token is bound to the identity: issue a new one for the signed-in user.
        ctx.User = principal;
        IssueRequestToken(ctx, af);
    }

    /// <summary>Readable request-token cookie for the SPA (double-submit with the HttpOnly antiforgery cookie).</summary>
    public static void IssueRequestToken(HttpContext ctx, IAntiforgery af)
    {
        var tokens = af.GetAndStoreTokens(ctx);
        ctx.Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions { HttpOnly = false, SameSite = SameSiteMode.Strict, Secure = ctx.Request.IsHttps, Path = "/" });
    }

    private static void RequireForms(AuthOptions o)
    {
        if (!o.IsForms) throw new NotFoundException("Password sign-in");
    }

    /// <summary>Cookie validation: a session ends as soon as its stamp no longer matches (password changed or reset, account deactivated).</summary>
    public static async Task ValidateSessionAsync(CookieValidatePrincipalContext ctx)
    {
        var account = ctx.Principal?.Identity?.Name;
        var stamp = ctx.Principal?.FindFirst(StampClaim)?.Value;
        var db = ctx.HttpContext.RequestServices.GetRequiredService<HubDbContext>();
        var current = account is null ? null : await db.Users.AsNoTracking().Where(u => u.AccountName == account && u.IsActive)
            .Join(db.UserCredentials.AsNoTracking(), u => u.Id, c => c.UserId, (u, c) => (Guid?)c.SessionStamp).FirstOrDefaultAsync(ctx.HttpContext.RequestAborted);
        if (current is null || current.ToString() != stamp)
        {
            ctx.RejectPrincipal();
            await ctx.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        }
    }
}
