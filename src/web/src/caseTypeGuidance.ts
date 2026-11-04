/** A configured case type, as the reference data returns it. */
export type CaseTypeOption = { code: string; label: string; category?: string | null; isRetired: boolean };

/**
 * Guidance under the case type field. Case types are configured per installation, so the text names only the active types of the
 * Risk follow-up category, by their configured label. With no such type there is nothing accurate to say, and no guidance is shown.
 */
export function caseTypeGuidance(types: readonly CaseTypeOption[]): string | undefined {
  const risk = types.filter(t => !t.isRetired && t.category === 'RiskFollowUp').map(t => t.label);
  if (risk.length === 0) return undefined;
  const names = risk.length === 1 ? risk[0] : `${risk.slice(0, -1).join(', ')} or ${risk[risk.length - 1]}`;
  return `Use ${names} for risk actions; this does not imply formal risk acceptance.`;
}
