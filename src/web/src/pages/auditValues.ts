/**
 * TIO-BUG-002: audit change values are JSON. JSON.parse rounds an integer beyond 2^53, so a stored
 * -9223372036854774808 would be shown as -9223372036854775000. Where the browser gives the reviver the
 * number's source text (JSON.parse source text access), such an integer is kept as that exact text.
 * New audit entries already write those values as text; this keeps older entries readable as stored.
 */
export function parseExactJson(json: string): unknown {
  const exact = (_k: string, v: unknown, ctx?: { source?: string }) =>
    typeof v === 'number' && Number.isInteger(v) && !Number.isSafeInteger(v) && ctx?.source ? ctx.source : v;
  return JSON.parse(json, exact as (this: unknown, key: string, value: unknown) => unknown);
}
