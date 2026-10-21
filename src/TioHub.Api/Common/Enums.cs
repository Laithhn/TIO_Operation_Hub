namespace TioHub.Api.Common;

// Business vocabularies fixed by the BRD (Sections 5–6). Configurable lists (component roles, zones, phases…) are lookup values instead.

/// <summary>Owner decision (19 Oct 2026): two roles only. The TIO Manager also administers users and settings.</summary>
public enum Role { Engineer, Manager }

/// <summary>Separate grants that no role implies (Section 3): export, technical detail, audit history.</summary>
[Flags]
public enum Grant { None = 0, Export = 1, TechnicalDetail = 2, Audit = 4 }

/// <summary>A31: rights held by configurable roles. Viewing needs no right.</summary>
[Flags]
public enum Right { None = 0, Edit = 1, Manage = 2, Archive = 4, Delete = 8, Export = 16, TechnicalDetail = 32, Audit = 64, Administer = 128 }

public enum ScopeKind { Client, Project, InternalTeam }

public enum ResponsibleParty { TIO, OtherItdDivision, CustomerIT, Vendor, Unknown }

/// <summary>Owner decision (UAT 19 Oct 2026): a client is an Opportunity or Active; Archived only through the archive action.</summary>
public enum ClientStatus { Opportunity, Active, Archived }

/// <summary>Where an environment runs (owner decision, UAT 19 Oct 2026).</summary>
public enum HostingType { Unknown, OnPrem, Cloud }

public enum ProjectStatus { Planned, Active, OnHold, Completed, Archived }

public enum EnvironmentType { Production, Staging, UAT, Test, DR, Other }

public enum Criticality { Critical, High, Normal, Unknown }

public enum Condition { Unknown, Healthy, Degraded, Unavailable }

public enum AssetType { VM, Physical, LogicalEndpoint }

public enum AssetLifecycle { Planned, Active, Retired, Unknown }

public enum CpuUnit { vCPU, PhysicalCore }

public enum MemoryUnit { GB, GiB }

public enum StorageUnit { GB, GiB, TB, TiB }

public enum EndpointType { Asset, Service, Group, External, Unresolved }

public enum AddressKind { Internal, External, NAT }

public enum NetProtocol { TCP, UDP, ICMP, Other }

public enum FlowDirection { OneWay, Bidirectional }

public enum WorkScope { Client, Internal }

public enum CaseType { Incident, Request, ProblemFollowUp, MaintenanceCoordination, Improvement, RiskFollowUp }

public enum Priority { Critical, High, Normal, Low }

public enum CaseStatus { New, Triaged, InProgress, PendingValidation, Closed, Cancelled }

public enum WaitingReason { Customer, InternalTeam, Vendor, PlannedChange }

public enum JiraInstanceKind { CustomerCloud, InternalOnPrem }

public enum CommitmentType { CustomerUpdate, Delivery, RenewalAction, Maintenance, RecordedContractualDeadline, Other }

public enum CommitmentStatus { Open, Completed, Cancelled }

public enum CommitmentEventType { Created, Revised, Completed, Cancelled, Reopened, Reviewed, OwnerChanged }

public enum HandoverStatus { PendingAcknowledgment, Completed, CompletedByException, Cancelled }

public enum ReviewScope { Record, Condition, Inventory, Dependencies, Contacts }

public enum DataQualityStatus { Open, Resolved }

public enum DocumentKind { Link, VaultReference }

// Contracts (CLI-04): recorded terms only.
public enum ContractType { SlaSupport, Implementation, Maintenance, Subscription, Other }
public enum ContractStatus { Draft, Active, Ended, Terminated }
public enum RenewalTerms { Unknown, FixedTerm, AutoRenew, RenewalByAgreement }
public enum SupportModel { Unknown, Remote, OnSite, Hybrid }
public enum SlaBasis { Unknown, CalendarHours, SupportHours }
