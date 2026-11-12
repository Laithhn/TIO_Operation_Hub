namespace TioHub.Api.Modules.Access;

/// <summary>Serialized database generation for authorization snapshots across every application instance.</summary>
public sealed class AuthorizationVersion
{
    public int Id { get; set; } = 1;
    public long Version { get; set; }
}
