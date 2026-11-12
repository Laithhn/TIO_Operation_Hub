using TioHub.Api.Security;
using TioHub.Api.Common;

namespace TioHub.Tests;

public sealed class DirectoryGroupEncodingTests
{
    [Fact]
    public void Cache_keys_distinguish_group_names_from_group_separators()
    {
        var one = UserResolver.GroupCacheKey(["Alpha;Beta"]);
        var two = UserResolver.GroupCacheKey(["Alpha", "Beta"]);
        Assert.NotEqual(one, two);
        Assert.Equal(two, UserResolver.GroupCacheKey(["beta", "ALPHA", "alpha"]));
    }

    [Theory]
    [InlineData("Windows")]
    [InlineData("Development")]
    public void Observed_groups_round_trip_without_splitting_names(string mode)
    {
        var stored = UserResolver.EncodeStoredGroups(["Alpha;Beta", "Gamma"], mode);
        Assert.True(UserResolver.TryDecodeStoredGroups(stored, mode, out var groups));
        Assert.Equal(new[] { "Alpha;Beta", "Gamma" }, groups);
        Assert.DoesNotContain("Alpha", groups);
    }

    [Theory]
    [InlineData("Windows", "\0v4:w:")]
    [InlineData("Development", "\0v4:d:")]
    public void Ambiguous_legacy_invalid_and_oversized_snapshots_fail_closed(string mode, string prefix)
    {
        Assert.False(UserResolver.TryDecodeStoredGroups("Alpha;Beta", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups("v1:[\"Privileged\"]", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups("\0v2:[]", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups("\0v3:[]", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(prefix + "[null]", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(prefix + "[\"evil\\u0000group\"]", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(prefix + "not-json", mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(null, mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(UserResolver.EncodeStoredGroups([new string('x', 400)], mode), mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(UserResolver.EncodeStoredGroups(["Alpha\0Beta"], mode), mode, out _));
        Assert.Equal(400, UserResolver.EncodeStoredGroups([new string('x', 390)], mode).Length);
        Assert.True(UserResolver.TryDecodeStoredGroups(UserResolver.EncodeStoredGroups([new string('x', 390)], mode), mode, out _));
        Assert.False(UserResolver.TryDecodeStoredGroups(UserResolver.EncodeStoredGroups([new string('x', 391)], mode), mode, out _));
        Assert.True(UserResolver.TryDecodeStoredGroups(UserResolver.EncodeStoredGroups([], mode), mode, out var empty));
        Assert.Empty(empty);
        Assert.Throws<ValidationException>(() => UserResolver.RequireStoredGroups("v1:[\"Privileged\"]", mode));
    }

    [Fact]
    public void Group_snapshots_are_trusted_only_in_the_authentication_mode_that_produced_them()
    {
        var windows = UserResolver.EncodeStoredGroups(["Privileged"], "Windows");
        var development = UserResolver.EncodeStoredGroups(["TestGroup"], "Development");
        Assert.True(UserResolver.TryGroupsForMode(windows, "windows", out var windowsGroups));
        Assert.Equal(new[] { "Privileged" }, windowsGroups);
        Assert.True(UserResolver.TryGroupsForMode(development, "development", out var developmentGroups));
        Assert.Equal(new[] { "TestGroup" }, developmentGroups);
        Assert.False(UserResolver.TryGroupsForMode(development, "Windows", out _));
        Assert.False(UserResolver.TryGroupsForMode(windows, "Development", out _));
        Assert.False(UserResolver.TryGroupsForMode("\0forms", "Windows", out _));
        Assert.False(UserResolver.TryGroupsForMode("\0forms", "Development", out _));
        Assert.False(UserResolver.TryGroupsForMode(windows, "Unknown", out _));
        Assert.Throws<ValidationException>(() => UserResolver.RequireStoredGroups(development, "Windows"));
        Assert.Throws<ValidationException>(() => UserResolver.RequireStoredGroups(windows, "Development"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("\0forms")]
    [InlineData("\0v3:[\"Privileged\"]")]
    [InlineData("\0v4:w:[\"Privileged\"]")]
    [InlineData("\0v4:d:[\"TestGroup\"]")]
    public void Forms_mode_never_uses_stored_directory_groups(string? stored)
    {
        Assert.True(UserResolver.TryGroupsForMode(stored, "Forms", out var groups));
        Assert.Empty(groups);
    }
}
