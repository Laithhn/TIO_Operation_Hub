// A118: the filtering behind the searchable dropdown list (ui/SelectSearch.tsx). Kept free of the DOM so it can be unit tested.

/** One option of a native <select>, as the list shows it. `index` is the option's position in select.options. */
export type ListItem = { index: number; value: string; label: string; group?: string; disabled: boolean; search: string };

/** Lower case without accents, so "Muller" finds "Müller" and "client" finds "Client". */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const listItem = (index: number, value: string, label: string, disabled = false, group?: string): ListItem =>
  ({ index, value, label, group, disabled, search: fold(group ? `${label} ${group}` : label) });

/** Every word typed must appear somewhere in the option text or its group name, in any order. An empty query keeps everything. */
export function filterItems(items: ListItem[], query: string): ListItem[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return words.length ? items.filter(it => words.every(w => it.search.includes(w))) : items;
}

/** The next selectable item `step` places away from `from` (negative moves up), skipping disabled ones; stays put at the ends. */
export function stepActive(items: ListItem[], from: number, step: number): number {
  const dir = step < 0 ? -1 : 1;
  for (let i = Math.max(0, Math.min(items.length - 1, from + step)); i >= 0 && i < items.length; i += dir) if (!items[i].disabled) return i;
  return from >= 0 && from < items.length && !items[from].disabled ? from : items.findIndex(it => !it.disabled);
}
