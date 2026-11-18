import type { FullConfig } from '@playwright/test';
import { spawnSync } from 'node:child_process';

// Global teardown (playwright.config.ts). Every run creates TioHub_E2E_<runner pid>_<guid> (80 MB on LocalDB); 187 had piled up by
// 18 Nov 2026. At the end of a run this drops:
//  - this run's database, read from the connection string the web server was started with;
//  - earlier per-run databases on the same server whose runner process has ended (runs that crashed, were stopped, or whose web
//    server never started, when Playwright skips the global teardown). A database of a run still going (its pid is alive) is kept.
// Never dropped: TIOHUB_E2E_DATABASE overrides (TioHub_E2E_Codex_*, reused on purpose) and anything else on the server.
// TIOHUB_E2E_KEEP_DATABASE=1 keeps everything, for looking at the data after a failure.
const perRun = /^TioHub_E2E_(\d+)_[0-9a-f]{32}$/;

const alive = (pid: number) => {
  try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === 'EPERM'; }
};

// No SQL client package in this folder: use the .NET SQL client through Windows PowerShell (the suite runs on Windows with Edge).
// Values travel in environment variables, never inside the script text; names are checked again on the server side.
function sql(server: string, mode: 'list' | 'drop', names: string[] = []) {
  const script = `
$ErrorActionPreference = 'Stop'
$b = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$b['Data Source'] = $env:E2E_SERVER; $b['Initial Catalog'] = 'master'; $b['Integrated Security'] = $true; $b['Connect Timeout'] = 60
$c = New-Object System.Data.SqlClient.SqlConnection $b.ConnectionString
$c.Open()
try {
  $cmd = $c.CreateCommand(); $cmd.CommandTimeout = 120
  if ($env:E2E_MODE -eq 'list') {
    $cmd.CommandText = "SELECT name FROM sys.databases WHERE name LIKE 'TioHub[_]E2E[_]%'"
    $r = $cmd.ExecuteReader(); while ($r.Read()) { $r.GetString(0) }; $r.Close()
  } else {
    foreach ($n in ($env:E2E_NAMES -split ',')) {
      if ($n -notmatch '^TioHub_E2E_[0-9]+_[0-9a-f]{32}$') { continue }
      $cmd.Parameters.Clear(); $cmd.Parameters.AddWithValue('@db', $n) | Out-Null
      $cmd.CommandText = "IF DB_ID(@db) IS NOT NULL BEGIN DECLARE @q nvarchar(400) = N'ALTER DATABASE ' + QUOTENAME(@db) + N' SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE ' + QUOTENAME(@db) + N';'; EXEC (@q); END"
      try { $cmd.ExecuteNonQuery() | Out-Null; "dropped $n" } catch { "failed $n : $($_.Exception.Message)" }
    }
  }
} finally { $c.Close() }`;
  const run = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, E2E_SERVER: server, E2E_MODE: mode, E2E_NAMES: names.join(',') }, encoding: 'utf8', timeout: 600_000
  });
  if (run.status !== 0) throw new Error(`${`${run.stderr ?? ''}`.trim() || run.error?.message || `exit ${run.status}`}`);
  return `${run.stdout ?? ''}`.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

export default async function dropE2eDatabases(config: FullConfig) {
  if (process.env.TIOHUB_E2E_KEEP_DATABASE === '1') { console.log('[e2e teardown] TIOHUB_E2E_KEEP_DATABASE=1: databases kept.'); return; }
  const connection = config.webServer?.env?.ConnectionStrings__TioHub ?? '';
  const server = /(?:^|;)\s*Server=([^;]+)/i.exec(connection)?.[1]?.trim();
  const own = /(?:^|;)\s*Database=([^;]+)/i.exec(connection)?.[1]?.trim() ?? '';
  if (!server) return;
  try {
    const names = sql(server, 'list').filter(n => {
      const m = perRun.exec(n);
      return !!m && (n === own || !alive(Number(m[1])));
    });
    if (!names.length) return;
    for (const line of sql(server, 'drop', names)) console.log(`[e2e teardown] ${line}`);
  } catch (e) {
    console.warn(`[e2e teardown] Could not drop E2E databases on ${server}: ${(e as Error).message}. Drop them by hand.`);
  }
}
