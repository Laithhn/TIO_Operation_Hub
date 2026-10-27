import type { Locator, Page } from '@playwright/test';

// Locators for the hub's tables on the VtWebGuiFramework 4 DataTable (src/web/src/ui/kit.tsx DataTable).
// The framework table is a virtualized grid of div elements without table roles, so the tests address it by
// the hub's hooks: the region named by the table caption ([data-vt-table]), the framework's dataset parts (rows),
// its header cells, and the hub's cell spans (.vt-cell[data-col]).
type Scope = Page | Locator;

const TABLE = '[data-vt-table]';
const DATASET = '[class*="datasetPart__datasetPart"]';
const HEADER_CELL = '[class*="headerCell__headerCell"]';

/** A table by its caption (region name), or the first table in the scope. */
export const vtTable = (scope: Scope, name?: string | RegExp): Locator =>
  name === undefined ? scope.locator(TABLE).first() : scope.getByRole('region', { name, exact: typeof name === 'string' });

/** The data rows (dataset parts without header cells) of every table in the scope. */
export const vtRows = (scope: Scope): Locator => scope.locator(`${DATASET}:not(:has(${HEADER_CELL}))`);

/** The data rows whose text matches, as getByRole('row', { name }) did. */
export const vtRow = (scope: Scope, name: string | RegExp): Locator => vtRows(scope).filter({ hasText: name });

/** The cells of a row (or of everything in the scope), in column order. */
export const vtCells = (scope: Scope): Locator => scope.locator('.vt-cell');

/** A header cell by its label. A click sorts the column (framework sortOrder arrows). */
export const vtHeader = (scope: Scope, name: string | RegExp): Locator =>
  scope.locator(HEADER_CELL).filter({ hasText: name });

/** Opens the Filter card from the table toolbar (the column filters moved there from the header popovers). */
export async function openColumnFilter(scope: Scope, _header?: string, table?: Locator) {
  await (table ?? vtTable(scope)).getByRole('button', { name: /^Filter/ }).click();
}

/** Selectors for in-place use in locator chains (scope.locator(VT_ROW)), as the migrated specs do. */
// No table-ancestor prefix: inside a locator scoped to a table, Playwright does not match the scope element itself.
// The framework classes only occur inside DataTables.
export const VT_ROW = `${DATASET}:not(:has(${HEADER_CELL}))`;
export const VT_CELL = '.vt-cell';
export const VT_HEADER = HEADER_CELL;

/** A text matcher for a whole cell (getByRole('cell', { name, exact: true }) did this). */
export const exactText = (text: string): RegExp => new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
