BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    DROP TABLE [clients].[ProjectStatusReport];
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[contracts].[Contract]') AND [c].[name] = N'SupportHours');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [contracts].[Contract] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [contracts].[Contract] ALTER COLUMN [SupportHours] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[contracts].[Contract]') AND [c].[name] = N'Obligations');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [contracts].[Contract] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [contracts].[Contract] ALTER COLUMN [Obligations] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [GpuCount] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [GpuMemoryQuantity] decimal(12,2) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [GpuMemoryUnit] nvarchar(40) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    ALTER TABLE [inventory].[Asset] ADD [GpuModel] nvarchar(200) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [admin].[__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261110131024_ServerGpuContractText'
)
BEGIN
    INSERT INTO [admin].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261110131024_ServerGpuContractText', N'10.0.13');
END;

COMMIT;
GO

