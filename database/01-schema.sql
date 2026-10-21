-- TIO Operations Hub schema (idempotent; generated from EF Core migrations). Run as DBA: sqlcmd -S <server> -d TioHub -E -b -i 01-schema.sql
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
GO
IF OBJECT_ID(N'[admin].[__EFMigrationsHistory]') IS NULL
BEGIN
    IF SCHEMA_ID(N'admin') IS NULL EXEC(N'CREATE SCHEMA [admin];');
    CREATE TABLE [admin].[__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'inventory') IS NULL EXEC(N'CREATE SCHEMA [inventory];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'audit') IS NULL EXEC(N'CREATE SCHEMA [audit];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'work') IS NULL EXEC(N'CREATE SCHEMA [work];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'clients') IS NULL EXEC(N'CREATE SCHEMA [clients];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'env') IS NULL EXEC(N'CREATE SCHEMA [env];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'quality') IS NULL EXEC(N'CREATE SCHEMA [quality];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'network') IS NULL EXEC(N'CREATE SCHEMA [network];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'iam') IS NULL EXEC(N'CREATE SCHEMA [iam];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'teams') IS NULL EXEC(N'CREATE SCHEMA [teams];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'catalogue') IS NULL EXEC(N'CREATE SCHEMA [catalogue];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    IF SCHEMA_ID(N'admin') IS NULL EXEC(N'CREATE SCHEMA [admin];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE SEQUENCE [work].[CaseNumbers] AS int START WITH 1001 INCREMENT BY 1 NO CYCLE;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE SEQUENCE [work].[CommitmentNumbers] AS int START WITH 1001 INCREMENT BY 1 NO CYCLE;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE SEQUENCE [teams].[HandoverNumbers] AS int START WITH 101 INCREMENT BY 1 NO CYCLE;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [audit].[AuditEntry] (
        [Id] bigint NOT NULL IDENTITY,
        [At] datetimeoffset(3) NOT NULL,
        [UserId] bigint NULL,
        [UserName] nvarchar(200) NULL,
        [Action] nvarchar(40) NOT NULL,
        [Category] nvarchar(20) NOT NULL,
        [EntityType] nvarchar(60) NOT NULL,
        [EntityId] bigint NULL,
        [EntityLabel] nvarchar(300) NULL,
        [ClientId] bigint NULL,
        [TeamId] bigint NULL,
        [Reason] nvarchar(1000) NULL,
        [Changes] nvarchar(max) NULL,
        [CorrelationId] nvarchar(100) NULL,
        CONSTRAINT [PK_AuditEntry] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [iam].[User] (
        [Id] bigint NOT NULL IDENTITY,
        [AccountName] nvarchar(200) NOT NULL,
        [DisplayName] nvarchar(150) NOT NULL,
        [Email] nvarchar(254) NULL,
        [WorkingTimeZone] nvarchar(64) NOT NULL,
        [IsActive] bit NOT NULL,
        [DeactivatedAt] datetimeoffset NULL,
        [DeactivationReason] nvarchar(1000) NULL,
        [LastSignInAt] datetimeoffset NULL,
        [MappedGroups] nvarchar(400) NULL,
        [AllClients] bit NOT NULL,
        [AllInternal] bit NOT NULL,
        [Grants] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_User] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_User_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_User_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [quality].[DataQualityItem] (
        [Id] bigint NOT NULL IDENTITY,
        [Rule] nvarchar(60) NOT NULL,
        [RecordType] nvarchar(40) NOT NULL,
        [RecordId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [EnvironmentId] bigint NULL,
        [TeamId] bigint NULL,
        [RecordLabel] nvarchar(300) NOT NULL,
        [Detail] nvarchar(1000) NOT NULL,
        [CoordinatorUserId] bigint NULL,
        [NextAction] nvarchar(1000) NULL,
        [NextReviewAt] datetimeoffset NULL,
        [Status] nvarchar(40) NOT NULL,
        [OpenedAt] datetimeoffset NOT NULL,
        [ResolvedAt] datetimeoffset NULL,
        [ResolutionEvidence] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_DataQualityItem] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DataQualityItem_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_DataQualityItem_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_DataQualityItem_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [quality].[DocumentReference] (
        [Id] bigint NOT NULL IDENTITY,
        [RecordType] nvarchar(40) NOT NULL,
        [RecordId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [EnvironmentId] bigint NULL,
        [TeamId] bigint NULL,
        [Kind] nvarchar(40) NOT NULL,
        [Title] nvarchar(150) NOT NULL,
        [Reference] nvarchar(500) NOT NULL,
        [OwnerUserId] bigint NULL,
        [ReviewDate] date NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_DocumentReference] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_DocumentReference_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_DocumentReference_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_DocumentReference_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_DocumentReference_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [audit].[ExportLog] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [Report] nvarchar(100) NOT NULL,
        [Filters] nvarchar(2000) NOT NULL,
        [RowCount] int NOT NULL,
        [At] datetimeoffset NOT NULL,
        CONSTRAINT [PK_ExportLog] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExportLog_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [iam].[GroupMapping] (
        [Id] bigint NOT NULL IDENTITY,
        [GroupName] nvarchar(256) NOT NULL,
        [Role] nvarchar(40) NULL,
        [AllClients] bit NOT NULL,
        [AllInternal] bit NOT NULL,
        [Grants] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_GroupMapping] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_GroupMapping_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_GroupMapping_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[JiraInstance] (
        [Id] bigint NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Kind] nvarchar(40) NOT NULL,
        [ApprovedHost] nvarchar(253) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraInstance] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraInstance_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraInstance_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [admin].[LookupValue] (
        [Id] bigint NOT NULL IDENTITY,
        [ListName] nvarchar(50) NOT NULL,
        [Code] nvarchar(100) NOT NULL,
        [Label] nvarchar(150) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [SortOrder] int NOT NULL,
        [IsRetired] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_LookupValue] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LookupValue_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_LookupValue_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [catalogue].[Product] (
        [Id] bigint NOT NULL IDENTITY,
        [Code] nvarchar(50) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [Aliases] nvarchar(400) NULL,
        [Description] nvarchar(2000) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Product] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Product_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Product_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [quality].[Review] (
        [Id] bigint NOT NULL IDENTITY,
        [RecordType] nvarchar(40) NOT NULL,
        [RecordId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [EnvironmentId] bigint NULL,
        [TeamId] bigint NULL,
        [Scope] nvarchar(40) NOT NULL,
        [Note] nvarchar(1000) NOT NULL,
        [Evidence] nvarchar(1000) NULL,
        [ReviewerId] bigint NULL,
        [ReviewedAt] datetimeoffset NOT NULL,
        [NextReviewAt] datetimeoffset NULL,
        CONSTRAINT [PK_Review] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Review_User_ReviewerId] FOREIGN KEY ([ReviewerId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [quality].[ReviewPolicy] (
        [Id] bigint NOT NULL IDENTITY,
        [RecordType] nvarchar(40) NOT NULL,
        [Scope] nvarchar(40) NOT NULL,
        [MaxAgeDays] int NULL,
        [UsesNextReviewDate] bit NOT NULL,
        [EffectiveFrom] date NOT NULL,
        [PolicyOwnerId] bigint NULL,
        [Notes] nvarchar(1000) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ReviewPolicy] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReviewPolicy_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ReviewPolicy_User_PolicyOwnerId] FOREIGN KEY ([PolicyOwnerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ReviewPolicy_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [admin].[Setting] (
        [Id] bigint NOT NULL IDENTITY,
        [Key] nvarchar(100) NOT NULL,
        [Value] nvarchar(2000) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Setting] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Setting_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Setting_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [teams].[Team] (
        [Id] bigint NOT NULL IDENTITY,
        [Code] nvarchar(50) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [LeadUserId] bigint NULL,
        [ManagerUserId] bigint NULL,
        [Description] nvarchar(2000) NULL,
        [IsActive] bit NOT NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Team] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Team_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Team_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Team_User_LeadUserId] FOREIGN KEY ([LeadUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Team_User_ManagerUserId] FOREIGN KEY ([ManagerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Team_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [iam].[UserRole] (
        [UserId] bigint NOT NULL,
        [Role] nvarchar(40) NOT NULL,
        CONSTRAINT [PK_UserRole] PRIMARY KEY ([UserId], [Role]),
        CONSTRAINT [FK_UserRole_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [catalogue].[ProductModule] (
        [Id] bigint NOT NULL IDENTITY,
        [ProductId] bigint NOT NULL,
        [Code] nvarchar(50) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProductModule] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductModule_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id]),
        CONSTRAINT [FK_ProductModule_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ProductModule_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [catalogue].[ProductVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [ProductId] bigint NOT NULL,
        [Version] nvarchar(50) NOT NULL,
        [SortKey] nvarchar(100) NOT NULL,
        [ReleasedOn] date NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProductVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductVersion_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id]),
        CONSTRAINT [FK_ProductVersion_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ProductVersion_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [clients].[Client] (
        [Id] bigint NOT NULL IDENTITY,
        [Code] nvarchar(50) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [Country] nvarchar(100) NULL,
        [CountryUnknown] bit NOT NULL,
        [CountryFollowUpOwnerId] bigint NULL,
        [Status] nvarchar(40) NOT NULL,
        [ParentOrganization] nvarchar(150) NULL,
        [Partner] nvarchar(150) NULL,
        [OwnerUserId] bigint NULL,
        [ResponsibleParty] nvarchar(40) NOT NULL,
        [ResponsibleOrganization] nvarchar(150) NULL,
        [ResponsibleTeamId] bigint NULL,
        [CoordinatorUserId] bigint NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [NextReviewAt] datetimeoffset NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Client] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Client_Team_ResponsibleTeamId] FOREIGN KEY ([ResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_Client_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Client_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Client_User_CountryFollowUpOwnerId] FOREIGN KEY ([CountryFollowUpOwnerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Client_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Client_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Client_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [teams].[TeamMember] (
        [Id] bigint NOT NULL IDENTITY,
        [TeamId] bigint NOT NULL,
        [UserId] bigint NOT NULL,
        [TeamRole] nvarchar(100) NULL,
        [Skills] nvarchar(1000) NULL,
        [ProductFamiliarity] nvarchar(1000) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_TeamMember] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_TeamMember_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_TeamMember_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_TeamMember_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_TeamMember_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[Case] (
        [Id] bigint NOT NULL IDENTITY,
        [Ref] nvarchar(20) NOT NULL DEFAULT (CONCAT('CS-', NEXT VALUE FOR [work].[CaseNumbers])),
        [Title] nvarchar(200) NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [Scope] nvarchar(40) NOT NULL,
        [ClientId] bigint NULL,
        [ResponsibleTeamId] bigint NULL,
        [ImpactSummary] nvarchar(2000) NOT NULL,
        [Priority] nvarchar(40) NOT NULL,
        [OwnerUserId] bigint NULL,
        [BackupOwnerUserId] bigint NULL,
        [ResponsibleParty] nvarchar(40) NOT NULL,
        [ResponsibleOrganization] nvarchar(150) NULL,
        [CoordinatorUserId] bigint NULL,
        [Status] nvarchar(40) NOT NULL,
        [ProgressSummary] nvarchar(2000) NULL,
        [WaitingReason] nvarchar(40) NULL,
        [WaitingSince] datetimeoffset NULL,
        [NextAction] nvarchar(1000) NOT NULL,
        [NextReviewAt] datetimeoffset NOT NULL,
        [DueAt] datetimeoffset NULL,
        [DueTimeZone] nvarchar(64) NULL,
        [UnknownEnvironmentReason] nvarchar(1000) NULL,
        [ValidationRequest] nvarchar(1000) NULL,
        [Outcome] nvarchar(2000) NULL,
        [ValidationEvidence] nvarchar(1000) NULL,
        [EvidenceExceptionReason] nvarchar(1000) NULL,
        [EvidenceExceptionApprovedById] bigint NULL,
        [EvidenceExceptionFollowUpOwnerId] bigint NULL,
        [EvidenceExceptionFollowUpDate] date NULL,
        [CancelReason] nvarchar(1000) NULL,
        [ClosedAt] datetimeoffset NULL,
        [CancelledAt] datetimeoffset NULL,
        [ReopenCount] int NOT NULL,
        [CycleStartedAt] datetimeoffset NOT NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Case] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Case_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Case_Team_ResponsibleTeamId] FOREIGN KEY ([ResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_Case_User_BackupOwnerUserId] FOREIGN KEY ([BackupOwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Case_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Case_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Case_User_EvidenceExceptionApprovedById] FOREIGN KEY ([EvidenceExceptionApprovedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Case_User_EvidenceExceptionFollowUpOwnerId] FOREIGN KEY ([EvidenceExceptionFollowUpOwnerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Case_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Case_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [teams].[Handover] (
        [Id] bigint NOT NULL IDENTITY,
        [Ref] nvarchar(20) NOT NULL DEFAULT (CONCAT('HO-', NEXT VALUE FOR [teams].[HandoverNumbers])),
        [ClientId] bigint NULL,
        [OutgoingOwnerId] bigint NOT NULL,
        [ReceivingOwnerId] bigint NOT NULL,
        [EffectiveAt] datetimeoffset NOT NULL,
        [Summary] nvarchar(2000) NOT NULL,
        [OutstandingActions] nvarchar(2000) NULL,
        [DocumentationNotes] nvarchar(2000) NULL,
        [Status] nvarchar(40) NOT NULL,
        [AcknowledgedAt] datetimeoffset NULL,
        [AcknowledgmentNote] nvarchar(1000) NULL,
        [ExceptionReason] nvarchar(1000) NULL,
        [ExceptionApprovedById] bigint NULL,
        [ExceptionFollowUpOwnerId] bigint NULL,
        [ExceptionFollowUpDate] date NULL,
        [CompletedAt] datetimeoffset NULL,
        [CancelReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Handover] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Handover_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Handover_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Handover_User_ExceptionApprovedById] FOREIGN KEY ([ExceptionApprovedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Handover_User_ExceptionFollowUpOwnerId] FOREIGN KEY ([ExceptionFollowUpOwnerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Handover_User_OutgoingOwnerId] FOREIGN KEY ([OutgoingOwnerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Handover_User_ReceivingOwnerId] FOREIGN KEY ([ReceivingOwnerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Handover_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [network].[NetworkContext] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NULL,
        [Name] nvarchar(150) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_NetworkContext] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NetworkContext_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_NetworkContext_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_NetworkContext_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_NetworkContext_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [clients].[Project] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [Code] nvarchar(50) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [OwnerUserId] bigint NULL,
        [Status] nvarchar(40) NOT NULL,
        [ScopeSummary] nvarchar(2000) NULL,
        [ServiceStart] date NULL,
        [ServiceEnd] date NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Project] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Project_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Project_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Project_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Project_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Project_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [clients].[Region] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [Code] nvarchar(50) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [OwnerUserId] bigint NULL,
        [Description] nvarchar(2000) NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Region] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Region_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Region_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Region_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Region_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Region_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CaseEvent] (
        [Id] bigint NOT NULL IDENTITY,
        [CaseId] bigint NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [FromValue] nvarchar(400) NULL,
        [ToValue] nvarchar(400) NULL,
        [Note] nvarchar(2000) NULL,
        [ById] bigint NULL,
        [At] datetimeoffset NOT NULL,
        CONSTRAINT [PK_CaseEvent] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CaseEvent_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_CaseEvent_User_ById] FOREIGN KEY ([ById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CaseWaitingInterval] (
        [Id] bigint NOT NULL IDENTITY,
        [CaseId] bigint NOT NULL,
        [Reason] nvarchar(40) NOT NULL,
        [Note] nvarchar(1000) NULL,
        [StartedAt] datetimeoffset NOT NULL,
        [EndedAt] datetimeoffset NULL,
        [StartedById] bigint NULL,
        [EndedById] bigint NULL,
        CONSTRAINT [PK_CaseWaitingInterval] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CaseWaitingInterval_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[JiraReference] (
        [Id] bigint NOT NULL IDENTITY,
        [CaseId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [JiraInstanceId] bigint NOT NULL,
        [IssueKey] nvarchar(40) NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [ReuseReason] nvarchar(1000) NULL,
        [RemovedAt] datetimeoffset NULL,
        [RemovedById] bigint NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraReference] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraReference_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_JiraReference_JiraInstance_JiraInstanceId] FOREIGN KEY ([JiraInstanceId]) REFERENCES [work].[JiraInstance] ([Id]),
        CONSTRAINT [FK_JiraReference_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraReference_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [teams].[HandoverItem] (
        [Id] bigint NOT NULL IDENTITY,
        [HandoverId] bigint NOT NULL,
        [RecordType] nvarchar(40) NOT NULL,
        [RecordId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [Label] nvarchar(300) NULL,
        [PreviousOwnerId] bigint NULL,
        [Applied] bit NOT NULL,
        [NotAppliedReason] nvarchar(500) NULL,
        CONSTRAINT [PK_HandoverItem] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HandoverItem_Handover_HandoverId] FOREIGN KEY ([HandoverId]) REFERENCES [teams].[Handover] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[Commitment] (
        [Id] bigint NOT NULL IDENTITY,
        [Ref] nvarchar(20) NOT NULL DEFAULT (CONCAT('CM-', NEXT VALUE FOR [work].[CommitmentNumbers])),
        [Scope] nvarchar(40) NOT NULL,
        [ClientId] bigint NULL,
        [ResponsibleTeamId] bigint NULL,
        [Description] nvarchar(2000) NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [OwnerUserId] bigint NULL,
        [ResponsibleParty] nvarchar(40) NOT NULL,
        [ResponsibleOrganization] nvarchar(150) NULL,
        [CoordinatorUserId] bigint NULL,
        [OriginalDueAt] datetimeoffset NOT NULL,
        [CurrentDueAt] datetimeoffset NOT NULL,
        [TimeZone] nvarchar(64) NOT NULL,
        [NextReviewAt] datetimeoffset NULL,
        [Status] nvarchar(40) NOT NULL,
        [CompletedAt] datetimeoffset NULL,
        [CompletionEvidence] nvarchar(1000) NULL,
        [DueAtCompletion] datetimeoffset NULL,
        [CompletedLate] bit NULL,
        [CancelReason] nvarchar(1000) NULL,
        [CaseId] bigint NULL,
        [ProjectId] bigint NULL,
        [RevisionCount] int NOT NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Commitment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Commitment_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_Commitment_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Commitment_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_Commitment_Team_ResponsibleTeamId] FOREIGN KEY ([ResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_Commitment_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Commitment_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Commitment_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Commitment_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [clients].[Contact] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [Role] nvarchar(150) NULL,
        [Organization] nvarchar(150) NULL,
        [Email] nvarchar(254) NULL,
        [Phone] nvarchar(50) NULL,
        [AuthorizedSupport] bit NOT NULL,
        [ProjectId] bigint NULL,
        [Responsibility] nvarchar(1000) NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Contact] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Contact_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Contact_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_Contact_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Contact_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Contact_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [iam].[GroupMappingScope] (
        [Id] bigint NOT NULL IDENTITY,
        [GroupMappingId] bigint NOT NULL,
        [Kind] nvarchar(40) NOT NULL,
        [ClientId] bigint NULL,
        [ProjectId] bigint NULL,
        [TeamId] bigint NULL,
        CONSTRAINT [PK_GroupMappingScope] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_GroupMappingScope_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_GroupMappingScope_GroupMapping_GroupMappingId] FOREIGN KEY ([GroupMappingId]) REFERENCES [iam].[GroupMapping] ([Id]),
        CONSTRAINT [FK_GroupMappingScope_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_GroupMappingScope_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [clients].[ProjectProduct] (
        [ProjectId] bigint NOT NULL,
        [ProductId] bigint NOT NULL,
        CONSTRAINT [PK_ProjectProduct] PRIMARY KEY ([ProjectId], [ProductId]),
        CONSTRAINT [FK_ProjectProduct_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id]),
        CONSTRAINT [FK_ProjectProduct_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [iam].[UserScope] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [Kind] nvarchar(40) NOT NULL,
        [ClientId] bigint NULL,
        [ProjectId] bigint NULL,
        [TeamId] bigint NULL,
        CONSTRAINT [PK_UserScope] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_UserScope_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_UserScope_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_UserScope_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_UserScope_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [env].[Environment] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [RegionId] bigint NULL,
        [ProjectId] bigint NULL,
        [Name] nvarchar(100) NOT NULL,
        [NormalizedName] nvarchar(100) NOT NULL,
        [RegionScope] AS ISNULL([RegionId], 0) PERSISTED,
        [Type] nvarchar(40) NOT NULL,
        [TypeDescription] nvarchar(150) NULL,
        [Hosting] nvarchar(100) NULL,
        [Location] nvarchar(150) NULL,
        [Criticality] nvarchar(40) NOT NULL,
        [OwnerUserId] bigint NULL,
        [BackupOwnerUserId] bigint NULL,
        [BackupGapReason] nvarchar(1000) NULL,
        [ResponsibleParty] nvarchar(40) NOT NULL,
        [ResponsibleOrganization] nvarchar(150) NULL,
        [ResponsibleTeamId] bigint NULL,
        [CoordinatorUserId] bigint NULL,
        [Description] nvarchar(2000) NULL,
        [Condition] nvarchar(40) NOT NULL,
        [ConditionReason] nvarchar(1000) NULL,
        [ConditionObservedAt] datetimeoffset NULL,
        [ConditionReportId] bigint NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [InventoryReviewedAt] datetimeoffset NULL,
        [DependenciesReviewedAt] datetimeoffset NULL,
        [NextReviewAt] datetimeoffset NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Environment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Environment_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Environment_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_Environment_Region_RegionId] FOREIGN KEY ([RegionId]) REFERENCES [clients].[Region] ([Id]),
        CONSTRAINT [FK_Environment_Team_ResponsibleTeamId] FOREIGN KEY ([ResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_Environment_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Environment_User_BackupOwnerUserId] FOREIGN KEY ([BackupOwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Environment_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Environment_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Environment_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Environment_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CommitmentEvent] (
        [Id] bigint NOT NULL IDENTITY,
        [CommitmentId] bigint NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [PreviousDueAt] datetimeoffset NULL,
        [NewDueAt] datetimeoffset NULL,
        [CompletedAt] datetimeoffset NULL,
        [Reason] nvarchar(1000) NULL,
        [Evidence] nvarchar(1000) NULL,
        [ById] bigint NULL,
        [At] datetimeoffset NOT NULL,
        CONSTRAINT [PK_CommitmentEvent] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CommitmentEvent_Commitment_CommitmentId] FOREIGN KEY ([CommitmentId]) REFERENCES [work].[Commitment] ([Id]),
        CONSTRAINT [FK_CommitmentEvent_User_ById] FOREIGN KEY ([ById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [inventory].[Asset] (
        [Id] bigint NOT NULL IDENTITY,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [NormalizedName] nvarchar(150) NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [Role] nvarchar(100) NULL,
        [NetworkZone] nvarchar(100) NULL,
        [ProjectPhase] nvarchar(100) NULL,
        [Lifecycle] nvarchar(40) NOT NULL,
        [OwnerUserId] bigint NULL,
        [ResponsibleParty] nvarchar(40) NOT NULL,
        [ResponsibleOrganization] nvarchar(150) NULL,
        [ResponsibleTeamId] bigint NULL,
        [CoordinatorUserId] bigint NULL,
        [CpuQuantity] decimal(12,2) NULL,
        [CpuUnit] nvarchar(40) NULL,
        [RamQuantity] decimal(12,2) NULL,
        [RamUnit] nvarchar(40) NULL,
        [OsFamily] nvarchar(100) NULL,
        [OsVersion] nvarchar(100) NULL,
        [VerifiedAt] datetimeoffset NULL,
        [SourceDocument] nvarchar(200) NULL,
        [SourceSheet] nvarchar(100) NULL,
        [SourceRange] nvarchar(50) NULL,
        [SourceNotation] nvarchar(400) NULL,
        [TranscribedAt] datetimeoffset NULL,
        [SourceReviewerId] bigint NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Asset] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Asset_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Asset_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_Asset_Team_ResponsibleTeamId] FOREIGN KEY ([ResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_Asset_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Asset_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Asset_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Asset_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Asset_User_SourceReviewerId] FOREIGN KEY ([SourceReviewerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Asset_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CaseEnvironment] (
        [CaseId] bigint NOT NULL,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_CaseEnvironment] PRIMARY KEY ([CaseId], [EnvironmentId]),
        CONSTRAINT [FK_CaseEnvironment_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_CaseEnvironment_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [env].[ConditionReport] (
        [Id] bigint NOT NULL IDENTITY,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [Condition] nvarchar(40) NOT NULL,
        [Reason] nvarchar(1000) NULL,
        [Evidence] nvarchar(1000) NULL,
        [ObservedAt] datetimeoffset NOT NULL,
        [RecordedById] bigint NULL,
        [RecordedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_ConditionReport] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ConditionReport_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_ConditionReport_User_RecordedById] FOREIGN KEY ([RecordedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [catalogue].[Installation] (
        [Id] bigint NOT NULL IDENTITY,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [ProductId] bigint NOT NULL,
        [ModuleId] bigint NULL,
        [InstanceName] nvarchar(100) NOT NULL,
        [NormalizedInstanceName] nvarchar(100) NOT NULL,
        [ProductVersionId] bigint NULL,
        [DeployedOn] date NULL,
        [SupportNotes] nvarchar(2000) NULL,
        [OwnerUserId] bigint NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [SourceDocument] nvarchar(200) NULL,
        [SourceSheet] nvarchar(100) NULL,
        [SourceRange] nvarchar(50) NULL,
        [SourceNotation] nvarchar(400) NULL,
        [TranscribedAt] datetimeoffset NULL,
        [SourceReviewerId] bigint NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Installation] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Installation_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Installation_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_Installation_ProductModule_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [catalogue].[ProductModule] ([Id]),
        CONSTRAINT [FK_Installation_ProductVersion_ProductVersionId] FOREIGN KEY ([ProductVersionId]) REFERENCES [catalogue].[ProductVersion] ([Id]),
        CONSTRAINT [FK_Installation_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id]),
        CONSTRAINT [FK_Installation_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Installation_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Installation_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Installation_User_SourceReviewerId] FOREIGN KEY ([SourceReviewerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Installation_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [clients].[ResponsibilityBoundary] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [EnvironmentId] bigint NULL,
        [Area] nvarchar(100) NOT NULL,
        [Party] nvarchar(40) NOT NULL,
        [Organization] nvarchar(150) NULL,
        [ContactId] bigint NULL,
        [CoordinatorUserId] bigint NULL,
        [Notes] nvarchar(2000) NULL,
        [Evidence] nvarchar(1000) NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ResponsibilityBoundary] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_Contact_ContactId] FOREIGN KEY ([ContactId]) REFERENCES [clients].[Contact] ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ResponsibilityBoundary_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [inventory].[SharedStorage] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [EnvironmentId] bigint NULL,
        [Name] nvarchar(150) NOT NULL,
        [Capacity] decimal(12,2) NULL,
        [Unit] nvarchar(40) NULL,
        [Description] nvarchar(2000) NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_SharedStorage] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SharedStorage_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_SharedStorage_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_SharedStorage_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_SharedStorage_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_SharedStorage_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CaseAsset] (
        [CaseId] bigint NOT NULL,
        [AssetId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_CaseAsset] PRIMARY KEY ([CaseId], [AssetId]),
        CONSTRAINT [FK_CaseAsset_Asset_AssetId] FOREIGN KEY ([AssetId]) REFERENCES [inventory].[Asset] ([Id]),
        CONSTRAINT [FK_CaseAsset_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [inventory].[Component] (
        [Id] bigint NOT NULL IDENTITY,
        [InstallationId] bigint NOT NULL,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [NormalizedName] nvarchar(150) NOT NULL,
        [Role] nvarchar(100) NOT NULL,
        [ComponentVersion] nvarchar(50) NULL,
        [OwnerUserId] bigint NULL,
        [ResponsibleParty] nvarchar(40) NOT NULL,
        [ResponsibleOrganization] nvarchar(150) NULL,
        [ResponsibleTeamId] bigint NULL,
        [CoordinatorUserId] bigint NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Component] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Component_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_Component_Installation_InstallationId] FOREIGN KEY ([InstallationId]) REFERENCES [catalogue].[Installation] ([Id]),
        CONSTRAINT [FK_Component_Team_ResponsibleTeamId] FOREIGN KEY ([ResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_Component_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Component_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Component_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Component_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Component_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [catalogue].[InstallationVersionChange] (
        [Id] bigint NOT NULL IDENTITY,
        [InstallationId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [FromVersionId] bigint NULL,
        [ToVersionId] bigint NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [Evidence] nvarchar(1000) NOT NULL,
        [DeployedOn] date NULL,
        [ChangedById] bigint NULL,
        [ChangedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_InstallationVersionChange] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_InstallationVersionChange_Installation_InstallationId] FOREIGN KEY ([InstallationId]) REFERENCES [catalogue].[Installation] ([Id]),
        CONSTRAINT [FK_InstallationVersionChange_ProductVersion_FromVersionId] FOREIGN KEY ([FromVersionId]) REFERENCES [catalogue].[ProductVersion] ([Id]),
        CONSTRAINT [FK_InstallationVersionChange_ProductVersion_ToVersionId] FOREIGN KEY ([ToVersionId]) REFERENCES [catalogue].[ProductVersion] ([Id]),
        CONSTRAINT [FK_InstallationVersionChange_User_ChangedById] FOREIGN KEY ([ChangedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [inventory].[Volume] (
        [Id] bigint NOT NULL IDENTITY,
        [AssetId] bigint NOT NULL,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [Label] nvarchar(100) NOT NULL,
        [Capacity] decimal(12,2) NULL,
        [Unit] nvarchar(40) NULL,
        [Purpose] nvarchar(200) NULL,
        [SharedStorageId] bigint NULL,
        [SourceDocument] nvarchar(200) NULL,
        [SourceSheet] nvarchar(100) NULL,
        [SourceRange] nvarchar(50) NULL,
        [SourceNotation] nvarchar(400) NULL,
        [TranscribedAt] datetimeoffset NULL,
        [SourceReviewerId] bigint NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Volume] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Volume_Asset_AssetId] FOREIGN KEY ([AssetId]) REFERENCES [inventory].[Asset] ([Id]),
        CONSTRAINT [FK_Volume_SharedStorage_SharedStorageId] FOREIGN KEY ([SharedStorageId]) REFERENCES [inventory].[SharedStorage] ([Id]),
        CONSTRAINT [FK_Volume_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Volume_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Volume_User_SourceReviewerId] FOREIGN KEY ([SourceReviewerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Volume_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CaseComponent] (
        [CaseId] bigint NOT NULL,
        [ComponentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_CaseComponent] PRIMARY KEY ([CaseId], [ComponentId]),
        CONSTRAINT [FK_CaseComponent_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_CaseComponent_Component_ComponentId] FOREIGN KEY ([ComponentId]) REFERENCES [inventory].[Component] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [inventory].[ComponentHost] (
        [ComponentId] bigint NOT NULL,
        [AssetId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_ComponentHost] PRIMARY KEY ([ComponentId], [AssetId]),
        CONSTRAINT [FK_ComponentHost_Asset_AssetId] FOREIGN KEY ([AssetId]) REFERENCES [inventory].[Asset] ([Id]),
        CONSTRAINT [FK_ComponentHost_Component_ComponentId] FOREIGN KEY ([ComponentId]) REFERENCES [inventory].[Component] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [network].[Endpoint] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [EnvironmentId] bigint NULL,
        [Type] nvarchar(40) NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [NetworkContextId] bigint NOT NULL,
        [Zone] nvarchar(100) NULL,
        [Hostname] nvarchar(253) NULL,
        [AssetId] bigint NULL,
        [ComponentId] bigint NULL,
        [Description] nvarchar(2000) NULL,
        [SourceDocument] nvarchar(200) NULL,
        [SourceSheet] nvarchar(100) NULL,
        [SourceRange] nvarchar(50) NULL,
        [SourceNotation] nvarchar(400) NULL,
        [TranscribedAt] datetimeoffset NULL,
        [SourceReviewerId] bigint NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Endpoint] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Endpoint_Asset_AssetId] FOREIGN KEY ([AssetId]) REFERENCES [inventory].[Asset] ([Id]),
        CONSTRAINT [FK_Endpoint_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Endpoint_Component_ComponentId] FOREIGN KEY ([ComponentId]) REFERENCES [inventory].[Component] ([Id]),
        CONSTRAINT [FK_Endpoint_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_Endpoint_NetworkContext_NetworkContextId] FOREIGN KEY ([NetworkContextId]) REFERENCES [network].[NetworkContext] ([Id]),
        CONSTRAINT [FK_Endpoint_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Endpoint_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Endpoint_User_SourceReviewerId] FOREIGN KEY ([SourceReviewerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Endpoint_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [network].[Dependency] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [EnvironmentId] bigint NULL,
        [SourceEndpointId] bigint NOT NULL,
        [DestinationEndpointId] bigint NOT NULL,
        [Protocol] nvarchar(40) NOT NULL,
        [Ports] nvarchar(200) NULL,
        [ProtocolExplanation] nvarchar(1000) NULL,
        [Direction] nvarchar(40) NOT NULL,
        [Purpose] nvarchar(1000) NOT NULL,
        [OwnerUserId] bigint NULL,
        [CoordinatorUserId] bigint NULL,
        [PairExpansionConfirmed] bit NOT NULL,
        [PairExpansionConfirmedById] bigint NULL,
        [SamePairReason] nvarchar(1000) NULL,
        [SourceDocument] nvarchar(200) NULL,
        [SourceSheet] nvarchar(100) NULL,
        [SourceRange] nvarchar(50) NULL,
        [SourceNotation] nvarchar(400) NULL,
        [TranscribedAt] datetimeoffset NULL,
        [SourceReviewerId] bigint NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Dependency] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Dependency_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Dependency_Endpoint_DestinationEndpointId] FOREIGN KEY ([DestinationEndpointId]) REFERENCES [network].[Endpoint] ([Id]),
        CONSTRAINT [FK_Dependency_Endpoint_SourceEndpointId] FOREIGN KEY ([SourceEndpointId]) REFERENCES [network].[Endpoint] ([Id]),
        CONSTRAINT [FK_Dependency_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_Dependency_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Dependency_User_CoordinatorUserId] FOREIGN KEY ([CoordinatorUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Dependency_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Dependency_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Dependency_User_SourceReviewerId] FOREIGN KEY ([SourceReviewerId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Dependency_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [network].[EndpointAddress] (
        [Id] bigint NOT NULL IDENTITY,
        [EndpointId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [NetworkContextId] bigint NOT NULL,
        [Address] nvarchar(64) NOT NULL,
        [Kind] nvarchar(40) NOT NULL,
        [NatTarget] nvarchar(64) NULL,
        CONSTRAINT [PK_EndpointAddress] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EndpointAddress_Endpoint_EndpointId] FOREIGN KEY ([EndpointId]) REFERENCES [network].[Endpoint] ([Id]),
        CONSTRAINT [FK_EndpointAddress_NetworkContext_NetworkContextId] FOREIGN KEY ([NetworkContextId]) REFERENCES [network].[NetworkContext] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [network].[EndpointGroupMember] (
        [GroupEndpointId] bigint NOT NULL,
        [MemberEndpointId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_EndpointGroupMember] PRIMARY KEY ([GroupEndpointId], [MemberEndpointId]),
        CONSTRAINT [FK_EndpointGroupMember_Endpoint_GroupEndpointId] FOREIGN KEY ([GroupEndpointId]) REFERENCES [network].[Endpoint] ([Id]),
        CONSTRAINT [FK_EndpointGroupMember_Endpoint_MemberEndpointId] FOREIGN KEY ([MemberEndpointId]) REFERENCES [network].[Endpoint] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [work].[CaseDependency] (
        [CaseId] bigint NOT NULL,
        [DependencyId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_CaseDependency] PRIMARY KEY ([CaseId], [DependencyId]),
        CONSTRAINT [FK_CaseDependency_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_CaseDependency_Dependency_DependencyId] FOREIGN KEY ([DependencyId]) REFERENCES [network].[Dependency] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE TABLE [network].[DependencyComponent] (
        [DependencyId] bigint NOT NULL,
        [ComponentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_DependencyComponent] PRIMARY KEY ([DependencyId], [ComponentId]),
        CONSTRAINT [FK_DependencyComponent_Component_ComponentId] FOREIGN KEY ([ComponentId]) REFERENCES [inventory].[Component] ([Id]),
        CONSTRAINT [FK_DependencyComponent_Dependency_DependencyId] FOREIGN KEY ([DependencyId]) REFERENCES [network].[Dependency] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_ArchivedById] ON [inventory].[Asset] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_ClientId] ON [inventory].[Asset] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_CoordinatorUserId] ON [inventory].[Asset] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_CreatedById] ON [inventory].[Asset] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Asset_EnvironmentId_NormalizedName] ON [inventory].[Asset] ([EnvironmentId], [NormalizedName]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_OwnerUserId] ON [inventory].[Asset] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_ResponsibleTeamId] ON [inventory].[Asset] ([ResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_SourceReviewerId] ON [inventory].[Asset] ([SourceReviewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Asset_UpdatedById] ON [inventory].[Asset] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_AuditEntry_At] ON [audit].[AuditEntry] ([At]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_AuditEntry_ClientId] ON [audit].[AuditEntry] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_AuditEntry_EntityType_EntityId] ON [audit].[AuditEntry] ([EntityType], [EntityId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_BackupOwnerUserId] ON [work].[Case] ([BackupOwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_ClientId] ON [work].[Case] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_CoordinatorUserId] ON [work].[Case] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_CreatedById] ON [work].[Case] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_EvidenceExceptionApprovedById] ON [work].[Case] ([EvidenceExceptionApprovedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_EvidenceExceptionFollowUpOwnerId] ON [work].[Case] ([EvidenceExceptionFollowUpOwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_OwnerUserId] ON [work].[Case] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Case_Ref] ON [work].[Case] ([Ref]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_ResponsibleTeamId] ON [work].[Case] ([ResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_Status_DueAt] ON [work].[Case] ([Status], [DueAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Case_UpdatedById] ON [work].[Case] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseAsset_AssetId] ON [work].[CaseAsset] ([AssetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseComponent_ComponentId] ON [work].[CaseComponent] ([ComponentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseDependency_DependencyId] ON [work].[CaseDependency] ([DependencyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseEnvironment_EnvironmentId] ON [work].[CaseEnvironment] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseEvent_ById] ON [work].[CaseEvent] ([ById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseEvent_CaseId_At] ON [work].[CaseEvent] ([CaseId], [At]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CaseWaitingInterval_CaseId] ON [work].[CaseWaitingInterval] ([CaseId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_ArchivedById] ON [clients].[Client] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Client_Code] ON [clients].[Client] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_CoordinatorUserId] ON [clients].[Client] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_CountryFollowUpOwnerId] ON [clients].[Client] ([CountryFollowUpOwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_CreatedById] ON [clients].[Client] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_OwnerUserId] ON [clients].[Client] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_ResponsibleTeamId] ON [clients].[Client] ([ResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Client_UpdatedById] ON [clients].[Client] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_CaseId] ON [work].[Commitment] ([CaseId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_ClientId] ON [work].[Commitment] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_CoordinatorUserId] ON [work].[Commitment] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_CreatedById] ON [work].[Commitment] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_OwnerUserId] ON [work].[Commitment] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_ProjectId] ON [work].[Commitment] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Commitment_Ref] ON [work].[Commitment] ([Ref]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_ResponsibleTeamId] ON [work].[Commitment] ([ResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_Status_CurrentDueAt] ON [work].[Commitment] ([Status], [CurrentDueAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Commitment_UpdatedById] ON [work].[Commitment] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CommitmentEvent_ById] ON [work].[CommitmentEvent] ([ById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_CommitmentEvent_CommitmentId] ON [work].[CommitmentEvent] ([CommitmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_ArchivedById] ON [inventory].[Component] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_CoordinatorUserId] ON [inventory].[Component] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_CreatedById] ON [inventory].[Component] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_EnvironmentId] ON [inventory].[Component] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Component_InstallationId_NormalizedName] ON [inventory].[Component] ([InstallationId], [NormalizedName]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_OwnerUserId] ON [inventory].[Component] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_ResponsibleTeamId] ON [inventory].[Component] ([ResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Component_UpdatedById] ON [inventory].[Component] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ComponentHost_AssetId] ON [inventory].[ComponentHost] ([AssetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ConditionReport_EnvironmentId_ObservedAt] ON [env].[ConditionReport] ([EnvironmentId], [ObservedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ConditionReport_RecordedById] ON [env].[ConditionReport] ([RecordedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Contact_ArchivedById] ON [clients].[Contact] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Contact_ClientId] ON [clients].[Contact] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Contact_CreatedById] ON [clients].[Contact] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Contact_ProjectId] ON [clients].[Contact] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Contact_UpdatedById] ON [clients].[Contact] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DataQualityItem_CoordinatorUserId] ON [quality].[DataQualityItem] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DataQualityItem_CreatedById] ON [quality].[DataQualityItem] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_DataQualityItem_Rule_RecordType_RecordId] ON [quality].[DataQualityItem] ([Rule], [RecordType], [RecordId]) WHERE [Status] = ''Open''');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DataQualityItem_Status_ClientId] ON [quality].[DataQualityItem] ([Status], [ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DataQualityItem_UpdatedById] ON [quality].[DataQualityItem] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_ArchivedById] ON [network].[Dependency] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_ClientId] ON [network].[Dependency] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_CoordinatorUserId] ON [network].[Dependency] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_CreatedById] ON [network].[Dependency] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_DestinationEndpointId] ON [network].[Dependency] ([DestinationEndpointId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_EnvironmentId] ON [network].[Dependency] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_OwnerUserId] ON [network].[Dependency] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_SourceEndpointId] ON [network].[Dependency] ([SourceEndpointId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_SourceReviewerId] ON [network].[Dependency] ([SourceReviewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Dependency_UpdatedById] ON [network].[Dependency] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DependencyComponent_ComponentId] ON [network].[DependencyComponent] ([ComponentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DocumentReference_ArchivedById] ON [quality].[DocumentReference] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DocumentReference_CreatedById] ON [quality].[DocumentReference] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DocumentReference_OwnerUserId] ON [quality].[DocumentReference] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DocumentReference_RecordType_RecordId] ON [quality].[DocumentReference] ([RecordType], [RecordId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_DocumentReference_UpdatedById] ON [quality].[DocumentReference] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_ArchivedById] ON [network].[Endpoint] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_AssetId] ON [network].[Endpoint] ([AssetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Endpoint_ClientId_NetworkContextId_Name] ON [network].[Endpoint] ([ClientId], [NetworkContextId], [Name]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_ComponentId] ON [network].[Endpoint] ([ComponentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_CreatedById] ON [network].[Endpoint] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_EnvironmentId] ON [network].[Endpoint] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_NetworkContextId] ON [network].[Endpoint] ([NetworkContextId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_SourceReviewerId] ON [network].[Endpoint] ([SourceReviewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Endpoint_UpdatedById] ON [network].[Endpoint] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_EndpointAddress_EndpointId] ON [network].[EndpointAddress] ([EndpointId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_EndpointAddress_NetworkContextId_Address] ON [network].[EndpointAddress] ([NetworkContextId], [Address]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_EndpointGroupMember_MemberEndpointId] ON [network].[EndpointGroupMember] ([MemberEndpointId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_ArchivedById] ON [env].[Environment] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_BackupOwnerUserId] ON [env].[Environment] ([BackupOwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Environment_ClientId_RegionScope_NormalizedName] ON [env].[Environment] ([ClientId], [RegionScope], [NormalizedName]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_CoordinatorUserId] ON [env].[Environment] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_CreatedById] ON [env].[Environment] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_OwnerUserId] ON [env].[Environment] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_ProjectId] ON [env].[Environment] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_RegionId] ON [env].[Environment] ([RegionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_ResponsibleTeamId] ON [env].[Environment] ([ResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Environment_UpdatedById] ON [env].[Environment] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ExportLog_UserId] ON [audit].[ExportLog] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_GroupMapping_CreatedById] ON [iam].[GroupMapping] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_GroupMapping_GroupName] ON [iam].[GroupMapping] ([GroupName]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_GroupMapping_UpdatedById] ON [iam].[GroupMapping] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_GroupMappingScope_ClientId] ON [iam].[GroupMappingScope] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_GroupMappingScope_GroupMappingId] ON [iam].[GroupMappingScope] ([GroupMappingId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_GroupMappingScope_ProjectId] ON [iam].[GroupMappingScope] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_GroupMappingScope_TeamId] ON [iam].[GroupMappingScope] ([TeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_ClientId] ON [teams].[Handover] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_CreatedById] ON [teams].[Handover] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_ExceptionApprovedById] ON [teams].[Handover] ([ExceptionApprovedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_ExceptionFollowUpOwnerId] ON [teams].[Handover] ([ExceptionFollowUpOwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_OutgoingOwnerId] ON [teams].[Handover] ([OutgoingOwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_ReceivingOwnerId] ON [teams].[Handover] ([ReceivingOwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Handover_Ref] ON [teams].[Handover] ([Ref]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Handover_UpdatedById] ON [teams].[Handover] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_HandoverItem_HandoverId] ON [teams].[HandoverItem] ([HandoverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_ArchivedById] ON [catalogue].[Installation] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_ClientId] ON [catalogue].[Installation] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_CreatedById] ON [catalogue].[Installation] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Installation_EnvironmentId_ProductId_NormalizedInstanceName] ON [catalogue].[Installation] ([EnvironmentId], [ProductId], [NormalizedInstanceName]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_ModuleId] ON [catalogue].[Installation] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_OwnerUserId] ON [catalogue].[Installation] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_ProductId] ON [catalogue].[Installation] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_ProductVersionId] ON [catalogue].[Installation] ([ProductVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_SourceReviewerId] ON [catalogue].[Installation] ([SourceReviewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Installation_UpdatedById] ON [catalogue].[Installation] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_InstallationVersionChange_ChangedById] ON [catalogue].[InstallationVersionChange] ([ChangedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_InstallationVersionChange_FromVersionId] ON [catalogue].[InstallationVersionChange] ([FromVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_InstallationVersionChange_InstallationId] ON [catalogue].[InstallationVersionChange] ([InstallationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_InstallationVersionChange_ToVersionId] ON [catalogue].[InstallationVersionChange] ([ToVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_JiraInstance_CreatedById] ON [work].[JiraInstance] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraInstance_Name] ON [work].[JiraInstance] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_JiraInstance_UpdatedById] ON [work].[JiraInstance] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_JiraReference_CaseId_JiraInstanceId_IssueKey] ON [work].[JiraReference] ([CaseId], [JiraInstanceId], [IssueKey]) WHERE [RemovedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_JiraReference_CreatedById] ON [work].[JiraReference] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_JiraReference_JiraInstanceId_IssueKey] ON [work].[JiraReference] ([JiraInstanceId], [IssueKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_JiraReference_UpdatedById] ON [work].[JiraReference] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_LookupValue_CreatedById] ON [admin].[LookupValue] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_LookupValue_ListName_Code] ON [admin].[LookupValue] ([ListName], [Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_LookupValue_UpdatedById] ON [admin].[LookupValue] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_NetworkContext_ArchivedById] ON [network].[NetworkContext] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_NetworkContext_ClientId_Name] ON [network].[NetworkContext] ([ClientId], [Name]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_NetworkContext_CreatedById] ON [network].[NetworkContext] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_NetworkContext_UpdatedById] ON [network].[NetworkContext] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Product_Code] ON [catalogue].[Product] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Product_CreatedById] ON [catalogue].[Product] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Product_UpdatedById] ON [catalogue].[Product] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ProductModule_CreatedById] ON [catalogue].[ProductModule] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductModule_ProductId_Code] ON [catalogue].[ProductModule] ([ProductId], [Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ProductModule_UpdatedById] ON [catalogue].[ProductModule] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ProductVersion_CreatedById] ON [catalogue].[ProductVersion] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductVersion_ProductId_Version] ON [catalogue].[ProductVersion] ([ProductId], [Version]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ProductVersion_UpdatedById] ON [catalogue].[ProductVersion] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Project_ArchivedById] ON [clients].[Project] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Project_ClientId] ON [clients].[Project] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Project_Code] ON [clients].[Project] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Project_CreatedById] ON [clients].[Project] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Project_OwnerUserId] ON [clients].[Project] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Project_UpdatedById] ON [clients].[Project] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ProjectProduct_ProductId] ON [clients].[ProjectProduct] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Region_ArchivedById] ON [clients].[Region] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Region_ClientId_Code] ON [clients].[Region] ([ClientId], [Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Region_CreatedById] ON [clients].[Region] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Region_OwnerUserId] ON [clients].[Region] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Region_UpdatedById] ON [clients].[Region] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_ArchivedById] ON [clients].[ResponsibilityBoundary] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_ClientId] ON [clients].[ResponsibilityBoundary] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_ContactId] ON [clients].[ResponsibilityBoundary] ([ContactId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_CoordinatorUserId] ON [clients].[ResponsibilityBoundary] ([CoordinatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_CreatedById] ON [clients].[ResponsibilityBoundary] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_EnvironmentId] ON [clients].[ResponsibilityBoundary] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_UpdatedById] ON [clients].[ResponsibilityBoundary] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Review_RecordType_RecordId_Scope_ReviewedAt] ON [quality].[Review] ([RecordType], [RecordId], [Scope], [ReviewedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Review_ReviewerId] ON [quality].[Review] ([ReviewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ReviewPolicy_CreatedById] ON [quality].[ReviewPolicy] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ReviewPolicy_PolicyOwnerId] ON [quality].[ReviewPolicy] ([PolicyOwnerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ReviewPolicy_RecordType_Scope] ON [quality].[ReviewPolicy] ([RecordType], [Scope]) WHERE [IsActive] = 1');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_ReviewPolicy_UpdatedById] ON [quality].[ReviewPolicy] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Setting_CreatedById] ON [admin].[Setting] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Setting_Key] ON [admin].[Setting] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Setting_UpdatedById] ON [admin].[Setting] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_SharedStorage_ArchivedById] ON [inventory].[SharedStorage] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_SharedStorage_ClientId_Name] ON [inventory].[SharedStorage] ([ClientId], [Name]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_SharedStorage_CreatedById] ON [inventory].[SharedStorage] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_SharedStorage_EnvironmentId] ON [inventory].[SharedStorage] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_SharedStorage_UpdatedById] ON [inventory].[SharedStorage] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Team_ArchivedById] ON [teams].[Team] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Team_Code] ON [teams].[Team] ([Code]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Team_CreatedById] ON [teams].[Team] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Team_LeadUserId] ON [teams].[Team] ([LeadUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Team_ManagerUserId] ON [teams].[Team] ([ManagerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Team_UpdatedById] ON [teams].[Team] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_TeamMember_CreatedById] ON [teams].[TeamMember] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_TeamMember_TeamId_UserId] ON [teams].[TeamMember] ([TeamId], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_TeamMember_UpdatedById] ON [teams].[TeamMember] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_TeamMember_UserId] ON [teams].[TeamMember] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE UNIQUE INDEX [IX_User_AccountName] ON [iam].[User] ([AccountName]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_User_CreatedById] ON [iam].[User] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_User_UpdatedById] ON [iam].[User] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_UserScope_ClientId] ON [iam].[UserScope] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_UserScope_ProjectId] ON [iam].[UserScope] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_UserScope_TeamId] ON [iam].[UserScope] ([TeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_UserScope_UserId] ON [iam].[UserScope] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Volume_ArchivedById] ON [inventory].[Volume] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Volume_AssetId_Label] ON [inventory].[Volume] ([AssetId], [Label]) WHERE [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Volume_CreatedById] ON [inventory].[Volume] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Volume_SharedStorageId] ON [inventory].[Volume] ([SharedStorageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Volume_SourceReviewerId] ON [inventory].[Volume] ([SourceReviewerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    CREATE INDEX [IX_Volume_UpdatedById] ON [inventory].[Volume] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261016102033_InitialMvp'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261016102033_InitialMvp', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    IF SCHEMA_ID(N'contracts') IS NULL EXEC(N'CREATE SCHEMA [contracts];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE SEQUENCE [contracts].[ContractNumbers] AS int START WITH 1001 INCREMENT BY 1 NO CYCLE;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE TABLE [contracts].[Contract] (
        [Id] bigint NOT NULL IDENTITY,
        [Ref] nvarchar(20) NOT NULL DEFAULT (CONCAT('CT-', NEXT VALUE FOR [contracts].[ContractNumbers])),
        [ClientId] bigint NOT NULL,
        [ProjectId] bigint NULL,
        [Title] nvarchar(200) NOT NULL,
        [ContractReference] nvarchar(100) NULL,
        [Type] nvarchar(40) NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [OwnerUserId] bigint NULL,
        [StartDate] date NULL,
        [EndDate] date NULL,
        [RenewalTerms] nvarchar(40) NOT NULL,
        [NoticeDays] int NULL,
        [SupportModel] nvarchar(40) NOT NULL,
        [SupportHours] nvarchar(200) NULL,
        [SupportTimeZone] nvarchar(64) NULL,
        [OnSiteEngineersRequired] int NULL,
        [Coverage] nvarchar(2000) NULL,
        [Obligations] nvarchar(4000) NULL,
        [LastReviewedAt] datetimeoffset NULL,
        [ArchivedAt] datetimeoffset NULL,
        [ArchivedById] bigint NULL,
        [ArchiveReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Contract] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Contract_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Contract_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_Contract_User_ArchivedById] FOREIGN KEY ([ArchivedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Contract_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Contract_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Contract_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE TABLE [contracts].[ContractEnvironment] (
        [ContractId] bigint NOT NULL,
        [EnvironmentId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        CONSTRAINT [PK_ContractEnvironment] PRIMARY KEY ([ContractId], [EnvironmentId]),
        CONSTRAINT [FK_ContractEnvironment_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_ContractEnvironment_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id]),
        CONSTRAINT [FK_ContractEnvironment_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE TABLE [contracts].[ContractProduct] (
        [ContractId] bigint NOT NULL,
        [ProductId] bigint NOT NULL,
        CONSTRAINT [PK_ContractProduct] PRIMARY KEY ([ContractId], [ProductId]),
        CONSTRAINT [FK_ContractProduct_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id]),
        CONSTRAINT [FK_ContractProduct_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE TABLE [contracts].[SlaTarget] (
        [Id] bigint NOT NULL IDENTITY,
        [ContractId] bigint NOT NULL,
        [Priority] nvarchar(40) NOT NULL,
        [ResponseMinutes] int NULL,
        [ResolutionMinutes] int NULL,
        [Basis] nvarchar(40) NOT NULL,
        [Notes] nvarchar(500) NULL,
        CONSTRAINT [PK_SlaTarget] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SlaTarget_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_ArchivedById] ON [contracts].[Contract] ([ArchivedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_ClientId] ON [contracts].[Contract] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_CreatedById] ON [contracts].[Contract] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_OwnerUserId] ON [contracts].[Contract] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_ProjectId] ON [contracts].[Contract] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Contract_Ref] ON [contracts].[Contract] ([Ref]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_Status_EndDate] ON [contracts].[Contract] ([Status], [EndDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_Contract_UpdatedById] ON [contracts].[Contract] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_ContractEnvironment_ClientId] ON [contracts].[ContractEnvironment] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_ContractEnvironment_EnvironmentId] ON [contracts].[ContractEnvironment] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE INDEX [IX_ContractProduct_ProductId] ON [contracts].[ContractProduct] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SlaTarget_ContractId_Priority] ON [contracts].[SlaTarget] ([ContractId], [Priority]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019091722_Contracts'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019091722_Contracts', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019112502_FormsSignIn'
)
BEGIN
    CREATE TABLE [iam].[UserCredential] (
        [UserId] bigint NOT NULL,
        [PasswordHash] nvarchar(200) NOT NULL,
        [PasswordChangedAt] datetimeoffset NOT NULL,
        [MustChangePassword] bit NOT NULL,
        [FailedAttempts] int NOT NULL,
        [LockedUntil] datetimeoffset NULL,
        [SessionStamp] uniqueidentifier NOT NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_UserCredential] PRIMARY KEY ([UserId]),
        CONSTRAINT [FK_UserCredential_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019112502_FormsSignIn'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019112502_FormsSignIn', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019122859_UatClientEnvironmentRules'
)
BEGIN
    EXEC(N'UPDATE [clients].[Client] SET [Status] = N''Opportunity'' WHERE [Status] = N''Onboarding'';')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019122859_UatClientEnvironmentRules'
)
BEGIN
    EXEC(N'UPDATE [clients].[Client] SET [Status] = N''Active'' WHERE [Status] = N''Suspended'';')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019122859_UatClientEnvironmentRules'
)
BEGIN
    EXEC(N'UPDATE [env].[Environment] SET [Hosting] = CASE WHEN [Hosting] IS NULL THEN N''Unknown'' WHEN [Hosting] = N''Cloud'' THEN N''Cloud'' ELSE N''OnPrem'' END;')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019122859_UatClientEnvironmentRules'
)
BEGIN
    EXEC(N'DELETE FROM [admin].[LookupValue] WHERE [ListName] = N''Hosting'';')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019122859_UatClientEnvironmentRules'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[env].[Environment]') AND [c].[name] = N'Hosting');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [env].[Environment] DROP CONSTRAINT ' + @var + ';');
    EXEC(N'UPDATE [env].[Environment] SET [Hosting] = N''Unknown'' WHERE [Hosting] IS NULL');
    ALTER TABLE [env].[Environment] ALTER COLUMN [Hosting] nvarchar(40) NOT NULL;
    ALTER TABLE [env].[Environment] ADD DEFAULT N'Unknown' FOR [Hosting];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019122859_UatClientEnvironmentRules'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019122859_UatClientEnvironmentRules', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    EXEC(N'INSERT INTO [iam].[UserRole] ([UserId], [Role])
                    SELECT DISTINCT r.[UserId], N''Manager'' FROM [iam].[UserRole] r
                    WHERE r.[Role] IN (N''Administrator'', N''TeamLead'')
                      AND NOT EXISTS (SELECT 1 FROM [iam].[UserRole] x WHERE x.[UserId] = r.[UserId] AND x.[Role] = N''Manager'');')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    EXEC(N'DELETE FROM [iam].[UserRole] WHERE [Role] NOT IN (N''Engineer'', N''Manager'');')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    EXEC(N'UPDATE [iam].[GroupMapping] SET [Role] = N''Manager'' WHERE [Role] IN (N''Administrator'', N''TeamLead'');')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    EXEC(N'UPDATE [iam].[GroupMapping] SET [Role] = NULL WHERE [Role] = N''ReadOnly'';')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[ProductModule] ADD [Description] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Product]') AND [c].[name] = N'Description');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Product] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [catalogue].[Product] ALTER COLUMN [Description] nvarchar(4000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD [Category] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD [OwningTeamId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD [ProductOwnerUserId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD [Technology] nvarchar(1000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE TABLE [catalogue].[ProductFeature] (
        [Id] bigint NOT NULL IDENTITY,
        [ProductId] bigint NOT NULL,
        [ModuleId] bigint NULL,
        [Name] nvarchar(150) NOT NULL,
        [Description] nvarchar(2000) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProductFeature] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductFeature_ProductModule_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [catalogue].[ProductModule] ([Id]),
        CONSTRAINT [FK_ProductFeature_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id]),
        CONSTRAINT [FK_ProductFeature_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ProductFeature_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE INDEX [IX_Product_OwningTeamId] ON [catalogue].[Product] ([OwningTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE INDEX [IX_Product_ProductOwnerUserId] ON [catalogue].[Product] ([ProductOwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE INDEX [IX_ProductFeature_CreatedById] ON [catalogue].[ProductFeature] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE INDEX [IX_ProductFeature_ModuleId] ON [catalogue].[ProductFeature] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductFeature_ProductId_Name] ON [catalogue].[ProductFeature] ([ProductId], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    CREATE INDEX [IX_ProductFeature_UpdatedById] ON [catalogue].[ProductFeature] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD CONSTRAINT [FK_Product_Team_OwningTeamId] FOREIGN KEY ([OwningTeamId]) REFERENCES [teams].[Team] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD CONSTRAINT [FK_Product_User_ProductOwnerUserId] FOREIGN KEY ([ProductOwnerUserId]) REFERENCES [iam].[User] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019125539_TwoRolesAndProducts'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019125539_TwoRolesAndProducts', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    ALTER TABLE [inventory].[Component] ADD [MicroserviceId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    CREATE TABLE [catalogue].[ProductMicroservice] (
        [Id] bigint NOT NULL IDENTITY,
        [ProductId] bigint NOT NULL,
        [ModuleId] bigint NULL,
        [Name] nvarchar(200) NOT NULL,
        [Description] nvarchar(2000) NULL,
        [Role] nvarchar(100) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ProductMicroservice] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductMicroservice_ProductModule_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [catalogue].[ProductModule] ([Id]),
        CONSTRAINT [FK_ProductMicroservice_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id]),
        CONSTRAINT [FK_ProductMicroservice_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ProductMicroservice_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Component_InstallationId_MicroserviceId] ON [inventory].[Component] ([InstallationId], [MicroserviceId]) WHERE [MicroserviceId] IS NOT NULL AND [ArchivedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    CREATE INDEX [IX_Component_MicroserviceId] ON [inventory].[Component] ([MicroserviceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    CREATE INDEX [IX_ProductMicroservice_CreatedById] ON [catalogue].[ProductMicroservice] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    CREATE INDEX [IX_ProductMicroservice_ModuleId] ON [catalogue].[ProductMicroservice] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ProductMicroservice_ProductId_Name] ON [catalogue].[ProductMicroservice] ([ProductId], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    CREATE INDEX [IX_ProductMicroservice_UpdatedById] ON [catalogue].[ProductMicroservice] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    ALTER TABLE [inventory].[Component] ADD CONSTRAINT [FK_Component_ProductMicroservice_MicroserviceId] FOREIGN KEY ([MicroserviceId]) REFERENCES [catalogue].[ProductMicroservice] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020055406_Microservices'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020055406_Microservices', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    CREATE TABLE [catalogue].[MicroserviceVersion] (
        [Id] bigint NOT NULL IDENTITY,
        [MicroserviceId] bigint NOT NULL,
        [Version] nvarchar(50) NOT NULL,
        [SortKey] nvarchar(100) NOT NULL,
        [ReleasedOn] date NULL,
        [ReleaseNotes] nvarchar(max) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_MicroserviceVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MicroserviceVersion_ProductMicroservice_MicroserviceId] FOREIGN KEY ([MicroserviceId]) REFERENCES [catalogue].[ProductMicroservice] ([Id]),
        CONSTRAINT [FK_MicroserviceVersion_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_MicroserviceVersion_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    CREATE TABLE [catalogue].[ProductDeveloper] (
        [Id] bigint NOT NULL IDENTITY,
        [ProductId] bigint NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [Role] nvarchar(40) NOT NULL,
        [Email] nvarchar(254) NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_ProductDeveloper] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProductDeveloper_Product_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [catalogue].[Product] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    CREATE INDEX [IX_MicroserviceVersion_CreatedById] ON [catalogue].[MicroserviceVersion] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    CREATE UNIQUE INDEX [IX_MicroserviceVersion_MicroserviceId_Version] ON [catalogue].[MicroserviceVersion] ([MicroserviceId], [Version]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    CREATE INDEX [IX_MicroserviceVersion_UpdatedById] ON [catalogue].[MicroserviceVersion] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    CREATE INDEX [IX_ProductDeveloper_ProductId] ON [catalogue].[ProductDeveloper] ([ProductId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020061017_MicroserviceVersionsAndDevelopers'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020061017_MicroserviceVersionsAndDevelopers', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020064354_DeployedMicroserviceVersion'
)
BEGIN
    ALTER TABLE [inventory].[ComponentHost] ADD [MicroserviceVersionId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020064354_DeployedMicroserviceVersion'
)
BEGIN
    CREATE INDEX [IX_ComponentHost_MicroserviceVersionId] ON [inventory].[ComponentHost] ([MicroserviceVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020064354_DeployedMicroserviceVersion'
)
BEGIN
    ALTER TABLE [inventory].[ComponentHost] ADD CONSTRAINT [FK_ComponentHost_MicroserviceVersion_MicroserviceVersionId] FOREIGN KEY ([MicroserviceVersionId]) REFERENCES [catalogue].[MicroserviceVersion] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020064354_DeployedMicroserviceVersion'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020064354_DeployedMicroserviceVersion', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020071917_ContractsBelongToProjects'
)
BEGIN
    EXEC(N'
    DECLARE @map TABLE (ContractId bigint PRIMARY KEY, Code nvarchar(50) NOT NULL);
    INSERT INTO @map (ContractId, Code)
    SELECT c.Id, CASE WHEN EXISTS (SELECT 1 FROM [clients].[Project] p WHERE p.[Code] = c.[Ref]) THEN CONCAT(c.[Ref], N''-'', c.[Id]) ELSE c.[Ref] END
    FROM [contracts].[Contract] c WHERE c.[ProjectId] IS NULL;
    INSERT INTO [clients].[Project] ([ClientId], [Code], [Name], [OwnerUserId], [Status], [ScopeSummary], [ServiceStart], [ServiceEnd], [LastReviewedAt],
        [ArchivedAt], [ArchivedById], [ArchiveReason], [CreatedAt], [UpdatedAt])
    SELECT c.[ClientId], m.[Code], LEFT(c.[Title], 150), c.[OwnerUserId],
        CASE WHEN c.[ArchivedAt] IS NOT NULL THEN N''Archived'' WHEN c.[Status] = N''Draft'' THEN N''Planned'' WHEN c.[Status] = N''Active'' THEN N''Active'' ELSE N''Completed'' END,
        N''Created automatically for contract '' + c.[Ref] + N'' when contracts moved under projects (release 2.8.0).'',
        c.[StartDate], c.[EndDate], c.[LastReviewedAt], c.[ArchivedAt], c.[ArchivedById], c.[ArchiveReason], SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    FROM [contracts].[Contract] c JOIN @map m ON m.[ContractId] = c.[Id];
    UPDATE c SET c.[ProjectId] = p.[Id]
    FROM [contracts].[Contract] c JOIN @map m ON m.[ContractId] = c.[Id] JOIN [clients].[Project] p ON p.[Code] = m.[Code];
    INSERT INTO [clients].[ProjectProduct] ([ProjectId], [ProductId])
    SELECT DISTINCT c.[ProjectId], cp.[ProductId]
    FROM [contracts].[ContractProduct] cp JOIN [contracts].[Contract] c ON c.[Id] = cp.[ContractId]
    WHERE NOT EXISTS (SELECT 1 FROM [clients].[ProjectProduct] pp WHERE pp.[ProjectId] = c.[ProjectId] AND pp.[ProductId] = cp.[ProductId]);')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020071917_ContractsBelongToProjects'
)
BEGIN
    DROP TABLE [contracts].[ContractProduct];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020071917_ContractsBelongToProjects'
)
BEGIN
    DROP INDEX [IX_Contract_ProjectId] ON [contracts].[Contract];
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[contracts].[Contract]') AND [c].[name] = N'ProjectId');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [contracts].[Contract] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [contracts].[Contract] ALTER COLUMN [ProjectId] bigint NOT NULL;
    CREATE INDEX [IX_Contract_ProjectId] ON [contracts].[Contract] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020071917_ContractsBelongToProjects'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020071917_ContractsBelongToProjects', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    ALTER TABLE [clients].[Client] ADD [ParentClientId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    CREATE TABLE [clients].[ClientTeamMember] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [UserId] bigint NOT NULL,
        [Role] nvarchar(100) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_ClientTeamMember] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ClientTeamMember_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_ClientTeamMember_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    CREATE INDEX [IX_Client_ParentClientId] ON [clients].[Client] ([ParentClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ClientTeamMember_ClientId_UserId] ON [clients].[ClientTeamMember] ([ClientId], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    CREATE INDEX [IX_ClientTeamMember_UserId] ON [clients].[ClientTeamMember] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    ALTER TABLE [clients].[Client] ADD CONSTRAINT [FK_Client_Client_ParentClientId] FOREIGN KEY ([ParentClientId]) REFERENCES [clients].[Client] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020101404_SubClientsAndProjectTeams'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020101404_SubClientsAndProjectTeams', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    CREATE TABLE [iam].[AppRole] (
        [Id] bigint NOT NULL IDENTITY,
        [Name] nvarchar(60) NOT NULL,
        [Description] nvarchar(300) NULL,
        [Rights] int NOT NULL,
        [Key] nvarchar(20) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_AppRole] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AppRole_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_AppRole_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    CREATE INDEX [IX_AppRole_CreatedById] ON [iam].[AppRole] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_AppRole_Key] ON [iam].[AppRole] ([Key]) WHERE [Key] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    CREATE UNIQUE INDEX [IX_AppRole_Name] ON [iam].[AppRole] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    CREATE INDEX [IX_AppRole_UpdatedById] ON [iam].[AppRole] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    EXEC(N'INSERT INTO [iam].[AppRole] ([Name], [Description], [Rights], [Key], [CreatedAt], [UpdatedAt]) VALUES (N''TIO Manager'', N''Runs the TIO team; administers the hub. Always holds every right.'', 255, N''Manager'', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()), (N''Operation Engineer'', N''Day-to-day operations work on every client.'', 113, N''Engineer'', SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [iam].[UserRole] ADD [AppRoleId] bigint NOT NULL DEFAULT CAST(0 AS bigint);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    EXEC(N'UPDATE ur SET ur.[AppRoleId] = r.[Id] FROM [iam].[UserRole] ur JOIN [iam].[AppRole] r ON r.[Key] = ur.[Role];')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    EXEC(N'DELETE ur FROM [iam].[UserRole] ur WHERE ur.[AppRoleId] = 0 OR (ur.[Role] = N''Engineer'' AND EXISTS (SELECT 1 FROM [iam].[UserRole] m WHERE m.[UserId] = ur.[UserId] AND m.[Role] = N''Manager''));')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [iam].[UserRole] DROP CONSTRAINT [PK_UserRole];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[iam].[UserRole]') AND [c].[name] = N'Role');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [iam].[UserRole] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [iam].[UserRole] DROP COLUMN [Role];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [iam].[UserRole] ADD CONSTRAINT [PK_UserRole] PRIMARY KEY ([UserId], [AppRoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    CREATE INDEX [IX_UserRole_AppRoleId] ON [iam].[UserRole] ([AppRoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [iam].[UserRole] ADD CONSTRAINT [FK_UserRole_AppRole_AppRoleId] FOREIGN KEY ([AppRoleId]) REFERENCES [iam].[AppRole] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [catalogue].[Product] ADD [ProductOwner] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    EXEC(N'UPDATE p SET p.[ProductOwner] = LEFT(u.[DisplayName], 150) FROM [catalogue].[Product] p JOIN [iam].[User] u ON u.[Id] = p.[ProductOwnerUserId];')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [catalogue].[Product] DROP CONSTRAINT [FK_Product_User_ProductOwnerUserId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    DROP INDEX [IX_Product_ProductOwnerUserId] ON [catalogue].[Product];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    DECLARE @var4 nvarchar(max);
    SELECT @var4 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Product]') AND [c].[name] = N'ProductOwnerUserId');
    IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Product] DROP CONSTRAINT ' + @var4 + ';');
    ALTER TABLE [catalogue].[Product] DROP COLUMN [ProductOwnerUserId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TechnicalOwnerContact] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TechnicalOwnerName] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020105517_ConfigurableRolesAndFreeTextOwners'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020105517_ConfigurableRolesAndFreeTextOwners', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    ALTER TABLE [admin].[LookupValue] ADD [Category] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    ALTER TABLE [env].[Environment] ADD [TypeCategory] nvarchar(40) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [TypeCategory] nvarchar(40) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [TypeCategory] nvarchar(40) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TypeCategory] nvarchar(40) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [Category], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT v.[ListName], v.[Code], v.[Label], v.[SortOrder], v.[Category], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''EnvironmentType'', N''Production'', N''Production'', 10, N''Production''), (N''EnvironmentType'', N''Staging'', N''Staging'', 20, N''Staging''), (N''EnvironmentType'', N''UAT'', N''UAT'', 30, N''UAT''), (N''EnvironmentType'', N''Test'', N''Test'', 40, N''Test''), (N''EnvironmentType'', N''DR'', N''Disaster recovery'', 50, N''DR''), (N''EnvironmentType'', N''Other'', N''Other'', 60, N''Other''), (N''AssetType'', N''VM'', N''Virtual machine (VM)'', 10, N''VM''), (N''AssetType'', N''Physical'', N''Physical server'', 20, N''Physical''), (N''AssetType'', N''LogicalEndpoint'', N''Logical endpoint'', 30, N''LogicalEndpoint''), (N''ContractType'', N''SlaSupport'', N''SLA & support'', 10, N''SlaSupport''), (N''ContractType'', N''Implementation'', N''Implementation'', 20, N''Implementation''), (N''ContractType'', N''Maintenance'', N''Maintenance'', 30, N''Maintenance''), (N''ContractType'', N''Subscription'', N''Subscription'', 40, N''Subscription''), (N''ContractType'', N''Other'', N''Other'', 50, N''Other''), (N''CaseType'', N''Incident'', N''Incident'', 10, N''Incident''), (N''CaseType'', N''Request'', N''Request'', 20, N''Request''), (N''CaseType'', N''ProblemFollowUp'', N''Problem follow-up'', 30, N''ProblemFollowUp''), (N''CaseType'', N''MaintenanceCoordination'', N''Maintenance coordination'', 40, N''MaintenanceCoordination''), (N''CaseType'', N''Improvement'', N''Improvement'', 50, N''Improvement''), (N''CaseType'', N''RiskFollowUp'', N''Risk follow-up'', 60, N''RiskFollowUp'')) AS v([ListName], [Code], [Label], [SortOrder], [Category]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = v.[ListName] AND l.[Code] = v.[Code]);')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    EXEC(N'UPDATE [env].[Environment] SET [TypeCategory] = [Type];')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    EXEC(N'UPDATE [inventory].[Asset] SET [TypeCategory] = [Type];')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    EXEC(N'UPDATE [contracts].[Contract] SET [TypeCategory] = [Type];')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    EXEC(N'UPDATE [work].[Case] SET [TypeCategory] = [Type];')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020113759_ConfigurableTypes'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020113759_ConfigurableTypes', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [inventory].[Asset] DROP CONSTRAINT [FK_Asset_User_SourceReviewerId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT [FK_Installation_User_SourceReviewerId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [inventory].[Volume] DROP CONSTRAINT [FK_Volume_User_SourceReviewerId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [work].[CaseDependency];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [network].[DependencyComponent];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [network].[EndpointAddress];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [network].[EndpointGroupMember];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [network].[Dependency];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [network].[Endpoint];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP TABLE [network].[NetworkContext];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP INDEX [IX_Volume_SourceReviewerId] ON [inventory].[Volume];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP INDEX [IX_Installation_SourceReviewerId] ON [catalogue].[Installation];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DROP INDEX [IX_Asset_SourceReviewerId] ON [inventory].[Asset];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var5 nvarchar(max);
    SELECT @var5 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Volume]') AND [c].[name] = N'SourceDocument');
    IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Volume] DROP CONSTRAINT ' + @var5 + ';');
    ALTER TABLE [inventory].[Volume] DROP COLUMN [SourceDocument];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var6 nvarchar(max);
    SELECT @var6 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Volume]') AND [c].[name] = N'SourceNotation');
    IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Volume] DROP CONSTRAINT ' + @var6 + ';');
    ALTER TABLE [inventory].[Volume] DROP COLUMN [SourceNotation];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var7 nvarchar(max);
    SELECT @var7 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Volume]') AND [c].[name] = N'SourceRange');
    IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Volume] DROP CONSTRAINT ' + @var7 + ';');
    ALTER TABLE [inventory].[Volume] DROP COLUMN [SourceRange];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var8 nvarchar(max);
    SELECT @var8 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Volume]') AND [c].[name] = N'SourceReviewerId');
    IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Volume] DROP CONSTRAINT ' + @var8 + ';');
    ALTER TABLE [inventory].[Volume] DROP COLUMN [SourceReviewerId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var9 nvarchar(max);
    SELECT @var9 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Volume]') AND [c].[name] = N'SourceSheet');
    IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Volume] DROP CONSTRAINT ' + @var9 + ';');
    ALTER TABLE [inventory].[Volume] DROP COLUMN [SourceSheet];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var10 nvarchar(max);
    SELECT @var10 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Volume]') AND [c].[name] = N'TranscribedAt');
    IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Volume] DROP CONSTRAINT ' + @var10 + ';');
    ALTER TABLE [inventory].[Volume] DROP COLUMN [TranscribedAt];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var11 nvarchar(max);
    SELECT @var11 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Installation]') AND [c].[name] = N'SourceDocument');
    IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT ' + @var11 + ';');
    ALTER TABLE [catalogue].[Installation] DROP COLUMN [SourceDocument];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var12 nvarchar(max);
    SELECT @var12 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Installation]') AND [c].[name] = N'SourceNotation');
    IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT ' + @var12 + ';');
    ALTER TABLE [catalogue].[Installation] DROP COLUMN [SourceNotation];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var13 nvarchar(max);
    SELECT @var13 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Installation]') AND [c].[name] = N'SourceRange');
    IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT ' + @var13 + ';');
    ALTER TABLE [catalogue].[Installation] DROP COLUMN [SourceRange];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var14 nvarchar(max);
    SELECT @var14 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Installation]') AND [c].[name] = N'SourceReviewerId');
    IF @var14 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT ' + @var14 + ';');
    ALTER TABLE [catalogue].[Installation] DROP COLUMN [SourceReviewerId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var15 nvarchar(max);
    SELECT @var15 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Installation]') AND [c].[name] = N'SourceSheet');
    IF @var15 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT ' + @var15 + ';');
    ALTER TABLE [catalogue].[Installation] DROP COLUMN [SourceSheet];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var16 nvarchar(max);
    SELECT @var16 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[catalogue].[Installation]') AND [c].[name] = N'TranscribedAt');
    IF @var16 IS NOT NULL EXEC(N'ALTER TABLE [catalogue].[Installation] DROP CONSTRAINT ' + @var16 + ';');
    ALTER TABLE [catalogue].[Installation] DROP COLUMN [TranscribedAt];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var17 nvarchar(max);
    SELECT @var17 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Asset]') AND [c].[name] = N'SourceDocument');
    IF @var17 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Asset] DROP CONSTRAINT ' + @var17 + ';');
    ALTER TABLE [inventory].[Asset] DROP COLUMN [SourceDocument];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var18 nvarchar(max);
    SELECT @var18 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Asset]') AND [c].[name] = N'SourceNotation');
    IF @var18 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Asset] DROP CONSTRAINT ' + @var18 + ';');
    ALTER TABLE [inventory].[Asset] DROP COLUMN [SourceNotation];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var19 nvarchar(max);
    SELECT @var19 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Asset]') AND [c].[name] = N'SourceRange');
    IF @var19 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Asset] DROP CONSTRAINT ' + @var19 + ';');
    ALTER TABLE [inventory].[Asset] DROP COLUMN [SourceRange];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var20 nvarchar(max);
    SELECT @var20 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Asset]') AND [c].[name] = N'SourceReviewerId');
    IF @var20 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Asset] DROP CONSTRAINT ' + @var20 + ';');
    ALTER TABLE [inventory].[Asset] DROP COLUMN [SourceReviewerId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    DECLARE @var21 nvarchar(max);
    SELECT @var21 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[inventory].[Asset]') AND [c].[name] = N'TranscribedAt');
    IF @var21 IS NOT NULL EXEC(N'ALTER TABLE [inventory].[Asset] DROP CONSTRAINT ' + @var21 + ';');
    ALTER TABLE [inventory].[Asset] DROP COLUMN [TranscribedAt];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    IF SCHEMA_ID(N'notify') IS NULL EXEC(N'CREATE SCHEMA [notify];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    EXEC sp_rename N'[inventory].[Asset].[SourceSheet]', N'TechnicalOwnerTitle', 'COLUMN';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD [PersonEmail] nvarchar(254) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD [PersonMobile] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD [PersonName] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD [PersonPhone] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD [PersonTitle] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD [ResponsibleUserId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TechnicalOwnerEmail] nvarchar(254) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TechnicalOwnerMobile] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TechnicalOwnerOrganization] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [TechnicalOwnerPhone] nvarchar(30) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE TABLE [network].[FirewallRule] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [EnvironmentId] bigint NOT NULL,
        [SourceAssetId] bigint NOT NULL,
        [DestinationAssetId] bigint NOT NULL,
        [Ports] nvarchar(200) NULL,
        [Protocol] nvarchar(40) NOT NULL,
        [Direction] nvarchar(40) NOT NULL,
        [Purpose] nvarchar(500) NOT NULL,
        [Notes] nvarchar(2000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_FirewallRule] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_FirewallRule_Asset_DestinationAssetId] FOREIGN KEY ([DestinationAssetId]) REFERENCES [inventory].[Asset] ([Id]),
        CONSTRAINT [FK_FirewallRule_Asset_SourceAssetId] FOREIGN KEY ([SourceAssetId]) REFERENCES [inventory].[Asset] ([Id]),
        CONSTRAINT [FK_FirewallRule_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_FirewallRule_Environment_EnvironmentId] FOREIGN KEY ([EnvironmentId]) REFERENCES [env].[Environment] ([Id]),
        CONSTRAINT [FK_FirewallRule_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_FirewallRule_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE TABLE [notify].[Notification] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [Kind] nvarchar(20) NOT NULL,
        [Title] nvarchar(200) NOT NULL,
        [Body] nvarchar(500) NULL,
        [Link] nvarchar(300) NULL,
        [Key] nvarchar(200) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [ReadAt] datetimeoffset NULL,
        CONSTRAINT [PK_Notification] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notification_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_ResponsibilityBoundary_ResponsibleUserId] ON [clients].[ResponsibilityBoundary] ([ResponsibleUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_FirewallRule_ClientId] ON [network].[FirewallRule] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_FirewallRule_CreatedById] ON [network].[FirewallRule] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_FirewallRule_DestinationAssetId] ON [network].[FirewallRule] ([DestinationAssetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_FirewallRule_EnvironmentId] ON [network].[FirewallRule] ([EnvironmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_FirewallRule_SourceAssetId] ON [network].[FirewallRule] ([SourceAssetId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_FirewallRule_UpdatedById] ON [network].[FirewallRule] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Notification_UserId_Key] ON [notify].[Notification] ([UserId], [Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    CREATE INDEX [IX_Notification_UserId_ReadAt] ON [notify].[Notification] ([UserId], [ReadAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    ALTER TABLE [clients].[ResponsibilityBoundary] ADD CONSTRAINT [FK_ResponsibilityBoundary_User_ResponsibleUserId] FOREIGN KEY ([ResponsibleUserId]) REFERENCES [iam].[User] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    EXEC(N'DELETE FROM [quality].[DataQualityItem] WHERE [Rule] IN (N''UnresolvedEndpoint'', N''PlaceholderNotation'') OR [RecordType] IN (N''Endpoint'', N''Dependency'');')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    EXEC(N'DELETE FROM [quality].[Review] WHERE [RecordType] IN (N''Endpoint'', N''Dependency'');')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    EXEC(N'DELETE FROM [quality].[DocumentReference] WHERE [RecordType] IN (N''Endpoint'', N''Dependency'');')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT N''TeamRole'', v.[Label], v.[Label], v.[SortOrder], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''Operation engineer'', 10), (N''Backup operation engineer'', 20), (N''DevOps engineer'', 30), (N''Support engineer'', 40), (N''Developer'', 50), (N''Project coordinator'', 60)) AS v([Label], [SortOrder]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''TeamRole'' AND l.[Code] = v.[Label]);')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT DISTINCT N''TeamRole'', t.[Role], t.[Role], 900, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM [clients].[ClientTeamMember] t WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''TeamRole'' AND l.[Code] = t.[Role]);')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261020152505_FirewallRulesContactsNotifications'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261020152505_FirewallRulesContactsNotifications', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE SEQUENCE [work].[EscalationNumbers] AS int START WITH 1001 INCREMENT BY 1 NO CYCLE;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE TABLE [work].[Escalation] (
        [Id] bigint NOT NULL IDENTITY,
        [Ref] nvarchar(20) NOT NULL DEFAULT (CONCAT('ESC-', NEXT VALUE FOR [work].[EscalationNumbers])),
        [ClientId] bigint NOT NULL,
        [ProjectId] bigint NULL,
        [ContractId] bigint NULL,
        [CaseId] bigint NULL,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(4000) NULL,
        [Direction] nvarchar(40) NOT NULL,
        [Channel] nvarchar(100) NOT NULL,
        [ChannelReference] nvarchar(300) NULL,
        [Priority] nvarchar(40) NOT NULL,
        [Level] int NOT NULL,
        [CounterpartName] nvarchar(150) NULL,
        [CounterpartTitle] nvarchar(100) NULL,
        [CounterpartOrganization] nvarchar(150) NULL,
        [CounterpartPhone] nvarchar(30) NULL,
        [CounterpartMobile] nvarchar(30) NULL,
        [CounterpartEmail] nvarchar(254) NULL,
        [ReceivedAt] datetimeoffset NOT NULL,
        [OwnerUserId] bigint NOT NULL,
        [ResponseDueAt] datetimeoffset NULL,
        [ResolutionDueAt] datetimeoffset NULL,
        [Status] nvarchar(40) NOT NULL,
        [AcknowledgedAt] datetimeoffset NULL,
        [ResolvedAt] datetimeoffset NULL,
        [ClosedAt] datetimeoffset NULL,
        [ResolutionSummary] nvarchar(2000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Escalation] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Escalation_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_Escalation_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Escalation_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id]),
        CONSTRAINT [FK_Escalation_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_Escalation_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Escalation_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Escalation_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE TABLE [work].[EscalationEvent] (
        [Id] bigint NOT NULL IDENTITY,
        [EscalationId] bigint NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [Status] nvarchar(40) NULL,
        [Channel] nvarchar(100) NULL,
        [Outgoing] bit NULL,
        [Level] int NULL,
        [Note] nvarchar(4000) NULL,
        [At] datetimeoffset NOT NULL,
        [ById] bigint NULL,
        CONSTRAINT [PK_EscalationEvent] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EscalationEvent_Escalation_EscalationId] FOREIGN KEY ([EscalationId]) REFERENCES [work].[Escalation] ([Id]),
        CONSTRAINT [FK_EscalationEvent_User_ById] FOREIGN KEY ([ById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_CaseId] ON [work].[Escalation] ([CaseId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_ClientId] ON [work].[Escalation] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_ContractId] ON [work].[Escalation] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_CreatedById] ON [work].[Escalation] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_OwnerUserId] ON [work].[Escalation] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_ProjectId] ON [work].[Escalation] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Escalation_Ref] ON [work].[Escalation] ([Ref]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_Status_ResolutionDueAt] ON [work].[Escalation] ([Status], [ResolutionDueAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_Escalation_UpdatedById] ON [work].[Escalation] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_EscalationEvent_ById] ON [work].[EscalationEvent] ([ById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    CREATE INDEX [IX_EscalationEvent_EscalationId] ON [work].[EscalationEvent] ([EscalationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    EXEC(N'INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) SELECT N''EscalationChannel'', v.[Code], v.[Label], v.[SortOrder], 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM (VALUES (N''Email'', N''E-mail'', 10), (N''FormalLetter'', N''Formal letter'', 20), (N''Verbal'', N''Verbal (call or meeting)'', 30), (N''Jira'', N''Jira'', 40)) AS v([Code], [Label], [SortOrder]) WHERE NOT EXISTS (SELECT 1 FROM [admin].[LookupValue] l WHERE l.[ListName] = N''EscalationChannel'' AND l.[Code] = v.[Code]);')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021053350_Escalations'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261021053350_Escalations', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    IF SCHEMA_ID(N'files') IS NULL EXEC(N'CREATE SCHEMA [files];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    CREATE TABLE [files].[Attachment] (
        [Id] bigint NOT NULL IDENTITY,
        [RecordType] nvarchar(40) NOT NULL,
        [RecordId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [TeamId] bigint NULL,
        [FileName] nvarchar(255) NOT NULL,
        [StoredPath] nvarchar(100) NOT NULL,
        [ContentType] nvarchar(150) NOT NULL,
        [SizeBytes] bigint NOT NULL,
        [Sha256] nvarchar(64) NOT NULL,
        [Description] nvarchar(500) NULL,
        [UploadedById] bigint NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Attachment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Attachment_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Attachment_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Attachment_User_UploadedById] FOREIGN KEY ([UploadedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    CREATE INDEX [IX_Attachment_CreatedById] ON [files].[Attachment] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    CREATE INDEX [IX_Attachment_RecordType_RecordId] ON [files].[Attachment] ([RecordType], [RecordId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    CREATE INDEX [IX_Attachment_UpdatedById] ON [files].[Attachment] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    CREATE INDEX [IX_Attachment_UploadedById] ON [files].[Attachment] ([UploadedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021080652_Attachments'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261021080652_Attachments', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    IF SCHEMA_ID(N'notes') IS NULL EXEC(N'CREATE SCHEMA [notes];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE TABLE [notes].[Notebook] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerUserId] bigint NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Color] nvarchar(20) NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Notebook] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Notebook_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Notebook_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Notebook_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE TABLE [notes].[NoteSection] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerUserId] bigint NOT NULL,
        [NotebookId] bigint NOT NULL,
        [Name] nvarchar(100) NOT NULL,
        [Color] nvarchar(20) NOT NULL,
        [SortOrder] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_NoteSection] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NoteSection_Notebook_NotebookId] FOREIGN KEY ([NotebookId]) REFERENCES [notes].[Notebook] ([Id]),
        CONSTRAINT [FK_NoteSection_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_NoteSection_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_NoteSection_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE TABLE [notes].[NotePage] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerUserId] bigint NOT NULL,
        [SectionId] bigint NOT NULL,
        [Title] nvarchar(300) NOT NULL,
        [ContentHtml] nvarchar(max) NOT NULL,
        [ContentText] nvarchar(max) NOT NULL,
        [SortOrder] int NOT NULL,
        [Level] int NOT NULL,
        [IsPinned] bit NOT NULL,
        [ClientId] bigint NULL,
        [ProjectId] bigint NULL,
        [LinkLabel] nvarchar(300) NULL,
        [DeletedAt] datetimeoffset NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_NotePage] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NotePage_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_NotePage_NoteSection_SectionId] FOREIGN KEY ([SectionId]) REFERENCES [notes].[NoteSection] ([Id]),
        CONSTRAINT [FK_NotePage_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_NotePage_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_NotePage_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_NotePage_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE TABLE [notes].[NoteFile] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerUserId] bigint NOT NULL,
        [PageId] bigint NOT NULL,
        [FileName] nvarchar(255) NOT NULL,
        [StoredPath] nvarchar(100) NOT NULL,
        [ContentType] nvarchar(150) NOT NULL,
        [SizeBytes] bigint NOT NULL,
        [Sha256] nvarchar(64) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_NoteFile] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NoteFile_NotePage_PageId] FOREIGN KEY ([PageId]) REFERENCES [notes].[NotePage] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_Notebook_CreatedById] ON [notes].[Notebook] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_Notebook_OwnerUserId_SortOrder] ON [notes].[Notebook] ([OwnerUserId], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_Notebook_UpdatedById] ON [notes].[Notebook] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NoteFile_OwnerUserId_PageId] ON [notes].[NoteFile] ([OwnerUserId], [PageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NoteFile_PageId] ON [notes].[NoteFile] ([PageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_ClientId] ON [notes].[NotePage] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_CreatedById] ON [notes].[NotePage] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_OwnerUserId_ClientId] ON [notes].[NotePage] ([OwnerUserId], [ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_OwnerUserId_ProjectId] ON [notes].[NotePage] ([OwnerUserId], [ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_OwnerUserId_SectionId_SortOrder] ON [notes].[NotePage] ([OwnerUserId], [SectionId], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_ProjectId] ON [notes].[NotePage] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_SectionId] ON [notes].[NotePage] ([SectionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NotePage_UpdatedById] ON [notes].[NotePage] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NoteSection_CreatedById] ON [notes].[NoteSection] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NoteSection_NotebookId] ON [notes].[NoteSection] ([NotebookId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NoteSection_OwnerUserId_NotebookId_SortOrder] ON [notes].[NoteSection] ([OwnerUserId], [NotebookId], [SortOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    CREATE INDEX [IX_NoteSection_UpdatedById] ON [notes].[NoteSection] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021103157_PersonalNotes'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261021103157_PersonalNotes', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [Currency] nvarchar(3) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [Support24x7] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [SupportDays] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [SupportFrom] time NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [SupportTo] time NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE TABLE [contracts].[ContractFee] (
        [Id] bigint NOT NULL IDENTITY,
        [ContractId] bigint NOT NULL,
        [SortOrder] int NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Unit] nvarchar(50) NULL,
        [Quantity] decimal(18,2) NULL,
        [UnitPrice] decimal(18,2) NULL,
        CONSTRAINT [PK_ContractFee] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContractFee_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE TABLE [contracts].[ContractMilestone] (
        [Id] bigint NOT NULL IDENTITY,
        [ContractId] bigint NOT NULL,
        [SortOrder] int NOT NULL,
        [Phase] nvarchar(150) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [CompletionPercent] int NULL,
        [Date] date NULL,
        CONSTRAINT [PK_ContractMilestone] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContractMilestone_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE TABLE [contracts].[ContractPayment] (
        [Id] bigint NOT NULL IDENTITY,
        [ContractId] bigint NOT NULL,
        [SortOrder] int NOT NULL,
        [Condition] nvarchar(500) NOT NULL,
        [Percentage] decimal(5,2) NULL,
        [Amount] decimal(18,2) NULL,
        [DueDate] date NULL,
        [Status] nvarchar(20) NOT NULL,
        [PaidOn] date NULL,
        [Notes] nvarchar(1000) NULL,
        CONSTRAINT [PK_ContractPayment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContractPayment_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE INDEX [IX_ContractFee_ContractId] ON [contracts].[ContractFee] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE INDEX [IX_ContractMilestone_ContractId] ON [contracts].[ContractMilestone] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE INDEX [IX_ContractPayment_ContractId] ON [contracts].[ContractPayment] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    CREATE INDEX [IX_ContractPayment_Status_DueDate] ON [contracts].[ContractPayment] ([Status], [DueDate]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    EXEC(N'UPDATE [contracts].[Contract] SET [Support24x7] = 1 WHERE [SupportHours] LIKE N''%24%7%'' OR [SupportHours] LIKE N''%round the clock%'';')
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021105909_ContractTermsAndPayments'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261021105909_ContractTermsAndPayments', N'10.0.13');
END;

COMMIT;
GO

