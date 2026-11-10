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

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022085746_VersionReleaseNotesAndFeatures'
)
BEGIN
    ALTER TABLE [catalogue].[ProductVersion] ADD [ReleaseNotes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022085746_VersionReleaseNotesAndFeatures'
)
BEGIN
    ALTER TABLE [catalogue].[ProductFeature] ADD [IntroducedInVersionId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022085746_VersionReleaseNotesAndFeatures'
)
BEGIN
    CREATE INDEX [IX_ProductFeature_IntroducedInVersionId] ON [catalogue].[ProductFeature] ([IntroducedInVersionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022085746_VersionReleaseNotesAndFeatures'
)
BEGIN
    ALTER TABLE [catalogue].[ProductFeature] ADD CONSTRAINT [FK_ProductFeature_ProductVersion_IntroducedInVersionId] FOREIGN KEY ([IntroducedInVersionId]) REFERENCES [catalogue].[ProductVersion] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022085746_VersionReleaseNotesAndFeatures'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022085746_VersionReleaseNotesAndFeatures', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [contracts].[Contract] ADD [SlaPauseWhileWaitingOnCustomer] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ContractId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [FirstResponseAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResolutionDueAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResolutionElapsedMinutes] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResolutionSlaStatus] nvarchar(40) NOT NULL DEFAULT N'NotApplicable';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResolvedAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResponseDueAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResponseElapsedMinutes] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ResponseSlaStatus] nvarchar(40) NOT NULL DEFAULT N'NotApplicable';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaAppliedAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaBasis] nvarchar(40) NOT NULL DEFAULT N'Unknown';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaCalculatedAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaContractRef] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaNote] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaPauseOnCustomerWaiting] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaPausedMinutes] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaPriority] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaResolutionMinutes] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaResponseMinutes] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaSupport24x7] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaSupportDays] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaSupportFrom] time NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaSupportTo] time NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaTimeZone] nvarchar(64) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    CREATE INDEX [IX_Case_ContractId_CreatedAt] ON [work].[Case] ([ContractId], [CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    CREATE INDEX [IX_Case_ResolutionSlaStatus_ResolutionDueAt] ON [work].[Case] ([ResolutionSlaStatus], [ResolutionDueAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    CREATE INDEX [IX_Case_ResponseSlaStatus_ResponseDueAt] ON [work].[Case] ([ResponseSlaStatus], [ResponseDueAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    ALTER TABLE [work].[Case] ADD CONSTRAINT [FK_Case_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022115328_CaseContractualSla'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022115328_CaseContractualSla', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    IF SCHEMA_ID(N'reporting') IS NULL EXEC(N'CREATE SCHEMA [reporting];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE TABLE [reporting].[ExportJob] (
        [Id] bigint NOT NULL IDENTITY,
        [AuditId] uniqueidentifier NOT NULL,
        [UserId] bigint NOT NULL,
        [Report] nvarchar(60) NOT NULL,
        [ReportName] nvarchar(120) NOT NULL,
        [Format] nvarchar(40) NOT NULL,
        [FiltersJson] nvarchar(4000) NOT NULL,
        [FilterSummary] nvarchar(2000) NOT NULL,
        [ColumnsJson] nvarchar(2000) NULL,
        [TimeZone] nvarchar(64) NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [RequestedAt] datetimeoffset NOT NULL,
        [StartedAt] datetimeoffset NULL,
        [CompletedAt] datetimeoffset NULL,
        [RowCount] int NULL,
        [FileSize] bigint NULL,
        [FileName] nvarchar(200) NULL,
        [StoredPath] nvarchar(300) NULL,
        [ExpiresAt] datetimeoffset NULL,
        [Error] nvarchar(1000) NULL,
        [Source] nvarchar(40) NOT NULL,
        [ScheduleId] bigint NULL,
        [RetryOfId] bigint NULL,
        CONSTRAINT [PK_ExportJob] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ExportJob_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE TABLE [reporting].[ReportPreset] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [Report] nvarchar(60) NOT NULL,
        [Name] nvarchar(80) NOT NULL,
        [FiltersJson] nvarchar(4000) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_ReportPreset] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE TABLE [reporting].[ReportSchedule] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerUserId] bigint NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [Report] nvarchar(60) NOT NULL,
        [FiltersJson] nvarchar(4000) NOT NULL,
        [FilterSummary] nvarchar(2000) NOT NULL,
        [Format] nvarchar(40) NOT NULL,
        [Frequency] nvarchar(40) NOT NULL,
        [DayOfWeek] int NULL,
        [DayOfMonth] int NULL,
        [TimeOfDay] time NOT NULL,
        [TimeZone] nvarchar(64) NOT NULL,
        [IsActive] bit NOT NULL,
        [NextRunAt] datetimeoffset NOT NULL,
        [LastRunAt] datetimeoffset NULL,
        [LastOutcome] nvarchar(200) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_ReportSchedule] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportSchedule_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE TABLE [reporting].[ReportScheduleRecipient] (
        [Id] bigint NOT NULL IDENTITY,
        [ScheduleId] bigint NOT NULL,
        [UserId] bigint NOT NULL,
        CONSTRAINT [PK_ReportScheduleRecipient] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ReportScheduleRecipient_ReportSchedule_ScheduleId] FOREIGN KEY ([ScheduleId]) REFERENCES [reporting].[ReportSchedule] ([Id]),
        CONSTRAINT [FK_ReportScheduleRecipient_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ExportJob_AuditId] ON [reporting].[ExportJob] ([AuditId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE INDEX [IX_ExportJob_ScheduleId] ON [reporting].[ExportJob] ([ScheduleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE INDEX [IX_ExportJob_Status_ExpiresAt] ON [reporting].[ExportJob] ([Status], [ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE INDEX [IX_ExportJob_UserId_RequestedAt] ON [reporting].[ExportJob] ([UserId], [RequestedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportPreset_UserId_Report_Name] ON [reporting].[ReportPreset] ([UserId], [Report], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE INDEX [IX_ReportSchedule_IsActive_NextRunAt] ON [reporting].[ReportSchedule] ([IsActive], [NextRunAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE INDEX [IX_ReportSchedule_OwnerUserId] ON [reporting].[ReportSchedule] ([OwnerUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ReportScheduleRecipient_ScheduleId_UserId] ON [reporting].[ReportScheduleRecipient] ([ScheduleId], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    CREATE INDEX [IX_ReportScheduleRecipient_UserId] ON [reporting].[ReportScheduleRecipient] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261022153342_ReportingCenter'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261022153342_ReportingCenter', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023080108_ResourcePermissionMatrix'
)
BEGIN
    CREATE TABLE [iam].[AppRolePermission] (
        [AppRoleId] bigint NOT NULL,
        [Resource] nvarchar(40) NOT NULL,
        [Action] nvarchar(40) NOT NULL,
        CONSTRAINT [PK_AppRolePermission] PRIMARY KEY ([AppRoleId], [Resource], [Action]),
        CONSTRAINT [FK_AppRolePermission_AppRole_AppRoleId] FOREIGN KEY ([AppRoleId]) REFERENCES [iam].[AppRole] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023080108_ResourcePermissionMatrix'
)
BEGIN
    INSERT INTO [iam].[AppRolePermission] ([AppRoleId], [Resource], [Action])
    SELECT r.[Id], p.[Resource], p.[Action]
    FROM [iam].[AppRole] AS r
    CROSS APPLY (VALUES
        (N'ClientStructure', N'Maintain', 1),
        (N'ClientStructure', N'Create', 2),
        (N'ClientStructure', N'Coordinate', 2),
        (N'ClientStructure', N'ArchiveRestore', 4),
        (N'ClientStructure', N'Delete', 8),
        (N'Contracts', N'Maintain', 1),
        (N'Contracts', N'Create', 1),
        (N'Contracts', N'Coordinate', 2),
        (N'Contracts', N'ArchiveRestore', 4),
        (N'Contracts', N'Delete', 8),
        (N'Environments', N'Maintain', 1),
        (N'Environments', N'Create', 1),
        (N'Environments', N'Coordinate', 2),
        (N'Environments', N'ArchiveRestore', 4),
        (N'Environments', N'Delete', 8),
        (N'Servers', N'Maintain', 1),
        (N'Servers', N'Create', 1),
        (N'Servers', N'Coordinate', 2),
        (N'Servers', N'ArchiveRestore', 4),
        (N'Servers', N'Delete', 8),
        (N'Installations', N'Maintain', 1),
        (N'Installations', N'Create', 1),
        (N'Installations', N'Coordinate', 2),
        (N'Installations', N'ArchiveRestore', 4),
        (N'Installations', N'Delete', 8),
        (N'Products', N'Maintain', 1),
        (N'Products', N'Create', 1),
        (N'Products', N'Coordinate', 2),
        (N'Products', N'ArchiveRestore', 4),
        (N'Products', N'Delete', 8),
        (N'Cases', N'Maintain', 1),
        (N'Cases', N'Create', 1),
        (N'Cases', N'Coordinate', 2),
        (N'Cases', N'ArchiveRestore', 4),
        (N'Cases', N'Delete', 8),
        (N'Commitments', N'Maintain', 1),
        (N'Commitments', N'Create', 1),
        (N'Commitments', N'Coordinate', 2),
        (N'Commitments', N'ArchiveRestore', 4),
        (N'Commitments', N'Delete', 8),
        (N'Teams', N'Maintain', 1),
        (N'Teams', N'Create', 2),
        (N'Teams', N'Coordinate', 2),
        (N'Teams', N'ArchiveRestore', 4),
        (N'Teams', N'Delete', 8),
        (N'OtherOperations', N'Maintain', 1),
        (N'OtherOperations', N'Create', 1),
        (N'OtherOperations', N'Coordinate', 2),
        (N'OtherOperations', N'ArchiveRestore', 4),
        (N'OtherOperations', N'Delete', 8)
    ) AS p([Resource], [Action], [LegacyRight])
    WHERE (r.[Rights] & p.[LegacyRight]) = p.[LegacyRight];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023080108_ResourcePermissionMatrix'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261023080108_ResourcePermissionMatrix', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023081028_ContractPenaltyClauses'
)
BEGIN
    CREATE TABLE [contracts].[ContractPenaltyClause] (
        [Id] bigint NOT NULL IDENTITY,
        [ContractId] bigint NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [Trigger] nvarchar(40) NOT NULL,
        [Calculation] nvarchar(30) NOT NULL,
        [FixedAmount] decimal(18,4) NULL,
        [Percentage] decimal(5,2) NULL,
        [ReferenceAmount] decimal(18,4) NULL,
        [MonthlyCap] decimal(18,4) NULL,
        [BillingTimeZone] nvarchar(64) NULL,
        CONSTRAINT [PK_ContractPenaltyClause] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ContractPenaltyClause_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023081028_ContractPenaltyClauses'
)
BEGIN
    CREATE INDEX [IX_ContractPenaltyClause_ContractId] ON [contracts].[ContractPenaltyClause] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023081028_ContractPenaltyClauses'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261023081028_ContractPenaltyClauses', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023082258_PenaltyAssessmentSnapshots'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [PenaltyTermsSnapshotJson] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023082258_PenaltyAssessmentSnapshots'
)
BEGIN
    CREATE TABLE [contracts].[PenaltyAssessment] (
        [Id] bigint NOT NULL IDENTITY,
        [ContractId] bigint NOT NULL,
        [ClauseId] bigint NOT NULL,
        [TermsKey] nvarchar(64) NOT NULL,
        [TermsSnapshotJson] nvarchar(2000) NOT NULL,
        [BillingMonth] date NOT NULL,
        [UncappedAmount] decimal(18,4) NOT NULL,
        [Amount] decimal(18,4) NOT NULL,
        [BreachCount] int NOT NULL,
        [BreachIdentitiesJson] nvarchar(4000) NOT NULL,
        [Currency] nvarchar(3) NOT NULL,
        [CalculatedAt] datetimeoffset NOT NULL,
        [ReviewedAt] datetimeoffset NULL,
        [ReviewedById] bigint NULL,
        [ReviewReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PenaltyAssessment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PenaltyAssessment_Contract_ContractId] FOREIGN KEY ([ContractId]) REFERENCES [contracts].[Contract] ([Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_PenaltyAssessment_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_PenaltyAssessment_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023082258_PenaltyAssessmentSnapshots'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PenaltyAssessment_ContractId_ClauseId_BillingMonth_TermsKey] ON [contracts].[PenaltyAssessment] ([ContractId], [ClauseId], [BillingMonth], [TermsKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023082258_PenaltyAssessmentSnapshots'
)
BEGIN
    CREATE INDEX [IX_PenaltyAssessment_CreatedById] ON [contracts].[PenaltyAssessment] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023082258_PenaltyAssessmentSnapshots'
)
BEGIN
    CREATE INDEX [IX_PenaltyAssessment_UpdatedById] ON [contracts].[PenaltyAssessment] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023082258_PenaltyAssessmentSnapshots'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261023082258_PenaltyAssessmentSnapshots', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE TABLE [clients].[Organization] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NULL,
        [Name] nvarchar(150) NULL,
        [Code] nvarchar(50) NULL,
        [OrganizationType] nvarchar(100) NULL,
        [Description] nvarchar(2000) NULL,
        [Email] nvarchar(254) NULL,
        [Phone] nvarchar(100) NULL,
        [Address] nvarchar(1000) NULL,
        [Status] nvarchar(100) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_Organization] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_Organization_Identity] CHECK ([ClientId] IS NOT NULL OR (LEN(LTRIM(RTRIM([Name]))) > 0 AND [Name] IS NOT NULL)),
        CONSTRAINT [FK_Organization_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_Organization_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_Organization_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE TABLE [clients].[OrganizationRelationship] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [ProjectId] bigint NULL,
        [ProjectScope] AS ISNULL([ProjectId], CONVERT(bigint, 0)) PERSISTED,
        [ParentOrganizationId] bigint NOT NULL,
        [ChildOrganizationId] bigint NOT NULL,
        [RelationshipType] nvarchar(100) NULL,
        [Description] nvarchar(2000) NULL,
        [StartDate] date NULL,
        [EndDate] date NULL,
        [SortOrder] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_OrganizationRelationship] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_OrganizationRelationship_Dates] CHECK ([StartDate] IS NULL OR [EndDate] IS NULL OR [EndDate] >= [StartDate]),
        CONSTRAINT [CK_OrganizationRelationship_NotSelf] CHECK ([ParentOrganizationId] <> [ChildOrganizationId]),
        CONSTRAINT [FK_OrganizationRelationship_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_OrganizationRelationship_Organization_ChildOrganizationId] FOREIGN KEY ([ChildOrganizationId]) REFERENCES [clients].[Organization] ([Id]),
        CONSTRAINT [FK_OrganizationRelationship_Organization_ParentOrganizationId] FOREIGN KEY ([ParentOrganizationId]) REFERENCES [clients].[Organization] ([Id]),
        CONSTRAINT [FK_OrganizationRelationship_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_OrganizationRelationship_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_OrganizationRelationship_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Organization_ClientId] ON [clients].[Organization] ([ClientId]) WHERE [ClientId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_Organization_Code] ON [clients].[Organization] ([Code]) WHERE [Code] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_Organization_CreatedById] ON [clients].[Organization] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_Organization_UpdatedById] ON [clients].[Organization] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_OrganizationRelationship_ChildOrganizationId] ON [clients].[OrganizationRelationship] ([ChildOrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_OrganizationRelationship_ClientId_ProjectId_ChildOrganizationId] ON [clients].[OrganizationRelationship] ([ClientId], [ProjectId], [ChildOrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE UNIQUE INDEX [IX_OrganizationRelationship_ClientId_ProjectScope_ParentOrganizationId_ChildOrganizationId] ON [clients].[OrganizationRelationship] ([ClientId], [ProjectScope], [ParentOrganizationId], [ChildOrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_OrganizationRelationship_CreatedById] ON [clients].[OrganizationRelationship] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_OrganizationRelationship_ParentOrganizationId] ON [clients].[OrganizationRelationship] ([ParentOrganizationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_OrganizationRelationship_ProjectId] ON [clients].[OrganizationRelationship] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    CREATE INDEX [IX_OrganizationRelationship_UpdatedById] ON [clients].[OrganizationRelationship] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    INSERT INTO [clients].[Organization] ([ClientId], [CreatedAt], [UpdatedAt])
    SELECT [Id], [CreatedAt], [UpdatedAt] FROM [clients].[Client];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261023100730_OptionalOrganizationGraph'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261023100730_OptionalOrganizationGraph', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ReportSchedule] ADD [OptionsJson] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ReportSchedule] ADD [SavedReportId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [Attempts] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [CancelRequested] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [CutoffAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [DefinitionJson] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [IdempotencyKey] nvarchar(80) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [NotBefore] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [OptionsJson] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [SavedReportId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE TABLE [reporting].[SavedReport] (
        [Id] bigint NOT NULL IDENTITY,
        [OwnerUserId] bigint NOT NULL,
        [ReportType] nvarchar(40) NOT NULL,
        [Name] nvarchar(120) NOT NULL,
        [Description] nvarchar(1000) NULL,
        [Visibility] nvarchar(40) NOT NULL,
        [TeamId] bigint NULL,
        [SchemaVersion] int NOT NULL,
        [DefinitionJson] nvarchar(max) NOT NULL,
        [Revision] int NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [LastRunAt] datetimeoffset NULL,
        CONSTRAINT [PK_SavedReport] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SavedReport_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_SavedReport_User_OwnerUserId] FOREIGN KEY ([OwnerUserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE TABLE [reporting].[SavedReportFavorite] (
        [Id] bigint NOT NULL IDENTITY,
        [SavedReportId] bigint NOT NULL,
        [UserId] bigint NOT NULL,
        CONSTRAINT [PK_SavedReportFavorite] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SavedReportFavorite_SavedReport_SavedReportId] FOREIGN KEY ([SavedReportId]) REFERENCES [reporting].[SavedReport] ([Id]),
        CONSTRAINT [FK_SavedReportFavorite_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE TABLE [reporting].[SavedReportShare] (
        [Id] bigint NOT NULL IDENTITY,
        [SavedReportId] bigint NOT NULL,
        [UserId] bigint NOT NULL,
        CONSTRAINT [PK_SavedReportShare] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SavedReportShare_SavedReport_SavedReportId] FOREIGN KEY ([SavedReportId]) REFERENCES [reporting].[SavedReport] ([Id]),
        CONSTRAINT [FK_SavedReportShare_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_ReportSchedule_SavedReportId] ON [reporting].[ReportSchedule] ([SavedReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_ExportJob_SavedReportId] ON [reporting].[ExportJob] ([SavedReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_ExportJob_Status_NotBefore] ON [reporting].[ExportJob] ([Status], [NotBefore]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ExportJob_UserId_IdempotencyKey] ON [reporting].[ExportJob] ([UserId], [IdempotencyKey]) WHERE [IdempotencyKey] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_Case_CreatedAt] ON [work].[Case] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SavedReport_OwnerUserId_Name] ON [reporting].[SavedReport] ([OwnerUserId], [Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_SavedReport_TeamId] ON [reporting].[SavedReport] ([TeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_SavedReport_Visibility_TeamId] ON [reporting].[SavedReport] ([Visibility], [TeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_SavedReportFavorite_SavedReportId] ON [reporting].[SavedReportFavorite] ([SavedReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SavedReportFavorite_UserId_SavedReportId] ON [reporting].[SavedReportFavorite] ([UserId], [SavedReportId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE UNIQUE INDEX [IX_SavedReportShare_SavedReportId_UserId] ON [reporting].[SavedReportShare] ([SavedReportId], [UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    CREATE INDEX [IX_SavedReportShare_UserId] ON [reporting].[SavedReportShare] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD CONSTRAINT [FK_ExportJob_SavedReport_SavedReportId] FOREIGN KEY ([SavedReportId]) REFERENCES [reporting].[SavedReport] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    ALTER TABLE [reporting].[ReportSchedule] ADD CONSTRAINT [FK_ReportSchedule_SavedReport_SavedReportId] FOREIGN KEY ([SavedReportId]) REFERENCES [reporting].[SavedReport] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028080005_ReportBuilder'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261028080005_ReportBuilder', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028102910_ClientLogo'
)
BEGIN
    ALTER TABLE [clients].[Client] ADD [LogoContentType] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028102910_ClientLogo'
)
BEGIN
    ALTER TABLE [clients].[Client] ADD [LogoPath] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028102910_ClientLogo'
)
BEGIN
    ALTER TABLE [clients].[Client] ADD [LogoVersion] nvarchar(32) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028102910_ClientLogo'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261028102910_ClientLogo', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028130133_NotificationResolution'
)
BEGIN
    ALTER TABLE [notify].[Notification] ADD [ResolvedAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261028130133_NotificationResolution'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261028130133_NotificationResolution', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    ALTER TABLE [iam].[AppRole] ADD [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    CREATE TABLE [iam].[PermissionDefinition] (
        [Id] bigint NOT NULL IDENTITY,
        [Key] nvarchar(120) NOT NULL,
        [DisplayName] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Module] nvarchar(60) NOT NULL,
        [ResourceType] nvarchar(60) NOT NULL,
        [ParentKey] nvarchar(120) NULL,
        [Action] nvarchar(40) NOT NULL,
        [RiskLevel] nvarchar(20) NOT NULL,
        [IsSystemManaged] bit NOT NULL,
        [IsActive] bit NOT NULL,
        [SupportsScope] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_PermissionDefinition] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_PermissionDefinition_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_PermissionDefinition_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    CREATE INDEX [IX_PermissionDefinition_CreatedById] ON [iam].[PermissionDefinition] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    CREATE UNIQUE INDEX [IX_PermissionDefinition_Key] ON [iam].[PermissionDefinition] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    CREATE INDEX [IX_PermissionDefinition_Module_ResourceType_Action] ON [iam].[PermissionDefinition] ([Module], [ResourceType], [Action]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    CREATE INDEX [IX_PermissionDefinition_ParentKey] ON [iam].[PermissionDefinition] ([ParentKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    CREATE INDEX [IX_PermissionDefinition_UpdatedById] ON [iam].[PermissionDefinition] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030062806_PermissionRegistry'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261030062806_PermissionRegistry', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030080145_GranularAuthorization'
)
BEGIN
    CREATE TABLE [iam].[AuthorizationVersion] (
        [Id] int NOT NULL,
        [Version] bigint NOT NULL,
        CONSTRAINT [PK_AuthorizationVersion] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_AuthorizationVersion_Singleton] CHECK ([Id] = 1)
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030080145_GranularAuthorization'
)
BEGIN
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Version') AND [object_id] = OBJECT_ID(N'[iam].[AuthorizationVersion]'))
        SET IDENTITY_INSERT [iam].[AuthorizationVersion] ON;
    EXEC(N'INSERT INTO [iam].[AuthorizationVersion] ([Id], [Version])
    VALUES (1, CAST(0 AS bigint))');
    IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Version') AND [object_id] = OBJECT_ID(N'[iam].[AuthorizationVersion]'))
        SET IDENTITY_INSERT [iam].[AuthorizationVersion] OFF;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030080145_GranularAuthorization'
)
BEGIN
    DECLARE @granted TABLE (RoleId bigint, Resource nvarchar(40), Action nvarchar(40));
    DECLARE @resources TABLE (Resource nvarchar(40) PRIMARY KEY);
    INSERT @resources VALUES (N'ClientStructure'),(N'Contracts'),(N'Environments'),(N'Servers'),
        (N'Installations'),(N'Products'),(N'Cases'),(N'Commitments'),(N'Teams'),(N'OtherOperations');

    -- Before this release every existing role could read business records and the read-only tabs.
    INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
    OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
    SELECT r.Id, res.Resource, a.Action FROM [iam].[AppRole] r CROSS JOIN @resources res
    CROSS JOIN (VALUES (N'View'),(N'DetailsView'),(N'HistoryView'),(N'AttachmentsView')) a(Action)
    WHERE NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
        WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=a.Action);

    INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
    OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
    SELECT r.Id, res.Resource, N'View' FROM [iam].[AppRole] r
    CROSS JOIN (VALUES (N'Dashboard'),(N'Reporting'),(N'PersonalNotes'),(N'Notifications')) res(Resource)
    WHERE NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
        WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=N'View');

    -- The deployed shared file service used OtherOperations edit/delete for every record type.
    -- Preserve that authority once, then permit administrators to narrow each resource independently.
    INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
    OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
    SELECT r.Id, res.Resource, a.Action FROM [iam].[AppRole] r CROSS JOIN @resources res
    CROSS JOIN (VALUES (N'AttachmentsUpload'),(N'AttachmentsDeleteOwn'),(N'AttachmentsDelete')) a(Action)
    WHERE EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p WHERE p.AppRoleId=r.Id
        AND p.Resource=N'OtherOperations' AND ((a.Action IN (N'AttachmentsUpload',N'AttachmentsDeleteOwn') AND p.Action=N'Maintain')
            OR (a.Action=N'AttachmentsDelete' AND p.Action=N'Delete')))
    AND NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
        WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=a.Action);

    INSERT [iam].[AppRolePermission] ([AppRoleId],[Resource],[Action])
    OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
    SELECT r.Id, res.Resource, N'Export' FROM [iam].[AppRole] r CROSS JOIN @resources res
    WHERE (r.Rights & 16)=16 AND NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p
        WHERE p.AppRoleId=r.Id AND p.Resource=res.Resource AND p.Action=N'Export');

    INSERT [audit].[AuditEntry] ([At],[UserName],[Action],[Category],[EntityType],[EntityId],[EntityLabel],[Reason],[Changes])
    SELECT SYSDATETIMEOFFSET(),N'deployment',N'PermissionUpgrade',N'Access',N'AppRole',r.Id,r.Name,
        N'GranularAuthorization compatibility grants preserve prior record visibility and authorized actions.',
        N'{"Permissions":[null,'+(SELECT g.Resource+N':'+g.Action AS [key] FROM @granted g WHERE g.RoleId=r.Id FOR JSON PATH)+N']}'
    FROM [iam].[AppRole] r WHERE EXISTS (SELECT 1 FROM @granted g WHERE g.RoleId=r.Id);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261030080145_GranularAuthorization'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261030080145_GranularAuthorization', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102103000_ProjectPermissions'
)
BEGIN
    DECLARE @granted TABLE (RoleId bigint, Action nvarchar(40));
    INSERT [iam].[AppRolePermission] ([AppRoleId], [Resource], [Action])
    OUTPUT inserted.AppRoleId, inserted.Action INTO @granted
    SELECT source.[AppRoleId], N'Projects', source.[Action]
    FROM [iam].[AppRolePermission] source
    WHERE source.[Resource] = N'ClientStructure'
      AND source.[Action] IN (N'View', N'DetailsView', N'HistoryView', N'AttachmentsView',
          N'AttachmentsUpload', N'AttachmentsDeleteOwn', N'AttachmentsDelete', N'Export',
          N'Create', N'Maintain', N'Coordinate', N'ArchiveRestore', N'Delete')
      AND NOT EXISTS (
          SELECT 1 FROM [iam].[AppRolePermission] existing
          WHERE existing.[AppRoleId] = source.[AppRoleId]
            AND existing.[Resource] = N'Projects' AND existing.[Action] = source.[Action]);

    INSERT [audit].[AuditEntry] ([At], [UserName], [Action], [Category], [EntityType], [EntityId], [EntityLabel], [Reason], [Changes])
    SELECT SYSDATETIMEOFFSET(), N'deployment', N'ProjectPermissionUpgrade', N'Access', N'AppRole', role.[Id], role.[Name],
        N'Project permissions were separated from ClientStructure while preserving existing project access.',
        N'{"Permissions":[' + (SELECT N'Projects:' + granted.[Action] AS [key]
            FROM @granted granted WHERE granted.RoleId = role.[Id] FOR JSON PATH) + N']}'
    FROM [iam].[AppRole] role
    WHERE EXISTS (SELECT 1 FROM @granted granted WHERE granted.RoleId = role.[Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102103000_ProjectPermissions'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102103000_ProjectPermissions', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    ALTER TABLE [iam].[PermissionDefinition] ADD [DisplayOrder] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    ALTER TABLE [iam].[PermissionDefinition] ADD [NodeType] nvarchar(20) NOT NULL DEFAULT N'Action';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    EXEC(N'
    -- Frozen manifest and explicit compatibility mappings for this deployment only.
    DECLARE @manifest nvarchar(max) = N''[{"key":"module.dashboard:Access","displayName":"Dashboard","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Dashboard","resource":"module.dashboard","resourceLabel":"Dashboard","parentKey":null,"action":"Access","actionLabel":"Dashboard","nodeType":"Module","displayOrder":0,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.clients:Access","displayName":"Clients","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Clients","resource":"module.clients","resourceLabel":"Clients","parentKey":null,"action":"Access","actionLabel":"Clients","nodeType":"Module","displayOrder":1,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.products:Access","displayName":"Products","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Products","resource":"module.products","resourceLabel":"Products","parentKey":null,"action":"Access","actionLabel":"Products","nodeType":"Module","displayOrder":2,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.cases:Access","displayName":"Cases","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Cases","resource":"module.cases","resourceLabel":"Cases","parentKey":null,"action":"Access","actionLabel":"Cases","nodeType":"Module","displayOrder":3,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.commitments:Access","displayName":"Commitments","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Commitments","resource":"module.commitments","resourceLabel":"Commitments","parentKey":null,"action":"Access","actionLabel":"Commitments","nodeType":"Module","displayOrder":4,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.notes:Access","displayName":"Notes","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Notes","resource":"module.notes","resourceLabel":"Notes","parentKey":null,"action":"Access","actionLabel":"Notes","nodeType":"Module","displayOrder":5,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.escalations:Access","displayName":"Escalations","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Escalations","resource":"module.escalations","resourceLabel":"Escalations","parentKey":null,"action":"Access","actionLabel":"Escalations","nodeType":"Module","displayOrder":6,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.teams:Access","displayName":"Teams","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Teams","resource":"module.teams","resourceLabel":"Teams","parentKey":null,"action":"Access","actionLabel":"Teams","nodeType":"Module","displayOrder":7,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.reporting:Access","displayName":"Reporting Center","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Reporting Center","resource":"module.reporting","resourceLabel":"Reporting Center","parentKey":null,"action":"Access","actionLabel":"Reporting Center","nodeType":"Module","displayOrder":8,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"module.admin:Access","displayName":"Administration","description":"Access this module. Child grants are independent and retained when this access is revoked.","module":"Administration","resource":"module.admin","resourceLabel":"Administration","parentKey":null,"action":"Access","actionLabel":"Administration","nodeType":"Module","displayOrder":9,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":[]},{"key":"area.ClientStructure:Access","displayName":"Client structure","description":"Access this functional area. This does not grant its actions or tabs.","module":"Clients","resource":"area.ClientStructure","resourceLabel":"Client structure","parentKey":"module.clients:Access","action":"Access","actionLabel":"Client structure","nodeType":"Submodule","displayOrder":10,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.clients:Access"]},{"key":"tab.ClientStructure.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.ClientStructure.files","resourceLabel":"Attachments","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":11,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.ClientStructure.history","resourceLabel":"History","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":12,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"ClientStructure:View","displayName":"View pages and records","description":"Open client structure pages and read their records. Required before any action in this module.","module":"Clients","resource":"ClientStructure","resourceLabel":"View pages and records","parentKey":"area.ClientStructure:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":13,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"ClientStructure:Create","displayName":"Create","description":"Create clients, sub-clients and regions.","module":"Clients","resource":"ClientStructure","resourceLabel":"Create","parentKey":"area.ClientStructure:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":14,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"ClientStructure:Maintain","displayName":"Edit existing records","description":"Edit existing clients and regions.","module":"Clients","resource":"ClientStructure","resourceLabel":"Edit existing records","parentKey":"area.ClientStructure:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":15,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"ClientStructure:Coordinate","displayName":"Coordinate workflow and assignment","description":"Manage client structure and assign client and region owners.","module":"Clients","resource":"ClientStructure","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.ClientStructure:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":16,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"ClientStructure:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore client structure.","module":"Clients","resource":"ClientStructure","resourceLabel":"Archive and restore","parentKey":"area.ClientStructure:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":17,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"ClientStructure:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused client structure records.","module":"Clients","resource":"ClientStructure","resourceLabel":"Permanently delete unused records","parentKey":"area.ClientStructure:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":18,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"ClientStructure:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Clients","resource":"ClientStructure","resourceLabel":"View record details","parentKey":"area.ClientStructure:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":19,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"ClientStructure:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Clients","resource":"ClientStructure","resourceLabel":"View record history","parentKey":"tab.ClientStructure.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":20,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.ClientStructure.history:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View","ClientStructure:DetailsView"]},{"key":"ClientStructure:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Clients","resource":"ClientStructure","resourceLabel":"View and download attachments","parentKey":"tab.ClientStructure.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":21,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.ClientStructure.files:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View","ClientStructure:DetailsView"]},{"key":"ClientStructure:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Clients","resource":"ClientStructure","resourceLabel":"Upload and describe attachments","parentKey":"tab.ClientStructure.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":22,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.ClientStructure.files:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View","ClientStructure:DetailsView","ClientStructure:AttachmentsView"]},{"key":"ClientStructure:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Clients","resource":"ClientStructure","resourceLabel":"Delete own attachments","parentKey":"tab.ClientStructure.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":23,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.ClientStructure.files:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View","ClientStructure:DetailsView","ClientStructure:AttachmentsView"]},{"key":"ClientStructure:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Clients","resource":"ClientStructure","resourceLabel":"Delete any attachment","parentKey":"tab.ClientStructure.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":24,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.ClientStructure.files:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View","ClientStructure:DetailsView","ClientStructure:AttachmentsView"]},{"key":"ClientStructure:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Clients","resource":"ClientStructure","resourceLabel":"Export module data","parentKey":"area.ClientStructure:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":25,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"area.Projects:Access","displayName":"Projects","description":"Access this functional area. This does not grant its actions or tabs.","module":"Clients","resource":"area.Projects","resourceLabel":"Projects","parentKey":"module.clients:Access","action":"Access","actionLabel":"Projects","nodeType":"Submodule","displayOrder":26,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.clients:Access"]},{"key":"tab.Projects.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Projects.details","resourceLabel":"Record details","parentKey":"area.Projects:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":27,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Projects:Access","module.clients:Access"]},{"key":"tab.Projects.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Projects.files","resourceLabel":"Attachments","parentKey":"area.Projects:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":28,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Projects:Access","module.clients:Access"]},{"key":"tab.Projects.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Projects.history","resourceLabel":"History","parentKey":"area.Projects:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":29,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Projects:Access","module.clients:Access"]},{"key":"Projects:View","displayName":"View pages and records","description":"Open projects pages and read their records. Required before any action in this module.","module":"Clients","resource":"Projects","resourceLabel":"View pages and records","parentKey":"area.Projects:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":30,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access"]},{"key":"Projects:Create","displayName":"Create","description":"Create projects independently of client structure permissions.","module":"Clients","resource":"Projects","resourceLabel":"Create","parentKey":"area.Projects:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":31,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"Projects:Maintain","displayName":"Edit existing records","description":"Edit existing projects independently of client structure permissions.","module":"Clients","resource":"Projects","resourceLabel":"Edit existing records","parentKey":"area.Projects:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":32,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"Projects:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate projects workflow.","module":"Clients","resource":"Projects","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Projects:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":33,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"Projects:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore projects.","module":"Clients","resource":"Projects","resourceLabel":"Archive and restore","parentKey":"area.Projects:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":34,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"Projects:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused projects records.","module":"Clients","resource":"Projects","resourceLabel":"Permanently delete unused records","parentKey":"area.Projects:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":35,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"Projects:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Clients","resource":"Projects","resourceLabel":"View record details","parentKey":"tab.Projects.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":36,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Projects.details:Access","area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"Projects:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Clients","resource":"Projects","resourceLabel":"View record history","parentKey":"tab.Projects.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":37,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Projects.history:Access","area.Projects:Access","module.clients:Access","Projects:View","Projects:DetailsView"]},{"key":"Projects:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Clients","resource":"Projects","resourceLabel":"View and download attachments","parentKey":"tab.Projects.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":38,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Projects.files:Access","area.Projects:Access","module.clients:Access","Projects:View","Projects:DetailsView"]},{"key":"Projects:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Clients","resource":"Projects","resourceLabel":"Upload and describe attachments","parentKey":"tab.Projects.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":39,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Projects.files:Access","area.Projects:Access","module.clients:Access","Projects:View","Projects:DetailsView","Projects:AttachmentsView"]},{"key":"Projects:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Clients","resource":"Projects","resourceLabel":"Delete own attachments","parentKey":"tab.Projects.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":40,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Projects.files:Access","area.Projects:Access","module.clients:Access","Projects:View","Projects:DetailsView","Projects:AttachmentsView"]},{"key":"Projects:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Clients","resource":"Projects","resourceLabel":"Delete any attachment","parentKey":"tab.Projects.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":41,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Projects.files:Access","area.Projects:Access","module.clients:Access","Projects:View","Projects:DetailsView","Projects:AttachmentsView"]},{"key":"Projects:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Clients","resource":"Projects","resourceLabel":"Export module data","parentKey":"area.Projects:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":42,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Projects:Access","module.clients:Access","Projects:View"]},{"key":"area.Contracts:Access","displayName":"Contracts","description":"Access this functional area. This does not grant its actions or tabs.","module":"Clients","resource":"area.Contracts","resourceLabel":"Contracts","parentKey":"module.clients:Access","action":"Access","actionLabel":"Contracts","nodeType":"Submodule","displayOrder":43,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.clients:Access"]},{"key":"tab.Contracts.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Contracts.details","resourceLabel":"Record details","parentKey":"area.Contracts:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":44,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access"]},{"key":"tab.Contracts.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Contracts.files","resourceLabel":"Attachments","parentKey":"area.Contracts:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":45,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access"]},{"key":"tab.Contracts.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Contracts.history","resourceLabel":"History","parentKey":"area.Contracts:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":46,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access"]},{"key":"Contracts:View","displayName":"View pages and records","description":"Open contracts pages and read their records. Required before any action in this module.","module":"Clients","resource":"Contracts","resourceLabel":"View pages and records","parentKey":"area.Contracts:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":47,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access"]},{"key":"Contracts:Create","displayName":"Create","description":"Create contracts.","module":"Clients","resource":"Contracts","resourceLabel":"Create","parentKey":"area.Contracts:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":48,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"Contracts:Maintain","displayName":"Edit existing records","description":"Edit existing contracts records.","module":"Clients","resource":"Contracts","resourceLabel":"Edit existing records","parentKey":"area.Contracts:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":49,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"Contracts:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate contracts workflow.","module":"Clients","resource":"Contracts","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Contracts:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":50,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"Contracts:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore contracts.","module":"Clients","resource":"Contracts","resourceLabel":"Archive and restore","parentKey":"area.Contracts:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":51,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"Contracts:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused contracts records.","module":"Clients","resource":"Contracts","resourceLabel":"Permanently delete unused records","parentKey":"area.Contracts:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":52,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"Contracts:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Clients","resource":"Contracts","resourceLabel":"View record details","parentKey":"tab.Contracts.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":53,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Contracts.details:Access","area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"Contracts:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Clients","resource":"Contracts","resourceLabel":"View record history","parentKey":"tab.Contracts.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":54,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Contracts.history:Access","area.Contracts:Access","module.clients:Access","Contracts:View","Contracts:DetailsView"]},{"key":"Contracts:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Clients","resource":"Contracts","resourceLabel":"View and download attachments","parentKey":"tab.Contracts.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":55,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Contracts.files:Access","area.Contracts:Access","module.clients:Access","Contracts:View","Contracts:DetailsView"]},{"key":"Contracts:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Clients","resource":"Contracts","resourceLabel":"Upload and describe attachments","parentKey":"tab.Contracts.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":56,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Contracts.files:Access","area.Contracts:Access","module.clients:Access","Contracts:View","Contracts:DetailsView","Contracts:AttachmentsView"]},{"key":"Contracts:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Clients","resource":"Contracts","resourceLabel":"Delete own attachments","parentKey":"tab.Contracts.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":57,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Contracts.files:Access","area.Contracts:Access","module.clients:Access","Contracts:View","Contracts:DetailsView","Contracts:AttachmentsView"]},{"key":"Contracts:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Clients","resource":"Contracts","resourceLabel":"Delete any attachment","parentKey":"tab.Contracts.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":58,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Contracts.files:Access","area.Contracts:Access","module.clients:Access","Contracts:View","Contracts:DetailsView","Contracts:AttachmentsView"]},{"key":"Contracts:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Clients","resource":"Contracts","resourceLabel":"Export module data","parentKey":"area.Contracts:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":59,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Contracts:Access","module.clients:Access","Contracts:View"]},{"key":"area.Environments:Access","displayName":"Environments","description":"Access this functional area. This does not grant its actions or tabs.","module":"Clients","resource":"area.Environments","resourceLabel":"Environments","parentKey":"module.clients:Access","action":"Access","actionLabel":"Environments","nodeType":"Submodule","displayOrder":60,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.clients:Access"]},{"key":"tab.Environments.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Environments.files","resourceLabel":"Attachments","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":61,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Environments.history","resourceLabel":"History","parentKey":"area.Environments:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":62,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"Environments:View","displayName":"View pages and records","description":"Open environments pages and read their records. Required before any action in this module.","module":"Clients","resource":"Environments","resourceLabel":"View pages and records","parentKey":"area.Environments:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":63,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"Environments:Create","displayName":"Create","description":"Create environments.","module":"Clients","resource":"Environments","resourceLabel":"Create","parentKey":"area.Environments:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":64,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"Environments:Maintain","displayName":"Edit existing records","description":"Edit existing environments records.","module":"Clients","resource":"Environments","resourceLabel":"Edit existing records","parentKey":"area.Environments:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":65,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"Environments:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate environments workflow.","module":"Clients","resource":"Environments","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Environments:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":66,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"Environments:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore environments.","module":"Clients","resource":"Environments","resourceLabel":"Archive and restore","parentKey":"area.Environments:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":67,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"Environments:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused environments records.","module":"Clients","resource":"Environments","resourceLabel":"Permanently delete unused records","parentKey":"area.Environments:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":68,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"Environments:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Clients","resource":"Environments","resourceLabel":"View record details","parentKey":"area.Environments:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":69,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"Environments:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Clients","resource":"Environments","resourceLabel":"View record history","parentKey":"tab.Environments.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":70,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Environments.history:Access","area.Environments:Access","module.clients:Access","Environments:View","Environments:DetailsView"]},{"key":"Environments:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Clients","resource":"Environments","resourceLabel":"View and download attachments","parentKey":"tab.Environments.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":71,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Environments.files:Access","area.Environments:Access","module.clients:Access","Environments:View","Environments:DetailsView"]},{"key":"Environments:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Clients","resource":"Environments","resourceLabel":"Upload and describe attachments","parentKey":"tab.Environments.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":72,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Environments.files:Access","area.Environments:Access","module.clients:Access","Environments:View","Environments:DetailsView","Environments:AttachmentsView"]},{"key":"Environments:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Clients","resource":"Environments","resourceLabel":"Delete own attachments","parentKey":"tab.Environments.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":73,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Environments.files:Access","area.Environments:Access","module.clients:Access","Environments:View","Environments:DetailsView","Environments:AttachmentsView"]},{"key":"Environments:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Clients","resource":"Environments","resourceLabel":"Delete any attachment","parentKey":"tab.Environments.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":74,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Environments.files:Access","area.Environments:Access","module.clients:Access","Environments:View","Environments:DetailsView","Environments:AttachmentsView"]},{"key":"Environments:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Clients","resource":"Environments","resourceLabel":"Export module data","parentKey":"area.Environments:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":75,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"area.Servers:Access","displayName":"Servers","description":"Access this functional area. This does not grant its actions or tabs.","module":"Clients","resource":"area.Servers","resourceLabel":"Servers","parentKey":"module.clients:Access","action":"Access","actionLabel":"Servers","nodeType":"Submodule","displayOrder":76,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.clients:Access"]},{"key":"tab.Servers.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Servers.details","resourceLabel":"Record details","parentKey":"area.Servers:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":77,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Servers:Access","module.clients:Access"]},{"key":"tab.Servers.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Servers.files","resourceLabel":"Attachments","parentKey":"area.Servers:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":78,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Servers:Access","module.clients:Access"]},{"key":"tab.Servers.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Servers.history","resourceLabel":"History","parentKey":"area.Servers:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":79,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Servers:Access","module.clients:Access"]},{"key":"Servers:View","displayName":"View pages and records","description":"Open servers pages and read their records. Required before any action in this module.","module":"Clients","resource":"Servers","resourceLabel":"View pages and records","parentKey":"area.Servers:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":80,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access"]},{"key":"Servers:Create","displayName":"Create","description":"Create servers.","module":"Clients","resource":"Servers","resourceLabel":"Create","parentKey":"area.Servers:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":81,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"Servers:Maintain","displayName":"Edit existing records","description":"Edit existing servers records.","module":"Clients","resource":"Servers","resourceLabel":"Edit existing records","parentKey":"area.Servers:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":82,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"Servers:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate servers workflow.","module":"Clients","resource":"Servers","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Servers:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":83,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"Servers:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore servers.","module":"Clients","resource":"Servers","resourceLabel":"Archive and restore","parentKey":"area.Servers:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":84,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"Servers:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused servers records.","module":"Clients","resource":"Servers","resourceLabel":"Permanently delete unused records","parentKey":"area.Servers:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":85,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"Servers:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Clients","resource":"Servers","resourceLabel":"View record details","parentKey":"tab.Servers.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":86,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Servers.details:Access","area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"Servers:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Clients","resource":"Servers","resourceLabel":"View record history","parentKey":"tab.Servers.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":87,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Servers.history:Access","area.Servers:Access","module.clients:Access","Servers:View","Servers:DetailsView"]},{"key":"Servers:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Clients","resource":"Servers","resourceLabel":"View and download attachments","parentKey":"tab.Servers.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":88,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Servers.files:Access","area.Servers:Access","module.clients:Access","Servers:View","Servers:DetailsView"]},{"key":"Servers:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Clients","resource":"Servers","resourceLabel":"Upload and describe attachments","parentKey":"tab.Servers.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":89,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Servers.files:Access","area.Servers:Access","module.clients:Access","Servers:View","Servers:DetailsView","Servers:AttachmentsView"]},{"key":"Servers:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Clients","resource":"Servers","resourceLabel":"Delete own attachments","parentKey":"tab.Servers.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":90,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Servers.files:Access","area.Servers:Access","module.clients:Access","Servers:View","Servers:DetailsView","Servers:AttachmentsView"]},{"key":"Servers:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Clients","resource":"Servers","resourceLabel":"Delete any attachment","parentKey":"tab.Servers.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":91,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Servers.files:Access","area.Servers:Access","module.clients:Access","Servers:View","Servers:DetailsView","Servers:AttachmentsView"]},{"key":"Servers:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Clients","resource":"Servers","resourceLabel":"Export module data","parentKey":"area.Servers:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":92,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Servers:Access","module.clients:Access","Servers:View"]},{"key":"area.Installations:Access","displayName":"Installations","description":"Access this functional area. This does not grant its actions or tabs.","module":"Clients","resource":"area.Installations","resourceLabel":"Installations","parentKey":"module.clients:Access","action":"Access","actionLabel":"Installations","nodeType":"Submodule","displayOrder":93,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.clients:Access"]},{"key":"tab.Installations.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Installations.details","resourceLabel":"Record details","parentKey":"area.Installations:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":94,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Installations:Access","module.clients:Access"]},{"key":"tab.Installations.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Installations.files","resourceLabel":"Attachments","parentKey":"area.Installations:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":95,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Installations:Access","module.clients:Access"]},{"key":"tab.Installations.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Clients","resource":"tab.Installations.history","resourceLabel":"History","parentKey":"area.Installations:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":96,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Installations:Access","module.clients:Access"]},{"key":"Installations:View","displayName":"View pages and records","description":"Open installations pages and read their records. Required before any action in this module.","module":"Clients","resource":"Installations","resourceLabel":"View pages and records","parentKey":"area.Installations:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":97,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access"]},{"key":"Installations:Create","displayName":"Create","description":"Create installations.","module":"Clients","resource":"Installations","resourceLabel":"Create","parentKey":"area.Installations:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":98,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"Installations:Maintain","displayName":"Edit existing records","description":"Edit existing installations records.","module":"Clients","resource":"Installations","resourceLabel":"Edit existing records","parentKey":"area.Installations:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":99,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"Installations:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate installations workflow.","module":"Clients","resource":"Installations","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Installations:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":100,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"Installations:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore installations.","module":"Clients","resource":"Installations","resourceLabel":"Archive and restore","parentKey":"area.Installations:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":101,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"Installations:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused installations records.","module":"Clients","resource":"Installations","resourceLabel":"Permanently delete unused records","parentKey":"area.Installations:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":102,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"Installations:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Clients","resource":"Installations","resourceLabel":"View record details","parentKey":"tab.Installations.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":103,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Installations.details:Access","area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"Installations:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Clients","resource":"Installations","resourceLabel":"View record history","parentKey":"tab.Installations.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":104,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Installations.history:Access","area.Installations:Access","module.clients:Access","Installations:View","Installations:DetailsView"]},{"key":"Installations:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Clients","resource":"Installations","resourceLabel":"View and download attachments","parentKey":"tab.Installations.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":105,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Installations.files:Access","area.Installations:Access","module.clients:Access","Installations:View","Installations:DetailsView"]},{"key":"Installations:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Clients","resource":"Installations","resourceLabel":"Upload and describe attachments","parentKey":"tab.Installations.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":106,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Installations.files:Access","area.Installations:Access","module.clients:Access","Installations:View","Installations:DetailsView","Installations:AttachmentsView"]},{"key":"Installations:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Clients","resource":"Installations","resourceLabel":"Delete own attachments","parentKey":"tab.Installations.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":107,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Installations.files:Access","area.Installations:Access","module.clients:Access","Installations:View","Installations:DetailsView","Installations:AttachmentsView"]},{"key":"Installations:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Clients","resource":"Installations","resourceLabel":"Delete any attachment","parentKey":"tab.Installations.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":108,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Installations.files:Access","area.Installations:Access","module.clients:Access","Installations:View","Installations:DetailsView","Installations:AttachmentsView"]},{"key":"Installations:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Clients","resource":"Installations","resourceLabel":"Export module data","parentKey":"area.Installations:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":109,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Installations:Access","module.clients:Access","Installations:View"]},{"key":"area.Products:Access","displayName":"Products","description":"Access this functional area. This does not grant its actions or tabs.","module":"Products","resource":"area.Products","resourceLabel":"Products","parentKey":"module.products:Access","action":"Access","actionLabel":"Products","nodeType":"Submodule","displayOrder":110,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.products:Access"]},{"key":"tab.Products.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Products","resource":"tab.Products.details","resourceLabel":"Record details","parentKey":"area.Products:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":111,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Products:Access","module.products:Access"]},{"key":"tab.Products.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Products","resource":"tab.Products.files","resourceLabel":"Attachments","parentKey":"area.Products:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":112,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Products:Access","module.products:Access"]},{"key":"tab.Products.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Products","resource":"tab.Products.history","resourceLabel":"History","parentKey":"area.Products:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":113,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Products:Access","module.products:Access"]},{"key":"Products:View","displayName":"View pages and records","description":"Open products pages and read their records. Required before any action in this module.","module":"Products","resource":"Products","resourceLabel":"View pages and records","parentKey":"area.Products:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":114,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access"]},{"key":"Products:Create","displayName":"Create","description":"Create products.","module":"Products","resource":"Products","resourceLabel":"Create","parentKey":"area.Products:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":115,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access","Products:View"]},{"key":"Products:Maintain","displayName":"Edit existing records","description":"Edit existing products records.","module":"Products","resource":"Products","resourceLabel":"Edit existing records","parentKey":"area.Products:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":116,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access","Products:View"]},{"key":"Products:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate products workflow.","module":"Products","resource":"Products","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Products:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":117,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access","Products:View"]},{"key":"Products:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore products.","module":"Products","resource":"Products","resourceLabel":"Archive and restore","parentKey":"area.Products:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":118,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access","Products:View"]},{"key":"Products:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused products records.","module":"Products","resource":"Products","resourceLabel":"Permanently delete unused records","parentKey":"area.Products:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":119,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access","Products:View"]},{"key":"Products:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Products","resource":"Products","resourceLabel":"View record details","parentKey":"tab.Products.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":120,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Products.details:Access","area.Products:Access","module.products:Access","Products:View"]},{"key":"Products:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Products","resource":"Products","resourceLabel":"View record history","parentKey":"tab.Products.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":121,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Products.history:Access","area.Products:Access","module.products:Access","Products:View","Products:DetailsView"]},{"key":"Products:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Products","resource":"Products","resourceLabel":"View and download attachments","parentKey":"tab.Products.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":122,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Products.files:Access","area.Products:Access","module.products:Access","Products:View","Products:DetailsView"]},{"key":"Products:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Products","resource":"Products","resourceLabel":"Upload and describe attachments","parentKey":"tab.Products.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":123,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Products.files:Access","area.Products:Access","module.products:Access","Products:View","Products:DetailsView","Products:AttachmentsView"]},{"key":"Products:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Products","resource":"Products","resourceLabel":"Delete own attachments","parentKey":"tab.Products.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":124,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Products.files:Access","area.Products:Access","module.products:Access","Products:View","Products:DetailsView","Products:AttachmentsView"]},{"key":"Products:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Products","resource":"Products","resourceLabel":"Delete any attachment","parentKey":"tab.Products.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":125,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Products.files:Access","area.Products:Access","module.products:Access","Products:View","Products:DetailsView","Products:AttachmentsView"]},{"key":"Products:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Products","resource":"Products","resourceLabel":"Export module data","parentKey":"area.Products:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":126,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Products:Access","module.products:Access","Products:View"]},{"key":"area.Cases:Access","displayName":"Cases","description":"Access this functional area. This does not grant its actions or tabs.","module":"Cases","resource":"area.Cases","resourceLabel":"Cases","parentKey":"module.cases:Access","action":"Access","actionLabel":"Cases","nodeType":"Submodule","displayOrder":127,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.cases:Access"]},{"key":"tab.Cases.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Cases","resource":"tab.Cases.files","resourceLabel":"Attachments","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":128,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Cases","resource":"tab.Cases.history","resourceLabel":"History","parentKey":"area.Cases:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":129,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"Cases:View","displayName":"View pages and records","description":"Open cases pages and read their records. Required before any action in this module.","module":"Cases","resource":"Cases","resourceLabel":"View pages and records","parentKey":"area.Cases:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":130,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"Cases:Create","displayName":"Create","description":"Create cases.","module":"Cases","resource":"Cases","resourceLabel":"Create","parentKey":"area.Cases:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":131,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"Cases:Maintain","displayName":"Edit existing records","description":"Edit existing cases records.","module":"Cases","resource":"Cases","resourceLabel":"Edit existing records","parentKey":"area.Cases:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":132,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"Cases:Coordinate","displayName":"Coordinate workflow and assignment","description":"Triage cases, assign owners, change contracts and coordinate case workflow.","module":"Cases","resource":"Cases","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Cases:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":133,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"Cases:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore cases.","module":"Cases","resource":"Cases","resourceLabel":"Archive and restore","parentKey":"area.Cases:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":134,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"Cases:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused cases records.","module":"Cases","resource":"Cases","resourceLabel":"Permanently delete unused records","parentKey":"area.Cases:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":135,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"Cases:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Cases","resource":"Cases","resourceLabel":"View record details","parentKey":"area.Cases:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":136,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"Cases:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Cases","resource":"Cases","resourceLabel":"View record history","parentKey":"tab.Cases.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":137,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Cases.history:Access","area.Cases:Access","module.cases:Access","Cases:View","Cases:DetailsView"]},{"key":"Cases:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Cases","resource":"Cases","resourceLabel":"View and download attachments","parentKey":"tab.Cases.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":138,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Cases.files:Access","area.Cases:Access","module.cases:Access","Cases:View","Cases:DetailsView"]},{"key":"Cases:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Cases","resource":"Cases","resourceLabel":"Upload and describe attachments","parentKey":"tab.Cases.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":139,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Cases.files:Access","area.Cases:Access","module.cases:Access","Cases:View","Cases:DetailsView","Cases:AttachmentsView"]},{"key":"Cases:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Cases","resource":"Cases","resourceLabel":"Delete own attachments","parentKey":"tab.Cases.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":140,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Cases.files:Access","area.Cases:Access","module.cases:Access","Cases:View","Cases:DetailsView","Cases:AttachmentsView"]},{"key":"Cases:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Cases","resource":"Cases","resourceLabel":"Delete any attachment","parentKey":"tab.Cases.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":141,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Cases.files:Access","area.Cases:Access","module.cases:Access","Cases:View","Cases:DetailsView","Cases:AttachmentsView"]},{"key":"Cases:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Cases","resource":"Cases","resourceLabel":"Export module data","parentKey":"area.Cases:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":142,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"area.Commitments:Access","displayName":"Commitments","description":"Access this functional area. This does not grant its actions or tabs.","module":"Commitments","resource":"area.Commitments","resourceLabel":"Commitments","parentKey":"module.commitments:Access","action":"Access","actionLabel":"Commitments","nodeType":"Submodule","displayOrder":143,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.commitments:Access"]},{"key":"tab.Commitments.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Commitments","resource":"tab.Commitments.details","resourceLabel":"Record details","parentKey":"area.Commitments:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":144,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access"]},{"key":"tab.Commitments.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Commitments","resource":"tab.Commitments.files","resourceLabel":"Attachments","parentKey":"area.Commitments:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":145,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access"]},{"key":"tab.Commitments.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Commitments","resource":"tab.Commitments.history","resourceLabel":"History","parentKey":"area.Commitments:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":146,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access"]},{"key":"Commitments:View","displayName":"View pages and records","description":"Open commitments pages and read their records. Required before any action in this module.","module":"Commitments","resource":"Commitments","resourceLabel":"View pages and records","parentKey":"area.Commitments:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":147,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access"]},{"key":"Commitments:Create","displayName":"Create","description":"Create commitments.","module":"Commitments","resource":"Commitments","resourceLabel":"Create","parentKey":"area.Commitments:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":148,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"Commitments:Maintain","displayName":"Edit existing records","description":"Edit existing commitments records.","module":"Commitments","resource":"Commitments","resourceLabel":"Edit existing records","parentKey":"area.Commitments:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":149,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"Commitments:Coordinate","displayName":"Coordinate workflow and assignment","description":"Revise, complete, cancel and reopen commitments.","module":"Commitments","resource":"Commitments","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Commitments:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":150,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"Commitments:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore commitments.","module":"Commitments","resource":"Commitments","resourceLabel":"Archive and restore","parentKey":"area.Commitments:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":151,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"Commitments:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused commitments records.","module":"Commitments","resource":"Commitments","resourceLabel":"Permanently delete unused records","parentKey":"area.Commitments:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":152,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"Commitments:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Commitments","resource":"Commitments","resourceLabel":"View record details","parentKey":"tab.Commitments.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":153,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Commitments.details:Access","area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"Commitments:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Commitments","resource":"Commitments","resourceLabel":"View record history","parentKey":"tab.Commitments.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":154,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Commitments.history:Access","area.Commitments:Access","module.commitments:Access","Commitments:View","Commitments:DetailsView"]},{"key":"Commitments:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Commitments","resource":"Commitments","resourceLabel":"View and download attachments","parentKey":"tab.Commitments.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":155,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Commitments.files:Access","area.Commitments:Access","module.commitments:Access","Commitments:View","Commitments:DetailsView"]},{"key":"Commitments:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Commitments","resource":"Commitments","resourceLabel":"Upload and describe attachments","parentKey":"tab.Commitments.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":156,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Commitments.files:Access","area.Commitments:Access","module.commitments:Access","Commitments:View","Commitments:DetailsView","Commitments:AttachmentsView"]},{"key":"Commitments:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Commitments","resource":"Commitments","resourceLabel":"Delete own attachments","parentKey":"tab.Commitments.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":157,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Commitments.files:Access","area.Commitments:Access","module.commitments:Access","Commitments:View","Commitments:DetailsView","Commitments:AttachmentsView"]},{"key":"Commitments:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Commitments","resource":"Commitments","resourceLabel":"Delete any attachment","parentKey":"tab.Commitments.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":158,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Commitments.files:Access","area.Commitments:Access","module.commitments:Access","Commitments:View","Commitments:DetailsView","Commitments:AttachmentsView"]},{"key":"Commitments:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Commitments","resource":"Commitments","resourceLabel":"Export module data","parentKey":"area.Commitments:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":159,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Commitments:Access","module.commitments:Access","Commitments:View"]},{"key":"area.Teams:Access","displayName":"Teams and handovers","description":"Access this functional area. This does not grant its actions or tabs.","module":"Teams","resource":"area.Teams","resourceLabel":"Teams and handovers","parentKey":"module.teams:Access","action":"Access","actionLabel":"Teams and handovers","nodeType":"Submodule","displayOrder":160,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.teams:Access"]},{"key":"tab.Teams.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Teams","resource":"tab.Teams.details","resourceLabel":"Record details","parentKey":"area.Teams:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":161,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Teams:Access","module.teams:Access"]},{"key":"tab.Teams.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Teams","resource":"tab.Teams.files","resourceLabel":"Attachments","parentKey":"area.Teams:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":162,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Teams:Access","module.teams:Access"]},{"key":"tab.Teams.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Teams","resource":"tab.Teams.history","resourceLabel":"History","parentKey":"area.Teams:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":163,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Teams:Access","module.teams:Access"]},{"key":"Teams:View","displayName":"View pages and records","description":"Open teams and handovers pages and read their records. Required before any action in this module.","module":"Teams","resource":"Teams","resourceLabel":"View pages and records","parentKey":"area.Teams:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":164,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access"]},{"key":"Teams:Create","displayName":"Create","description":"Create teams and handovers.","module":"Teams","resource":"Teams","resourceLabel":"Create","parentKey":"area.Teams:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":165,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"Teams:Maintain","displayName":"Edit existing records","description":"Edit existing teams and handovers records.","module":"Teams","resource":"Teams","resourceLabel":"Edit existing records","parentKey":"area.Teams:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":166,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"Teams:Coordinate","displayName":"Coordinate workflow and assignment","description":"Manage teams, membership, coverage, handovers and reassignment.","module":"Teams","resource":"Teams","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.Teams:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":167,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"Teams:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore teams and handovers.","module":"Teams","resource":"Teams","resourceLabel":"Archive and restore","parentKey":"area.Teams:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":168,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"Teams:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused teams and handovers records.","module":"Teams","resource":"Teams","resourceLabel":"Permanently delete unused records","parentKey":"area.Teams:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":169,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"Teams:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Teams","resource":"Teams","resourceLabel":"View record details","parentKey":"tab.Teams.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":170,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Teams.details:Access","area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"Teams:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Teams","resource":"Teams","resourceLabel":"View record history","parentKey":"tab.Teams.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":171,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Teams.history:Access","area.Teams:Access","module.teams:Access","Teams:View","Teams:DetailsView"]},{"key":"Teams:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Teams","resource":"Teams","resourceLabel":"View and download attachments","parentKey":"tab.Teams.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":172,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Teams.files:Access","area.Teams:Access","module.teams:Access","Teams:View","Teams:DetailsView"]},{"key":"Teams:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Teams","resource":"Teams","resourceLabel":"Upload and describe attachments","parentKey":"tab.Teams.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":173,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Teams.files:Access","area.Teams:Access","module.teams:Access","Teams:View","Teams:DetailsView","Teams:AttachmentsView"]},{"key":"Teams:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Teams","resource":"Teams","resourceLabel":"Delete own attachments","parentKey":"tab.Teams.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":174,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.Teams.files:Access","area.Teams:Access","module.teams:Access","Teams:View","Teams:DetailsView","Teams:AttachmentsView"]},{"key":"Teams:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Teams","resource":"Teams","resourceLabel":"Delete any attachment","parentKey":"tab.Teams.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":175,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.Teams.files:Access","area.Teams:Access","module.teams:Access","Teams:View","Teams:DetailsView","Teams:AttachmentsView"]},{"key":"Teams:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Teams","resource":"Teams","resourceLabel":"Export module data","parentKey":"area.Teams:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":176,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.Teams:Access","module.teams:Access","Teams:View"]},{"key":"area.OtherOperations:Access","displayName":"Other operations","description":"Access this functional area. This does not grant its actions or tabs.","module":"Escalations","resource":"area.OtherOperations","resourceLabel":"Other operations","parentKey":"module.escalations:Access","action":"Access","actionLabel":"Other operations","nodeType":"Submodule","displayOrder":177,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.escalations:Access"]},{"key":"tab.OtherOperations.details:Access","displayName":"Record details","description":"Access this record section. Each operation requires its own action grant.","module":"Escalations","resource":"tab.OtherOperations.details","resourceLabel":"Record details","parentKey":"area.OtherOperations:Access","action":"Access","actionLabel":"Record details","nodeType":"Tab","displayOrder":178,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access"]},{"key":"tab.OtherOperations.files:Access","displayName":"Attachments","description":"Access this record section. Each operation requires its own action grant.","module":"Escalations","resource":"tab.OtherOperations.files","resourceLabel":"Attachments","parentKey":"area.OtherOperations:Access","action":"Access","actionLabel":"Attachments","nodeType":"Tab","displayOrder":179,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access"]},{"key":"tab.OtherOperations.history:Access","displayName":"History","description":"Access this record section. Each operation requires its own action grant.","module":"Escalations","resource":"tab.OtherOperations.history","resourceLabel":"History","parentKey":"area.OtherOperations:Access","action":"Access","actionLabel":"History","nodeType":"Tab","displayOrder":180,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access"]},{"key":"OtherOperations:View","displayName":"View pages and records","description":"Open other operations pages and read their records. Required before any action in this module.","module":"Escalations","resource":"OtherOperations","resourceLabel":"View pages and records","parentKey":"area.OtherOperations:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":181,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access"]},{"key":"OtherOperations:Create","displayName":"Create","description":"Create other operations.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Create","parentKey":"area.OtherOperations:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":182,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"OtherOperations:Maintain","displayName":"Edit existing records","description":"Edit existing other operations records.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Edit existing records","parentKey":"area.OtherOperations:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":183,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"OtherOperations:Coordinate","displayName":"Coordinate workflow and assignment","description":"Coordinate other operations workflow.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Coordinate workflow and assignment","parentKey":"area.OtherOperations:Access","action":"Coordinate","actionLabel":"Coordinate workflow and assignment","nodeType":"Action","displayOrder":184,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"OtherOperations:ArchiveRestore","displayName":"Archive and restore","description":"Archive and restore other operations.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Archive and restore","parentKey":"area.OtherOperations:Access","action":"ArchiveRestore","actionLabel":"Archive and restore","nodeType":"Action","displayOrder":185,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"OtherOperations:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused other operations records.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Permanently delete unused records","parentKey":"area.OtherOperations:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":186,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"OtherOperations:DetailsView","displayName":"View record details","description":"Open record detail pages and their detail API endpoints. Module View is also required.","module":"Escalations","resource":"OtherOperations","resourceLabel":"View record details","parentKey":"tab.OtherOperations.details:Access","action":"DetailsView","actionLabel":"View record details","nodeType":"Action","displayOrder":187,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.OtherOperations.details:Access","area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"OtherOperations:HistoryView","displayName":"View record history","description":"Read this module''''s business change history. Record details and the separate Audit right are also required.","module":"Escalations","resource":"OtherOperations","resourceLabel":"View record history","parentKey":"tab.OtherOperations.history:Access","action":"HistoryView","actionLabel":"View record history","nodeType":"Action","displayOrder":188,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.OtherOperations.history:Access","area.OtherOperations:Access","module.escalations:Access","OtherOperations:View","OtherOperations:DetailsView"]},{"key":"OtherOperations:AttachmentsView","displayName":"View and download attachments","description":"List, preview and download attachments belonging to records in this module. Record details access is also required.","module":"Escalations","resource":"OtherOperations","resourceLabel":"View and download attachments","parentKey":"tab.OtherOperations.files:Access","action":"AttachmentsView","actionLabel":"View and download attachments","nodeType":"Action","displayOrder":189,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.OtherOperations.files:Access","area.OtherOperations:Access","module.escalations:Access","OtherOperations:View","OtherOperations:DetailsView"]},{"key":"OtherOperations:AttachmentsUpload","displayName":"Upload and describe attachments","description":"Upload files and update attachment descriptions in this module independently of record editing. Attachments access and record scope are required.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Upload and describe attachments","parentKey":"tab.OtherOperations.files:Access","action":"AttachmentsUpload","actionLabel":"Upload and describe attachments","nodeType":"Action","displayOrder":190,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.OtherOperations.files:Access","area.OtherOperations:Access","module.escalations:Access","OtherOperations:View","OtherOperations:DetailsView","OtherOperations:AttachmentsView"]},{"key":"OtherOperations:AttachmentsDeleteOwn","displayName":"Delete own attachments","description":"Remove only files you uploaded in this module. Attachments access and record scope are required.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Delete own attachments","parentKey":"tab.OtherOperations.files:Access","action":"AttachmentsDeleteOwn","actionLabel":"Delete own attachments","nodeType":"Action","displayOrder":191,"riskLevel":"Normal","supportsScope":true,"isActive":true,"requires":["tab.OtherOperations.files:Access","area.OtherOperations:Access","module.escalations:Access","OtherOperations:View","OtherOperations:DetailsView","OtherOperations:AttachmentsView"]},{"key":"OtherOperations:AttachmentsDelete","displayName":"Delete any attachment","description":"Remove any file belonging to an authorized record in this module independently of deleting the record itself.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Delete any attachment","parentKey":"tab.OtherOperations.files:Access","action":"AttachmentsDelete","actionLabel":"Delete any attachment","nodeType":"Action","displayOrder":192,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["tab.OtherOperations.files:Access","area.OtherOperations:Access","module.escalations:Access","OtherOperations:View","OtherOperations:DetailsView","OtherOperations:AttachmentsView"]},{"key":"OtherOperations:Export","displayName":"Export module data","description":"Export this module''''s data through list downloads and reports. The separate Export right and applicable data scope are also required.","module":"Escalations","resource":"OtherOperations","resourceLabel":"Export module data","parentKey":"area.OtherOperations:Access","action":"Export","actionLabel":"Export module data","nodeType":"Action","displayOrder":193,"riskLevel":"High","supportsScope":true,"isActive":true,"requires":["area.OtherOperations:Access","module.escalations:Access","OtherOperations:View"]},{"key":"area.Dashboard:Access","displayName":"Operations dashboard","description":"Access this functional area. This does not grant its actions or tabs.","module":"Dashboard","resource":"area.Dashboard","resourceLabel":"Operations dashboard","parentKey":"module.dashboard:Access","action":"Access","actionLabel":"Operations dashboard","nodeType":"Submodule","displayOrder":194,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.dashboard:Access"]},{"key":"Dashboard:View","displayName":"View pages and records","description":"Open the Operations Command Center and its combined measures. Source module View permissions are also required.","module":"Dashboard","resource":"Dashboard","resourceLabel":"View pages and records","parentKey":"area.Dashboard:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":195,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Dashboard:Access","module.dashboard:Access","ClientStructure:View","Projects:View","Contracts:View","Environments:View","Servers:View","Installations:View","Products:View","Cases:View","Commitments:View","Teams:View","OtherOperations:View"]},{"key":"area.Reporting:Access","displayName":"Reporting center","description":"Access this functional area. This does not grant its actions or tabs.","module":"Reporting Center","resource":"area.Reporting","resourceLabel":"Reporting center","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Reporting center","nodeType":"Submodule","displayOrder":196,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"Reporting:View","displayName":"View pages and records","description":"Use the Reporting Center. Report data also needs its source module View permissions and the separate Export right.","module":"Reporting Center","resource":"Reporting","resourceLabel":"View pages and records","parentKey":"area.Reporting:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":197,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Reporting:Access","module.reporting:Access"]},{"key":"area.PersonalNotes:Access","displayName":"Personal notes","description":"Access this functional area. This does not grant its actions or tabs.","module":"Notes","resource":"area.PersonalNotes","resourceLabel":"Personal notes","parentKey":"module.notes:Access","action":"Access","actionLabel":"Personal notes","nodeType":"Submodule","displayOrder":198,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.notes:Access"]},{"key":"PersonalNotes:View","displayName":"View pages and records","description":"Access your own notebooks, pages and files. Ownership restrictions always apply.","module":"Notes","resource":"PersonalNotes","resourceLabel":"View pages and records","parentKey":"area.PersonalNotes:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":199,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.PersonalNotes:Access","module.notes:Access"]},{"key":"PersonalNotes:Create","displayName":"Create","description":"Create personal notes.","module":"Notes","resource":"PersonalNotes","resourceLabel":"Create","parentKey":"area.PersonalNotes:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":200,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.PersonalNotes:Access","module.notes:Access","PersonalNotes:View"]},{"key":"PersonalNotes:Maintain","displayName":"Edit existing records","description":"Edit existing personal notes records.","module":"Notes","resource":"PersonalNotes","resourceLabel":"Edit existing records","parentKey":"area.PersonalNotes:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":201,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.PersonalNotes:Access","module.notes:Access","PersonalNotes:View"]},{"key":"PersonalNotes:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused personal notes records.","module":"Notes","resource":"PersonalNotes","resourceLabel":"Permanently delete unused records","parentKey":"area.PersonalNotes:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":202,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.PersonalNotes:Access","module.notes:Access","PersonalNotes:View"]},{"key":"PersonalNotes:Download","displayName":"Download","description":"Download","module":"Notes","resource":"PersonalNotes","resourceLabel":"Download","parentKey":"area.PersonalNotes:Access","action":"Download","actionLabel":"Download","nodeType":"Action","displayOrder":203,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.PersonalNotes:Access","module.notes:Access","PersonalNotes:View"]},{"key":"area.Notifications:Access","displayName":"Notifications","description":"Access this functional area. This does not grant its actions or tabs.","module":"Dashboard","resource":"area.Notifications","resourceLabel":"Notifications","parentKey":"module.dashboard:Access","action":"Access","actionLabel":"Notifications","nodeType":"Submodule","displayOrder":204,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.dashboard:Access"]},{"key":"Notifications:View","displayName":"View pages and records","description":"Access your own notification center and unread counts. Other users'''' notices remain private.","module":"Dashboard","resource":"Notifications","resourceLabel":"View pages and records","parentKey":"area.Notifications:Access","action":"View","actionLabel":"View pages and records","nodeType":"Action","displayOrder":205,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Notifications:Access","module.dashboard:Access"]},{"key":"Notifications:Maintain","displayName":"Edit existing records","description":"Edit existing notifications records.","module":"Dashboard","resource":"Notifications","resourceLabel":"Edit existing records","parentKey":"area.Notifications:Access","action":"Maintain","actionLabel":"Edit existing records","nodeType":"Action","displayOrder":206,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Notifications:Access","module.dashboard:Access","Notifications:View"]},{"key":"Notifications:Delete","displayName":"Permanently delete unused records","description":"Permanently delete unused notifications records.","module":"Dashboard","resource":"Notifications","resourceLabel":"Permanently delete unused records","parentKey":"area.Notifications:Access","action":"Delete","actionLabel":"Permanently delete unused records","nodeType":"Action","displayOrder":207,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.Notifications:Access","module.dashboard:Access","Notifications:View"]},{"key":"tab.ClientStructure.structure:Access","displayName":"Regions & environments","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.structure","resourceLabel":"Regions & environments","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Regions & environments","nodeType":"Tab","displayOrder":208,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.structure:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.structure","resourceLabel":"View","parentKey":"tab.ClientStructure.structure:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":209,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.structure:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View","Environments:View"]},{"key":"tab.ClientStructure.organizations:Access","displayName":"Organizations","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.organizations","resourceLabel":"Organizations","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Organizations","nodeType":"Tab","displayOrder":210,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.organizations:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.organizations","resourceLabel":"View","parentKey":"tab.ClientStructure.organizations:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":211,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.organizations:Access","area.ClientStructure:Access","module.clients:Access","ClientStructure:View"]},{"key":"tab.ClientStructure.contracts:Access","displayName":"Contracts & SLAs","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.contracts","resourceLabel":"Contracts & SLAs","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Contracts & SLAs","nodeType":"Tab","displayOrder":212,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.contracts:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.contracts","resourceLabel":"View","parentKey":"tab.ClientStructure.contracts:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":213,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.contracts:Access","area.ClientStructure:Access","module.clients:Access","Contracts:View"]},{"key":"tab.ClientStructure.cases:Access","displayName":"Cases","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.cases","resourceLabel":"Cases","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Cases","nodeType":"Tab","displayOrder":214,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.cases:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.cases","resourceLabel":"View","parentKey":"tab.ClientStructure.cases:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":215,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.cases:Access","area.ClientStructure:Access","module.clients:Access","Cases:View"]},{"key":"tab.ClientStructure.commitments:Access","displayName":"Commitments","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.commitments","resourceLabel":"Commitments","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Commitments","nodeType":"Tab","displayOrder":216,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.commitments:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.commitments","resourceLabel":"View","parentKey":"tab.ClientStructure.commitments:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":217,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.commitments:Access","area.ClientStructure:Access","module.clients:Access","Commitments:View"]},{"key":"tab.ClientStructure.escalations:Access","displayName":"Escalations","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.escalations","resourceLabel":"Escalations","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Escalations","nodeType":"Tab","displayOrder":218,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.escalations:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.escalations","resourceLabel":"View","parentKey":"tab.ClientStructure.escalations:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":219,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.escalations:Access","area.ClientStructure:Access","module.clients:Access","OtherOperations:View"]},{"key":"tab.ClientStructure.infra:Access","displayName":"Infrastructure","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.infra","resourceLabel":"Infrastructure","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Infrastructure","nodeType":"Tab","displayOrder":220,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.infra:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.infra","resourceLabel":"View","parentKey":"tab.ClientStructure.infra:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":221,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.infra:Access","area.ClientStructure:Access","module.clients:Access","Servers:View"]},{"key":"tab.ClientStructure.projects:Access","displayName":"Projects","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.projects","resourceLabel":"Projects","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Projects","nodeType":"Tab","displayOrder":222,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.projects:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.projects","resourceLabel":"View","parentKey":"tab.ClientStructure.projects:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":223,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.projects:Access","area.ClientStructure:Access","module.clients:Access","Projects:View"]},{"key":"tab.ClientStructure.contacts:Access","displayName":"Contacts & responsibilities","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.contacts","resourceLabel":"Contacts & responsibilities","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"Contacts & responsibilities","nodeType":"Tab","displayOrder":224,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.contacts:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.contacts","resourceLabel":"View","parentKey":"tab.ClientStructure.contacts:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":225,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.contacts:Access","area.ClientStructure:Access","module.clients:Access","OtherOperations:View"]},{"key":"tab.ClientStructure.notes:Access","displayName":"My notes","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.ClientStructure.notes","resourceLabel":"My notes","parentKey":"area.ClientStructure:Access","action":"Access","actionLabel":"My notes","nodeType":"Tab","displayOrder":226,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientStructure:Access","module.clients:Access"]},{"key":"tab.ClientStructure.notes:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.ClientStructure.notes","resourceLabel":"View","parentKey":"tab.ClientStructure.notes:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":227,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.notes:Access","area.ClientStructure:Access","module.clients:Access","PersonalNotes:View"]},{"key":"tab.Environments.apps:Access","displayName":"Applications","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.Environments.apps","resourceLabel":"Applications","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Applications","nodeType":"Tab","displayOrder":228,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.apps:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.Environments.apps","resourceLabel":"View","parentKey":"tab.Environments.apps:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":229,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.apps:Access","area.Environments:Access","module.clients:Access","Installations:View","Products:View","Servers:View"]},{"key":"tab.Environments.assets:Access","displayName":"Servers & assets","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.Environments.assets","resourceLabel":"Servers & assets","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Servers & assets","nodeType":"Tab","displayOrder":230,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.assets:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.Environments.assets","resourceLabel":"View","parentKey":"tab.Environments.assets:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":231,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.assets:Access","area.Environments:Access","module.clients:Access","Servers:View"]},{"key":"tab.Environments.work:Access","displayName":"Work","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.Environments.work","resourceLabel":"Work","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Work","nodeType":"Tab","displayOrder":232,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.work:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.Environments.work","resourceLabel":"View","parentKey":"tab.Environments.work:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":233,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.work:Access","area.Environments:Access","module.clients:Access","Cases:View","Commitments:View","OtherOperations:View"]},{"key":"tab.Environments.network:Access","displayName":"Firewall rules","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.Environments.network","resourceLabel":"Firewall rules","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Firewall rules","nodeType":"Tab","displayOrder":234,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.network:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.Environments.network","resourceLabel":"View","parentKey":"tab.Environments.network:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":235,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.network:Access","area.Environments:Access","module.clients:Access","OtherOperations:View"]},{"key":"tab.Environments.conditions:Access","displayName":"Condition history","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.Environments.conditions","resourceLabel":"Condition history","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Condition history","nodeType":"Tab","displayOrder":236,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.conditions:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.Environments.conditions","resourceLabel":"View","parentKey":"tab.Environments.conditions:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":237,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.conditions:Access","area.Environments:Access","module.clients:Access","Environments:View"]},{"key":"tab.Environments.quality:Access","displayName":"Data quality","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Clients","resource":"tab.Environments.quality","resourceLabel":"Data quality","parentKey":"area.Environments:Access","action":"Access","actionLabel":"Data quality","nodeType":"Tab","displayOrder":238,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Environments:Access","module.clients:Access"]},{"key":"tab.Environments.quality:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Clients","resource":"tab.Environments.quality","resourceLabel":"View","parentKey":"tab.Environments.quality:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":239,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.quality:Access","area.Environments:Access","module.clients:Access","ClientStructure:View","Projects:View","Contracts:View","Environments:View","Servers:View","Installations:View","Products:View","Cases:View","Commitments:View","Teams:View","OtherOperations:View"]},{"key":"tab.Cases.timeline:Access","displayName":"Timeline","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Cases","resource":"tab.Cases.timeline","resourceLabel":"Timeline","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Timeline","nodeType":"Tab","displayOrder":240,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.timeline:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Cases","resource":"tab.Cases.timeline","resourceLabel":"View","parentKey":"tab.Cases.timeline:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":241,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.timeline:Access","area.Cases:Access","module.cases:Access","Cases:HistoryView"]},{"key":"tab.Cases.affected:Access","displayName":"Affected records","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Cases","resource":"tab.Cases.affected","resourceLabel":"Affected records","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Affected records","nodeType":"Tab","displayOrder":242,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.affected:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Cases","resource":"tab.Cases.affected","resourceLabel":"View","parentKey":"tab.Cases.affected:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":243,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.affected:Access","area.Cases:Access","module.cases:Access","Cases:DetailsView"]},{"key":"tab.Cases.jira:Access","displayName":"Jira references","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Cases","resource":"tab.Cases.jira","resourceLabel":"Jira references","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Jira references","nodeType":"Tab","displayOrder":244,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.jira:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Cases","resource":"tab.Cases.jira","resourceLabel":"View","parentKey":"tab.Cases.jira:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":245,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.jira:Access","area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"tab.Cases.impact:Access","displayName":"Documented impact","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Cases","resource":"tab.Cases.impact","resourceLabel":"Documented impact","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Documented impact","nodeType":"Tab","displayOrder":246,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.impact:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Cases","resource":"tab.Cases.impact","resourceLabel":"View","parentKey":"tab.Cases.impact:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":247,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.impact:Access","area.Cases:Access","module.cases:Access","Cases:View"]},{"key":"tab.Cases.commitments:Access","displayName":"Commitments","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Cases","resource":"tab.Cases.commitments","resourceLabel":"Commitments","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Commitments","nodeType":"Tab","displayOrder":248,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.commitments:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Cases","resource":"tab.Cases.commitments","resourceLabel":"View","parentKey":"tab.Cases.commitments:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":249,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.commitments:Access","area.Cases:Access","module.cases:Access","Commitments:View"]},{"key":"tab.Cases.escalations:Access","displayName":"Escalations","description":"Access this tab. Previously configured actions remain stored when disabled.","module":"Cases","resource":"tab.Cases.escalations","resourceLabel":"Escalations","parentKey":"area.Cases:Access","action":"Access","actionLabel":"Escalations","nodeType":"Tab","displayOrder":250,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Cases:Access","module.cases:Access"]},{"key":"tab.Cases.escalations:View","displayName":"View","description":"View this tab''''s data; source resource permissions and record scope also apply.","module":"Cases","resource":"tab.Cases.escalations","resourceLabel":"View","parentKey":"tab.Cases.escalations:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":251,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.escalations:Access","area.Cases:Access","module.cases:Access","OtherOperations:View"]},{"key":"tab.ClientStructure.structure:Create","displayName":"Create","description":"Create within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.structure","resourceLabel":"Create","parentKey":"tab.ClientStructure.structure:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":252,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.structure:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.structure:View","ClientStructure:Create"]},{"key":"tab.ClientStructure.structure:Maintain","displayName":"Edit","description":"Maintain within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.structure","resourceLabel":"Edit","parentKey":"tab.ClientStructure.structure:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":253,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.structure:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.structure:View","ClientStructure:Maintain"]},{"key":"tab.ClientStructure.structure:ArchiveRestore","displayName":"ArchiveRestore","description":"ArchiveRestore within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.structure","resourceLabel":"ArchiveRestore","parentKey":"tab.ClientStructure.structure:Access","action":"ArchiveRestore","actionLabel":"ArchiveRestore","nodeType":"Action","displayOrder":254,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.structure:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.structure:View","ClientStructure:ArchiveRestore"]},{"key":"tab.ClientStructure.structure:Delete","displayName":"Delete","description":"Delete within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.structure","resourceLabel":"Delete","parentKey":"tab.ClientStructure.structure:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":255,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.structure:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.structure:View","ClientStructure:Delete"]},{"key":"tab.ClientStructure.organizations:Create","displayName":"Create","description":"Create within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.organizations","resourceLabel":"Create","parentKey":"tab.ClientStructure.organizations:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":256,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.organizations:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.organizations:View","ClientStructure:Create"]},{"key":"tab.ClientStructure.organizations:Maintain","displayName":"Edit","description":"Maintain within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.organizations","resourceLabel":"Edit","parentKey":"tab.ClientStructure.organizations:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":257,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.organizations:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.organizations:View","ClientStructure:Maintain"]},{"key":"tab.ClientStructure.organizations:Delete","displayName":"Delete","description":"Delete within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.organizations","resourceLabel":"Delete","parentKey":"tab.ClientStructure.organizations:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":258,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.organizations:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.organizations:View","ClientStructure:Delete"]},{"key":"tab.ClientStructure.contacts:Create","displayName":"Create","description":"Create within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.contacts","resourceLabel":"Create","parentKey":"tab.ClientStructure.contacts:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":259,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.contacts:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.contacts:View","OtherOperations:Create"]},{"key":"tab.ClientStructure.contacts:Maintain","displayName":"Edit","description":"Maintain within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.contacts","resourceLabel":"Edit","parentKey":"tab.ClientStructure.contacts:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":260,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.contacts:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.contacts:View","OtherOperations:Maintain"]},{"key":"tab.ClientStructure.contacts:ArchiveRestore","displayName":"ArchiveRestore","description":"ArchiveRestore within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.contacts","resourceLabel":"ArchiveRestore","parentKey":"tab.ClientStructure.contacts:Access","action":"ArchiveRestore","actionLabel":"ArchiveRestore","nodeType":"Action","displayOrder":261,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.contacts:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.contacts:View","OtherOperations:ArchiveRestore"]},{"key":"tab.ClientStructure.contacts:Delete","displayName":"Delete","description":"Delete within this section; the existing resource action is also required.","module":"Clients","resource":"tab.ClientStructure.contacts","resourceLabel":"Delete","parentKey":"tab.ClientStructure.contacts:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":262,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.ClientStructure.contacts:Access","area.ClientStructure:Access","module.clients:Access","tab.ClientStructure.contacts:View","OtherOperations:Delete"]},{"key":"tab.Cases.jira:Create","displayName":"Create","description":"Create within this section; the existing resource action is also required.","module":"Cases","resource":"tab.Cases.jira","resourceLabel":"Create","parentKey":"tab.Cases.jira:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":263,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.jira:Access","area.Cases:Access","module.cases:Access","tab.Cases.jira:View","Cases:Maintain"]},{"key":"tab.Cases.jira:Delete","displayName":"Delete","description":"Delete within this section; the existing resource action is also required.","module":"Cases","resource":"tab.Cases.jira","resourceLabel":"Delete","parentKey":"tab.Cases.jira:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":264,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Cases.jira:Access","area.Cases:Access","module.cases:Access","tab.Cases.jira:View","Cases:Maintain"]},{"key":"tab.Environments.conditions:Create","displayName":"Create","description":"Create within this section; the existing resource action is also required.","module":"Clients","resource":"tab.Environments.conditions","resourceLabel":"Create","parentKey":"tab.Environments.conditions:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":265,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["tab.Environments.conditions:Access","area.Environments:Access","module.clients:Access","tab.Environments.conditions:View","Environments:Maintain"]},{"key":"area.ClientMap:Access","displayName":"Client map","description":"Access this functional area; actions are independent.","module":"Dashboard","resource":"area.ClientMap","resourceLabel":"Client map","parentKey":"module.dashboard:Access","action":"Access","actionLabel":"Client map","nodeType":"Submodule","displayOrder":266,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.dashboard:Access"]},{"key":"ClientMap:View","displayName":"View","description":"View in Client map. Existing administration, data, ownership and scope checks still apply.","module":"Dashboard","resource":"ClientMap","resourceLabel":"View","parentKey":"area.ClientMap:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":267,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ClientMap:Access","module.dashboard:Access","Dashboard:View"]},{"key":"area.ActionList:Access","displayName":"Action list","description":"Access this functional area; actions are independent.","module":"Dashboard","resource":"area.ActionList","resourceLabel":"Action list","parentKey":"module.dashboard:Access","action":"Access","actionLabel":"Action list","nodeType":"Submodule","displayOrder":268,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.dashboard:Access"]},{"key":"ActionList:View","displayName":"View","description":"View in Action list. Existing administration, data, ownership and scope checks still apply.","module":"Dashboard","resource":"ActionList","resourceLabel":"View","parentKey":"area.ActionList:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":269,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ActionList:Access","module.dashboard:Access","Dashboard:View"]},{"key":"area.DataQuality:Access","displayName":"Data quality","description":"Access this functional area; actions are independent.","module":"Dashboard","resource":"area.DataQuality","resourceLabel":"Data quality","parentKey":"module.dashboard:Access","action":"Access","actionLabel":"Data quality","nodeType":"Submodule","displayOrder":270,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.dashboard:Access"]},{"key":"DataQuality:View","displayName":"View","description":"View in Data quality. Existing administration, data, ownership and scope checks still apply.","module":"Dashboard","resource":"DataQuality","resourceLabel":"View","parentKey":"area.DataQuality:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":271,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.DataQuality:Access","module.dashboard:Access","Dashboard:View"]},{"key":"DataQuality:Maintain","displayName":"Edit","description":"Maintain in Data quality. Existing administration, data, ownership and scope checks still apply.","module":"Dashboard","resource":"DataQuality","resourceLabel":"Edit","parentKey":"area.DataQuality:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":272,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.DataQuality:Access","module.dashboard:Access","DataQuality:View"]},{"key":"area.Handovers:Access","displayName":"Handovers","description":"Access this functional area; actions are independent.","module":"Teams","resource":"area.Handovers","resourceLabel":"Handovers","parentKey":"module.teams:Access","action":"Access","actionLabel":"Handovers","nodeType":"Submodule","displayOrder":273,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.teams:Access"]},{"key":"Handovers:View","displayName":"View","description":"View in Handovers. Existing administration, data, ownership and scope checks still apply.","module":"Teams","resource":"Handovers","resourceLabel":"View","parentKey":"area.Handovers:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":274,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Handovers:Access","module.teams:Access","Teams:View"]},{"key":"Handovers:Create","displayName":"Create","description":"Create in Handovers. Existing administration, data, ownership and scope checks still apply.","module":"Teams","resource":"Handovers","resourceLabel":"Create","parentKey":"area.Handovers:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":275,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Handovers:Access","module.teams:Access","Handovers:View"]},{"key":"Handovers:Maintain","displayName":"Edit","description":"Maintain in Handovers. Existing administration, data, ownership and scope checks still apply.","module":"Teams","resource":"Handovers","resourceLabel":"Edit","parentKey":"area.Handovers:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":276,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Handovers:Access","module.teams:Access","Handovers:View"]},{"key":"area.Reassignment:Access","displayName":"Reassignment queue","description":"Access this functional area; actions are independent.","module":"Teams","resource":"area.Reassignment","resourceLabel":"Reassignment queue","parentKey":"module.teams:Access","action":"Access","actionLabel":"Reassignment queue","nodeType":"Submodule","displayOrder":277,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.teams:Access"]},{"key":"Reassignment:View","displayName":"View","description":"View in Reassignment queue. Existing administration, data, ownership and scope checks still apply.","module":"Teams","resource":"Reassignment","resourceLabel":"View","parentKey":"area.Reassignment:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":278,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.Reassignment:Access","module.teams:Access","Teams:View"]},{"key":"area.ReportOverview:Access","displayName":"Overview","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.ReportOverview","resourceLabel":"Overview","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Overview","nodeType":"Submodule","displayOrder":279,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"ReportOverview:View","displayName":"View","description":"View in Overview. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportOverview","resourceLabel":"View","parentKey":"area.ReportOverview:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":280,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportOverview:Access","module.reporting:Access","Reporting:View"]},{"key":"area.ReportLibrary:Access","displayName":"Report library","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.ReportLibrary","resourceLabel":"Report library","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Report library","nodeType":"Submodule","displayOrder":281,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"ReportLibrary:View","displayName":"View","description":"View in Report library. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportLibrary","resourceLabel":"View","parentKey":"area.ReportLibrary:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":282,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportLibrary:Access","module.reporting:Access","Reporting:View"]},{"key":"ReportLibrary:Create","displayName":"Create","description":"Create in Report library. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportLibrary","resourceLabel":"Create","parentKey":"area.ReportLibrary:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":283,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportLibrary:Access","module.reporting:Access","ReportLibrary:View"]},{"key":"ReportLibrary:Delete","displayName":"Delete","description":"Delete in Report library. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportLibrary","resourceLabel":"Delete","parentKey":"area.ReportLibrary:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":284,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportLibrary:Access","module.reporting:Access","ReportLibrary:View"]},{"key":"ReportLibrary:Export","displayName":"Export","description":"Export in Report library. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportLibrary","resourceLabel":"Export","parentKey":"area.ReportLibrary:Access","action":"Export","actionLabel":"Export","nodeType":"Action","displayOrder":285,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportLibrary:Access","module.reporting:Access","ReportLibrary:View"]},{"key":"area.ReportBuilder:Access","displayName":"Cases report builder","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.ReportBuilder","resourceLabel":"Cases report builder","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Cases report builder","nodeType":"Submodule","displayOrder":286,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"ReportBuilder:View","displayName":"View","description":"View in Cases report builder. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportBuilder","resourceLabel":"View","parentKey":"area.ReportBuilder:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":287,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportBuilder:Access","module.reporting:Access","Reporting:View"]},{"key":"ReportBuilder:Export","displayName":"Export","description":"Export in Cases report builder. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportBuilder","resourceLabel":"Export","parentKey":"area.ReportBuilder:Access","action":"Export","actionLabel":"Export","nodeType":"Action","displayOrder":288,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportBuilder:Access","module.reporting:Access","ReportBuilder:View"]},{"key":"area.SavedReports:Access","displayName":"My reports","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.SavedReports","resourceLabel":"My reports","parentKey":"module.reporting:Access","action":"Access","actionLabel":"My reports","nodeType":"Submodule","displayOrder":289,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"SavedReports:View","displayName":"View","description":"View in My reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"SavedReports","resourceLabel":"View","parentKey":"area.SavedReports:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":290,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.SavedReports:Access","module.reporting:Access","Reporting:View"]},{"key":"SavedReports:Create","displayName":"Create","description":"Create in My reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"SavedReports","resourceLabel":"Create","parentKey":"area.SavedReports:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":291,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.SavedReports:Access","module.reporting:Access","SavedReports:View"]},{"key":"SavedReports:Maintain","displayName":"Edit","description":"Maintain in My reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"SavedReports","resourceLabel":"Edit","parentKey":"area.SavedReports:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":292,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.SavedReports:Access","module.reporting:Access","SavedReports:View"]},{"key":"SavedReports:Delete","displayName":"Delete","description":"Delete in My reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"SavedReports","resourceLabel":"Delete","parentKey":"area.SavedReports:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":293,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.SavedReports:Access","module.reporting:Access","SavedReports:View"]},{"key":"area.ReportSchedules:Access","displayName":"Scheduled reports","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.ReportSchedules","resourceLabel":"Scheduled reports","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Scheduled reports","nodeType":"Submodule","displayOrder":294,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"ReportSchedules:View","displayName":"View","description":"View in Scheduled reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportSchedules","resourceLabel":"View","parentKey":"area.ReportSchedules:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":295,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportSchedules:Access","module.reporting:Access","Reporting:View"]},{"key":"ReportSchedules:Create","displayName":"Create","description":"Create in Scheduled reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportSchedules","resourceLabel":"Create","parentKey":"area.ReportSchedules:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":296,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportSchedules:Access","module.reporting:Access","ReportSchedules:View"]},{"key":"ReportSchedules:Maintain","displayName":"Edit","description":"Maintain in Scheduled reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportSchedules","resourceLabel":"Edit","parentKey":"area.ReportSchedules:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":297,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportSchedules:Access","module.reporting:Access","ReportSchedules:View"]},{"key":"ReportSchedules:Delete","displayName":"Delete","description":"Delete in Scheduled reports. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportSchedules","resourceLabel":"Delete","parentKey":"area.ReportSchedules:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":298,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportSchedules:Access","module.reporting:Access","ReportSchedules:View"]},{"key":"area.ReportHistory:Access","displayName":"Export history","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.ReportHistory","resourceLabel":"Export history","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Export history","nodeType":"Submodule","displayOrder":299,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"ReportHistory:View","displayName":"View","description":"View in Export history. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportHistory","resourceLabel":"View","parentKey":"area.ReportHistory:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":300,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportHistory:Access","module.reporting:Access","Reporting:View"]},{"key":"ReportHistory:Create","displayName":"Create","description":"Create in Export history. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportHistory","resourceLabel":"Create","parentKey":"area.ReportHistory:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":301,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportHistory:Access","module.reporting:Access","ReportHistory:View"]},{"key":"ReportHistory:Maintain","displayName":"Edit","description":"Maintain in Export history. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportHistory","resourceLabel":"Edit","parentKey":"area.ReportHistory:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":302,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportHistory:Access","module.reporting:Access","ReportHistory:View"]},{"key":"ReportHistory:Download","displayName":"Download","description":"Download in Export history. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportHistory","resourceLabel":"Download","parentKey":"area.ReportHistory:Access","action":"Download","actionLabel":"Download","nodeType":"Action","displayOrder":303,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportHistory:Access","module.reporting:Access","ReportHistory:View"]},{"key":"area.ReportTemplates:Access","displayName":"Templates","description":"Access this functional area; actions are independent.","module":"Reporting Center","resource":"area.ReportTemplates","resourceLabel":"Templates","parentKey":"module.reporting:Access","action":"Access","actionLabel":"Templates","nodeType":"Submodule","displayOrder":304,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.reporting:Access"]},{"key":"ReportTemplates:View","displayName":"View","description":"View in Templates. Existing administration, data, ownership and scope checks still apply.","module":"Reporting Center","resource":"ReportTemplates","resourceLabel":"View","parentKey":"area.ReportTemplates:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":305,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["area.ReportTemplates:Access","module.reporting:Access","Reporting:View"]},{"key":"area.AdminUsers:Access","displayName":"Users & access","description":"Access this functional area; actions are independent.","module":"Administration","resource":"area.AdminUsers","resourceLabel":"Users & access","parentKey":"module.admin:Access","action":"Access","actionLabel":"Users & access","nodeType":"Submodule","displayOrder":306,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.admin:Access"]},{"key":"AdminUsers:View","displayName":"View","description":"View in Users & access. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminUsers","resourceLabel":"View","parentKey":"area.AdminUsers:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":307,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminUsers:Access","module.admin:Access"]},{"key":"AdminUsers:Create","displayName":"Create","description":"Create in Users & access. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminUsers","resourceLabel":"Create","parentKey":"area.AdminUsers:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":308,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminUsers:Access","module.admin:Access","AdminUsers:View"]},{"key":"AdminUsers:Maintain","displayName":"Edit","description":"Maintain in Users & access. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminUsers","resourceLabel":"Edit","parentKey":"area.AdminUsers:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":309,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminUsers:Access","module.admin:Access","AdminUsers:View"]},{"key":"AdminUsers:Delete","displayName":"Delete","description":"Delete in Users & access. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminUsers","resourceLabel":"Delete","parentKey":"area.AdminUsers:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":310,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminUsers:Access","module.admin:Access","AdminUsers:View"]},{"key":"area.AdminRoles:Access","displayName":"Roles and rights","description":"Access this functional area; actions are independent.","module":"Administration","resource":"area.AdminRoles","resourceLabel":"Roles and rights","parentKey":"module.admin:Access","action":"Access","actionLabel":"Roles and rights","nodeType":"Submodule","displayOrder":311,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.admin:Access"]},{"key":"AdminRoles:View","displayName":"View","description":"View in Roles and rights. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminRoles","resourceLabel":"View","parentKey":"area.AdminRoles:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":312,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminRoles:Access","module.admin:Access"]},{"key":"AdminRoles:Create","displayName":"Create","description":"Create in Roles and rights. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminRoles","resourceLabel":"Create","parentKey":"area.AdminRoles:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":313,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminRoles:Access","module.admin:Access","AdminRoles:View"]},{"key":"AdminRoles:Maintain","displayName":"Edit","description":"Maintain in Roles and rights. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminRoles","resourceLabel":"Edit","parentKey":"area.AdminRoles:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":314,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminRoles:Access","module.admin:Access","AdminRoles:View"]},{"key":"AdminRoles:Delete","displayName":"Delete","description":"Delete in Roles and rights. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminRoles","resourceLabel":"Delete","parentKey":"area.AdminRoles:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":315,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminRoles:Access","module.admin:Access","AdminRoles:View"]},{"key":"area.AdminGroups:Access","displayName":"Group mappings","description":"Access this functional area; actions are independent.","module":"Administration","resource":"area.AdminGroups","resourceLabel":"Group mappings","parentKey":"module.admin:Access","action":"Access","actionLabel":"Group mappings","nodeType":"Submodule","displayOrder":316,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.admin:Access"]},{"key":"AdminGroups:View","displayName":"View","description":"View in Group mappings. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminGroups","resourceLabel":"View","parentKey":"area.AdminGroups:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":317,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminGroups:Access","module.admin:Access"]},{"key":"AdminGroups:Create","displayName":"Create","description":"Create in Group mappings. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminGroups","resourceLabel":"Create","parentKey":"area.AdminGroups:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":318,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminGroups:Access","module.admin:Access","AdminGroups:View"]},{"key":"AdminGroups:Maintain","displayName":"Edit","description":"Maintain in Group mappings. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminGroups","resourceLabel":"Edit","parentKey":"area.AdminGroups:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":319,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminGroups:Access","module.admin:Access","AdminGroups:View"]},{"key":"area.AdminConfig:Access","displayName":"Configuration","description":"Access this functional area; actions are independent.","module":"Administration","resource":"area.AdminConfig","resourceLabel":"Configuration","parentKey":"module.admin:Access","action":"Access","actionLabel":"Configuration","nodeType":"Submodule","displayOrder":320,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.admin:Access"]},{"key":"AdminConfig:View","displayName":"View","description":"View in Configuration. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminConfig","resourceLabel":"View","parentKey":"area.AdminConfig:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":321,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminConfig:Access","module.admin:Access"]},{"key":"AdminConfig:Create","displayName":"Create","description":"Create in Configuration. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminConfig","resourceLabel":"Create","parentKey":"area.AdminConfig:Access","action":"Create","actionLabel":"Create","nodeType":"Action","displayOrder":322,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminConfig:Access","module.admin:Access","AdminConfig:View"]},{"key":"AdminConfig:Maintain","displayName":"Edit","description":"Maintain in Configuration. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminConfig","resourceLabel":"Edit","parentKey":"area.AdminConfig:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":323,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminConfig:Access","module.admin:Access","AdminConfig:View"]},{"key":"AdminConfig:Delete","displayName":"Delete","description":"Delete in Configuration. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminConfig","resourceLabel":"Delete","parentKey":"area.AdminConfig:Access","action":"Delete","actionLabel":"Delete","nodeType":"Action","displayOrder":324,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminConfig:Access","module.admin:Access","AdminConfig:View"]},{"key":"area.AdminSettings:Access","displayName":"Settings","description":"Access this functional area; actions are independent.","module":"Administration","resource":"area.AdminSettings","resourceLabel":"Settings","parentKey":"module.admin:Access","action":"Access","actionLabel":"Settings","nodeType":"Submodule","displayOrder":325,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.admin:Access"]},{"key":"AdminSettings:View","displayName":"View","description":"View in Settings. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminSettings","resourceLabel":"View","parentKey":"area.AdminSettings:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":326,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminSettings:Access","module.admin:Access"]},{"key":"AdminSettings:Maintain","displayName":"Edit","description":"Maintain in Settings. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminSettings","resourceLabel":"Edit","parentKey":"area.AdminSettings:Access","action":"Maintain","actionLabel":"Edit","nodeType":"Action","displayOrder":327,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminSettings:Access","module.admin:Access","AdminSettings:View"]},{"key":"area.AdminAudit:Access","displayName":"Change history","description":"Access this functional area; actions are independent.","module":"Administration","resource":"area.AdminAudit","resourceLabel":"Change history","parentKey":"module.admin:Access","action":"Access","actionLabel":"Change history","nodeType":"Submodule","displayOrder":328,"riskLevel":"Normal","supportsScope":false,"isActive":true,"requires":["module.admin:Access"]},{"key":"AdminAudit:View","displayName":"View","description":"View in Change history. Existing administration, data, ownership and scope checks still apply.","module":"Administration","resource":"AdminAudit","resourceLabel":"View","parentKey":"area.AdminAudit:Access","action":"View","actionLabel":"View","nodeType":"Action","displayOrder":329,"riskLevel":"High","supportsScope":false,"isActive":true,"requires":["area.AdminAudit:Access","module.admin:Access"]}]'';
    DECLARE @mapping nvarchar(max) = N''[{"source":"ClientStructure:View","target":"area.ClientStructure:Access"},{"source":"ClientStructure:View","target":"module.clients:Access"},{"source":"ClientStructure:DetailsView","target":"area.ClientStructure:Access"},{"source":"ClientStructure:DetailsView","target":"module.clients:Access"},{"source":"ClientStructure:HistoryView","target":"tab.ClientStructure.history:Access"},{"source":"ClientStructure:HistoryView","target":"area.ClientStructure:Access"},{"source":"ClientStructure:HistoryView","target":"module.clients:Access"},{"source":"ClientStructure:AttachmentsView","target":"tab.ClientStructure.files:Access"},{"source":"ClientStructure:AttachmentsView","target":"area.ClientStructure:Access"},{"source":"ClientStructure:AttachmentsView","target":"module.clients:Access"},{"source":"ClientStructure:AttachmentsUpload","target":"tab.ClientStructure.files:Access"},{"source":"ClientStructure:AttachmentsUpload","target":"area.ClientStructure:Access"},{"source":"ClientStructure:AttachmentsUpload","target":"module.clients:Access"},{"source":"ClientStructure:AttachmentsDeleteOwn","target":"tab.ClientStructure.files:Access"},{"source":"ClientStructure:AttachmentsDeleteOwn","target":"area.ClientStructure:Access"},{"source":"ClientStructure:AttachmentsDeleteOwn","target":"module.clients:Access"},{"source":"ClientStructure:AttachmentsDelete","target":"tab.ClientStructure.files:Access"},{"source":"ClientStructure:AttachmentsDelete","target":"area.ClientStructure:Access"},{"source":"ClientStructure:AttachmentsDelete","target":"module.clients:Access"},{"source":"Projects:View","target":"area.Projects:Access"},{"source":"Projects:View","target":"module.clients:Access"},{"source":"Projects:DetailsView","target":"tab.Projects.details:Access"},{"source":"Projects:DetailsView","target":"area.Projects:Access"},{"source":"Projects:DetailsView","target":"module.clients:Access"},{"source":"Projects:HistoryView","target":"tab.Projects.history:Access"},{"source":"Projects:HistoryView","target":"area.Projects:Access"},{"source":"Projects:HistoryView","target":"module.clients:Access"},{"source":"Projects:AttachmentsView","target":"tab.Projects.files:Access"},{"source":"Projects:AttachmentsView","target":"area.Projects:Access"},{"source":"Projects:AttachmentsView","target":"module.clients:Access"},{"source":"Projects:AttachmentsUpload","target":"tab.Projects.files:Access"},{"source":"Projects:AttachmentsUpload","target":"area.Projects:Access"},{"source":"Projects:AttachmentsUpload","target":"module.clients:Access"},{"source":"Projects:AttachmentsDeleteOwn","target":"tab.Projects.files:Access"},{"source":"Projects:AttachmentsDeleteOwn","target":"area.Projects:Access"},{"source":"Projects:AttachmentsDeleteOwn","target":"module.clients:Access"},{"source":"Projects:AttachmentsDelete","target":"tab.Projects.files:Access"},{"source":"Projects:AttachmentsDelete","target":"area.Projects:Access"},{"source":"Projects:AttachmentsDelete","target":"module.clients:Access"},{"source":"Contracts:View","target":"area.Contracts:Access"},{"source":"Contracts:View","target":"module.clients:Access"},{"source":"Contracts:DetailsView","target":"tab.Contracts.details:Access"},{"source":"Contracts:DetailsView","target":"area.Contracts:Access"},{"source":"Contracts:DetailsView","target":"module.clients:Access"},{"source":"Contracts:HistoryView","target":"tab.Contracts.history:Access"},{"source":"Contracts:HistoryView","target":"area.Contracts:Access"},{"source":"Contracts:HistoryView","target":"module.clients:Access"},{"source":"Contracts:AttachmentsView","target":"tab.Contracts.files:Access"},{"source":"Contracts:AttachmentsView","target":"area.Contracts:Access"},{"source":"Contracts:AttachmentsView","target":"module.clients:Access"},{"source":"Contracts:AttachmentsUpload","target":"tab.Contracts.files:Access"},{"source":"Contracts:AttachmentsUpload","target":"area.Contracts:Access"},{"source":"Contracts:AttachmentsUpload","target":"module.clients:Access"},{"source":"Contracts:AttachmentsDeleteOwn","target":"tab.Contracts.files:Access"},{"source":"Contracts:AttachmentsDeleteOwn","target":"area.Contracts:Access"},{"source":"Contracts:AttachmentsDeleteOwn","target":"module.clients:Access"},{"source":"Contracts:AttachmentsDelete","target":"tab.Contracts.files:Access"},{"source":"Contracts:AttachmentsDelete","target":"area.Contracts:Access"},{"source":"Contracts:AttachmentsDelete","target":"module.clients:Access"},{"source":"Environments:View","target":"area.Environments:Access"},{"source":"Environments:View","target":"module.clients:Access"},{"source":"Environments:DetailsView","target":"area.Environments:Access"},{"source":"Environments:DetailsView","target":"module.clients:Access"},{"source":"Environments:HistoryView","target":"tab.Environments.history:Access"},{"source":"Environments:HistoryView","target":"area.Environments:Access"},{"source":"Environments:HistoryView","target":"module.clients:Access"},{"source":"Environments:AttachmentsView","target":"tab.Environments.files:Access"},{"source":"Environments:AttachmentsView","target":"area.Environments:Access"},{"source":"Environments:AttachmentsView","target":"module.clients:Access"},{"source":"Environments:AttachmentsUpload","target":"tab.Environments.files:Access"},{"source":"Environments:AttachmentsUpload","target":"area.Environments:Access"},{"source":"Environments:AttachmentsUpload","target":"module.clients:Access"},{"source":"Environments:AttachmentsDeleteOwn","target":"tab.Environments.files:Access"},{"source":"Environments:AttachmentsDeleteOwn","target":"area.Environments:Access"},{"source":"Environments:AttachmentsDeleteOwn","target":"module.clients:Access"},{"source":"Environments:AttachmentsDelete","target":"tab.Environments.files:Access"},{"source":"Environments:AttachmentsDelete","target":"area.Environments:Access"},{"source":"Environments:AttachmentsDelete","target":"module.clients:Access"},{"source":"Servers:View","target":"area.Servers:Access"},{"source":"Servers:View","target":"module.clients:Access"},{"source":"Servers:DetailsView","target":"tab.Servers.details:Access"},{"source":"Servers:DetailsView","target":"area.Servers:Access"},{"source":"Servers:DetailsView","target":"module.clients:Access"},{"source":"Servers:HistoryView","target":"tab.Servers.history:Access"},{"source":"Servers:HistoryView","target":"area.Servers:Access"},{"source":"Servers:HistoryView","target":"module.clients:Access"},{"source":"Servers:AttachmentsView","target":"tab.Servers.files:Access"},{"source":"Servers:AttachmentsView","target":"area.Servers:Access"},{"source":"Servers:AttachmentsView","target":"module.clients:Access"},{"source":"Servers:AttachmentsUpload","target":"tab.Servers.files:Access"},{"source":"Servers:AttachmentsUpload","target":"area.Servers:Access"},{"source":"Servers:AttachmentsUpload","target":"module.clients:Access"},{"source":"Servers:AttachmentsDeleteOwn","target":"tab.Servers.files:Access"},{"source":"Servers:AttachmentsDeleteOwn","target":"area.Servers:Access"},{"source":"Servers:AttachmentsDeleteOwn","target":"module.clients:Access"},{"source":"Servers:AttachmentsDelete","target":"tab.Servers.files:Access"},{"source":"Servers:AttachmentsDelete","target":"area.Servers:Access"},{"source":"Servers:AttachmentsDelete","target":"module.clients:Access"},{"source":"Installations:View","target":"area.Installations:Access"},{"source":"Installations:View","target":"module.clients:Access"},{"source":"Installations:DetailsView","target":"tab.Installations.details:Access"},{"source":"Installations:DetailsView","target":"area.Installations:Access"},{"source":"Installations:DetailsView","target":"module.clients:Access"},{"source":"Installations:HistoryView","target":"tab.Installations.history:Access"},{"source":"Installations:HistoryView","target":"area.Installations:Access"},{"source":"Installations:HistoryView","target":"module.clients:Access"},{"source":"Installations:AttachmentsView","target":"tab.Installations.files:Access"},{"source":"Installations:AttachmentsView","target":"area.Installations:Access"},{"source":"Installations:AttachmentsView","target":"module.clients:Access"},{"source":"Installations:AttachmentsUpload","target":"tab.Installations.files:Access"},{"source":"Installations:AttachmentsUpload","target":"area.Installations:Access"},{"source":"Installations:AttachmentsUpload","target":"module.clients:Access"},{"source":"Installations:AttachmentsDeleteOwn","target":"tab.Installations.files:Access"},{"source":"Installations:AttachmentsDeleteOwn","target":"area.Installations:Access"},{"source":"Installations:AttachmentsDeleteOwn","target":"module.clients:Access"},{"source":"Installations:AttachmentsDelete","target":"tab.Installations.files:Access"},{"source":"Installations:AttachmentsDelete","target":"area.Installations:Access"},{"source":"Installations:AttachmentsDelete","target":"module.clients:Access"},{"source":"Products:View","target":"area.Products:Access"},{"source":"Products:View","target":"module.products:Access"},{"source":"Products:DetailsView","target":"tab.Products.details:Access"},{"source":"Products:DetailsView","target":"area.Products:Access"},{"source":"Products:DetailsView","target":"module.products:Access"},{"source":"Products:HistoryView","target":"tab.Products.history:Access"},{"source":"Products:HistoryView","target":"area.Products:Access"},{"source":"Products:HistoryView","target":"module.products:Access"},{"source":"Products:AttachmentsView","target":"tab.Products.files:Access"},{"source":"Products:AttachmentsView","target":"area.Products:Access"},{"source":"Products:AttachmentsView","target":"module.products:Access"},{"source":"Products:AttachmentsUpload","target":"tab.Products.files:Access"},{"source":"Products:AttachmentsUpload","target":"area.Products:Access"},{"source":"Products:AttachmentsUpload","target":"module.products:Access"},{"source":"Products:AttachmentsDeleteOwn","target":"tab.Products.files:Access"},{"source":"Products:AttachmentsDeleteOwn","target":"area.Products:Access"},{"source":"Products:AttachmentsDeleteOwn","target":"module.products:Access"},{"source":"Products:AttachmentsDelete","target":"tab.Products.files:Access"},{"source":"Products:AttachmentsDelete","target":"area.Products:Access"},{"source":"Products:AttachmentsDelete","target":"module.products:Access"},{"source":"Cases:View","target":"area.Cases:Access"},{"source":"Cases:View","target":"module.cases:Access"},{"source":"Cases:DetailsView","target":"area.Cases:Access"},{"source":"Cases:DetailsView","target":"module.cases:Access"},{"source":"Cases:HistoryView","target":"tab.Cases.history:Access"},{"source":"Cases:HistoryView","target":"area.Cases:Access"},{"source":"Cases:HistoryView","target":"module.cases:Access"},{"source":"Cases:AttachmentsView","target":"tab.Cases.files:Access"},{"source":"Cases:AttachmentsView","target":"area.Cases:Access"},{"source":"Cases:AttachmentsView","target":"module.cases:Access"},{"source":"Cases:AttachmentsUpload","target":"tab.Cases.files:Access"},{"source":"Cases:AttachmentsUpload","target":"area.Cases:Access"},{"source":"Cases:AttachmentsUpload","target":"module.cases:Access"},{"source":"Cases:AttachmentsDeleteOwn","target":"tab.Cases.files:Access"},{"source":"Cases:AttachmentsDeleteOwn","target":"area.Cases:Access"},{"source":"Cases:AttachmentsDeleteOwn","target":"module.cases:Access"},{"source":"Cases:AttachmentsDelete","target":"tab.Cases.files:Access"},{"source":"Cases:AttachmentsDelete","target":"area.Cases:Access"},{"source":"Cases:AttachmentsDelete","target":"module.cases:Access"},{"source":"Commitments:View","target":"area.Commitments:Access"},{"source":"Commitments:View","target":"module.commitments:Access"},{"source":"Commitments:DetailsView","target":"tab.Commitments.details:Access"},{"source":"Commitments:DetailsView","target":"area.Commitments:Access"},{"source":"Commitments:DetailsView","target":"module.commitments:Access"},{"source":"Commitments:HistoryView","target":"tab.Commitments.history:Access"},{"source":"Commitments:HistoryView","target":"area.Commitments:Access"},{"source":"Commitments:HistoryView","target":"module.commitments:Access"},{"source":"Commitments:AttachmentsView","target":"tab.Commitments.files:Access"},{"source":"Commitments:AttachmentsView","target":"area.Commitments:Access"},{"source":"Commitments:AttachmentsView","target":"module.commitments:Access"},{"source":"Commitments:AttachmentsUpload","target":"tab.Commitments.files:Access"},{"source":"Commitments:AttachmentsUpload","target":"area.Commitments:Access"},{"source":"Commitments:AttachmentsUpload","target":"module.commitments:Access"},{"source":"Commitments:AttachmentsDeleteOwn","target":"tab.Commitments.files:Access"},{"source":"Commitments:AttachmentsDeleteOwn","target":"area.Commitments:Access"},{"source":"Commitments:AttachmentsDeleteOwn","target":"module.commitments:Access"},{"source":"Commitments:AttachmentsDelete","target":"tab.Commitments.files:Access"},{"source":"Commitments:AttachmentsDelete","target":"area.Commitments:Access"},{"source":"Commitments:AttachmentsDelete","target":"module.commitments:Access"},{"source":"Teams:View","target":"area.Teams:Access"},{"source":"Teams:View","target":"module.teams:Access"},{"source":"Teams:DetailsView","target":"tab.Teams.details:Access"},{"source":"Teams:DetailsView","target":"area.Teams:Access"},{"source":"Teams:DetailsView","target":"module.teams:Access"},{"source":"Teams:HistoryView","target":"tab.Teams.history:Access"},{"source":"Teams:HistoryView","target":"area.Teams:Access"},{"source":"Teams:HistoryView","target":"module.teams:Access"},{"source":"Teams:AttachmentsView","target":"tab.Teams.files:Access"},{"source":"Teams:AttachmentsView","target":"area.Teams:Access"},{"source":"Teams:AttachmentsView","target":"module.teams:Access"},{"source":"Teams:AttachmentsUpload","target":"tab.Teams.files:Access"},{"source":"Teams:AttachmentsUpload","target":"area.Teams:Access"},{"source":"Teams:AttachmentsUpload","target":"module.teams:Access"},{"source":"Teams:AttachmentsDeleteOwn","target":"tab.Teams.files:Access"},{"source":"Teams:AttachmentsDeleteOwn","target":"area.Teams:Access"},{"source":"Teams:AttachmentsDeleteOwn","target":"module.teams:Access"},{"source":"Teams:AttachmentsDelete","target":"tab.Teams.files:Access"},{"source":"Teams:AttachmentsDelete","target":"area.Teams:Access"},{"source":"Teams:AttachmentsDelete","target":"module.teams:Access"},{"source":"OtherOperations:View","target":"area.OtherOperations:Access"},{"source":"OtherOperations:View","target":"module.escalations:Access"},{"source":"OtherOperations:DetailsView","target":"tab.OtherOperations.details:Access"},{"source":"OtherOperations:DetailsView","target":"area.OtherOperations:Access"},{"source":"OtherOperations:DetailsView","target":"module.escalations:Access"},{"source":"OtherOperations:HistoryView","target":"tab.OtherOperations.history:Access"},{"source":"OtherOperations:HistoryView","target":"area.OtherOperations:Access"},{"source":"OtherOperations:HistoryView","target":"module.escalations:Access"},{"source":"OtherOperations:AttachmentsView","target":"tab.OtherOperations.files:Access"},{"source":"OtherOperations:AttachmentsView","target":"area.OtherOperations:Access"},{"source":"OtherOperations:AttachmentsView","target":"module.escalations:Access"},{"source":"OtherOperations:AttachmentsUpload","target":"tab.OtherOperations.files:Access"},{"source":"OtherOperations:AttachmentsUpload","target":"area.OtherOperations:Access"},{"source":"OtherOperations:AttachmentsUpload","target":"module.escalations:Access"},{"source":"OtherOperations:AttachmentsDeleteOwn","target":"tab.OtherOperations.files:Access"},{"source":"OtherOperations:AttachmentsDeleteOwn","target":"area.OtherOperations:Access"},{"source":"OtherOperations:AttachmentsDeleteOwn","target":"module.escalations:Access"},{"source":"OtherOperations:AttachmentsDelete","target":"tab.OtherOperations.files:Access"},{"source":"OtherOperations:AttachmentsDelete","target":"area.OtherOperations:Access"},{"source":"OtherOperations:AttachmentsDelete","target":"module.escalations:Access"},{"source":"Dashboard:View","target":"area.Dashboard:Access"},{"source":"Dashboard:View","target":"module.dashboard:Access"},{"source":"Reporting:View","target":"area.Reporting:Access"},{"source":"Reporting:View","target":"module.reporting:Access"},{"source":"PersonalNotes:View","target":"area.PersonalNotes:Access"},{"source":"PersonalNotes:View","target":"module.notes:Access"},{"source":"Notifications:View","target":"area.Notifications:Access"},{"source":"Notifications:View","target":"module.dashboard:Access"},{"source":"ClientStructure:View","target":"tab.ClientStructure.structure:View"},{"source":"ClientStructure:View","target":"tab.ClientStructure.structure:Access"},{"source":"Environments:View","target":"tab.ClientStructure.structure:View"},{"source":"Environments:View","target":"tab.ClientStructure.structure:Access"},{"source":"Environments:View","target":"area.ClientStructure:Access"},{"source":"ClientStructure:View","target":"tab.ClientStructure.organizations:View"},{"source":"ClientStructure:View","target":"tab.ClientStructure.organizations:Access"},{"source":"Contracts:View","target":"tab.ClientStructure.contracts:View"},{"source":"Contracts:View","target":"tab.ClientStructure.contracts:Access"},{"source":"Contracts:View","target":"area.ClientStructure:Access"},{"source":"Cases:View","target":"tab.ClientStructure.cases:View"},{"source":"Cases:View","target":"tab.ClientStructure.cases:Access"},{"source":"Cases:View","target":"area.ClientStructure:Access"},{"source":"Cases:View","target":"module.clients:Access"},{"source":"Commitments:View","target":"tab.ClientStructure.commitments:View"},{"source":"Commitments:View","target":"tab.ClientStructure.commitments:Access"},{"source":"Commitments:View","target":"area.ClientStructure:Access"},{"source":"Commitments:View","target":"module.clients:Access"},{"source":"OtherOperations:View","target":"tab.ClientStructure.escalations:View"},{"source":"OtherOperations:View","target":"tab.ClientStructure.escalations:Access"},{"source":"OtherOperations:View","target":"area.ClientStructure:Access"},{"source":"OtherOperations:View","target":"module.clients:Access"},{"source":"Servers:View","target":"tab.ClientStructure.infra:View"},{"source":"Servers:View","target":"tab.ClientStructure.infra:Access"},{"source":"Servers:View","target":"area.ClientStructure:Access"},{"source":"Projects:View","target":"tab.ClientStructure.projects:View"},{"source":"Projects:View","target":"tab.ClientStructure.projects:Access"},{"source":"Projects:View","target":"area.ClientStructure:Access"},{"source":"OtherOperations:View","target":"tab.ClientStructure.contacts:View"},{"source":"OtherOperations:View","target":"tab.ClientStructure.contacts:Access"},{"source":"PersonalNotes:View","target":"tab.ClientStructure.notes:View"},{"source":"PersonalNotes:View","target":"tab.ClientStructure.notes:Access"},{"source":"PersonalNotes:View","target":"area.ClientStructure:Access"},{"source":"PersonalNotes:View","target":"module.clients:Access"},{"source":"Environments:DetailsView","target":"tab.Environments.apps:View"},{"source":"Environments:DetailsView","target":"tab.Environments.apps:Access"},{"source":"Environments:DetailsView","target":"tab.Environments.assets:View"},{"source":"Environments:DetailsView","target":"tab.Environments.assets:Access"},{"source":"Environments:DetailsView","target":"tab.Environments.work:View"},{"source":"Environments:DetailsView","target":"tab.Environments.work:Access"},{"source":"Environments:DetailsView","target":"tab.Environments.network:View"},{"source":"Environments:DetailsView","target":"tab.Environments.network:Access"},{"source":"Environments:DetailsView","target":"tab.Environments.conditions:View"},{"source":"Environments:DetailsView","target":"tab.Environments.conditions:Access"},{"source":"Environments:DetailsView","target":"tab.Environments.quality:View"},{"source":"Environments:DetailsView","target":"tab.Environments.quality:Access"},{"source":"Cases:DetailsView","target":"tab.Cases.timeline:View"},{"source":"Cases:DetailsView","target":"tab.Cases.timeline:Access"},{"source":"Cases:DetailsView","target":"tab.Cases.affected:View"},{"source":"Cases:DetailsView","target":"tab.Cases.affected:Access"},{"source":"Cases:DetailsView","target":"tab.Cases.jira:View"},{"source":"Cases:DetailsView","target":"tab.Cases.jira:Access"},{"source":"Cases:DetailsView","target":"tab.Cases.impact:View"},{"source":"Cases:DetailsView","target":"tab.Cases.impact:Access"},{"source":"Cases:DetailsView","target":"tab.Cases.commitments:View"},{"source":"Cases:DetailsView","target":"tab.Cases.commitments:Access"},{"source":"Cases:DetailsView","target":"tab.Cases.escalations:View"},{"source":"Cases:DetailsView","target":"tab.Cases.escalations:Access"},{"source":"ClientStructure:Create","target":"tab.ClientStructure.structure:Create"},{"source":"ClientStructure:Create","target":"tab.ClientStructure.structure:Access"},{"source":"ClientStructure:Create","target":"area.ClientStructure:Access"},{"source":"ClientStructure:Create","target":"module.clients:Access"},{"source":"ClientStructure:Maintain","target":"tab.ClientStructure.structure:Maintain"},{"source":"ClientStructure:Maintain","target":"tab.ClientStructure.structure:Access"},{"source":"ClientStructure:Maintain","target":"area.ClientStructure:Access"},{"source":"ClientStructure:Maintain","target":"module.clients:Access"},{"source":"ClientStructure:ArchiveRestore","target":"tab.ClientStructure.structure:ArchiveRestore"},{"source":"ClientStructure:ArchiveRestore","target":"tab.ClientStructure.structure:Access"},{"source":"ClientStructure:ArchiveRestore","target":"area.ClientStructure:Access"},{"source":"ClientStructure:ArchiveRestore","target":"module.clients:Access"},{"source":"ClientStructure:Delete","target":"tab.ClientStructure.structure:Delete"},{"source":"ClientStructure:Delete","target":"tab.ClientStructure.structure:Access"},{"source":"ClientStructure:Delete","target":"area.ClientStructure:Access"},{"source":"ClientStructure:Delete","target":"module.clients:Access"},{"source":"ClientStructure:Create","target":"tab.ClientStructure.organizations:Create"},{"source":"ClientStructure:Create","target":"tab.ClientStructure.organizations:Access"},{"source":"ClientStructure:Maintain","target":"tab.ClientStructure.organizations:Maintain"},{"source":"ClientStructure:Maintain","target":"tab.ClientStructure.organizations:Access"},{"source":"ClientStructure:Delete","target":"tab.ClientStructure.organizations:Delete"},{"source":"ClientStructure:Delete","target":"tab.ClientStructure.organizations:Access"},{"source":"OtherOperations:Create","target":"tab.ClientStructure.contacts:Create"},{"source":"OtherOperations:Create","target":"tab.ClientStructure.contacts:Access"},{"source":"OtherOperations:Create","target":"area.ClientStructure:Access"},{"source":"OtherOperations:Create","target":"module.clients:Access"},{"source":"OtherOperations:Maintain","target":"tab.ClientStructure.contacts:Maintain"},{"source":"OtherOperations:Maintain","target":"tab.ClientStructure.contacts:Access"},{"source":"OtherOperations:Maintain","target":"area.ClientStructure:Access"},{"source":"OtherOperations:Maintain","target":"module.clients:Access"},{"source":"OtherOperations:ArchiveRestore","target":"tab.ClientStructure.contacts:ArchiveRestore"},{"source":"OtherOperations:ArchiveRestore","target":"tab.ClientStructure.contacts:Access"},{"source":"OtherOperations:ArchiveRestore","target":"area.ClientStructure:Access"},{"source":"OtherOperations:ArchiveRestore","target":"module.clients:Access"},{"source":"OtherOperations:Delete","target":"tab.ClientStructure.contacts:Delete"},{"source":"OtherOperations:Delete","target":"tab.ClientStructure.contacts:Access"},{"source":"OtherOperations:Delete","target":"area.ClientStructure:Access"},{"source":"OtherOperations:Delete","target":"module.clients:Access"},{"source":"Cases:Maintain","target":"tab.Cases.jira:Create"},{"source":"Cases:Maintain","target":"tab.Cases.jira:Access"},{"source":"Cases:Maintain","target":"area.Cases:Access"},{"source":"Cases:Maintain","target":"module.cases:Access"},{"source":"Cases:Maintain","target":"tab.Cases.jira:Delete"},{"source":"Environments:Maintain","target":"tab.Environments.conditions:Create"},{"source":"Environments:Maintain","target":"tab.Environments.conditions:Access"},{"source":"Environments:Maintain","target":"area.Environments:Access"},{"source":"Environments:Maintain","target":"module.clients:Access"},{"source":"@Edit","target":"PersonalNotes:Create"},{"source":"@Edit","target":"area.PersonalNotes:Access"},{"source":"@Edit","target":"module.notes:Access"},{"source":"@Edit","target":"PersonalNotes:Maintain"},{"source":"@Edit","target":"PersonalNotes:Delete"},{"source":"@Edit","target":"PersonalNotes:Download"},{"source":"@Edit","target":"Notifications:Maintain"},{"source":"@Edit","target":"area.Notifications:Access"},{"source":"@Edit","target":"module.dashboard:Access"},{"source":"@Edit","target":"Notifications:Delete"},{"source":"Dashboard:View","target":"ClientMap:View"},{"source":"Dashboard:View","target":"area.ClientMap:Access"},{"source":"Dashboard:View","target":"ActionList:View"},{"source":"Dashboard:View","target":"area.ActionList:Access"},{"source":"Dashboard:View","target":"DataQuality:View"},{"source":"Dashboard:View","target":"area.DataQuality:Access"},{"source":"@Edit","target":"DataQuality:Maintain"},{"source":"@Edit","target":"area.DataQuality:Access"},{"source":"Teams:View","target":"Handovers:View"},{"source":"Teams:View","target":"area.Handovers:Access"},{"source":"Teams:Create","target":"Handovers:Create"},{"source":"Teams:Create","target":"area.Handovers:Access"},{"source":"Teams:Create","target":"module.teams:Access"},{"source":"Teams:Maintain","target":"Handovers:Maintain"},{"source":"Teams:Maintain","target":"area.Handovers:Access"},{"source":"Teams:Maintain","target":"module.teams:Access"},{"source":"Teams:View","target":"Reassignment:View"},{"source":"Teams:View","target":"area.Reassignment:Access"},{"source":"Reporting:View","target":"ReportOverview:View"},{"source":"Reporting:View","target":"area.ReportOverview:Access"},{"source":"Reporting:View","target":"ReportLibrary:View"},{"source":"Reporting:View","target":"area.ReportLibrary:Access"},{"source":"@Export","target":"ReportLibrary:Create"},{"source":"@Export","target":"area.ReportLibrary:Access"},{"source":"@Export","target":"module.reporting:Access"},{"source":"@Export","target":"ReportLibrary:Delete"},{"source":"@Export","target":"ReportLibrary:Export"},{"source":"Reporting:View","target":"ReportBuilder:View"},{"source":"Reporting:View","target":"area.ReportBuilder:Access"},{"source":"@Export","target":"ReportBuilder:Export"},{"source":"@Export","target":"area.ReportBuilder:Access"},{"source":"Reporting:View","target":"SavedReports:View"},{"source":"Reporting:View","target":"area.SavedReports:Access"},{"source":"@Export","target":"SavedReports:Create"},{"source":"@Export","target":"area.SavedReports:Access"},{"source":"@Export","target":"SavedReports:Maintain"},{"source":"@Export","target":"SavedReports:Delete"},{"source":"Reporting:View","target":"ReportSchedules:View"},{"source":"Reporting:View","target":"area.ReportSchedules:Access"},{"source":"@Export","target":"ReportSchedules:Create"},{"source":"@Export","target":"area.ReportSchedules:Access"},{"source":"@Export","target":"ReportSchedules:Maintain"},{"source":"@Export","target":"ReportSchedules:Delete"},{"source":"Reporting:View","target":"ReportHistory:View"},{"source":"Reporting:View","target":"area.ReportHistory:Access"},{"source":"@Export","target":"ReportHistory:Create"},{"source":"@Export","target":"area.ReportHistory:Access"},{"source":"@Export","target":"ReportHistory:Maintain"},{"source":"@Export","target":"ReportHistory:Download"},{"source":"Reporting:View","target":"ReportTemplates:View"},{"source":"Reporting:View","target":"area.ReportTemplates:Access"},{"source":"@Administer","target":"AdminUsers:View"},{"source":"@Administer","target":"area.AdminUsers:Access"},{"source":"@Administer","target":"module.admin:Access"},{"source":"@Administer","target":"AdminUsers:Create"},{"source":"@Administer","target":"AdminUsers:Maintain"},{"source":"@Administer","target":"AdminUsers:Delete"},{"source":"@Administer","target":"AdminRoles:View"},{"source":"@Administer","target":"area.AdminRoles:Access"},{"source":"@Administer","target":"AdminRoles:Create"},{"source":"@Administer","target":"AdminRoles:Maintain"},{"source":"@Administer","target":"AdminRoles:Delete"},{"source":"@Administer","target":"AdminGroups:View"},{"source":"@Administer","target":"area.AdminGroups:Access"},{"source":"@Administer","target":"AdminGroups:Create"},{"source":"@Administer","target":"AdminGroups:Maintain"},{"source":"@Administer","target":"AdminConfig:View"},{"source":"@Administer","target":"area.AdminConfig:Access"},{"source":"@Administer","target":"AdminConfig:Create"},{"source":"@Administer","target":"AdminConfig:Maintain"},{"source":"@Administer","target":"AdminConfig:Delete"},{"source":"@Administer","target":"AdminSettings:View"},{"source":"@Administer","target":"area.AdminSettings:Access"},{"source":"@Administer","target":"AdminSettings:Maintain"},{"source":"@Audit","target":"AdminAudit:View"},{"source":"@Audit","target":"area.AdminAudit:Access"},{"source":"@Audit","target":"module.admin:Access"},{"source":"Teams:Coordinate","target":"Handovers:Maintain"},{"source":"Teams:Coordinate","target":"area.Handovers:Access"},{"source":"Teams:Coordinate","target":"module.teams:Access"}]'';
    DECLARE @definitions TABLE ([Key] nvarchar(120) PRIMARY KEY, DisplayName nvarchar(100), Description nvarchar(500),
        Module nvarchar(60), ResourceType nvarchar(60), ParentKey nvarchar(120), Action nvarchar(40),
        RiskLevel nvarchar(20), SupportsScope bit, NodeType nvarchar(20), DisplayOrder int);
    INSERT @definitions SELECT [key], displayName, description, module, resource, parentKey, action, riskLevel, supportsScope, nodeType, displayOrder
    FROM OPENJSON(@manifest) WITH ([key] nvarchar(120), displayName nvarchar(100), description nvarchar(500), module nvarchar(60),
        resource nvarchar(60), parentKey nvarchar(120), action nvarchar(40), riskLevel nvarchar(20), supportsScope bit, nodeType nvarchar(20), displayOrder int);
    -- Legacy group-only parents were not real registry rows. Preserve obsolete keys as inactive.
    UPDATE p SET ParentKey = NULL, IsActive = 0, NodeType = N''Action''
    FROM [iam].[PermissionDefinition] p WHERE NOT EXISTS (SELECT 1 FROM @definitions d WHERE d.[Key] = p.[Key]);
    INSERT [iam].[PermissionDefinition] ([Key], DisplayName, Description, Module, ResourceType, ParentKey, Action, RiskLevel,
        IsSystemManaged, IsActive, SupportsScope, NodeType, DisplayOrder, CreatedAt, UpdatedAt)
    SELECT d.[Key], d.DisplayName, d.Description, d.Module, d.ResourceType, NULL, d.Action, d.RiskLevel,
        1, 1, d.SupportsScope, d.NodeType, d.DisplayOrder, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    FROM @definitions d WHERE NOT EXISTS (SELECT 1 FROM [iam].[PermissionDefinition] p WHERE p.[Key] = d.[Key]);
    UPDATE p SET DisplayName=d.DisplayName, Description=d.Description, Module=d.Module, ResourceType=d.ResourceType,
        ParentKey=d.ParentKey, Action=d.Action, RiskLevel=d.RiskLevel, IsSystemManaged=1, IsActive=1,
        SupportsScope=d.SupportsScope, NodeType=d.NodeType, DisplayOrder=d.DisplayOrder, UpdatedAt=SYSDATETIMEOFFSET()
    FROM [iam].[PermissionDefinition] p JOIN @definitions d ON d.[Key]=p.[Key];
    DECLARE @prior TABLE (RoleId bigint, [Key] nvarchar(120));
    INSERT @prior SELECT AppRoleId, Resource + N'':'' + Action FROM [iam].[AppRolePermission];
    DECLARE @granted TABLE (RoleId bigint, Resource nvarchar(40), Action nvarchar(40));
    INSERT [iam].[AppRolePermission] (AppRoleId, Resource, Action)
    OUTPUT inserted.AppRoleId, inserted.Resource, inserted.Action INTO @granted
    SELECT DISTINCT r.Id, LEFT(m.target, CHARINDEX(N'':'', m.target)-1), SUBSTRING(m.target, CHARINDEX(N'':'', m.target)+1, 40)
    FROM [iam].[AppRole] r CROSS JOIN OPENJSON(@mapping) WITH (source nvarchar(120), target nvarchar(120)) m
    WHERE (EXISTS (SELECT 1 FROM @prior p WHERE p.RoleId=r.Id AND p.[Key]=m.source)
        OR m.source=N''@Administer'' AND (r.Rights & 128)=128 OR m.source=N''@Audit'' AND (r.Rights & 64)=64 OR m.source=N''@Edit'' AND (r.Rights & 1)=1 OR m.source=N''@Export'' AND (r.Rights & 16)=16)
        AND NOT EXISTS (SELECT 1 FROM [iam].[AppRolePermission] p WHERE p.AppRoleId=r.Id AND p.Resource+N'':''+p.Action=m.target);
    INSERT [audit].[AuditEntry] ([At], UserName, Action, Category, EntityType, EntityId, EntityLabel, Reason, Changes)
    SELECT SYSDATETIMEOFFSET(), N''deployment'', N''HierarchyPermissionUpgrade'', N''Access'', N''AppRole'', r.Id, r.Name,
        N''Explicit compatibility mapping to four-level permissions; legacy action grants and user assignments retained.'',
        N''{"Permissions":'' + (SELECT g.Resource+N'':''+g.Action AS [key] FROM @granted g WHERE g.RoleId=r.Id FOR JSON PATH) + N''}''
    FROM [iam].[AppRole] r WHERE EXISTS (SELECT 1 FROM @granted g WHERE g.RoleId=r.Id);
    UPDATE [iam].[AuthorizationVersion] SET Version=Version+1 WHERE Id=1;');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    ALTER TABLE [iam].[PermissionDefinition] ADD CONSTRAINT [AK_PermissionDefinition_Key] UNIQUE ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    CREATE INDEX [IX_PermissionDefinition_ParentKey_DisplayOrder] ON [iam].[PermissionDefinition] ([ParentKey], [DisplayOrder]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    EXEC(N'ALTER TABLE [iam].[PermissionDefinition] ADD CONSTRAINT [CK_PermissionDefinition_NodeType] CHECK ([NodeType] IN (''Module'',''Submodule'',''Tab'',''Action''))');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    ALTER TABLE [iam].[PermissionDefinition] ADD CONSTRAINT [FK_PermissionDefinition_PermissionDefinition_ParentKey] FOREIGN KEY ([ParentKey]) REFERENCES [iam].[PermissionDefinition] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102110000_HierarchicalPermissions'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102110000_HierarchicalPermissions', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120000_PreserveLegacyEffectiveScopes'
)
BEGIN
    -- Retain the pre-upgrade values for a reviewed, manual recovery. Never overwrite an earlier snapshot.
    IF OBJECT_ID(N'[iam].[LegacyScopeUpgrade]', N'U') IS NULL
        CREATE TABLE [iam].[LegacyScopeUpgrade] (
            [TargetType] nvarchar(16) NOT NULL,
            [TargetId] bigint NOT NULL,
            [AllClients] bit NOT NULL,
            [AllInternal] bit NOT NULL,
            CONSTRAINT [PK_LegacyScopeUpgrade] PRIMARY KEY ([TargetType], [TargetId]));
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120000_PreserveLegacyEffectiveScopes'
)
BEGIN
    EXEC(N'INSERT [iam].[LegacyScopeUpgrade] ([TargetType], [TargetId], [AllClients], [AllInternal])
    SELECT N''User'', u.[Id], u.[AllClients], u.[AllInternal]
    FROM [iam].[User] u
    WHERE EXISTS (SELECT 1 FROM [iam].[UserRole] ur
        JOIN [iam].[AppRole] r ON r.[Id] = ur.[AppRoleId]
        WHERE ur.[UserId] = u.[Id] AND r.[IsActive] = 1)
      AND NOT EXISTS (SELECT 1 FROM [iam].[LegacyScopeUpgrade] b WHERE b.[TargetType] = N''User'' AND b.[TargetId] = u.[Id]);

    INSERT [iam].[LegacyScopeUpgrade] ([TargetType], [TargetId], [AllClients], [AllInternal])
    SELECT N''GroupMapping'', m.[Id], m.[AllClients], m.[AllInternal]
    FROM [iam].[GroupMapping] m
    WHERE m.[Role] IS NOT NULL AND EXISTS (SELECT 1 FROM [iam].[AppRole] r
        WHERE r.[IsActive] = 1 AND r.[Key] = m.[Role] AND m.[Role] IN (N''Manager'', N''Engineer''))
      AND NOT EXISTS (SELECT 1 FROM [iam].[LegacyScopeUpgrade] b WHERE b.[TargetType] = N''GroupMapping'' AND b.[TargetId] = m.[Id]);

    UPDATE u SET [AllClients] = 1, [AllInternal] = 1
    FROM [iam].[User] u
    WHERE EXISTS (SELECT 1 FROM [iam].[UserRole] ur JOIN [iam].[AppRole] r ON r.[Id] = ur.[AppRoleId]
        WHERE ur.[UserId] = u.[Id] AND r.[IsActive] = 1);
    UPDATE m SET [AllClients] = 1, [AllInternal] = 1
    FROM [iam].[GroupMapping] m
    WHERE m.[Role] IS NOT NULL AND EXISTS (SELECT 1 FROM [iam].[AppRole] r
        WHERE r.[IsActive] = 1 AND r.[Key] = m.[Role] AND m.[Role] IN (N''Manager'', N''Engineer''));

    UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
    INSERT [audit].[AuditEntry] ([At], [UserName], [Action], [Category], [EntityType], [EntityId], [EntityLabel], [Reason], [Changes])
    SELECT SYSDATETIMEOFFSET(), N''deployment'', N''PreserveLegacyScope'', N''Access'', b.[TargetType], b.[TargetId], b.[TargetType],
        N''Preserved prior broad effective data scope when switching to explicit scope grants.'',
        CONCAT(N''{"previousAllClients":'', CASE WHEN b.[AllClients] = 1 THEN N''true'' ELSE N''false'' END,
            N'',"previousAllInternal":'', CASE WHEN b.[AllInternal] = 1 THEN N''true'' ELSE N''false'' END, N''}'')
    FROM [iam].[LegacyScopeUpgrade] b;');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120000_PreserveLegacyEffectiveScopes'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102120000_PreserveLegacyEffectiveScopes', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120037_UserPermissionOverrides'
)
BEGIN
    CREATE TABLE [iam].[UserPermissionOverride] (
        [UserId] bigint NOT NULL,
        [PermissionKey] nvarchar(120) NOT NULL,
        [Effect] nvarchar(5) NOT NULL,
        [ExpiresAt] datetimeoffset NULL,
        CONSTRAINT [PK_UserPermissionOverride] PRIMARY KEY ([UserId], [PermissionKey]),
        CONSTRAINT [CK_UserPermissionOverride_Effect] CHECK ([Effect] IN ('Allow','Deny')),
        CONSTRAINT [FK_UserPermissionOverride_PermissionDefinition_PermissionKey] FOREIGN KEY ([PermissionKey]) REFERENCES [iam].[PermissionDefinition] ([Key]),
        CONSTRAINT [FK_UserPermissionOverride_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120037_UserPermissionOverrides'
)
BEGIN
    CREATE INDEX [IX_UserPermissionOverride_ExpiresAt] ON [iam].[UserPermissionOverride] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120037_UserPermissionOverrides'
)
BEGIN
    CREATE INDEX [IX_UserPermissionOverride_PermissionKey] ON [iam].[UserPermissionOverride] ([PermissionKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102120037_UserPermissionOverrides'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102120037_UserPermissionOverrides', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102140000_ExportAccessFingerprint'
)
BEGIN
    ALTER TABLE [reporting].[ExportJob] ADD [AccessFingerprint] nvarchar(64) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261102140000_ExportAccessFingerprint'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261102140000_ExportAccessFingerprint', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] DROP CONSTRAINT [PK_UserPermissionOverride];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD [Id] bigint NOT NULL IDENTITY;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD [ClientId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD [ProjectId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD [TeamId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD CONSTRAINT [PK_UserPermissionOverride] PRIMARY KEY ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    CREATE INDEX [IX_UserPermissionOverride_ClientId] ON [iam].[UserPermissionOverride] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    CREATE INDEX [IX_UserPermissionOverride_ProjectId] ON [iam].[UserPermissionOverride] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    CREATE INDEX [IX_UserPermissionOverride_TeamId] ON [iam].[UserPermissionOverride] ([TeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserPermissionOverride_Client] ON [iam].[UserPermissionOverride] ([UserId], [PermissionKey], [ClientId]) WHERE [ClientId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserPermissionOverride_Global] ON [iam].[UserPermissionOverride] ([UserId], [PermissionKey]) WHERE [ClientId] IS NULL AND [ProjectId] IS NULL AND [TeamId] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserPermissionOverride_Project] ON [iam].[UserPermissionOverride] ([UserId], [PermissionKey], [ProjectId]) WHERE [ProjectId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserPermissionOverride_Team] ON [iam].[UserPermissionOverride] ([UserId], [PermissionKey], [TeamId]) WHERE [TeamId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    EXEC(N'ALTER TABLE [iam].[UserPermissionOverride] ADD CONSTRAINT [CK_UserPermissionOverride_SingleScope] CHECK ((CASE WHEN [ClientId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProjectId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [TeamId] IS NULL THEN 0 ELSE 1 END) <= 1)');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD CONSTRAINT [FK_UserPermissionOverride_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD CONSTRAINT [FK_UserPermissionOverride_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    ALTER TABLE [iam].[UserPermissionOverride] ADD CONSTRAINT [FK_UserPermissionOverride_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103060859_ScopedPermissionExceptions'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103060859_ScopedPermissionExceptions', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    IF SCHEMA_ID(N'jira') IS NULL EXEC(N'CREATE SCHEMA [jira];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    ALTER TABLE [work].[JiraReference] ADD [Origin] nvarchar(40) NOT NULL DEFAULT N'Manual';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [work].[CaseComment] (
        [Id] bigint NOT NULL IDENTITY,
        [CaseId] bigint NOT NULL,
        [AuthorId] bigint NOT NULL,
        [Body] nvarchar(max) NOT NULL,
        [At] datetimeoffset NOT NULL,
        CONSTRAINT [PK_CaseComment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CaseComment_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_CaseComment_User_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraConnection] (
        [Id] bigint NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [SiteUrl] nvarchar(300) NOT NULL,
        [AuthMode] nvarchar(40) NOT NULL,
        [AccountEmail] nvarchar(254) NULL,
        [CloudId] nvarchar(64) NULL,
        [IsEnabled] bit NOT NULL,
        [JiraInstanceId] bigint NOT NULL,
        [SecretProvider] nvarchar(40) NOT NULL,
        [SecretReference] nvarchar(200) NULL,
        [CredentialRotatedAt] datetimeoffset NULL,
        [AccountTimeZone] nvarchar(64) NULL,
        [LastTestAt] datetimeoffset NULL,
        [LastTestOk] bit NULL,
        [LastTestDurationMs] int NULL,
        [LastTestJson] nvarchar(4000) NULL,
        [LastSuccessfulTestAt] datetimeoffset NULL,
        [LastDiscoveryAt] datetimeoffset NULL,
        [LastDiscoveryError] nvarchar(1000) NULL,
        [DetailFieldNames] nvarchar(500) NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraConnection] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraConnection_JiraInstance_JiraInstanceId] FOREIGN KEY ([JiraInstanceId]) REFERENCES [work].[JiraInstance] ([Id]),
        CONSTRAINT [FK_JiraConnection_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraConnection_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[ClientJiraSettings] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [IsEnabled] bit NOT NULL,
        [JiraConnectionId] bigint NULL,
        [DefaultResponsibleTeamId] bigint NULL,
        [DefaultCaseType] nvarchar(40) NULL,
        [DefaultPriority] nvarchar(40) NOT NULL,
        [NextReviewHours] int NOT NULL,
        [ImportDoneIssues] bit NOT NULL,
        [ImportFrom] date NULL,
        [SyncOnStartup] bit NOT NULL,
        [FullReconciliation] bit NOT NULL,
        [FullReconciliationDays] int NOT NULL,
        [SyncIntervalMinutes] int NOT NULL,
        [LastPreviewAt] datetimeoffset NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ClientJiraSettings] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ClientJiraSettings_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_ClientJiraSettings_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id]),
        CONSTRAINT [FK_ClientJiraSettings_Team_DefaultResponsibleTeamId] FOREIGN KEY ([DefaultResponsibleTeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_ClientJiraSettings_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ClientJiraSettings_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[ClientJiraSpace] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [JiraConnectionId] bigint NOT NULL,
        [JiraProjectId] nvarchar(40) NOT NULL,
        [ProjectKey] nvarchar(40) NOT NULL,
        [ProjectName] nvarchar(255) NOT NULL,
        [IsEnabled] bit NOT NULL,
        [ReleasedAt] datetimeoffset NULL,
        [ReleaseReason] nvarchar(1000) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ClientJiraSpace] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ClientJiraSpace_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_ClientJiraSpace_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id]),
        CONSTRAINT [FK_ClientJiraSpace_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ClientJiraSpace_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraActivity] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [ExternalEventId] nvarchar(60) NOT NULL,
        [JiraIssueId] nvarchar(40) NOT NULL,
        [CaseId] bigint NOT NULL,
        [Type] nvarchar(40) NOT NULL,
        [Field] nvarchar(120) NOT NULL,
        [ActorName] nvarchar(255) NULL,
        [At] datetimeoffset NOT NULL,
        [FromValue] nvarchar(400) NULL,
        [ToValue] nvarchar(400) NULL,
        [ImportedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_JiraActivity] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraActivity_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_JiraActivity_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraComment] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [JiraCommentId] nvarchar(40) NOT NULL,
        [JiraIssueId] nvarchar(40) NOT NULL,
        [CaseId] bigint NOT NULL,
        [AuthorAccountId] nvarchar(128) NULL,
        [AuthorName] nvarchar(255) NULL,
        [BodyText] nvarchar(400) NOT NULL,
        [JiraCreatedAt] datetimeoffset NOT NULL,
        [JiraUpdatedAt] datetimeoffset NULL,
        [VisibilityType] nvarchar(40) NULL,
        [VisibilityValue] nvarchar(255) NULL,
        [Withheld] bit NOT NULL,
        [DeletedInJiraAt] datetimeoffset NULL,
        [ImportedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_JiraComment] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraComment_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_JiraComment_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraCredential] (
        [JiraConnectionId] bigint NOT NULL,
        [Ciphertext] nvarchar(400) NOT NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        CONSTRAINT [PK_JiraCredential] PRIMARY KEY ([JiraConnectionId]),
        CONSTRAINT [FK_JiraCredential_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraDiscoveredSpace] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [JiraProjectId] nvarchar(40) NOT NULL,
        [ProjectKey] nvarchar(40) NOT NULL,
        [ProjectName] nvarchar(255) NOT NULL,
        [FirstSeenAt] datetimeoffset NOT NULL,
        [LastSeenAt] datetimeoffset NOT NULL,
        [Missing] bit NOT NULL,
        CONSTRAINT [PK_JiraDiscoveredSpace] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraDiscoveredSpace_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraIntegrationIssue] (
        [Id] bigint NOT NULL IDENTITY,
        [Type] nvarchar(40) NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [Fingerprint] nvarchar(200) NOT NULL,
        [JiraConnectionId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [ProjectKey] nvarchar(40) NULL,
        [JiraProjectId] nvarchar(40) NULL,
        [JiraIssueId] nvarchar(40) NULL,
        [IssueKey] nvarchar(60) NULL,
        [CaseId] bigint NULL,
        [CandidateCaseId] bigint NULL,
        [Subject] nvarchar(128) NULL,
        [Description] nvarchar(1000) NOT NULL,
        [SuggestedAction] nvarchar(500) NOT NULL,
        [LastSeenAt] datetimeoffset NOT NULL,
        [Occurrences] int NOT NULL,
        [Resolution] nvarchar(40) NULL,
        [ResolutionNote] nvarchar(1000) NULL,
        [ResolvedById] bigint NULL,
        [ResolvedAt] datetimeoffset NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraIntegrationIssue] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraIntegrationIssue_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id]),
        CONSTRAINT [FK_JiraIntegrationIssue_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraIntegrationIssue_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraSyncRun] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [ClientId] bigint NULL,
        [ClientJiraSpaceId] bigint NULL,
        [ProjectKey] nvarchar(40) NULL,
        [Type] nvarchar(40) NOT NULL,
        [Trigger] nvarchar(40) NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [StartedAt] datetimeoffset NOT NULL,
        [EndedAt] datetimeoffset NULL,
        [IssuesRetrieved] int NOT NULL,
        [CasesCreated] int NOT NULL,
        [CasesUpdated] int NOT NULL,
        [CommentsImported] int NOT NULL,
        [ActivitiesImported] int NOT NULL,
        [FailedRecords] int NOT NULL,
        [Error] nvarchar(1000) NULL,
        CONSTRAINT [PK_JiraSyncRun] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraSyncRun_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraUserMapping] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [JiraAccountId] nvarchar(128) NOT NULL,
        [JiraDisplayName] nvarchar(255) NULL,
        [TioUserId] bigint NULL,
        [LastSeenAt] datetimeoffset NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraUserMapping] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraUserMapping_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id]),
        CONSTRAINT [FK_JiraUserMapping_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraUserMapping_User_TioUserId] FOREIGN KEY ([TioUserId]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraUserMapping_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraWorkflowStatusMapping] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [JiraProjectId] nvarchar(40) NOT NULL,
        [JiraStatusId] nvarchar(40) NOT NULL,
        [JiraStatusName] nvarchar(120) NOT NULL,
        [JiraStatusCategory] nvarchar(40) NULL,
        [TargetStatus] nvarchar(40) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraWorkflowStatusMapping] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraWorkflowStatusMapping_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id]),
        CONSTRAINT [FK_JiraWorkflowStatusMapping_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraWorkflowStatusMapping_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraCaseMapping] (
        [Id] bigint NOT NULL IDENTITY,
        [JiraConnectionId] bigint NOT NULL,
        [JiraIssueId] nvarchar(40) NOT NULL,
        [IssueKey] nvarchar(60) NOT NULL,
        [JiraProjectId] nvarchar(40) NOT NULL,
        [ClientId] bigint NOT NULL,
        [ClientJiraSpaceId] bigint NOT NULL,
        [CaseId] bigint NULL,
        [Source] nvarchar(40) NOT NULL,
        [Url] nvarchar(500) NOT NULL,
        [Summary] nvarchar(400) NULL,
        [DescriptionText] nvarchar(400) NULL,
        [StatusId] nvarchar(40) NULL,
        [StatusName] nvarchar(120) NULL,
        [StatusCategory] nvarchar(40) NULL,
        [PriorityName] nvarchar(120) NULL,
        [IssueTypeName] nvarchar(120) NULL,
        [AssigneeAccountId] nvarchar(128) NULL,
        [AssigneeName] nvarchar(255) NULL,
        [ReporterName] nvarchar(255) NULL,
        [JiraCreatedAt] datetimeoffset NULL,
        [JiraUpdatedAt] datetimeoffset NULL,
        [JiraDueDate] date NULL,
        [Resolution] nvarchar(120) NULL,
        [Labels] nvarchar(1000) NULL,
        [Components] nvarchar(1000) NULL,
        [DetailsJson] nvarchar(4000) NULL,
        [LastSyncedAt] datetimeoffset NOT NULL,
        [AppliedAssigneeAccountId] nvarchar(128) NULL,
        [AppliedStatusId] nvarchar(40) NULL,
        [OwnerFromJira] bit NOT NULL,
        [ChildrenSyncedFor] datetimeoffset NULL,
        [MissingInJiraAt] datetimeoffset NULL,
        CONSTRAINT [PK_JiraCaseMapping] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraCaseMapping_Case_CaseId] FOREIGN KEY ([CaseId]) REFERENCES [work].[Case] ([Id]),
        CONSTRAINT [FK_JiraCaseMapping_ClientJiraSpace_ClientJiraSpaceId] FOREIGN KEY ([ClientJiraSpaceId]) REFERENCES [jira].[ClientJiraSpace] ([Id]),
        CONSTRAINT [FK_JiraCaseMapping_JiraConnection_JiraConnectionId] FOREIGN KEY ([JiraConnectionId]) REFERENCES [jira].[JiraConnection] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE TABLE [jira].[JiraSpaceSyncState] (
        [ClientJiraSpaceId] bigint NOT NULL,
        [IssueCheckpoint] datetimeoffset NULL,
        [LastRunAt] datetimeoffset NULL,
        [LastSuccessAt] datetimeoffset NULL,
        [LastFullAt] datetimeoffset NULL,
        [LastStatus] nvarchar(40) NULL,
        [LastError] nvarchar(1000) NULL,
        [ConsecutiveFailures] int NOT NULL,
        [ForceFullNext] bit NOT NULL,
        [ManualRequestedAt] datetimeoffset NULL,
        [LeaseOwner] nvarchar(120) NULL,
        [LeaseUntil] datetimeoffset NULL,
        CONSTRAINT [PK_JiraSpaceSyncState] PRIMARY KEY ([ClientJiraSpaceId]),
        CONSTRAINT [FK_JiraSpaceSyncState_ClientJiraSpace_ClientJiraSpaceId] FOREIGN KEY ([ClientJiraSpaceId]) REFERENCES [jira].[ClientJiraSpace] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_CaseComment_AuthorId] ON [work].[CaseComment] ([AuthorId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_CaseComment_CaseId_At] ON [work].[CaseComment] ([CaseId], [At]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ClientJiraSettings_ClientId] ON [jira].[ClientJiraSettings] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSettings_CreatedById] ON [jira].[ClientJiraSettings] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSettings_DefaultResponsibleTeamId] ON [jira].[ClientJiraSettings] ([DefaultResponsibleTeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSettings_JiraConnectionId] ON [jira].[ClientJiraSettings] ([JiraConnectionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSettings_UpdatedById] ON [jira].[ClientJiraSettings] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSpace_ClientId] ON [jira].[ClientJiraSpace] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSpace_CreatedById] ON [jira].[ClientJiraSpace] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_ClientJiraSpace_JiraConnectionId_JiraProjectId] ON [jira].[ClientJiraSpace] ([JiraConnectionId], [JiraProjectId]) WHERE [ReleasedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSpace_UpdatedById] ON [jira].[ClientJiraSpace] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraActivity_CaseId_At] ON [jira].[JiraActivity] ([CaseId], [At]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraActivity_JiraConnectionId_ExternalEventId] ON [jira].[JiraActivity] ([JiraConnectionId], [ExternalEventId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraActivity_JiraConnectionId_JiraIssueId] ON [jira].[JiraActivity] ([JiraConnectionId], [JiraIssueId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_JiraCaseMapping_CaseId] ON [jira].[JiraCaseMapping] ([CaseId]) WHERE [CaseId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraCaseMapping_ClientJiraSpaceId] ON [jira].[JiraCaseMapping] ([ClientJiraSpaceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraCaseMapping_JiraConnectionId_IssueKey] ON [jira].[JiraCaseMapping] ([JiraConnectionId], [IssueKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraCaseMapping_JiraConnectionId_JiraIssueId] ON [jira].[JiraCaseMapping] ([JiraConnectionId], [JiraIssueId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraComment_CaseId_JiraCreatedAt] ON [jira].[JiraComment] ([CaseId], [JiraCreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraComment_JiraConnectionId_JiraCommentId] ON [jira].[JiraComment] ([JiraConnectionId], [JiraCommentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraComment_JiraConnectionId_JiraIssueId] ON [jira].[JiraComment] ([JiraConnectionId], [JiraIssueId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraConnection_CreatedById] ON [jira].[JiraConnection] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraConnection_JiraInstanceId] ON [jira].[JiraConnection] ([JiraInstanceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraConnection_Name] ON [jira].[JiraConnection] ([Name]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraConnection_SiteUrl] ON [jira].[JiraConnection] ([SiteUrl]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraConnection_UpdatedById] ON [jira].[JiraConnection] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraDiscoveredSpace_JiraConnectionId_JiraProjectId] ON [jira].[JiraDiscoveredSpace] ([JiraConnectionId], [JiraProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraIntegrationIssue_CreatedById] ON [jira].[JiraIntegrationIssue] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_JiraIntegrationIssue_Fingerprint] ON [jira].[JiraIntegrationIssue] ([Fingerprint]) WHERE [Status] = N''Open''');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraIntegrationIssue_JiraConnectionId] ON [jira].[JiraIntegrationIssue] ([JiraConnectionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraIntegrationIssue_Status_Type] ON [jira].[JiraIntegrationIssue] ([Status], [Type]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraIntegrationIssue_UpdatedById] ON [jira].[JiraIntegrationIssue] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraSyncRun_ClientId_StartedAt] ON [jira].[JiraSyncRun] ([ClientId], [StartedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraSyncRun_ClientJiraSpaceId_StartedAt] ON [jira].[JiraSyncRun] ([ClientJiraSpaceId], [StartedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraSyncRun_JiraConnectionId] ON [jira].[JiraSyncRun] ([JiraConnectionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraSyncRun_StartedAt] ON [jira].[JiraSyncRun] ([StartedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraUserMapping_CreatedById] ON [jira].[JiraUserMapping] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraUserMapping_JiraConnectionId_JiraAccountId] ON [jira].[JiraUserMapping] ([JiraConnectionId], [JiraAccountId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraUserMapping_TioUserId] ON [jira].[JiraUserMapping] ([TioUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraUserMapping_UpdatedById] ON [jira].[JiraUserMapping] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraWorkflowStatusMapping_CreatedById] ON [jira].[JiraWorkflowStatusMapping] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraWorkflowStatusMapping_JiraConnectionId_JiraProjectId_JiraStatusId] ON [jira].[JiraWorkflowStatusMapping] ([JiraConnectionId], [JiraProjectId], [JiraStatusId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    CREATE INDEX [IX_JiraWorkflowStatusMapping_UpdatedById] ON [jira].[JiraWorkflowStatusMapping] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103083834_JiraIntegration'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103083834_JiraIntegration', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103134931_ConfigurableCaseStatuses'
)
BEGIN
    ALTER TABLE [jira].[JiraWorkflowStatusMapping] ADD [TargetStatusCode] nvarchar(400) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103134931_ConfigurableCaseStatuses'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [StatusCode] nvarchar(100) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103134931_ConfigurableCaseStatuses'
)
BEGIN
    IF EXISTS (SELECT 1 FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel')
    BEGIN
        DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
        UPDATE [admin].[LookupValue] SET [Category] = N'Initial', [SortOrder] = 10 WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'New';
        UPDATE [admin].[LookupValue] SET [Code] = N'Opened', [Category] = N'Opened', [SortOrder] = 20, [Label] = CASE WHEN [Label] = N'Triaged' THEN N'Opened' ELSE [Label] END WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Triaged';
        UPDATE [admin].[LookupValue] SET [Category] = N'Active', [SortOrder] = 30, [Label] = CASE WHEN [Label] = N'InProgress' THEN N'In-progress' ELSE [Label] END WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'InProgress';
        UPDATE [admin].[LookupValue] SET [Category] = N'Closed', [SortOrder] = 50 WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Closed';
        IF EXISTS (SELECT 1 FROM [work].[Case] WHERE [Status] = N'PendingValidation')
            UPDATE [admin].[LookupValue] SET [Category] = N'Resolved', [SortOrder] = 35, [Label] = CASE WHEN [Label] = N'PendingValidation' THEN N'Pending validation' ELSE [Label] END WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'PendingValidation';
        ELSE
            DELETE FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'PendingValidation';
        DELETE FROM [admin].[LookupValue] WHERE [ListName] = N'CaseStatusLabel' AND [Code] = N'Cancelled';
        INSERT INTO [admin].[LookupValue] ([ListName], [Code], [Label], [Category], [SortOrder], [IsRetired], [CreatedAt], [UpdatedAt]) VALUES
            (N'CaseStatusLabel', N'WaitingForCustomer', N'Waiting for customer', N'WaitingForCustomer', 40, 0, @now, @now),
            (N'CaseStatusLabel', N'Reopened', N'Re-opened', N'Reopened', 60, 0, @now, @now);
    END;
    -- In EXEC, like the next statement: the deployment script has no batch break here, and this column is added in the same batch.
    EXEC(N'UPDATE [work].[Case] SET [StatusCode] = CASE
        WHEN [Status] = N''New'' THEN N''New''
        WHEN [Status] = N''Triaged'' AND [ReopenCount] > 0 THEN N''Reopened''
        WHEN [Status] = N''Triaged'' THEN N''Opened''
        WHEN [Status] = N''InProgress'' THEN N''InProgress''
        WHEN [Status] = N''PendingValidation'' THEN N''PendingValidation''
        ELSE N''Closed'' END;
    UPDATE [work].[Case] SET [StatusCode] = N''WaitingForCustomer'' WHERE [WaitingReason] = N''Customer'' AND [Status] NOT IN (N''Closed'', N''Cancelled'');');
    -- In EXEC: the deployment script is re-run on upgraded databases, where this column no longer exists.
    EXEC(N'UPDATE [jira].[JiraWorkflowStatusMapping] SET [TargetStatusCode] = CASE [TargetStatus]
        WHEN N''New'' THEN N''New''
        WHEN N''Triaged'' THEN N''Opened''
        WHEN N''InProgress'' THEN N''InProgress''
        WHEN N''PendingValidation'' THEN (SELECT [Code] FROM [admin].[LookupValue] WHERE [ListName] = N''CaseStatusLabel'' AND [Code] = N''PendingValidation'') END;');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103134931_ConfigurableCaseStatuses'
)
BEGIN
    DECLARE @var22 nvarchar(max);
    SELECT @var22 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraWorkflowStatusMapping]') AND [c].[name] = N'TargetStatus');
    IF @var22 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraWorkflowStatusMapping] DROP CONSTRAINT ' + @var22 + ';');
    ALTER TABLE [jira].[JiraWorkflowStatusMapping] DROP COLUMN [TargetStatus];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103134931_ConfigurableCaseStatuses'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103134931_ConfigurableCaseStatuses', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103140328_JiraSlaClockStart'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaClockStartAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103140328_JiraSlaClockStart'
)
BEGIN
    EXEC(N'UPDATE c SET c.[FirstResponseAt] = x.[FirstComment]
    FROM [work].[Case] c JOIN (SELECT [CaseId], MIN([JiraCreatedAt]) AS [FirstComment] FROM [jira].[JiraComment] WHERE [DeletedInJiraAt] IS NULL GROUP BY [CaseId]) x ON x.[CaseId] = c.[Id]
    WHERE c.[FirstResponseAt] IS NULL;
    UPDATE c SET c.[SlaClockStartAt] = m.[JiraCreatedAt], c.[SlaCalculatedAt] = NULL
    FROM [work].[Case] c JOIN [jira].[JiraCaseMapping] m ON m.[CaseId] = c.[Id]
    WHERE m.[JiraCreatedAt] IS NOT NULL;');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103140328_JiraSlaClockStart'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103140328_JiraSlaClockStart', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103142214_JiraClientRepresentative'
)
BEGIN
    ALTER TABLE [jira].[JiraUserMapping] ADD [ClientContactId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103142214_JiraClientRepresentative'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [ClientRepresentative] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103142214_JiraClientRepresentative'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103142214_JiraClientRepresentative', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103142553_JiraInternalMember'
)
BEGIN
    ALTER TABLE [jira].[JiraUserMapping] ADD [IsInternalMember] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103142553_JiraInternalMember'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [InternalAssignee] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103142553_JiraInternalMember'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103142553_JiraInternalMember', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    DECLARE @drop nvarchar(max) = N'';
    SELECT @drop += N'ALTER TABLE [iam].[UserPermissionOverride] DROP CONSTRAINT ' + QUOTENAME(name) + N';'
    FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'[iam].[UserPermissionOverride]');
    EXEC sp_executesql @drop;
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_AppRole_Rights_Retired')
        ALTER TABLE [iam].[AppRole] ADD CONSTRAINT [DF_AppRole_Rights_Retired] DEFAULT 0 FOR [Rights];
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_User_Grants_Retired')
        ALTER TABLE [iam].[User] ADD CONSTRAINT [DF_User_Grants_Retired] DEFAULT 0 FOR [Grants];
    IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_GroupMapping_Grants_Retired')
        ALTER TABLE [iam].[GroupMapping] ADD CONSTRAINT [DF_GroupMapping_Grants_Retired] DEFAULT 0 FOR [Grants];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE TABLE [iam].[GroupMappingRole] (
        [GroupMappingId] bigint NOT NULL,
        [AppRoleId] bigint NOT NULL,
        CONSTRAINT [PK_GroupMappingRole] PRIMARY KEY ([GroupMappingId], [AppRoleId]),
        CONSTRAINT [FK_GroupMappingRole_AppRole_AppRoleId] FOREIGN KEY ([AppRoleId]) REFERENCES [iam].[AppRole] ([Id]),
        CONSTRAINT [FK_GroupMappingRole_GroupMapping_GroupMappingId] FOREIGN KEY ([GroupMappingId]) REFERENCES [iam].[GroupMapping] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE TABLE [iam].[RightDefinition] (
        [Id] bigint NOT NULL IDENTITY,
        [Key] nvarchar(120) NOT NULL,
        [Label] nvarchar(100) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Module] nvarchar(60) NOT NULL,
        [Feature] nvarchar(60) NOT NULL,
        [Kind] nvarchar(20) NOT NULL,
        [RiskLevel] nvarchar(20) NOT NULL,
        [DisplayOrder] int NOT NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_RightDefinition] PRIMARY KEY ([Id]),
        CONSTRAINT [AK_RightDefinition_Key] UNIQUE ([Key]),
        CONSTRAINT [CK_RightDefinition_Kind] CHECK ([Kind] IN ('Access','Action')),
        CONSTRAINT [FK_RightDefinition_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_RightDefinition_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE TABLE [iam].[RoleRight] (
        [AppRoleId] bigint NOT NULL,
        [RightKey] nvarchar(120) NOT NULL,
        CONSTRAINT [PK_RoleRight] PRIMARY KEY ([AppRoleId], [RightKey]),
        CONSTRAINT [FK_RoleRight_AppRole_AppRoleId] FOREIGN KEY ([AppRoleId]) REFERENCES [iam].[AppRole] ([Id]),
        CONSTRAINT [FK_RoleRight_RightDefinition_RightKey] FOREIGN KEY ([RightKey]) REFERENCES [iam].[RightDefinition] ([Key])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE TABLE [iam].[UserRightException] (
        [Id] bigint NOT NULL IDENTITY,
        [UserId] bigint NOT NULL,
        [RightKey] nvarchar(120) NOT NULL,
        [Effect] nvarchar(5) NOT NULL,
        [ExpiresAt] datetimeoffset NULL,
        [ClientId] bigint NULL,
        [ProjectId] bigint NULL,
        [TeamId] bigint NULL,
        CONSTRAINT [PK_UserRightException] PRIMARY KEY ([Id]),
        CONSTRAINT [CK_UserRightException_Effect] CHECK ([Effect] IN ('Allow','Deny')),
        CONSTRAINT [CK_UserRightException_SingleScope] CHECK ((CASE WHEN [ClientId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [ProjectId] IS NULL THEN 0 ELSE 1 END + CASE WHEN [TeamId] IS NULL THEN 0 ELSE 1 END) <= 1),
        CONSTRAINT [FK_UserRightException_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_UserRightException_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_UserRightException_RightDefinition_RightKey] FOREIGN KEY ([RightKey]) REFERENCES [iam].[RightDefinition] ([Key]),
        CONSTRAINT [FK_UserRightException_Team_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [teams].[Team] ([Id]),
        CONSTRAINT [FK_UserRightException_User_UserId] FOREIGN KEY ([UserId]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_GroupMappingRole_AppRoleId] ON [iam].[GroupMappingRole] ([AppRoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_RightDefinition_CreatedById] ON [iam].[RightDefinition] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE UNIQUE INDEX [IX_RightDefinition_Key] ON [iam].[RightDefinition] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_RightDefinition_Module_Feature] ON [iam].[RightDefinition] ([Module], [Feature]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_RightDefinition_UpdatedById] ON [iam].[RightDefinition] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_RoleRight_RightKey] ON [iam].[RoleRight] ([RightKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_UserRightException_ClientId] ON [iam].[UserRightException] ([ClientId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_UserRightException_ExpiresAt] ON [iam].[UserRightException] ([ExpiresAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_UserRightException_ProjectId] ON [iam].[UserRightException] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_UserRightException_RightKey] ON [iam].[UserRightException] ([RightKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    CREATE INDEX [IX_UserRightException_TeamId] ON [iam].[UserRightException] ([TeamId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserRightException_Client] ON [iam].[UserRightException] ([UserId], [RightKey], [ClientId]) WHERE [ClientId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserRightException_Global] ON [iam].[UserRightException] ([UserId], [RightKey]) WHERE [ClientId] IS NULL AND [ProjectId] IS NULL AND [TeamId] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserRightException_Project] ON [iam].[UserRightException] ([UserId], [RightKey], [ProjectId]) WHERE [ProjectId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [UX_UserRightException_Team] ON [iam].[UserRightException] ([UserId], [RightKey], [TeamId]) WHERE [TeamId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    EXEC(N'
    SET NOCOUNT ON;
    DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();

    -- Frozen 2.47 mapping: a new right needs its old action and every container above it.
    CREATE TABLE #Map (NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, OldKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (NewKey, OldKey));
    INSERT #Map VALUES
    (N''ClientStructure:Access'',N''area.ClientStructure:Access''),
    (N''ClientStructure:Access'',N''module.clients:Access''),
    (N''ClientStructure:View'',N''ClientStructure:View''),
    (N''ClientStructure:View'',N''area.ClientStructure:Access''),
    (N''ClientStructure:View'',N''module.clients:Access''),
    (N''ClientStructure:Create'',N''ClientStructure:Create''),
    (N''ClientStructure:Create'',N''area.ClientStructure:Access''),
    (N''ClientStructure:Create'',N''module.clients:Access''),
    (N''ClientStructure:Maintain'',N''ClientStructure:Maintain''),
    (N''ClientStructure:Maintain'',N''area.ClientStructure:Access''),
    (N''ClientStructure:Maintain'',N''module.clients:Access''),
    (N''ClientStructure:Coordinate'',N''ClientStructure:Coordinate''),
    (N''ClientStructure:Coordinate'',N''area.ClientStructure:Access''),
    (N''ClientStructure:Coordinate'',N''module.clients:Access''),
    (N''ClientStructure:ArchiveRestore'',N''ClientStructure:ArchiveRestore''),
    (N''ClientStructure:ArchiveRestore'',N''area.ClientStructure:Access''),
    (N''ClientStructure:ArchiveRestore'',N''module.clients:Access''),
    (N''ClientStructure:Delete'',N''ClientStructure:Delete''),
    (N''ClientStructure:Delete'',N''area.ClientStructure:Access''),
    (N''ClientStructure:Delete'',N''module.clients:Access''),
    (N''ClientStructure:DetailsView'',N''ClientStructure:DetailsView''),
    (N''ClientStructure:DetailsView'',N''area.ClientStructure:Access''),
    (N''ClientStructure:DetailsView'',N''module.clients:Access''),
    (N''ClientStructure:HistoryView'',N''ClientStructure:HistoryView''),
    (N''ClientStructure:HistoryView'',N''tab.ClientStructure.history:Access''),
    (N''ClientStructure:HistoryView'',N''area.ClientStructure:Access''),
    (N''ClientStructure:HistoryView'',N''module.clients:Access''),
    (N''ClientStructure:AttachmentsView'',N''ClientStructure:AttachmentsView''),
    (N''ClientStructure:AttachmentsView'',N''tab.ClientStructure.files:Access''),
    (N''ClientStructure:AttachmentsView'',N''area.ClientStructure:Access''),
    (N''ClientStructure:AttachmentsView'',N''module.clients:Access''),
    (N''ClientStructure:AttachmentsUpload'',N''ClientStructure:AttachmentsUpload''),
    (N''ClientStructure:AttachmentsUpload'',N''tab.ClientStructure.files:Access''),
    (N''ClientStructure:AttachmentsUpload'',N''area.ClientStructure:Access''),
    (N''ClientStructure:AttachmentsUpload'',N''module.clients:Access''),
    (N''ClientStructure:AttachmentsDeleteOwn'',N''ClientStructure:AttachmentsDeleteOwn''),
    (N''ClientStructure:AttachmentsDeleteOwn'',N''tab.ClientStructure.files:Access''),
    (N''ClientStructure:AttachmentsDeleteOwn'',N''area.ClientStructure:Access''),
    (N''ClientStructure:AttachmentsDeleteOwn'',N''module.clients:Access''),
    (N''ClientStructure:AttachmentsDelete'',N''ClientStructure:AttachmentsDelete''),
    (N''ClientStructure:AttachmentsDelete'',N''tab.ClientStructure.files:Access''),
    (N''ClientStructure:AttachmentsDelete'',N''area.ClientStructure:Access''),
    (N''ClientStructure:AttachmentsDelete'',N''module.clients:Access''),
    (N''ClientStructure:Export'',N''ClientStructure:Export''),
    (N''ClientStructure:Export'',N''area.ClientStructure:Access''),
    (N''ClientStructure:Export'',N''module.clients:Access''),
    (N''Projects:View'',N''Projects:View''),
    (N''Projects:View'',N''area.Projects:Access''),
    (N''Projects:View'',N''module.clients:Access''),
    (N''Projects:Create'',N''Projects:Create''),
    (N''Projects:Create'',N''area.Projects:Access''),
    (N''Projects:Create'',N''module.clients:Access''),
    (N''Projects:Maintain'',N''Projects:Maintain''),
    (N''Projects:Maintain'',N''area.Projects:Access''),
    (N''Projects:Maintain'',N''module.clients:Access''),
    (N''Projects:Coordinate'',N''Projects:Coordinate''),
    (N''Projects:Coordinate'',N''area.Projects:Access''),
    (N''Projects:Coordinate'',N''module.clients:Access''),
    (N''Projects:ArchiveRestore'',N''Projects:ArchiveRestore''),
    (N''Projects:ArchiveRestore'',N''area.Projects:Access''),
    (N''Projects:ArchiveRestore'',N''module.clients:Access''),
    (N''Projects:Delete'',N''Projects:Delete''),
    (N''Projects:Delete'',N''area.Projects:Access''),
    (N''Projects:Delete'',N''module.clients:Access''),
    (N''Projects:DetailsView'',N''Projects:DetailsView''),
    (N''Projects:DetailsView'',N''tab.Projects.details:Access''),
    (N''Projects:DetailsView'',N''area.Projects:Access''),
    (N''Projects:DetailsView'',N''module.clients:Access''),
    (N''Projects:HistoryView'',N''Projects:HistoryView''),
    (N''Projects:HistoryView'',N''tab.Projects.history:Access''),
    (N''Projects:HistoryView'',N''area.Projects:Access''),
    (N''Projects:HistoryView'',N''module.clients:Access''),
    (N''Projects:AttachmentsView'',N''Projects:AttachmentsView''),
    (N''Projects:AttachmentsView'',N''tab.Projects.files:Access''),
    (N''Projects:AttachmentsView'',N''area.Projects:Access''),
    (N''Projects:AttachmentsView'',N''module.clients:Access''),
    (N''Projects:AttachmentsUpload'',N''Projects:AttachmentsUpload''),
    (N''Projects:AttachmentsUpload'',N''tab.Projects.files:Access''),
    (N''Projects:AttachmentsUpload'',N''area.Projects:Access''),
    (N''Projects:AttachmentsUpload'',N''module.clients:Access''),
    (N''Projects:AttachmentsDeleteOwn'',N''Projects:AttachmentsDeleteOwn''),
    (N''Projects:AttachmentsDeleteOwn'',N''tab.Projects.files:Access''),
    (N''Projects:AttachmentsDeleteOwn'',N''area.Projects:Access''),
    (N''Projects:AttachmentsDeleteOwn'',N''module.clients:Access''),
    (N''Projects:AttachmentsDelete'',N''Projects:AttachmentsDelete''),
    (N''Projects:AttachmentsDelete'',N''tab.Projects.files:Access''),
    (N''Projects:AttachmentsDelete'',N''area.Projects:Access''),
    (N''Projects:AttachmentsDelete'',N''module.clients:Access''),
    (N''Projects:Export'',N''Projects:Export''),
    (N''Projects:Export'',N''area.Projects:Access''),
    (N''Projects:Export'',N''module.clients:Access''),
    (N''Contracts:View'',N''Contracts:View''),
    (N''Contracts:View'',N''area.Contracts:Access''),
    (N''Contracts:View'',N''module.clients:Access''),
    (N''Contracts:Create'',N''Contracts:Create''),
    (N''Contracts:Create'',N''area.Contracts:Access''),
    (N''Contracts:Create'',N''module.clients:Access''),
    (N''Contracts:Maintain'',N''Contracts:Maintain''),
    (N''Contracts:Maintain'',N''area.Contracts:Access''),
    (N''Contracts:Maintain'',N''module.clients:Access''),
    (N''Contracts:Coordinate'',N''Contracts:Coordinate''),
    (N''Contracts:Coordinate'',N''area.Contracts:Access''),
    (N''Contracts:Coordinate'',N''module.clients:Access''),
    (N''Contracts:ArchiveRestore'',N''Contracts:ArchiveRestore''),
    (N''Contracts:ArchiveRestore'',N''area.Contracts:Access''),
    (N''Contracts:ArchiveRestore'',N''module.clients:Access''),
    (N''Contracts:Delete'',N''Contracts:Delete''),
    (N''Contracts:Delete'',N''area.Contracts:Access''),
    (N''Contracts:Delete'',N''module.clients:Access''),
    (N''Contracts:DetailsView'',N''Contracts:DetailsView''),
    (N''Contracts:DetailsView'',N''tab.Contracts.details:Access''),
    (N''Contracts:DetailsView'',N''area.Contracts:Access''),
    (N''Contracts:DetailsView'',N''module.clients:Access''),
    (N''Contracts:HistoryView'',N''Contracts:HistoryView''),
    (N''Contracts:HistoryView'',N''tab.Contracts.history:Access''),
    (N''Contracts:HistoryView'',N''area.Contracts:Access''),
    (N''Contracts:HistoryView'',N''module.clients:Access''),
    (N''Contracts:AttachmentsView'',N''Contracts:AttachmentsView''),
    (N''Contracts:AttachmentsView'',N''tab.Contracts.files:Access''),
    (N''Contracts:AttachmentsView'',N''area.Contracts:Access''),
    (N''Contracts:AttachmentsView'',N''module.clients:Access''),
    (N''Contracts:AttachmentsUpload'',N''Contracts:AttachmentsUpload''),
    (N''Contracts:AttachmentsUpload'',N''tab.Contracts.files:Access''),
    (N''Contracts:AttachmentsUpload'',N''area.Contracts:Access''),
    (N''Contracts:AttachmentsUpload'',N''module.clients:Access''),
    (N''Contracts:AttachmentsDeleteOwn'',N''Contracts:AttachmentsDeleteOwn''),
    (N''Contracts:AttachmentsDeleteOwn'',N''tab.Contracts.files:Access''),
    (N''Contracts:AttachmentsDeleteOwn'',N''area.Contracts:Access''),
    (N''Contracts:AttachmentsDeleteOwn'',N''module.clients:Access''),
    (N''Contracts:AttachmentsDelete'',N''Contracts:AttachmentsDelete''),
    (N''Contracts:AttachmentsDelete'',N''tab.Contracts.files:Access''),
    (N''Contracts:AttachmentsDelete'',N''area.Contracts:Access''),
    (N''Contracts:AttachmentsDelete'',N''module.clients:Access''),
    (N''Contracts:Export'',N''Contracts:Export''),
    (N''Contracts:Export'',N''area.Contracts:Access''),
    (N''Contracts:Export'',N''module.clients:Access''),
    (N''Environments:View'',N''Environments:View''),
    (N''Environments:View'',N''area.Environments:Access''),
    (N''Environments:View'',N''module.clients:Access''),
    (N''Environments:Create'',N''Environments:Create''),
    (N''Environments:Create'',N''area.Environments:Access''),
    (N''Environments:Create'',N''module.clients:Access''),
    (N''Environments:Maintain'',N''Environments:Maintain''),
    (N''Environments:Maintain'',N''area.Environments:Access''),
    (N''Environments:Maintain'',N''module.clients:Access''),
    (N''Environments:Coordinate'',N''Environments:Coordinate''),
    (N''Environments:Coordinate'',N''area.Environments:Access''),
    (N''Environments:Coordinate'',N''module.clients:Access''),
    (N''Environments:ArchiveRestore'',N''Environments:ArchiveRestore''),
    (N''Environments:ArchiveRestore'',N''area.Environments:Access''),
    (N''Environments:ArchiveRestore'',N''module.clients:Access''),
    (N''Environments:Delete'',N''Environments:Delete''),
    (N''Environments:Delete'',N''area.Environments:Access''),
    (N''Environments:Delete'',N''module.clients:Access''),
    (N''Environments:DetailsView'',N''Environments:DetailsView''),
    (N''Environments:DetailsView'',N''area.Environments:Access''),
    (N''Environments:DetailsView'',N''module.clients:Access''),
    (N''Environments:HistoryView'',N''Environments:HistoryView''),
    (N''Environments:HistoryView'',N''tab.Environments.history:Access''),
    (N''Environments:HistoryView'',N''area.Environments:Access''),
    (N''Environments:HistoryView'',N''module.clients:Access''),
    (N''Environments:AttachmentsView'',N''Environments:AttachmentsView''),
    (N''Environments:AttachmentsView'',N''tab.Environments.files:Access''),
    (N''Environments:AttachmentsView'',N''area.Environments:Access''),
    (N''Environments:AttachmentsView'',N''module.clients:Access''),
    (N''Environments:AttachmentsUpload'',N''Environments:AttachmentsUpload''),
    (N''Environments:AttachmentsUpload'',N''tab.Environments.files:Access''),
    (N''Environments:AttachmentsUpload'',N''area.Environments:Access''),
    (N''Environments:AttachmentsUpload'',N''module.clients:Access''),
    (N''Environments:AttachmentsDeleteOwn'',N''Environments:AttachmentsDeleteOwn''),
    (N''Environments:AttachmentsDeleteOwn'',N''tab.Environments.files:Access''),
    (N''Environments:AttachmentsDeleteOwn'',N''area.Environments:Access''),
    (N''Environments:AttachmentsDeleteOwn'',N''module.clients:Access''),
    (N''Environments:AttachmentsDelete'',N''Environments:AttachmentsDelete''),
    (N''Environments:AttachmentsDelete'',N''tab.Environments.files:Access''),
    (N''Environments:AttachmentsDelete'',N''area.Environments:Access''),
    (N''Environments:AttachmentsDelete'',N''module.clients:Access''),
    (N''Environments:Export'',N''Environments:Export''),
    (N''Environments:Export'',N''area.Environments:Access''),
    (N''Environments:Export'',N''module.clients:Access''),
    (N''Servers:View'',N''Servers:View''),
    (N''Servers:View'',N''area.Servers:Access''),
    (N''Servers:View'',N''module.clients:Access''),
    (N''Servers:Create'',N''Servers:Create''),
    (N''Servers:Create'',N''area.Servers:Access''),
    (N''Servers:Create'',N''module.clients:Access''),
    (N''Servers:Maintain'',N''Servers:Maintain''),
    (N''Servers:Maintain'',N''area.Servers:Access''),
    (N''Servers:Maintain'',N''module.clients:Access''),
    (N''Servers:Coordinate'',N''Servers:Coordinate''),
    (N''Servers:Coordinate'',N''area.Servers:Access''),
    (N''Servers:Coordinate'',N''module.clients:Access''),
    (N''Servers:ArchiveRestore'',N''Servers:ArchiveRestore''),
    (N''Servers:ArchiveRestore'',N''area.Servers:Access''),
    (N''Servers:ArchiveRestore'',N''module.clients:Access''),
    (N''Servers:Delete'',N''Servers:Delete''),
    (N''Servers:Delete'',N''area.Servers:Access''),
    (N''Servers:Delete'',N''module.clients:Access''),
    (N''Servers:DetailsView'',N''Servers:DetailsView''),
    (N''Servers:DetailsView'',N''tab.Servers.details:Access''),
    (N''Servers:DetailsView'',N''area.Servers:Access''),
    (N''Servers:DetailsView'',N''module.clients:Access''),
    (N''Servers:HistoryView'',N''Servers:HistoryView''),
    (N''Servers:HistoryView'',N''tab.Servers.history:Access''),
    (N''Servers:HistoryView'',N''area.Servers:Access''),
    (N''Servers:HistoryView'',N''module.clients:Access''),
    (N''Servers:AttachmentsView'',N''Servers:AttachmentsView''),
    (N''Servers:AttachmentsView'',N''tab.Servers.files:Access''),
    (N''Servers:AttachmentsView'',N''area.Servers:Access''),
    (N''Servers:AttachmentsView'',N''module.clients:Access''),
    (N''Servers:AttachmentsUpload'',N''Servers:AttachmentsUpload''),
    (N''Servers:AttachmentsUpload'',N''tab.Servers.files:Access''),
    (N''Servers:AttachmentsUpload'',N''area.Servers:Access''),
    (N''Servers:AttachmentsUpload'',N''module.clients:Access''),
    (N''Servers:AttachmentsDeleteOwn'',N''Servers:AttachmentsDeleteOwn''),
    (N''Servers:AttachmentsDeleteOwn'',N''tab.Servers.files:Access''),
    (N''Servers:AttachmentsDeleteOwn'',N''area.Servers:Access''),
    (N''Servers:AttachmentsDeleteOwn'',N''module.clients:Access''),
    (N''Servers:AttachmentsDelete'',N''Servers:AttachmentsDelete''),
    (N''Servers:AttachmentsDelete'',N''tab.Servers.files:Access''),
    (N''Servers:AttachmentsDelete'',N''area.Servers:Access''),
    (N''Servers:AttachmentsDelete'',N''module.clients:Access''),
    (N''Servers:Export'',N''Servers:Export''),
    (N''Servers:Export'',N''area.Servers:Access''),
    (N''Servers:Export'',N''module.clients:Access''),
    (N''Installations:View'',N''Installations:View''),
    (N''Installations:View'',N''area.Installations:Access''),
    (N''Installations:View'',N''module.clients:Access''),
    (N''Installations:Create'',N''Installations:Create''),
    (N''Installations:Create'',N''area.Installations:Access''),
    (N''Installations:Create'',N''module.clients:Access''),
    (N''Installations:Maintain'',N''Installations:Maintain''),
    (N''Installations:Maintain'',N''area.Installations:Access''),
    (N''Installations:Maintain'',N''module.clients:Access''),
    (N''Installations:Coordinate'',N''Installations:Coordinate''),
    (N''Installations:Coordinate'',N''area.Installations:Access''),
    (N''Installations:Coordinate'',N''module.clients:Access''),
    (N''Installations:ArchiveRestore'',N''Installations:ArchiveRestore''),
    (N''Installations:ArchiveRestore'',N''area.Installations:Access''),
    (N''Installations:ArchiveRestore'',N''module.clients:Access''),
    (N''Installations:Delete'',N''Installations:Delete''),
    (N''Installations:Delete'',N''area.Installations:Access''),
    (N''Installations:Delete'',N''module.clients:Access''),
    (N''Installations:DetailsView'',N''Installations:DetailsView''),
    (N''Installations:DetailsView'',N''tab.Installations.details:Access''),
    (N''Installations:DetailsView'',N''area.Installations:Access''),
    (N''Installations:DetailsView'',N''module.clients:Access''),
    (N''Installations:HistoryView'',N''Installations:HistoryView''),
    (N''Installations:HistoryView'',N''tab.Installations.history:Access''),
    (N''Installations:HistoryView'',N''area.Installations:Access''),
    (N''Installations:HistoryView'',N''module.clients:Access''),
    (N''Installations:AttachmentsView'',N''Installations:AttachmentsView''),
    (N''Installations:AttachmentsView'',N''tab.Installations.files:Access''),
    (N''Installations:AttachmentsView'',N''area.Installations:Access''),
    (N''Installations:AttachmentsView'',N''module.clients:Access''),
    (N''Installations:AttachmentsUpload'',N''Installations:AttachmentsUpload''),
    (N''Installations:AttachmentsUpload'',N''tab.Installations.files:Access''),
    (N''Installations:AttachmentsUpload'',N''area.Installations:Access''),
    (N''Installations:AttachmentsUpload'',N''module.clients:Access''),
    (N''Installations:AttachmentsDeleteOwn'',N''Installations:AttachmentsDeleteOwn''),
    (N''Installations:AttachmentsDeleteOwn'',N''tab.Installations.files:Access''),
    (N''Installations:AttachmentsDeleteOwn'',N''area.Installations:Access''),
    (N''Installations:AttachmentsDeleteOwn'',N''module.clients:Access''),
    (N''Installations:AttachmentsDelete'',N''Installations:AttachmentsDelete''),
    (N''Installations:AttachmentsDelete'',N''tab.Installations.files:Access''),
    (N''Installations:AttachmentsDelete'',N''area.Installations:Access''),
    (N''Installations:AttachmentsDelete'',N''module.clients:Access''),
    (N''Installations:Export'',N''Installations:Export''),
    (N''Installations:Export'',N''area.Installations:Access''),
    (N''Installations:Export'',N''module.clients:Access''),
    (N''Products:View'',N''Products:View''),
    (N''Products:View'',N''area.Products:Access''),
    (N''Products:View'',N''module.products:Access''),
    (N''Products:Create'',N''Products:Create''),
    (N''Products:Create'',N''area.Products:Access''),
    (N''Products:Create'',N''module.products:Access''),
    (N''Products:Maintain'',N''Products:Maintain''),
    (N''Products:Maintain'',N''area.Products:Access''),
    (N''Products:Maintain'',N''module.products:Access''),
    (N''Products:Coordinate'',N''Products:Coordinate''),
    (N''Products:Coordinate'',N''area.Products:Access''),
    (N''Products:Coordinate'',N''module.products:Access''),
    (N''Products:ArchiveRestore'',N''Products:ArchiveRestore''),
    (N''Products:ArchiveRestore'',N''area.Products:Access''),
    (N''Products:ArchiveRestore'',N''module.products:Access''),
    (N''Products:Delete'',N''Products:Delete''),
    (N''Products:Delete'',N''area.Products:Access''),
    (N''Products:Delete'',N''module.products:Access''),
    (N''Products:DetailsView'',N''Products:DetailsView''),
    (N''Products:DetailsView'',N''tab.Products.details:Access''),
    (N''Products:DetailsView'',N''area.Products:Access''),
    (N''Products:DetailsView'',N''module.products:Access''),
    (N''Products:HistoryView'',N''Products:HistoryView''),
    (N''Products:HistoryView'',N''tab.Products.history:Access''),
    (N''Products:HistoryView'',N''area.Products:Access''),
    (N''Products:HistoryView'',N''module.products:Access''),
    (N''Products:AttachmentsView'',N''Products:AttachmentsView''),
    (N''Products:AttachmentsView'',N''tab.Products.files:Access''),
    (N''Products:AttachmentsView'',N''area.Products:Access''),
    (N''Products:AttachmentsView'',N''module.products:Access''),
    (N''Products:AttachmentsUpload'',N''Products:AttachmentsUpload''),
    (N''Products:AttachmentsUpload'',N''tab.Products.files:Access''),
    (N''Products:AttachmentsUpload'',N''area.Products:Access''),
    (N''Products:AttachmentsUpload'',N''module.products:Access''),
    (N''Products:AttachmentsDeleteOwn'',N''Products:AttachmentsDeleteOwn''),
    (N''Products:AttachmentsDeleteOwn'',N''tab.Products.files:Access''),
    (N''Products:AttachmentsDeleteOwn'',N''area.Products:Access''),
    (N''Products:AttachmentsDeleteOwn'',N''module.products:Access''),
    (N''Products:AttachmentsDelete'',N''Products:AttachmentsDelete''),
    (N''Products:AttachmentsDelete'',N''tab.Products.files:Access''),
    (N''Products:AttachmentsDelete'',N''area.Products:Access''),
    (N''Products:AttachmentsDelete'',N''module.products:Access''),
    (N''Products:Export'',N''Products:Export''),
    (N''Products:Export'',N''area.Products:Access''),
    (N''Products:Export'',N''module.products:Access''),
    (N''Cases:View'',N''Cases:View''),
    (N''Cases:View'',N''area.Cases:Access''),
    (N''Cases:View'',N''module.cases:Access''),
    (N''Cases:Create'',N''Cases:Create''),
    (N''Cases:Create'',N''area.Cases:Access''),
    (N''Cases:Create'',N''module.cases:Access''),
    (N''Cases:Maintain'',N''Cases:Maintain''),
    (N''Cases:Maintain'',N''area.Cases:Access''),
    (N''Cases:Maintain'',N''module.cases:Access''),
    (N''Cases:Coordinate'',N''Cases:Coordinate''),
    (N''Cases:Coordinate'',N''area.Cases:Access''),
    (N''Cases:Coordinate'',N''module.cases:Access''),
    (N''Cases:ArchiveRestore'',N''Cases:ArchiveRestore''),
    (N''Cases:ArchiveRestore'',N''area.Cases:Access''),
    (N''Cases:ArchiveRestore'',N''module.cases:Access''),
    (N''Cases:Delete'',N''Cases:Delete''),
    (N''Cases:Delete'',N''area.Cases:Access''),
    (N''Cases:Delete'',N''module.cases:Access''),
    (N''Cases:DetailsView'',N''Cases:DetailsView''),
    (N''Cases:DetailsView'',N''area.Cases:Access''),
    (N''Cases:DetailsView'',N''module.cases:Access''),
    (N''Cases:HistoryView'',N''Cases:HistoryView''),
    (N''Cases:HistoryView'',N''tab.Cases.history:Access''),
    (N''Cases:HistoryView'',N''area.Cases:Access''),
    (N''Cases:HistoryView'',N''module.cases:Access''),
    (N''Cases:AttachmentsView'',N''Cases:AttachmentsView''),
    (N''Cases:AttachmentsView'',N''tab.Cases.files:Access''),
    (N''Cases:AttachmentsView'',N''area.Cases:Access''),
    (N''Cases:AttachmentsView'',N''module.cases:Access''),
    (N''Cases:AttachmentsUpload'',N''Cases:AttachmentsUpload''),
    (N''Cases:AttachmentsUpload'',N''tab.Cases.files:Access''),
    (N''Cases:AttachmentsUpload'',N''area.Cases:Access''),
    (N''Cases:AttachmentsUpload'',N''module.cases:Access''),
    (N''Cases:AttachmentsDeleteOwn'',N''Cases:AttachmentsDeleteOwn''),
    (N''Cases:AttachmentsDeleteOwn'',N''tab.Cases.files:Access''),
    (N''Cases:AttachmentsDeleteOwn'',N''area.Cases:Access''),
    (N''Cases:AttachmentsDeleteOwn'',N''module.cases:Access''),
    (N''Cases:AttachmentsDelete'',N''Cases:AttachmentsDelete''),
    (N''Cases:AttachmentsDelete'',N''tab.Cases.files:Access''),
    (N''Cases:AttachmentsDelete'',N''area.Cases:Access''),
    (N''Cases:AttachmentsDelete'',N''module.cases:Access''),
    (N''Cases:Export'',N''Cases:Export''),
    (N''Cases:Export'',N''area.Cases:Access''),
    (N''Cases:Export'',N''module.cases:Access''),
    (N''Commitments:View'',N''Commitments:View''),
    (N''Commitments:View'',N''area.Commitments:Access''),
    (N''Commitments:View'',N''module.commitments:Access''),
    (N''Commitments:Create'',N''Commitments:Create''),
    (N''Commitments:Create'',N''area.Commitments:Access''),
    (N''Commitments:Create'',N''module.commitments:Access''),
    (N''Commitments:Maintain'',N''Commitments:Maintain''),
    (N''Commitments:Maintain'',N''area.Commitments:Access''),
    (N''Commitments:Maintain'',N''module.commitments:Access''),
    (N''Commitments:Coordinate'',N''Commitments:Coordinate''),
    (N''Commitments:Coordinate'',N''area.Commitments:Access''),
    (N''Commitments:Coordinate'',N''module.commitments:Access''),
    (N''Commitments:ArchiveRestore'',N''Commitments:ArchiveRestore''),
    (N''Commitments:ArchiveRestore'',N''area.Commitments:Access''),
    (N''Commitments:ArchiveRestore'',N''module.commitments:Access''),
    (N''Commitments:Delete'',N''Commitments:Delete''),
    (N''Commitments:Delete'',N''area.Commitments:Access''),
    (N''Commitments:Delete'',N''module.commitments:Access''),
    (N''Commitments:DetailsView'',N''Commitments:DetailsView''),
    (N''Commitments:DetailsView'',N''tab.Commitments.details:Access''),
    (N''Commitments:DetailsView'',N''area.Commitments:Access''),
    (N''Commitments:DetailsView'',N''module.commitments:Access''),
    (N''Commitments:HistoryView'',N''Commitments:HistoryView''),
    (N''Commitments:HistoryView'',N''tab.Commitments.history:Access''),
    (N''Commitments:HistoryView'',N''area.Commitments:Access''),
    (N''Commitments:HistoryView'',N''module.commitments:Access''),
    (N''Commitments:AttachmentsView'',N''Commitments:AttachmentsView''),
    (N''Commitments:AttachmentsView'',N''tab.Commitments.files:Access''),
    (N''Commitments:AttachmentsView'',N''area.Commitments:Access''),
    (N''Commitments:AttachmentsView'',N''module.commitments:Access''),
    (N''Commitments:AttachmentsUpload'',N''Commitments:AttachmentsUpload''),
    (N''Commitments:AttachmentsUpload'',N''tab.Commitments.files:Access''),
    (N''Commitments:AttachmentsUpload'',N''area.Commitments:Access''),
    (N''Commitments:AttachmentsUpload'',N''module.commitments:Access''),
    (N''Commitments:AttachmentsDeleteOwn'',N''Commitments:AttachmentsDeleteOwn''),
    (N''Commitments:AttachmentsDeleteOwn'',N''tab.Commitments.files:Access''),
    (N''Commitments:AttachmentsDeleteOwn'',N''area.Commitments:Access''),
    (N''Commitments:AttachmentsDeleteOwn'',N''module.commitments:Access''),
    (N''Commitments:AttachmentsDelete'',N''Commitments:AttachmentsDelete''),
    (N''Commitments:AttachmentsDelete'',N''tab.Commitments.files:Access''),
    (N''Commitments:AttachmentsDelete'',N''area.Commitments:Access'');
    INSERT #Map VALUES
    (N''Commitments:AttachmentsDelete'',N''module.commitments:Access''),
    (N''Commitments:Export'',N''Commitments:Export''),
    (N''Commitments:Export'',N''area.Commitments:Access''),
    (N''Commitments:Export'',N''module.commitments:Access''),
    (N''Teams:View'',N''Teams:View''),
    (N''Teams:View'',N''area.Teams:Access''),
    (N''Teams:View'',N''module.teams:Access''),
    (N''Teams:Create'',N''Teams:Create''),
    (N''Teams:Create'',N''area.Teams:Access''),
    (N''Teams:Create'',N''module.teams:Access''),
    (N''Teams:Maintain'',N''Teams:Maintain''),
    (N''Teams:Maintain'',N''area.Teams:Access''),
    (N''Teams:Maintain'',N''module.teams:Access''),
    (N''Teams:Coordinate'',N''Teams:Coordinate''),
    (N''Teams:Coordinate'',N''area.Teams:Access''),
    (N''Teams:Coordinate'',N''module.teams:Access''),
    (N''Teams:ArchiveRestore'',N''Teams:ArchiveRestore''),
    (N''Teams:ArchiveRestore'',N''area.Teams:Access''),
    (N''Teams:ArchiveRestore'',N''module.teams:Access''),
    (N''Teams:Delete'',N''Teams:Delete''),
    (N''Teams:Delete'',N''area.Teams:Access''),
    (N''Teams:Delete'',N''module.teams:Access''),
    (N''Teams:DetailsView'',N''Teams:DetailsView''),
    (N''Teams:DetailsView'',N''tab.Teams.details:Access''),
    (N''Teams:DetailsView'',N''area.Teams:Access''),
    (N''Teams:DetailsView'',N''module.teams:Access''),
    (N''Teams:HistoryView'',N''Teams:HistoryView''),
    (N''Teams:HistoryView'',N''tab.Teams.history:Access''),
    (N''Teams:HistoryView'',N''area.Teams:Access''),
    (N''Teams:HistoryView'',N''module.teams:Access''),
    (N''Teams:AttachmentsView'',N''Teams:AttachmentsView''),
    (N''Teams:AttachmentsView'',N''tab.Teams.files:Access''),
    (N''Teams:AttachmentsView'',N''area.Teams:Access''),
    (N''Teams:AttachmentsView'',N''module.teams:Access''),
    (N''Teams:AttachmentsUpload'',N''Teams:AttachmentsUpload''),
    (N''Teams:AttachmentsUpload'',N''tab.Teams.files:Access''),
    (N''Teams:AttachmentsUpload'',N''area.Teams:Access''),
    (N''Teams:AttachmentsUpload'',N''module.teams:Access''),
    (N''Teams:AttachmentsDeleteOwn'',N''Teams:AttachmentsDeleteOwn''),
    (N''Teams:AttachmentsDeleteOwn'',N''tab.Teams.files:Access''),
    (N''Teams:AttachmentsDeleteOwn'',N''area.Teams:Access''),
    (N''Teams:AttachmentsDeleteOwn'',N''module.teams:Access''),
    (N''Teams:AttachmentsDelete'',N''Teams:AttachmentsDelete''),
    (N''Teams:AttachmentsDelete'',N''tab.Teams.files:Access''),
    (N''Teams:AttachmentsDelete'',N''area.Teams:Access''),
    (N''Teams:AttachmentsDelete'',N''module.teams:Access''),
    (N''Teams:Export'',N''Teams:Export''),
    (N''Teams:Export'',N''area.Teams:Access''),
    (N''Teams:Export'',N''module.teams:Access''),
    (N''OtherOperations:View'',N''OtherOperations:View''),
    (N''OtherOperations:View'',N''area.OtherOperations:Access''),
    (N''OtherOperations:View'',N''module.escalations:Access''),
    (N''OtherOperations:Create'',N''OtherOperations:Create''),
    (N''OtherOperations:Create'',N''area.OtherOperations:Access''),
    (N''OtherOperations:Create'',N''module.escalations:Access''),
    (N''OtherOperations:Maintain'',N''OtherOperations:Maintain''),
    (N''OtherOperations:Maintain'',N''area.OtherOperations:Access''),
    (N''OtherOperations:Maintain'',N''module.escalations:Access''),
    (N''OtherOperations:Coordinate'',N''OtherOperations:Coordinate''),
    (N''OtherOperations:Coordinate'',N''area.OtherOperations:Access''),
    (N''OtherOperations:Coordinate'',N''module.escalations:Access''),
    (N''OtherOperations:ArchiveRestore'',N''OtherOperations:ArchiveRestore''),
    (N''OtherOperations:ArchiveRestore'',N''area.OtherOperations:Access''),
    (N''OtherOperations:ArchiveRestore'',N''module.escalations:Access''),
    (N''OtherOperations:Delete'',N''OtherOperations:Delete''),
    (N''OtherOperations:Delete'',N''area.OtherOperations:Access''),
    (N''OtherOperations:Delete'',N''module.escalations:Access''),
    (N''OtherOperations:DetailsView'',N''OtherOperations:DetailsView''),
    (N''OtherOperations:DetailsView'',N''tab.OtherOperations.details:Access''),
    (N''OtherOperations:DetailsView'',N''area.OtherOperations:Access''),
    (N''OtherOperations:DetailsView'',N''module.escalations:Access''),
    (N''OtherOperations:HistoryView'',N''OtherOperations:HistoryView''),
    (N''OtherOperations:HistoryView'',N''tab.OtherOperations.history:Access''),
    (N''OtherOperations:HistoryView'',N''area.OtherOperations:Access''),
    (N''OtherOperations:HistoryView'',N''module.escalations:Access''),
    (N''OtherOperations:AttachmentsView'',N''OtherOperations:AttachmentsView''),
    (N''OtherOperations:AttachmentsView'',N''tab.OtherOperations.files:Access''),
    (N''OtherOperations:AttachmentsView'',N''area.OtherOperations:Access''),
    (N''OtherOperations:AttachmentsView'',N''module.escalations:Access''),
    (N''OtherOperations:AttachmentsUpload'',N''OtherOperations:AttachmentsUpload''),
    (N''OtherOperations:AttachmentsUpload'',N''tab.OtherOperations.files:Access''),
    (N''OtherOperations:AttachmentsUpload'',N''area.OtherOperations:Access''),
    (N''OtherOperations:AttachmentsUpload'',N''module.escalations:Access''),
    (N''OtherOperations:AttachmentsDeleteOwn'',N''OtherOperations:AttachmentsDeleteOwn''),
    (N''OtherOperations:AttachmentsDeleteOwn'',N''tab.OtherOperations.files:Access''),
    (N''OtherOperations:AttachmentsDeleteOwn'',N''area.OtherOperations:Access''),
    (N''OtherOperations:AttachmentsDeleteOwn'',N''module.escalations:Access''),
    (N''OtherOperations:AttachmentsDelete'',N''OtherOperations:AttachmentsDelete''),
    (N''OtherOperations:AttachmentsDelete'',N''tab.OtherOperations.files:Access''),
    (N''OtherOperations:AttachmentsDelete'',N''area.OtherOperations:Access''),
    (N''OtherOperations:AttachmentsDelete'',N''module.escalations:Access''),
    (N''OtherOperations:Export'',N''OtherOperations:Export''),
    (N''OtherOperations:Export'',N''area.OtherOperations:Access''),
    (N''OtherOperations:Export'',N''module.escalations:Access''),
    (N''Dashboard:View'',N''Dashboard:View''),
    (N''Dashboard:View'',N''area.Dashboard:Access''),
    (N''Dashboard:View'',N''module.dashboard:Access''),
    (N''Notifications:View'',N''Notifications:View''),
    (N''Notifications:View'',N''area.Notifications:Access''),
    (N''Notifications:View'',N''module.dashboard:Access''),
    (N''Notifications:Maintain'',N''Notifications:Maintain''),
    (N''Notifications:Maintain'',N''area.Notifications:Access''),
    (N''Notifications:Maintain'',N''module.dashboard:Access''),
    (N''Notifications:Delete'',N''Notifications:Delete''),
    (N''Notifications:Delete'',N''area.Notifications:Access''),
    (N''Notifications:Delete'',N''module.dashboard:Access''),
    (N''Reporting:View'',N''Reporting:View''),
    (N''Reporting:View'',N''area.Reporting:Access''),
    (N''Reporting:View'',N''module.reporting:Access''),
    (N''PersonalNotes:View'',N''PersonalNotes:View''),
    (N''PersonalNotes:View'',N''area.PersonalNotes:Access''),
    (N''PersonalNotes:View'',N''module.notes:Access''),
    (N''PersonalNotes:Create'',N''PersonalNotes:Create''),
    (N''PersonalNotes:Create'',N''area.PersonalNotes:Access''),
    (N''PersonalNotes:Create'',N''module.notes:Access''),
    (N''PersonalNotes:Maintain'',N''PersonalNotes:Maintain''),
    (N''PersonalNotes:Maintain'',N''area.PersonalNotes:Access''),
    (N''PersonalNotes:Maintain'',N''module.notes:Access''),
    (N''PersonalNotes:Delete'',N''PersonalNotes:Delete''),
    (N''PersonalNotes:Delete'',N''area.PersonalNotes:Access''),
    (N''PersonalNotes:Delete'',N''module.notes:Access''),
    (N''PersonalNotes:Download'',N''PersonalNotes:Download''),
    (N''PersonalNotes:Download'',N''area.PersonalNotes:Access''),
    (N''PersonalNotes:Download'',N''module.notes:Access''),
    (N''tab.ClientStructure.structure:View'',N''tab.ClientStructure.structure:View''),
    (N''tab.ClientStructure.structure:View'',N''tab.ClientStructure.structure:Access''),
    (N''tab.ClientStructure.structure:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.structure:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.organizations:View'',N''tab.ClientStructure.organizations:View''),
    (N''tab.ClientStructure.organizations:View'',N''tab.ClientStructure.organizations:Access''),
    (N''tab.ClientStructure.organizations:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.organizations:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.contracts:View'',N''tab.ClientStructure.contracts:View''),
    (N''tab.ClientStructure.contracts:View'',N''tab.ClientStructure.contracts:Access''),
    (N''tab.ClientStructure.contracts:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.contracts:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.cases:View'',N''tab.ClientStructure.cases:View''),
    (N''tab.ClientStructure.cases:View'',N''tab.ClientStructure.cases:Access''),
    (N''tab.ClientStructure.cases:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.cases:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.commitments:View'',N''tab.ClientStructure.commitments:View''),
    (N''tab.ClientStructure.commitments:View'',N''tab.ClientStructure.commitments:Access''),
    (N''tab.ClientStructure.commitments:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.commitments:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.escalations:View'',N''tab.ClientStructure.escalations:View''),
    (N''tab.ClientStructure.escalations:View'',N''tab.ClientStructure.escalations:Access''),
    (N''tab.ClientStructure.escalations:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.escalations:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.infra:View'',N''tab.ClientStructure.infra:View''),
    (N''tab.ClientStructure.infra:View'',N''tab.ClientStructure.infra:Access''),
    (N''tab.ClientStructure.infra:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.infra:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.projects:View'',N''tab.ClientStructure.projects:View''),
    (N''tab.ClientStructure.projects:View'',N''tab.ClientStructure.projects:Access''),
    (N''tab.ClientStructure.projects:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.projects:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.jira:View'',N''tab.ClientStructure.jira:View''),
    (N''tab.ClientStructure.jira:View'',N''tab.ClientStructure.jira:Access''),
    (N''tab.ClientStructure.jira:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.jira:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.contacts:View'',N''tab.ClientStructure.contacts:View''),
    (N''tab.ClientStructure.contacts:View'',N''tab.ClientStructure.contacts:Access''),
    (N''tab.ClientStructure.contacts:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.contacts:View'',N''module.clients:Access''),
    (N''tab.ClientStructure.notes:View'',N''tab.ClientStructure.notes:View''),
    (N''tab.ClientStructure.notes:View'',N''tab.ClientStructure.notes:Access''),
    (N''tab.ClientStructure.notes:View'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.notes:View'',N''module.clients:Access''),
    (N''tab.Environments.apps:View'',N''tab.Environments.apps:View''),
    (N''tab.Environments.apps:View'',N''tab.Environments.apps:Access''),
    (N''tab.Environments.apps:View'',N''area.Environments:Access''),
    (N''tab.Environments.apps:View'',N''module.clients:Access''),
    (N''tab.Environments.assets:View'',N''tab.Environments.assets:View''),
    (N''tab.Environments.assets:View'',N''tab.Environments.assets:Access''),
    (N''tab.Environments.assets:View'',N''area.Environments:Access''),
    (N''tab.Environments.assets:View'',N''module.clients:Access''),
    (N''tab.Environments.work:View'',N''tab.Environments.work:View''),
    (N''tab.Environments.work:View'',N''tab.Environments.work:Access''),
    (N''tab.Environments.work:View'',N''area.Environments:Access''),
    (N''tab.Environments.work:View'',N''module.clients:Access''),
    (N''tab.Environments.network:View'',N''tab.Environments.network:View''),
    (N''tab.Environments.network:View'',N''tab.Environments.network:Access''),
    (N''tab.Environments.network:View'',N''area.Environments:Access''),
    (N''tab.Environments.network:View'',N''module.clients:Access''),
    (N''tab.Environments.conditions:View'',N''tab.Environments.conditions:View''),
    (N''tab.Environments.conditions:View'',N''tab.Environments.conditions:Access''),
    (N''tab.Environments.conditions:View'',N''area.Environments:Access''),
    (N''tab.Environments.conditions:View'',N''module.clients:Access''),
    (N''tab.Environments.quality:View'',N''tab.Environments.quality:View''),
    (N''tab.Environments.quality:View'',N''tab.Environments.quality:Access''),
    (N''tab.Environments.quality:View'',N''area.Environments:Access''),
    (N''tab.Environments.quality:View'',N''module.clients:Access''),
    (N''tab.Cases.timeline:View'',N''tab.Cases.timeline:View''),
    (N''tab.Cases.timeline:View'',N''tab.Cases.timeline:Access''),
    (N''tab.Cases.timeline:View'',N''area.Cases:Access''),
    (N''tab.Cases.timeline:View'',N''module.cases:Access''),
    (N''tab.Cases.affected:View'',N''tab.Cases.affected:View''),
    (N''tab.Cases.affected:View'',N''tab.Cases.affected:Access''),
    (N''tab.Cases.affected:View'',N''area.Cases:Access''),
    (N''tab.Cases.affected:View'',N''module.cases:Access''),
    (N''tab.Cases.jira:View'',N''tab.Cases.jira:View''),
    (N''tab.Cases.jira:View'',N''tab.Cases.jira:Access''),
    (N''tab.Cases.jira:View'',N''area.Cases:Access''),
    (N''tab.Cases.jira:View'',N''module.cases:Access''),
    (N''tab.Cases.impact:View'',N''tab.Cases.impact:View''),
    (N''tab.Cases.impact:View'',N''tab.Cases.impact:Access''),
    (N''tab.Cases.impact:View'',N''area.Cases:Access''),
    (N''tab.Cases.impact:View'',N''module.cases:Access''),
    (N''tab.Cases.commitments:View'',N''tab.Cases.commitments:View''),
    (N''tab.Cases.commitments:View'',N''tab.Cases.commitments:Access''),
    (N''tab.Cases.commitments:View'',N''area.Cases:Access''),
    (N''tab.Cases.commitments:View'',N''module.cases:Access''),
    (N''tab.Cases.escalations:View'',N''tab.Cases.escalations:View''),
    (N''tab.Cases.escalations:View'',N''tab.Cases.escalations:Access''),
    (N''tab.Cases.escalations:View'',N''area.Cases:Access''),
    (N''tab.Cases.escalations:View'',N''module.cases:Access''),
    (N''tab.ClientStructure.structure:Create'',N''tab.ClientStructure.structure:Create''),
    (N''tab.ClientStructure.structure:Create'',N''tab.ClientStructure.structure:Access''),
    (N''tab.ClientStructure.structure:Create'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.structure:Create'',N''module.clients:Access''),
    (N''tab.ClientStructure.structure:Maintain'',N''tab.ClientStructure.structure:Maintain''),
    (N''tab.ClientStructure.structure:Maintain'',N''tab.ClientStructure.structure:Access''),
    (N''tab.ClientStructure.structure:Maintain'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.structure:Maintain'',N''module.clients:Access''),
    (N''tab.ClientStructure.structure:ArchiveRestore'',N''tab.ClientStructure.structure:ArchiveRestore''),
    (N''tab.ClientStructure.structure:ArchiveRestore'',N''tab.ClientStructure.structure:Access''),
    (N''tab.ClientStructure.structure:ArchiveRestore'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.structure:ArchiveRestore'',N''module.clients:Access''),
    (N''tab.ClientStructure.structure:Delete'',N''tab.ClientStructure.structure:Delete''),
    (N''tab.ClientStructure.structure:Delete'',N''tab.ClientStructure.structure:Access''),
    (N''tab.ClientStructure.structure:Delete'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.structure:Delete'',N''module.clients:Access''),
    (N''tab.ClientStructure.organizations:Create'',N''tab.ClientStructure.organizations:Create''),
    (N''tab.ClientStructure.organizations:Create'',N''tab.ClientStructure.organizations:Access''),
    (N''tab.ClientStructure.organizations:Create'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.organizations:Create'',N''module.clients:Access''),
    (N''tab.ClientStructure.organizations:Maintain'',N''tab.ClientStructure.organizations:Maintain''),
    (N''tab.ClientStructure.organizations:Maintain'',N''tab.ClientStructure.organizations:Access''),
    (N''tab.ClientStructure.organizations:Maintain'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.organizations:Maintain'',N''module.clients:Access''),
    (N''tab.ClientStructure.organizations:Delete'',N''tab.ClientStructure.organizations:Delete''),
    (N''tab.ClientStructure.organizations:Delete'',N''tab.ClientStructure.organizations:Access''),
    (N''tab.ClientStructure.organizations:Delete'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.organizations:Delete'',N''module.clients:Access''),
    (N''tab.ClientStructure.contacts:Create'',N''tab.ClientStructure.contacts:Create''),
    (N''tab.ClientStructure.contacts:Create'',N''tab.ClientStructure.contacts:Access''),
    (N''tab.ClientStructure.contacts:Create'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.contacts:Create'',N''module.clients:Access''),
    (N''tab.ClientStructure.contacts:Maintain'',N''tab.ClientStructure.contacts:Maintain''),
    (N''tab.ClientStructure.contacts:Maintain'',N''tab.ClientStructure.contacts:Access''),
    (N''tab.ClientStructure.contacts:Maintain'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.contacts:Maintain'',N''module.clients:Access''),
    (N''tab.ClientStructure.contacts:ArchiveRestore'',N''tab.ClientStructure.contacts:ArchiveRestore''),
    (N''tab.ClientStructure.contacts:ArchiveRestore'',N''tab.ClientStructure.contacts:Access''),
    (N''tab.ClientStructure.contacts:ArchiveRestore'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.contacts:ArchiveRestore'',N''module.clients:Access''),
    (N''tab.ClientStructure.contacts:Delete'',N''tab.ClientStructure.contacts:Delete''),
    (N''tab.ClientStructure.contacts:Delete'',N''tab.ClientStructure.contacts:Access''),
    (N''tab.ClientStructure.contacts:Delete'',N''area.ClientStructure:Access''),
    (N''tab.ClientStructure.contacts:Delete'',N''module.clients:Access''),
    (N''tab.Cases.jira:Create'',N''tab.Cases.jira:Create''),
    (N''tab.Cases.jira:Create'',N''tab.Cases.jira:Access''),
    (N''tab.Cases.jira:Create'',N''area.Cases:Access''),
    (N''tab.Cases.jira:Create'',N''module.cases:Access''),
    (N''tab.Cases.jira:Delete'',N''tab.Cases.jira:Delete''),
    (N''tab.Cases.jira:Delete'',N''tab.Cases.jira:Access''),
    (N''tab.Cases.jira:Delete'',N''area.Cases:Access''),
    (N''tab.Cases.jira:Delete'',N''module.cases:Access''),
    (N''tab.Environments.conditions:Create'',N''tab.Environments.conditions:Create''),
    (N''tab.Environments.conditions:Create'',N''tab.Environments.conditions:Access''),
    (N''tab.Environments.conditions:Create'',N''area.Environments:Access''),
    (N''tab.Environments.conditions:Create'',N''module.clients:Access''),
    (N''ClientMap:View'',N''ClientMap:View''),
    (N''ClientMap:View'',N''area.ClientMap:Access''),
    (N''ClientMap:View'',N''module.dashboard:Access''),
    (N''ActionList:View'',N''ActionList:View''),
    (N''ActionList:View'',N''area.ActionList:Access''),
    (N''ActionList:View'',N''module.dashboard:Access''),
    (N''DataQuality:View'',N''DataQuality:View''),
    (N''DataQuality:View'',N''area.DataQuality:Access''),
    (N''DataQuality:View'',N''module.dashboard:Access''),
    (N''DataQuality:Maintain'',N''DataQuality:Maintain''),
    (N''DataQuality:Maintain'',N''area.DataQuality:Access''),
    (N''DataQuality:Maintain'',N''module.dashboard:Access''),
    (N''Handovers:View'',N''Handovers:View''),
    (N''Handovers:View'',N''area.Handovers:Access''),
    (N''Handovers:View'',N''module.teams:Access''),
    (N''Handovers:Create'',N''Handovers:Create''),
    (N''Handovers:Create'',N''area.Handovers:Access''),
    (N''Handovers:Create'',N''module.teams:Access''),
    (N''Handovers:Maintain'',N''Handovers:Maintain''),
    (N''Handovers:Maintain'',N''area.Handovers:Access''),
    (N''Handovers:Maintain'',N''module.teams:Access''),
    (N''Reassignment:View'',N''Reassignment:View''),
    (N''Reassignment:View'',N''area.Reassignment:Access''),
    (N''Reassignment:View'',N''module.teams:Access''),
    (N''ReportOverview:View'',N''ReportOverview:View''),
    (N''ReportOverview:View'',N''area.ReportOverview:Access''),
    (N''ReportOverview:View'',N''module.reporting:Access''),
    (N''ReportLibrary:View'',N''ReportLibrary:View''),
    (N''ReportLibrary:View'',N''area.ReportLibrary:Access''),
    (N''ReportLibrary:View'',N''module.reporting:Access''),
    (N''ReportLibrary:Create'',N''ReportLibrary:Create''),
    (N''ReportLibrary:Create'',N''area.ReportLibrary:Access''),
    (N''ReportLibrary:Create'',N''module.reporting:Access''),
    (N''ReportLibrary:Delete'',N''ReportLibrary:Delete''),
    (N''ReportLibrary:Delete'',N''area.ReportLibrary:Access''),
    (N''ReportLibrary:Delete'',N''module.reporting:Access''),
    (N''ReportLibrary:Export'',N''ReportLibrary:Export''),
    (N''ReportLibrary:Export'',N''area.ReportLibrary:Access''),
    (N''ReportLibrary:Export'',N''module.reporting:Access''),
    (N''ReportBuilder:View'',N''ReportBuilder:View''),
    (N''ReportBuilder:View'',N''area.ReportBuilder:Access''),
    (N''ReportBuilder:View'',N''module.reporting:Access''),
    (N''ReportBuilder:Export'',N''ReportBuilder:Export''),
    (N''ReportBuilder:Export'',N''area.ReportBuilder:Access''),
    (N''ReportBuilder:Export'',N''module.reporting:Access''),
    (N''SavedReports:View'',N''SavedReports:View''),
    (N''SavedReports:View'',N''area.SavedReports:Access''),
    (N''SavedReports:View'',N''module.reporting:Access''),
    (N''SavedReports:Create'',N''SavedReports:Create''),
    (N''SavedReports:Create'',N''area.SavedReports:Access''),
    (N''SavedReports:Create'',N''module.reporting:Access''),
    (N''SavedReports:Maintain'',N''SavedReports:Maintain''),
    (N''SavedReports:Maintain'',N''area.SavedReports:Access''),
    (N''SavedReports:Maintain'',N''module.reporting:Access''),
    (N''SavedReports:Delete'',N''SavedReports:Delete''),
    (N''SavedReports:Delete'',N''area.SavedReports:Access''),
    (N''SavedReports:Delete'',N''module.reporting:Access''),
    (N''ReportSchedules:View'',N''ReportSchedules:View''),
    (N''ReportSchedules:View'',N''area.ReportSchedules:Access''),
    (N''ReportSchedules:View'',N''module.reporting:Access''),
    (N''ReportSchedules:Create'',N''ReportSchedules:Create''),
    (N''ReportSchedules:Create'',N''area.ReportSchedules:Access''),
    (N''ReportSchedules:Create'',N''module.reporting:Access''),
    (N''ReportSchedules:Maintain'',N''ReportSchedules:Maintain''),
    (N''ReportSchedules:Maintain'',N''area.ReportSchedules:Access''),
    (N''ReportSchedules:Maintain'',N''module.reporting:Access''),
    (N''ReportSchedules:Delete'',N''ReportSchedules:Delete''),
    (N''ReportSchedules:Delete'',N''area.ReportSchedules:Access''),
    (N''ReportSchedules:Delete'',N''module.reporting:Access''),
    (N''ReportHistory:View'',N''ReportHistory:View''),
    (N''ReportHistory:View'',N''area.ReportHistory:Access''),
    (N''ReportHistory:View'',N''module.reporting:Access''),
    (N''ReportHistory:Create'',N''ReportHistory:Create''),
    (N''ReportHistory:Create'',N''area.ReportHistory:Access''),
    (N''ReportHistory:Create'',N''module.reporting:Access''),
    (N''ReportHistory:Maintain'',N''ReportHistory:Maintain''),
    (N''ReportHistory:Maintain'',N''area.ReportHistory:Access''),
    (N''ReportHistory:Maintain'',N''module.reporting:Access''),
    (N''ReportHistory:Download'',N''ReportHistory:Download''),
    (N''ReportHistory:Download'',N''area.ReportHistory:Access''),
    (N''ReportHistory:Download'',N''module.reporting:Access''),
    (N''ReportTemplates:View'',N''ReportTemplates:View''),
    (N''ReportTemplates:View'',N''area.ReportTemplates:Access''),
    (N''ReportTemplates:View'',N''module.reporting:Access''),
    (N''AdminUsers:View'',N''AdminUsers:View''),
    (N''AdminUsers:View'',N''area.AdminUsers:Access''),
    (N''AdminUsers:View'',N''module.admin:Access''),
    (N''AdminUsers:Create'',N''AdminUsers:Create''),
    (N''AdminUsers:Create'',N''area.AdminUsers:Access''),
    (N''AdminUsers:Create'',N''module.admin:Access''),
    (N''AdminUsers:Maintain'',N''AdminUsers:Maintain''),
    (N''AdminUsers:Maintain'',N''area.AdminUsers:Access''),
    (N''AdminUsers:Maintain'',N''module.admin:Access''),
    (N''AdminUsers:Delete'',N''AdminUsers:Delete''),
    (N''AdminUsers:Delete'',N''area.AdminUsers:Access''),
    (N''AdminUsers:Delete'',N''module.admin:Access''),
    (N''AdminRoles:View'',N''AdminRoles:View''),
    (N''AdminRoles:View'',N''area.AdminRoles:Access''),
    (N''AdminRoles:View'',N''module.admin:Access''),
    (N''AdminRoles:Create'',N''AdminRoles:Create''),
    (N''AdminRoles:Create'',N''area.AdminRoles:Access''),
    (N''AdminRoles:Create'',N''module.admin:Access''),
    (N''AdminRoles:Maintain'',N''AdminRoles:Maintain''),
    (N''AdminRoles:Maintain'',N''area.AdminRoles:Access''),
    (N''AdminRoles:Maintain'',N''module.admin:Access''),
    (N''AdminRoles:Delete'',N''AdminRoles:Delete''),
    (N''AdminRoles:Delete'',N''area.AdminRoles:Access''),
    (N''AdminRoles:Delete'',N''module.admin:Access''),
    (N''AdminGroups:View'',N''AdminGroups:View''),
    (N''AdminGroups:View'',N''area.AdminGroups:Access''),
    (N''AdminGroups:View'',N''module.admin:Access''),
    (N''AdminGroups:Create'',N''AdminGroups:Create''),
    (N''AdminGroups:Create'',N''area.AdminGroups:Access''),
    (N''AdminGroups:Create'',N''module.admin:Access''),
    (N''AdminGroups:Maintain'',N''AdminGroups:Maintain''),
    (N''AdminGroups:Maintain'',N''area.AdminGroups:Access''),
    (N''AdminGroups:Maintain'',N''module.admin:Access''),
    (N''AdminConfig:View'',N''AdminConfig:View''),
    (N''AdminConfig:View'',N''area.AdminConfig:Access''),
    (N''AdminConfig:View'',N''module.admin:Access''),
    (N''AdminConfig:Create'',N''AdminConfig:Create''),
    (N''AdminConfig:Create'',N''area.AdminConfig:Access''),
    (N''AdminConfig:Create'',N''module.admin:Access''),
    (N''AdminConfig:Maintain'',N''AdminConfig:Maintain''),
    (N''AdminConfig:Maintain'',N''area.AdminConfig:Access''),
    (N''AdminConfig:Maintain'',N''module.admin:Access''),
    (N''AdminConfig:Delete'',N''AdminConfig:Delete''),
    (N''AdminConfig:Delete'',N''area.AdminConfig:Access'');
    INSERT #Map VALUES
    (N''AdminConfig:Delete'',N''module.admin:Access''),
    (N''AdminSettings:View'',N''AdminSettings:View''),
    (N''AdminSettings:View'',N''area.AdminSettings:Access''),
    (N''AdminSettings:View'',N''module.admin:Access''),
    (N''AdminSettings:Maintain'',N''AdminSettings:Maintain''),
    (N''AdminSettings:Maintain'',N''area.AdminSettings:Access''),
    (N''AdminSettings:Maintain'',N''module.admin:Access''),
    (N''AdminAudit:View'',N''AdminAudit:View''),
    (N''AdminAudit:View'',N''area.AdminAudit:Access''),
    (N''AdminAudit:View'',N''module.admin:Access''),
    (N''AdminIntegrations:View'',N''AdminIntegrations:View''),
    (N''AdminIntegrations:View'',N''area.AdminIntegrations:Access''),
    (N''AdminIntegrations:View'',N''module.admin:Access''),
    (N''AdminIntegrations:Create'',N''AdminIntegrations:Create''),
    (N''AdminIntegrations:Create'',N''area.AdminIntegrations:Access''),
    (N''AdminIntegrations:Create'',N''module.admin:Access''),
    (N''AdminIntegrations:Maintain'',N''AdminIntegrations:Maintain''),
    (N''AdminIntegrations:Maintain'',N''area.AdminIntegrations:Access''),
    (N''AdminIntegrations:Maintain'',N''module.admin:Access'');

    -- What each role stored. The protected role holds everything, whatever is stored. Keys retired from the old registry grant nothing.
    CREATE TABLE #RoleOld (RoleId bigint NOT NULL, OldKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (RoleId, OldKey));
    INSERT #RoleOld SELECT DISTINCT AppRoleId, [Resource] + N'':'' + [Action] FROM [iam].[AppRolePermission];
    INSERT #RoleOld SELECT r.Id, m.OldKey FROM [iam].[AppRole] r CROSS JOIN (SELECT DISTINCT OldKey FROM #Map) m
        WHERE r.[Key] = N''Manager'' AND NOT EXISTS (SELECT 1 FROM #RoleOld o WHERE o.RoleId = r.Id AND o.OldKey = m.OldKey);
    DELETE o FROM #RoleOld o JOIN [iam].[PermissionDefinition] d ON d.[Key] = o.OldKey WHERE d.IsActive = 0;

    -- The active roles of each person, direct and through the directory groups last observed at sign-in. Forms and unreadable snapshots add none.
    CREATE TABLE #UserRole (UserId bigint NOT NULL, RoleId bigint NOT NULL, PRIMARY KEY (UserId, RoleId));
    INSERT #UserRole SELECT ur.UserId, ur.AppRoleId FROM [iam].[UserRole] ur JOIN [iam].[AppRole] r ON r.Id = ur.AppRoleId AND r.IsActive = 1;
    INSERT #UserRole
    SELECT DISTINCT u.Id, r.Id
    FROM [iam].[User] u
    CROSS APPLY (SELECT CASE WHEN ISJSON(SUBSTRING(u.MappedGroups, NULLIF(CHARINDEX(N''['', u.MappedGroups), 0), 4000)) = 1
        THEN SUBSTRING(u.MappedGroups, NULLIF(CHARINDEX(N''['', u.MappedGroups), 0), 4000) ELSE N''[]'' END AS Groups) j
    CROSS APPLY OPENJSON(j.Groups) g
    JOIN [iam].[GroupMapping] m ON m.GroupName = g.[value] COLLATE DATABASE_DEFAULT
    JOIN [iam].[AppRole] r ON r.[Key] = m.[Role] AND r.IsActive = 1
    WHERE NOT EXISTS (SELECT 1 FROM #UserRole x WHERE x.UserId = u.Id AND x.RoleId = r.Id);

    -- Accounts holding Administration ignore direct allows (unchanged rule).
    CREATE TABLE #Admin (UserId bigint NOT NULL PRIMARY KEY);
    INSERT #Admin SELECT DISTINCT ur.UserId FROM #UserRole ur JOIN [iam].[AppRole] r ON r.Id = ur.RoleId WHERE r.[Key] = N''Manager'' OR (r.Rights & 128) = 128;

    CREATE TABLE #Allow (UserId bigint NOT NULL, OldKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, ExpiresAt datetimeoffset NULL, PRIMARY KEY (UserId, OldKey));
    INSERT #Allow SELECT o.UserId, o.PermissionKey, o.ExpiresAt FROM [iam].[UserPermissionOverride] o
        WHERE o.Effect = N''Allow'' AND o.ClientId IS NULL AND o.ProjectId IS NULL AND o.TeamId IS NULL AND (o.ExpiresAt IS NULL OR o.ExpiresAt > @now)
          AND NOT EXISTS (SELECT 1 FROM #Admin a WHERE a.UserId = o.UserId);
    CREATE TABLE #Deny (UserId bigint NOT NULL, OldKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, ExpiresAt datetimeoffset NULL, PRIMARY KEY (UserId, OldKey));
    INSERT #Deny SELECT o.UserId, o.PermissionKey, o.ExpiresAt FROM [iam].[UserPermissionOverride] o
        WHERE o.Effect <> N''Allow'' AND o.ClientId IS NULL AND o.ProjectId IS NULL AND o.TeamId IS NULL AND (o.ExpiresAt IS NULL OR o.ExpiresAt > @now);

    -- Everything a person held under the old rules, after exceptions and before prerequisites.
    CREATE TABLE #RoleUnion (UserId bigint NOT NULL, OldKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (UserId, OldKey));
    INSERT #RoleUnion SELECT DISTINCT ur.UserId, o.OldKey FROM #UserRole ur JOIN #RoleOld o ON o.RoleId = ur.RoleId;
    CREATE TABLE #UserOld (UserId bigint NOT NULL, OldKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (UserId, OldKey));
    INSERT #UserOld SELECT UserId, OldKey FROM #RoleUnion UNION SELECT UserId, OldKey FROM #Allow;
    DELETE o FROM #UserOld o JOIN #Deny d ON d.UserId = o.UserId AND d.OldKey = o.OldKey;

    -- Rights a person could use under the old rules: the action and every container above it are present.
    CREATE TABLE #Candidate (UserId bigint NOT NULL, NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (UserId, NewKey));
    INSERT #Candidate SELECT o.UserId, m.NewKey FROM #UserOld o JOIN #Map m ON m.OldKey = o.OldKey GROUP BY o.UserId, m.NewKey
        HAVING COUNT(*) = (SELECT COUNT(*) FROM #Map x WHERE x.NewKey = m.NewKey);

    -- Rule 1: the role itself held the action and its containers.
    CREATE TABLE #RoleNew (RoleId bigint NOT NULL, NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, [Rule] int NOT NULL, PRIMARY KEY (RoleId, NewKey));
    INSERT #RoleNew SELECT o.RoleId, m.NewKey, 1 FROM #RoleOld o JOIN #Map m ON m.OldKey = o.OldKey GROUP BY o.RoleId, m.NewKey
        HAVING COUNT(*) = (SELECT COUNT(*) FROM #Map x WHERE x.NewKey = m.NewKey);
    -- Rule 2: the role held the action, has holders, and every holder could use it because another role supplied the containers.
    INSERT #RoleNew
    SELECT o.RoleId, o.OldKey, 2
    FROM #RoleOld o JOIN [iam].[AppRole] r ON r.Id = o.RoleId AND r.IsActive = 1
    WHERE EXISTS (SELECT 1 FROM #Map m WHERE m.NewKey = o.OldKey)
      AND NOT EXISTS (SELECT 1 FROM #RoleNew n WHERE n.RoleId = o.RoleId AND n.NewKey = o.OldKey)
      AND EXISTS (SELECT 1 FROM [iam].[UserRole] ur WHERE ur.AppRoleId = o.RoleId)
      AND NOT EXISTS (SELECT 1 FROM [iam].[UserRole] ur WHERE ur.AppRoleId = o.RoleId
          AND NOT EXISTS (SELECT 1 FROM #Candidate c WHERE c.UserId = ur.UserId AND c.NewKey = o.OldKey));
    -- The old role flags are now ordinary rights.
    INSERT #RoleNew SELECT r.Id, f.NewKey, 1 FROM [iam].[AppRole] r
        CROSS JOIN (VALUES (N''Platform:Administration'', 128), (N''Platform:Export'', 16), (N''Platform:TechnicalDetail'', 32), (N''Platform:Audit'', 64)) f(NewKey, Flag)
        WHERE r.[Key] = N''Manager'' OR (r.Rights & f.Flag) = f.Flag;

    -- Rule 3: anyone who could use a right and no longer gets it from a role keeps it as a direct allow. A carried allow keeps the earliest expiry that supported it.
    CREATE TABLE #UserNew (UserId bigint NOT NULL, NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (UserId, NewKey));
    INSERT #UserNew SELECT DISTINCT ur.UserId, n.NewKey FROM #UserRole ur JOIN #RoleNew n ON n.RoleId = ur.RoleId;
    CREATE TABLE #NewAllow (UserId bigint NOT NULL, NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, ExpiresAt datetimeoffset NULL, PRIMARY KEY (UserId, NewKey));
    INSERT #NewAllow
    SELECT c.UserId, c.NewKey,
        (SELECT MIN(a.ExpiresAt) FROM #Allow a JOIN #Map m ON m.OldKey = a.OldKey AND m.NewKey = c.NewKey
         WHERE a.UserId = c.UserId AND (a.OldKey = c.NewKey OR NOT EXISTS (SELECT 1 FROM #RoleUnion u WHERE u.UserId = c.UserId AND u.OldKey = a.OldKey)))
    FROM #Candidate c
    WHERE c.NewKey NOT LIKE N''Admin%'' AND NOT EXISTS (SELECT 1 FROM #Admin a WHERE a.UserId = c.UserId)
      AND (NOT EXISTS (SELECT 1 FROM #UserNew n WHERE n.UserId = c.UserId AND n.NewKey = c.NewKey)
           OR EXISTS (SELECT 1 FROM #Allow a WHERE a.UserId = c.UserId AND a.OldKey = c.NewKey));
    -- Administrators ignore direct allows, so rule 3 cannot protect them. These are listed for an owner decision.
    CREATE TABLE #AdminLoss (UserId bigint NOT NULL, NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, PRIMARY KEY (UserId, NewKey));
    INSERT #AdminLoss SELECT c.UserId, c.NewKey FROM #Candidate c JOIN #Admin a ON a.UserId = c.UserId
        WHERE NOT EXISTS (SELECT 1 FROM #UserNew n WHERE n.UserId = c.UserId AND n.NewKey = c.NewKey);
    -- A deny on an action or on any container above it denies the right. Longest expiry wins; a permanent deny stays permanent.
    CREATE TABLE #NewDeny (UserId bigint NOT NULL, NewKey nvarchar(120) COLLATE DATABASE_DEFAULT NOT NULL, ExpiresAt datetimeoffset NULL, PRIMARY KEY (UserId, NewKey));
    INSERT #NewDeny SELECT d.UserId, m.NewKey, CASE WHEN COUNT(*) > COUNT(d.ExpiresAt) THEN NULL ELSE MAX(d.ExpiresAt) END
        FROM #Deny d JOIN #Map m ON m.OldKey = d.OldKey GROUP BY d.UserId, m.NewKey;

    INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt]) VALUES
    (N''Platform:Administration'',N''Administration'',N''Enter administration. Each administration feature also needs its own right. Holders cannot receive individual exceptions as allows.'',N''Administration'',N''Platform'',N''Action'',N''High'',0,1,@now,@now),
    (N''Platform:Export'',N''Export files'',N''Allow exporting at all. Each source also needs its own Export right.'',N''Administration'',N''Platform'',N''Action'',N''High'',1,1,@now,@now),
    (N''Platform:TechnicalDetail'',N''Technical detail'',N''See and edit network zones and firewall rules.'',N''Administration'',N''Platform'',N''Action'',N''High'',2,1,@now,@now),
    (N''Platform:Audit'',N''Change history'',N''Read who changed what and when. Each source also needs its own history right.'',N''Administration'',N''Platform'',N''Action'',N''High'',3,1,@now,@now),
    (N''ClientStructure:Access'',N''Open the clients page'',N''Open the client list and the client page shell. Each tab and action needs its own right.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',4,1,@now,@now),
    (N''ClientStructure:View'',N''View pages and records'',N''Open client structure pages and read their records. Required before any action in this module.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',5,1,@now,@now),
    (N''ClientStructure:Create'',N''Create'',N''Create clients, sub-clients and regions.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',6,1,@now,@now),
    (N''ClientStructure:Maintain'',N''Edit existing records'',N''Edit existing clients and regions.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',7,1,@now,@now),
    (N''ClientStructure:Coordinate'',N''Coordinate workflow and assignment'',N''Manage client structure and assign client and region owners.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',8,1,@now,@now),
    (N''ClientStructure:ArchiveRestore'',N''Archive and restore'',N''Archive and restore client structure.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',9,1,@now,@now),
    (N''ClientStructure:Delete'',N''Permanently delete unused records'',N''Permanently delete unused client structure records.'',N''Clients'',N''ClientStructure'',N''Action'',N''High'',10,1,@now,@now),
    (N''ClientStructure:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',11,1,@now,@now),
    (N''ClientStructure:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',12,1,@now,@now),
    (N''ClientStructure:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',13,1,@now,@now),
    (N''ClientStructure:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',14,1,@now,@now),
    (N''ClientStructure:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',15,1,@now,@now),
    (N''ClientStructure:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Clients'',N''ClientStructure'',N''Action'',N''High'',16,1,@now,@now),
    (N''ClientStructure:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Clients'',N''ClientStructure'',N''Action'',N''High'',17,1,@now,@now),
    (N''Projects:View'',N''View pages and records'',N''Open projects pages and read their records. Required before any action in this module.'',N''Clients'',N''Projects'',N''Access'',N''Normal'',18,1,@now,@now),
    (N''Projects:Create'',N''Create'',N''Create projects independently of client structure rights.'',N''Clients'',N''Projects'',N''Action'',N''Normal'',19,1,@now,@now),
    (N''Projects:Maintain'',N''Edit existing records'',N''Edit existing projects independently of client structure rights.'',N''Clients'',N''Projects'',N''Action'',N''Normal'',20,1,@now,@now),
    (N''Projects:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate projects workflow.'',N''Clients'',N''Projects'',N''Action'',N''Normal'',21,1,@now,@now),
    (N''Projects:ArchiveRestore'',N''Archive and restore'',N''Archive and restore projects.'',N''Clients'',N''Projects'',N''Action'',N''Normal'',22,1,@now,@now),
    (N''Projects:Delete'',N''Permanently delete unused records'',N''Permanently delete unused projects records.'',N''Clients'',N''Projects'',N''Action'',N''High'',23,1,@now,@now),
    (N''Projects:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Clients'',N''Projects'',N''Access'',N''Normal'',24,1,@now,@now),
    (N''Projects:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Clients'',N''Projects'',N''Access'',N''Normal'',25,1,@now,@now),
    (N''Projects:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Clients'',N''Projects'',N''Access'',N''Normal'',26,1,@now,@now),
    (N''Projects:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Clients'',N''Projects'',N''Action'',N''Normal'',27,1,@now,@now),
    (N''Projects:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Clients'',N''Projects'',N''Action'',N''Normal'',28,1,@now,@now),
    (N''Projects:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Clients'',N''Projects'',N''Action'',N''High'',29,1,@now,@now),
    (N''Projects:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Clients'',N''Projects'',N''Action'',N''High'',30,1,@now,@now),
    (N''Contracts:View'',N''View pages and records'',N''Open contracts pages and read their records. Required before any action in this module.'',N''Clients'',N''Contracts'',N''Access'',N''Normal'',31,1,@now,@now),
    (N''Contracts:Create'',N''Create'',N''Create contracts.'',N''Clients'',N''Contracts'',N''Action'',N''Normal'',32,1,@now,@now),
    (N''Contracts:Maintain'',N''Edit existing records'',N''Edit existing contracts records.'',N''Clients'',N''Contracts'',N''Action'',N''Normal'',33,1,@now,@now),
    (N''Contracts:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate contracts workflow.'',N''Clients'',N''Contracts'',N''Action'',N''Normal'',34,1,@now,@now),
    (N''Contracts:ArchiveRestore'',N''Archive and restore'',N''Archive and restore contracts.'',N''Clients'',N''Contracts'',N''Action'',N''Normal'',35,1,@now,@now),
    (N''Contracts:Delete'',N''Permanently delete unused records'',N''Permanently delete unused contracts records.'',N''Clients'',N''Contracts'',N''Action'',N''High'',36,1,@now,@now),
    (N''Contracts:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Clients'',N''Contracts'',N''Access'',N''Normal'',37,1,@now,@now),
    (N''Contracts:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Clients'',N''Contracts'',N''Access'',N''Normal'',38,1,@now,@now),
    (N''Contracts:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Clients'',N''Contracts'',N''Access'',N''Normal'',39,1,@now,@now),
    (N''Contracts:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Clients'',N''Contracts'',N''Action'',N''Normal'',40,1,@now,@now),
    (N''Contracts:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Clients'',N''Contracts'',N''Action'',N''Normal'',41,1,@now,@now),
    (N''Contracts:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Clients'',N''Contracts'',N''Action'',N''High'',42,1,@now,@now),
    (N''Contracts:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Clients'',N''Contracts'',N''Action'',N''High'',43,1,@now,@now),
    (N''Environments:View'',N''View pages and records'',N''Open environments pages and read their records. Required before any action in this module.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',44,1,@now,@now),
    (N''Environments:Create'',N''Create'',N''Create environments.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',45,1,@now,@now),
    (N''Environments:Maintain'',N''Edit existing records'',N''Edit existing environments records.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',46,1,@now,@now),
    (N''Environments:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate environments workflow.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',47,1,@now,@now),
    (N''Environments:ArchiveRestore'',N''Archive and restore'',N''Archive and restore environments.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',48,1,@now,@now),
    (N''Environments:Delete'',N''Permanently delete unused records'',N''Permanently delete unused environments records.'',N''Clients'',N''Environments'',N''Action'',N''High'',49,1,@now,@now),
    (N''Environments:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',50,1,@now,@now),
    (N''Environments:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',51,1,@now,@now),
    (N''Environments:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',52,1,@now,@now),
    (N''Environments:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',53,1,@now,@now),
    (N''Environments:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',54,1,@now,@now),
    (N''Environments:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Clients'',N''Environments'',N''Action'',N''High'',55,1,@now,@now),
    (N''Environments:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Clients'',N''Environments'',N''Action'',N''High'',56,1,@now,@now),
    (N''Servers:View'',N''View pages and records'',N''Open servers pages and read their records. Required before any action in this module.'',N''Clients'',N''Servers'',N''Access'',N''Normal'',57,1,@now,@now),
    (N''Servers:Create'',N''Create'',N''Create servers.'',N''Clients'',N''Servers'',N''Action'',N''Normal'',58,1,@now,@now),
    (N''Servers:Maintain'',N''Edit existing records'',N''Edit existing servers records.'',N''Clients'',N''Servers'',N''Action'',N''Normal'',59,1,@now,@now),
    (N''Servers:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate servers workflow.'',N''Clients'',N''Servers'',N''Action'',N''Normal'',60,1,@now,@now),
    (N''Servers:ArchiveRestore'',N''Archive and restore'',N''Archive and restore servers.'',N''Clients'',N''Servers'',N''Action'',N''Normal'',61,1,@now,@now),
    (N''Servers:Delete'',N''Permanently delete unused records'',N''Permanently delete unused servers records.'',N''Clients'',N''Servers'',N''Action'',N''High'',62,1,@now,@now),
    (N''Servers:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Clients'',N''Servers'',N''Access'',N''Normal'',63,1,@now,@now),
    (N''Servers:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Clients'',N''Servers'',N''Access'',N''Normal'',64,1,@now,@now),
    (N''Servers:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Clients'',N''Servers'',N''Access'',N''Normal'',65,1,@now,@now),
    (N''Servers:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Clients'',N''Servers'',N''Action'',N''Normal'',66,1,@now,@now),
    (N''Servers:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Clients'',N''Servers'',N''Action'',N''Normal'',67,1,@now,@now),
    (N''Servers:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Clients'',N''Servers'',N''Action'',N''High'',68,1,@now,@now),
    (N''Servers:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Clients'',N''Servers'',N''Action'',N''High'',69,1,@now,@now),
    (N''Installations:View'',N''View pages and records'',N''Open installations pages and read their records. Required before any action in this module.'',N''Clients'',N''Installations'',N''Access'',N''Normal'',70,1,@now,@now),
    (N''Installations:Create'',N''Create'',N''Create installations.'',N''Clients'',N''Installations'',N''Action'',N''Normal'',71,1,@now,@now),
    (N''Installations:Maintain'',N''Edit existing records'',N''Edit existing installations records.'',N''Clients'',N''Installations'',N''Action'',N''Normal'',72,1,@now,@now),
    (N''Installations:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate installations workflow.'',N''Clients'',N''Installations'',N''Action'',N''Normal'',73,1,@now,@now),
    (N''Installations:ArchiveRestore'',N''Archive and restore'',N''Archive and restore installations.'',N''Clients'',N''Installations'',N''Action'',N''Normal'',74,1,@now,@now),
    (N''Installations:Delete'',N''Permanently delete unused records'',N''Permanently delete unused installations records.'',N''Clients'',N''Installations'',N''Action'',N''High'',75,1,@now,@now),
    (N''Installations:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Clients'',N''Installations'',N''Access'',N''Normal'',76,1,@now,@now),
    (N''Installations:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Clients'',N''Installations'',N''Access'',N''Normal'',77,1,@now,@now),
    (N''Installations:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Clients'',N''Installations'',N''Access'',N''Normal'',78,1,@now,@now),
    (N''Installations:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Clients'',N''Installations'',N''Action'',N''Normal'',79,1,@now,@now),
    (N''Installations:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Clients'',N''Installations'',N''Action'',N''Normal'',80,1,@now,@now),
    (N''Installations:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Clients'',N''Installations'',N''Action'',N''High'',81,1,@now,@now),
    (N''Installations:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Clients'',N''Installations'',N''Action'',N''High'',82,1,@now,@now),
    (N''Products:View'',N''View pages and records'',N''Open products pages and read their records. Required before any action in this module.'',N''Products'',N''Products'',N''Access'',N''Normal'',83,1,@now,@now),
    (N''Products:Create'',N''Create'',N''Create products.'',N''Products'',N''Products'',N''Action'',N''Normal'',84,1,@now,@now),
    (N''Products:Maintain'',N''Edit existing records'',N''Edit existing products records.'',N''Products'',N''Products'',N''Action'',N''Normal'',85,1,@now,@now),
    (N''Products:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate products workflow.'',N''Products'',N''Products'',N''Action'',N''Normal'',86,1,@now,@now),
    (N''Products:ArchiveRestore'',N''Archive and restore'',N''Archive and restore products.'',N''Products'',N''Products'',N''Action'',N''Normal'',87,1,@now,@now),
    (N''Products:Delete'',N''Permanently delete unused records'',N''Permanently delete unused products records.'',N''Products'',N''Products'',N''Action'',N''High'',88,1,@now,@now),
    (N''Products:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Products'',N''Products'',N''Access'',N''Normal'',89,1,@now,@now),
    (N''Products:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Products'',N''Products'',N''Access'',N''Normal'',90,1,@now,@now),
    (N''Products:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Products'',N''Products'',N''Access'',N''Normal'',91,1,@now,@now),
    (N''Products:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Products'',N''Products'',N''Action'',N''Normal'',92,1,@now,@now),
    (N''Products:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Products'',N''Products'',N''Action'',N''Normal'',93,1,@now,@now),
    (N''Products:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Products'',N''Products'',N''Action'',N''High'',94,1,@now,@now),
    (N''Products:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Products'',N''Products'',N''Action'',N''High'',95,1,@now,@now),
    (N''Cases:View'',N''View pages and records'',N''Open cases pages and read their records. Required before any action in this module.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',96,1,@now,@now),
    (N''Cases:Create'',N''Create'',N''Create cases.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',97,1,@now,@now),
    (N''Cases:Maintain'',N''Edit existing records'',N''Edit existing cases records.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',98,1,@now,@now),
    (N''Cases:Coordinate'',N''Coordinate workflow and assignment'',N''Triage cases, assign owners, change contracts and coordinate case workflow.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',99,1,@now,@now),
    (N''Cases:ArchiveRestore'',N''Archive and restore'',N''Archive and restore cases.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',100,1,@now,@now),
    (N''Cases:Delete'',N''Permanently delete unused records'',N''Permanently delete unused cases records.'',N''Cases'',N''Cases'',N''Action'',N''High'',101,1,@now,@now),
    (N''Cases:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',102,1,@now,@now),
    (N''Cases:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',103,1,@now,@now),
    (N''Cases:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',104,1,@now,@now),
    (N''Cases:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',105,1,@now,@now),
    (N''Cases:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',106,1,@now,@now),
    (N''Cases:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Cases'',N''Cases'',N''Action'',N''High'',107,1,@now,@now),
    (N''Cases:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Cases'',N''Cases'',N''Action'',N''High'',108,1,@now,@now),
    (N''Commitments:View'',N''View pages and records'',N''Open commitments pages and read their records. Required before any action in this module.'',N''Commitments'',N''Commitments'',N''Access'',N''Normal'',109,1,@now,@now),
    (N''Commitments:Create'',N''Create'',N''Create commitments.'',N''Commitments'',N''Commitments'',N''Action'',N''Normal'',110,1,@now,@now),
    (N''Commitments:Maintain'',N''Edit existing records'',N''Edit existing commitments records.'',N''Commitments'',N''Commitments'',N''Action'',N''Normal'',111,1,@now,@now),
    (N''Commitments:Coordinate'',N''Coordinate workflow and assignment'',N''Revise, complete, cancel and reopen commitments.'',N''Commitments'',N''Commitments'',N''Action'',N''Normal'',112,1,@now,@now),
    (N''Commitments:ArchiveRestore'',N''Archive and restore'',N''Archive and restore commitments.'',N''Commitments'',N''Commitments'',N''Action'',N''Normal'',113,1,@now,@now),
    (N''Commitments:Delete'',N''Permanently delete unused records'',N''Permanently delete unused commitments records.'',N''Commitments'',N''Commitments'',N''Action'',N''High'',114,1,@now,@now),
    (N''Commitments:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Commitments'',N''Commitments'',N''Access'',N''Normal'',115,1,@now,@now),
    (N''Commitments:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Commitments'',N''Commitments'',N''Access'',N''Normal'',116,1,@now,@now),
    (N''Commitments:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Commitments'',N''Commitments'',N''Access'',N''Normal'',117,1,@now,@now),
    (N''Commitments:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Commitments'',N''Commitments'',N''Action'',N''Normal'',118,1,@now,@now),
    (N''Commitments:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Commitments'',N''Commitments'',N''Action'',N''Normal'',119,1,@now,@now),
    (N''Commitments:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Commitments'',N''Commitments'',N''Action'',N''High'',120,1,@now,@now),
    (N''Commitments:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Commitments'',N''Commitments'',N''Action'',N''High'',121,1,@now,@now),
    (N''Teams:View'',N''View pages and records'',N''Open teams and handovers pages and read their records. Required before any action in this module.'',N''Teams'',N''Teams'',N''Access'',N''Normal'',122,1,@now,@now),
    (N''Teams:Create'',N''Create'',N''Create teams and handovers.'',N''Teams'',N''Teams'',N''Action'',N''Normal'',123,1,@now,@now),
    (N''Teams:Maintain'',N''Edit existing records'',N''Edit existing teams and handovers records.'',N''Teams'',N''Teams'',N''Action'',N''Normal'',124,1,@now,@now),
    (N''Teams:Coordinate'',N''Coordinate workflow and assignment'',N''Manage teams, membership, coverage, handovers and reassignment.'',N''Teams'',N''Teams'',N''Action'',N''Normal'',125,1,@now,@now),
    (N''Teams:ArchiveRestore'',N''Archive and restore'',N''Archive and restore teams and handovers.'',N''Teams'',N''Teams'',N''Action'',N''Normal'',126,1,@now,@now),
    (N''Teams:Delete'',N''Permanently delete unused records'',N''Permanently delete unused teams and handovers records.'',N''Teams'',N''Teams'',N''Action'',N''High'',127,1,@now,@now),
    (N''Teams:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Teams'',N''Teams'',N''Access'',N''Normal'',128,1,@now,@now),
    (N''Teams:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Teams'',N''Teams'',N''Access'',N''Normal'',129,1,@now,@now),
    (N''Teams:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Teams'',N''Teams'',N''Access'',N''Normal'',130,1,@now,@now),
    (N''Teams:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Teams'',N''Teams'',N''Action'',N''Normal'',131,1,@now,@now),
    (N''Teams:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Teams'',N''Teams'',N''Action'',N''Normal'',132,1,@now,@now),
    (N''Teams:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Teams'',N''Teams'',N''Action'',N''High'',133,1,@now,@now),
    (N''Teams:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Teams'',N''Teams'',N''Action'',N''High'',134,1,@now,@now),
    (N''OtherOperations:View'',N''View pages and records'',N''Open other operations pages and read their records. Required before any action in this module.'',N''Escalations'',N''OtherOperations'',N''Access'',N''Normal'',135,1,@now,@now),
    (N''OtherOperations:Create'',N''Create'',N''Create other operations.'',N''Escalations'',N''OtherOperations'',N''Action'',N''Normal'',136,1,@now,@now),
    (N''OtherOperations:Maintain'',N''Edit existing records'',N''Edit existing other operations records.'',N''Escalations'',N''OtherOperations'',N''Action'',N''Normal'',137,1,@now,@now),
    (N''OtherOperations:Coordinate'',N''Coordinate workflow and assignment'',N''Coordinate other operations workflow.'',N''Escalations'',N''OtherOperations'',N''Action'',N''Normal'',138,1,@now,@now),
    (N''OtherOperations:ArchiveRestore'',N''Archive and restore'',N''Archive and restore other operations.'',N''Escalations'',N''OtherOperations'',N''Action'',N''Normal'',139,1,@now,@now),
    (N''OtherOperations:Delete'',N''Permanently delete unused records'',N''Permanently delete unused other operations records.'',N''Escalations'',N''OtherOperations'',N''Action'',N''High'',140,1,@now,@now),
    (N''OtherOperations:DetailsView'',N''View record details'',N''Open record detail pages and their detail API endpoints.'',N''Escalations'',N''OtherOperations'',N''Access'',N''Normal'',141,1,@now,@now),
    (N''OtherOperations:HistoryView'',N''View record history'',N''Read this module''''s business change history. Record details and the Change history right are also required.'',N''Escalations'',N''OtherOperations'',N''Access'',N''Normal'',142,1,@now,@now),
    (N''OtherOperations:AttachmentsView'',N''View and download attachments'',N''List, preview and download attachments belonging to records in this module.'',N''Escalations'',N''OtherOperations'',N''Access'',N''Normal'',143,1,@now,@now),
    (N''OtherOperations:AttachmentsUpload'',N''Upload and describe attachments'',N''Upload files and update attachment descriptions, independently of record editing. Record scope is required.'',N''Escalations'',N''OtherOperations'',N''Action'',N''Normal'',144,1,@now,@now),
    (N''OtherOperations:AttachmentsDeleteOwn'',N''Delete own attachments'',N''Remove only files you uploaded in this module. Record scope is required.'',N''Escalations'',N''OtherOperations'',N''Action'',N''Normal'',145,1,@now,@now),
    (N''OtherOperations:AttachmentsDelete'',N''Delete any attachment'',N''Remove any file belonging to an authorized record in this module, independently of deleting the record itself.'',N''Escalations'',N''OtherOperations'',N''Action'',N''High'',146,1,@now,@now),
    (N''OtherOperations:Export'',N''Export module data'',N''Export this module''''s data through list downloads and reports. The Export files right and data scope also apply.'',N''Escalations'',N''OtherOperations'',N''Action'',N''High'',147,1,@now,@now),
    (N''Dashboard:View'',N''View pages and records'',N''Open the Operations Command Center and its combined measures. Source module View rights are also required.'',N''Dashboard'',N''Dashboard'',N''Access'',N''Normal'',148,1,@now,@now),
    (N''Notifications:View'',N''View pages and records'',N''Access your own notification center and unread counts. Other users'''' notices remain private.'',N''Dashboard'',N''Notifications'',N''Access'',N''Normal'',149,1,@now,@now),
    (N''Notifications:Maintain'',N''Edit existing records'',N''Edit existing notifications records.'',N''Dashboard'',N''Notifications'',N''Action'',N''Normal'',150,1,@now,@now),
    (N''Notifications:Delete'',N''Permanently delete unused records'',N''Permanently delete unused notifications records.'',N''Dashboard'',N''Notifications'',N''Action'',N''High'',151,1,@now,@now),
    (N''Reporting:View'',N''View pages and records'',N''Use the Reporting Center. Report data also needs its source View rights and the Export files right.'',N''Reporting Center'',N''Reporting'',N''Access'',N''Normal'',152,1,@now,@now),
    (N''PersonalNotes:View'',N''View pages and records'',N''Access your own notebooks, pages and files. Ownership restrictions always apply.'',N''Notes'',N''PersonalNotes'',N''Access'',N''Normal'',153,1,@now,@now),
    (N''PersonalNotes:Create'',N''Create'',N''Create personal notes.'',N''Notes'',N''PersonalNotes'',N''Action'',N''Normal'',154,1,@now,@now),
    (N''PersonalNotes:Maintain'',N''Edit existing records'',N''Edit existing personal notes records.'',N''Notes'',N''PersonalNotes'',N''Action'',N''Normal'',155,1,@now,@now),
    (N''PersonalNotes:Delete'',N''Permanently delete unused records'',N''Permanently delete unused personal notes records.'',N''Notes'',N''PersonalNotes'',N''Action'',N''High'',156,1,@now,@now),
    (N''PersonalNotes:Download'',N''Download'',N''Download'',N''Notes'',N''PersonalNotes'',N''Action'',N''Normal'',157,1,@now,@now),
    (N''tab.ClientStructure.structure:View'',N''Regions & environments tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',158,1,@now,@now),
    (N''tab.ClientStructure.organizations:View'',N''Organizations tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',159,1,@now,@now),
    (N''tab.ClientStructure.contracts:View'',N''Contracts & SLAs tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',160,1,@now,@now),
    (N''tab.ClientStructure.cases:View'',N''Cases tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',161,1,@now,@now),
    (N''tab.ClientStructure.commitments:View'',N''Commitments tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',162,1,@now,@now),
    (N''tab.ClientStructure.escalations:View'',N''Escalations tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',163,1,@now,@now),
    (N''tab.ClientStructure.infra:View'',N''Infrastructure tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',164,1,@now,@now),
    (N''tab.ClientStructure.projects:View'',N''Projects tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',165,1,@now,@now),
    (N''tab.ClientStructure.jira:View'',N''Jira integration tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',166,1,@now,@now),
    (N''tab.ClientStructure.contacts:View'',N''Contacts & responsibilities tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',167,1,@now,@now),
    (N''tab.ClientStructure.notes:View'',N''My notes tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''ClientStructure'',N''Access'',N''Normal'',168,1,@now,@now),
    (N''tab.Environments.apps:View'',N''Applications tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',169,1,@now,@now),
    (N''tab.Environments.assets:View'',N''Servers & assets tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',170,1,@now,@now),
    (N''tab.Environments.work:View'',N''Work tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',171,1,@now,@now),
    (N''tab.Environments.network:View'',N''Firewall rules tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',172,1,@now,@now),
    (N''tab.Environments.conditions:View'',N''Condition history tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',173,1,@now,@now),
    (N''tab.Environments.quality:View'',N''Data quality tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Clients'',N''Environments'',N''Access'',N''Normal'',174,1,@now,@now),
    (N''tab.Cases.timeline:View'',N''Timeline tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',175,1,@now,@now),
    (N''tab.Cases.affected:View'',N''Affected records tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',176,1,@now,@now),
    (N''tab.Cases.jira:View'',N''Jira references tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',177,1,@now,@now),
    (N''tab.Cases.impact:View'',N''Documented impact tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',178,1,@now,@now),
    (N''tab.Cases.commitments:View'',N''Commitments tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',179,1,@now,@now),
    (N''tab.Cases.escalations:View'',N''Escalations tab'',N''See this tab''''s data. The source rights and record scope also apply.'',N''Cases'',N''Cases'',N''Access'',N''Normal'',180,1,@now,@now),
    (N''tab.ClientStructure.structure:Create'',N''Regions & environments: create'',N''Create within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',181,1,@now,@now),
    (N''tab.ClientStructure.structure:Maintain'',N''Regions & environments: edit'',N''Maintain within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',182,1,@now,@now),
    (N''tab.ClientStructure.structure:ArchiveRestore'',N''Regions & environments: archive and restore'',N''ArchiveRestore within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',183,1,@now,@now),
    (N''tab.ClientStructure.structure:Delete'',N''Regions & environments: delete'',N''Delete within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',184,1,@now,@now),
    (N''tab.ClientStructure.organizations:Create'',N''Organizations: create'',N''Create within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',185,1,@now,@now),
    (N''tab.ClientStructure.organizations:Maintain'',N''Organizations: edit'',N''Maintain within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',186,1,@now,@now),
    (N''tab.ClientStructure.organizations:Delete'',N''Organizations: delete'',N''Delete within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',187,1,@now,@now),
    (N''tab.ClientStructure.contacts:Create'',N''Contacts & responsibilities: create'',N''Create within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',188,1,@now,@now),
    (N''tab.ClientStructure.contacts:Maintain'',N''Contacts & responsibilities: edit'',N''Maintain within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',189,1,@now,@now),
    (N''tab.ClientStructure.contacts:ArchiveRestore'',N''Contacts & responsibilities: archive and restore'',N''ArchiveRestore within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',190,1,@now,@now),
    (N''tab.ClientStructure.contacts:Delete'',N''Contacts & responsibilities: delete'',N''Delete within this section. The matching record right is also required.'',N''Clients'',N''ClientStructure'',N''Action'',N''Normal'',191,1,@now,@now),
    (N''tab.Cases.jira:Create'',N''Jira references: create'',N''Create within this section. The matching record right is also required.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',192,1,@now,@now),
    (N''tab.Cases.jira:Delete'',N''Jira references: delete'',N''Delete within this section. The matching record right is also required.'',N''Cases'',N''Cases'',N''Action'',N''Normal'',193,1,@now,@now),
    (N''tab.Environments.conditions:Create'',N''Condition history: create'',N''Create within this section. The matching record right is also required.'',N''Clients'',N''Environments'',N''Action'',N''Normal'',194,1,@now,@now),
    (N''ClientMap:View'',N''View'',N''View in Client map. Data, ownership and scope checks still apply.'',N''Dashboard'',N''ClientMap'',N''Access'',N''Normal'',195,1,@now,@now),
    (N''ActionList:View'',N''View'',N''View in Action list. Data, ownership and scope checks still apply.'',N''Dashboard'',N''ActionList'',N''Access'',N''Normal'',196,1,@now,@now),
    (N''DataQuality:View'',N''View'',N''View in Data quality. Data, ownership and scope checks still apply.'',N''Dashboard'',N''DataQuality'',N''Access'',N''Normal'',197,1,@now,@now),
    (N''DataQuality:Maintain'',N''Edit'',N''Maintain in Data quality. Data, ownership and scope checks still apply.'',N''Dashboard'',N''DataQuality'',N''Action'',N''Normal'',198,1,@now,@now),
    (N''Handovers:View'',N''View'',N''View in Handovers. Data, ownership and scope checks still apply.'',N''Teams'',N''Handovers'',N''Access'',N''Normal'',199,1,@now,@now),
    (N''Handovers:Create'',N''Create'',N''Create in Handovers. Data, ownership and scope checks still apply.'',N''Teams'',N''Handovers'',N''Action'',N''Normal'',200,1,@now,@now),
    (N''Handovers:Maintain'',N''Edit'',N''Maintain in Handovers. Data, ownership and scope checks still apply.'',N''Teams'',N''Handovers'',N''Action'',N''Normal'',201,1,@now,@now),
    (N''Reassignment:View'',N''View'',N''View in Reassignment queue. Data, ownership and scope checks still apply.'',N''Teams'',N''Reassignment'',N''Access'',N''Normal'',202,1,@now,@now),
    (N''ReportOverview:View'',N''View'',N''View in Overview. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportOverview'',N''Access'',N''Normal'',203,1,@now,@now),
    (N''ReportLibrary:View'',N''View'',N''View in Report library. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportLibrary'',N''Access'',N''Normal'',204,1,@now,@now),
    (N''ReportLibrary:Create'',N''Create'',N''Create in Report library. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportLibrary'',N''Action'',N''Normal'',205,1,@now,@now),
    (N''ReportLibrary:Delete'',N''Delete'',N''Delete in Report library. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportLibrary'',N''Action'',N''Normal'',206,1,@now,@now),
    (N''ReportLibrary:Export'',N''Export'',N''Export in Report library. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportLibrary'',N''Action'',N''Normal'',207,1,@now,@now),
    (N''ReportBuilder:View'',N''View'',N''View in Cases report builder. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportBuilder'',N''Access'',N''Normal'',208,1,@now,@now),
    (N''ReportBuilder:Export'',N''Export'',N''Export in Cases report builder. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportBuilder'',N''Action'',N''Normal'',209,1,@now,@now),
    (N''SavedReports:View'',N''View'',N''View in My reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''SavedReports'',N''Access'',N''Normal'',210,1,@now,@now),
    (N''SavedReports:Create'',N''Create'',N''Create in My reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''SavedReports'',N''Action'',N''Normal'',211,1,@now,@now),
    (N''SavedReports:Maintain'',N''Edit'',N''Maintain in My reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''SavedReports'',N''Action'',N''Normal'',212,1,@now,@now),
    (N''SavedReports:Delete'',N''Delete'',N''Delete in My reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''SavedReports'',N''Action'',N''Normal'',213,1,@now,@now),
    (N''ReportSchedules:View'',N''View'',N''View in Scheduled reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportSchedules'',N''Access'',N''Normal'',214,1,@now,@now),
    (N''ReportSchedules:Create'',N''Create'',N''Create in Scheduled reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportSchedules'',N''Action'',N''Normal'',215,1,@now,@now),
    (N''ReportSchedules:Maintain'',N''Edit'',N''Maintain in Scheduled reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportSchedules'',N''Action'',N''Normal'',216,1,@now,@now),
    (N''ReportSchedules:Delete'',N''Delete'',N''Delete in Scheduled reports. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportSchedules'',N''Action'',N''Normal'',217,1,@now,@now),
    (N''ReportHistory:View'',N''View'',N''View in Export history. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportHistory'',N''Access'',N''Normal'',218,1,@now,@now),
    (N''ReportHistory:Create'',N''Create'',N''Create in Export history. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportHistory'',N''Action'',N''Normal'',219,1,@now,@now),
    (N''ReportHistory:Maintain'',N''Edit'',N''Maintain in Export history. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportHistory'',N''Action'',N''Normal'',220,1,@now,@now),
    (N''ReportHistory:Download'',N''Download'',N''Download in Export history. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportHistory'',N''Action'',N''Normal'',221,1,@now,@now),
    (N''ReportTemplates:View'',N''View'',N''View in Templates. Data, ownership and scope checks still apply.'',N''Reporting Center'',N''ReportTemplates'',N''Access'',N''Normal'',222,1,@now,@now),
    (N''AdminUsers:View'',N''View'',N''View in Users. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminUsers'',N''Access'',N''High'',223,1,@now,@now),
    (N''AdminUsers:Create'',N''Create'',N''Create in Users. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminUsers'',N''Action'',N''High'',224,1,@now,@now),
    (N''AdminUsers:Maintain'',N''Edit'',N''Maintain in Users. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminUsers'',N''Action'',N''High'',225,1,@now,@now),
    (N''AdminUsers:Delete'',N''Delete'',N''Delete in Users. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminUsers'',N''Action'',N''High'',226,1,@now,@now),
    (N''AdminRoles:View'',N''View'',N''View in Roles and rights. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminRoles'',N''Access'',N''High'',227,1,@now,@now),
    (N''AdminRoles:Create'',N''Create'',N''Create in Roles and rights. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminRoles'',N''Action'',N''High'',228,1,@now,@now),
    (N''AdminRoles:Maintain'',N''Edit'',N''Maintain in Roles and rights. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminRoles'',N''Action'',N''High'',229,1,@now,@now),
    (N''AdminRoles:Delete'',N''Delete'',N''Delete in Roles and rights. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminRoles'',N''Action'',N''High'',230,1,@now,@now),
    (N''AdminGroups:View'',N''View'',N''View in Directory group mappings. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminGroups'',N''Access'',N''High'',231,1,@now,@now),
    (N''AdminGroups:Create'',N''Create'',N''Create in Directory group mappings. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminGroups'',N''Action'',N''High'',232,1,@now,@now),
    (N''AdminGroups:Maintain'',N''Edit'',N''Maintain in Directory group mappings. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminGroups'',N''Action'',N''High'',233,1,@now,@now),
    (N''AdminConfig:View'',N''View'',N''View in Configuration. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminConfig'',N''Access'',N''High'',234,1,@now,@now),
    (N''AdminConfig:Create'',N''Create'',N''Create in Configuration. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminConfig'',N''Action'',N''High'',235,1,@now,@now),
    (N''AdminConfig:Maintain'',N''Edit'',N''Maintain in Configuration. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminConfig'',N''Action'',N''High'',236,1,@now,@now),
    (N''AdminConfig:Delete'',N''Delete'',N''Delete in Configuration. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminConfig'',N''Action'',N''High'',237,1,@now,@now),
    (N''AdminSettings:View'',N''View'',N''View in Settings. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminSettings'',N''Access'',N''High'',238,1,@now,@now),
    (N''AdminSettings:Maintain'',N''Edit'',N''Maintain in Settings. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminSettings'',N''Action'',N''High'',239,1,@now,@now),
    (N''AdminAudit:View'',N''View'',N''View in Change history. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminAudit'',N''Access'',N''High'',240,1,@now,@now),
    (N''AdminIntegrations:View'',N''View'',N''View in Integrations. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminIntegrations'',N''Access'',N''High'',241,1,@now,@now),
    (N''AdminIntegrations:Create'',N''Create'',N''Create in Integrations. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminIntegrations'',N''Action'',N''High'',242,1,@now,@now),
    (N''AdminIntegrations:Maintain'',N''Edit'',N''Maintain in Integrations. Data, ownership and scope checks still apply.'',N''Administration'',N''AdminIntegrations'',N''Action'',N''High'',243,1,@now,@now);
    INSERT [iam].[RoleRight] (AppRoleId, RightKey) SELECT RoleId, NewKey FROM #RoleNew;
    INSERT [iam].[GroupMappingRole] (GroupMappingId, AppRoleId) SELECT m.Id, r.Id FROM [iam].[GroupMapping] m JOIN [iam].[AppRole] r ON r.[Key] = m.[Role];
    INSERT [iam].[UserRightException] (UserId, RightKey, Effect, ExpiresAt) SELECT UserId, NewKey, N''Allow'', ExpiresAt FROM #NewAllow;
    INSERT [iam].[UserRightException] (UserId, RightKey, Effect, ExpiresAt) SELECT UserId, NewKey, N''Deny'', ExpiresAt FROM #NewDeny;
    INSERT [iam].[UserRightException] (UserId, RightKey, Effect, ExpiresAt, ClientId, ProjectId, TeamId)
        SELECT o.UserId, o.PermissionKey, o.Effect, o.ExpiresAt, o.ClientId, o.ProjectId, o.TeamId FROM [iam].[UserPermissionOverride] o
        WHERE (o.ClientId IS NOT NULL OR o.ProjectId IS NOT NULL OR o.TeamId IS NOT NULL) AND (o.ExpiresAt IS NULL OR o.ExpiresAt > @now)
          AND EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = o.PermissionKey);
    INSERT [audit].[AuditEntry] ([At], UserName, Action, Category, EntityType, EntityId, EntityLabel, Reason, Changes)
    SELECT @now, N''deployment'', N''RightsModelUpgrade'', N''Access'', N''AppRole'', r.Id, r.Name,
        N''Converted to the rights model. Container grants have no successor; keys listed as notCarried could not be used by this role under the old rules.'',
        N''{"rights":'' + ISNULL((SELECT n.NewKey AS [key] FROM #RoleNew n WHERE n.RoleId = r.Id FOR JSON PATH), N''[]'')
        + N'',"notCarried":'' + ISNULL((SELECT o.OldKey AS [key] FROM #RoleOld o WHERE o.RoleId = r.Id AND EXISTS (SELECT 1 FROM #Map m WHERE m.NewKey = o.OldKey)
            AND NOT EXISTS (SELECT 1 FROM #RoleNew n WHERE n.RoleId = r.Id AND n.NewKey = o.OldKey) FOR JSON PATH), N''[]'') + N''}''
    FROM [iam].[AppRole] r;
    INSERT [audit].[AuditEntry] ([At], UserName, Action, Category, EntityType, EntityId, EntityLabel, Reason, Changes)
    SELECT @now, N''deployment'', N''RightsModelUpgrade'', N''Access'', N''UserRightException'', u.Id, u.AccountName,
        N''Direct exceptions written so this person keeps exactly the access they had before the rights model.'',
        N''{"allow":'' + ISNULL((SELECT a.NewKey AS [key], a.ExpiresAt AS expiresAt FROM #NewAllow a WHERE a.UserId = u.Id FOR JSON PATH), N''[]'')
        + N'',"deny":'' + ISNULL((SELECT d.NewKey AS [key], d.ExpiresAt AS expiresAt FROM #NewDeny d WHERE d.UserId = u.Id FOR JSON PATH), N''[]'') + N''}''
    FROM [iam].[User] u WHERE EXISTS (SELECT 1 FROM #NewAllow a WHERE a.UserId = u.Id) OR EXISTS (SELECT 1 FROM #NewDeny d WHERE d.UserId = u.Id);
    INSERT [audit].[AuditEntry] ([At], UserName, Action, Category, EntityType, EntityId, EntityLabel, Reason, Changes)
    SELECT @now, N''deployment'', N''RightsModelUpgrade'', N''Access'', N''User'', u.Id, u.AccountName,
        N''OWNER REVIEW: an administrator used these rights through another role. Direct allows do not apply to administrators, so correct a role if they are still needed.'',
        N''{"lost":'' + (SELECT l.NewKey AS [key] FROM #AdminLoss l WHERE l.UserId = u.Id FOR JSON PATH) + N''}''
    FROM [iam].[User] u WHERE EXISTS (SELECT 1 FROM #AdminLoss l WHERE l.UserId = u.Id);
    UPDATE [iam].[AuthorizationVersion] SET Version = Version + 1 WHERE Id = 1;
    ');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261103155046_RightsModel'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261103155046_RightsModel', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052225_JiraUserClassification'
)
BEGIN
    ALTER TABLE [iam].[User] ADD [Classification] nvarchar(30) NOT NULL DEFAULT N'Standard';
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052225_JiraUserClassification'
)
BEGIN
    ALTER TABLE [iam].[User] ADD [LoginEnabled] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052225_JiraUserClassification'
)
BEGIN
    EXEC(N'INSERT INTO [iam].[User] ([AccountName], [DisplayName], [WorkingTimeZone], [IsActive], [AllClients], [AllInternal], [Classification], [LoginEnabled], [CreatedAt], [UpdatedAt])
    SELECT CONCAT(N''jira-team-'', m.[Id]), LEFT(COALESCE(m.[JiraDisplayName], m.[JiraAccountId]), 150), N''UTC'', 1, 0, 0, N''VitronicTeamMember'', 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    FROM [jira].[JiraUserMapping] m WHERE m.[IsInternalMember] = 1;
    UPDATE m SET m.[TioUserId] = u.[Id]
    FROM [jira].[JiraUserMapping] m JOIN [iam].[User] u ON u.[AccountName] = CONCAT(N''jira-team-'', m.[Id])
    WHERE m.[IsInternalMember] = 1;
    UPDATE c SET c.[InternalAssignee] = NULL
    FROM [work].[Case] c JOIN [jira].[JiraCaseMapping] j ON j.[CaseId] = c.[Id]
    JOIN [jira].[JiraUserMapping] m ON m.[JiraConnectionId] = j.[JiraConnectionId] AND m.[JiraAccountId] = j.[AssigneeAccountId]
    WHERE m.[IsInternalMember] = 1;
    UPDATE j SET j.[AppliedAssigneeAccountId] = NULL
    FROM [jira].[JiraCaseMapping] j JOIN [jira].[JiraUserMapping] m ON m.[JiraConnectionId] = j.[JiraConnectionId] AND m.[JiraAccountId] = j.[AssigneeAccountId]
    WHERE m.[IsInternalMember] = 1;');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052225_JiraUserClassification'
)
BEGIN
    DECLARE @var23 nvarchar(max);
    SELECT @var23 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraUserMapping]') AND [c].[name] = N'IsInternalMember');
    IF @var23 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraUserMapping] DROP CONSTRAINT ' + @var23 + ';');
    ALTER TABLE [jira].[JiraUserMapping] DROP COLUMN [IsInternalMember];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104052225_JiraUserClassification'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104052225_JiraUserClassification', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104054519_JiraSpaceContract'
)
BEGIN
    ALTER TABLE [jira].[ClientJiraSpace] ADD [ContractId] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104054519_JiraSpaceContract'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104054519_JiraSpaceContract', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104075915_JiraValueMapping'
)
BEGIN
    CREATE TABLE [jira].[JiraValueMapping] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [Kind] nvarchar(20) NOT NULL,
        [JiraValue] nvarchar(200) NOT NULL,
        [TargetCode] nvarchar(100) NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_JiraValueMapping] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_JiraValueMapping_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_JiraValueMapping_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104075915_JiraValueMapping'
)
BEGIN
    CREATE UNIQUE INDEX [IX_JiraValueMapping_ClientId_Kind_JiraValue] ON [jira].[JiraValueMapping] ([ClientId], [Kind], [JiraValue]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104075915_JiraValueMapping'
)
BEGIN
    CREATE INDEX [IX_JiraValueMapping_CreatedById] ON [jira].[JiraValueMapping] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104075915_JiraValueMapping'
)
BEGIN
    CREATE INDEX [IX_JiraValueMapping_UpdatedById] ON [jira].[JiraValueMapping] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104075915_JiraValueMapping'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104075915_JiraValueMapping', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var24 nvarchar(max);
    SELECT @var24 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraComment]') AND [c].[name] = N'BodyText');
    IF @var24 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraComment] DROP CONSTRAINT ' + @var24 + ';');
    ALTER TABLE [jira].[JiraComment] ALTER COLUMN [BodyText] nvarchar(max) NOT NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var25 nvarchar(max);
    SELECT @var25 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraCaseMapping]') AND [c].[name] = N'Labels');
    IF @var25 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraCaseMapping] DROP CONSTRAINT ' + @var25 + ';');
    ALTER TABLE [jira].[JiraCaseMapping] ALTER COLUMN [Labels] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var26 nvarchar(max);
    SELECT @var26 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraCaseMapping]') AND [c].[name] = N'DetailsJson');
    IF @var26 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraCaseMapping] DROP CONSTRAINT ' + @var26 + ';');
    ALTER TABLE [jira].[JiraCaseMapping] ALTER COLUMN [DetailsJson] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var27 nvarchar(max);
    SELECT @var27 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraCaseMapping]') AND [c].[name] = N'DescriptionText');
    IF @var27 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraCaseMapping] DROP CONSTRAINT ' + @var27 + ';');
    ALTER TABLE [jira].[JiraCaseMapping] ALTER COLUMN [DescriptionText] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var28 nvarchar(max);
    SELECT @var28 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraCaseMapping]') AND [c].[name] = N'Components');
    IF @var28 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraCaseMapping] DROP CONSTRAINT ' + @var28 + ';');
    ALTER TABLE [jira].[JiraCaseMapping] ALTER COLUMN [Components] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var29 nvarchar(max);
    SELECT @var29 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraActivity]') AND [c].[name] = N'ToValue');
    IF @var29 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraActivity] DROP CONSTRAINT ' + @var29 + ';');
    ALTER TABLE [jira].[JiraActivity] ALTER COLUMN [ToValue] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    DECLARE @var30 nvarchar(max);
    SELECT @var30 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[JiraActivity]') AND [c].[name] = N'FromValue');
    IF @var30 IS NOT NULL EXEC(N'ALTER TABLE [jira].[JiraActivity] DROP CONSTRAINT ' + @var30 + ';');
    ALTER TABLE [jira].[JiraActivity] ALTER COLUMN [FromValue] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104095746_JiraLongText'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104095746_JiraLongText', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134257_JiraResolutionTime'
)
BEGIN
    ALTER TABLE [jira].[JiraCaseMapping] ADD [JiraResolvedAt] datetimeoffset NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134257_JiraResolutionTime'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaContractStart] date NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134257_JiraResolutionTime'
)
BEGIN
    EXEC(N'UPDATE c SET c.[ResolvedAt] = x.[At], c.[ClosedAt] = CASE WHEN c.[ClosedAt] IS NULL THEN NULL ELSE x.[At] END, c.[SlaCalculatedAt] = NULL
    FROM [work].[Case] c
    CROSS APPLY (SELECT MAX(a.[At]) AS [At] FROM [jira].[JiraCaseMapping] m JOIN [jira].[JiraActivity] a ON a.[JiraConnectionId] = m.[JiraConnectionId] AND a.[JiraIssueId] = m.[JiraIssueId] WHERE m.[CaseId] = c.[Id] AND a.[Type] = N''Status'') x
    WHERE c.[ResolvedAt] IS NOT NULL AND x.[At] IS NOT NULL AND x.[At] < c.[ResolvedAt];
    UPDATE c SET c.[SlaContractStart] = k.[StartDate], c.[SlaCalculatedAt] = NULL
    FROM [work].[Case] c JOIN [contracts].[Contract] k ON k.[Id] = c.[ContractId];');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261104134257_JiraResolutionTime'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261104134257_JiraResolutionTime', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    ALTER TABLE [work].[Case] ADD [SlaNoCoveringContract] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    CREATE TABLE [jira].[ClientJiraSpaceContract] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientJiraSpaceId] bigint NOT NULL,
        [ContractId] bigint NOT NULL,
        [CreatedAt] datetimeoffset NOT NULL,
        [CreatedById] bigint NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        [UpdatedById] bigint NULL,
        [RowVersion] rowversion NOT NULL,
        CONSTRAINT [PK_ClientJiraSpaceContract] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ClientJiraSpaceContract_ClientJiraSpace_ClientJiraSpaceId] FOREIGN KEY ([ClientJiraSpaceId]) REFERENCES [jira].[ClientJiraSpace] ([Id]),
        CONSTRAINT [FK_ClientJiraSpaceContract_User_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [iam].[User] ([Id]),
        CONSTRAINT [FK_ClientJiraSpaceContract_User_UpdatedById] FOREIGN KEY ([UpdatedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    CREATE UNIQUE INDEX [IX_ClientJiraSpaceContract_ClientJiraSpaceId_ContractId] ON [jira].[ClientJiraSpaceContract] ([ClientJiraSpaceId], [ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSpaceContract_ContractId] ON [jira].[ClientJiraSpaceContract] ([ContractId]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSpaceContract_CreatedById] ON [jira].[ClientJiraSpaceContract] ([CreatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    CREATE INDEX [IX_ClientJiraSpaceContract_UpdatedById] ON [jira].[ClientJiraSpaceContract] ([UpdatedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    EXEC(N'INSERT INTO [jira].[ClientJiraSpaceContract] ([ClientJiraSpaceId], [ContractId], [CreatedAt], [UpdatedAt])
    SELECT s.[Id], s.[ContractId], SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET() FROM [jira].[ClientJiraSpace] s
    WHERE s.[ContractId] IS NOT NULL AND s.[ReleasedAt] IS NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    DECLARE @var31 nvarchar(max);
    SELECT @var31 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[jira].[ClientJiraSpace]') AND [c].[name] = N'ContractId');
    IF @var31 IS NOT NULL EXEC(N'ALTER TABLE [jira].[ClientJiraSpace] DROP CONSTRAINT ' + @var31 + ';');
    ALTER TABLE [jira].[ClientJiraSpace] DROP COLUMN [ContractId];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105070845_JiraSpaceContracts'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105070845_JiraSpaceContracts', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105122619_MyDashboardRight'
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] WHERE [Key] = N'MyDashboard:View')
        INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
        VALUES (N'MyDashboard:View', N'View', N'View in My dashboard. Data, ownership and scope checks still apply.', N'Dashboard', N'MyDashboard', N'Access', N'Normal', 0, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
    INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
    SELECT r.[AppRoleId], N'MyDashboard:View' FROM [iam].[RoleRight] r
    WHERE r.[RightKey] = N'Cases:View'
      AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'MyDashboard:View');
    UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105122619_MyDashboardRight'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105122619_MyDashboardRight', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105142434_AssetNetworkDetails'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [IpAddress] nvarchar(64) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105142434_AssetNetworkDetails'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [Notes] nvarchar(2000) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105142434_AssetNetworkDetails'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [Vlan] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261105142434_AssetNetworkDetails'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261105142434_AssetNetworkDetails', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110082431_AudienceDashboards'
)
BEGIN
    CREATE TABLE [clients].[ProjectStatusReport] (
        [Id] bigint NOT NULL IDENTITY,
        [ProjectId] bigint NOT NULL,
        [ClientId] bigint NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [Summary] nvarchar(1000) NOT NULL,
        [NextReviewOn] date NULL,
        [RecordedById] bigint NULL,
        [RecordedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_ProjectStatusReport] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ProjectStatusReport_Project_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [clients].[Project] ([Id]),
        CONSTRAINT [FK_ProjectStatusReport_User_RecordedById] FOREIGN KEY ([RecordedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110082431_AudienceDashboards'
)
BEGIN
    CREATE INDEX [IX_ProjectStatusReport_ProjectId_RecordedAt] ON [clients].[ProjectStatusReport] ([ProjectId], [RecordedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110082431_AudienceDashboards'
)
BEGIN
    CREATE INDEX [IX_ProjectStatusReport_RecordedById] ON [clients].[ProjectStatusReport] ([RecordedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110082431_AudienceDashboards'
)
BEGIN
    DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
    INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
    SELECT v.[Key], N'View', v.[Description], N'Dashboard', v.[Feature], N'Access', N'Normal', 0, 1, @now, @now
    FROM (VALUES
        (N'OperationalDashboard:View', N'OperationalDashboard', N'View in Operational dashboard. Data, ownership and scope checks still apply.'),
        (N'SlaContractsDashboard:View', N'SlaContractsDashboard', N'View in SLA & Contracts dashboard. Data, ownership and scope checks still apply.'),
        (N'ManagementDashboard:View', N'ManagementDashboard', N'View in Management dashboard. Data, ownership and scope checks still apply.'),
        (N'ProjectDashboard:View', N'ProjectDashboard', N'View in Project dashboard. Data, ownership and scope checks still apply.')
    ) v ([Key],[Feature],[Description])
    WHERE NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = v.[Key]);
    INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
    SELECT r.[AppRoleId], k.[Key] FROM [iam].[RoleRight] r
    CROSS JOIN (VALUES (N'OperationalDashboard:View'), (N'SlaContractsDashboard:View'), (N'ManagementDashboard:View'), (N'ProjectDashboard:View')) k ([Key])
    WHERE r.[RightKey] = N'Dashboard:View'
      AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = k.[Key]);
    UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110082431_AudienceDashboards'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110082431_AudienceDashboards', N'10.0.13');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114537_ClientDashboard'
)
BEGIN
    CREATE TABLE [clients].[ClientStatusReport] (
        [Id] bigint NOT NULL IDENTITY,
        [ClientId] bigint NOT NULL,
        [Status] nvarchar(40) NOT NULL,
        [Summary] nvarchar(1000) NOT NULL,
        [NextReviewOn] date NULL,
        [RecordedById] bigint NULL,
        [RecordedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_ClientStatusReport] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ClientStatusReport_Client_ClientId] FOREIGN KEY ([ClientId]) REFERENCES [clients].[Client] ([Id]),
        CONSTRAINT [FK_ClientStatusReport_User_RecordedById] FOREIGN KEY ([RecordedById]) REFERENCES [iam].[User] ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114537_ClientDashboard'
)
BEGIN
    CREATE INDEX [IX_ClientStatusReport_ClientId_RecordedAt] ON [clients].[ClientStatusReport] ([ClientId], [RecordedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114537_ClientDashboard'
)
BEGIN
    CREATE INDEX [IX_ClientStatusReport_RecordedById] ON [clients].[ClientStatusReport] ([RecordedById]);
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114537_ClientDashboard'
)
BEGIN
    DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
    INSERT [iam].[RightDefinition] ([Key],[Label],[Description],[Module],[Feature],[Kind],[RiskLevel],[DisplayOrder],[IsActive],[CreatedAt],[UpdatedAt])
    SELECT N'ClientDashboard:View', N'View', N'View in Client dashboard. Data, ownership and scope checks still apply.', N'Dashboard', N'ClientDashboard', N'Access', N'Normal', 0, 1, @now, @now
    WHERE NOT EXISTS (SELECT 1 FROM [iam].[RightDefinition] d WHERE d.[Key] = N'ClientDashboard:View');
    INSERT [iam].[RoleRight] ([AppRoleId],[RightKey])
    SELECT r.[AppRoleId], N'ClientDashboard:View' FROM [iam].[RoleRight] r
    WHERE r.[RightKey] = N'ProjectDashboard:View'
      AND NOT EXISTS (SELECT 1 FROM [iam].[RoleRight] x WHERE x.[AppRoleId] = r.[AppRoleId] AND x.[RightKey] = N'ClientDashboard:View');
    DELETE FROM [iam].[RoleRight] WHERE [RightKey] = N'ProjectDashboard:View';
    UPDATE [iam].[UserRightException] SET [RightKey] = N'ClientDashboard:View' WHERE [RightKey] = N'ProjectDashboard:View';
    UPDATE [admin].[Setting] SET [Key] = N'Dashboard.ClientStatusMaxAgeDays',
        [Description] = N'A recorded client status older than this many days is shown as needing review (1–90).'
    WHERE [Key] = N'Dashboard.ProjectStatusMaxAgeDays'
      AND NOT EXISTS (SELECT 1 FROM [admin].[Setting] s WHERE s.[Key] = N'Dashboard.ClientStatusMaxAgeDays');
    UPDATE [iam].[AuthorizationVersion] SET [Version] = [Version] + 1 WHERE [Id] = 1;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110114537_ClientDashboard'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110114537_ClientDashboard', N'10.0.13');
END;

COMMIT;
GO

