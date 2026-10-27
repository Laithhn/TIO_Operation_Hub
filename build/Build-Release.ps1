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
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Release version must have the form major.minor.patch.' }
# Refuse a package whose deployment SQL omits any application migration, even when -SkipTests is used.
$schemaText = Get-Content -LiteralPath (Join-Path $root 'database\01-schema.sql') -Raw
$migrationSources = Get-ChildItem -LiteralPath (Join-Path $root 'src\TioHub.Api\Data\Migrations') -Filter '*.Designer.cs'
$migrationIds = @($migrationSources | Select-String -Pattern '\[Migration\("([^"]+)"\)\]' | ForEach-Object { $_.Matches[0].Groups[1].Value })
if ($migrationIds.Count -eq 0) { throw 'No application migrations found; cannot verify deployment SQL.' }
foreach ($migrationId in $migrationIds) {
  $insertPattern = 'INSERT INTO \[admin\]\.\[__EFMigrationsHistory\][^;]*VALUES\s*\(N''' + [regex]::Escape($migrationId) + ''''
  if (-not [regex]::IsMatch($schemaText, $insertPattern, [Text.RegularExpressions.RegexOptions]::Singleline)) {
    throw "Deployment SQL is missing migration $migrationId. Regenerate database/01-schema.sql before building a release."
  }
}
$releaseRoot = [IO.Path]::GetFullPath((Join-Path $root 'release'))
$out = [IO.Path]::GetFullPath((Join-Path $releaseRoot "TioHub-$version"))
if ((Split-Path $out -Parent) -ne $releaseRoot) { throw 'Release output must be directly inside the workspace release folder.' }
if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Recurse -Force }

$commit = [string](git -C $root rev-parse HEAD 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $commit) { $commit = 'unknown' }
$dirty = [bool](git -C $root status --porcelain)

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
if (Test-Path "$root\docs\RELEASE-NOTES-$version.md") { Copy-Item "$root\docs\RELEASE-NOTES-$version.md" "$out\RELEASE-NOTES.md" }
@"
TIO Operations Hub $version
Source commit: $commit
Working tree had uncommitted changes: $dirty
Built at (UTC): $([DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ'))
"@ | Set-Content "$out\BUILD-INFO.txt" -Encoding utf8

$zip = "$root\release\TioHub-$version.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$out\*" -DestinationPath $zip
$hash = (Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  TioHub-$version.zip" | Set-Content "$zip.sha256" -Encoding ascii
Write-Host "Release: $zip`nSHA-256: $hash" -ForegroundColor Green
