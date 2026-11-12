using TioHub.Api.Common;
using TioHub.Api.Security;

namespace TioHub.Api.Modules.Shared;

/// <summary>Prevents an editor from changing relationships it cannot read.</summary>
public static class RelatedRecordAccess
{
    public static bool CanApply(UserContext me, string resource, IReadOnlyCollection<long> requestedIds)
    {
        if (me.HasRight(resource, RightKeys.View)) return true;
        // Existing forms send an empty array when the related picker is unavailable.
        // Preserve hidden relationships instead of treating that as a request to clear them.
        if (requestedIds.Count == 0) return false;
        throw new ForbiddenException($"Viewing {resource} is required to change these links.");
    }
}
