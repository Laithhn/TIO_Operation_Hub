/*
  TIO Operations Hub — application login and least-privilege permissions.
  Run once per database after 01-schema.sql, as a DBA. Replace the placeholder with the IIS application pool identity
  (for example DOMAIN\svc-tiohub$ for a gMSA, or IIS APPPOOL\TioHub on a single server). No passwords are used or stored:
  the application signs in to SQL Server with Windows integrated security.
*/
DECLARE @login sysname = N'$(AppPoolIdentity)';   -- sqlcmd variable: -v AppPoolIdentity="DOMAIN\svc-tiohub$"

IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = @login)
    EXEC (N'CREATE LOGIN ' + N'[' + @login + N'] FROM WINDOWS');
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = @login)
    EXEC (N'CREATE USER ' + N'[' + @login + N'] FOR LOGIN [' + @login + N']');

EXEC (N'ALTER ROLE db_datareader ADD MEMBER [' + @login + N']');
EXEC (N'ALTER ROLE db_datawriter ADD MEMBER [' + @login + N']');

-- NFR-03: the application may append audit entries but never change or remove them.
EXEC (N'DENY UPDATE, DELETE ON SCHEMA::[audit] TO [' + @login + N']');
-- Sequences used for readable references (CS-, CM-, HO-).
EXEC (N'GRANT UPDATE ON SCHEMA::[work] TO [' + @login + N']');
EXEC (N'GRANT UPDATE ON SCHEMA::[teams] TO [' + @login + N']');
-- Schema changes are applied by the DBA with 01-schema.sql, not by the application.
-- EXEC() accepts only variables and literals, so the database name is read into a variable first.
DECLARE @db sysname = DB_NAME();
EXEC (N'DENY ALTER ON DATABASE::[' + @db + N'] TO [' + @login + N']');
GO
