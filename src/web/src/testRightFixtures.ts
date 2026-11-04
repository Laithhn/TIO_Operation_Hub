/** The rights a test user holds. Prerequisites are not added: a test that needs one names it, and these helpers add only what the tests of existing behavior assumed. */
export function testGrants(keys: string[]): string[] {
  const result = new Set(keys);
  if (keys.includes('ClientStructure:View')) for (const key of ['ClientStructure:Access', 'tab.ClientStructure.organizations:View']) result.add(key);
  if (keys.includes('Reporting:View')) for (const key of ['ReportLibrary:View', 'ReportLibrary:Export', 'ReportHistory:Create']) result.add(key);
  if (keys.some(key => key.endsWith(':Export'))) result.add('Platform:Export');
  if (keys.some(key => key.endsWith(':HistoryView'))) result.add('Platform:Audit');
  return [...result];
}
