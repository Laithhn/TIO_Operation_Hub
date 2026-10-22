<#
.SYNOPSIS
  On-demand backup of TIO Operations Hub: database (COPY_ONLY full backup) plus the attachment folder and the settings file.
  Scheduled backups belong in the SQL Server maintenance plan and the file-backup system (DEPLOYMENT-GUIDE.md, section 7).

.EXAMPLE
  .\Backup-TioHub.ps1 -SqlServer SQL01 -Database TioHub -BackupFolder '\\backup01\tiohub' -AttachmentsPath 'D:\TioHubData\attachments'
#>
param(
  [Parameter(Mandatory)][string]$SqlServer,
  [string]$Database = 'TioHub',
  [Parameter(Mandatory)][string]$BackupFolder,
  [string]$InstallRoot = 'C:\Apps\TioHub',
  [string]$AttachmentsPath = ''
)
$ErrorActionPreference = 'Stop'
if (-not $AttachmentsPath) { $AttachmentsPath = Join-Path $InstallRoot 'attachments' }
$stamp = Get-Date -Format 'yyyyMMdd-HHmm'
$target = Join-Path $BackupFolder $stamp
New-Item -ItemType Directory -Force $target | Out-Null

$bak = Join-Path $target "$Database.bak"
& sqlcmd -S $SqlServer -E -b -Q "BACKUP DATABASE [$Database] TO DISK = N'$bak' WITH INIT, COPY_ONLY, CHECKSUM"
if ($LASTEXITCODE -ne 0) { throw 'Database backup failed.' }
Write-Host "Database  -> $bak"

if (Test-Path $AttachmentsPath) {
  & robocopy $AttachmentsPath (Join-Path $target 'attachments') /E /R:2 /W:2 /NFL /NDL /NJH /NJS | Out-Null
  if ($LASTEXITCODE -ge 8) { throw 'Attachment copy failed.' }
  Write-Host "Files     -> $(Join-Path $target 'attachments')"
}
$settings = Join-Path $InstallRoot 'app\appsettings.Production.json'
if (Test-Path $settings) { Copy-Item $settings $target; Write-Host "Settings  -> $target\appsettings.Production.json" }
Write-Host 'Backup finished. Keep the database backup and the files of the same time together.' -ForegroundColor Green
