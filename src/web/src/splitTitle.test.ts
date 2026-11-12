import { describe, expect, it } from 'vitest';
import { splitTitle } from './format';

// A105: long commitment and queue descriptions show a short title and the rest as a preview.
describe('splitTitle', () => {
  it('keeps a short text whole', () => {
    expect(splitTitle('Deliver the upgrade plan')).toEqual({ title: 'Deliver the upgrade plan', rest: '' });
  });

  it('takes the first sentence as the title', () => {
    expect(splitTitle('Deliver the upgrade plan to the client. It covers both regions and the DR site.'))
      .toEqual({ title: 'Deliver the upgrade plan to the client.', rest: 'It covers both regions and the DR site.' });
  });

  it('takes the first line as the title', () => {
    expect(splitTitle('Quarterly report\nWith the figures of every region')).toEqual({ title: 'Quarterly report', rest: 'With the figures of every region' });
  });

  it('cuts a long first sentence at a word and continues the rest', () => {
    const text = 'Provide the complete migration runbook covering every application server database listener and load balancer in both production regions';
    const { title, rest } = splitTitle(text, 60);
    expect(title.endsWith('…')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(61);
    expect(title).not.toMatch(/\s…$/);
    expect(rest.startsWith('…')).toBe(true);
    expect(title.slice(0, -1) + ' ' + rest.slice(1)).toBe(text);
  });

  it('copes with an empty text', () => {
    expect(splitTitle('')).toEqual({ title: '', rest: '' });
  });
});
