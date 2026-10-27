using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace TioHub.Api.Data;

public sealed record DatabaseReadinessResult(bool Reachable, string[] MissingMigrations)
{
    public bool Ready => Reachable && MissingMigrations.Length == 0;
    public string Status => !Reachable ? "database unavailable" : Ready ? "ready" : "database schema not ready";

    public void RequireReady()
    {
        if (Ready) return;
        if (!Reachable)
            throw new InvalidOperationException("Cannot verify the database schema. Check database availability and migration-history read access, then restart. No migrations were applied by the readiness check.");
        throw new InvalidOperationException("Database schema is not ready for this application. Apply the release package's database/01-schema.sql through the approved DBA process, then restart. Missing migrations: " + string.Join(", ", MissingMigrations));
    }
}

/// <summary>Read-only deployment compatibility check. Never creates a database, changes its schema, or seeds data.</summary>
public static class DatabaseReadiness
{
    public static string[] Missing(IEnumerable<string> required, IEnumerable<string> applied) =>
        required.Except(applied, StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();

    public static async Task<DatabaseReadinessResult> CheckAsync(HubDbContext db, CancellationToken ct)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(15));
        try
        {
            if (!await db.Database.CanConnectAsync(timeout.Token)) return new(false, []);
            var applied = await db.Database.GetAppliedMigrationsAsync(timeout.Token);
            return new(true, Missing(db.Database.GetMigrations(), applied));
        }
        catch (Exception ex) when (ex is DbException or InvalidOperationException or TimeoutException ||
                                   ex is OperationCanceledException && !ct.IsCancellationRequested)
        {
            // SQL exceptions can contain connection details; public and startup errors use only the sanitized state above.
            return new(false, []);
        }
    }
}
