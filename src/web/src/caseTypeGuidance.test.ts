import { describe, expect, it } from 'vitest';
import { caseTypeGuidance } from './caseTypeGuidance';

const incident = { code: 'Incident', label: 'Incident', category: 'Incident', isRetired: false };

describe('caseTypeGuidance', () => {
  it('names the active risk type by its configured label', () => {
    const guidance = caseTypeGuidance([incident, { code: 'RiskAction', label: 'Risk action', category: 'RiskFollowUp', isRetired: false }]);
    expect(guidance).toBe('Use Risk action for risk actions; this does not imply formal risk acceptance.');
  });

  it('says nothing when no active type belongs to the risk category', () => {
    expect(caseTypeGuidance([incident])).toBeUndefined();
    expect(caseTypeGuidance([])).toBeUndefined();
  });

  it('does not offer a retired risk type', () => {
    expect(caseTypeGuidance([incident, { code: 'RiskFollowUp', label: 'Risk follow-up', category: 'RiskFollowUp', isRetired: true }])).toBeUndefined();
  });

  it('lists every active risk type', () => {
    const guidance = caseTypeGuidance([
      { code: 'A', label: 'Risk A', category: 'RiskFollowUp', isRetired: false },
      { code: 'B', label: 'Risk B', category: 'RiskFollowUp', isRetired: false },
      { code: 'C', label: 'Risk C', category: 'RiskFollowUp', isRetired: false }
    ]);
    expect(guidance).toContain('Risk A, Risk B or Risk C');
  });
});
