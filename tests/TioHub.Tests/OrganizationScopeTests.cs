using TioHub.Api.Data;
using TioHub.Api.Common;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Security;

namespace TioHub.Tests;

public sealed class OrganizationScopeTests
{
    private static UserContext Limited()
    {
        var user = new UserContext();
        user.Set(new ResolvedUser(42, "scope-test", "Scope test", "UTC", true, ["Operator"], Right.None,
            PermissionHierarchy.WithAncestors(["ClientStructure:View"]), Grant.None, false, [10], [20], [30], [40], false, [50]));
        return user;
    }

    [Fact]
    public void Project_scope_exposes_client_identity_but_not_client_wide_organization_details()
    {
        var user = Limited();
        var row = new Organization
        {
            Id = 1, ClientId = 30, Client = new Client { Id = 30, Code = "CLIENT", Name = "Client" },
            Description = "Private description", OrganizationType = "Private type", Email = "private@example.test",
            Phone = "Private phone", Address = "Private address", Status = "Private status", RowVersion = []
        };
        var dto = OrganizationEndpoints.Dto(row, user);
        Assert.Equal("Client", dto.Name);
        Assert.Equal("CLIENT", dto.Code);
        Assert.Null(dto.Description);
        Assert.Null(dto.OrganizationType);
        Assert.Null(dto.Email);
        Assert.Null(dto.Phone);
        Assert.Null(dto.Address);
        Assert.Null(dto.Status);

        row.ClientId = 10;
        var full = OrganizationEndpoints.Dto(row, user);
        Assert.Equal("Private description", full.Description);
        Assert.Equal("private@example.test", full.Email);
        Assert.Equal("Private address", full.Address);
    }

    [Fact]
    public void Visible_independent_organizations_keep_their_details()
    {
        var row = new Organization { Id = 1, Name = "Supplier", Email = "supplier@example.test", RowVersion = [] };
        var dto = OrganizationEndpoints.Dto(row, Limited());
        Assert.Equal("Supplier", dto.Name);
        Assert.Equal("supplier@example.test", dto.Email);
    }
}
