<#
  Builds a release package: tests, front end, API publish, database scripts and docs.
  Output: release\TioHub-<version>.zip and release\TioHub-<version>.zip.sha256
  Usage: .\build\Build-Release.ps1 [-SkipTests]
#>
param([switch]$SkipTests)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

[xml]$props = Get-Content "$root\Directory.Build.props"
$version = $props.Project.PropertyGroup.Version
$out = "$root\release\TioHub-$version"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }

$node = "$root\.tools\node"
if (Test-Path "$node\node.exe") { $env:PATH = "$node;$env:PATH" }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node.js 22 is required (install it, or place it in .tools\node).' }

Write-Host "== Front end" -ForegroundColor Cyan
Push-Location "$root\src\web"
npm ci --no-audit --no-fund; if ($LASTEXITCODE) { throw 'npm ci failed' }
npm run build; if ($LASTEXITCODE) { throw 'front-end build failed' }
Pop-Location

if (-not $SkipTests) {
  Write-Host "== Tests (SQL Server LocalDB, or TIOHUB_TEST_SQL)" -ForegroundColor Cyan
  dotnet test "$root\tests\TioHub.Tests" -c Release; if ($LASTEXITCODE) { throw 'tests failed' }
}

Write-Host "== Publish API" -ForegroundColor Cyan
dotnet publish "$root\src\TioHub.Api" -c Release -r win-x64 --self-contained false -o "$out\app"; if ($LASTEXITCODE) { throw 'publish failed' }
foreach ($f in 'appsettings.Development.json') { Remove-Item "$out\app\$f" -ErrorAction SilentlyContinue }

New-Item -ItemType Directory -Force "$out\database", "$out\docs", "$out\deploy" | Out-Null
Copy-Item "$root\database\*.sql" "$out\database"
Copy-Item "$root\docs\*" "$out\docs" -Recurse
Copy-Item "$root\deploy\*" "$out\deploy"
Copy-Item "$root\README.md" $out
Copy-Item "$root\docs\DEPLOYMENT-GUIDE.md" $out

$zip = "$root\release\TioHub-$version.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$out\*" -DestinationPath $zip
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  TioHub-$version.zip" | Set-Content "$zip.sha256" -Encoding ascii
Write-Host "Release: $zip`nSHA-256: $hash" -ForegroundColor Green
