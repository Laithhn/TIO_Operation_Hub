<#
.SYNOPSIS
  Upgrades an existing TIO Operations Hub installation in place, keeping its data, settings, attachments and logs.

.DESCRIPTION
  Run from the extracted NEW release package (this script lives in <package>\deploy), elevated.
  Steps: full COPY_ONLY database backup -> apply database\01-schema.sql (idempotent) -> stop the site -> keep the current
  application folder as app.previous (rollback) -> copy the new files, keeping appsettings.Production.json, App_Data and logs ->
  start -> check /api/health/ready.
  Never deletes data. Rollback: see DEPLOYMENT-GUIDE.md, section 8.

.EXAMPLE
  .\Upgrade-TioHub.ps1 -SqlServer SQL01 -Database TioHub -BackupFolder '\\backup01\sql\TioHub' -Url https://tiohub.corp.example
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$SqlServer,
  [string]$Database = 'TioHub',
  [string]$InstallRoot = 'C:\Apps\TioHub',
  [string]$SiteName = 'TioHub',
  # Folder the SQL Server service account can write to (a path on the SQL Server machine or a share).
  [Parameter(Mandatory)][string]$BackupFolder,
  [string]$Url = 'https://localhost',
  # The DBA has already backed up the database and applied 01-schema.sql.
  [switch]$SkipDatabase
)
$ErrorActionPreference = 'Stop'
$package = Split-Path $PSScriptRoot -Parent
$appSource = Join-Path $package 'app'
$appDir = Join-Path $InstallRoot 'app'
$previous = Join-Path $InstallRoot 'app.previous'
$keep = @('appsettings.Production.json', 'App_Data', 'logs')
function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  [ok]   $text" -ForegroundColor Green }

# Complete IIS/elevation preflight before backing up or changing the database.
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Open Windows PowerShell using Run as administrator, then run this upgrade again. No database or application files have been changed.'
}
Import-Module WebAdministration -ErrorAction Stop
if (-not (Test-Path -LiteralPath "IIS:\Sites\$SiteName")) { throw "IIS site '$SiteName' was not found. No database or application files have been changed." }
if (-not (Test-Path -LiteralPath "IIS:\AppPools\$SiteName")) { throw "IIS application pool '$SiteName' was not found. No database or application files have been changed." }

$version = (Get-Item (Join-Path $appSource 'TioHub.Api.dll')).VersionInfo.ProductVersion -replace '\+.*$', ''
$current = if (Test-Path (Join-Path $appDir 'TioHub.Api.dll')) { (Get-Item (Join-Path $appDir 'TioHub.Api.dll')).VersionInfo.ProductVersion -replace '\+.*$', '' } else { $null }
if (-not $current) { throw "No installation found in $appDir. Use Install-TioHub.ps1 for a first installation." }
Write-Host "Upgrading $current -> $version" -ForegroundColor Cyan

if (-not $SkipDatabase) {
  if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) { throw 'sqlcmd is required (or let the DBA run the backup and schema script and use -SkipDatabase).' }
  Step 'Database backup'
  $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
  $bak = Join-Path $BackupFolder "$($Database)_before_$($version)_$stamp.bak"
  if ($PSCmdlet.ShouldProcess($bak, 'BACKUP DATABASE (COPY_ONLY)')) {
    & sqlcmd -S $SqlServer -E -b -Q "BACKUP DATABASE [$Database] TO DISK = N'$bak' WITH INIT, COPY_ONLY, CHECKSUM"
    if ($LASTEXITCODE -ne 0) { throw 'Backup failed; nothing was changed.' }
    Ok $bak
  }
  Step 'Database schema'
  if ($PSCmdlet.ShouldProcess("$SqlServer/$Database", 'apply 01-schema.sql')) {
    & sqlcmd -S $SqlServer -d $Database -E -b -i (Join-Path $package 'database\01-schema.sql')
    if ($LASTEXITCODE -ne 0) { throw "Schema script failed. The application was not touched; restore $bak if needed." }
    Ok 'Schema up to date'
  }
}

Step 'Application files'
if ($PSCmdlet.ShouldProcess($appDir, "replace application files (keeping $($keep -join ', '))")) {
  Stop-Website -Name $SiteName -ErrorAction SilentlyContinue
  Stop-WebAppPool -Name $SiteName -ErrorAction SilentlyContinue
  for ($i = 0; $i -lt 30 -and (Get-WebAppPoolState -Name $SiteName).Value -ne 'Stopped'; $i++) { Start-Sleep -Seconds 1 }
  if (Test-Path $previous) { Remove-Item $previous -Recurse -Force }
  Copy-Item $appDir $previous -Recurse
  Ok "Previous version kept in $previous"
  Get-ChildItem $appDir -Force | Where-Object { $_.Name -notin $keep } | Remove-Item -Recurse -Force
  Get-ChildItem $appSource -Force | Where-Object { $_.Name -ne 'appsettings.Production.json' } | Copy-Item -Destination $appDir -Recurse -Force
  Ok "Version $version copied"
  Start-WebAppPool -Name $SiteName
  Start-Website -Name $SiteName
}

Step 'Health check'
if ($WhatIfPreference) {
  Write-Host 'WhatIf: readiness verification is skipped because no upgrade was applied.'
  return
}
$ready = $false
for ($i = 0; $i -lt 12 -and -not $ready; $i++) {
  try { $r = Invoke-RestMethod "$Url/api/health/ready" -UseBasicParsing -TimeoutSec 10; $ready = $r.status -eq 'ready' } catch { Start-Sleep -Seconds 5 }
}
if ($ready) { Ok "$Url/api/health/ready -> ready. Upgrade to $version finished." }
else { throw "Upgrade verification failed: application is not ready. Check $appDir\logs for database availability or missing migrations. To roll back: stop the site, replace $appDir with $previous (keep App_Data and logs), start." }
