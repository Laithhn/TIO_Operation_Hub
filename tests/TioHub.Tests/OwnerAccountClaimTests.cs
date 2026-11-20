using TioHub.Api.Security;
using System.Net;

namespace TioHub.Tests;

/// <summary>
/// The reserved owner account (TioAdmin): seeded with every right but no password, claimed once through a server-local one-time
/// code (break-glass, works on an already-provisioned database), and — being an administrator — protected from reset by any other
/// administrator. Runs against a real SQL Server database in forms mode, like an existing installation.
/// </summary>
public class OwnerAccountClaimTests(FormsFactory hub) : IClassFixture<FormsFactory>
{
    private const string OwnerPw = "owner chosen passphrase 2026", AdminPw = "Correct horse battery 42", TempPw = "temporary-Blue-Lantern-7";

    [Fact]
    public async Task Owner_is_seeded_without_a_password_claimed_once_and_protected_from_reset()
    {
        // Opening a session starts the host, which applies the migrations and runs the Forms-mode owner seed.
        var anon = await hub.NewSession();

        // ---- seeded on startup: present, holds all rights, full scope, and has no credential at all ----
        Assert.Equal(1, await hub.Scalar("SELECT COUNT(*) FROM iam.[User] WHERE AccountName='TioAdmin'"));
        Assert.Equal(1, await hub.Scalar("SELECT COUNT(*) FROM iam.UserRole ur JOIN iam.[User] u ON u.Id=ur.UserId JOIN iam.AppRole r ON r.Id=ur.AppRoleId WHERE u.AccountName='TioAdmin' AND r.HoldsAllRights=1"));
        Assert.Equal(2, await hub.Scalar("SELECT CAST(AllClients AS int)+CAST(AllInternal AS int) FROM iam.[User] WHERE AccountName='TioAdmin'"));
        Assert.Equal(0, await hub.Scalar("SELECT COUNT(*) FROM iam.UserCredential c JOIN iam.[User] u ON u.Id=c.UserId WHERE u.AccountName='TioAdmin'"));

        var cfg = await anon.Get("/auth/config");
        Assert.True(cfg.Body!["ownerClaimRequired"]!.GetValue<bool>());
        Assert.Equal("TioAdmin", cfg.Body["ownerAccount"]!.GetValue<string>());
        Assert.True(File.Exists(hub.OwnerClaimFile));

        // ---- a wrong code and a weak password are both refused ----
        var bad = await anon.Post("/auth/claim-owner", new { code = "WRONG", password = "short" });
        Assert.Equal(HttpStatusCode.UnprocessableEntity, bad.Status);
        Assert.NotNull(bad.Body!["errors"]!["code"]);
        Assert.NotNull(bad.Body["errors"]!["password"]);

        // ---- a separate first administrator is set up the usual way (no guard), to test the reset rule later ----
        var admin = await hub.NewSession();
        var setupCode = await File.ReadAllTextAsync(hub.SetupFile);
        Assert.Equal(HttpStatusCode.OK, (await admin.Post("/auth/setup", new { setupCode, accountName = "hub.admin", displayName = "Hub Admin", password = AdminPw })).Status);

        // ---- correct code + chosen password: the owner is signed in with the Administration right; the code file is gone ----
        var code = await File.ReadAllTextAsync(hub.OwnerClaimFile);
        var owner = await hub.NewSession();
        Assert.Equal(HttpStatusCode.OK, (await owner.Post("/auth/claim-owner", new { code = code.ToLowerInvariant(), password = OwnerPw })).Status);
        var me = (await owner.Get("/me")).Body!;
        Assert.Equal("TioAdmin", me["account"]!.GetValue<string>());
        Assert.Contains(RightKeys.Administration, me["rights"]!.AsArray().Select(r => r!.GetValue<string>()));
        Assert.False(File.Exists(hub.OwnerClaimFile));

        // ---- the claim is one-time: config no longer asks, a second attempt is a conflict, no credential was duplicated ----
        Assert.False((await (await hub.NewSession()).Get("/auth/config")).Body!["ownerClaimRequired"]!.GetValue<bool>());
        Assert.Equal(HttpStatusCode.Conflict, (await (await hub.NewSession()).Post("/auth/claim-owner", new { code, password = OwnerPw })).Status);
        Assert.Equal(1, await hub.Scalar("SELECT COUNT(*) FROM iam.UserCredential c JOIN iam.[User] u ON u.Id=c.UserId WHERE u.AccountName='TioAdmin'"));

        // ---- the owner signs in afterwards with its chosen password ----
        Assert.Equal(HttpStatusCode.OK, (await (await hub.NewSession()).Login("TioAdmin", OwnerPw)).Status);

        // ---- the owner is an administrator, so another administrator may not reset its password (the guard) ----
        var ownerId = await hub.Scalar("SELECT Id FROM iam.[User] WHERE AccountName='TioAdmin'");
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.Post($"/admin/users/{ownerId}/password", new { temporaryPassword = TempPw })).Status);

        // ---- the claim is audited without any value ----
        Assert.Equal(1, await hub.Scalar("SELECT COUNT(*) FROM audit.AuditEntry WHERE Action='OwnerAccountClaimed' AND Changes IS NULL"));
        Assert.Equal(0, await hub.Scalar("SELECT COUNT(*) FROM audit.AuditEntry WHERE Action='OwnerAccountClaimed' AND (Changes LIKE '%pbkdf2%' OR Changes LIKE '%" + OwnerPw + "%')"));
    }
}
