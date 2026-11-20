using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>
/// The reserved owner account (<c>TioAdmin</c>): a single, named, fully-audited break-glass account that holds every right.
/// It is seeded without any password; its first password is set by whoever can read a one-time claim code written to a file on
/// the server (see <see cref="OwnerClaimCode"/>), so no password is ever stored in source control or seed data. The account is an
/// ordinary administrator, visible in Administration, placed under the built-in System Administrator role (A127), so it may reset
/// any account's password; only a non-System-Administrator administrator could not reset it.
/// </summary>
public static class OwnerAccount
{
    public const string AccountName = "TioAdmin";
    public const string DisplayName = "TIO Administrator (owner)";

    /// <summary>
    /// Forms mode only: provision the reserved owner account once, with the all-rights role and full client/internal scope, and no
    /// credential. Idempotent and non-destructive — if the account already exists (active, inactive, claimed, or renamed display),
    /// nothing is changed, so administrator edits and a set password are preserved.
    /// </summary>
    public static async Task EnsureSeededAsync(HubDbContext db, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.AccountName == AccountName, ct)) return;
        var roleId = await RoleAccess.EnsureFullAccessRoleAsync(db, ct);
        var user = new User
        {
            AccountName = AccountName,
            DisplayName = DisplayName,
            IsActive = true,
            LoginEnabled = true,
            AllClients = true,
            AllInternal = true,
        };
        user.Roles.Add(new UserRole { AppRoleId = roleId });
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);
    }
}

/// <summary>
/// Break-glass claim for the reserved owner account. While <see cref="OwnerAccount.AccountName"/> exists, is active, and has no usable
/// password, the server writes a random one-time claim code to a local file that only someone with access to the server can read.
/// The code is never logged and the file is deleted once the owner account has a password. This mirrors the first-administrator
/// setup code (<see cref="SetupCode"/>) but is scoped to the one reserved account and works even when other administrators exist, so
/// the owner can be claimed on an already-provisioned database. It only ever sets a first password; it never resets an existing one.
/// </summary>
public sealed class OwnerClaimCode(IOptions<AuthOptions> options, IWebHostEnvironment env, ILogger<OwnerClaimCode> log)
{
    public const string AccountName = OwnerAccount.AccountName;
    public string FilePath => Path.GetFullPath(options.Value.OwnerClaimCodeFile, env.ContentRootPath);

    /// <summary>True while the reserved owner account is present and active but still has no usable Forms credential.</summary>
    public static async Task<bool> RequiredAsync(HubDbContext db, CancellationToken ct)
    {
        var owner = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.AccountName == AccountName && u.IsActive, ct);
        if (owner is null) return false;
        var hash = await db.UserCredentials.AsNoTracking().Where(c => c.UserId == owner.Id).Select(c => c.PasswordHash).FirstOrDefaultAsync(ct);
        return !RoleConflicts.IsUsableFormsCredential(hash);
    }

    public async Task EnsureAsync(HubDbContext db, CancellationToken ct)
    {
        if (!await RequiredAsync(db, ct))
        {
            if (File.Exists(FilePath)) File.Delete(FilePath);
            return;
        }
        if (!File.Exists(FilePath))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
            await File.WriteAllTextAsync(FilePath, Convert.ToHexString(RandomNumberGenerator.GetBytes(16)), ct);
        }
        log.LogWarning("Owner account '{Account}' is unclaimed. Set its password in the browser using the one-time claim code from {OwnerClaimCodeFile}.", AccountName, FilePath);
    }

    public bool Matches(string? code)
    {
        if (string.IsNullOrWhiteSpace(code) || !File.Exists(FilePath)) return false;
        var expected = Encoding.UTF8.GetBytes(File.ReadAllText(FilePath).Trim().ToUpperInvariant());
        return CryptographicOperations.FixedTimeEquals(expected, Encoding.UTF8.GetBytes(code.Trim().ToUpperInvariant()));
    }

    public void Consume() { if (File.Exists(FilePath)) File.Delete(FilePath); }
}
