using TioHub.Api.Modules.Reporting;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class ScheduledExportAccessTests
{
    [Fact]
    public void Any_possible_direct_and_directory_role_conflict_refuses_the_schedule()
    {
        var pairs = new[] { new RoleConflicts.Pair(1, 2), new RoleConflicts.Pair(3, 4) };
        Assert.True(ScheduledExportAccess.CouldRestrict([1], [2], pairs, false, false, false));
        Assert.True(ScheduledExportAccess.CouldRestrict([], [3, 4], pairs, false, false, false));
        Assert.True(ScheduledExportAccess.CouldRestrict([3, 4], [], pairs, false, false, false));
        Assert.False(ScheduledExportAccess.CouldRestrict([1], [3], pairs, false, false, false));
    }

    [Fact]
    public void Possible_administrator_membership_can_suppress_direct_allows()
    {
        Assert.True(ScheduledExportAccess.CouldRestrict([1], [2], [], false, true, true));
        Assert.False(ScheduledExportAccess.CouldRestrict([1], [2], [], false, false, true));
        Assert.False(ScheduledExportAccess.CouldRestrict([1], [2], [], false, true, false));
        Assert.False(ScheduledExportAccess.CouldRestrict([1], [2], [], true, true, true));
    }
}
