using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using TioHub.Api.Security;

namespace TioHub.Api.Data;

/// <summary>Used only by dotnet-ef to build migrations; never at run time.</summary>
public sealed class DesignTimeFactory : IDesignTimeDbContextFactory<HubDbContext>
{
    public HubDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<HubDbContext>()
            .UseSqlServer(@"Server=(localdb)\MSSQLLocalDB;Database=TioHub_Design;Trusted_Connection=True", sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "admin"))
            .Options;
        return new HubDbContext(options, new UserContext(), TimeProvider.System);
    }
}
