<#
.SYNOPSIS
  Installs TIO Operations Hub on a Windows Server with IIS and SQL Server (first installation).

.DESCRIPTION
  Run from the extracted release package (this script lives in <package>\deploy), in an elevated Windows PowerShell 5.1 or later.
  Steps: check prerequisites -> (optional) create the database, apply database\01-schema.sql and database\02-app-login.sql ->
  copy the application -> write appsettings.Production.json -> create the IIS application pool and site -> folder permissions ->
  start and check /api/health/ready.

  No secrets are used or written: SQL Server is reached with the application pool's Windows identity, and the first administrator
  is created in the browser with a one-time setup code that the application writes to App_Data\setup-code.txt.

.EXAMPLE
  # Prerequisite check only (changes nothing)
  .\Install-TioHub.ps1 -SqlServer SQL01 -CheckOnly

.EXAMPLE
  # Typical installation with a gMSA, an HTTPS certificate and database creation by a DBA-privileged installer
  .\Install-TioHub.ps1 -SqlServer SQL01 -Database TioHub -HostName tiohub.corp.example -CertificateThumbprint 0123ABCD... `
      -AppPoolIdentity 'CORP\svc-tiohub$' -CreateDatabase

.EXAMPLE
  # Database steps only (for the DBA, from any machine with sqlcmd)
  .\Install-TioHub.ps1 -SqlServer SQL01 -Database TioHub -AppPoolIdentity 'CORP\svc-tiohub$' -DatabaseOnly
#>
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$SqlServer,
  [string]$Database = 'TioHub',
  [string]$InstallRoot = 'C:\Apps\TioHub',
  [string]$SiteName = 'TioHub',
  [string]$HostName = '',
  [int]$Port = 443,
  [string]$CertificateThumbprint = '',
  [switch]$AllowHttp,
  # gMSA ('DOMAIN\svc-tiohub$') or a domain service account. Empty = the built-in pool identity 'IIS APPPOOL\<SiteName>' (single-server SQL only).
  [string]$AppPoolIdentity = '',
  [string]$AttachmentsPath = '',
  [ValidateSet('Forms', 'Windows')][string]$AuthMode = 'Forms',
  [string]$EnvironmentName = 'Production',
  [string]$MapTileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  [switch]$CreateDatabase,
  [switch]$DatabaseOnly,
  [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
$package = Split-Path $PSScriptRoot -Parent
$appSource = Join-Path $package 'app'
$dbSource = Join-Path $package 'database'
$poolIdentity = if ($AppPoolIdentity) { $AppPoolIdentity } else { "IIS APPPOOL\$SiteName" }
$appDir = Join-Path $InstallRoot 'app'
if (-not $AttachmentsPath) { $AttachmentsPath = Join-Path $InstallRoot 'attachments' }
$scheme = if ($AllowHttp -and -not $CertificateThumbprint) { 'http' } else { 'https' }
$bindPort = if ($scheme -eq 'http' -and $Port -eq 443) { 80 } else { $Port }
$hostPart = if ($HostName) { $HostName } else { 'localhost' }
$portPart = if (($scheme -eq 'https' -and $bindPort -eq 443) -or ($scheme -eq 'http' -and $bindPort -eq 80)) { '' } else { ":$bindPort" }
$siteUrl = "$($scheme)://$hostPart$portPart"

function Step($text) { Write-Host "`n== $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "  [ok]   $text" -ForegroundColor Green }
function Warn($text) { Write-Host "  [warn] $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "  [fail] $text" -ForegroundColor Red; $script:failed = $true }
function Sql([string[]]$sqlArgs) {
  # -r0 sends SQL errors (severity 11+) to the error stream, where they are shown; messages and "(n rows affected)" are dropped.
  # The exit code decides success, so PowerShell must not stop on the native error text itself.
  $ErrorActionPreference = 'Continue'
  & sqlcmd -S $SqlServer -E -b -r0 @sqlArgs | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "sqlcmd failed ($($sqlArgs -join ' '))" }
}
function Grant-AppLogin {
  # sqlcmd -v cannot pass a value with a space (IIS APPPOOL\TioHub, NT AUTHORITY\...), so the identity is written into a temporary copy.
  $login = Join-Path ([IO.Path]::GetTempPath()) "tiohub-app-login-$([guid]::NewGuid().ToString('N')).sql"
  (Get-Content (Join-Path $dbSource '02-app-login.sql') -Raw).Replace('$(AppPoolIdentity)', $poolIdentity.Replace("'", "''")) | Set-Content $login -Encoding UTF8
  try { Sql @('-d', $Database, '-i', $login) } finally { Remove-Item $login -ErrorAction SilentlyContinue }
  Ok "SQL login and least-privilege permissions for $poolIdentity"
}

# ---------------------------------------------------------------- prerequisites
Step 'Prerequisites'
$failed = $false
if (-not (Test-Path (Join-Path $appSource 'TioHub.Api.dll'))) { Fail "Run this script from the extracted package: $appSource\TioHub.Api.dll not found." }
else { Ok "Package: $package" }
if (-not (Test-Path (Join-Path $dbSource '01-schema.sql'))) { Fail 'database\01-schema.sql is missing from the package.' }

$needSql = $CreateDatabase -or $DatabaseOnly
if (Get-Command sqlcmd -ErrorAction SilentlyContinue) { Ok 'sqlcmd found' }
elseif ($needSql) { Fail 'sqlcmd is required for the database steps (install "Microsoft Command Line Utilities for SQL Server"), or let a DBA run them.' }
else { Warn 'sqlcmd not found: the DBA must run the database scripts (see DEPLOYMENT-GUIDE.md, step 3).' }

if (-not $DatabaseOnly) {
  $admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  if ($admin) { Ok 'Running elevated' } else { Fail 'Run this script in an elevated PowerShell (Run as administrator).' }
  if (Get-Service W3SVC -ErrorAction SilentlyContinue) { Ok 'IIS (W3SVC) installed' } else { Fail 'IIS is not installed (Server Manager: Web Server (IIS) role).' }
  # The Hosting Bundle installs the module under Program Files and records it in the registry (not in System32\inetsrv).
  $ancm = (Test-Path (Join-Path $env:ProgramFiles 'IIS\Asp.Net Core Module\V2\aspnetcorev2.dll')) -or
          (Test-Path 'HKLM:\SOFTWARE\Microsoft\IIS Extensions\IIS AspNetCore Module V2')
  if ($ancm) { Ok 'ASP.NET Core Module V2 installed' } else { Fail 'ASP.NET Core Hosting Bundle 10.0.x is not installed (ASP.NET Core Module V2 missing). Install it from Microsoft, then run "iisreset".' }
  $runtimes = if (Get-Command dotnet -ErrorAction SilentlyContinue) { & dotnet --list-runtimes 2>$null } else { @() }
  if ($runtimes | Where-Object { $_ -match '^Microsoft\.AspNetCore\.App 10\.' }) { Ok 'ASP.NET Core runtime 10 installed' }
  else { Fail 'ASP.NET Core runtime 10.0.x not found (it is part of the Hosting Bundle).' }
  if ($AuthMode -eq 'Windows') {
    $winAuth = Join-Path $env:windir 'System32\inetsrv\authsspi.dll'
    if (Test-Path $winAuth) { Ok 'IIS Windows Authentication installed' } else { Fail 'Auth mode Windows needs the IIS "Windows Authentication" role service.' }
  }
  if (-not $AllowHttp -and -not $CertificateThumbprint) { Fail 'Give -CertificateThumbprint of the HTTPS certificate (LocalMachine\My), or -AllowHttp for a test installation only.' }
  if ($CertificateThumbprint -and -not (Test-Path "Cert:\LocalMachine\My\$CertificateThumbprint")) { Fail "Certificate $CertificateThumbprint not found in LocalMachine\My." }
  if ($AllowHttp) { Warn 'HTTP only: sign-in cookies are not marked Secure. Use this for a test server only.' }
}
if ($failed) { throw 'Prerequisites are not met; nothing was changed.' }
if ($CheckOnly) { Write-Host "`nAll prerequisites met. Nothing was changed (-CheckOnly)." -ForegroundColor Green; return }

# ---------------------------------------------------------------- database
if ($needSql) {
  Step "Database $Database on $SqlServer"
  if ($PSCmdlet.ShouldProcess("$SqlServer/$Database", 'create database (if missing) and apply the schema')) {
    if ($CreateDatabase) {
      Sql @('-Q', "IF DB_ID(N'$Database') IS NULL BEGIN CREATE DATABASE [$Database]; ALTER DATABASE [$Database] SET RECOVERY FULL; END")
      Ok 'Database present (recovery model FULL for a new database)'
    }
    Sql @('-d', $Database, '-i', (Join-Path $dbSource '01-schema.sql'))
    Ok 'Schema applied (idempotent: applied migrations are skipped)'
  }
  if ($DatabaseOnly) {
    # The built-in pool identity exists only once IIS has created the pool, so the login is added later by the full installation.
    if (-not $AppPoolIdentity) { Warn "No -AppPoolIdentity: the login for $poolIdentity is created by the full installation, after its application pool exists." }
    elseif ($PSCmdlet.ShouldProcess("$SqlServer/$Database", "create the application login for $poolIdentity")) { Grant-AppLogin }
    Write-Host "`nDatabase steps done." -ForegroundColor Green; return
  }
} else {
  Step 'Database'
  Warn "Skipped (no -CreateDatabase). The DBA runs database\01-schema.sql and database\02-app-login.sql with AppPoolIdentity=$poolIdentity before the first start."
}

# ---------------------------------------------------------------- files
Step "Application files -> $appDir"
Import-Module WebAdministration
if (Test-Path "IIS:\Sites\$SiteName") { throw "Site $SiteName already exists. For an existing installation use Upgrade-TioHub.ps1." }
if ((Test-Path $appDir) -and (Get-ChildItem $appDir -Force | Select-Object -First 1)) {
  Warn "$appDir is not empty but no site exists yet: continuing an interrupted installation (files are copied again)."
}
if ($PSCmdlet.ShouldProcess($appDir, 'copy application files and write appsettings.Production.json')) {
  New-Item -ItemType Directory -Force $appDir, (Join-Path $appDir 'App_Data'), (Join-Path $appDir 'logs'), $AttachmentsPath | Out-Null
  Copy-Item (Join-Path $appSource '*') $appDir -Recurse -Force
  $settings = [ordered]@{
    ConnectionStrings = [ordered]@{ TioHub = "Server=$SqlServer;Database=$Database;Integrated Security=True;Encrypt=True;TrustServerCertificate=False;Application Name=TIO Operations Hub" }
    App = [ordered]@{ EnvironmentName = $EnvironmentName; MapTileUrl = $MapTileUrl }
    Auth = [ordered]@{ Mode = $AuthMode; SessionMinutes = 480; LockoutAttempts = 5; LockoutMinutes = 15; SetupCodeFile = 'App_Data/setup-code.txt' }
    Attachments = [ordered]@{ Path = $AttachmentsPath }
    Database = [ordered]@{ ApplyMigrationsOnStartup = $false; SeedReferenceData = $true; SeedDevelopmentData = $false }
    Quality = [ordered]@{ ScanMinutes = 5 }
  }
  $settings | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $appDir 'appsettings.Production.json') -Encoding UTF8
  Ok 'Files copied; appsettings.Production.json written (no secrets)'
}

# ---------------------------------------------------------------- IIS
Step "IIS application pool and site '$SiteName'"
if ($PSCmdlet.ShouldProcess($SiteName, 'create IIS application pool and site')) {
  if (Test-Path "IIS:\AppPools\$SiteName") { Warn "Application pool $SiteName exists (interrupted installation): it is reused and reconfigured." }
  else { New-WebAppPool -Name $SiteName | Out-Null }
  Set-ItemProperty "IIS:\AppPools\$SiteName" -Name managedRuntimeVersion -Value ''
  Set-ItemProperty "IIS:\AppPools\$SiteName" -Name processModel.loadUserProfile -Value $true
  Set-ItemProperty "IIS:\AppPools\$SiteName" -Name startMode -Value 'AlwaysRunning'
  if ($AppPoolIdentity) {
    # gMSA: no password. A normal service account needs its password entered in IIS Manager (never in this script).
    Set-ItemProperty "IIS:\AppPools\$SiteName" -Name processModel -Value @{ userName = $AppPoolIdentity; identityType = 3 }
    if (-not $AppPoolIdentity.EndsWith('$')) { Warn "Enter the password of $AppPoolIdentity in IIS Manager -> Application Pools -> $SiteName -> Advanced Settings -> Identity." }
  }
  $protocol = $scheme
  New-Website -Name $SiteName -PhysicalPath $appDir -ApplicationPool $SiteName -Port $bindPort -HostHeader $HostName -Ssl:($protocol -eq 'https') | Out-Null
  if ($protocol -eq 'https') {
    $binding = Get-WebBinding -Name $SiteName -Protocol https
    $binding.AddSslCertificate($CertificateThumbprint, 'My')
  }
  $anon = $AuthMode -eq 'Forms'
  Set-WebConfigurationProperty -PSPath 'IIS:\' -Location $SiteName -Filter 'system.webServer/security/authentication/anonymousAuthentication' -Name enabled -Value $anon
  if (Get-WebConfiguration -PSPath 'IIS:\' -Filter 'system.webServer/security/authentication/windowsAuthentication' -ErrorAction SilentlyContinue) {
    Set-WebConfigurationProperty -PSPath 'IIS:\' -Location $SiteName -Filter 'system.webServer/security/authentication/windowsAuthentication' -Name enabled -Value (-not $anon)
  }
  Ok "Site $siteUrl -> $appDir (pool identity $poolIdentity)"
}

# ---------------------------------------------------------------- SQL login (needs the pool: IIS APPPOOL\<name> exists only from now on)
if ($CreateDatabase) {
  Step "SQL login for $poolIdentity"
  if ($PSCmdlet.ShouldProcess("$SqlServer/$Database", "create the application login for $poolIdentity")) { Grant-AppLogin }
} else {
  Step 'SQL login'
  Warn "Not created (no -CreateDatabase). The DBA runs database-app-login.sql for $poolIdentity before the first start."
}

# ---------------------------------------------------------------- permissions
Step 'Folder permissions'
if ($PSCmdlet.ShouldProcess($InstallRoot, "grant $poolIdentity read on the application and modify on App_Data, logs and attachments")) {
  & icacls $appDir /grant "$($poolIdentity):(OI)(CI)RX" /T /Q | Out-Null
  foreach ($d in (Join-Path $appDir 'App_Data'), (Join-Path $appDir 'logs'), $AttachmentsPath) {
    & icacls $d /grant "$($poolIdentity):(OI)(CI)M" /T /Q | Out-Null
  }
  # App_Data holds the one-time setup code: only the pool identity, SYSTEM and administrators.
  & icacls (Join-Path $appDir 'App_Data') /inheritance:r /grant "$($poolIdentity):(OI)(CI)M" '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' /Q | Out-Null
  Ok 'Permissions set'
}

# ---------------------------------------------------------------- start and check
Step 'Start and health check'
if ($PSCmdlet.ShouldProcess($SiteName, 'start and check /api/health/ready')) {
  Start-WebAppPool -Name $SiteName -ErrorAction SilentlyContinue
  Start-Website -Name $SiteName -ErrorAction SilentlyContinue
  $url = "$siteUrl/api/health/ready"
  $ready = $false
  for ($i = 0; $i -lt 12 -and -not $ready; $i++) {
    try { $r = Invoke-RestMethod $url -UseBasicParsing -TimeoutSec 10; $ready = $r.status -eq 'ready' } catch { Start-Sleep -Seconds 5 }
  }
  if ($ready) { Ok "$url -> ready" } else { Warn "$url did not answer 'ready' yet. Check $appDir\logs and the Windows event log (IIS AspNetCore Module)." }
}

Write-Host @"

Installation finished.
Next (DEPLOYMENT-GUIDE.md, step 6):
  1. Open $siteUrl in a browser.
  2. Forms sign-in: a server administrator reads the one-time code from $appDir\App_Data\setup-code.txt,
     enters it and creates the first administrator account. The file is deleted afterwards.
  3. Create users under Administration -> Users & access and give each a temporary password.
"@ -ForegroundColor Green
