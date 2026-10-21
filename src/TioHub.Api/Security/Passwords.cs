using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;

namespace TioHub.Api.Security;

/// <summary>
/// Sign-in credential for forms authentication. Kept apart from the user record and from every business module, never
/// written to the automatic change history (password events are audited explicitly without values) and never returned by any API.
/// Only a salted PBKDF2 hash is stored.
/// </summary>
public class UserCredential
{
    public long UserId { get; set; }
    public string PasswordHash { get; set; } = "";
    public DateTimeOffset PasswordChangedAt { get; set; }
    /// <summary>Set for temporary passwords issued by an administrator; the user must choose a new one before doing anything else.</summary>
    public bool MustChangePassword { get; set; }
    public int FailedAttempts { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }
    /// <summary>Changes on every password change/reset and deactivation, which ends every existing session of the account.</summary>
    public Guid SessionStamp { get; set; } = Guid.NewGuid();
    public byte[] RowVersion { get; set; } = [];
}

/// <summary>PBKDF2-HMAC-SHA256 password hashing with a per-password random salt and a fixed-time comparison.</summary>
public static class PasswordHasher
{
    private const int Iterations = 600_000, SaltBytes = 16, HashBytes = 32;
    private const string Prefix = "pbkdf2-sha256";
    /// <summary>Verified against when the account does not exist, so a wrong account name costs the same time as a wrong password.</summary>
    private static readonly Lazy<string> Dummy = new(() => Hash(Convert.ToBase64String(RandomNumberGenerator.GetBytes(24))));

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, Iterations, HashAlgorithmName.SHA256, HashBytes);
        return $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string? stored)
    {
        var parts = (stored ?? "").Split('$');
        var usable = parts.Length == 4 && parts[0] == Prefix && int.TryParse(parts[1], out var n) && n >= 100_000;
        if (!usable) parts = Dummy.Value.Split('$');
        var salt = Convert.FromBase64String(parts[2]);
        var expected = Convert.FromBase64String(parts[3]);
        var actual = Rfc2898DeriveBytes.Pbkdf2(Encoding.UTF8.GetBytes(password), salt, int.Parse(parts[1]), HashAlgorithmName.SHA256, expected.Length);
        // Always run the full derivation, then refuse unusable or missing hashes.
        return CryptographicOperations.FixedTimeEquals(actual, expected) && usable;
    }
}

public static class PasswordPolicy
{
    public const int MinLength = 12, MaxLength = 128;
    public const string Description = "At least 12 characters (a passphrase works well), not containing the account name.";

    public static void Check(Check check, string field, string? password, string? accountName)
    {
        if (string.IsNullOrEmpty(password)) { check.Add(field, "Enter a password."); return; }
        if (password.Length < MinLength) check.Add(field, $"Use at least {MinLength} characters.");
        if (password.Length > MaxLength) check.Add(field, $"Use at most {MaxLength} characters.");
        if (password.Trim().Length != password.Length) check.Add(field, "Do not start or end the password with a space.");
        var name = (accountName ?? "").Split('\\').Last();
        if (name.Length >= 3 && password.Contains(name, StringComparison.OrdinalIgnoreCase)) check.Add(field, "The password must not contain the account name.");
        if (password.Distinct().Count() < 4) check.Add(field, "Use more varied characters.");
    }
}

/// <summary>
/// First-administrator setup for forms sign-in without any password in configuration or source control: while no active
/// administrator has a password, the server writes a random one-time setup code to a local file that only someone with access
/// to the server can read. The code is never logged and the file is deleted when the first administrator is created.
/// </summary>
public sealed class SetupCode(IOptions<AuthOptions> options, IWebHostEnvironment env, ILogger<SetupCode> log)
{
    public string FilePath => Path.GetFullPath(options.Value.SetupCodeFile, env.ContentRootPath);

    /// <summary>True while no active administrator can sign in with a password.</summary>
    public static async Task<bool> RequiredAsync(HubDbContext db, CancellationToken ct) =>
        !await db.UserCredentials.AnyAsync(c => db.Users.Any(u => u.Id == c.UserId && u.IsActive && u.Roles.Any(r => r.AppRole!.Key == BuiltInRoles.ManagerKey || (r.AppRole.Rights & Right.Administer) == Right.Administer)), ct);

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
        log.LogWarning("First-administrator setup required. Open the hub in a browser and enter the one-time setup code from {SetupCodeFile}.", FilePath);
    }

    public bool Matches(string? code)
    {
        if (string.IsNullOrWhiteSpace(code) || !File.Exists(FilePath)) return false;
        var expected = Encoding.UTF8.GetBytes(File.ReadAllText(FilePath).Trim().ToUpperInvariant());
        return CryptographicOperations.FixedTimeEquals(expected, Encoding.UTF8.GetBytes(code.Trim().ToUpperInvariant()));
    }

    public void Consume() { if (File.Exists(FilePath)) File.Delete(FilePath); }
}
