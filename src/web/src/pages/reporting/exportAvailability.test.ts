import { describe, expect, it } from 'vitest';
import { exportAvailability } from './exportAvailability';

// TIO-BUG-005: a masked export explains itself safely and points to a new report; an available one is unchanged.
describe('exportAvailability', () => {
  const job = (detailsAvailability: string | undefined, builder = false) => ({ detailsAvailability, report: 'cases', builder });

  it('an available export is not masked and offers no guidance', () => {
    expect(exportAvailability(job('Available'), true)).toEqual({ masked: false, short: '', message: '' });
    expect(exportAvailability(job(undefined), true).masked).toBe(false); // older servers send no category
  });

  it('access changed: explains and points to the catalog report set-up, navigation only', () => {
    const a = exportAvailability(job('AccessChanged'), true);
    expect(a.masked).toBe(true);
    expect(a.message).toMatch(/access has changed/);
    expect(a.message).toMatch(/configure the report again/);
    expect(a.regenerateTo).toBe('/reporting-center/library?report=cases');
  });

  it('a builder export points to the builder; a legacy export says why', () => {
    const a = exportAvailability(job('LegacyExport', true), true);
    expect(a.short).toBe('Unavailable: older export');
    expect(a.regenerateTo).toBe('/reporting-center/builder/cases');
  });

  it('without the right to run the report, no set-up link and no invitation to regenerate', () => {
    const a = exportAvailability(job('AccessChanged'), false);
    expect(a.masked).toBe(true);
    expect(a.regenerateTo).toBeUndefined();
    expect(a.message).not.toMatch(/configure/i);
  });

  it("another person's export offers no recovery and reveals nothing about it", () => {
    const a = exportAvailability(job('OtherOwner'), true);
    expect(a.regenerateTo).toBeUndefined();
    expect(a.message).toBe('This export was generated for another person. Only they can see its details and download it.');
  });

  it('an unknown category still fails closed with a neutral text', () => {
    expect(exportAvailability(job('SomethingNew'), true)).toMatchObject({ masked: true, short: 'Details unavailable' });
  });
});
