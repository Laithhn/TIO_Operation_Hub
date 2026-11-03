using TioHub.Api.Common;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class HandoverAuthorizationTests
{
    private static UserContext User(string[] permissions, long[]? clients = null, bool active = true)
    {
        var me = new UserContext();
        me.Set(new ResolvedUser(7, "test", "Test", "UTC", active, ["Custom"], Right.None,
            PermissionHierarchy.WithAncestors(permissions), Grant.None, false, clients ?? [10], [], [10], [], false, []));
        return me;
    }

    [Fact]
    public void Teams_coordinator_cannot_read_or_transfer_other_modules_without_their_permissions()
    {
        var me = User(["Teams:View", "Teams:Coordinate"]);
        Assert.False(TeamEndpoints.CanReadOwnedRecord(me, RecordTypes.Case));
        Assert.False(TeamEndpoints.CanTransferOwnedRecord(me, RecordTypes.Case, 10, null));
        Assert.False(TeamEndpoints.CanReadOwnedRecord(me, "UnknownType"));
    }

    [Fact]
    public void Transferring_ownership_requires_source_coordinate_and_full_client_scope()
    {
        var viewer = User(["Cases:View"]);
        var coordinator = User(["Cases:View", "Cases:Coordinate"]);
        var outsideScope = User(["Cases:View", "Cases:Coordinate"], [11]);
        var inactive = User(["Cases:View", "Cases:Coordinate"], active: false);
        Assert.True(TeamEndpoints.CanReadOwnedRecord(viewer, RecordTypes.Case));
        Assert.False(TeamEndpoints.CanTransferOwnedRecord(viewer, RecordTypes.Case, 10, null));
        Assert.True(TeamEndpoints.CanTransferOwnedRecord(coordinator, RecordTypes.Case, 10, null));
        Assert.False(TeamEndpoints.CanTransferOwnedRecord(outsideScope, RecordTypes.Case, 10, null));
        Assert.False(TeamEndpoints.CanTransferOwnedRecord(inactive, RecordTypes.Case, 10, null));
    }

    [Fact]
    public void Region_transfer_also_requires_its_section_permissions()
    {
        var withoutSection = User(["ClientStructure:View", "ClientStructure:Coordinate"]);
        var sectionView = PermissionHierarchy.Tab("ClientStructure", "structure", "View");
        var sectionMaintain = PermissionHierarchy.Tab("ClientStructure", "structure", "Maintain");
        var withSection = User(["ClientStructure:View", "ClientStructure:Coordinate", "ClientStructure:Maintain", "Environments:View", sectionView, sectionMaintain]);
        Assert.False(TeamEndpoints.CanReadOwnedRecord(withoutSection, RecordTypes.Region));
        Assert.False(TeamEndpoints.CanTransferOwnedRecord(withoutSection, RecordTypes.Region, 10, null));
        Assert.True(TeamEndpoints.CanTransferOwnedRecord(withSection, RecordTypes.Region, 10, null));
    }

    [Fact]
    public void Assignment_view_requires_both_source_modules()
    {
        Assert.Throws<ForbiddenException>(() => TeamEndpoints.RequireAssignmentSources(User(["Teams:View", "Cases:View"])));
        Assert.Throws<ForbiddenException>(() => TeamEndpoints.RequireAssignmentSources(User(["Teams:View", "Commitments:View"])));
        TeamEndpoints.RequireAssignmentSources(User(["Teams:View", "Cases:View", "Commitments:View"]));
    }

    [Fact]
    public void Mixed_handover_text_is_hidden_until_every_source_is_readable()
    {
        var handover = new Handover
        {
            Summary = "Case summary", OutstandingActions = "Case action", DocumentationNotes = "Case documentation",
            AcknowledgmentNote = "Acknowledgment", CancelReason = "Cancellation", ExceptionReason = "Exception",
            Items = [new HandoverItem { RecordType = RecordTypes.Case }, new HandoverItem { RecordType = RecordTypes.Commitment }]
        };
        var partiallyAuthorized = User(["Teams:View", "Cases:View"]);
        var blocked = TeamEndpoints.VisibleHandoverText(partiallyAuthorized, handover);
        Assert.Null(blocked.Summary);
        Assert.Null(blocked.OutstandingActions);
        Assert.Null(blocked.DocumentationNotes);
        Assert.Null(blocked.AcknowledgmentNote);
        Assert.Null(blocked.CancelReason);
        Assert.Null(blocked.ExceptionReason);

        var authorized = User(["Teams:View", "Cases:View", "Commitments:View"]);
        var visible = TeamEndpoints.VisibleHandoverText(authorized, handover);
        Assert.Equal("Case summary", visible.Summary);
        Assert.Equal("Case action", visible.OutstandingActions);
        Assert.Equal("Case documentation", visible.DocumentationNotes);
        Assert.Equal("Acknowledgment", visible.AcknowledgmentNote);
        Assert.Equal("Cancellation", visible.CancelReason);
        Assert.Equal("Exception", visible.ExceptionReason);

        handover.Items.Add(new HandoverItem { RecordType = "UnknownType" });
        Assert.Null(TeamEndpoints.VisibleHandoverText(authorized, handover).Summary);
        handover.Items.Clear();
        Assert.Null(TeamEndpoints.VisibleHandoverText(authorized, handover).Summary);
    }
}
