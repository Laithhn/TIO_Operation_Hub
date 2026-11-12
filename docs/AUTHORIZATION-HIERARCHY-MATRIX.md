# Four-level permission inventory (2.44.0)

> **Superseded by 2.48.0 (A81).** Kept as a record of earlier releases. Current model: [RIGHTS-MODEL-DESIGN.md](RIGHTS-MODEL-DESIGN.md); administrators: [RIGHTS-ADMIN-GUIDE.md](RIGHTS-ADMIN-GUIDE.md); developers: [RIGHTS-DEVELOPER-GUIDE.md](RIGHTS-DEVELOPER-GUIDE.md).

Generated from `Security/PermissionHierarchy.cs`. Keys are immutable. Every required key must be effective; grants never flow down from a parent.

| Type | Key | Name | Parent | Required access |
|---|---|---|---|---|
| Module | `module.dashboard:Access` | Dashboard | — | — |
| Module | `module.clients:Access` | Clients | — | — |
| Module | `module.products:Access` | Products | — | — |
| Module | `module.cases:Access` | Cases | — | — |
| Module | `module.commitments:Access` | Commitments | — | — |
| Module | `module.notes:Access` | Notes | — | — |
| Module | `module.escalations:Access` | Escalations | — | — |
| Module | `module.teams:Access` | Teams | — | — |
| Module | `module.reporting:Access` | Reporting Center | — | — |
| Module | `module.admin:Access` | Administration | — | — |
| Submodule | `area.ClientStructure:Access` | Client structure | `module.clients:Access` | `module.clients:Access` |
| Tab | `tab.ClientStructure.files:Access` | Attachments | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Tab | `tab.ClientStructure.history:Access` | History | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `ClientStructure:View` | View pages and records | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `ClientStructure:Create` | Create | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Action | `ClientStructure:Maintain` | Edit existing records | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Action | `ClientStructure:Coordinate` | Coordinate workflow and assignment | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Action | `ClientStructure:ArchiveRestore` | Archive and restore | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Action | `ClientStructure:Delete` | Permanently delete unused records | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Action | `ClientStructure:DetailsView` | View record details | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Action | `ClientStructure:HistoryView` | View record history | `tab.ClientStructure.history:Access` | `tab.ClientStructure.history:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View`, `ClientStructure:DetailsView` |
| Action | `ClientStructure:AttachmentsView` | View and download attachments | `tab.ClientStructure.files:Access` | `tab.ClientStructure.files:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View`, `ClientStructure:DetailsView` |
| Action | `ClientStructure:AttachmentsUpload` | Upload and describe attachments | `tab.ClientStructure.files:Access` | `tab.ClientStructure.files:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View`, `ClientStructure:DetailsView`, `ClientStructure:AttachmentsView` |
| Action | `ClientStructure:AttachmentsDeleteOwn` | Delete own attachments | `tab.ClientStructure.files:Access` | `tab.ClientStructure.files:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View`, `ClientStructure:DetailsView`, `ClientStructure:AttachmentsView` |
| Action | `ClientStructure:AttachmentsDelete` | Delete any attachment | `tab.ClientStructure.files:Access` | `tab.ClientStructure.files:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View`, `ClientStructure:DetailsView`, `ClientStructure:AttachmentsView` |
| Action | `ClientStructure:Export` | Export module data | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Submodule | `area.Projects:Access` | Projects | `module.clients:Access` | `module.clients:Access` |
| Tab | `tab.Projects.details:Access` | Record details | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access` |
| Tab | `tab.Projects.files:Access` | Attachments | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access` |
| Tab | `tab.Projects.history:Access` | History | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access` |
| Action | `Projects:View` | View pages and records | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access` |
| Action | `Projects:Create` | Create | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Action | `Projects:Maintain` | Edit existing records | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Action | `Projects:Coordinate` | Coordinate workflow and assignment | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Action | `Projects:ArchiveRestore` | Archive and restore | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Action | `Projects:Delete` | Permanently delete unused records | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Action | `Projects:DetailsView` | View record details | `tab.Projects.details:Access` | `tab.Projects.details:Access`, `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Action | `Projects:HistoryView` | View record history | `tab.Projects.history:Access` | `tab.Projects.history:Access`, `area.Projects:Access`, `module.clients:Access`, `Projects:View`, `Projects:DetailsView` |
| Action | `Projects:AttachmentsView` | View and download attachments | `tab.Projects.files:Access` | `tab.Projects.files:Access`, `area.Projects:Access`, `module.clients:Access`, `Projects:View`, `Projects:DetailsView` |
| Action | `Projects:AttachmentsUpload` | Upload and describe attachments | `tab.Projects.files:Access` | `tab.Projects.files:Access`, `area.Projects:Access`, `module.clients:Access`, `Projects:View`, `Projects:DetailsView`, `Projects:AttachmentsView` |
| Action | `Projects:AttachmentsDeleteOwn` | Delete own attachments | `tab.Projects.files:Access` | `tab.Projects.files:Access`, `area.Projects:Access`, `module.clients:Access`, `Projects:View`, `Projects:DetailsView`, `Projects:AttachmentsView` |
| Action | `Projects:AttachmentsDelete` | Delete any attachment | `tab.Projects.files:Access` | `tab.Projects.files:Access`, `area.Projects:Access`, `module.clients:Access`, `Projects:View`, `Projects:DetailsView`, `Projects:AttachmentsView` |
| Action | `Projects:Export` | Export module data | `area.Projects:Access` | `area.Projects:Access`, `module.clients:Access`, `Projects:View` |
| Submodule | `area.Contracts:Access` | Contracts | `module.clients:Access` | `module.clients:Access` |
| Tab | `tab.Contracts.details:Access` | Record details | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access` |
| Tab | `tab.Contracts.files:Access` | Attachments | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access` |
| Tab | `tab.Contracts.history:Access` | History | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access` |
| Action | `Contracts:View` | View pages and records | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access` |
| Action | `Contracts:Create` | Create | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Action | `Contracts:Maintain` | Edit existing records | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Action | `Contracts:Coordinate` | Coordinate workflow and assignment | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Action | `Contracts:ArchiveRestore` | Archive and restore | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Action | `Contracts:Delete` | Permanently delete unused records | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Action | `Contracts:DetailsView` | View record details | `tab.Contracts.details:Access` | `tab.Contracts.details:Access`, `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Action | `Contracts:HistoryView` | View record history | `tab.Contracts.history:Access` | `tab.Contracts.history:Access`, `area.Contracts:Access`, `module.clients:Access`, `Contracts:View`, `Contracts:DetailsView` |
| Action | `Contracts:AttachmentsView` | View and download attachments | `tab.Contracts.files:Access` | `tab.Contracts.files:Access`, `area.Contracts:Access`, `module.clients:Access`, `Contracts:View`, `Contracts:DetailsView` |
| Action | `Contracts:AttachmentsUpload` | Upload and describe attachments | `tab.Contracts.files:Access` | `tab.Contracts.files:Access`, `area.Contracts:Access`, `module.clients:Access`, `Contracts:View`, `Contracts:DetailsView`, `Contracts:AttachmentsView` |
| Action | `Contracts:AttachmentsDeleteOwn` | Delete own attachments | `tab.Contracts.files:Access` | `tab.Contracts.files:Access`, `area.Contracts:Access`, `module.clients:Access`, `Contracts:View`, `Contracts:DetailsView`, `Contracts:AttachmentsView` |
| Action | `Contracts:AttachmentsDelete` | Delete any attachment | `tab.Contracts.files:Access` | `tab.Contracts.files:Access`, `area.Contracts:Access`, `module.clients:Access`, `Contracts:View`, `Contracts:DetailsView`, `Contracts:AttachmentsView` |
| Action | `Contracts:Export` | Export module data | `area.Contracts:Access` | `area.Contracts:Access`, `module.clients:Access`, `Contracts:View` |
| Submodule | `area.Environments:Access` | Environments | `module.clients:Access` | `module.clients:Access` |
| Tab | `tab.Environments.files:Access` | Attachments | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Tab | `tab.Environments.history:Access` | History | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `Environments:View` | View pages and records | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `Environments:Create` | Create | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Action | `Environments:Maintain` | Edit existing records | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Action | `Environments:Coordinate` | Coordinate workflow and assignment | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Action | `Environments:ArchiveRestore` | Archive and restore | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Action | `Environments:Delete` | Permanently delete unused records | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Action | `Environments:DetailsView` | View record details | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Action | `Environments:HistoryView` | View record history | `tab.Environments.history:Access` | `tab.Environments.history:Access`, `area.Environments:Access`, `module.clients:Access`, `Environments:View`, `Environments:DetailsView` |
| Action | `Environments:AttachmentsView` | View and download attachments | `tab.Environments.files:Access` | `tab.Environments.files:Access`, `area.Environments:Access`, `module.clients:Access`, `Environments:View`, `Environments:DetailsView` |
| Action | `Environments:AttachmentsUpload` | Upload and describe attachments | `tab.Environments.files:Access` | `tab.Environments.files:Access`, `area.Environments:Access`, `module.clients:Access`, `Environments:View`, `Environments:DetailsView`, `Environments:AttachmentsView` |
| Action | `Environments:AttachmentsDeleteOwn` | Delete own attachments | `tab.Environments.files:Access` | `tab.Environments.files:Access`, `area.Environments:Access`, `module.clients:Access`, `Environments:View`, `Environments:DetailsView`, `Environments:AttachmentsView` |
| Action | `Environments:AttachmentsDelete` | Delete any attachment | `tab.Environments.files:Access` | `tab.Environments.files:Access`, `area.Environments:Access`, `module.clients:Access`, `Environments:View`, `Environments:DetailsView`, `Environments:AttachmentsView` |
| Action | `Environments:Export` | Export module data | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Submodule | `area.Servers:Access` | Servers | `module.clients:Access` | `module.clients:Access` |
| Tab | `tab.Servers.details:Access` | Record details | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access` |
| Tab | `tab.Servers.files:Access` | Attachments | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access` |
| Tab | `tab.Servers.history:Access` | History | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access` |
| Action | `Servers:View` | View pages and records | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access` |
| Action | `Servers:Create` | Create | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Action | `Servers:Maintain` | Edit existing records | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Action | `Servers:Coordinate` | Coordinate workflow and assignment | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Action | `Servers:ArchiveRestore` | Archive and restore | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Action | `Servers:Delete` | Permanently delete unused records | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Action | `Servers:DetailsView` | View record details | `tab.Servers.details:Access` | `tab.Servers.details:Access`, `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Action | `Servers:HistoryView` | View record history | `tab.Servers.history:Access` | `tab.Servers.history:Access`, `area.Servers:Access`, `module.clients:Access`, `Servers:View`, `Servers:DetailsView` |
| Action | `Servers:AttachmentsView` | View and download attachments | `tab.Servers.files:Access` | `tab.Servers.files:Access`, `area.Servers:Access`, `module.clients:Access`, `Servers:View`, `Servers:DetailsView` |
| Action | `Servers:AttachmentsUpload` | Upload and describe attachments | `tab.Servers.files:Access` | `tab.Servers.files:Access`, `area.Servers:Access`, `module.clients:Access`, `Servers:View`, `Servers:DetailsView`, `Servers:AttachmentsView` |
| Action | `Servers:AttachmentsDeleteOwn` | Delete own attachments | `tab.Servers.files:Access` | `tab.Servers.files:Access`, `area.Servers:Access`, `module.clients:Access`, `Servers:View`, `Servers:DetailsView`, `Servers:AttachmentsView` |
| Action | `Servers:AttachmentsDelete` | Delete any attachment | `tab.Servers.files:Access` | `tab.Servers.files:Access`, `area.Servers:Access`, `module.clients:Access`, `Servers:View`, `Servers:DetailsView`, `Servers:AttachmentsView` |
| Action | `Servers:Export` | Export module data | `area.Servers:Access` | `area.Servers:Access`, `module.clients:Access`, `Servers:View` |
| Submodule | `area.Installations:Access` | Installations | `module.clients:Access` | `module.clients:Access` |
| Tab | `tab.Installations.details:Access` | Record details | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access` |
| Tab | `tab.Installations.files:Access` | Attachments | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access` |
| Tab | `tab.Installations.history:Access` | History | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access` |
| Action | `Installations:View` | View pages and records | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access` |
| Action | `Installations:Create` | Create | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Action | `Installations:Maintain` | Edit existing records | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Action | `Installations:Coordinate` | Coordinate workflow and assignment | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Action | `Installations:ArchiveRestore` | Archive and restore | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Action | `Installations:Delete` | Permanently delete unused records | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Action | `Installations:DetailsView` | View record details | `tab.Installations.details:Access` | `tab.Installations.details:Access`, `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Action | `Installations:HistoryView` | View record history | `tab.Installations.history:Access` | `tab.Installations.history:Access`, `area.Installations:Access`, `module.clients:Access`, `Installations:View`, `Installations:DetailsView` |
| Action | `Installations:AttachmentsView` | View and download attachments | `tab.Installations.files:Access` | `tab.Installations.files:Access`, `area.Installations:Access`, `module.clients:Access`, `Installations:View`, `Installations:DetailsView` |
| Action | `Installations:AttachmentsUpload` | Upload and describe attachments | `tab.Installations.files:Access` | `tab.Installations.files:Access`, `area.Installations:Access`, `module.clients:Access`, `Installations:View`, `Installations:DetailsView`, `Installations:AttachmentsView` |
| Action | `Installations:AttachmentsDeleteOwn` | Delete own attachments | `tab.Installations.files:Access` | `tab.Installations.files:Access`, `area.Installations:Access`, `module.clients:Access`, `Installations:View`, `Installations:DetailsView`, `Installations:AttachmentsView` |
| Action | `Installations:AttachmentsDelete` | Delete any attachment | `tab.Installations.files:Access` | `tab.Installations.files:Access`, `area.Installations:Access`, `module.clients:Access`, `Installations:View`, `Installations:DetailsView`, `Installations:AttachmentsView` |
| Action | `Installations:Export` | Export module data | `area.Installations:Access` | `area.Installations:Access`, `module.clients:Access`, `Installations:View` |
| Submodule | `area.Products:Access` | Products | `module.products:Access` | `module.products:Access` |
| Tab | `tab.Products.details:Access` | Record details | `area.Products:Access` | `area.Products:Access`, `module.products:Access` |
| Tab | `tab.Products.files:Access` | Attachments | `area.Products:Access` | `area.Products:Access`, `module.products:Access` |
| Tab | `tab.Products.history:Access` | History | `area.Products:Access` | `area.Products:Access`, `module.products:Access` |
| Action | `Products:View` | View pages and records | `area.Products:Access` | `area.Products:Access`, `module.products:Access` |
| Action | `Products:Create` | Create | `area.Products:Access` | `area.Products:Access`, `module.products:Access`, `Products:View` |
| Action | `Products:Maintain` | Edit existing records | `area.Products:Access` | `area.Products:Access`, `module.products:Access`, `Products:View` |
| Action | `Products:Coordinate` | Coordinate workflow and assignment | `area.Products:Access` | `area.Products:Access`, `module.products:Access`, `Products:View` |
| Action | `Products:ArchiveRestore` | Archive and restore | `area.Products:Access` | `area.Products:Access`, `module.products:Access`, `Products:View` |
| Action | `Products:Delete` | Permanently delete unused records | `area.Products:Access` | `area.Products:Access`, `module.products:Access`, `Products:View` |
| Action | `Products:DetailsView` | View record details | `tab.Products.details:Access` | `tab.Products.details:Access`, `area.Products:Access`, `module.products:Access`, `Products:View` |
| Action | `Products:HistoryView` | View record history | `tab.Products.history:Access` | `tab.Products.history:Access`, `area.Products:Access`, `module.products:Access`, `Products:View`, `Products:DetailsView` |
| Action | `Products:AttachmentsView` | View and download attachments | `tab.Products.files:Access` | `tab.Products.files:Access`, `area.Products:Access`, `module.products:Access`, `Products:View`, `Products:DetailsView` |
| Action | `Products:AttachmentsUpload` | Upload and describe attachments | `tab.Products.files:Access` | `tab.Products.files:Access`, `area.Products:Access`, `module.products:Access`, `Products:View`, `Products:DetailsView`, `Products:AttachmentsView` |
| Action | `Products:AttachmentsDeleteOwn` | Delete own attachments | `tab.Products.files:Access` | `tab.Products.files:Access`, `area.Products:Access`, `module.products:Access`, `Products:View`, `Products:DetailsView`, `Products:AttachmentsView` |
| Action | `Products:AttachmentsDelete` | Delete any attachment | `tab.Products.files:Access` | `tab.Products.files:Access`, `area.Products:Access`, `module.products:Access`, `Products:View`, `Products:DetailsView`, `Products:AttachmentsView` |
| Action | `Products:Export` | Export module data | `area.Products:Access` | `area.Products:Access`, `module.products:Access`, `Products:View` |
| Submodule | `area.Cases:Access` | Cases | `module.cases:Access` | `module.cases:Access` |
| Tab | `tab.Cases.files:Access` | Attachments | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Tab | `tab.Cases.history:Access` | History | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `Cases:View` | View pages and records | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `Cases:Create` | Create | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Action | `Cases:Maintain` | Edit existing records | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Action | `Cases:Coordinate` | Coordinate workflow and assignment | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Action | `Cases:ArchiveRestore` | Archive and restore | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Action | `Cases:Delete` | Permanently delete unused records | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Action | `Cases:DetailsView` | View record details | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Action | `Cases:HistoryView` | View record history | `tab.Cases.history:Access` | `tab.Cases.history:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View`, `Cases:DetailsView` |
| Action | `Cases:AttachmentsView` | View and download attachments | `tab.Cases.files:Access` | `tab.Cases.files:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View`, `Cases:DetailsView` |
| Action | `Cases:AttachmentsUpload` | Upload and describe attachments | `tab.Cases.files:Access` | `tab.Cases.files:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View`, `Cases:DetailsView`, `Cases:AttachmentsView` |
| Action | `Cases:AttachmentsDeleteOwn` | Delete own attachments | `tab.Cases.files:Access` | `tab.Cases.files:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View`, `Cases:DetailsView`, `Cases:AttachmentsView` |
| Action | `Cases:AttachmentsDelete` | Delete any attachment | `tab.Cases.files:Access` | `tab.Cases.files:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View`, `Cases:DetailsView`, `Cases:AttachmentsView` |
| Action | `Cases:Export` | Export module data | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Submodule | `area.Commitments:Access` | Commitments | `module.commitments:Access` | `module.commitments:Access` |
| Tab | `tab.Commitments.details:Access` | Record details | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access` |
| Tab | `tab.Commitments.files:Access` | Attachments | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access` |
| Tab | `tab.Commitments.history:Access` | History | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access` |
| Action | `Commitments:View` | View pages and records | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access` |
| Action | `Commitments:Create` | Create | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Action | `Commitments:Maintain` | Edit existing records | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Action | `Commitments:Coordinate` | Coordinate workflow and assignment | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Action | `Commitments:ArchiveRestore` | Archive and restore | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Action | `Commitments:Delete` | Permanently delete unused records | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Action | `Commitments:DetailsView` | View record details | `tab.Commitments.details:Access` | `tab.Commitments.details:Access`, `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Action | `Commitments:HistoryView` | View record history | `tab.Commitments.history:Access` | `tab.Commitments.history:Access`, `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View`, `Commitments:DetailsView` |
| Action | `Commitments:AttachmentsView` | View and download attachments | `tab.Commitments.files:Access` | `tab.Commitments.files:Access`, `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View`, `Commitments:DetailsView` |
| Action | `Commitments:AttachmentsUpload` | Upload and describe attachments | `tab.Commitments.files:Access` | `tab.Commitments.files:Access`, `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View`, `Commitments:DetailsView`, `Commitments:AttachmentsView` |
| Action | `Commitments:AttachmentsDeleteOwn` | Delete own attachments | `tab.Commitments.files:Access` | `tab.Commitments.files:Access`, `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View`, `Commitments:DetailsView`, `Commitments:AttachmentsView` |
| Action | `Commitments:AttachmentsDelete` | Delete any attachment | `tab.Commitments.files:Access` | `tab.Commitments.files:Access`, `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View`, `Commitments:DetailsView`, `Commitments:AttachmentsView` |
| Action | `Commitments:Export` | Export module data | `area.Commitments:Access` | `area.Commitments:Access`, `module.commitments:Access`, `Commitments:View` |
| Submodule | `area.Teams:Access` | Teams and handovers | `module.teams:Access` | `module.teams:Access` |
| Tab | `tab.Teams.details:Access` | Record details | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access` |
| Tab | `tab.Teams.files:Access` | Attachments | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access` |
| Tab | `tab.Teams.history:Access` | History | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access` |
| Action | `Teams:View` | View pages and records | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access` |
| Action | `Teams:Create` | Create | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Teams:Maintain` | Edit existing records | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Teams:Coordinate` | Coordinate workflow and assignment | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Teams:ArchiveRestore` | Archive and restore | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Teams:Delete` | Permanently delete unused records | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Teams:DetailsView` | View record details | `tab.Teams.details:Access` | `tab.Teams.details:Access`, `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Teams:HistoryView` | View record history | `tab.Teams.history:Access` | `tab.Teams.history:Access`, `area.Teams:Access`, `module.teams:Access`, `Teams:View`, `Teams:DetailsView` |
| Action | `Teams:AttachmentsView` | View and download attachments | `tab.Teams.files:Access` | `tab.Teams.files:Access`, `area.Teams:Access`, `module.teams:Access`, `Teams:View`, `Teams:DetailsView` |
| Action | `Teams:AttachmentsUpload` | Upload and describe attachments | `tab.Teams.files:Access` | `tab.Teams.files:Access`, `area.Teams:Access`, `module.teams:Access`, `Teams:View`, `Teams:DetailsView`, `Teams:AttachmentsView` |
| Action | `Teams:AttachmentsDeleteOwn` | Delete own attachments | `tab.Teams.files:Access` | `tab.Teams.files:Access`, `area.Teams:Access`, `module.teams:Access`, `Teams:View`, `Teams:DetailsView`, `Teams:AttachmentsView` |
| Action | `Teams:AttachmentsDelete` | Delete any attachment | `tab.Teams.files:Access` | `tab.Teams.files:Access`, `area.Teams:Access`, `module.teams:Access`, `Teams:View`, `Teams:DetailsView`, `Teams:AttachmentsView` |
| Action | `Teams:Export` | Export module data | `area.Teams:Access` | `area.Teams:Access`, `module.teams:Access`, `Teams:View` |
| Submodule | `area.OtherOperations:Access` | Other operations | `module.escalations:Access` | `module.escalations:Access` |
| Tab | `tab.OtherOperations.details:Access` | Record details | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access` |
| Tab | `tab.OtherOperations.files:Access` | Attachments | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access` |
| Tab | `tab.OtherOperations.history:Access` | History | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access` |
| Action | `OtherOperations:View` | View pages and records | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access` |
| Action | `OtherOperations:Create` | Create | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Action | `OtherOperations:Maintain` | Edit existing records | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Action | `OtherOperations:Coordinate` | Coordinate workflow and assignment | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Action | `OtherOperations:ArchiveRestore` | Archive and restore | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Action | `OtherOperations:Delete` | Permanently delete unused records | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Action | `OtherOperations:DetailsView` | View record details | `tab.OtherOperations.details:Access` | `tab.OtherOperations.details:Access`, `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Action | `OtherOperations:HistoryView` | View record history | `tab.OtherOperations.history:Access` | `tab.OtherOperations.history:Access`, `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View`, `OtherOperations:DetailsView` |
| Action | `OtherOperations:AttachmentsView` | View and download attachments | `tab.OtherOperations.files:Access` | `tab.OtherOperations.files:Access`, `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View`, `OtherOperations:DetailsView` |
| Action | `OtherOperations:AttachmentsUpload` | Upload and describe attachments | `tab.OtherOperations.files:Access` | `tab.OtherOperations.files:Access`, `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View`, `OtherOperations:DetailsView`, `OtherOperations:AttachmentsView` |
| Action | `OtherOperations:AttachmentsDeleteOwn` | Delete own attachments | `tab.OtherOperations.files:Access` | `tab.OtherOperations.files:Access`, `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View`, `OtherOperations:DetailsView`, `OtherOperations:AttachmentsView` |
| Action | `OtherOperations:AttachmentsDelete` | Delete any attachment | `tab.OtherOperations.files:Access` | `tab.OtherOperations.files:Access`, `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View`, `OtherOperations:DetailsView`, `OtherOperations:AttachmentsView` |
| Action | `OtherOperations:Export` | Export module data | `area.OtherOperations:Access` | `area.OtherOperations:Access`, `module.escalations:Access`, `OtherOperations:View` |
| Submodule | `area.Dashboard:Access` | Operations dashboard | `module.dashboard:Access` | `module.dashboard:Access` |
| Action | `Dashboard:View` | View pages and records | `area.Dashboard:Access` | `area.Dashboard:Access`, `module.dashboard:Access`, `ClientStructure:View`, `Projects:View`, `Contracts:View`, `Environments:View`, `Servers:View`, `Installations:View`, `Products:View`, `Cases:View`, `Commitments:View`, `Teams:View`, `OtherOperations:View` |
| Submodule | `area.Reporting:Access` | Reporting center | `module.reporting:Access` | `module.reporting:Access` |
| Action | `Reporting:View` | View pages and records | `area.Reporting:Access` | `area.Reporting:Access`, `module.reporting:Access` |
| Submodule | `area.PersonalNotes:Access` | Personal notes | `module.notes:Access` | `module.notes:Access` |
| Action | `PersonalNotes:View` | View pages and records | `area.PersonalNotes:Access` | `area.PersonalNotes:Access`, `module.notes:Access` |
| Action | `PersonalNotes:Create` | Create | `area.PersonalNotes:Access` | `area.PersonalNotes:Access`, `module.notes:Access`, `PersonalNotes:View` |
| Action | `PersonalNotes:Maintain` | Edit existing records | `area.PersonalNotes:Access` | `area.PersonalNotes:Access`, `module.notes:Access`, `PersonalNotes:View` |
| Action | `PersonalNotes:Delete` | Permanently delete unused records | `area.PersonalNotes:Access` | `area.PersonalNotes:Access`, `module.notes:Access`, `PersonalNotes:View` |
| Action | `PersonalNotes:Download` | Download | `area.PersonalNotes:Access` | `area.PersonalNotes:Access`, `module.notes:Access`, `PersonalNotes:View` |
| Submodule | `area.Notifications:Access` | Notifications | `module.dashboard:Access` | `module.dashboard:Access` |
| Action | `Notifications:View` | View pages and records | `area.Notifications:Access` | `area.Notifications:Access`, `module.dashboard:Access` |
| Action | `Notifications:Maintain` | Edit existing records | `area.Notifications:Access` | `area.Notifications:Access`, `module.dashboard:Access`, `Notifications:View` |
| Action | `Notifications:Delete` | Permanently delete unused records | `area.Notifications:Access` | `area.Notifications:Access`, `module.dashboard:Access`, `Notifications:View` |
| Tab | `tab.ClientStructure.structure:Access` | Regions & environments | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.structure:View` | View | `tab.ClientStructure.structure:Access` | `tab.ClientStructure.structure:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View`, `Environments:View` |
| Tab | `tab.ClientStructure.organizations:Access` | Organizations | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.organizations:View` | View | `tab.ClientStructure.organizations:Access` | `tab.ClientStructure.organizations:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `ClientStructure:View` |
| Tab | `tab.ClientStructure.contracts:Access` | Contracts & SLAs | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.contracts:View` | View | `tab.ClientStructure.contracts:Access` | `tab.ClientStructure.contracts:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `Contracts:View` |
| Tab | `tab.ClientStructure.cases:Access` | Cases | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.cases:View` | View | `tab.ClientStructure.cases:Access` | `tab.ClientStructure.cases:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `Cases:View` |
| Tab | `tab.ClientStructure.commitments:Access` | Commitments | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.commitments:View` | View | `tab.ClientStructure.commitments:Access` | `tab.ClientStructure.commitments:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `Commitments:View` |
| Tab | `tab.ClientStructure.escalations:Access` | Escalations | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.escalations:View` | View | `tab.ClientStructure.escalations:Access` | `tab.ClientStructure.escalations:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `OtherOperations:View` |
| Tab | `tab.ClientStructure.infra:Access` | Infrastructure | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.infra:View` | View | `tab.ClientStructure.infra:Access` | `tab.ClientStructure.infra:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `Servers:View` |
| Tab | `tab.ClientStructure.projects:Access` | Projects | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.projects:View` | View | `tab.ClientStructure.projects:Access` | `tab.ClientStructure.projects:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `Projects:View` |
| Tab | `tab.ClientStructure.contacts:Access` | Contacts & responsibilities | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.contacts:View` | View | `tab.ClientStructure.contacts:Access` | `tab.ClientStructure.contacts:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `OtherOperations:View` |
| Tab | `tab.ClientStructure.notes:Access` | My notes | `area.ClientStructure:Access` | `area.ClientStructure:Access`, `module.clients:Access` |
| Action | `tab.ClientStructure.notes:View` | View | `tab.ClientStructure.notes:Access` | `tab.ClientStructure.notes:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `PersonalNotes:View` |
| Tab | `tab.Environments.apps:Access` | Applications | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `tab.Environments.apps:View` | View | `tab.Environments.apps:Access` | `tab.Environments.apps:Access`, `area.Environments:Access`, `module.clients:Access`, `Installations:View`, `Products:View`, `Servers:View` |
| Tab | `tab.Environments.assets:Access` | Servers & assets | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `tab.Environments.assets:View` | View | `tab.Environments.assets:Access` | `tab.Environments.assets:Access`, `area.Environments:Access`, `module.clients:Access`, `Servers:View` |
| Tab | `tab.Environments.work:Access` | Work | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `tab.Environments.work:View` | View | `tab.Environments.work:Access` | `tab.Environments.work:Access`, `area.Environments:Access`, `module.clients:Access`, `Cases:View`, `Commitments:View`, `OtherOperations:View` |
| Tab | `tab.Environments.network:Access` | Firewall rules | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `tab.Environments.network:View` | View | `tab.Environments.network:Access` | `tab.Environments.network:Access`, `area.Environments:Access`, `module.clients:Access`, `OtherOperations:View` |
| Tab | `tab.Environments.conditions:Access` | Condition history | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `tab.Environments.conditions:View` | View | `tab.Environments.conditions:Access` | `tab.Environments.conditions:Access`, `area.Environments:Access`, `module.clients:Access`, `Environments:View` |
| Tab | `tab.Environments.quality:Access` | Data quality | `area.Environments:Access` | `area.Environments:Access`, `module.clients:Access` |
| Action | `tab.Environments.quality:View` | View | `tab.Environments.quality:Access` | `tab.Environments.quality:Access`, `area.Environments:Access`, `module.clients:Access`, `ClientStructure:View`, `Projects:View`, `Contracts:View`, `Environments:View`, `Servers:View`, `Installations:View`, `Products:View`, `Cases:View`, `Commitments:View`, `Teams:View`, `OtherOperations:View` |
| Tab | `tab.Cases.timeline:Access` | Timeline | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `tab.Cases.timeline:View` | View | `tab.Cases.timeline:Access` | `tab.Cases.timeline:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:HistoryView` |
| Tab | `tab.Cases.affected:Access` | Affected records | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `tab.Cases.affected:View` | View | `tab.Cases.affected:Access` | `tab.Cases.affected:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:DetailsView` |
| Tab | `tab.Cases.jira:Access` | Jira references | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `tab.Cases.jira:View` | View | `tab.Cases.jira:Access` | `tab.Cases.jira:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Tab | `tab.Cases.impact:Access` | Documented impact | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `tab.Cases.impact:View` | View | `tab.Cases.impact:Access` | `tab.Cases.impact:Access`, `area.Cases:Access`, `module.cases:Access`, `Cases:View` |
| Tab | `tab.Cases.commitments:Access` | Commitments | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `tab.Cases.commitments:View` | View | `tab.Cases.commitments:Access` | `tab.Cases.commitments:Access`, `area.Cases:Access`, `module.cases:Access`, `Commitments:View` |
| Tab | `tab.Cases.escalations:Access` | Escalations | `area.Cases:Access` | `area.Cases:Access`, `module.cases:Access` |
| Action | `tab.Cases.escalations:View` | View | `tab.Cases.escalations:Access` | `tab.Cases.escalations:Access`, `area.Cases:Access`, `module.cases:Access`, `OtherOperations:View` |
| Action | `tab.ClientStructure.structure:Create` | Create | `tab.ClientStructure.structure:Access` | `tab.ClientStructure.structure:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.structure:View`, `ClientStructure:Create` |
| Action | `tab.ClientStructure.structure:Maintain` | Edit | `tab.ClientStructure.structure:Access` | `tab.ClientStructure.structure:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.structure:View`, `ClientStructure:Maintain` |
| Action | `tab.ClientStructure.structure:ArchiveRestore` | ArchiveRestore | `tab.ClientStructure.structure:Access` | `tab.ClientStructure.structure:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.structure:View`, `ClientStructure:ArchiveRestore` |
| Action | `tab.ClientStructure.structure:Delete` | Delete | `tab.ClientStructure.structure:Access` | `tab.ClientStructure.structure:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.structure:View`, `ClientStructure:Delete` |
| Action | `tab.ClientStructure.organizations:Create` | Create | `tab.ClientStructure.organizations:Access` | `tab.ClientStructure.organizations:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.organizations:View`, `ClientStructure:Create` |
| Action | `tab.ClientStructure.organizations:Maintain` | Edit | `tab.ClientStructure.organizations:Access` | `tab.ClientStructure.organizations:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.organizations:View`, `ClientStructure:Maintain` |
| Action | `tab.ClientStructure.organizations:Delete` | Delete | `tab.ClientStructure.organizations:Access` | `tab.ClientStructure.organizations:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.organizations:View`, `ClientStructure:Delete` |
| Action | `tab.ClientStructure.contacts:Create` | Create | `tab.ClientStructure.contacts:Access` | `tab.ClientStructure.contacts:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.contacts:View`, `OtherOperations:Create` |
| Action | `tab.ClientStructure.contacts:Maintain` | Edit | `tab.ClientStructure.contacts:Access` | `tab.ClientStructure.contacts:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.contacts:View`, `OtherOperations:Maintain` |
| Action | `tab.ClientStructure.contacts:ArchiveRestore` | ArchiveRestore | `tab.ClientStructure.contacts:Access` | `tab.ClientStructure.contacts:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.contacts:View`, `OtherOperations:ArchiveRestore` |
| Action | `tab.ClientStructure.contacts:Delete` | Delete | `tab.ClientStructure.contacts:Access` | `tab.ClientStructure.contacts:Access`, `area.ClientStructure:Access`, `module.clients:Access`, `tab.ClientStructure.contacts:View`, `OtherOperations:Delete` |
| Action | `tab.Cases.jira:Create` | Create | `tab.Cases.jira:Access` | `tab.Cases.jira:Access`, `area.Cases:Access`, `module.cases:Access`, `tab.Cases.jira:View`, `Cases:Maintain` |
| Action | `tab.Cases.jira:Delete` | Delete | `tab.Cases.jira:Access` | `tab.Cases.jira:Access`, `area.Cases:Access`, `module.cases:Access`, `tab.Cases.jira:View`, `Cases:Maintain` |
| Action | `tab.Environments.conditions:Create` | Create | `tab.Environments.conditions:Access` | `tab.Environments.conditions:Access`, `area.Environments:Access`, `module.clients:Access`, `tab.Environments.conditions:View`, `Environments:Maintain` |
| Submodule | `area.ClientMap:Access` | Client map | `module.dashboard:Access` | `module.dashboard:Access` |
| Action | `ClientMap:View` | View | `area.ClientMap:Access` | `area.ClientMap:Access`, `module.dashboard:Access`, `Dashboard:View` |
| Submodule | `area.ActionList:Access` | Action list | `module.dashboard:Access` | `module.dashboard:Access` |
| Action | `ActionList:View` | View | `area.ActionList:Access` | `area.ActionList:Access`, `module.dashboard:Access`, `Dashboard:View` |
| Submodule | `area.DataQuality:Access` | Data quality | `module.dashboard:Access` | `module.dashboard:Access` |
| Action | `DataQuality:View` | View | `area.DataQuality:Access` | `area.DataQuality:Access`, `module.dashboard:Access`, `Dashboard:View` |
| Action | `DataQuality:Maintain` | Edit | `area.DataQuality:Access` | `area.DataQuality:Access`, `module.dashboard:Access`, `DataQuality:View` |
| Submodule | `area.Handovers:Access` | Handovers | `module.teams:Access` | `module.teams:Access` |
| Action | `Handovers:View` | View | `area.Handovers:Access` | `area.Handovers:Access`, `module.teams:Access`, `Teams:View` |
| Action | `Handovers:Create` | Create | `area.Handovers:Access` | `area.Handovers:Access`, `module.teams:Access`, `Handovers:View` |
| Action | `Handovers:Maintain` | Edit | `area.Handovers:Access` | `area.Handovers:Access`, `module.teams:Access`, `Handovers:View` |
| Submodule | `area.Reassignment:Access` | Reassignment queue | `module.teams:Access` | `module.teams:Access` |
| Action | `Reassignment:View` | View | `area.Reassignment:Access` | `area.Reassignment:Access`, `module.teams:Access`, `Teams:View` |
| Submodule | `area.ReportOverview:Access` | Overview | `module.reporting:Access` | `module.reporting:Access` |
| Action | `ReportOverview:View` | View | `area.ReportOverview:Access` | `area.ReportOverview:Access`, `module.reporting:Access`, `Reporting:View` |
| Submodule | `area.ReportLibrary:Access` | Report library | `module.reporting:Access` | `module.reporting:Access` |
| Action | `ReportLibrary:View` | View | `area.ReportLibrary:Access` | `area.ReportLibrary:Access`, `module.reporting:Access`, `Reporting:View` |
| Action | `ReportLibrary:Create` | Create | `area.ReportLibrary:Access` | `area.ReportLibrary:Access`, `module.reporting:Access`, `ReportLibrary:View` |
| Action | `ReportLibrary:Delete` | Delete | `area.ReportLibrary:Access` | `area.ReportLibrary:Access`, `module.reporting:Access`, `ReportLibrary:View` |
| Action | `ReportLibrary:Export` | Export | `area.ReportLibrary:Access` | `area.ReportLibrary:Access`, `module.reporting:Access`, `ReportLibrary:View` |
| Submodule | `area.ReportBuilder:Access` | Cases report builder | `module.reporting:Access` | `module.reporting:Access` |
| Action | `ReportBuilder:View` | View | `area.ReportBuilder:Access` | `area.ReportBuilder:Access`, `module.reporting:Access`, `Reporting:View` |
| Action | `ReportBuilder:Export` | Export | `area.ReportBuilder:Access` | `area.ReportBuilder:Access`, `module.reporting:Access`, `ReportBuilder:View` |
| Submodule | `area.SavedReports:Access` | My reports | `module.reporting:Access` | `module.reporting:Access` |
| Action | `SavedReports:View` | View | `area.SavedReports:Access` | `area.SavedReports:Access`, `module.reporting:Access`, `Reporting:View` |
| Action | `SavedReports:Create` | Create | `area.SavedReports:Access` | `area.SavedReports:Access`, `module.reporting:Access`, `SavedReports:View` |
| Action | `SavedReports:Maintain` | Edit | `area.SavedReports:Access` | `area.SavedReports:Access`, `module.reporting:Access`, `SavedReports:View` |
| Action | `SavedReports:Delete` | Delete | `area.SavedReports:Access` | `area.SavedReports:Access`, `module.reporting:Access`, `SavedReports:View` |
| Submodule | `area.ReportSchedules:Access` | Scheduled reports | `module.reporting:Access` | `module.reporting:Access` |
| Action | `ReportSchedules:View` | View | `area.ReportSchedules:Access` | `area.ReportSchedules:Access`, `module.reporting:Access`, `Reporting:View` |
| Action | `ReportSchedules:Create` | Create | `area.ReportSchedules:Access` | `area.ReportSchedules:Access`, `module.reporting:Access`, `ReportSchedules:View` |
| Action | `ReportSchedules:Maintain` | Edit | `area.ReportSchedules:Access` | `area.ReportSchedules:Access`, `module.reporting:Access`, `ReportSchedules:View` |
| Action | `ReportSchedules:Delete` | Delete | `area.ReportSchedules:Access` | `area.ReportSchedules:Access`, `module.reporting:Access`, `ReportSchedules:View` |
| Submodule | `area.ReportHistory:Access` | Export history | `module.reporting:Access` | `module.reporting:Access` |
| Action | `ReportHistory:View` | View | `area.ReportHistory:Access` | `area.ReportHistory:Access`, `module.reporting:Access`, `Reporting:View` |
| Action | `ReportHistory:Create` | Create | `area.ReportHistory:Access` | `area.ReportHistory:Access`, `module.reporting:Access`, `ReportHistory:View` |
| Action | `ReportHistory:Maintain` | Edit | `area.ReportHistory:Access` | `area.ReportHistory:Access`, `module.reporting:Access`, `ReportHistory:View` |
| Action | `ReportHistory:Download` | Download | `area.ReportHistory:Access` | `area.ReportHistory:Access`, `module.reporting:Access`, `ReportHistory:View` |
| Submodule | `area.ReportTemplates:Access` | Templates | `module.reporting:Access` | `module.reporting:Access` |
| Action | `ReportTemplates:View` | View | `area.ReportTemplates:Access` | `area.ReportTemplates:Access`, `module.reporting:Access`, `Reporting:View` |
| Submodule | `area.AdminUsers:Access` | Users & access | `module.admin:Access` | `module.admin:Access` |
| Action | `AdminUsers:View` | View | `area.AdminUsers:Access` | `area.AdminUsers:Access`, `module.admin:Access` |
| Action | `AdminUsers:Create` | Create | `area.AdminUsers:Access` | `area.AdminUsers:Access`, `module.admin:Access`, `AdminUsers:View` |
| Action | `AdminUsers:Maintain` | Edit | `area.AdminUsers:Access` | `area.AdminUsers:Access`, `module.admin:Access`, `AdminUsers:View` |
| Action | `AdminUsers:Delete` | Delete | `area.AdminUsers:Access` | `area.AdminUsers:Access`, `module.admin:Access`, `AdminUsers:View` |
| Submodule | `area.AdminRoles:Access` | Roles and rights | `module.admin:Access` | `module.admin:Access` |
| Action | `AdminRoles:View` | View | `area.AdminRoles:Access` | `area.AdminRoles:Access`, `module.admin:Access` |
| Action | `AdminRoles:Create` | Create | `area.AdminRoles:Access` | `area.AdminRoles:Access`, `module.admin:Access`, `AdminRoles:View` |
| Action | `AdminRoles:Maintain` | Edit | `area.AdminRoles:Access` | `area.AdminRoles:Access`, `module.admin:Access`, `AdminRoles:View` |
| Action | `AdminRoles:Delete` | Delete | `area.AdminRoles:Access` | `area.AdminRoles:Access`, `module.admin:Access`, `AdminRoles:View` |
| Submodule | `area.AdminGroups:Access` | Group mappings | `module.admin:Access` | `module.admin:Access` |
| Action | `AdminGroups:View` | View | `area.AdminGroups:Access` | `area.AdminGroups:Access`, `module.admin:Access` |
| Action | `AdminGroups:Create` | Create | `area.AdminGroups:Access` | `area.AdminGroups:Access`, `module.admin:Access`, `AdminGroups:View` |
| Action | `AdminGroups:Maintain` | Edit | `area.AdminGroups:Access` | `area.AdminGroups:Access`, `module.admin:Access`, `AdminGroups:View` |
| Submodule | `area.AdminConfig:Access` | Configuration | `module.admin:Access` | `module.admin:Access` |
| Action | `AdminConfig:View` | View | `area.AdminConfig:Access` | `area.AdminConfig:Access`, `module.admin:Access` |
| Action | `AdminConfig:Create` | Create | `area.AdminConfig:Access` | `area.AdminConfig:Access`, `module.admin:Access`, `AdminConfig:View` |
| Action | `AdminConfig:Maintain` | Edit | `area.AdminConfig:Access` | `area.AdminConfig:Access`, `module.admin:Access`, `AdminConfig:View` |
| Action | `AdminConfig:Delete` | Delete | `area.AdminConfig:Access` | `area.AdminConfig:Access`, `module.admin:Access`, `AdminConfig:View` |
| Submodule | `area.AdminSettings:Access` | Settings | `module.admin:Access` | `module.admin:Access` |
| Action | `AdminSettings:View` | View | `area.AdminSettings:Access` | `area.AdminSettings:Access`, `module.admin:Access` |
| Action | `AdminSettings:Maintain` | Edit | `area.AdminSettings:Access` | `area.AdminSettings:Access`, `module.admin:Access`, `AdminSettings:View` |
| Submodule | `area.AdminAudit:Access` | Change history | `module.admin:Access` | `module.admin:Access` |
| Action | `AdminAudit:View` | View | `area.AdminAudit:Access` | `area.AdminAudit:Access`, `module.admin:Access` |
