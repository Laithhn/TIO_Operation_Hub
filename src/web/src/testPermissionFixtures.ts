import manifest from './permissionManifest.json';

/** Explicit upgrade-era assignments for tests of pre-existing behavior. New-role tests use raw grants. */
export function legacyTestGrants(keys: string[]): string[] {
  const result = new Set(keys);
  if (keys.includes('ClientStructure:View')) result.add('tab.ClientStructure.organizations:View');
  if (keys.includes('Reporting:View')) for (const key of ['ReportLibrary:View', 'ReportLibrary:Export', 'ReportHistory:Create']) result.add(key);
  for (const key of [...result]) {
    let row = manifest.find(p => p.key === key);
    while (row?.parentKey) {
      result.add(row.parentKey);
      row = manifest.find(p => p.key === row!.parentKey);
    }
  }
  return [...result];
}
