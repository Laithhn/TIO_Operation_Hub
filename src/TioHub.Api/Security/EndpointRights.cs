using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Data;

namespace TioHub.Api.Security;

/// <summary>Requirements that depend on a record or a query value and so cannot be a fixed list.</summary>
public enum DynamicPolicy { None, Attachment, ClientTab, ArchivedRead, AuditRead, ReportExport, ExportJob }

/// <summary>
/// The authorization decision of one endpoint. <paramref name="Rights"/> are enforced by <see cref="EndpointRightsFilter"/> before the handler runs.
/// <paramref name="HandlerRights"/> are enforced inside the handler, because they depend on the record (scope, contextual exceptions, workflow);
/// listing them keeps the table a complete account of what each endpoint needs. Handler checks always add to the filter, never replace it.
/// </summary>
public sealed record EndpointPolicy(string Decision, string[] Rights, string[] HandlerRights, DynamicPolicy Dynamic, string? Remark)
{
    public EndpointPolicy Also(params string[] handlerRights) => this with { HandlerRights = [.. HandlerRights, .. handlerRights] };
    public EndpointPolicy Note(string remark) => this with { Remark = remark };
}

/// <summary>
/// One decision for every API operation, keyed by method and route template. A route that is not listed is refused, and
/// <c>EndpointRightsCoverageTests</c> fails if any mapped route is missing. Matching the route template, not the URL text, means casing
/// and path tricks cannot select a different policy. See docs/RIGHTS-COVERAGE-MATRIX.md, generated from this table.
/// </summary>
public static class EndpointRights
{
    public const string PublicDecision = "Public", AuthenticatedDecision = "Authenticated", RightsDecision = "Rights", HandlerDecision = "Handler", DynamicDecision = "Dynamic";

    private static EndpointPolicy Public(string why) => new(PublicDecision, [], [], DynamicPolicy.None, why);
    private static EndpointPolicy Authenticated(string why) => new(AuthenticatedDecision, [], [], DynamicPolicy.None, why);
    private static EndpointPolicy Rights(params string[] keys) => new(RightsDecision, keys, [], DynamicPolicy.None, null);
    private static EndpointPolicy Handler(params string[] keys) => new(HandlerDecision, [], keys, DynamicPolicy.None, null);
    private static EndpointPolicy HandlerOnly(string why) => new(HandlerDecision, [], [], DynamicPolicy.None, why);
    private static EndpointPolicy Dynamic(DynamicPolicy policy, params string[] keys) => new(DynamicDecision, keys, [], policy, null);

    public static readonly IReadOnlyDictionary<string, EndpointPolicy> Table = new Dictionary<string, EndpointPolicy>(StringComparer.OrdinalIgnoreCase)
    {
        ["GET /admin/archived"] = Dynamic(DynamicPolicy.ArchivedRead),
        ["POST /admin/archived/{recordType}/{id:long}/restore"] = HandlerOnly("Depends on the record type: the owning module's ArchiveRestore right and full client scope."),
        ["GET /admin/attachment-storage"] = Rights("AdminSettings:View").Also("Platform:Administration"),
        ["PUT /admin/attachment-storage"] = Rights("AdminSettings:Maintain").Also("Platform:Administration"),
        ["GET /admin/audit"] = Dynamic(DynamicPolicy.AuditRead, "AdminAudit:View"),
        ["POST /admin/corrections/clients/{id:long}/code"] = Rights("AdminConfig:Maintain").Also("Platform:Administration"),
        ["GET /admin/exports"] = Rights("ReportHistory:View"),
        ["GET /admin/group-mappings"] = Rights("AdminGroups:View").Also("Platform:Administration"),
        ["POST /admin/group-mappings"] = Rights("AdminGroups:Create").Also("Platform:Administration"),
        ["PUT /admin/group-mappings/{id:long}"] = Rights("AdminGroups:Maintain").Also("Platform:Administration"),
        ["GET /admin/jira-connections"] = Rights("AdminIntegrations:View"),
        ["POST /admin/jira-connections"] = Rights("AdminIntegrations:Create"),
        ["PUT /admin/jira-connections/{id:long}"] = Rights("AdminIntegrations:Maintain"),
        ["GET /admin/jira-connections/{id:long}/client-contacts"] = Rights("AdminIntegrations:View"),
        ["GET /admin/jira-connections/{id:long}/mappable-users"] = Rights("AdminIntegrations:View"),
        ["POST /admin/jira-connections/{id:long}/credentials"] = Rights("AdminIntegrations:Maintain"),
        ["POST /admin/jira-connections/{id:long}/recalculate-first-responses"] = Rights("AdminIntegrations:Maintain"),
        ["POST /admin/jira-connections/{id:long}/discover"] = Rights("AdminIntegrations:Maintain"),
        ["POST /admin/jira-connections/{id:long}/enabled"] = Rights("AdminIntegrations:Maintain"),
        ["GET /admin/jira-connections/{id:long}/spaces"] = Rights("AdminIntegrations:View"),
        ["POST /admin/jira-connections/{id:long}/spaces/{projectId}/reassign"] = Rights("AdminIntegrations:Maintain").Also("ClientStructure:Coordinate"),
        ["GET /admin/jira-connections/{id:long}/statuses"] = Rights("AdminIntegrations:View"),
        ["POST /admin/jira-connections/{id:long}/statuses/discover"] = Rights("AdminIntegrations:Maintain"),
        ["POST /admin/jira-connections/{id:long}/test"] = Rights("AdminIntegrations:Maintain"),
        ["GET /admin/jira-connections/{id:long}/users"] = Rights("AdminIntegrations:View"),
        ["GET /admin/jira-instances"] = Rights("AdminConfig:View").Also("Platform:Administration"),
        ["PUT /admin/jira-instances/{id:long}"] = Rights("AdminConfig:Maintain").Also("Platform:Administration"),
        ["GET /admin/jira-issues"] = Rights("AdminIntegrations:View"),
        ["POST /admin/jira-issues/{id:long}/resolve"] = Rights("AdminIntegrations:Maintain").Also("Cases:Coordinate"),
        ["PUT /admin/jira-status-mappings/{id:long}"] = Rights("AdminIntegrations:Maintain"),
        ["GET /admin/jira-sync/health"] = Rights("AdminIntegrations:View"),
        ["GET /admin/jira-sync/runs"] = Rights("AdminIntegrations:View"),
        ["PUT /admin/jira-user-mappings/{id:long}"] = Rights("AdminIntegrations:Maintain"),
        ["POST /admin/jira-user-mappings/{id:long}/contact"] = Rights("AdminIntegrations:Maintain"),
        ["POST /admin/jira-user-mappings/{id:long}/team-member"] = Rights("AdminIntegrations:Maintain", "AdminUsers:Create"),
        ["POST /admin/jira-user-mappings/{id:long}/user"] = Rights("AdminIntegrations:Maintain", "AdminUsers:Create").Also("Platform:Administration"),
        ["GET /admin/lookups"] = Rights("AdminConfig:View").Also("Platform:Administration"),
        ["POST /admin/lookups"] = Rights("AdminConfig:Create").Also("Platform:Administration"),
        ["PUT /admin/lookups/{id:long}"] = Rights("AdminConfig:Maintain").Also("Platform:Administration"),
        ["DELETE /admin/lookups/{id:long}"] = Rights("AdminConfig:Delete").Also("Platform:Administration"),
        ["POST /admin/lookups/{list}/order"] = Rights("AdminConfig:Maintain").Also("Platform:Administration"),
        ["GET /admin/lookups/{list}/usage"] = Rights("AdminConfig:View").Also("Platform:Administration"),
        ["GET /admin/roles"] = Rights("AdminRoles:View").Also("Platform:Administration"),
        ["POST /admin/roles"] = Rights("AdminRoles:Create").Also("Platform:Administration"),
        ["GET /admin/roles/{id:long}/holders"] = Rights("AdminRoles:View", "AdminUsers:View"),
        ["GET /admin/roles/conflicts"] = Rights("AdminRoles:View").Also("Platform:Administration"),
        ["PUT /admin/roles/conflicts"] = Rights("AdminRoles:Maintain").Also("Platform:Administration"),
        ["PUT /admin/roles/{id:long}"] = Rights("AdminRoles:Maintain").Also("Platform:Administration"),
        ["DELETE /admin/roles/{id:long}"] = Rights("AdminRoles:Delete").Also("Platform:Administration"),
        ["POST /admin/roles/{id:long}/clone"] = Rights("AdminRoles:Create").Also("Platform:Administration"),
        ["GET /admin/scope-targets"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["GET /admin/settings"] = Rights("AdminSettings:View").Also("Platform:Administration"),
        ["PUT /admin/settings/{id:long}"] = Rights("AdminSettings:Maintain").Also("Platform:Administration"),
        ["GET /admin/users"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["POST /admin/users"] = Rights("AdminUsers:Create").Also("Platform:Administration"),
        ["GET /admin/users/sign-in-status"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["GET /admin/users/{id:long}"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["PUT /admin/users/{id:long}"] = Rights("AdminUsers:Maintain").Also("Platform:Administration"),
        ["DELETE /admin/users/{id:long}"] = Rights("AdminUsers:Delete").Also("Platform:Administration"),
        ["GET /admin/users/{id:long}/access"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["GET /admin/users/{id:long}/access-simulation"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["POST /admin/users/{id:long}/deactivate"] = Rights("AdminUsers:Maintain").Also("Platform:Administration"),
        ["POST /admin/users/{id:long}/login-access"] = Rights("AdminUsers:Maintain").Also("Platform:Administration"),
        ["POST /admin/users/{id:long}/password"] = Rights("AdminUsers:Maintain").Also("Platform:Administration"),
        ["GET /admin/users/{id:long}/password-reset-availability"] = Rights("AdminUsers:View").Also("AdminUsers:Maintain", "Platform:Administration"),
        ["GET /admin/users/{id:long}/right-exceptions"] = Rights("AdminUsers:View").Also("Platform:Administration"),
        ["PUT /admin/users/{id:long}/right-exceptions"] = Rights("AdminUsers:Maintain").Also("Platform:Administration"),
        ["POST /admin/users/{id:long}/reactivate"] = Rights("AdminUsers:Maintain").Also("Platform:Administration"),
        ["GET /assets"] = Rights("Servers:View"),
        ["POST /assets"] = Handler("Servers:Create"),
        ["GET /assets/{id:long}"] = Rights("Servers:DetailsView", "Servers:View").Also("OtherOperations:View"),
        ["PUT /assets/{id:long}"] = Handler("Servers:Maintain"),
        ["DELETE /assets/{id:long}"] = Handler("Servers:Delete"),
        ["POST /assets/{id:long}/archive"] = Handler("Servers:ArchiveRestore"),
        ["PUT /assets/{id:long}/microservices"] = Handler("Servers:Maintain"),
        ["POST /assets/{id:long}/volumes"] = Handler("Servers:Maintain"),
        ["GET /attachments"] = Dynamic(DynamicPolicy.Attachment),
        ["POST /attachments"] = Dynamic(DynamicPolicy.Attachment),
        ["GET /attachments/limits"] = Authenticated("Upload limits. The storage path is shown only to administrators."),
        ["PUT /attachments/{id:long}"] = Dynamic(DynamicPolicy.Attachment),
        ["DELETE /attachments/{id:long}"] = Dynamic(DynamicPolicy.Attachment),
        ["GET /attachments/{id:long}/download"] = Dynamic(DynamicPolicy.Attachment),
        ["GET /attachments/{id:long}/preview"] = Dynamic(DynamicPolicy.Attachment),
        ["GET /auth/config"] = Public("Tells the sign-in page which mode is active."),
        ["POST /auth/login"] = Public("Sign-in itself."),
        ["POST /auth/logout"] = Public("Ends the caller's own session."),
        ["POST /auth/password"] = Authenticated("Changes the caller's own password."),
        ["POST /auth/setup"] = Public("One-time first administrator setup, protected by the setup code."),
        ["PUT /boundaries/{id:long}"] = Rights("tab.ClientStructure.contacts:Maintain").Also("OtherOperations:Maintain"),
        ["DELETE /boundaries/{id:long}"] = Rights("tab.ClientStructure.contacts:Delete"),
        ["POST /boundaries/{id:long}/archive"] = Rights("tab.ClientStructure.contacts:ArchiveRestore").Also("ClientStructure:Create", "OtherOperations:ArchiveRestore"),
        ["GET /cases"] = Rights("Cases:View"),
        ["GET /cases/quick-views"] = Rights("Cases:View"),
        ["POST /cases"] = Handler("Cases:Coordinate", "Cases:Create", "tab.Cases.jira:Create"),
        ["GET /cases/{id:long}"] = Rights("Cases:DetailsView", "Cases:View").Also("Cases:HistoryView", "Commitments:View", "Environments:View", "Servers:View", "tab.Cases.timeline:View"),
        ["PUT /cases/{id:long}"] = Handler("Cases:Coordinate", "Cases:Maintain", "tab.Cases.affected:View"),
        ["DELETE /cases/{id:long}"] = Handler("Cases:Delete"),
        ["GET /cases/{id:long}/activity"] = Rights("Cases:DetailsView", "Cases:View").Also("Cases:Coordinate", "Cases:HistoryView", "tab.Cases.timeline:View"),
        ["POST /cases/{id:long}/assign"] = Handler("Cases:Coordinate", "Cases:Maintain"),
        ["POST /cases/{id:long}/cancel"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/close"] = Handler("Cases:Coordinate", "Cases:Maintain"),
        ["POST /cases/{id:long}/comments"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/contract"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/due"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/first-response"] = Handler("Cases:Maintain"),
        ["GET /cases/{id:long}/impact"] = Rights("Cases:DetailsView", "Cases:View", "tab.Cases.impact:View").Also("Cases:Coordinate", "Cases:Maintain"),
        ["POST /cases/{id:long}/jira"] = Rights("tab.Cases.jira:Create").Also("Cases:Maintain"),
        ["POST /cases/{id:long}/jira-source/sync"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/jira/{refId:long}/remove"] = Rights("tab.Cases.jira:Delete").Also("Cases:Maintain"),
        ["GET /cases/{id:long}/penalty-preview"] = Rights("Cases:DetailsView", "Cases:View"),
        ["POST /cases/{id:long}/progress"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/reopen"] = Handler("Cases:Coordinate"),
        ["POST /cases/{id:long}/request-validation"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/resume"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/start"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/status"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/triage"] = Handler("Cases:Coordinate"),
        ["POST /cases/{id:long}/waiting"] = Handler("Cases:Maintain"),
        ["POST /cases/{id:long}/waiting/clear"] = Handler("Cases:Maintain"),
        ["GET /clients"] = Rights("ClientStructure:Access").Also("Cases:View", "ClientStructure:View", "Commitments:View", "Environments:View"),
        ["POST /clients"] = Rights("ClientStructure:Access").Also("ClientStructure:Create"),
        ["GET /clients/duplicates"] = Rights("ClientStructure:Access", "ClientStructure:View"),
        ["GET /clients/logo-rules"] = Rights("ClientStructure:Access", "ClientStructure:View"),
        ["GET /clients/logos"] = Rights("ClientStructure:View"),
        ["POST /clients/{clientId:long}/organization-relationships"] = Rights("tab.ClientStructure.organizations:Create"),
        ["PUT /clients/{clientId:long}/organization-relationships/{id:long}"] = Rights("tab.ClientStructure.organizations:Maintain"),
        ["DELETE /clients/{clientId:long}/organization-relationships/{id:long}"] = Rights("tab.ClientStructure.organizations:Delete").Also("ClientStructure:Coordinate", "ClientStructure:Create", "ClientStructure:Maintain", "tab.ClientStructure.organizations:Create"),
        ["GET /clients/{clientId:long}/organizational-structure"] = Rights("ClientStructure:View", "tab.ClientStructure.organizations:View"),
        ["GET /clients/{id:long}"] = Rights("ClientStructure:Access").Also("ClientStructure:View", "Environments:View", "Installations:View", "Products:View", "Servers:View", "Teams:View"),
        ["PUT /clients/{id:long}"] = Rights("ClientStructure:Access").Also("ClientStructure:Maintain"),
        ["DELETE /clients/{id:long}"] = Rights("ClientStructure:Access"),
        ["GET /clients/{id:long}/status-reports"] = Rights("ClientDashboard:View"),
        ["POST /clients/{id:long}/status-reports"] = Handler("ClientStructure:Maintain"),
        ["GET /clients/{id:long}/active-work"] = Rights("Cases:View", "ClientStructure:Access", "ClientStructure:View", "Commitments:View", "Environments:View"),
        ["POST /clients/{id:long}/archive"] = Rights("ClientStructure:Access").Also("ClientStructure:ArchiveRestore", "ClientStructure:Coordinate"),
        ["GET /clients/{id:long}/boundaries"] = Rights("OtherOperations:View", "tab.ClientStructure.contacts:View"),
        ["POST /clients/{id:long}/boundaries"] = Rights("tab.ClientStructure.contacts:Create").Also("OtherOperations:Create"),
        ["GET /clients/{id:long}/contacts"] = Rights("OtherOperations:View", "tab.ClientStructure.contacts:View"),
        ["POST /clients/{id:long}/contacts"] = Rights("tab.ClientStructure.contacts:Create").Also("OtherOperations:Create"),
        ["GET /clients/{id:long}/jira"] = Rights("ClientStructure:View", "tab.ClientStructure.jira:View").Also("ClientStructure:Coordinate"),
        ["PUT /clients/{id:long}/jira"] = Rights("tab.ClientStructure.jira:View"),
        ["GET /clients/{id:long}/jira/available-spaces"] = Rights("ClientStructure:View", "tab.ClientStructure.jira:View"),
        ["POST /clients/{id:long}/jira/preview"] = Rights("tab.ClientStructure.jira:View"),
        ["GET /clients/{id:long}/jira/runs"] = Rights("ClientStructure:View", "tab.ClientStructure.jira:View"),
        ["GET /clients/{id:long}/jira/runs.csv"] = Rights("ClientStructure:View", "tab.ClientStructure.jira:View"),
        ["PUT /clients/{id:long}/jira/value-mappings/{mappingId:long}"] = Rights("tab.ClientStructure.jira:View"),
        ["POST /clients/{id:long}/jira/spaces"] = Rights("tab.ClientStructure.jira:View"),
        ["PUT /clients/{id:long}/jira/spaces/{spaceId:long}"] = Rights("tab.ClientStructure.jira:View"),
        ["PUT /clients/{id:long}/jira/spaces/{spaceId:long}/contracts"] = Rights("tab.ClientStructure.jira:View"),
        ["POST /clients/{id:long}/jira/spaces/{spaceId:long}/release"] = Rights("tab.ClientStructure.jira:View"),
        ["POST /clients/{id:long}/jira/sync"] = Rights("tab.ClientStructure.jira:View"),
        ["GET /clients/{id:long}/logo"] = HandlerOnly("Any effective access plus client scope. A logo identifies a client the caller can already see."),
        ["PUT /clients/{id:long}/logo"] = Handler("ClientStructure:Maintain"),
        ["DELETE /clients/{id:long}/logo"] = Handler("ClientStructure:Maintain"),
        ["GET /clients/{id:long}/overview"] = Dynamic(DynamicPolicy.ClientTab).Also("Cases:View", "ClientStructure:View", "Environments:View", "Installations:View", "Products:View", "Projects:View", "Servers:View"),
        ["GET /clients/{id:long}/regions"] = Rights("ClientStructure:View", "tab.ClientStructure.structure:View").Also("Environments:View"),
        ["POST /clients/{id:long}/regions"] = Rights("tab.ClientStructure.structure:Create").Also("ClientStructure:Create"),
        ["GET /commitments"] = Rights("Commitments:View"),
        ["POST /commitments"] = Handler("Commitments:Coordinate", "Commitments:Create"),
        ["GET /commitments/{id:long}"] = Rights("Commitments:DetailsView", "Commitments:View").Also("Commitments:HistoryView", "Commitments:Maintain"),
        ["PUT /commitments/{id:long}"] = Handler("Commitments:Maintain"),
        ["DELETE /commitments/{id:long}"] = Handler("Commitments:Delete"),
        ["POST /commitments/{id:long}/cancel"] = Handler("Commitments:Maintain"),
        ["POST /commitments/{id:long}/complete"] = Handler("Commitments:Maintain"),
        ["POST /commitments/{id:long}/reopen"] = Handler("Commitments:Maintain"),
        ["POST /commitments/{id:long}/revise"] = Handler("Commitments:Maintain"),
        ["POST /components"] = Handler("Servers:Create"),
        ["GET /components/{id:long}"] = Rights("Servers:DetailsView", "Servers:View"),
        ["PUT /components/{id:long}"] = Handler("Servers:Maintain"),
        ["DELETE /components/{id:long}"] = Handler("Servers:Delete"),
        ["POST /components/{id:long}/archive"] = Handler("Servers:ArchiveRestore"),
        ["PUT /contacts/{id:long}"] = Rights("tab.ClientStructure.contacts:Maintain").Also("OtherOperations:Maintain"),
        ["DELETE /contacts/{id:long}"] = Rights("tab.ClientStructure.contacts:Delete"),
        ["POST /contacts/{id:long}/archive"] = Rights("tab.ClientStructure.contacts:ArchiveRestore").Also("OtherOperations:ArchiveRestore"),
        ["GET /contracts"] = Rights("Contracts:View"),
        ["POST /contracts"] = Handler("Contracts:Create"),
        ["GET /contracts/{id:long}"] = Rights("Contracts:DetailsView", "Contracts:View").Also("Contracts:ArchiveRestore", "Contracts:Maintain", "Environments:View", "Products:View"),
        ["PUT /contracts/{id:long}"] = Handler("Contracts:Maintain"),
        ["DELETE /contracts/{id:long}"] = Handler("Contracts:Delete"),
        ["POST /contracts/{id:long}/archive"] = Handler("Contracts:ArchiveRestore"),
        ["GET /contracts/{id:long}/penalty-assessments"] = Rights("Contracts:DetailsView", "Contracts:View"),
        ["POST /contracts/{id:long}/penalty-assessments/recalculate"] = Handler("Contracts:Coordinate"),
        ["POST /contracts/{id:long}/penalty-assessments/{assessmentId:long}/confirm"] = Handler("Contracts:Coordinate"),
        ["GET /dashboard"] = Rights("Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "Dashboard:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["GET /dashboard/actions"] = Rights("ActionList:View", "Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "Dashboard:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["GET /dashboard/command-center"] = Rights("Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "Dashboard:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["GET /dashboard/operational"] = Rights("OperationalDashboard:View"),
        ["GET /dashboard/sla-contracts"] = Rights("SlaContractsDashboard:View"),
        ["GET /dashboard/management"] = Rights("ManagementDashboard:View"),
        ["GET /dashboard/clients"] = Rights("ClientDashboard:View"),
        ["GET /dashboard/clients/{id:long}"] = Rights("ClientDashboard:View").Also("ClientStructure:Maintain"),
        ["GET /dashboard/me"] = Rights("MyDashboard:View"),
        ["GET /dashboard/insights"] = Rights("Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "Dashboard:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["GET /data-quality"] = Rights("Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "DataQuality:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["POST /data-quality/scan"] = Rights("DataQuality:Maintain").Also("OtherOperations:Maintain"),
        ["GET /data-quality/summary"] = Rights("Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "DataQuality:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["PUT /data-quality/{id:long}"] = Rights("DataQuality:Maintain").Also("OtherOperations:Coordinate", "OtherOperations:Maintain"),
        ["GET /dependents/{kind}/{id:long}"] = Rights("Cases:View", "ClientStructure:View", "Commitments:View", "Contracts:View", "Environments:View", "Installations:View", "OtherOperations:View", "Products:View", "Projects:View", "Servers:View", "Teams:View"),
        ["DELETE /dependents/{kind}/{id:long}"] = HandlerOnly("Depends on the kind: the Delete right of every reached record type, and full data scope over every reached client and team."),
        ["GET /environments"] = Rights("Environments:View").Also("Cases:View", "Installations:View", "Servers:View"),
        ["POST /environments"] = Handler("Environments:Create"),
        ["GET /environments/{environmentId:long}/microservice-options"] = Rights("Environments:DetailsView", "Environments:View", "Installations:View", "Products:View", "Servers:View"),
        ["GET /environments/{id:long}"] = Rights("Environments:DetailsView", "Environments:View").Also("Environments:Maintain", "Projects:View"),
        ["PUT /environments/{id:long}"] = Handler("Environments:Maintain"),
        ["DELETE /environments/{id:long}"] = Handler("Environments:Delete"),
        ["POST /environments/{id:long}/archive"] = Handler("Environments:ArchiveRestore", "Environments:Coordinate"),
        ["POST /environments/{id:long}/clone"] = Handler("Installations:Create", "Installations:DetailsView", "Servers:Create", "Servers:DetailsView").Note("Needs the source record's DetailsView rights and the target's Create rights, per copied record type."),
        ["POST /environments/{id:long}/clone-environment"] = Handler("Environments:Create", "Installations:Create", "Servers:Create", "Servers:Maintain"),
        ["POST /environments/{id:long}/clone-to-many"] = Handler("Installations:Create", "Installations:DetailsView", "Servers:Create", "Servers:DetailsView").Note("Needs the source record's DetailsView rights and the target's Create rights, per copied record type."),
        ["GET /environments/{id:long}/conditions"] = Rights("Environments:DetailsView", "Environments:View", "tab.Environments.conditions:View"),
        ["POST /environments/{id:long}/conditions"] = Rights("tab.Environments.conditions:Create").Also("Environments:Maintain", "Projects:Coordinate", "Projects:View"),
        ["GET /environments/{id:long}/overview"] = Rights("Environments:DetailsView", "Environments:View").Also("OtherOperations:View", "Servers:View"),
        ["GET /escalations"] = Rights("OtherOperations:View"),
        ["POST /escalations"] = Handler("OtherOperations:Create"),
        ["GET /escalations/{id:long}"] = Rights("OtherOperations:DetailsView", "OtherOperations:View").Also("OtherOperations:Coordinate", "OtherOperations:HistoryView", "OtherOperations:Maintain"),
        ["PUT /escalations/{id:long}"] = Handler("OtherOperations:Maintain"),
        ["DELETE /escalations/{id:long}"] = Handler("OtherOperations:Delete"),
        ["POST /escalations/{id:long}/communications"] = Handler("OtherOperations:Maintain"),
        ["POST /escalations/{id:long}/raise-level"] = Handler("OtherOperations:Coordinate", "OtherOperations:Create", "OtherOperations:Maintain"),
        ["POST /escalations/{id:long}/status"] = Handler("OtherOperations:Maintain"),
        ["GET /export/{report}"] = Dynamic(DynamicPolicy.ReportExport, "ReportLibrary:Export"),
        ["GET /firewall-rules"] = Rights("OtherOperations:View").Also("Servers:View"),
        ["POST /firewall-rules"] = Handler("OtherOperations:Create", "Platform:TechnicalDetail", "Servers:View"),
        ["PUT /firewall-rules/{id:long}"] = Handler("OtherOperations:Maintain", "Platform:TechnicalDetail", "Servers:View"),
        ["DELETE /firewall-rules/{id:long}"] = Handler("OtherOperations:Maintain", "Platform:TechnicalDetail", "Servers:View"),
        ["GET /handovers"] = Rights("Handovers:View", "Teams:View"),
        ["POST /handovers"] = Rights("Handovers:Create").Also("Teams:Coordinate"),
        ["GET /handovers/candidates"] = Rights("Handovers:View", "Teams:View").Also("Teams:Coordinate"),
        ["GET /handovers/{id:long}"] = Rights("Handovers:View", "Teams:DetailsView", "Teams:View").Also("Handovers:Maintain", "Teams:Coordinate"),
        ["POST /handovers/{id:long}/acknowledge"] = Rights("Handovers:Maintain"),
        ["POST /handovers/{id:long}/cancel"] = Rights("Handovers:Maintain").Also("Teams:Coordinate"),
        ["POST /handovers/{id:long}/exception"] = Rights("Handovers:Maintain").Also("Teams:Coordinate"),
        ["GET /infrastructure/summary"] = Rights("Servers:View"),
        ["GET /installations"] = Rights("Installations:View"),
        ["POST /installations"] = Handler("Installations:Create"),
        ["GET /installations/{id:long}"] = Rights("Installations:DetailsView", "Installations:View"),
        ["PUT /installations/{id:long}"] = Handler("Installations:Maintain"),
        ["DELETE /installations/{id:long}"] = Handler("Installations:Delete"),
        ["POST /installations/{id:long}/archive"] = Handler("Installations:ArchiveRestore"),
        ["GET /installations/{id:long}/deployment"] = Rights("Installations:DetailsView", "Installations:View"),
        ["PUT /installations/{id:long}/deployment/{assetId:long}"] = Handler("Installations:Maintain"),
        ["POST /installations/{id:long}/version"] = Handler("Installations:Maintain"),
        ["GET /jira/reuse"] = Rights("Cases:View").Also("tab.Cases.jira:View"),
        ["GET /me"] = Authenticated("The caller's own session and rights."),
        ["PUT /me/preferences"] = Authenticated("The caller's own time zone."),
        ["GET /notes/files/{id:long}"] = Rights("PersonalNotes:Download", "PersonalNotes:View"),
        ["POST /notes/notebooks"] = Rights("PersonalNotes:Create", "PersonalNotes:View"),
        ["POST /notes/notebooks/reorder"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["PUT /notes/notebooks/{id:long}"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["DELETE /notes/notebooks/{id:long}"] = Rights("PersonalNotes:Delete", "PersonalNotes:View"),
        ["GET /notes/pages"] = Rights("PersonalNotes:View"),
        ["POST /notes/pages"] = Rights("PersonalNotes:Create", "PersonalNotes:View"),
        ["POST /notes/pages/reorder"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["GET /notes/pages/{id:long}"] = Rights("PersonalNotes:View"),
        ["PUT /notes/pages/{id:long}"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["DELETE /notes/pages/{id:long}"] = Rights("PersonalNotes:Delete", "PersonalNotes:View"),
        ["POST /notes/pages/{id:long}/files"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["PUT /notes/pages/{id:long}/link"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["DELETE /notes/pages/{id:long}/permanent"] = Rights("PersonalNotes:Delete", "PersonalNotes:View"),
        ["POST /notes/pages/{id:long}/restore"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["POST /notes/recycle-bin/empty"] = Rights("PersonalNotes:Delete", "PersonalNotes:View"),
        ["POST /notes/sections"] = Rights("PersonalNotes:Create", "PersonalNotes:View"),
        ["POST /notes/sections/reorder"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["PUT /notes/sections/{id:long}"] = Rights("PersonalNotes:Maintain", "PersonalNotes:View"),
        ["DELETE /notes/sections/{id:long}"] = Rights("PersonalNotes:Delete", "PersonalNotes:View"),
        ["GET /notes/tree"] = Rights("PersonalNotes:View"),
        ["GET /notifications"] = Rights("Notifications:View"),
        ["POST /notifications/read"] = Rights("Notifications:Maintain", "Notifications:View"),
        ["POST /notifications/read-all"] = Rights("Notifications:Maintain", "Notifications:View"),
        ["GET /notifications/unread-count"] = Rights("Notifications:View"),
        ["DELETE /notifications/{id:long}"] = Rights("Notifications:Delete", "Notifications:View"),
        ["POST /notifications/{id:long}/read"] = Rights("Notifications:Maintain", "Notifications:View"),
        ["GET /organizations"] = Rights("ClientStructure:View", "tab.ClientStructure.organizations:View"),
        ["POST /organizations"] = Rights("tab.ClientStructure.organizations:Create"),
        ["GET /organizations/{id:long}"] = Rights("ClientStructure:DetailsView", "ClientStructure:View", "tab.ClientStructure.organizations:View"),
        ["PUT /organizations/{id:long}"] = Rights("tab.ClientStructure.organizations:Maintain"),
        ["GET /organizations/{id:long}/children"] = Rights("ClientStructure:DetailsView", "ClientStructure:View", "tab.ClientStructure.organizations:View"),
        ["GET /organizations/{id:long}/hierarchy"] = Rights("ClientStructure:DetailsView", "ClientStructure:View", "tab.ClientStructure.organizations:View"),
        ["GET /organizations/{id:long}/parents"] = Rights("ClientStructure:DetailsView", "ClientStructure:View", "tab.ClientStructure.organizations:View"),
        ["GET /payments"] = Rights("Contracts:View"),
        ["POST /contracts/{id:long}/payments/{paymentId:long}/status"] = Handler("Contracts:Maintain"),
        ["GET /products"] = Rights("Products:View"),
        ["POST /products"] = Handler("Products:Create"),
        ["PUT /products/features/{featureId:long}"] = Handler("Products:Maintain"),
        ["DELETE /products/features/{featureId:long}"] = Handler("Products:Delete"),
        ["PUT /products/microservice-versions/{versionId:long}"] = Handler("Products:Maintain"),
        ["DELETE /products/microservice-versions/{versionId:long}"] = Handler("Products:Delete"),
        ["GET /products/microservices/{microserviceId:long}"] = Rights("Products:DetailsView", "Products:View").Also("Products:Maintain"),
        ["PUT /products/microservices/{microserviceId:long}"] = Handler("Products:Maintain"),
        ["DELETE /products/microservices/{microserviceId:long}"] = Handler("Products:Delete"),
        ["POST /products/microservices/{microserviceId:long}/versions"] = Handler("Products:Maintain"),
        ["PUT /products/modules/{moduleId:long}"] = Handler("Products:Maintain"),
        ["DELETE /products/modules/{moduleId:long}"] = Handler("Products:Delete"),
        ["PUT /products/versions/{versionId:long}"] = Handler("Products:Maintain"),
        ["DELETE /products/versions/{versionId:long}"] = Handler("Products:Delete"),
        ["GET /products/{id:long}"] = Rights("Products:DetailsView", "Products:View").Also("Products:Delete", "Products:Maintain"),
        ["PUT /products/{id:long}"] = Handler("Products:Maintain"),
        ["DELETE /products/{id:long}"] = Handler("Products:Delete"),
        ["POST /products/{id:long}/features"] = Handler("Products:Maintain"),
        ["POST /products/{id:long}/microservices"] = Handler("Products:Maintain"),
        ["POST /products/{id:long}/modules"] = Handler("Products:Maintain"),
        ["POST /products/{id:long}/versions"] = Handler("Products:Maintain"),
        ["GET /projects"] = Rights("Projects:View").Also("Contracts:View", "Products:View"),
        ["POST /projects"] = Handler("Projects:Create"),
        ["GET /projects/{id:long}"] = Rights("Projects:DetailsView", "Projects:View").Also("Contracts:Create", "Contracts:View", "Environments:View", "Products:View", "Projects:ArchiveRestore", "Projects:Maintain"),
        ["PUT /projects/{id:long}"] = Handler("Projects:Maintain"),
        ["DELETE /projects/{id:long}"] = Handler("Projects:Delete"),
        ["POST /projects/{id:long}/archive"] = Handler("Projects:ArchiveRestore"),
        ["GET /reassignment-queue"] = Rights("Reassignment:View", "Teams:View"),
        ["GET /reference"] = Authenticated("Reference values. Products, teams and Jira instances inside it are filtered by right."),
        ["GET /regions/{id:long}"] = Rights("ClientStructure:DetailsView", "ClientStructure:View", "tab.ClientStructure.structure:View"),
        ["PUT /regions/{id:long}"] = Rights("tab.ClientStructure.structure:Maintain").Also("ClientStructure:Maintain"),
        ["DELETE /regions/{id:long}"] = Rights("tab.ClientStructure.structure:Delete"),
        ["POST /regions/{id:long}/archive"] = Rights("tab.ClientStructure.structure:ArchiveRestore").Also("ClientStructure:ArchiveRestore"),
        ["POST /reporting/exports"] = Rights("Cases:Export", "Cases:View", "ReportBuilder:Export", "ReportHistory:Create", "Reporting:View"),
        ["GET /reporting/exports/{id:long}"] = Dynamic(DynamicPolicy.ExportJob, "ReportHistory:View", "Reporting:View"),
        ["POST /reporting/exports/{id:long}/cancel"] = Rights("Cases:Export", "Cases:View", "ReportHistory:Maintain", "Reporting:View"),
        ["GET /reporting/exports/{id:long}/download"] = Dynamic(DynamicPolicy.ExportJob, "ReportHistory:Download", "Reporting:View"),
        ["POST /reporting/exports/{id:long}/retry"] = Rights("Cases:Export", "Cases:View", "ReportHistory:Maintain", "Reporting:View"),
        ["GET /reporting/overview"] = Rights("ReportOverview:View", "Reporting:View"),
        ["GET /reporting/report-definitions"] = Rights("Cases:View", "Reporting:View", "SavedReports:View"),
        ["POST /reporting/report-definitions"] = Rights("Cases:View", "Reporting:View", "SavedReports:Create"),
        ["GET /reporting/report-definitions/{id:long}"] = Rights("Cases:View", "Reporting:View", "SavedReports:View"),
        ["PUT /reporting/report-definitions/{id:long}"] = Rights("Cases:View", "Reporting:View", "SavedReports:Maintain"),
        ["DELETE /reporting/report-definitions/{id:long}"] = Rights("Cases:View", "Reporting:View", "SavedReports:Delete"),
        ["POST /reporting/report-definitions/{id:long}/duplicate"] = Rights("Cases:View", "Reporting:View", "SavedReports:Create"),
        ["PUT /reporting/report-definitions/{id:long}/favorite"] = Rights("Cases:View", "Reporting:View", "SavedReports:Maintain"),
        ["DELETE /reporting/report-definitions/{id:long}/favorite"] = Rights("Cases:View", "Reporting:View", "SavedReports:Maintain"),
        ["GET /reporting/report-types"] = Rights("Cases:View", "ReportBuilder:View", "Reporting:View"),
        ["GET /reporting/report-types/cases"] = Rights("Cases:View", "ReportBuilder:View", "Reporting:View"),
        ["GET /reporting/report-types/cases/filters"] = Rights("Cases:View", "ReportBuilder:View", "Reporting:View").Also("ClientStructure:View", "Environments:View", "Products:View", "Teams:View"),
        ["POST /reporting/reports/cases/preview"] = Rights("ReportBuilder:View", "Reporting:View"),
        ["GET /reporting/schedules"] = Rights("ReportSchedules:View", "Reporting:View"),
        ["POST /reporting/schedules"] = Rights("Cases:Export", "Cases:View", "ReportSchedules:Create", "Reporting:View"),
        ["PATCH /reporting/schedules/{id:long}"] = Rights("Cases:Export", "Cases:View", "ReportSchedules:Maintain", "Reporting:View"),
        ["GET /reports/catalog"] = Rights("Reporting:View"),
        ["GET /reports/exports"] = Rights("ReportHistory:View", "Reporting:View"),
        ["GET /reports/exports/{id:long}"] = Dynamic(DynamicPolicy.ExportJob, "ReportHistory:View", "Reporting:View"),
        ["GET /reports/exports/{id:long}/download"] = Dynamic(DynamicPolicy.ExportJob, "ReportHistory:Download", "Reporting:View"),
        ["POST /reports/exports/{id:long}/retry"] = Rights("ReportHistory:Maintain", "Reporting:View"),
        ["GET /reports/presets"] = Rights("ReportLibrary:View", "Reporting:View"),
        ["POST /reports/presets"] = Rights("ReportLibrary:Create", "Reporting:View"),
        ["DELETE /reports/presets/{id:long}"] = Rights("ReportLibrary:Delete", "Reporting:View"),
        ["GET /reports/schedules"] = Rights("ReportSchedules:View", "Reporting:View"),
        ["POST /reports/schedules"] = Rights("ReportSchedules:Create", "Reporting:View"),
        ["GET /reports/schedules/{id:long}"] = Rights("ReportSchedules:View", "Reporting:View"),
        ["PUT /reports/schedules/{id:long}"] = Rights("ReportSchedules:Maintain", "Reporting:View"),
        ["DELETE /reports/schedules/{id:long}"] = Rights("ReportSchedules:Delete", "Reporting:View"),
        ["POST /reports/schedules/{id:long}/pause"] = Rights("ReportSchedules:Maintain", "Reporting:View"),
        ["POST /reports/schedules/{id:long}/resume"] = Rights("ReportSchedules:Maintain", "Reporting:View"),
        ["GET /reports/schedules/{id:long}/runs"] = Rights("ReportSchedules:View", "Reporting:View"),
        ["GET /reports/summary"] = Rights("ReportOverview:View", "Reporting:View"),
        ["POST /reports/{key}/exports"] = Rights("ReportLibrary:Export", "Reporting:View"),
        ["POST /reports/{key}/preview"] = Rights("ReportLibrary:View", "Reporting:View"),
        ["GET /review-policies"] = Rights("OtherOperations:View"),
        ["POST /review-policies"] = Rights("AdminConfig:Create").Also("Platform:Administration"),
        ["PUT /review-policies/{id:long}"] = Rights("AdminConfig:Maintain").Also("Platform:Administration"),
        ["GET /search"] = Authenticated("Results are filtered by each module's View right and data scope."),
        ["GET /shared-storage"] = Rights("Servers:View"),
        ["POST /shared-storage"] = Handler("Servers:Create"),
        ["GET /teams"] = Rights("Teams:View"),
        ["POST /teams"] = Handler("Teams:Create"),
        ["GET /teams/{id:long}"] = Rights("Teams:DetailsView", "Teams:View"),
        ["PUT /teams/{id:long}"] = Handler("Teams:Coordinate", "Teams:Maintain"),
        ["DELETE /teams/{id:long}"] = Handler("Teams:Delete"),
        ["GET /teams/{id:long}/assignments"] = Rights("Teams:DetailsView", "Teams:View"),
        ["POST /teams/{id:long}/members"] = Handler("Teams:Coordinate"),
        ["PUT /teams/{id:long}/members/{memberId:long}"] = Handler("Teams:Coordinate"),
        ["DELETE /teams/{id:long}/members/{memberId:long}"] = Handler("Teams:Coordinate"),
        ["GET /users/assignable"] = Authenticated("Owner picker. Needs a business View right and the client in scope; exposes names only."),
        ["GET /version-matrix"] = Rights("Installations:View"),
        ["PUT /volumes/{id:long}"] = Handler("Servers:Maintain"),
        ["DELETE /volumes/{id:long}"] = Handler("Servers:Delete"),
        ["POST /volumes/{id:long}/archive"] = Handler("Servers:ArchiveRestore"),
    };

    /// <summary>The table key of a mapped route: method, then the template below /api/v1 without a trailing slash.</summary>
    public static string KeyOf(string method, string routeTemplate)
    {
        var route = routeTemplate.StartsWith("/api/v1", StringComparison.OrdinalIgnoreCase) ? routeTemplate[7..] : routeTemplate;
        return $"{method.ToUpperInvariant()} {(route.TrimEnd('/') is { Length: > 0 } trimmed ? trimmed : "/")}";
    }

    public static EndpointPolicy? For(string method, string routeTemplate) => Table.GetValueOrDefault(KeyOf(method, routeTemplate));
}

/// <summary>The API boundary. Applies <see cref="EndpointRights"/> to all of /api/v1, refuses unknown routes and audits denials.</summary>
public sealed class EndpointRightsFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var http = context.HttpContext;
        var me = http.RequestServices.GetRequiredService<UserContext>();
        var endpoint = http.GetEndpoint() as RouteEndpoint;
        try
        {
            var policy = endpoint?.RoutePattern.RawText is { } route ? EndpointRights.For(http.Request.Method, route) : null;
            if (policy is null) throw new ForbiddenException("This endpoint has no registered authorization policy.");
            if (policy.Decision == EndpointRights.PublicDecision) return await next(context);
            foreach (var right in policy.Rights) me.RequireRight(right);
            await ApplyDynamicAsync(policy.Dynamic, http, me, http.RequestAborted);
            return await next(context);
        }
        catch (ForbiddenException)
        {
            var log = http.RequestServices.GetRequiredService<ILogger<EndpointRightsFilter>>();
            log.LogWarning("Access denied for user {UserId} on {Method} {Path}", me.UserId, http.Request.Method, http.Request.Path.Value);
            try
            {
                var route = endpoint?.RoutePattern.RawText;
                await http.RequestServices.GetRequiredService<HubDbContext>().AuditActionAsync("AccessDenied", "Right", null,
                    route, null, "The requested right is not granted.", new { method = http.Request.Method, route },
                    http.RequestAborted, category: "Access");
            }
            catch (Exception ex)
            {
                // Audit failure cannot convert a denial into access. Do not log request bodies, tokens or query strings.
                log.LogError(ex, "Could not persist the denied-access audit event");
            }
            throw;
        }
    }

    private static async Task ApplyDynamicAsync(DynamicPolicy policy, HttpContext http, UserContext me, CancellationToken ct)
    {
        switch (policy)
        {
            case DynamicPolicy.Attachment: await RequireAttachmentAsync(http, me, ct); break;
            case DynamicPolicy.ClientTab:
                me.RequireRight(RightKeys.Tab(RightKeys.Structure, http.Request.Query["tab"].FirstOrDefault()?.ToLowerInvariant() ?? "structure"));
                break;
            case DynamicPolicy.ArchivedRead: RightChecks.RequireArchivedRead(me, http.Request.Query["recordType"].ToString()); break;
            case DynamicPolicy.AuditRead: RequireAuditRead(http, me); break;
            case DynamicPolicy.ReportExport:
                RightChecks.RequireReportExport(me, http.Request.RouteValues["report"]?.ToString() ?? throw new ForbiddenException("A report access policy is required."));
                break;
            case DynamicPolicy.ExportJob:
                if (long.TryParse(http.Request.RouteValues["id"]?.ToString(), out var id))
                {
                    var db = http.RequestServices.GetRequiredService<HubDbContext>();
                    var report = await db.ExportJobs.AsNoTracking().Where(j => j.Id == id && (j.UserId == me.UserId || me.HasRight(RightKeys.Audit)))
                        .Select(j => j.Report).FirstOrDefaultAsync(ct);
                    if (report is not null) RightChecks.RequireReportExport(me, report);
                }
                break;
        }
    }

    /// <summary>Access entries have their own check in the handler. Other history needs the source's history right; an unknown type could hold anything.</summary>
    private static void RequireAuditRead(HttpContext http, UserContext me)
    {
        if (string.Equals(http.Request.Query["category"], "Access", StringComparison.OrdinalIgnoreCase)) return;
        var entityType = http.Request.Query["entityType"].ToString();
        if (string.IsNullOrEmpty(entityType))
        {
            foreach (var resource in RightChecks.BusinessResources) me.RequireRight(resource, RightKeys.HistoryView);
            return;
        }
        try { me.RequireRight(RightKeys.ForRecord(entityType), RightKeys.HistoryView); }
        catch (NotFoundException)
        {
            string[] accessTypes = ["User", "UserRole", "AppRole", "RoleRight", "RolePermission", "UserRightException", "UserPermissionOverride", "RightDefinition", "PermissionDefinition", "UserScope", "GroupMapping", "GroupMappingRole", "GroupMappingScope", "AppSetting", "LookupValue", "ReviewPolicy", "JiraInstance"];
            if (accessTypes.Contains(entityType, StringComparer.Ordinal)) me.RequireAdministrator();
            else foreach (var resource in RightChecks.BusinessResources) me.RequireRight(resource, RightKeys.HistoryView);
        }
    }

    private static async Task RequireAttachmentAsync(HttpContext http, UserContext me, CancellationToken ct)
    {
        var type = http.Request.Query["recordType"].ToString();
        long? uploaderId = null;
        if (long.TryParse(http.Request.RouteValues["id"]?.ToString(), out var id))
        {
            var db = http.RequestServices.GetRequiredService<HubDbContext>();
            var attachment = await db.Attachments.AsNoTracking().Where(a => a.Id == id).Select(a => new { a.RecordType, a.UploadedById }).FirstOrDefaultAsync(ct)
                ?? throw new NotFoundException("The attachment");
            type = attachment.RecordType;
            uploaderId = attachment.UploadedById;
        }
        // Multipart upload checks its record type after reading the validated form inside the handler.
        if (type.Length == 0) return;
        var resource = RightKeys.ForRecord(type);
        var action = HttpMethods.IsDelete(http.Request.Method)
            ? me.HasRight(resource, RightKeys.AttachmentsDelete) ? RightKeys.AttachmentsDelete
                : uploaderId == me.UserId ? RightKeys.AttachmentsDeleteOwn : RightKeys.AttachmentsDelete
            : HttpMethods.IsGet(http.Request.Method) || HttpMethods.IsHead(http.Request.Method) ? RightKeys.AttachmentsView
            : RightKeys.AttachmentsUpload;
        me.RequireRight(resource, action);
    }
}
