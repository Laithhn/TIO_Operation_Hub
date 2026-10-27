import type { Locator, Page } from '@playwright/test';

// Locators for the hub's tables (src/web/src/ui/kit.tsx DataTable): the framework toolbar and cards above a native table.
// The region named by the table caption ([data-vt-table]) holds the table; data rows are tr.vt-row (the details rows that
// phones show under a record are not), header cells th.vt-th, and the hub's cell spans .vt-cell[data-col].
type Scope = Page | Locator;

const TABLE = '[data-vt-table]';
const DATA_ROW = 'tr.vt-row';
const HEADER_CELL = 'th.vt-th';

/** A table by its caption (region name), or the first table in the scope. */
export const vtTable = (scope: Scope, name?: string | RegExp): Locator =>
  name === undefined ? scope.locator(TABLE).first() : scope.getByRole('region', { name, exact: typeof name === 'string' });

/** The data rows of every table in the scope. */
export const vtRows = (scope: Scope): Locator => scope.locator(DATA_ROW);

/** The data rows whose text matches. */
export const vtRow = (scope: Scope, name: string | RegExp): Locator => vtRows(scope).filter({ hasText: name });

/** The cells of a row (or of everything in the scope), in column order. */
export const vtCells = (scope: Scope): Locator => scope.locator('.vt-cell');

/** A column header by its label. Its button sorts the column; the header carries aria-sort while sorted. */
export const vtHeader = (scope: Scope, name: string | RegExp): Locator =>
  scope.locator(HEADER_CELL).filter({ hasText: name });

/** Opens the Filter card from the table toolbar (the column filters moved there from the header popovers). */
export async function openColumnFilter(scope: Scope, _header?: string, table?: Locator) {
  await (table ?? vtTable(scope)).getByRole('button', { name: /^Filter/ }).click();
}

/** Selectors for in-place use in locator chains (scope.locator(VT_ROW)), as the specs do. */
export const VT_ROW = DATA_ROW;
export const VT_CELL = '.vt-cell';
export const VT_HEADER = HEADER_CELL;

/** A text matcher for a whole cell (getByRole('cell', { name, exact: true }) did this). */
export const exactText = (text: string): RegExp => new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
