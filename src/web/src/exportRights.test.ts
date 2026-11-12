import { testGrants } from './testRightFixtures';
import { describe, expect, it } from 'vitest';
import type { Me } from './hooks';
import { canExportReport } from './exportRights';

const user = (rights: string[], exportGrant = true) => ({ rights: exportGrant ? testGrants(rights) : testGrants(rights).filter(key => key !== 'Platform:Export') } as unknown as Me);

describe('list export presentation policy', () => {
  it('requires a module export independently of the cross-cutting Export right', () => {
    expect(canExportReport(user(['Reporting:View', 'Cases:View']), 'cases')).toBe(false);
    expect(canExportReport(user(['Reporting:View', 'Cases:View', 'Cases:Export']), 'cases')).toBe(true);
    expect(canExportReport(user(['Reporting:View', 'Cases:View', 'Cases:Export'], false), 'cases')).toBe(false);
    expect(canExportReport(user(['Cases:View', 'Cases:Export']), 'cases')).toBe(false);
  });

  it('requires every source module for composite exports and fails closed for an unknown report', () => {
    const permissions = ['Reporting:View', 'Installations:View', 'Installations:Export', 'Products:View', 'Products:Export'];
    expect(canExportReport(user(permissions), 'versions')).toBe(true);
    expect(canExportReport(user(permissions.filter(key => key !== 'Products:Export')), 'versions')).toBe(false);
    expect(canExportReport(user(permissions), 'unknown-report')).toBe(false);
    expect(canExportReport(undefined, 'cases')).toBe(false);
  });
});
