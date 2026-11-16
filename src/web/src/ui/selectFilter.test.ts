import { describe, expect, it } from 'vitest';
import { filterItems, fold, listItem, stepActive } from './selectFilter';

const items = [
  listItem(0, '', '— Select —'),
  listItem(1, '1', 'Anna Müller (amueller)'),
  listItem(2, '2', 'Ben Carter (bcarter)', true),
  listItem(3, 'Cases:View', 'View cases — Cases:View', false, 'Cases'),
  listItem(4, 'Clients:Edit', 'Edit clients — Clients:Edit', false, 'Clients'),
];

describe('searchable dropdown filter (A118)', () => {
  it('ignores case and accents', () => {
    expect(fold('Müller ÉTÉ')).toBe('muller ete');
    expect(filterItems(items, 'MULLER').map(i => i.value)).toEqual(['1']);
  });

  it('keeps everything for an empty or blank query', () => {
    expect(filterItems(items, '')).toHaveLength(items.length);
    expect(filterItems(items, '   ')).toHaveLength(items.length);
  });

  it('needs every word, in any order, and also matches the group name', () => {
    expect(filterItems(items, 'carter ben').map(i => i.value)).toEqual(['2']);
    expect(filterItems(items, 'clients').map(i => i.value)).toEqual(['Clients:Edit']);
    expect(filterItems(items, 'cases edit')).toEqual([]);
  });

  it('moves the active option past disabled ones and stops at the ends', () => {
    expect(stepActive(items, 1, 1)).toBe(3);
    expect(stepActive(items, 3, -1)).toBe(1);
    expect(stepActive(items, 4, 1)).toBe(4);
    expect(stepActive(items, 0, -1)).toBe(0);
    expect(stepActive(items, -1, 1)).toBe(0);
    expect(stepActive(items, 0, 10)).toBe(4);
    expect(stepActive([listItem(0, 'x', 'X', true)], -1, 1)).toBe(-1);
  });
});
