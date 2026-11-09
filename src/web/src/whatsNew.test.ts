import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { WHATS_NEW } from './whatsNew';

describe("what's new", () => {
  it('has an entry for the version being built, at the top', () => {
    expect(WHATS_NEW[0].version).toBe(pkg.version);
  });

  it('never repeats a version or leaves one empty', () => {
    expect(new Set(WHATS_NEW.map(r => r.version)).size).toBe(WHATS_NEW.length);
    for (const r of WHATS_NEW) expect(r.changes.length).toBeGreaterThan(0);
  });
});
