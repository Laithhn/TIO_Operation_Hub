using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Firewall;
using TioHub.Api.Modules.Notifications;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Reporting;
using TioHub.Api.Modules.Shared;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;
using TioHub.Api.Security;

namespace TioHub.Api.Modules;

public static class ModuleRegistration
{
    public static IServiceCollection AddHubServices(this IServiceCollection services)
    {
        services.AddOptions<Attachments.AttachmentOptions>().BindConfiguration("Attachments");
        services.AddSingleton<Attachments.AttachmentStore>();
        services.AddOptions<Clients.ClientLogoOptions>().BindConfiguration("ClientLogos");
        services.AddScoped<HubSettings>();
        services.AddScoped<HubAccess>();
        services.AddScoped<FreshnessService>();
        services.AddScoped<LookupService>();
        services.AddScoped<DataQualityEngine>();
        services.AddScoped<Dashboard>();
        services.AddScoped<Insights>();
        services.AddScoped<CommandCenter>();
        services.AddHostedService<DataQualityScanner>();
        services.AddHostedService<Notifications.NotificationScanner>();
        services.AddHostedService<Work.SlaSweep>();
        // A62: Reporting Center
        services.AddOptions<ReportingOptions>().BindConfiguration("Reporting");
        services.AddSingleton<ExportStore>();
        services.AddScoped<ExportService>();
        services.AddHostedService<ReportScheduler>();
        // A70: Cases Report Builder and asynchronous exports
        services.AddScoped<CasesReportService>();
        services.AddSingleton<ExportQueue>();
        services.AddHostedService<ExportWorker>();
        return services;
    }

    public static RouteGroupBuilder MapHubModules(this RouteGroupBuilder api)
    {
        api.MapAuthEndpoints();
        api.MapMeEndpoints();
        api.MapClientEndpoints();
        api.MapOrganizationEndpoints();
        api.MapEnvironmentEndpoints();
        api.MapCatalogueEndpoints();
        api.MapInventoryEndpoints();
        api.MapCloneEndpoints();
        api.MapRoleEndpoints();
        api.MapFirewallEndpoints();
        api.MapDeleteEndpoints();
        api.MapCascadeEndpoints();
        Attachments.AttachmentEndpoints.MapAttachmentEndpoints(api);
        Attachments.StorageSettings.MapStorageSettingsEndpoints(api);
        Clients.ClientLogos.MapClientLogoEndpoints(api);
        Notes.NoteEndpoints.MapNoteEndpoints(api);
        api.MapNotificationEndpoints();
        api.MapCaseEndpoints();
        api.MapCommitmentEndpoints();
        api.MapEscalationEndpoints();
        api.MapContractEndpoints();
        api.MapPaymentEndpoints();
        api.MapTeamEndpoints();
        api.MapQualityEndpoints();
        api.MapDashboardEndpoints();
        api.MapOverviewEndpoints();
        api.MapSearchExportEndpoints();
        api.MapReportingEndpoints();
        api.MapBuilderEndpoints();
        api.MapAdminEndpoints();
        return api;
    }
}
