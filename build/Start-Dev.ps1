<#
  Starts an isolated local TIO Hub API instance for a named contributor/tool.
  Usage: .\build\Start-Dev.ps1 -Instance Codex
         .\build\Start-Dev.ps1 -Instance Claude -ApiPort 5194 -WebPort 5174
#>
param(
  [Parameter(Mandatory)]
  [ValidatePattern('^[A-Za-z][A-Za-z0-9_-]{0,19}$')]
  [string]$Instance,
  [ValidateRange(1024, 65535)] [int]$ApiPort = 5094,
  [ValidateRange(1024, 65535)] [int]$WebPort = 5173,
  [switch]$Web
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$escapedInstance = $Instance -replace "'", "''"
$env:ConnectionStrings__TioHub = "Server=(localdb)\MSSQLLocalDB;Database=TioHub_PortfolioDev_$escapedInstance;Trusted_Connection=True;TrustServerCertificate=True;Application Name=TIOHub-$Instance"
$env:ASPNETCORE_URLS = "http://127.0.0.1:$ApiPort"
$env:TIOHUB_API_URL = "http://127.0.0.1:$ApiPort"
$env:TIOHUB_WEB_PORT = "$WebPort"

if ($Web) {
  Push-Location "$root\src\web"
  try { npm run dev -- --host 127.0.0.1 }
  finally { Pop-Location }
} else {
  dotnet run --project "$root\src\TioHub.Api" --no-launch-profile
}
