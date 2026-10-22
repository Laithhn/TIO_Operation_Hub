using Microsoft.EntityFrameworkCore;
using TioHub.Api.Common;
using TioHub.Api.Security;
using TioHub.Api.Modules.Access;
using TioHub.Api.Modules.Admin;
using TioHub.Api.Modules.Catalogue;
using TioHub.Api.Modules.Clients;
using TioHub.Api.Modules.Commitments;
using TioHub.Api.Modules.Contracts;
using TioHub.Api.Modules.Environments;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Data;

/// <summary>
/// DEVELOPMENT DEMO DATA modelled on the structure of the Q2 2026 resource/load analysis workbook
/// (“Project Streams”, “Product streams”, “Team Coverage Plan”, “Future and feature product” sheets).
///
/// What is taken from the workbook: client and entity names, countries, project status, activity level, support scope,
/// commitment type, support type, monthly delivery items and notes, FTE remarks, product streams and the coverage plan.
/// What is NOT taken: people. Every person is a fictional persona with an example.com address; internal project and
/// contract numbers are omitted. Environments, versions, servers, outcomes and dates of individual records are MOCKED
/// to make the screens meaningful — they are not facts from the workbook. Allowed only in Development (Program.cs).
/// </summary>
public static class PortfolioData
{
    private const string Source = "Projects.Resources.Load.analysis_2026Q2.xlsx";

    public static async Task SeedAsync(HubDbContext db, TimeProvider clock, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        if (await db.Clients.IgnoreQueryFilters().AnyAsync(c => c.Code == "TAH", ct))
        {
            // Already seeded: add the contracts introduced later, once, without touching anything else.
            if (!await db.Contracts.IgnoreQueryFilters().AnyAsync(ct)) await SeedContractsAsync(db, now, ct);
            return;
        }

        await SetAsync(db, SettingKeys.ApprovedLinkHosts, "docs.example.com,*.example.net", ct);
        foreach (var j in await db.JiraInstances.ToListAsync(ct))
            if (string.IsNullOrEmpty(j.ApprovedHost)) j.ApprovedHost = j.Kind == JiraInstanceKind.CustomerCloud ? "customer-demo.example.net" : "jira.internal.example.com";

        // ---------- people (fictional personas; roles follow the workbook's lead / team structure) ----------
        var users = new Dictionary<string, User>();
        var builtInRoles = await BuiltInRoles.EnsureAsync(db, ct);
        User U(string key, string account, string name, string tz, Grant g, bool allClients, bool allInternal, params Role[] roles)
        {
            var u = new User { AccountName = account, DisplayName = name, Email = $"{key}@example.com", WorkingTimeZone = tz, Grants = g, AllClients = allClients, AllInternal = allInternal };
            foreach (var r in roles) u.Roles.Add(new UserRole { AppRoleId = builtInRoles[r] });
            db.Users.Add(u);
            users[key] = u;
            return u;
        }
        var full = Grant.Export | Grant.TechnicalDetail | Grant.Audit;
        var manager = U("manager", "DEV\\manager", "Mara Okafor (demo TIO Manager)", "Asia/Dubai", full, true, true, Role.Manager);
        var leadOps = U("lead", "DEV\\lead", "Leon Brandt (demo lead, TIO Operations)", "Asia/Dubai", Grant.Export | Grant.TechnicalDetail, true, true, Role.Engineer);
        var leadDel = U("lead2", "DEV\\lead2", "Sofia Lindqvist (demo lead, Project Delivery)", "Asia/Dubai", Grant.Export | Grant.TechnicalDetail, true, true, Role.Engineer);
        var leadAu = U("lead3", "DEV\\lead3", "Tomas Varga (demo lead, Product Team A-1)", "Asia/Dubai", Grant.TechnicalDetail, true, true, Role.Engineer);
        var engDp = U("engineer", "DEV\\engineer", "Esra Demir (demo engineer)", "Asia/Dubai", Grant.TechnicalDetail, false, false, Role.Engineer);
        var engTah = U("engineer2", "DEV\\engineer2", "Kofi Mensah (demo engineer)", "Asia/Riyadh", Grant.TechnicalDetail, false, false, Role.Engineer);
        U("viewer", "DEV\\viewer", "Vera Lund (demo stakeholder)", "Europe/Berlin", Grant.None, false, false, Role.Engineer);
        U("admin", "DEV\\admin", "Adam Reyes (demo administrator)", "UTC", Grant.Audit, false, false, Role.Manager);
        var former = U("former", "DEV\\former", "Farid Haddad (demo, deactivated)", "Africa/Casablanca", Grant.None, true, false, Role.Engineer);
        // Field and product engineers (fictional), all with technical detail; client-wide scope inside the organization.
        string[][] crew =
        [
            ["e01", "Nina Petrov", "Asia/Dubai"], ["e02", "Jonas Weber", "Asia/Dubai"], ["e03", "Amara Diallo", "Africa/Kigali"], ["e04", "Felix Romano", "Africa/Casablanca"],
            ["e05", "Yuki Tanaka", "Asia/Riyadh"], ["e06", "Lucas Silva", "Asia/Riyadh"], ["e07", "Ines Duarte", "Asia/Riyadh"], ["e08", "Hugo Laurent", "Asia/Baghdad"],
            ["e09", "Zara Malik", "Asia/Dubai"], ["e10", "Noah Fischer", "Australia/Adelaide"], ["e11", "Elena Rossi", "Asia/Dubai"], ["e12", "Samir Aziz", "Asia/Dubai"],
            ["e13", "Ivo Novak", "Asia/Dubai"], ["e14", "Lea Martin", "Asia/Dubai"]
        ];
        foreach (var c in crew) U(c[0], $"DEV\\{c[0]}", $"{c[1]} (demo engineer)", c[2], Grant.TechnicalDetail, true, true, Role.Engineer);
        await db.SaveChangesAsync(ct);
        long Id(string key) => users[key].Id;

        // ---------- teams (workbook “Product streams” + operations) ----------
        Team T(string code, string name, User lead, string desc) { var t = new Team { Code = code, Name = name, LeadUserId = lead.Id, ManagerUserId = manager.Id, Description = desc }; db.Teams.Add(t); return t; }
        var ops = T("OPS", "TIO Operations & Support", leadOps, "Client operations, SLA support and on-site engineering.");
        var del = T("DEL", "Project Delivery", leadDel, "Implementation, go-live and client delivery.");
        var tA = T("TA", "Product Team A (PSOP, ViDPP)", leadDel, "Primary PSOP, secondary ViDPP.");
        var tA1 = T("TA1", "Product Team A-1 (PSOP 3, PSO-Lite)", leadAu, "PSOP 3 and PSO-Lite.");
        var tB = T("TB", "Product Team B (ViITS)", leadDel, "ViITS / Zabeel.");
        var tC = T("TC", "Product Team C (ViISM, ViACE)", leadDel, "ViISM and ViACE.");
        var tD = T("TD", "Product Team D (ViRRM, ViCLM)", leadDel, "ViRRM and ViCLM.");
        var tE = T("TE", "Product Team E (Big Data)", leadDel, "ViSDB, ViESP, ViVMS.");
        var tX = T("TX", "Team X (Cross)", leadDel, "ViDPP, ViPTM, Smart File Manager.");
        var itd = T("ITD", "ITD Office IT", leadOps, "Office IT, help desk and internal platforms.");
        await db.SaveChangesAsync(ct);
        void M(Team t, string key, string role, string skills, string products) => db.TeamMembers.Add(new TeamMember { TeamId = t.Id, UserId = Id(key), TeamRole = role, Skills = skills, ProductFamiliarity = products });
        M(ops, "lead", "Team lead", "Coordination, SLA", "PSOP, ViRRM, PSO-Lite"); M(ops, "engineer", "Engineer", "On-site support", "PSOP, ViRRM, ViDPP");
        M(ops, "e01", "Engineer", "On-site support, Windows Server", "PSOP, ViITS"); M(ops, "e02", "Engineer", "Remote support", "PSOP, PSCO, ViITS");
        M(ops, "e03", "Engineer", "Hybrid support, networking", "PSOP, PSCO, EB"); M(ops, "e04", "Engineer", "On-site support", "PSOP, PSCO");
        M(ops, "engineer2", "Engineer", "Operations", "PSOP, ViRRM, ViDPP"); M(ops, "e05", "Engineer", "Operations", "PSOP, ViRRM"); M(ops, "e06", "DevOps", "DevOps, SQL Server", "PSOP, ViDPP");
        M(ops, "e07", "Engineer", "Operations", "PSOP"); M(ops, "e08", "Engineer", "Remote support", "PSOP, ViTIP"); M(ops, "former", "Engineer", "On-site support", "PSOP, PSCO");
        M(del, "lead2", "Team lead", "Delivery management", "ViITS, ViTIP"); M(del, "e09", "Engineer", "Implementation", "ViITS, ANPR Pool"); M(del, "e11", "Engineer", "Implementation", "ViTIP");
        M(tA, "e12", "Lead developer", ".NET, SQL", "PSOP, ViDPP"); M(tA, "e13", "Developer", "Integration", "PSOP"); M(tA1, "lead3", "Lead", ".NET Core", "PSOP 3, PSO-Lite"); M(tA1, "e10", "Developer", "Security", "PSOP 3");
        M(tB, "e09", "Developer", "ViITS", "ViITS"); M(tD, "e14", "Developer", "ViRRM", "ViRRM, ViCLM"); M(tC, "e11", "Developer", "ViISM", "ViISM, ViACE"); M(tE, "e13", "Developer", "Big data", "ViSDB");
        M(tX, "e06", "Developer", "Docker", "ViDPP, Smart File Manager"); M(itd, "e14", "Administrator", "Network, help desk", "ViESP");

        // ---------- product catalogue (codes from the workbook; version numbers mocked except PSOP 17.7/17.8 named in the workbook) ----------
        var products = new Dictionary<string, Product>();
        var versions = new Dictionary<string, ProductVersion>();
        void P(string code, string name, params string[] vs)
        {
            var p = new Product { Code = code, Name = name };
            db.Products.Add(p);
            products[code] = p;
            foreach (var v in vs) { var pv = new ProductVersion { Product = p, Version = v, SortKey = Text.VersionKey(v) }; db.ProductVersions.Add(pv); versions[$"{code}:{v}"] = pv; }
        }
        P("PSOP", "PSOP", "17.6", "17.7", "17.7.1", "17.8", "17.8.1"); P("PSOP3", "PSOP 3", "3.0", "3.1"); P("PSO-Lite", "PSO-Lite (PSOL)", "2.0", "2.4", "3.0");
        P("PSCO", "PSCO", "5.0", "5.1"); P("PsCon", "PsCon", "4.0"); P("ViRRM", "ViRRM", "3.1", "3.2"); P("ViDPP", "ViDPP", "2.4", "2.5"); P("ViITS", "ViITS (incl. Zabeel)", "1.8", "1.9");
        P("ANPR-Pool", "ANPR Pool (.NET Core)", "1.9", "2.0"); P("Ignesa", "Ignesa", "1.0"); P("EB", "EB", "2.3"); P("BO-Monitoring", "BO Monitoring", "1.0"); P("ANPR-Passage", "ANPR Passage", "1.0");
        P("OTX", "OTX Converter", "1.2"); P("ViTIP", "ViTIP One", "1.0"); P("ViSDB", "ViSDB", "1.0", "2.0"); P("ViISM", "ViISM", "1.0"); P("ViESP", "ViESP", "1.5"); P("SFM", "Smart File Manager", "2.4", "2.5");
        await db.SaveChangesAsync(ct);
        long? Ver(string code, string? v) => v is null ? null : versions[$"{code}:{v}"].Id;

        // ---------- clients (Project Streams: one client per customer organization) ----------
        var clients = new Dictionary<string, Client>();
        Client C(string code, string name, string country, ClientStatus status, User owner, int reviewedDaysAgo, string? parent = null)
        {
            var c = new Client { Code = code, Name = name, Country = country, Status = status, OwnerUserId = owner.Id, ParentOrganization = parent, LastReviewedAt = now.AddDays(-reviewedDaysAgo) };
            db.Clients.Add(c);
            clients[code] = c;
            return c;
        }
        var dp = C("DP", "Dubai Police", "United Arab Emirates", ClientStatus.Active, leadOps, 20);
        var tah = C("TAH", "Tahakom", "Saudi Arabia", ClientStatus.Active, leadDel, 35);
        var sew = C("SEWAR", "SEWAR (Kurdistan)", "Iraq", ClientStatus.Active, leadOps, 60);
        var mdj = C("MDJ", "Madar Dijla", "Iraq", ClientStatus.Active, leadOps, 15);
        var rwa = C("RWA-EV", "Rwanda EV", "Rwanda", ClientStatus.Active, leadOps, 40);
        var nar = C("NARSA", "NARSA", "Morocco", ClientStatus.Active, leadOps, 100);
        var dgs = C("DGSN", "Gendarmerie (DGSN)", "Morocco", ClientStatus.Opportunity, leadOps, 10);
        var sap = C("SAPOL", "SAPOL", "Australia", ClientStatus.Active, leadAu, 30, "South Australia Police");
        var shj = C("SHJ", "Sharjah Police – Operation Department", "United Arab Emirates", ClientStatus.Active, leadOps, 25);
        var omn = C("ROP", "Oman – Traffic Department", "Oman", ClientStatus.Active, leadOps, 140);
        var psp = C("PSP", "PesaPrint", "Kenya", ClientStatus.Active, leadOps, 70);
        var adp = C("ADP", "Abu Dhabi Police (STC)", "United Arab Emirates", ClientStatus.Opportunity, leadDel, 5);
        var qat = C("QMOI", "Qatar MOI – SDD", "Qatar", ClientStatus.Opportunity, leadDel, 12);
        var eif = C("EIF", "EIFFAGE", "Senegal", ClientStatus.Active, leadOps, 200);
        var bdi = C("BDI", "Burundi – Traffic", "Burundi", ClientStatus.Active, leadOps, 300);
        await db.SaveChangesAsync(ct);

        // Scopes for the limited demo accounts: engineer → Dubai Police, engineer2 → Tahakom; viewer → SAPOL SLA project (below).
        db.UserScopes.AddRange(new UserScope { UserId = engDp.Id, Kind = ScopeKind.Client, ClientId = dp.Id }, new UserScope { UserId = engDp.Id, Kind = ScopeKind.InternalTeam, TeamId = ops.Id },
            new UserScope { UserId = engTah.Id, Kind = ScopeKind.Client, ClientId = tah.Id });

        // Tahakom has three operational regions (workbook entity “3 Regions”); every other client is direct.
        var r1 = new Region { ClientId = tah.Id, Code = "R1", Name = "R1 Riyadh", OwnerUserId = engTah.Id };
        var r2 = new Region { ClientId = tah.Id, Code = "R2", Name = "R2 Jeddah", OwnerUserId = Id("e05") };
        var r3 = new Region { ClientId = tah.Id, Code = "R3", Name = "R3 Dammam", OwnerUserId = Id("e07") };
        db.Regions.AddRange(r1, r2, r3);

        // ---------- projects (one per Project Streams row) ----------
        var projects = new Dictionary<string, Project>();
        Project PR(Client c, string code, string name, ProjectStatus st, User owner, string scope, params string[] prods)
        {
            var p = new Project { ClientId = c.Id, Code = code, Name = name, Status = st, OwnerUserId = owner.Id, ScopeSummary = scope, ServiceStart = new DateOnly(2026, 1, 1) };
            db.Projects.Add(p);
            projects[code] = p;
            foreach (var pc in prods) p.Products.Add(new ProjectProduct { ProductId = products[pc].Id });
            return p;
        }
        PR(dp, "DP-TRAFFIC", "Traffic – SLA & Support", ProjectStatus.Active, leadOps, "SLA & Support · PSOP, ViRRM · activity High · on-site. Remark: high demand (1.0 FTE required, 0.3 available).", "PSOP", "ViRRM", "ViDPP");
        PR(dp, "DP-TRAFFIC-IGN", "Traffic – Ignesa go-live", ProjectStatus.Active, leadOps, "Go Live · Ignesa · activity Medium · on-site. Note: infrastructure must be provided before go-live; supervision required.", "Ignesa");
        PR(dp, "DP-OYOON", "Oyoon – Operation and Support", ProjectStatus.Active, leadDel, "Operation and Support · Zabeel (ViITS), ANPR Pool · activity High · on-site. Remark: resource shortage, high-demand client (1.5 FTE required, 0.7 available).", "ViITS", "ANPR-Pool");
        PR(dp, "DP-OYOON-AIPM", "Oyoon – AI Project Management", ProjectStatus.Active, leadDel, "Project Implementation and Go Live · phases: 1 System Administration (Jul), 2 Rasd Operation (Aug), 3 Analytics Module (Sep).", "ViITS");
        PR(tah, "TAH-SLA", "Tahakom – SLA & Support (3 regions)", ProjectStatus.Active, leadDel, "SLA & Support · PSOP, ViRRM, ViDPP · activity High · on-site. Contract: 8 engineers required (2 operations + 1 DevOps on site); 4 available.", "PSOP", "ViRRM", "ViDPP");
        PR(sew, "SEWAR-SLA", "SEWAR – SLA & Support", ProjectStatus.Active, leadOps, "SLA & Support · PSOP, PSCO, ViITS · remote. Minimum 3 days/week required. Pending client IT infrastructure readiness.", "PSOP", "PSCO", "ViITS");
        PR(mdj, "MDJ-VITIP", "Madar Dijla – New ViTIP", ProjectStatus.Active, leadOps, "Project Implementation · IAP (PSOL), VMS, ViTIS, RRM, SDB · remote. Client to provide IT infrastructure (4 servers).", "ViTIP", "PSO-Lite", "ViRRM", "ViSDB");
        PR(rwa, "RWA-SLA", "Rwanda EV – SLA & Support", ProjectStatus.Active, leadOps, "SLA & Support · PSOP, PSCO, EB · hybrid. Contract: 1 on-site engineer. Load balancer + DR pending management board.", "PSOP", "PSCO", "EB");
        PR(nar, "NARSA-SLA", "NARSA – SLA & Support", ProjectStatus.Active, leadOps, "SLA & Support · PSOP, PSCO · on-site. Contract: 2 on-site engineers. SLA finalization in progress.", "PSOP", "PSCO");
        PR(dgs, "DGSN-IMPL", "Gendarmerie – EB, BO Monitoring, ANPR Passage", ProjectStatus.Planned, leadOps, "Opportunity · Project Implementation · ANPR + ViTIS after contract completion.", "EB", "BO-Monitoring", "ANPR-Passage");
        PR(sap, "SAPOL-DEV", "SAPOL – .NET Core finalization", ProjectStatus.Completed, leadAu, "Project Development & Implementation · delivered; no further activities on this project.", "PSOP3");
        var sapSla = PR(sap, "SAPOL-SLA", "SAPOL – 3rd-level SLA support", ProjectStatus.Active, leadAu, "SLA (3rd-level support) · remote · ongoing support.", "PSOP3");
        PR(shj, "SHJ-VITIP", "Sharjah – ViTIP One", ProjectStatus.Active, leadOps, "Project Implementation · ViTIP One · hybrid. Starts once the contract is finalized by the contracts department.", "ViTIP", "PSO-Lite", "ViISM", "ViRRM", "ViSDB");
        PR(omn, "ROP-OPS", "Oman – Operation and Support", ProjectStatus.Active, leadOps, "Operation and Support · PsCon, OTX Converter · remote · idle. Smart File Manager under testing; to be changed to ViDPP.", "PsCon", "OTX", "SFM");
        PR(psp, "PSP-SLA", "PesaPrint – SLA & Support", ProjectStatus.Active, leadOps, "SLA & Support · PSO-Lite · remote · occasional support.", "PSO-Lite");
        PR(psp, "PSP-VITIP", "PesaPrint – New ViTIP", ProjectStatus.Planned, leadDel, "Opportunity · no clarity on the project roadmap.", "ViTIP");
        PR(adp, "ADP-POC", "Abu Dhabi Police – ViTIP POC", ProjectStatus.Planned, leadDel, "Opportunity · POC · IT infrastructure document preparation.", "ViTIP");
        PR(qat, "QMOI-POC", "Qatar MOI – AI remote inspection monitoring POC", ProjectStatus.Active, leadDel, "Opportunity · POC · ViTIP POC deployment; Qatar POC development (ViRRM).", "ViTIP", "ViRRM");
        PR(eif, "EIF-SLA", "EIFFAGE – SLA & Support", ProjectStatus.Active, leadOps, "SLA & Support · PSO-Lite · remote · idle.", "PSO-Lite");
        PR(bdi, "BDI-SLA", "Burundi – SLA & Support", ProjectStatus.OnHold, leadOps, "SLA & Support · PSO-Lite · inactive.", "PSO-Lite");
        await db.SaveChangesAsync(ct);
        db.UserScopes.Add(new UserScope { UserId = users["viewer"].Id, Kind = ScopeKind.Project, ProjectId = sapSla.Id });

        // ---------- environments (MOCKED: the workbook has no environment inventory) ----------
        var envs = new Dictionary<string, ClientEnvironment>();
        ClientEnvironment E(string key, Client c, Region? r, string name, EnvironmentType t, Criticality crit, User? owner, User? backup, string? project, HostingType hosting = HostingType.OnPrem)
        {
            var e = new ClientEnvironment
            {
                ClientId = c.Id, RegionId = r?.Id, ProjectId = project is null ? null : projects[project].Id, Name = name, NormalizedName = Text.Norm(name), Type = t.ToString(), TypeCategory = t, Criticality = crit, Hosting = hosting,
                OwnerUserId = owner?.Id, CoordinatorUserId = owner is null ? leadOps.Id : null, BackupOwnerUserId = backup?.Id, BackupGapReason = backup is null ? "No second engineer assigned (see resource plan)" : null,
                InventoryReviewedAt = now.AddDays(-12)
            };
            db.Environments.Add(e);
            envs[key] = e;
            return e;
        }
        E("dp-trf-prod", dp, null, "Traffic Production", EnvironmentType.Production, Criticality.Critical, engDp, users["e01"], "DP-TRAFFIC");
        E("dp-trf-stg", dp, null, "Traffic Staging", EnvironmentType.Staging, Criticality.Normal, engDp, null, "DP-TRAFFIC");
        E("dp-oyo-prod", dp, null, "Oyoon Production", EnvironmentType.Production, Criticality.Critical, users["e09"], null, "DP-OYOON");
        E("tah-r1", tah, r1, "Production", EnvironmentType.Production, Criticality.Critical, engTah, users["e06"], "TAH-SLA");
        E("tah-r1-stg", tah, r1, "Staging", EnvironmentType.Staging, Criticality.Normal, engTah, null, "TAH-SLA");
        E("tah-r2", tah, r2, "Production", EnvironmentType.Production, Criticality.Critical, users["e05"], engTah, "TAH-SLA");
        E("tah-r3", tah, r3, "Production", EnvironmentType.Production, Criticality.High, users["e07"], null, "TAH-SLA");
        E("sew-prod", sew, null, "Production", EnvironmentType.Production, Criticality.High, users["e02"], null, "SEWAR-SLA", hosting: HostingType.Unknown);
        E("mdj-prod", mdj, null, "Production", EnvironmentType.Production, Criticality.High, users["e08"], null, "MDJ-VITIP");
        E("rwa-prod", rwa, null, "Production", EnvironmentType.Production, Criticality.Critical, users["e03"], null, "RWA-SLA");
        E("rwa-dr", rwa, null, "Disaster Recovery", EnvironmentType.DR, Criticality.High, null, null, "RWA-SLA");
        E("nar-prod", nar, null, "Production", EnvironmentType.Production, Criticality.High, former, users["e04"], "NARSA-SLA");
        E("sap-prod", sap, null, "Production", EnvironmentType.Production, Criticality.Normal, users["e10"], leadAu, "SAPOL-SLA", hosting: HostingType.Cloud);
        E("shj-prod", shj, null, "Production", EnvironmentType.Production, Criticality.High, users["e11"], null, "SHJ-VITIP", hosting: HostingType.Unknown);
        E("rop-prod", omn, null, "Production", EnvironmentType.Production, Criticality.Normal, users["e02"], null, "ROP-OPS");
        E("psp-prod", psp, null, "Production", EnvironmentType.Production, Criticality.Normal, users["e02"], null, "PSP-SLA");
        E("qat-poc", qat, null, "POC", EnvironmentType.Test, Criticality.Unknown, users["e14"], null, "QMOI-POC", hosting: HostingType.OnPrem);
        E("eif-prod", eif, null, "Production", EnvironmentType.Production, Criticality.Normal, users["e04"], null, "EIF-SLA");
        E("bdi-prod", bdi, null, "Production", EnvironmentType.Production, Criticality.Unknown, users["e04"], null, "BDI-SLA");
        await db.SaveChangesAsync(ct);
        envs["sew-prod"].InventoryReviewedAt = now.AddDays(-48);
        envs["eif-prod"].InventoryReviewedAt = now.AddDays(-95);
        envs["bdi-prod"].InventoryReviewedAt = null;

        void Report(string env, Condition c, string reason, string evidence, double hoursAgo)
        {
            var e = envs[env];
            var at = now.AddHours(-hoursAgo);
            db.ConditionReports.Add(new ConditionReport { EnvironmentId = e.Id, ClientId = e.ClientId, Condition = c, Reason = reason, Evidence = evidence, ObservedAt = at, RecordedAt = at, RecordedById = e.OwnerUserId });
            e.Condition = c; e.ConditionReason = reason; e.ConditionObservedAt = at;
        }
        Report("dp-trf-prod", Condition.Healthy, "Daily health checklist", "Checklist DP-TRF (demo)", 6);
        Report("dp-oyo-prod", Condition.Degraded, "ANPR Pool queue backlog after .NET Core release", "Customer ticket reference (demo)", 20);
        Report("tah-r1", Condition.Healthy, "Release 17.8.1 verified", "Release note (demo)", 30);
        Report("tah-r2", Condition.Healthy, "Release 17.8.1 verified", "Release note (demo)", 30);
        Report("tah-r3", Condition.Degraded, "Still on 17.7.1; importer slow", "Ops log (demo)", 24 * 11);
        Report("sew-prod", Condition.Unknown, "No remote access until infrastructure is ready", "", 24 * 3);
        Report("rwa-prod", Condition.Healthy, "Weekly check by on-site engineer", "Weekly report (demo)", 40);
        Report("nar-prod", Condition.Healthy, "Monthly check", "Monthly report (demo)", 24 * 20);
        Report("sap-prod", Condition.Healthy, "3rd-level support check", "Support log (demo)", 50);
        Report("rop-prod", Condition.Unavailable, "Smart File Manager test instance stopped", "Remote session note (demo)", 24 * 2);

        // ---------- installations (MOCKED versions; PSOP 17.7/17.8 releases are named in the workbook) ----------
        var inst = new Dictionary<string, Installation>();
        void I(string key, string env, string product, string name, string? version, int reviewedDaysAgo = 15)
        {
            var e = envs[env];
            var i = new Installation { EnvironmentId = e.Id, ClientId = e.ClientId, ProductId = products[product].Id, InstanceName = name, NormalizedInstanceName = Text.Norm(name), ProductVersionId = Ver(product, version), LastReviewedAt = version is null ? null : now.AddDays(-reviewedDaysAgo) };
            db.Installations.Add(i);
            inst[key] = i;
        }
        I("dp-psop", "dp-trf-prod", "PSOP", "PSOP Traffic", "17.7.1"); I("dp-rrm", "dp-trf-prod", "ViRRM", "ViRRM", "3.2"); I("dp-dpp", "dp-trf-prod", "ViDPP", "ViDPP", "2.5");
        I("dp-ign", "dp-trf-stg", "Ignesa", "Ignesa (pre-go-live)", null); I("dp-psop-stg", "dp-trf-stg", "PSOP", "PSOP Traffic", "17.7.1");
        I("dp-its", "dp-oyo-prod", "ViITS", "Zabeel", "1.9"); I("dp-anpr", "dp-oyo-prod", "ANPR-Pool", "ANPR Pool", "2.0");
        I("tah1-psop", "tah-r1", "PSOP", "PSOP Main", "17.8.1"); I("tah1-rrm", "tah-r1", "ViRRM", "ViRRM", "3.2"); I("tah1-dpp", "tah-r1", "ViDPP", "ViDPP", "2.4");
        I("tah1s-psop", "tah-r1-stg", "PSOP", "PSOP Main", "17.8.1");
        I("tah2-psop", "tah-r2", "PSOP", "PSOP Main", "17.8.1"); I("tah2-rrm", "tah-r2", "ViRRM", "ViRRM", "3.2");
        I("tah3-psop", "tah-r3", "PSOP", "PSOP Main", "17.7.1", 40); I("tah3-rrm", "tah-r3", "ViRRM", "ViRRM", "3.1", 40);
        I("sew-psop", "sew-prod", "PSOP", "PSOP", "17.6", 60); I("sew-psco", "sew-prod", "PSCO", "PSCO", "5.1", 60); I("sew-its", "sew-prod", "ViITS", "ViITS", null);
        I("rwa-psop", "rwa-prod", "PSOP", "PSOP", "17.6"); I("rwa-psco", "rwa-prod", "PSCO", "PSCO", "5.1"); I("rwa-eb", "rwa-prod", "EB", "EB Online", "2.3");
        I("nar-psop", "nar-prod", "PSOP", "PSOP", "17.7", 100); I("nar-psco", "nar-prod", "PSCO", "PSCO", "5.0", 100);
        I("sap-psop3", "sap-prod", "PSOP3", "PSOP SAPOL", "3.1");
        I("shj-psol", "shj-prod", "PSO-Lite", "PSOL", "3.0"); I("shj-ism", "shj-prod", "ViISM", "ViISM", "1.0"); I("shj-sdb", "shj-prod", "ViSDB", "ViSDB", "2.0"); I("shj-rrm", "shj-prod", "ViRRM", "ViRRM", null);
        I("rop-pscon", "rop-prod", "PsCon", "PsCon", "4.0", 150); I("rop-otx", "rop-prod", "OTX", "OTX Converter", "1.2", 150); I("rop-sfm", "rop-prod", "SFM", "Smart File Manager (test)", "2.4");
        I("psp-psol", "psp-prod", "PSO-Lite", "PSO-Lite", "2.4", 80); I("qat-rrm", "qat-poc", "ViRRM", "ViRRM POC", "3.2");
        I("eif-psol", "eif-prod", "PSO-Lite", "PSO-Lite", "2.0", 200); I("bdi-psol", "bdi-prod", "PSO-Lite", "PSO-Lite", null);
        await db.SaveChangesAsync(ct);
        db.InstallationVersionChanges.AddRange(
            new InstallationVersionChange { InstallationId = inst["tah1-psop"].Id, ClientId = tah.Id, FromVersionId = Ver("PSOP", "17.7.1"), ToVersionId = Ver("PSOP", "17.8.1"), Reason = "Tahakom release 17.8 + hotfix 17.8.1", Evidence = "Release note (demo)", ChangedById = engTah.Id, ChangedAt = new DateTimeOffset(2026, 8, 5, 9, 0, 0, TimeSpan.Zero) },
            new InstallationVersionChange { InstallationId = inst["tah3-psop"].Id, ClientId = tah.Id, FromVersionId = Ver("PSOP", "17.7"), ToVersionId = Ver("PSOP", "17.7.1"), Reason = "Hotfix 17.7.1", Evidence = "Release note (demo)", ChangedById = Id("e07"), ChangedAt = new DateTimeOffset(2026, 6, 28, 9, 0, 0, TimeSpan.Zero) },
            new InstallationVersionChange { InstallationId = inst["dp-anpr"].Id, ClientId = dp.Id, FromVersionId = Ver("ANPR-Pool", "1.9"), ToVersionId = Ver("ANPR-Pool", "2.0"), Reason = ".NET Core ANPR Pool release to Dubai", Evidence = "Deployment record (demo)", ChangedById = Id("e09"), ChangedAt = new DateTimeOffset(2026, 7, 9, 9, 0, 0, TimeSpan.Zero) });

        // ---------- servers (MOCKED; Madar Dijla's four servers come from the workbook note, with provenance) ----------
        Asset A(string env, string name, AssetType t, string role, decimal? cpu, CpuUnit? cu, decimal? ram, MemoryUnit? ru, AssetLifecycle life, User? owner)
        {
            var e = envs[env];
            var a = new Asset
            {
                EnvironmentId = e.Id, ClientId = e.ClientId, Name = name, NormalizedName = Text.Norm(name), Type = t.ToString(), TypeCategory = t, Role = role, NetworkZone = "Internal", ProjectPhase = life == AssetLifecycle.Planned ? "Requested" : "Deployed",
                Lifecycle = life, OwnerUserId = owner?.Id, CoordinatorUserId = owner is null ? leadOps.Id : null, CpuQuantity = cpu, CpuUnit = cu, RamQuantity = ram, RamUnit = ru, OsFamily = cpu is null ? null : "Windows Server",
                VerifiedAt = life == AssetLifecycle.Active ? now.AddDays(-14) : null,
            };
            db.Assets.Add(a);
            return a;
        }
        var tApp1 = A("tah-r1", "tah-r1-app01", AssetType.VM, "Application server", 16, CpuUnit.vCPU, 64, MemoryUnit.GB, AssetLifecycle.Active, engTah);
        var tApp2 = A("tah-r1", "tah-r1-app02", AssetType.VM, "Application server", 16, CpuUnit.vCPU, 64, MemoryUnit.GB, AssetLifecycle.Active, engTah);
        var tWeb = A("tah-r1", "tah-r1-web01", AssetType.VM, "Web server", 8, CpuUnit.vCPU, 32, MemoryUnit.GB, AssetLifecycle.Active, engTah);
        var tDb = A("tah-r1", "tah-r1-db01", AssetType.Physical, "Database server", 32, CpuUnit.PhysicalCore, 512, MemoryUnit.GiB, AssetLifecycle.Active, users["e06"]);
        A("tah-r1", "tah-r1-sql-listener", AssetType.LogicalEndpoint, "Listener", null, null, null, null, AssetLifecycle.Active, users["e06"]);
        var dApp = A("dp-trf-prod", "dp-trf-app01", AssetType.VM, "Application server", 12, CpuUnit.vCPU, 48, MemoryUnit.GB, AssetLifecycle.Active, engDp);
        var dDb = A("dp-trf-prod", "dp-trf-db01", AssetType.VM, "Database server", 16, CpuUnit.vCPU, 128, MemoryUnit.GB, AssetLifecycle.Active, engDp);
        for (var n = 1; n <= 4; n++)
            A("mdj-prod", $"mdj-hpe-{n:00}", AssetType.Physical, n == 4 ? "Database server" : "Application server", null, null, null, null, AssetLifecycle.Planned, users["e08"]);
        A("sew-prod", "sewar-app01", AssetType.VM, "Application server", null, null, 32, MemoryUnit.GB, AssetLifecycle.Unknown, users["e02"]);
        A("rwa-prod", "rwa-f5-lb", AssetType.LogicalEndpoint, "Load balancer", null, null, null, null, AssetLifecycle.Planned, users["e03"]);
        await db.SaveChangesAsync(ct);
        void Comp(string instKey, string name, string role, params Asset[] hosts)
        {
            var i = inst[instKey];
            var c = new Component { InstallationId = i.Id, EnvironmentId = i.EnvironmentId, ClientId = i.ClientId, Name = name, NormalizedName = Text.Norm(name), Role = role, OwnerUserId = envs.Values.First(e => e.Id == i.EnvironmentId).OwnerUserId };
            foreach (var h in hosts) c.Hosts.Add(new ComponentHost { AssetId = h.Id, ClientId = i.ClientId });
            db.Components.Add(c);
        }
        Comp("tah1-psop", "PSOP Web", "Web", tWeb); Comp("tah1-psop", "PSOP Application", "Application", tApp1, tApp2); Comp("tah1-psop", "PSOP Database", "Database", tDb);
        Comp("tah1-rrm", "ViRRM Service", "Application", tApp2); Comp("tah1-dpp", "ViDPP Importer", "Import", tApp1);
        Comp("dp-psop", "PSOP Application", "Application", dApp); Comp("dp-psop", "PSOP Database", "Database", dDb); Comp("dp-dpp", "DPP Processing", "Workflow", dApp);

        db.Boundaries.AddRange(
            new ResponsibilityBoundary { ClientId = mdj.Id, Area = "Operating system", Party = ResponsibleParty.CustomerIT, Organization = "Madar Dijla IT", CoordinatorUserId = Id("e08"), Notes = "Client provides servers and OS" },
            new ResponsibilityBoundary { ClientId = sew.Id, Area = "Network", Party = ResponsibleParty.CustomerIT, Organization = "SEWAR IT", CoordinatorUserId = Id("e02"), Notes = "Remote access pending infrastructure readiness" },
            new ResponsibilityBoundary { ClientId = tah.Id, Area = "Application", Party = ResponsibleParty.TIO },
            new ResponsibilityBoundary { ClientId = sap.Id, Area = "Application", Party = ResponsibleParty.OtherItdDivision, Organization = "Vitronic GmbH (1st/2nd level)", CoordinatorUserId = leadAu.Id, Notes = "TIO provides 3rd-level support" },
            new ResponsibilityBoundary { ClientId = rwa.Id, Area = "Backup", Party = ResponsibleParty.Unknown, CoordinatorUserId = Id("e03"), Notes = "DR setup pending management board decision" });
        await db.SaveChangesAsync(ct);

        // ---------- cases (from workbook remarks and delivery notes) ----------
        var customerJira = await db.JiraInstances.FirstAsync(j => j.Kind == JiraInstanceKind.CustomerCloud, ct);
        var internalJira = await db.JiraInstances.FirstAsync(j => j.Kind == JiraInstanceKind.InternalOnPrem, ct);
        var cases = new List<Case>();
        Case K(Client? c, Team team, string title, CaseType type, Priority p, User? owner, CaseStatus st, string impact, string next, int createdDaysAgo, double nextReviewDays, string[]? envKeys = null, DateTimeOffset? due = null, string? tz = null)
        {
            var created = now.AddDays(-createdDaysAgo);
            var k = new Case
            {
                Title = title, Type = type.ToString(), TypeCategory = type, Scope = c is null ? WorkScope.Internal : WorkScope.Client, ClientId = c?.Id, ResponsibleTeamId = team.Id, ImpactSummary = impact, Priority = p,
                OwnerUserId = owner?.Id, Status = st, NextAction = next, NextReviewAt = now.AddDays(nextReviewDays), DueAt = due, DueTimeZone = due is null ? null : tz,
                CycleStartedAt = created, LastReviewedAt = now.AddDays(-Math.Min(createdDaysAgo, 1))
            };
            foreach (var ek in envKeys ?? []) k.Environments.Add(new CaseEnvironment { EnvironmentId = envs[ek].Id, ClientId = envs[ek].ClientId });
            db.Cases.Add(k);
            cases.Add(k);
            return k;
        }
        var kIgn = K(dp, del, "Ignesa go-live blocked: production infrastructure not provided", CaseType.MaintenanceCoordination, Priority.High, Id2(users, "e09"), CaseStatus.InProgress,
            "Ignesa cannot go live on production until Dubai Police provides the infrastructure; Vitronic supervision required.", "Follow up infrastructure handover with Traffic IT", 95, 2, ["dp-trf-stg"]);
        var kDpDemand = K(dp, ops, "Traffic: high support demand exceeds assigned capacity", CaseType.RiskFollowUp, Priority.High, leadOps, CaseStatus.Triaged,
            "Workbook: 1.0 FTE required, 0.3 available (High demand). Risk of missed SLA responses.", "Agree interim cover with the TIO Manager", 40, 3, ["dp-trf-prod"]);
        var kOyoon = K(dp, del, "Oyoon: resource shortage for continuous development and releases", CaseType.RiskFollowUp, Priority.Critical, leadDel, CaseStatus.InProgress,
            "Workbook: 1.5 FTE required, 0.7 available; high-demand client.", "Confirm backfill during summer leave (coverage plan)", 60, 1, ["dp-oyo-prod"]);
        var kAnpr = K(dp, ops, "ANPR Pool queue backlog after .NET Core release", CaseType.Incident, Priority.High, engDp, CaseStatus.PendingValidation,
            "Plate reads delayed in Oyoon production after the .NET Core ANPR Pool release.", "Customer to confirm queue is back to normal", 4, 1, ["dp-oyo-prod"], now.AddDays(-1), "Asia/Dubai");
        var kTahRes = K(tah, ops, "Tahakom SLA staffing: 8 engineers required, 4 available", CaseType.RiskFollowUp, Priority.Critical, manager, CaseStatus.InProgress,
            "Workbook: SLA contract requires 8 employees (2 operations + 1 DevOps on site); 4 available.", "Recruitment and interim allocation decision", 75, 2, ["tah-r1", "tah-r2", "tah-r3"]);
        K(tah, ops, "R3 Dammam still on PSOP 17.7.1 – importer slow", CaseType.Incident, Priority.Normal, users["e07"], CaseStatus.Triaged,
            "R3 not yet upgraded to 17.8.1; importer throughput reduced.", "Plan 17.8.1 upgrade window for R3", 11, 4, ["tah-r3"], now.AddDays(10), "Asia/Riyadh");
        var kTahIdx = K(tah, tA, "Upgrade database indexes from INT to BIGINT", CaseType.MaintenanceCoordination, Priority.High, users["e12"], CaseStatus.InProgress,
            "Product streams (July): index type upgrade required before ID exhaustion.", "Test migration script on R1 Staging", 70, 2, ["tah-r1-stg"], new DateTimeOffset(2026, 7, 31, 14, 0, 0, TimeSpan.Zero), "Asia/Riyadh");
        var kSew = K(sew, ops, "SEWAR deliveries blocked: client IT infrastructure not ready", CaseType.Request, Priority.Normal, users["e02"], CaseStatus.InProgress,
            "Altered Plate Solution, ViTIS (MOI integration) and ViSDB cannot be delivered until infrastructure is ready. Minimum 3 days/week required.", "Weekly readiness call with SEWAR IT", 110, 3, ["sew-prod"]);
        var kMdj = K(mdj, ops, "Madar Dijla to provide 4 servers for ViTIP", CaseType.Request, Priority.High, users["e08"], CaseStatus.InProgress,
            "Implementation (IAP/PSOL, VMS, ViTIS, RRM, SDB) waits for 4 servers from the client.", "Confirm server delivery date", 90, 4, ["mdj-prod"]);
        var kRwa = K(rwa, ops, "Load balancer and DR pending management board approval", CaseType.Request, Priority.High, users["e03"], CaseStatus.InProgress,
            "F5 load balancer and DR environment cannot be configured until the board approves.", "Escalate decision to management board", 100, 5, ["rwa-prod", "rwa-dr"]);
        var kNar = K(nar, ops, "NARSA SLA finalization", CaseType.Request, Priority.Normal, former, CaseStatus.Triaged,
            "SLA document not finalized; contract requires 2 on-site engineers.", "Send revised SLA draft", 120, -6, ["nar-prod"]);
        K(shj, del, "Sharjah ViTIP One waits for contract finalization", CaseType.Request, Priority.Normal, null, CaseStatus.New,
            "Implementation starts once the contracts department finalizes the contract.", "Triage and assign", 8, -1, null);
        K(omn, tX, "Oman: replace Smart File Manager with ViDPP", CaseType.Improvement, Priority.Low, users["e06"], CaseStatus.Triaged,
            "Workbook note: Smart File Manager under testing should be changed to DPP.", "Prepare ViDPP proposal", 30, 7, ["rop-prod"]);
        K(qat, tD, "Qatar POC development (ViRRM)", CaseType.Request, Priority.Normal, users["e14"], CaseStatus.InProgress,
            "AI remote inspection monitoring POC on ViTIP / ViRRM.", "Demo build for MOI-SDD", 45, 5, ["qat-poc"], now.AddDays(12), "Asia/Qatar");
        K(null, itd, "ViESP needs a backend developer", CaseType.RiskFollowUp, Priority.High, leadOps, CaseStatus.Triaged,
            "Office IT: ViESP operation requires a backend developer (2 FTE required, 1 available).", "Request hiring approval", 50, 3, null);
        var kSfm = K(null, tX, "Smart File Manager V2.5 – telemetry and Docker format", CaseType.Improvement, Priority.Normal, users["e06"], CaseStatus.InProgress,
            "SFM V2.5 improvements enable Docker deployment with IPP/DPP in Dubai and KSA.", "Finish Docker packaging", 80, 4, null);
        var kIap = K(null, tA, "ViIAP (cloud, Tahakom) feature completion", CaseType.Improvement, Priority.Normal, users["e12"], CaseStatus.InProgress,
            "Future feature product: ViIAP for cloud deployment at Tahakom; features 90 % complete.", "Close remaining features", 55, 6, null);
        var kClosed = K(sap, tA1, "RedFlex-Mobile release for SAPOL", CaseType.Request, Priority.Normal, users["e10"], CaseStatus.Closed,
            "Australia RedFlex-Mobile release (June delivery).", "None", 130, 30, ["sap-prod"]);
        kClosed.Outcome = "Released to production"; kClosed.ValidationEvidence = "Customer acceptance email (demo)"; kClosed.ClosedAt = new DateTimeOffset(2026, 6, 26, 10, 0, 0, TimeSpan.Zero);
        await db.SaveChangesAsync(ct);

        void Wait(Case k, WaitingReason r, string note, int daysAgo)
        {
            k.WaitingReason = r; k.WaitingSince = now.AddDays(-daysAgo);
            k.WaitingIntervals.Add(new CaseWaitingInterval { Reason = r, Note = note, StartedAt = now.AddDays(-daysAgo), StartedById = k.OwnerUserId });
        }
        Wait(kIgn, WaitingReason.Customer, "Infrastructure to be provided by Dubai Police", 60);
        Wait(kSew, WaitingReason.Customer, "Pending IT infrastructure readiness", 45);
        Wait(kMdj, WaitingReason.Customer, "Waiting for 4 servers", 30);
        Wait(kRwa, WaitingReason.InternalTeam, "Pending management board", 25);
        db.JiraReferences.AddRange(
            new JiraReference { CaseId = kSfm.Id, JiraInstanceId = internalJira.Id, IssueKey = "TITAN-4895", Url = "https://jira.internal.example.com/browse/TITAN-4895" },
            new JiraReference { CaseId = kIap.Id, JiraInstanceId = internalJira.Id, IssueKey = "OWF-101", Url = "https://jira.internal.example.com/browse/OWF-101" },
            new JiraReference { CaseId = kAnpr.Id, ClientId = dp.Id, JiraInstanceId = customerJira.Id, IssueKey = "DPO-214", Url = "https://customer-demo.example.net/browse/DPO-214" },
            new JiraReference { CaseId = kAnpr.Id, ClientId = dp.Id, JiraInstanceId = internalJira.Id, IssueKey = "ANPR-388", Url = "https://jira.internal.example.com/browse/ANPR-388" },
            new JiraReference { CaseId = kTahIdx.Id, ClientId = tah.Id, JiraInstanceId = internalJira.Id, IssueKey = "PSOP-7712", Url = "https://jira.internal.example.com/browse/PSOP-7712" });
        foreach (var k in cases)
        {
            db.CaseEvents.Add(new CaseEvent { CaseId = k.Id, Type = CaseEventType.Created, ToValue = "New", At = k.CycleStartedAt, Note = "Demo data (from workbook remark)" });
            if (k.Status != CaseStatus.New) db.CaseEvents.Add(new CaseEvent { CaseId = k.Id, Type = CaseEventType.Triaged, FromValue = "New", ToValue = "Triaged", At = k.CycleStartedAt.AddDays(1), ById = k.ResponsibleTeamId == ops.Id ? leadOps.Id : leadDel.Id });
        }

        // ---------- commitments (workbook delivery items per month; outcomes MOCKED) ----------
        static DateTimeOffset MonthEnd(int month, string tz)
        {
            var local = new DateTime(2026, month, DateTime.DaysInMonth(2026, month), 17, 0, 0, DateTimeKind.Unspecified);
            var zone = TimeZoneInfo.FindSystemTimeZoneById(tz);
            return new DateTimeOffset(local, zone.GetUtcOffset(local)).ToUniversalTime();
        }
        void Commit(Client? c, Team? team, string? project, User owner, string desc, CommitmentType type, int month, string tz, string outcome, string? note = null, params (int Month, string Reason)[] revisions)
        {
            var original = MonthEnd(month, tz);
            var m = new Commitment
            {
                Scope = c is null ? WorkScope.Internal : WorkScope.Client, ClientId = c?.Id, ResponsibleTeamId = c is null ? team!.Id : null, Description = desc, Type = type, OwnerUserId = owner.Id,
                OriginalDueAt = original, CurrentDueAt = original, TimeZone = tz, ProjectId = project is null ? null : projects[project].Id, NextReviewAt = now.AddDays(7), LastReviewedAt = now.AddDays(-3)
            };
            var created = new DateTimeOffset(2026, Math.Max(5, month - 1), 20, 8, 0, 0, TimeSpan.Zero);
            m.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Created, NewDueAt = original, At = created, ById = owner.Id, Reason = note });
            foreach (var (mo, reason) in revisions)
            {
                var next = mo > 12 ? now.AddDays(mo - 100) : MonthEnd(mo, tz);
                m.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Revised, PreviousDueAt = m.CurrentDueAt, NewDueAt = next, Reason = reason, At = m.CurrentDueAt.AddDays(-2), ById = owner.Id });
                m.CurrentDueAt = next;
                m.RevisionCount++;
            }
            if (outcome.StartsWith("late:") || outcome == "ontime")
            {
                var done = outcome == "ontime" ? m.CurrentDueAt.AddDays(-2) : m.CurrentDueAt.AddDays(int.Parse(outcome[5..]));
                m.Status = CommitmentStatus.Completed; m.CompletedAt = done; m.CompletionEvidence = "Release / delivery note (demo)"; m.DueAtCompletion = m.CurrentDueAt; m.CompletedLate = done > m.CurrentDueAt;
                m.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Completed, CompletedAt = done, Evidence = m.CompletionEvidence, At = done, ById = owner.Id, PreviousDueAt = m.CurrentDueAt });
            }
            else if (outcome.StartsWith("cancel:"))
            {
                m.Status = CommitmentStatus.Cancelled; m.CancelReason = outcome[7..];
                m.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Cancelled, Reason = m.CancelReason, At = m.CurrentDueAt.AddDays(-5), ById = owner.Id });
            }
            db.Commitments.Add(m);
            m.CreatedAt = created;
        }
        const string Dxb = "Asia/Dubai", Ruh = "Asia/Riyadh", Bgw = "Asia/Baghdad";
        // Dubai Police
        Commit(dp, null, "DP-TRAFFIC", leadOps, "DPP release to Dubai Police (Traffic)", CommitmentType.Delivery, 6, Dxb, "ontime");
        Commit(dp, null, "DP-TRAFFIC-IGN", users["e09"], "Ignesa go-live on production", CommitmentType.Delivery, 6, Dxb, "open", "Infrastructure should be provided to go live",
            (8, "Client infrastructure not yet provided"), (11, "Infrastructure delivery re-planned by client"));
        Commit(dp, null, "DP-OYOON", users["e09"], "Continuous development and releases for Dubai (Zabeel / ViITS) – June drop", CommitmentType.Delivery, 6, Dxb, "ontime");
        Commit(dp, null, "DP-OYOON", users["e09"], ".NET Core ANPR Pool release to Dubai", CommitmentType.Delivery, 6, Dxb, "late:9");
        Commit(dp, null, "DP-OYOON-AIPM", leadDel, "AI Project Management – Phase 1: System Administration", CommitmentType.Delivery, 7, Dxb, "ontime");
        Commit(dp, null, "DP-OYOON-AIPM", leadDel, "AI Project Management – Phase 2: Rasd Operation", CommitmentType.Delivery, 8, Dxb, "late:12");
        Commit(dp, null, "DP-OYOON-AIPM", leadDel, "AI Project Management – Phase 3: Analytics Module", CommitmentType.Delivery, 9, Dxb, "open");
        // Tahakom
        Commit(tah, null, "TAH-SLA", engTah, "Tahakom release 17.7 and hotfix 17.7.1", CommitmentType.Delivery, 6, Ruh, "ontime");
        Commit(tah, null, "TAH-SLA", engTah, "Tahakom release 17.8 and hotfix 17.8.1", CommitmentType.Delivery, 7, Ruh, "late:5");
        Commit(tah, null, "TAH-SLA", users["e12"], "Idemia integration with ViRRM in KSA", CommitmentType.Delivery, 6, Ruh, "ontime");
        Commit(tah, null, "TAH-SLA", manager, "SLA staffing: 2 operations + 1 DevOps engineer on site", CommitmentType.RecordedContractualDeadline, 9, Ruh, "open", "As per the SLA contract 8 employees required");
        // SEWAR (same items repeated in June, July and August → revisions)
        Commit(sew, null, "SEWAR-SLA", users["e02"], "Altered Plate Solution", CommitmentType.Delivery, 6, Bgw, "open", "Pending IT infrastructure readiness",
            (7, "Pending client IT infrastructure readiness"), (8, "Pending client IT infrastructure readiness"), (130, "Re-planned after readiness call"));
        Commit(sew, null, "SEWAR-SLA", users["e02"], "ViTIS with MOI integration", CommitmentType.Delivery, 6, Bgw, "open", null,
            (7, "Pending client IT infrastructure readiness"), (8, "Pending client IT infrastructure readiness"));
        Commit(sew, null, "SEWAR-SLA", users["e02"], "ViSDB deployment", CommitmentType.Delivery, 6, Bgw, "cancel:Client deprioritized ViSDB until infrastructure is ready", null, (7, "Pending client IT infrastructure readiness"));
        // Madar Dijla, Iraq
        Commit(mdj, null, "MDJ-VITIP", users["e08"], "Phase 1 delivery: IAP (PSOL), VMS, ViTIS, RRM, SDB", CommitmentType.Delivery, 6, Bgw, "open", "Madar Dijla to provide IT infrastructure (4 HPE servers)", (12, "Servers not yet provided by client"));
        Commit(mdj, null, "MDJ-VITIP", users["e10"], "PSOL release to Iraq for seatbelt and mobile-phone violations", CommitmentType.Delivery, 7, Bgw, "late:18");
        // Rwanda
        Commit(rwa, null, "RWA-SLA", users["e03"], "EB online solution on tablet", CommitmentType.Delivery, 6, "Africa/Kigali", "ontime");
        Commit(rwa, null, "RWA-SLA", users["e03"], "AVS + SIP testing", CommitmentType.Delivery, 6, "Africa/Kigali", "late:20");
        Commit(rwa, null, "RWA-SLA", users["e03"], "F5 load balancer configuration", CommitmentType.Delivery, 6, "Africa/Kigali", "open", "Load balancer + DR pending management board");
        // Morocco, Australia, Sharjah, Oman, Kenya, Qatar
        Commit(nar, null, "NARSA-SLA", former, "SLA finalization with NARSA", CommitmentType.RenewalAction, 6, "Africa/Casablanca", "open");
        Commit(sap, null, "SAPOL-SLA", users["e10"], "Australia RedFlex-Mobile release", CommitmentType.Delivery, 6, "Australia/Adelaide", "ontime");
        Commit(shj, null, "SHJ-VITIP", users["e10"], "PSOL release to Sharjah", CommitmentType.Delivery, 6, Dxb, "ontime");
        Commit(shj, null, "SHJ-VITIP", users["e11"], "ViISM release to Sharjah", CommitmentType.Delivery, 6, Dxb, "late:15");
        Commit(shj, null, "SHJ-VITIP", users["e13"], "ViSDB release to Sharjah", CommitmentType.Delivery, 6, Dxb, "ontime");
        Commit(shj, null, "SHJ-VITIP", users["e14"], "ViRRM release to Sharjah (standardization done, functional development in progress)", CommitmentType.Delivery, 7, Dxb, "open");
        Commit(shj, null, "SHJ-VITIP", users["e11"], "ViTIP One deployment", CommitmentType.Delivery, 6, Dxb, "open", "Once contract is finalized from contract department", (12, "Contract not yet finalized"));
        Commit(omn, null, "ROP-OPS", users["e02"], "Smart File Manager acceptance testing", CommitmentType.Delivery, 6, "Asia/Muscat", "cancel:Should be changed to ViDPP (workbook note)");
        Commit(psp, null, "PSP-SLA", users["e02"], "Export favourite image", CommitmentType.Delivery, 6, "Africa/Nairobi", "ontime");
        Commit(qat, null, "QMOI-POC", users["e14"], "ViTIP POC deployment for MOI-SDD", CommitmentType.Delivery, 7, "Asia/Qatar", "open", null, (11, "POC scope extended"));
        // Internal (product streams)
        Commit(null, tX, null, users["e06"], "Smart File Manager V2.5 (telemetry, Docker format)", CommitmentType.Delivery, 6, Dxb, "late:25");
        Commit(null, tA, null, users["e12"], "SD release 1.4", CommitmentType.Delivery, 7, Dxb, "open");
        Commit(null, tA, null, users["e13"], "Importer enhancements release", CommitmentType.Delivery, 6, Dxb, "ontime");
        Commit(null, tA, null, users["e12"], "Case management release", CommitmentType.Delivery, 6, Dxb, "late:3");
        // Near-term items so the 7-day window is populated (mocked).
        Commit(tah, null, "TAH-SLA", engTah, "Monthly SLA service report – October", CommitmentType.CustomerUpdate, 10, Ruh, "open");
        Commit(dp, null, "DP-TRAFFIC", leadOps, "Monthly status update to Dubai Police Traffic", CommitmentType.CustomerUpdate, 10, Dxb, "open");
        var soon = 2;
        foreach (var m in db.Commitments.Local.Where(m => m.Type == CommitmentType.CustomerUpdate))
        {
            var due = now.Date.AddDays(soon++ * 2).AddHours(13);
            m.OriginalDueAt = m.CurrentDueAt = new DateTimeOffset(due, TimeSpan.Zero);
            m.Events.First().NewDueAt = m.CurrentDueAt;
        }
        await db.SaveChangesAsync(ct);

        await SeedContractsAsync(db, now, ct);

        // ---------- handovers (workbook “Team Coverage Plan”) ----------
        Handover H(Client? c, User from, User to, DateTimeOffset at, string summary, string actions, HandoverStatus st, params (string Type, long Id, string Label)[] items)
        {
            var h = new Handover { ClientId = c?.Id, OutgoingOwnerId = from.Id, ReceivingOwnerId = to.Id, EffectiveAt = at, Summary = summary, OutstandingActions = actions, Status = st };
            foreach (var (t, id, label) in items) h.Items.Add(new HandoverItem { RecordType = t, RecordId = id, ClientId = c?.Id, Label = label, PreviousOwnerId = from.Id, Applied = st != HandoverStatus.PendingAcknowledgment });
            if (st == HandoverStatus.Completed) { h.AcknowledgedAt = at; h.CompletedAt = at; h.AcknowledgmentNote = "Acknowledged (demo)"; }
            db.Handovers.Add(h);
            return h;
        }
        H(dp, engDp, users["e09"], new DateTimeOffset(2026, 7, 13, 5, 0, 0, TimeSpan.Zero), "Oyoon cover 13 Jul – 14 Aug (coverage plan)", "Continue ANPR Pool release follow-up", HandoverStatus.Completed,
            (RecordTypes.Environment, envs["dp-oyo-prod"].Id, "Oyoon Production"));
        H(dp, engDp, users["e13"], new DateTimeOffset(2026, 7, 13, 5, 0, 0, TimeSpan.Zero), "Traffic cover 13 Jul – 31 Jul (coverage plan; shared with a second engineer, then another cover 1–14 Aug)", "DPP release monitoring", HandoverStatus.Completed);
        H(null, leadOps, leadDel, now.AddDays(3), "Ops + IT-support activities cover during leave (coverage plan)", "ViESP hiring request; help-desk queue", HandoverStatus.PendingAcknowledgment,
            (RecordTypes.Case, cases.First(k => k.Title.StartsWith("ViESP")).Id, "ViESP needs a backend developer"));


        // Deactivated engineer keeps NARSA ownership → reassignment queue.
        former.IsActive = false; former.DeactivatedAt = now.AddDays(-4); former.DeactivationReason = "Left the team (demo)";
        await db.SaveChangesAsync(ct);

        // Back-date creation so ages and freshness read realistically.
        foreach (var k in cases) k.CreatedAt = k.CycleStartedAt;
        foreach (var e in envs.Values) e.CreatedAt = now.AddDays(-180);
        foreach (var c in clients.Values) c.CreatedAt = now.AddDays(-365);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>Contracts and recorded SLA terms (workbook "Commitments with Client", support type and FTE remarks; dates and targets MOCKED).</summary>
    private static async Task SeedContractsAsync(HubDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var projects = await db.Projects.IgnoreQueryFilters().ToDictionaryAsync(p => p.Code, ct);
        var products = await db.Products.ToDictionaryAsync(p => p.Code, ct);
        var people = await db.Users.Where(u => u.AccountName.StartsWith("DEV\\")).ToDictionaryAsync(u => u.AccountName[4..], ct);
        var envRows = await db.Environments.IgnoreQueryFilters().Select(e => new { e.Id, client = e.Client!.Code, region = e.Region == null ? null : e.Region.Code, e.Name }).ToListAsync(ct);
        // Same keys as the main seed: client-prefix + region/name.
        (string Client, string? Region, string Name) Where(string key) => key switch
        {
            "dp-trf-prod" => ("DP", null, "Traffic Production"), "dp-trf-stg" => ("DP", null, "Traffic Staging"), "dp-oyo-prod" => ("DP", null, "Oyoon Production"),
            "tah-r1" => ("TAH", "R1", "Production"), "tah-r2" => ("TAH", "R2", "Production"), "tah-r3" => ("TAH", "R3", "Production"),
            "sew-prod" => ("SEWAR", null, "Production"), "mdj-prod" => ("MDJ", null, "Production"), "rwa-prod" => ("RWA-EV", null, "Production"), "rwa-dr" => ("RWA-EV", null, "Disaster Recovery"),
            "nar-prod" => ("NARSA", null, "Production"), "sap-prod" => ("SAPOL", null, "Production"), "shj-prod" => ("SHJ", null, "Production"), "rop-prod" => ("ROP", null, "Production"),
            "psp-prod" => ("PSP", null, "Production"), "eif-prod" => ("EIF", null, "Production"), "bdi-prod" => ("BDI", null, "Production"),
            _ => throw new InvalidOperationException($"Unknown demo environment key {key}")
        };
        long EnvId(string key) { var w = Where(key); return envRows.First(e => e.client == w.Client && e.region == w.Region && e.Name == w.Name).Id; }
        var manager = people["manager"]; var leadOps = people["lead"]; var leadDel = people["lead2"]; var leadAu = people["lead3"]; var former = people["former"];
        const string Dxb = "Asia/Dubai", Ruh = "Asia/Riyadh", Bgw = "Asia/Baghdad";
        // The products a contract covers are the products of its project (A27).
        var projectProducts = (await db.ProjectProducts.ToListAsync(ct)).Select(x => (x.ProjectId, x.ProductId)).ToHashSet();

        SlaTarget[] Sla(SlaBasis basis, params (Priority P, int Response, int Resolution)[] rows) =>
            rows.Select(r => new SlaTarget { Priority = r.P, ResponseMinutes = r.Response, ResolutionMinutes = r.Resolution, Basis = basis }).ToArray();
        var standard = Sla(SlaBasis.SupportHours, (Priority.Critical, 60, 480), (Priority.High, 120, 1440), (Priority.Normal, 480, 4320), (Priority.Low, 1440, 10080));
        void Con(string project, string title, ContractType type, ContractStatus status, User owner, DateOnly? start, DateOnly? end, int? notice, RenewalTerms renewal,
            SupportModel model, string? hours, string? tz, int? onSite, string? coverage, string? obligations, string[] productCodes, string[] envKeys, SlaTarget[]? sla = null, string? reference = null)
        {
            var p = projects[project];
            foreach (var code in productCodes)
                if (projectProducts.Add((p.Id, products[code].Id))) db.ProjectProducts.Add(new ProjectProduct { ProjectId = p.Id, ProductId = products[code].Id });
            db.Contracts.Add(new Contract
            {
                ClientId = p.ClientId, ProjectId = p.Id, Title = title, ContractReference = reference, Type = type.ToString(), TypeCategory = type, Status = status, OwnerUserId = owner.Id, StartDate = start, EndDate = end,
                NoticeDays = notice, RenewalTerms = renewal, SupportModel = model, SupportHours = hours, SupportTimeZone = tz, OnSiteEngineersRequired = onSite, Coverage = coverage, Obligations = obligations,
                LastReviewedAt = now.AddDays(-20),
                Environments = envKeys.Select(k => new ContractEnvironment { EnvironmentId = EnvId(k), ClientId = p.ClientId }).ToList(),
                SlaTargets = (sla ?? []).Select(t => new SlaTarget { Priority = t.Priority, ResponseMinutes = t.ResponseMinutes, ResolutionMinutes = t.ResolutionMinutes, Basis = t.Basis }).ToList()
            });
        }
        static DateOnly D(int y, int m, int d) => new(y, m, d);
        Con("DP-TRAFFIC", "Dubai Police Traffic – SLA & Support", ContractType.SlaSupport, ContractStatus.Active, leadOps, D(2025, 1, 1), D(2026, 12, 31), 60, RenewalTerms.RenewalByAgreement,
            SupportModel.OnSite, "Mon–Fri 07:30–15:30", Dxb, 1, "PSOP and ViRRM for Traffic", "On-site support; DPP release support; Ignesa go-live supervision.", ["PSOP", "ViRRM", "ViDPP"], ["dp-trf-prod", "dp-trf-stg"], standard);
        Con("DP-OYOON", "Oyoon – Operation and Support", ContractType.Maintenance, ContractStatus.Active, leadDel, D(2025, 7, 1), D(2027, 6, 30), 90, RenewalTerms.RenewalByAgreement,
            SupportModel.OnSite, "Mon–Fri 07:30–15:30", Dxb, null, "Zabeel (ViITS) and ANPR Pool", "Continuous development and releases; workbook: 1.5 FTE required (on-site count not stated).", ["ViITS", "ANPR-Pool"], ["dp-oyo-prod"],
            Sla(SlaBasis.SupportHours, (Priority.Critical, 30, 240), (Priority.High, 60, 960)));
        Con("TAH-SLA", "Tahakom SLA – Software support (3 regions)", ContractType.SlaSupport, ContractStatus.Active, manager, D(2024, 12, 1), D(2026, 11, 30), 90, RenewalTerms.RenewalByAgreement,
            SupportModel.OnSite, "24×7 for Critical; Sun–Thu 08:00–17:00 otherwise", Ruh, 8, "PSOP, ViRRM and ViDPP in R1 Riyadh, R2 Jeddah, R3 Dammam",
            "As per the SLA contract 8 employees required on site (operations + DevOps). Monthly service report.", ["PSOP", "ViRRM", "ViDPP"], ["tah-r1", "tah-r2", "tah-r3"],
            Sla(SlaBasis.CalendarHours, (Priority.Critical, 30, 240), (Priority.High, 60, 720), (Priority.Normal, 240, 2880), (Priority.Low, 480, 7200)));
        Con("SEWAR-SLA", "SEWAR – SLA & Support", ContractType.SlaSupport, ContractStatus.Active, leadOps, D(2025, 9, 1), null, null, RenewalTerms.Unknown,
            SupportModel.Remote, "Minimum 3 days/week", Bgw, 0, "PSOP, PSCO and ViITS", "Minimum 3 days/week remote support. End date not yet confirmed.", ["PSOP", "PSCO", "ViITS"], ["sew-prod"], standard);
        Con("MDJ-VITIP", "Madar Dijla – New ViTIP implementation", ContractType.Implementation, ContractStatus.Active, leadOps, D(2026, 4, 1), D(2027, 2, 28), 30, RenewalTerms.FixedTerm,
            SupportModel.Remote, null, Bgw, 0, "IAP (PSOL), VMS, ViTIS, RRM, SDB", "Client provides IT infrastructure (4 servers) before installation.", ["ViTIP", "PSO-Lite", "ViRRM", "ViSDB"], ["mdj-prod"]);
        Con("RWA-SLA", "Rwanda EV – SLA & Support", ContractType.SlaSupport, ContractStatus.Active, leadOps, D(2024, 10, 1), D(2026, 9, 30), 60, RenewalTerms.RenewalByAgreement,
            SupportModel.Hybrid, "Mon–Fri 08:00–17:00", "Africa/Kigali", 1, "PSOP, PSCO and EB", "As per the contract 1 on-site engineer required. Load balancer and DR pending management board.", ["PSOP", "PSCO", "EB"], ["rwa-prod", "rwa-dr"], standard);
        Con("NARSA-SLA", "NARSA – SLA & Support", ContractType.SlaSupport, ContractStatus.Draft, former, null, null, null, RenewalTerms.Unknown,
            SupportModel.OnSite, null, "Africa/Casablanca", 2, "PSOP and PSCO", "As per the contract 2 on-site engineers required. SLA finalization in progress.", ["PSOP", "PSCO"], ["nar-prod"]);
        Con("DGSN-IMPL", "Gendarmerie – EB, BO Monitoring, ANPR Passage", ContractType.Implementation, ContractStatus.Draft, leadOps, null, null, null, RenewalTerms.Unknown,
            SupportModel.OnSite, null, "Africa/Casablanca", null, "EB, BO Monitoring, ANPR Passage", "Opportunity: ANPR + ViTIS after contract completion.", ["EB", "BO-Monitoring", "ANPR-Passage"], []);
        Con("SAPOL-DEV", "SAPOL – .NET Core finalization", ContractType.Implementation, ContractStatus.Ended, leadAu, D(2025, 3, 1), D(2026, 6, 30), null, RenewalTerms.FixedTerm,
            SupportModel.Remote, null, "Australia/Adelaide", 0, "PSOP 3 security and functionality", "Delivered to GmbH; no more activities on this project.", ["PSOP3"], []);
        Con("SAPOL-SLA", "SAPOL – 3rd-level support", ContractType.SlaSupport, ContractStatus.Active, leadAu, D(2026, 7, 1), D(2027, 3, 31), 60, RenewalTerms.AutoRenew,
            SupportModel.Remote, "Mon–Fri 09:00–17:00", "Australia/Adelaide", 0, "PSOP 3 (3rd level behind GmbH 1st/2nd level)", "Ongoing 3rd-level support.", ["PSOP3"], ["sap-prod"],
            Sla(SlaBasis.SupportHours, (Priority.Critical, 120, 1440), (Priority.High, 240, 2880), (Priority.Normal, 1440, 7200)));
        Con("SHJ-VITIP", "Sharjah – ViTIP One", ContractType.Implementation, ContractStatus.Draft, leadOps, null, null, null, RenewalTerms.Unknown,
            SupportModel.Hybrid, null, Dxb, null, "ViTIP One (PSOL, ViISM, ViRRM, ViSDB)", "Starts once the contract is finalized by the contracts department.", ["ViTIP", "PSO-Lite", "ViISM", "ViRRM", "ViSDB"], ["shj-prod"]);
        Con("ROP-OPS", "Oman Traffic – Operation and Support", ContractType.Maintenance, ContractStatus.Active, leadOps, D(2025, 1, 1), D(2026, 12, 31), 30, RenewalTerms.AutoRenew,
            SupportModel.Remote, "Sun–Thu 08:00–15:00", "Asia/Muscat", 0, "PsCon and OTX Converter", "Idle; Smart File Manager to be replaced by ViDPP.", ["PsCon", "OTX"], ["rop-prod"], standard);
        Con("PSP-SLA", "PesaPrint – SLA & Support", ContractType.SlaSupport, ContractStatus.Active, leadOps, D(2025, 6, 1), D(2027, 5, 31), 60, RenewalTerms.AutoRenew,
            SupportModel.Remote, "Mon–Fri 08:00–17:00", "Africa/Nairobi", 0, "PSO-Lite", "Occasional support.", ["PSO-Lite"], ["psp-prod"], standard);
        Con("EIF-SLA", "EIFFAGE – SLA & Support", ContractType.SlaSupport, ContractStatus.Active, leadOps, D(2023, 1, 1), null, null, RenewalTerms.Unknown,
            SupportModel.Remote, null, "Africa/Dakar", 0, "PSO-Lite", "Idle.", ["PSO-Lite"], ["eif-prod"]);
        Con("BDI-SLA", "Burundi Traffic – SLA & Support", ContractType.SlaSupport, ContractStatus.Terminated, leadOps, D(2022, 1, 1), D(2025, 12, 31), null, RenewalTerms.FixedTerm,
            SupportModel.Remote, null, "Africa/Bujumbura", 0, "PSO-Lite", "Inactive.", ["PSO-Lite"], ["bdi-prod"]);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Optional local override of persona names (Development only). Reads a git-ignored JSON file of the form
    /// <c>{ "people": { "lead": { "displayName": "…", "email": "…" } } }</c> keyed by the persona key (the part after DEV\).
    /// Blank values keep the persona. Applied on every start, so editing the file and restarting is enough.
    /// </summary>
    public static async Task ApplyLocalPeopleAsync(HubDbContext db, string path, ILogger log, CancellationToken ct = default)
    {
        if (!File.Exists(path)) return;
        using var stream = File.OpenRead(path);
        var doc = await System.Text.Json.JsonDocument.ParseAsync(stream, cancellationToken: ct);
        if (!doc.RootElement.TryGetProperty("people", out var people)) return;
        var applied = 0;
        foreach (var p in people.EnumerateObject())
        {
            var name = p.Value.TryGetProperty("displayName", out var n) ? n.GetString()?.Trim() : null;
            var email = p.Value.TryGetProperty("email", out var e) ? e.GetString()?.Trim() : null;
            if (string.IsNullOrEmpty(name) && string.IsNullOrEmpty(email)) continue;
            var user = await db.Users.FirstOrDefaultAsync(u => u.AccountName == $"DEV\\{p.Name}", ct);
            if (user is null) { log.LogWarning("Local people file: no demo account DEV\\{Key}", p.Name); continue; }
            if (!string.IsNullOrEmpty(name) && name.Length <= 200) user.DisplayName = name;
            if (!string.IsNullOrEmpty(email) && email.Length <= 320 && email.Contains('@')) user.Email = email;
            applied++;
        }
        await db.SaveChangesAsync(ct);
        log.LogInformation("Local people file applied to {Count} demo account(s)", applied);
    }

    private static User Id2(Dictionary<string, User> users, string key) => users[key];

    private static async Task SetAsync(HubDbContext db, string key, string value, CancellationToken ct)
    {
        var s = await db.Settings.FirstOrDefaultAsync(x => x.Key == key, ct);
        if (s is null) db.Settings.Add(new AppSetting { Key = key, Value = value });
        else if (string.IsNullOrEmpty(s.Value)) s.Value = value;
    }
}
