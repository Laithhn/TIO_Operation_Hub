using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Attachments;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class LinkedRecordScopeTests
{
    private static UserContext User(params long[] clients)
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(42, "scope-test", "Scope test", "UTC", true, ["Operator"], Right.None,
            PermissionHierarchy.WithAncestors(["Cases:View"]), Grant.None, false, clients, [20], [30], [40], false, [50]));
        return me;
    }

    [Fact]
    public void Attachment_mutation_requires_both_snapshot_and_current_target_scope()
    {
        var file = new Attachment { RecordType = RecordTypes.Case, RecordId = 7, ClientId = 10 };
        var original = new AttachmentEndpoints.Target(RecordTypes.Case, 7, 10, null, "original");
        var moved = new AttachmentEndpoints.Target(RecordTypes.Case, 7, 11, null, "moved");
        Assert.True(AttachmentEndpoints.CanModifyTarget(User(10), file, original));
        Assert.False(AttachmentEndpoints.CanModifyTarget(User(10), file, moved));
        Assert.False(AttachmentEndpoints.CanModifyTarget(User(11), file, moved));
        Assert.True(AttachmentEndpoints.CanModifyTarget(User(10, 11), file, moved));
        Assert.False(AttachmentEndpoints.CanModifyTarget(User(10), file, null));
        Assert.False(AttachmentEndpoints.CanModifyTarget(User(10), file, original with { Id = 8 }));
        Assert.False(AttachmentEndpoints.CanModifyTarget(User(10), file, original with { Type = RecordTypes.Project }));
    }

    [Fact]
    public void Project_scoped_commitments_and_escalations_translate_link_visibility_to_sql()
    {
        var options = new DbContextOptionsBuilder<HubDbContext>()
            .UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var db = new HubDbContext(options, User(), TimeProvider.System);
        var commitmentSql = db.Commitments.ToQueryString();
        var escalationSql = db.Escalations.ToQueryString();
        foreach (var sql in new[] { commitmentSql, escalationSql })
        {
            Assert.Contains("CaseEnvironment", sql);
            Assert.Contains("CaseAsset", sql);
            Assert.Contains("CaseComponent", sql);
            Assert.Contains("NOT EXISTS", sql);
        }
        Assert.Contains("Contract", escalationSql);
    }

    [Fact]
    public void Cloning_requires_source_read_permissions_even_when_destination_create_is_granted()
    {
        UserContext With(params string[] permissions)
        {
            var me = new UserContext();
            me.Set(new ResolvedUser(42, "clone-test", "Clone test", "UTC", true, ["Operator"], Right.None,
                PermissionHierarchy.WithAncestors(permissions), Grant.None, false, [10], [], [], [], false, []));
            return me;
        }
        var creator = With("Environments:Create", "Environments:View", "Servers:Create", "Installations:Create");
        Assert.Throws<ForbiddenException>(() => CloneEndpoints.RequireSourcePermissions(creator, false, true, false, false));
        var serverReader = With("Environments:View", "Servers:View", "Servers:DetailsView");
        CloneEndpoints.RequireSourcePermissions(serverReader, false, true, false, false);
        Assert.Throws<ForbiddenException>(() => CloneEndpoints.RequireSourcePermissions(serverReader, false, true, false, true));
        var bothReaders = With("Environments:View", "Servers:View", "Servers:DetailsView", "Installations:View", "Installations:DetailsView");
        CloneEndpoints.RequireSourcePermissions(bothReaders, false, true, false, true);
        Assert.Throws<ForbiddenException>(() => CloneEndpoints.RequireSourcePermissions(bothReaders, true, true, false, true));
    }
}
