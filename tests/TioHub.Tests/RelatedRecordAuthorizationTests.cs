using TioHub.Api.Common;
using TioHub.Api.Modules.Notes;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Data;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class RelatedRecordAuthorizationTests
{
    private static UserContext User(params string[] keys)
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(42, "test", "Test", "UTC", true, ["Operator"],
            Fixture.Rights(keys), false, [10], [20], [10], [], false, []));
        return me;
    }

    [Fact]
    public void Notes_can_only_copy_labels_from_readable_modules()
    {
        var notesOnly = User("PersonalNotes:View");
        // A blank link is personal and is also how an existing link is cleared.
        NoteEndpoints.RequireLinkReadAccess(notesOnly, null, null);
        Assert.Throws<ForbiddenException>(() => NoteEndpoints.RequireLinkReadAccess(notesOnly, 10, null));
        Assert.Throws<ForbiddenException>(() => NoteEndpoints.RequireLinkReadAccess(notesOnly, 10, 20));

        var projectReader = User("PersonalNotes:View", "Projects:View");
        NoteEndpoints.RequireLinkReadAccess(projectReader, 10, 20);
        Assert.Throws<ForbiddenException>(() => NoteEndpoints.RequireLinkReadAccess(projectReader, 10, null));

        var clientReader = User("PersonalNotes:View", "Cases:View", RightKeys.Tab("ClientStructure", "cases", "View"));
        NoteEndpoints.RequireLinkReadAccess(clientReader, 10, null);
        Assert.Throws<ForbiddenException>(() => NoteEndpoints.RequireLinkReadAccess(clientReader, 10, 20));
    }

    [Theory]
    [InlineData("Products")]
    [InlineData("Environments")]
    public void Hidden_relationships_are_preserved_and_cannot_be_set_by_id(string resource)
    {
        var editor = User("Projects:Maintain", "Projects:View");
        Assert.False(RelatedRecordAccess.CanApply(editor, resource, []));
        Assert.Throws<ForbiddenException>(() => RelatedRecordAccess.CanApply(editor, resource, [123]));

        var reader = User("Projects:Maintain", "Projects:View", $"{resource}:View");
        Assert.True(RelatedRecordAccess.CanApply(reader, resource, []));
        Assert.True(RelatedRecordAccess.CanApply(reader, resource, [123]));
    }

    [Fact]
    public void Filtering_contracts_by_product_requires_product_view_access()
    {
        var options = new DbContextOptionsBuilder<HubDbContext>()
            .UseSqlServer("Server=(local);Database=unused;Integrated Security=true;TrustServerCertificate=true").Options;
        using var restricted = new HubDbContext(options, User("Contracts:View"), TimeProvider.System);
        Assert.Throws<ForbiddenException>(() => ContractQuery.Apply(restricted.Contracts, new ContractFilter(ProductId: 7), DateTimeOffset.UtcNow, restricted));
        _ = ContractQuery.Apply(restricted.Contracts, new ContractFilter(), DateTimeOffset.UtcNow, restricted);

        using var allowed = new HubDbContext(options, User("Contracts:View", "Products:View"), TimeProvider.System);
        var sql = ContractQuery.Apply(allowed.Contracts, new ContractFilter(ProductId: 7), DateTimeOffset.UtcNow, allowed).ToQueryString();
        Assert.Contains("ProjectProduct", sql);
    }
}
