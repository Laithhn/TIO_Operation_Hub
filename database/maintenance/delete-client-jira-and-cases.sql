/*
  Delete one client's imported Jira tickets and ALL of that client's cases.

  PERMANENT once applied. Take a backup of the target database first, and try it on a restored copy.

  HOW TO RUN
    1. Set @ClientCode below and run as is. @Apply = 0 performs every delete, reports the counts and rolls
       everything back, so the numbers and any constraint errors are real and nothing changes.
    2. Review the output. To delete, set @Apply = 1 and @ConfirmDatabase to the name of this database.
    Stop the application first, or at least pause the client's Jira spaces (see "AFTERWARDS").

  DELETED
    - Jira:  JiraCaseMapping (the imported tickets), JiraComment, JiraActivity, JiraIntegrationIssue and
             JiraSpaceSyncState (the sync checkpoint) for this client.
    - Cases: every case whose ClientId is this client, whether it came from Jira or was entered by hand,
             with its events, comments, waiting intervals, Jira references, environment, server and component
             links, attachment rows, reviews, document references, data-quality items and notifications.

  CHANGED
    - Commitments and escalations linked to these cases are KEPT and unlinked (CaseId = NULL).
    - One AuditEntry per deleted case, plus one summary entry on the client.

  NOT TOUCHED
    - The client, its contracts, environments and projects; cases of its sub-clients.
    - Jira setup: JiraConnection, JiraCredential, ClientJiraSettings, ClientJiraSpace, JiraUserMapping and the
      JiraSyncRun history.
    - Handover history (HandoverItem keeps its label, as when the application deletes a case).

  AFTERWARDS
    - Attachment FILES live on disk, not in SQL. The last result set lists their StoredPath values; remove those
      files from the attachment storage folder by hand after an applied run.
    - RE-IMPORT: the application normally keeps a mapping so a deleted case does not come back (A76). This script
      removes the mappings and the checkpoint, so while a space stays enabled the NEXT SYNC IMPORTS ITS TICKETS
      AGAIN as new cases. To keep them out, disable or release the client's spaces before restarting the application.
*/
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @ClientCode      nvarchar(50)  = N'';   -- [clients].[Client].[Code] of the client
DECLARE @Apply           bit           = 0;     -- 0 = report and roll back; 1 = delete
DECLARE @ConfirmDatabase sysname       = N'';   -- with @Apply = 1, must equal the current database name

DECLARE @ClientId bigint, @ClientName nvarchar(150), @Message nvarchar(1000), @Rows int;
DECLARE @Now datetimeoffset(3) = SYSDATETIMEOFFSET();
DECLARE @Actor nvarchar(200) = SUSER_SNAME();

-- Table variables survive the rollback of a report-only run.
DECLARE @Result TABLE (Seq int IDENTITY PRIMARY KEY, Item nvarchar(100) NOT NULL, [Rows] int NOT NULL);
DECLARE @CaseList TABLE (CaseId bigint PRIMARY KEY, Ref nvarchar(20) NOT NULL, Title nvarchar(200) NOT NULL, [Status] nvarchar(40) NOT NULL, Origin nvarchar(120) NOT NULL);
DECLARE @Files TABLE (StoredPath nvarchar(100) NOT NULL, [FileName] nvarchar(255) NOT NULL, RecordId bigint NOT NULL);

---------------------------------------------------------------------------------------------------------------
-- Guards: nothing has changed if any of these stops the script.
---------------------------------------------------------------------------------------------------------------
IF @ClientCode IS NULL OR LTRIM(RTRIM(@ClientCode)) = N''
    THROW 50001, N'Set @ClientCode to the code of the client.', 1;

SELECT @ClientId = [Id], @ClientName = [Name] FROM [clients].[Client] WHERE [Code] = @ClientCode;
IF @ClientId IS NULL
BEGIN
    SET @Message = CONCAT(N'No client has the code "', @ClientCode, N'".');
    THROW 50002, @Message, 1;
END;

IF @Apply = 1 AND (@ConfirmDatabase IS NULL OR @ConfirmDatabase <> DB_NAME())
BEGIN
    SET @Message = CONCAT(N'@Apply = 1 needs @ConfirmDatabase = N''', DB_NAME(), N'''. Check this is the database you mean to change.');
    THROW 50003, @Message, 1;
END;

IF EXISTS (SELECT 1 FROM [jira].[JiraSpaceSyncState] s
           JOIN [jira].[ClientJiraSpace] sp ON sp.[Id] = s.[ClientJiraSpaceId]
           WHERE sp.[ClientId] = @ClientId AND s.[LeaseUntil] > @Now)
    THROW 50004, N'A Jira sync is running for this client. Wait for it to finish, or stop the application, and run again.', 1;

CREATE TABLE #Cases (Id bigint NOT NULL PRIMARY KEY);
CREATE TABLE #Mappings (
    Id bigint NOT NULL PRIMARY KEY,
    JiraConnectionId bigint NOT NULL,
    JiraIssueId nvarchar(40) COLLATE DATABASE_DEFAULT NOT NULL);

BEGIN TRY
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRANSACTION;

    INSERT #Cases (Id) SELECT [Id] FROM [work].[Case] WHERE [ClientId] = @ClientId;

    INSERT #Mappings (Id, JiraConnectionId, JiraIssueId)
    SELECT m.[Id], m.[JiraConnectionId], m.[JiraIssueId]
    FROM [jira].[JiraCaseMapping] m
    WHERE m.[ClientId] = @ClientId OR m.[CaseId] IN (SELECT Id FROM #Cases);

    INSERT @CaseList (CaseId, Ref, Title, [Status], Origin)
    SELECT c.[Id], c.[Ref], c.[Title], c.[Status],
           COALESCE((SELECT TOP (1) CONCAT(N'Jira ', m.[Source], N': ', m.[IssueKey]) FROM [jira].[JiraCaseMapping] m WHERE m.[CaseId] = c.[Id]), N'Entered by hand')
    FROM [work].[Case] c JOIN #Cases x ON x.Id = c.[Id];

    -- References to a case by record type and id (no foreign key). Same set as the application's Deletion.RunAsync.
    DELETE a OUTPUT deleted.[StoredPath], deleted.[FileName], deleted.[RecordId] INTO @Files (StoredPath, [FileName], RecordId)
    FROM [files].[Attachment] a JOIN #Cases x ON x.Id = a.[RecordId] WHERE a.[RecordType] = N'Case';
    INSERT @Result VALUES (N'Case attachment rows (files stay on disk)', @@ROWCOUNT);

    DELETE r FROM [quality].[Review] r JOIN #Cases x ON x.Id = r.[RecordId] WHERE r.[RecordType] = N'Case';
    INSERT @Result VALUES (N'Case reviews', @@ROWCOUNT);

    DELETE r FROM [quality].[DocumentReference] r JOIN #Cases x ON x.Id = r.[RecordId] WHERE r.[RecordType] = N'Case';
    INSERT @Result VALUES (N'Case document references', @@ROWCOUNT);

    DELETE r FROM [quality].[DataQualityItem] r JOIN #Cases x ON x.Id = r.[RecordId] WHERE r.[RecordType] = N'Case';
    INSERT @Result VALUES (N'Case data-quality items', @@ROWCOUNT);

    DELETE n FROM [notify].[Notification] n JOIN #Cases x ON n.[Link] = CONCAT(N'/cases/', x.Id);
    INSERT @Result VALUES (N'Case notifications', @@ROWCOUNT);

    -- What a case owns.
    DELETE r FROM [work].[CaseEnvironment] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case environment links', @@ROWCOUNT);

    DELETE r FROM [work].[CaseAsset] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case server links', @@ROWCOUNT);

    DELETE r FROM [work].[CaseComponent] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case component links', @@ROWCOUNT);

    DELETE r FROM [work].[CaseWaitingInterval] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case waiting intervals', @@ROWCOUNT);

    DELETE r FROM [work].[CaseEvent] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case events', @@ROWCOUNT);

    DELETE r FROM [work].[CaseComment] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case comments', @@ROWCOUNT);

    DELETE r FROM [work].[JiraReference] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Case Jira references', @@ROWCOUNT);

    -- Records that outlive the case: kept and unlinked.
    UPDATE r SET [CaseId] = NULL FROM [work].[Commitment] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Commitments kept and unlinked', @@ROWCOUNT);

    UPDATE r SET [CaseId] = NULL FROM [work].[Escalation] r JOIN #Cases x ON x.Id = r.[CaseId];
    INSERT @Result VALUES (N'Escalations kept and unlinked', @@ROWCOUNT);

    -- Imported Jira data.
    DELETE r FROM [jira].[JiraComment] r
    WHERE r.[CaseId] IN (SELECT Id FROM #Cases)
       OR EXISTS (SELECT 1 FROM #Mappings m WHERE m.JiraConnectionId = r.[JiraConnectionId] AND m.JiraIssueId = r.[JiraIssueId]);
    INSERT @Result VALUES (N'Imported Jira comments', @@ROWCOUNT);

    DELETE r FROM [jira].[JiraActivity] r
    WHERE r.[CaseId] IN (SELECT Id FROM #Cases)
       OR EXISTS (SELECT 1 FROM #Mappings m WHERE m.JiraConnectionId = r.[JiraConnectionId] AND m.JiraIssueId = r.[JiraIssueId]);
    INSERT @Result VALUES (N'Imported Jira activity', @@ROWCOUNT);

    DELETE r FROM [jira].[JiraIntegrationIssue] r
    WHERE r.[ClientId] = @ClientId OR r.[CaseId] IN (SELECT Id FROM #Cases) OR r.[CandidateCaseId] IN (SELECT Id FROM #Cases);
    INSERT @Result VALUES (N'Jira integration issues', @@ROWCOUNT);

    DELETE r FROM [jira].[JiraCaseMapping] r JOIN #Mappings m ON m.Id = r.[Id];
    INSERT @Result VALUES (N'Imported Jira tickets (mappings)', @@ROWCOUNT);

    DELETE s FROM [jira].[JiraSpaceSyncState] s JOIN [jira].[ClientJiraSpace] sp ON sp.[Id] = s.[ClientJiraSpaceId] WHERE sp.[ClientId] = @ClientId;
    INSERT @Result VALUES (N'Jira sync checkpoints', @@ROWCOUNT);

    -- The cases themselves.
    DELETE c FROM [work].[Case] c JOIN #Cases x ON x.Id = c.[Id];
    SET @Rows = @@ROWCOUNT;
    INSERT @Result VALUES (N'Cases', @Rows);

    -- Change history, as the application records a deletion.
    INSERT [audit].[AuditEntry] ([At], [UserId], [UserName], [Action], [Category], [EntityType], [EntityId], [EntityLabel], [ClientId], [Reason])
    SELECT @Now, NULL, @Actor, N'Remove', N'Business', N'Case', l.CaseId, l.Ref, @ClientId, N'Deleted by maintenance script delete-client-jira-and-cases.sql'
    FROM @CaseList l;

    INSERT [audit].[AuditEntry] ([At], [UserId], [UserName], [Action], [Category], [EntityType], [EntityId], [EntityLabel], [ClientId], [Reason])
    SELECT @Now, NULL, @Actor, N'JiraDataDeleted', N'Business', N'Client', @ClientId, @ClientCode, @ClientId,
           CONCAT(N'Maintenance script delete-client-jira-and-cases.sql deleted ', @Rows, N' cases and ', COUNT(*), N' imported Jira tickets.')
    FROM #Mappings;

    IF @Apply = 1 COMMIT TRANSACTION; ELSE ROLLBACK TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    DROP TABLE IF EXISTS #Cases, #Mappings;
    THROW;
END CATCH;

DROP TABLE IF EXISTS #Cases, #Mappings;

---------------------------------------------------------------------------------------------------------------
-- Report
---------------------------------------------------------------------------------------------------------------
SELECT CASE WHEN @Apply = 1 THEN N'APPLIED: the rows below were changed.' ELSE N'REPORT ONLY: rolled back, nothing changed.' END AS Outcome,
       DB_NAME() AS [Database], @ClientCode AS ClientCode, @ClientName AS ClientName;

SELECT Item, [Rows] FROM @Result ORDER BY Seq;

SELECT COUNT(*) AS SubClientCasesNotTouched
FROM [work].[Case] c JOIN [clients].[Client] sub ON sub.[Id] = c.[ClientId] WHERE sub.[ParentClientId] = @ClientId;

SELECT Ref, Title, [Status], Origin FROM @CaseList ORDER BY CaseId;

SELECT StoredPath, [FileName], RecordId AS CaseId FROM @Files ORDER BY RecordId;
