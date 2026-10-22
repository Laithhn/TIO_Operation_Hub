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
using TioHub.Api.Modules.Escalations;
using TioHub.Api.Modules.Inventory;
using TioHub.Api.Modules.Firewall;
using TioHub.Api.Modules.Quality;
using TioHub.Api.Modules.Teams;
using TioHub.Api.Modules.Work;

namespace TioHub.Api.Data;

/// <summary>
/// FICTIONAL DEVELOPMENT DATA ONLY. Every organization, person, host and address below is invented for demonstration and testing
/// (codes start with DEMO-, hosts use example.com / example.net, addresses are documentation or private ranges). No credentials.
/// Allowed only in Development and Testing (Program.cs refuses otherwise). Shows both client structures:
///   DEMO-NTA  Northwind Transit Authority (fictional) — regional: R1 North, R2 Coast, plus one direct environment
///   DEMO-HCP  Harbour City Police (fictional) — no regions: Production and Staging directly under the client
/// </summary>
public static class DevelopmentData
{
    public static async Task SeedAsync(HubDbContext db, TimeProvider clock, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        if (await db.Clients.IgnoreQueryFilters().AnyAsync(c => c.Code == "DEMO-NTA", ct))
        {
            // Already seeded: add the contracts introduced later, once.
            if (!await db.Contracts.IgnoreQueryFilters().AnyAsync(ct)) await SeedContractsAsync(db, now, ct);
            return;
        }

        // Approved hosts for the fictional demo links only.
        await SetAsync(db, SettingKeys.ApprovedLinkHosts, "docs.example.com,*.example.net", ct);
        foreach (var j in await db.JiraInstances.ToListAsync(ct))
            if (string.IsNullOrEmpty(j.ApprovedHost)) j.ApprovedHost = j.Kind == JiraInstanceKind.CustomerCloud ? "customer-demo.example.net" : "jira.internal.example.com";

        var builtInRoles = await BuiltInRoles.EnsureAsync(db, ct);

        User U(string account, string name, string tz, Grant grants, bool allClients, bool allInternal, params Role[] roles)
        {
            var u = new User { AccountName = account, DisplayName = name, WorkingTimeZone = tz, Grants = grants, AllClients = allClients, AllInternal = allInternal, IsActive = true };
            foreach (var r in roles) u.Roles.Add(new UserRole { AppRoleId = builtInRoles[r] });
            db.Users.Add(u);
            return u;
        }
        var all = Grant.Export | Grant.TechnicalDetail | Grant.Audit;
        var manager = U("DEV\\manager", "Mara Okafor (demo manager)", "Asia/Riyadh", all, true, true, Role.Manager);
        var lead = U("DEV\\lead", "Leon Brandt (demo lead)", "Asia/Dubai", Grant.Export | Grant.TechnicalDetail, true, true, Role.Manager);
        var eng1 = U("DEV\\engineer", "Esra Demir (demo engineer)", "Asia/Riyadh", Grant.TechnicalDetail, false, false, Role.Engineer);
        var eng2 = U("DEV\\engineer2", "Kofi Mensah (demo engineer)", "Asia/Dubai", Grant.TechnicalDetail, false, false, Role.Engineer);
        var viewer = U("DEV\\viewer", "Vera Lund (demo stakeholder)", "Europe/Berlin", Grant.None, false, false, Role.Engineer);
        var admin = U("DEV\\admin", "Adam Reyes (demo administrator)", "UTC", Grant.Audit, false, false, Role.Manager);
        var former = U("DEV\\former", "Farid Haddad (demo, deactivated)", "Asia/Riyadh", Grant.None, false, false, Role.Engineer);
        await db.SaveChangesAsync(ct);

        var ops = new Team { Code = "OPS", Name = "TIO Operations", LeadUserId = lead.Id, ManagerUserId = manager.Id, Description = "Fictional demo team" };
        var app = new Team { Code = "APP", Name = "Application Support", LeadUserId = lead.Id, ManagerUserId = manager.Id, Description = "Fictional demo team" };
        db.Teams.AddRange(ops, app);
        await db.SaveChangesAsync(ct);
        db.TeamMembers.AddRange(
            new TeamMember { TeamId = ops.Id, UserId = lead.Id, TeamRole = "Team lead", Skills = "Coordination", ProductFamiliarity = "PSOP, ViTIS" },
            new TeamMember { TeamId = ops.Id, UserId = eng1.Id, TeamRole = "Engineer", Skills = "Windows Server, SQL", ProductFamiliarity = "PSOP" },
            new TeamMember { TeamId = ops.Id, UserId = eng2.Id, TeamRole = "Engineer", Skills = "Linux, networking", ProductFamiliarity = "ViTIS" },
            new TeamMember { TeamId = app.Id, UserId = former.Id, TeamRole = "Engineer", Skills = "Application support", ProductFamiliarity = "PSOP" });

        // Catalogue
        var psop = new Product { Code = "PSOP", Name = "PSOP (demo catalogue entry)", Aliases = "PSOP Suite" };
        var vitis = new Product { Code = "ViTIS", Name = "ViTIS (demo catalogue entry)" };
        db.Products.AddRange(psop, vitis);
        await db.SaveChangesAsync(ct);
        db.ProductModules.Add(new ProductModule { ProductId = psop.Id, Code = "CORE", Name = "Core" });
        ProductVersion V(Product p, string v) { var pv = new ProductVersion { ProductId = p.Id, Version = v, SortKey = Text.VersionKey(v) }; db.ProductVersions.Add(pv); return pv; }
        var psop48 = V(psop, "4.8.2"); var psop49 = V(psop, "4.9.0"); var psop410 = V(psop, "4.10.1");
        var vit21 = V(vitis, "2.1.0"); var vit22 = V(vitis, "2.2.3");
        await db.SaveChangesAsync(ct);

        // ---- Client with regions ----
        var nta = new Client { Code = "DEMO-NTA", Name = "Northwind Transit Authority (fictional)", Country = "Saudi Arabia", Status = ClientStatus.Active, OwnerUserId = manager.Id, LastReviewedAt = now.AddDays(-20) };
        var hcp = new Client { Code = "DEMO-HCP", Name = "Harbour City Police (fictional)", Country = "United Arab Emirates", Status = ClientStatus.Active, OwnerUserId = lead.Id, LastReviewedAt = now.AddDays(-120) };
        var onb = new Client { Code = "DEMO-ONB", Name = "Opportunity Example Co. (fictional)", Country = "Bahrain", Status = ClientStatus.Opportunity, OwnerUserId = lead.Id };
        db.Clients.AddRange(nta, hcp, onb);
        await db.SaveChangesAsync(ct);

        db.UserScopes.AddRange(
            new UserScope { UserId = eng1.Id, Kind = ScopeKind.Client, ClientId = nta.Id },
            new UserScope { UserId = eng1.Id, Kind = ScopeKind.InternalTeam, TeamId = ops.Id },
            new UserScope { UserId = eng2.Id, Kind = ScopeKind.Client, ClientId = hcp.Id },
            new UserScope { UserId = former.Id, Kind = ScopeKind.Client, ClientId = nta.Id });

        var r1 = new Region { ClientId = nta.Id, Code = "R1", Name = "R1 North", OwnerUserId = eng1.Id };
        var r2 = new Region { ClientId = nta.Id, Code = "R2", Name = "R2 Coast", OwnerUserId = lead.Id };
        db.Regions.AddRange(r1, r2);
        var ntaProject = new Project { ClientId = nta.Id, Code = "DEMO-NTA-OPS", Name = "NTA operations and support", OwnerUserId = manager.Id, Status = ProjectStatus.Active, ScopeSummary = "Operation and support of PSOP (fictional).", ServiceStart = new DateOnly(2026, 1, 1) };
        var hcpProject = new Project { ClientId = hcp.Id, Code = "DEMO-HCP-RO", Name = "HCP rollout", OwnerUserId = lead.Id, Status = ProjectStatus.Active };
        db.Projects.AddRange(ntaProject, hcpProject);
        await db.SaveChangesAsync(ct);
        db.ProjectProducts.Add(new ProjectProduct { ProjectId = ntaProject.Id, ProductId = psop.Id });
        db.ProjectProducts.Add(new ProjectProduct { ProjectId = hcpProject.Id, ProductId = vitis.Id });
        db.UserScopes.Add(new UserScope { UserId = viewer.Id, Kind = ScopeKind.Project, ProjectId = hcpProject.Id });

        db.Contacts.AddRange(
            new Contact { ClientId = nta.Id, Name = "Nadia Example", Role = "IT service manager", Organization = "NTA IT (fictional)", Email = "nadia@example.com", AuthorizedSupport = true, LastReviewedAt = now.AddDays(-30) },
            new Contact { ClientId = hcp.Id, Name = "Omar Example", Role = "Operations lead", Phone = "+971 4 000 0000", AuthorizedSupport = true, ProjectId = hcpProject.Id });

        ClientEnvironment Env(Client c, Region? r, string name, EnvironmentType t, Criticality crit, User? owner, User? backup, string? gap, Project? p = null)
        {
            var e = new ClientEnvironment
            {
                ClientId = c.Id, RegionId = r?.Id, ProjectId = p?.Id, Name = name, NormalizedName = Text.Norm(name), Type = t.ToString(), TypeCategory = t, Criticality = crit, Hosting = HostingType.OnPrem,
                OwnerUserId = owner?.Id, CoordinatorUserId = owner is null ? lead.Id : null, BackupOwnerUserId = backup?.Id, BackupGapReason = backup is null ? gap ?? "No second engineer trained yet" : null,
                InventoryReviewedAt = now.AddDays(-10)
            };
            db.Environments.Add(e);
            return e;
        }
        var r1Prod = Env(nta, r1, "Production", EnvironmentType.Production, Criticality.Critical, eng1, lead, null, ntaProject);
        var r1Stg = Env(nta, r1, "Staging", EnvironmentType.Staging, Criticality.Normal, eng1, null, null, ntaProject);
        var r2Prod = Env(nta, r2, "Production", EnvironmentType.Production, Criticality.High, former, null, "Backup owner left the team");
        var ntaTest = Env(nta, r1, "Shared Test", EnvironmentType.Test, Criticality.Unknown, null, null, null);
        var hcpProd = Env(hcp, null, "Production", EnvironmentType.Production, Criticality.Critical, eng2, lead, null, hcpProject);
        var hcpStg = Env(hcp, null, "Staging", EnvironmentType.Staging, Criticality.Normal, eng2, null, null, hcpProject);
        await db.SaveChangesAsync(ct);
        r2Prod.InventoryReviewedAt = now.AddDays(-45); // stale inventory

        void Report(ClientEnvironment e, Condition c, string reason, string evidence, DateTimeOffset at)
        {
            var rep = new ConditionReport { EnvironmentId = e.Id, ClientId = e.ClientId, Condition = c, Reason = reason, Evidence = evidence, ObservedAt = at, RecordedAt = at, RecordedById = e.OwnerUserId };
            db.ConditionReports.Add(rep);
            e.Condition = c; e.ConditionReason = reason; e.ConditionObservedAt = at;
        }
        Report(r1Prod, TioHub.Api.Common.Condition.Healthy, "Morning check by owner", "Checklist DEMO-CHK-001", now.AddDays(-1));
        Report(r2Prod, TioHub.Api.Common.Condition.Healthy, "Last manual check", "Checklist DEMO-CHK-000", now.AddDays(-12)); // stale → Needs verification
        Report(hcpProd, TioHub.Api.Common.Condition.Degraded, "Import queue slow", "Ticket note in customer Jira DEMO-12", now.AddHours(-6));

        // Installations: two named PSOP instances in R1 Production; same product elsewhere with different versions.
        Installation Inst(ClientEnvironment e, Product p, string name, ProductVersion? v, ProductModule? m = null)
        {
            var i = new Installation { EnvironmentId = e.Id, ClientId = e.ClientId, ProductId = p.Id, InstanceName = name, NormalizedInstanceName = Text.Norm(name), ProductVersionId = v?.Id, ModuleId = m?.Id, LastReviewedAt = v is null ? null : now.AddDays(-15) };
            db.Installations.Add(i);
            return i;
        }
        var psopMain = Inst(r1Prod, psop, "PSOP Main", psop410);
        var psopArchive = Inst(r1Prod, psop, "PSOP Archive", psop49);
        var psopStg = Inst(r1Stg, psop, "PSOP Main", psop410);
        var psopR2 = Inst(r2Prod, psop, "PSOP Main", null); // unknown version
        var vitProd = Inst(hcpProd, vitis, "ViTIS", vit22);
        var vitStg = Inst(hcpStg, vitis, "ViTIS", vit21);
        await db.SaveChangesAsync(ct);
        db.InstallationVersionChanges.AddRange(
            new InstallationVersionChange { InstallationId = psopMain.Id, ClientId = nta.Id, FromVersionId = psop48.Id, ToVersionId = psop410.Id, Reason = "Upgrade (demo)", Evidence = "Release note DEMO-RN-410", ChangedById = eng1.Id, ChangedAt = now.AddDays(-15) },
            new InstallationVersionChange { InstallationId = vitProd.Id, ClientId = hcp.Id, ToVersionId = vit22.Id, Reason = "Initial record", Evidence = "Handover document DEMO-HD-7", ChangedById = eng2.Id, ChangedAt = now.AddDays(-40) });

        // Assets: no fixed three-server template. One app server hosts two components; the web component runs on two web servers.
        Asset A(ClientEnvironment e, string name, AssetType t, string role, decimal? cpu, CpuUnit? cu, decimal? ram, MemoryUnit? ru, string? os, User? owner)
        {
            var a = new Asset
            {
                EnvironmentId = e.Id, ClientId = e.ClientId, Name = name, NormalizedName = Text.Norm(name), Type = t.ToString(), TypeCategory = t, Role = role, NetworkZone = "Internal", ProjectPhase = "Deployed",
                Lifecycle = AssetLifecycle.Active, OwnerUserId = owner?.Id, CoordinatorUserId = owner is null ? lead.Id : null, CpuQuantity = cpu, CpuUnit = cu, RamQuantity = ram, RamUnit = ru, OsFamily = os,
                VerifiedAt = now.AddDays(-10)
            };
            db.Assets.Add(a);
            return a;
        }
        var app01 = A(r1Prod, "nta-r1-app01", AssetType.VM, "Application server", 8, CpuUnit.vCPU, 32, MemoryUnit.GB, "Windows Server", eng1);
        var web01 = A(r1Prod, "nta-r1-web01", AssetType.VM, "Web server", 4, CpuUnit.vCPU, 16, MemoryUnit.GB, "Windows Server", eng1);
        var web02 = A(r1Prod, "nta-r1-web02", AssetType.VM, "Web server", 4, CpuUnit.vCPU, 16, MemoryUnit.GB, "Windows Server", eng1);
        var db01 = A(r1Prod, "nta-r1-db01", AssetType.Physical, "Database server", 24, CpuUnit.PhysicalCore, 256, MemoryUnit.GiB, "Windows Server", eng1);
        var lsn = A(r1Prod, "nta-r1-sql-listener", AssetType.LogicalEndpoint, "Listener", null, null, null, null, null, eng1);
        var r2app = A(r2Prod, "nta-r2-app01", AssetType.VM, "Application server", null, null, null, null, null, null); // unknown sizing
        var hcpApp = A(hcpProd, "hcp-prod-app01", AssetType.VM, "Application server", 8, CpuUnit.vCPU, 64, MemoryUnit.GB, "Linux", eng2);
        await db.SaveChangesAsync(ct);

        var san = new SharedStorage { ClientId = nta.Id, EnvironmentId = r1Prod.Id, Name = "NTA-R1-SAN (demo)", Capacity = 10, Unit = StorageUnit.TB };
        db.SharedStorages.Add(san);
        await db.SaveChangesAsync(ct);
        db.Volumes.AddRange(
            new Volume { AssetId = app01.Id, EnvironmentId = r1Prod.Id, ClientId = nta.Id, Label = "C:", Capacity = 100, Unit = StorageUnit.GB, Purpose = "OS" },
            new Volume { AssetId = app01.Id, EnvironmentId = r1Prod.Id, ClientId = nta.Id, Label = "E:", Capacity = 2, Unit = StorageUnit.TB, Purpose = "Media", SharedStorageId = san.Id },
            new Volume { AssetId = db01.Id, EnvironmentId = r1Prod.Id, ClientId = nta.Id, Label = "D:", Capacity = 4, Unit = StorageUnit.TB, Purpose = "Data", SharedStorageId = san.Id },
            new Volume { AssetId = r2app.Id, EnvironmentId = r2Prod.Id, ClientId = nta.Id, Label = "D:", Purpose = "Data" });

        Component C(Installation i, string name, string role, params Asset[] hosts)
        {
            var c = new Component { InstallationId = i.Id, EnvironmentId = i.EnvironmentId, ClientId = i.ClientId, Name = name, NormalizedName = Text.Norm(name), Role = role, OwnerUserId = eng1.Id };
            foreach (var h in hosts) c.Hosts.Add(new ComponentHost { AssetId = h.Id, ClientId = i.ClientId });
            db.Components.Add(c);
            return c;
        }
        var webComp = C(psopMain, "PSOP Web", "Web", web01, web02);
        var appComp = C(psopMain, "PSOP Application", "Application", app01);
        C(psopMain, "PSOP Database", "Database", db01, lsn);
        C(psopArchive, "Archive Application", "Application", app01);
        C(psopArchive, "Archive Import", "Import");
        var hcpComp = new Component { InstallationId = vitProd.Id, EnvironmentId = hcpProd.Id, ClientId = hcp.Id, Name = "ViTIS Workflow", NormalizedName = Text.Norm("ViTIS Workflow"), Role = "Workflow", OwnerUserId = eng2.Id };
        hcpComp.Hosts.Add(new ComponentHost { AssetId = hcpApp.Id, ClientId = hcp.Id });
        db.Components.Add(hcpComp);
        await db.SaveChangesAsync(ct);

        // Firewall rules (A35, fictional): who talks to whom, on which ports.
        FirewallRule FW(Asset src, Asset dst, string? ports, FirewallProtocol proto, FlowDirection dir, string purpose) => new()
        {
            ClientId = src.ClientId, EnvironmentId = src.EnvironmentId, SourceAssetId = src.Id, DestinationAssetId = dst.Id, Ports = ports, Protocol = proto, Direction = dir, Purpose = purpose
        };
        db.FirewallRules.AddRange(
            FW(web01, app01, "443, 8443", FirewallProtocol.TCP, FlowDirection.OneWay, "Web tier calls the application API"),
            FW(web02, app01, "443, 8443", FirewallProtocol.TCP, FlowDirection.OneWay, "Web tier calls the application API"),
            FW(app01, lsn, "1433", FirewallProtocol.TCP, FlowDirection.OneWay, "Application to SQL listener"),
            FW(lsn, db01, "1433, 5022", FirewallProtocol.TCP, FlowDirection.Bidirectional, "Listener and database replication"),
            FW(app01, r2app, "5000-5010", FirewallProtocol.UDP, FlowDirection.OneWay, "Import feed between regions (fictional)"));

        db.Boundaries.AddRange(
            new ResponsibilityBoundary { ClientId = nta.Id, Area = "Network", Party = ResponsibleParty.CustomerIT, Organization = "NTA IT (fictional)", CoordinatorUserId = eng1.Id },
            new ResponsibilityBoundary { ClientId = nta.Id, Area = "Application", Party = ResponsibleParty.TIO },
            new ResponsibilityBoundary { ClientId = hcp.Id, Area = "Backup", Party = ResponsibleParty.Unknown, CoordinatorUserId = eng2.Id, Notes = "To be confirmed with HCP IT" });
        await db.SaveChangesAsync(ct);

        // Cases in several states.
        var customerJira = await db.JiraInstances.FirstAsync(j => j.Kind == JiraInstanceKind.CustomerCloud, ct);
        var internalJira = await db.JiraInstances.FirstAsync(j => j.Kind == JiraInstanceKind.InternalOnPrem, ct);
        Case K(string title, CaseType type, Client? c, Team team, Priority p, User? owner, CaseStatus status, DateTimeOffset? due, string next, DateTimeOffset nextReview, DateTimeOffset created, params ClientEnvironment[] envs)
        {
            var k = new Case
            {
                Title = title, Type = type.ToString(), TypeCategory = type, Scope = c is null ? WorkScope.Internal : WorkScope.Client, ClientId = c?.Id, ResponsibleTeamId = team.Id, ImpactSummary = "Demo impact summary", Priority = p,
                OwnerUserId = owner?.Id, Status = status, DueAt = due, DueTimeZone = due is null ? null : "Asia/Riyadh", NextAction = next, NextReviewAt = nextReview, CycleStartedAt = created, LastReviewedAt = now.AddHours(-12)
            };
            foreach (var e in envs) k.Environments.Add(new CaseEnvironment { EnvironmentId = e.Id, ClientId = e.ClientId });
            db.Cases.Add(k);
            return k;
        }
        var k1 = K("Import service stopped on R1 Production", CaseType.Incident, nta, ops, Priority.Critical, eng1, CaseStatus.InProgress, now.AddDays(-1), "Restart import worker after vendor patch", now.AddDays(1), now.AddDays(-4), r1Prod);
        var k2 = K("Licence renewal follow-up", CaseType.Request, nta, ops, Priority.Normal, null, CaseStatus.New, null, "Triage and assign", now.AddHours(-3), now.AddDays(-1));
        var k3 = K("Slow import queue", CaseType.Incident, hcp, ops, Priority.High, eng2, CaseStatus.InProgress, now.AddDays(3), "Waiting for customer log export", now.AddDays(2), now.AddDays(-2), hcpProd);
        var k4 = K("Patch window coordination R2", CaseType.MaintenanceCoordination, nta, app, Priority.Normal, former, CaseStatus.Triaged, now.AddDays(10), "Agree window with customer", now.AddDays(4), now.AddDays(-6), r2Prod);
        var k5 = K("Internal monitoring dashboard cleanup", CaseType.Improvement, null, ops, Priority.Low, eng1, CaseStatus.Triaged, null, "Collect requirements", now.AddDays(5), now.AddDays(-10));
        var k6 = K("Unknown environment report", CaseType.Incident, nta, ops, Priority.Normal, eng1, CaseStatus.Triaged, null, "Identify affected environment", now.AddDays(1), now.AddDays(-5));
        k6.UnknownEnvironmentReason = "Customer could not say which region raised the alarm.";
        k6.LastReviewedAt = now.AddDays(-5); // stale under 2-day policy
        await db.SaveChangesAsync(ct);
        k1.Assets.Add(new CaseAsset { AssetId = app01.Id, ClientId = nta.Id });
        k3.WaitingReason = WaitingReason.Customer;
        k3.WaitingSince = now.AddHours(-20);
        k3.WaitingIntervals.Add(new CaseWaitingInterval { Reason = WaitingReason.Customer, StartedAt = now.AddHours(-20), StartedById = eng2.Id, Note = "Log export requested" });
        db.JiraReferences.AddRange(
            new JiraReference { CaseId = k1.Id, ClientId = nta.Id, JiraInstanceId = customerJira.Id, IssueKey = "NTA-101", Url = "https://customer-demo.example.net/browse/NTA-101" },
            new JiraReference { CaseId = k1.Id, ClientId = nta.Id, JiraInstanceId = internalJira.Id, IssueKey = "NTA-101", Url = "https://jira.internal.example.com/browse/NTA-101" },
            new JiraReference { CaseId = k3.Id, ClientId = hcp.Id, JiraInstanceId = customerJira.Id, IssueKey = "HCP-12", Url = "https://customer-demo.example.net/browse/HCP-12" });
        foreach (var k in new[] { k1, k2, k3, k4, k5, k6 })
            db.CaseEvents.Add(new CaseEvent { CaseId = k.Id, Type = CaseEventType.Created, ToValue = "New", At = k.CycleStartedAt, Note = "Demo data" });

        // Commitments across time zones: overdue, upcoming, revised, completed late.
        Commitment M(string desc, CommitmentType t, Client? c, Team? team, User owner, DateTimeOffset due, string tz, Case? k = null, Project? p = null)
        {
            var m = new Commitment
            {
                Scope = c is null ? WorkScope.Internal : WorkScope.Client, ClientId = c?.Id, ResponsibleTeamId = team?.Id, Description = desc, Type = t, OwnerUserId = owner.Id,
                OriginalDueAt = due, CurrentDueAt = due, TimeZone = tz, CaseId = k?.Id, ProjectId = p?.Id, NextReviewAt = now.AddDays(3), LastReviewedAt = now.AddDays(-1)
            };
            m.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Created, NewDueAt = due, At = now.AddDays(-7), ById = owner.Id });
            db.Commitments.Add(m);
            return m;
        }
        M("Send root-cause update to NTA", CommitmentType.CustomerUpdate, nta, null, eng1, now.AddHours(-5), "Asia/Riyadh", k1);
        M("Deliver import fix to HCP staging", CommitmentType.Delivery, hcp, null, eng2, now.AddDays(4), "Asia/Dubai", k3);
        M("Recorded contractual deadline: annual DR test report", CommitmentType.RecordedContractualDeadline, nta, null, manager, now.AddDays(20), "Asia/Riyadh", null, ntaProject);
        M("Internal: publish on-call rota", CommitmentType.Other, null, ops, lead, now.AddDays(2), "Europe/Berlin");
        var revised = M("Licence renewal action", CommitmentType.RenewalAction, nta, null, former, now.AddDays(6), "Asia/Riyadh");
        revised.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Revised, PreviousDueAt = now.AddDays(1), NewDueAt = now.AddDays(6), Reason = "Customer purchase order delayed", At = now.AddDays(-2), ById = lead.Id });
        revised.OriginalDueAt = now.AddDays(1);
        revised.RevisionCount = 1;
        var late = M("Weekly status report", CommitmentType.CustomerUpdate, hcp, null, eng2, now.AddDays(-3), "Asia/Dubai");
        late.Status = CommitmentStatus.Completed; late.CompletedAt = now.AddDays(-2); late.CompletionEvidence = "Email reference DEMO-MAIL-55"; late.DueAtCompletion = late.CurrentDueAt; late.CompletedLate = true;
        late.Events.Add(new CommitmentEvent { Type = CommitmentEventType.Completed, CompletedAt = late.CompletedAt, Evidence = late.CompletionEvidence, At = now.AddDays(-2), ById = eng2.Id });

        // A41: escalations through different channels (fictional people and references).
        Escalation E(string title, Client c, string channel, string? reference, Priority pr, int level, User owner, DateTimeOffset received, DateTimeOffset? due, string who, string org, Case? k = null)
        {
            var e = new Escalation
            {
                ClientId = c.Id, Title = title, Channel = channel, ChannelReference = reference, Priority = pr, Level = level, OwnerUserId = owner.Id, ReceivedAt = received,
                ResponseDueAt = received.AddHours(4), ResolutionDueAt = due, CounterpartName = who, CounterpartOrganization = org, CaseId = k?.Id, Direction = EscalationDirection.Received
            };
            e.Events.Add(new EscalationEvent { Type = EscalationEventType.Created, Status = EscalationStatus.Open, Channel = channel, Outgoing = false, Level = level, Note = title, At = received, ById = owner.Id });
            db.Escalations.Add(e);
            return e;
        }
        var e1 = E("Repeated plate-read outages at the R1 depot", nta, "FormalLetter", "NTA/IT/2026/118 (fictional)", Priority.Critical, 2, manager, now.AddDays(-4), now.AddDays(-1), "Director of Operations (fictional)", "Northwind Transit Authority", k1);
        e1.Status = EscalationStatus.InProgress; e1.AcknowledgedAt = now.AddDays(-4).AddHours(2);
        e1.Events.Add(new EscalationEvent { Type = EscalationEventType.Communication, Channel = "Email", Outgoing = true, Note = "Acknowledged; root-cause analysis under way.", At = e1.AcknowledgedAt.Value, ById = manager.Id });
        e1.Events.Add(new EscalationEvent { Type = EscalationEventType.LevelRaised, Level = 2, Note = "Second outage in a week.", At = now.AddDays(-2), ById = manager.Id });
        E("Report export slow for the duty desk", hcp, "Verbal", "Call with the duty desk", Priority.High, 1, eng2, now.AddHours(-6), now.AddDays(3), "Duty desk supervisor (fictional)", "Harbour City Police");
        var e3 = E("Import errors after the last release", hcp, "Jira", "HCP-12", Priority.Normal, 1, eng2, now.AddDays(-12), now.AddDays(-5), "Application owner (fictional)", "Harbour City Police", k3);
        e3.Status = EscalationStatus.Resolved; e3.AcknowledgedAt = now.AddDays(-12).AddHours(1); e3.ResolvedAt = now.AddDays(-6); e3.ResolutionSummary = "Hotfix deployed and import re-run (demo).";

        // Deactivated engineer keeps history; their work waits in the reassignment queue.
        former.IsActive = false;
        former.DeactivatedAt = now.AddDays(-1);
        former.DeactivationReason = "Left the team (demo)";

        db.Handovers.Add(new Handover
        {
            ClientId = hcp.Id, OutgoingOwnerId = eng2.Id, ReceivingOwnerId = eng1.Id, EffectiveAt = now.AddDays(2), Summary = "Cover HCP staging during leave (demo)", OutstandingActions = "Finish import fix verification",
            Items = [new HandoverItem { RecordType = RecordTypes.Environment, RecordId = hcpStg.Id, ClientId = hcp.Id, Label = hcpStg.Name, PreviousOwnerId = eng2.Id }]
        });
        await db.SaveChangesAsync(ct);

        await SeedContractsAsync(db, now, ct);

        // Back-date demo history (creation stamps are set to "now" on insert) so ages and freshness look realistic.
        foreach (var k in new[] { k1, k2, k3, k4, k5, k6 }) k.CreatedAt = k.CycleStartedAt;
        foreach (var m in db.ChangeTracker.Entries<Commitment>().Select(e => e.Entity)) m.CreatedAt = now.AddDays(-7);
        foreach (var e in new[] { r1Prod, r1Stg, r2Prod, ntaTest, hcpProd, hcpStg }) e.CreatedAt = now.AddDays(-60);
        nta.CreatedAt = hcp.CreatedAt = now.AddDays(-150);
        onb.CreatedAt = now.AddDays(-3);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SetAsync(HubDbContext db, string key, string value, CancellationToken ct)
    {
        var s = await db.Settings.FirstOrDefaultAsync(x => x.Key == key, ct);
        if (s is null) db.Settings.Add(new AppSetting { Key = key, Value = value });
        else if (string.IsNullOrEmpty(s.Value)) s.Value = value;
    }

    private static async Task SeedContractsAsync(HubDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        var nta = await db.Clients.IgnoreQueryFilters().FirstAsync(c => c.Code == "DEMO-NTA", ct);
        var hcp = await db.Clients.IgnoreQueryFilters().FirstAsync(c => c.Code == "DEMO-HCP", ct);
        var ntaProject = await db.Projects.IgnoreQueryFilters().FirstAsync(p => p.Code == "DEMO-NTA-OPS", ct);
        var hcpProject = await db.Projects.IgnoreQueryFilters().FirstAsync(p => p.Code == "DEMO-HCP-RO", ct);
        var psop = await db.Products.FirstAsync(p => p.Code == "PSOP", ct);
        var vitis = await db.Products.FirstAsync(p => p.Code == "ViTIS", ct);
        var manager = await db.Users.FirstAsync(u => u.AccountName == @"DEV\manager", ct);
        var lead = await db.Users.FirstAsync(u => u.AccountName == @"DEV\lead", ct);
        var prod = await db.Environments.IgnoreQueryFilters().Where(e => e.ClientId == nta.Id && e.Name == "Production" && e.Region != null).OrderBy(e => e.Region!.Code).ToListAsync(ct);
        var r1Prod = prod[0];
        var r2Prod = prod[1];

        // Contracts with recorded SLA terms (fictional): one renewal due, one without an end date, one draft.
        var today = DateOnly.FromDateTime(now.UtcDateTime);
        SlaTarget T(Priority p, int response, int resolution) => new() { Priority = p, ResponseMinutes = response, ResolutionMinutes = resolution, Basis = SlaBasis.SupportHours };
        db.Contracts.AddRange(
            new Contract
            {
                ClientId = nta.Id, ProjectId = ntaProject.Id, Title = "NTA support and maintenance agreement", ContractReference = "DEMO-SLA-2026-01", Type = nameof(ContractType.SlaSupport), TypeCategory = ContractType.SlaSupport, Status = ContractStatus.Active,
                OwnerUserId = manager.Id, StartDate = new DateOnly(2026, 1, 1), EndDate = today.AddDays(60), RenewalTerms = RenewalTerms.RenewalByAgreement, NoticeDays = 30,
                SupportModel = SupportModel.OnSite, SupportHours = "Sun–Thu 08:00–17:00", SupportTimeZone = "Asia/Riyadh", OnSiteEngineersRequired = 2,
                Coverage = "PSOP in both regions (fictional)", Obligations = "Monthly service report; quarterly patch review (fictional).", LastReviewedAt = now.AddDays(-10),
                Environments = [new ContractEnvironment { EnvironmentId = r1Prod.Id, ClientId = nta.Id }, new ContractEnvironment { EnvironmentId = r2Prod.Id, ClientId = nta.Id }],
                SlaTargets = [T(Priority.Critical, 30, 240), T(Priority.High, 60, 480), T(Priority.Normal, 240, 2880), T(Priority.Low, 480, 7200)]
            },
            new Contract
            {
                ClientId = hcp.Id, ProjectId = hcpProject.Id, Title = "HCP rollout support", Type = nameof(ContractType.SlaSupport), TypeCategory = ContractType.SlaSupport, Status = ContractStatus.Active, OwnerUserId = lead.Id,
                StartDate = new DateOnly(2026, 3, 1), SupportModel = SupportModel.Remote, LastReviewedAt = now.AddDays(-40),
                SlaTargets = [T(Priority.Critical, 60, 480)]
            },
            new Contract
            {
                ClientId = nta.Id, ProjectId = ntaProject.Id, Title = "NTA phase 2 implementation (draft)", Type = nameof(ContractType.Implementation), TypeCategory = ContractType.Implementation, Status = ContractStatus.Draft, OwnerUserId = lead.Id, LastReviewedAt = now.AddDays(-5)
            });
        await db.SaveChangesAsync(ct);
    }
}
