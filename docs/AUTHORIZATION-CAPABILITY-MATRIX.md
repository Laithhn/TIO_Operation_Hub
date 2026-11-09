# Registered capability coverage — 2.43.0

> **Superseded by 2.48.0 (A81).** Kept as a record of earlier releases. Current model: [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md); administrators: [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md); developers: [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).

The explicit manifest contains 134 stable leaf keys. The four existing cross-cutting rights (Administration, Audit, Technical detail and Export) remain additional controls. Each key below is persisted in iam.PermissionDefinition. Group nodes have no grant semantics.

Module categories cover their existing nested records. ClientStructure includes clients/regions/projects/organizations; Servers includes assets/components/volumes/storage; Products includes modules/versions/microservices; OtherOperations includes contacts/boundaries/firewall/escalations. Existing record scopes remain mandatory.

| Resource | Capability | Permission key | Frontend guard | Server enforcement |
|---|---|---|---|---|
| ClientStructure | View | ClientStructure:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| ClientStructure | DetailsView | ClientStructure:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| ClientStructure | Create | ClientStructure:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| ClientStructure | Maintain | ClientStructure:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| ClientStructure | Coordinate | ClientStructure:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| ClientStructure | ArchiveRestore | ClientStructure:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| ClientStructure | Delete | ClientStructure:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| ClientStructure | HistoryView | ClientStructure:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| ClientStructure | AttachmentsView | ClientStructure:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| ClientStructure | AttachmentsUpload | ClientStructure:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| ClientStructure | AttachmentsDeleteOwn | ClientStructure:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| ClientStructure | AttachmentsDelete | ClientStructure:AttachmentsDelete | File action | Attachment API + owning-record scope |
| ClientStructure | Export | ClientStructure:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Contracts | View | Contracts:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Contracts | DetailsView | Contracts:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Contracts | Create | Contracts:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Contracts | Maintain | Contracts:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Contracts | Coordinate | Contracts:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Contracts | ArchiveRestore | Contracts:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Contracts | Delete | Contracts:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Contracts | HistoryView | Contracts:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Contracts | AttachmentsView | Contracts:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Contracts | AttachmentsUpload | Contracts:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Contracts | AttachmentsDeleteOwn | Contracts:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Contracts | AttachmentsDelete | Contracts:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Contracts | Export | Contracts:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Environments | View | Environments:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Environments | DetailsView | Environments:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Environments | Create | Environments:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Environments | Maintain | Environments:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Environments | Coordinate | Environments:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Environments | ArchiveRestore | Environments:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Environments | Delete | Environments:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Environments | HistoryView | Environments:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Environments | AttachmentsView | Environments:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Environments | AttachmentsUpload | Environments:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Environments | AttachmentsDeleteOwn | Environments:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Environments | AttachmentsDelete | Environments:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Environments | Export | Environments:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Servers | View | Servers:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Servers | DetailsView | Servers:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Servers | Create | Servers:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Servers | Maintain | Servers:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Servers | Coordinate | Servers:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Servers | ArchiveRestore | Servers:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Servers | Delete | Servers:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Servers | HistoryView | Servers:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Servers | AttachmentsView | Servers:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Servers | AttachmentsUpload | Servers:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Servers | AttachmentsDeleteOwn | Servers:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Servers | AttachmentsDelete | Servers:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Servers | Export | Servers:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Installations | View | Installations:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Installations | DetailsView | Installations:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Installations | Create | Installations:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Installations | Maintain | Installations:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Installations | Coordinate | Installations:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Installations | ArchiveRestore | Installations:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Installations | Delete | Installations:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Installations | HistoryView | Installations:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Installations | AttachmentsView | Installations:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Installations | AttachmentsUpload | Installations:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Installations | AttachmentsDeleteOwn | Installations:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Installations | AttachmentsDelete | Installations:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Installations | Export | Installations:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Products | View | Products:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Products | DetailsView | Products:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Products | Create | Products:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Products | Maintain | Products:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Products | Coordinate | Products:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Products | ArchiveRestore | Products:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Products | Delete | Products:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Products | HistoryView | Products:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Products | AttachmentsView | Products:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Products | AttachmentsUpload | Products:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Products | AttachmentsDeleteOwn | Products:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Products | AttachmentsDelete | Products:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Products | Export | Products:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Cases | View | Cases:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Cases | DetailsView | Cases:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Cases | Create | Cases:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Cases | Maintain | Cases:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Cases | Coordinate | Cases:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Cases | ArchiveRestore | Cases:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Cases | Delete | Cases:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Cases | HistoryView | Cases:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Cases | AttachmentsView | Cases:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Cases | AttachmentsUpload | Cases:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Cases | AttachmentsDeleteOwn | Cases:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Cases | AttachmentsDelete | Cases:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Cases | Export | Cases:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Commitments | View | Commitments:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Commitments | DetailsView | Commitments:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Commitments | Create | Commitments:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Commitments | Maintain | Commitments:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Commitments | Coordinate | Commitments:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Commitments | ArchiveRestore | Commitments:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Commitments | Delete | Commitments:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Commitments | HistoryView | Commitments:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Commitments | AttachmentsView | Commitments:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Commitments | AttachmentsUpload | Commitments:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Commitments | AttachmentsDeleteOwn | Commitments:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Commitments | AttachmentsDelete | Commitments:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Commitments | Export | Commitments:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Teams | View | Teams:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| Teams | DetailsView | Teams:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| Teams | Create | Teams:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Teams | Maintain | Teams:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Teams | Coordinate | Teams:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Teams | ArchiveRestore | Teams:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Teams | Delete | Teams:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| Teams | HistoryView | Teams:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| Teams | AttachmentsView | Teams:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| Teams | AttachmentsUpload | Teams:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| Teams | AttachmentsDeleteOwn | Teams:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| Teams | AttachmentsDelete | Teams:AttachmentsDelete | File action | Attachment API + owning-record scope |
| Teams | Export | Teams:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| OtherOperations | View | OtherOperations:View | Route and navigation; source option queries | CapabilityPermissionFilter; source/service checks |
| OtherOperations | DetailsView | OtherOperations:DetailsView | Direct detail route | Explicit record-root DetailsView policy |
| OtherOperations | Create | OtherOperations:Create | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| OtherOperations | Maintain | OtherOperations:Maintain | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| OtherOperations | Coordinate | OtherOperations:Coordinate | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| OtherOperations | ArchiveRestore | OtherOperations:ArchiveRestore | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| OtherOperations | Delete | OtherOperations:Delete | Existing owning-module action controls | UserContext.RequirePermission + existing operation/record guards |
| OtherOperations | HistoryView | OtherOperations:HistoryView | HistoryPanel; embedded events | Audit policy and embedded event projection |
| OtherOperations | AttachmentsView | OtherOperations:AttachmentsView | AttachmentsWorkspace; no denied file requests | Attachment API + owning-record resolution |
| OtherOperations | AttachmentsUpload | OtherOperations:AttachmentsUpload | Upload control | Attachment API + owning-record scope |
| OtherOperations | AttachmentsDeleteOwn | OtherOperations:AttachmentsDeleteOwn | Uploader file action | Attachment API + uploader identity + scope |
| OtherOperations | AttachmentsDelete | OtherOperations:AttachmentsDelete | File action | Attachment API + owning-record scope |
| OtherOperations | Export | OtherOperations:Export | List and reporting actions | ExportService/CasesReportService/worker/download |
| Dashboard | View | Dashboard:View | Route and navigation | Explicit API capability policy; existing scope/ownership rules |
| Reporting | View | Reporting:View | Route and navigation | Explicit API capability policy; existing scope/ownership rules |
| PersonalNotes | View | PersonalNotes:View | Route and navigation | Explicit API capability policy; existing scope/ownership rules |
| Notifications | View | Notifications:View | Route and navigation | Explicit API capability policy; existing scope/ownership rules |

Read policy uses an explicit endpoint-root inventory and denies unregistered GET/HEAD roots by default. Session/reference/picker paths have explicit separate policies. Reference data and cross-module search/notifications/report history are filtered by source grants. Composite dashboards need every source View; reports require their specific sources.

This matrix inventories implemented capabilities. It does not claim independent permissions for every individual field, decorative UI component, workflow transition or arbitrary future endpoint. Existing Maintain/Coordinate checks still cover those operations. Permission simulation, explicit per-user denies and a new tenant model remain outside this increment. Negative API/ownership/revocation and browser lifecycle coverage is recorded in AUTHORIZATION-2.43.md.
