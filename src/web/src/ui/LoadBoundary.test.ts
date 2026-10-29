import { describe, expect, it } from 'vitest';
import { isChunkError } from './LoadBoundary';

// UX-003: a chunk that cannot be downloaded offers Reload only (React.lazy keeps the failed import, so "Try again" would fail again).
describe('isChunkError', () => {
  it('recognizes the failed dynamic import messages of Chromium, Firefox and Safari, and Vite CSS preloads', () => {
    for (const m of [
      'Failed to fetch dynamically imported module: http://host/assets/Teams-abc.js',
      'error loading dynamically imported module: http://host/assets/Teams-abc.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/Teams-abc.css'
    ]) expect(isChunkError(new Error(m)), m).toBe(true);
  });

  it('treats rendering errors and non-errors as page failures', () => {
    expect(isChunkError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
    expect(isChunkError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkError(null)).toBe(false);
  });
});
