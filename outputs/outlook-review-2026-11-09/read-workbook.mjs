import fs from 'node:fs/promises';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const source = process.argv[2];
const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(source));
console.log((await workbook.inspect({ kind: 'workbook,sheet,table', maxChars: 3500, tableMaxRows: 3, tableMaxCols: 12 })).ndjson);
const results = {};
for (const name of ['Overview', 'DR Firewall Rules']) {
  const rows = workbook.worksheets.getItem(name).getUsedRange().values;
  results[name] = rows.map((cells, index) => ({ row: index + 1, cells })).filter(row => row.cells.some(value => value !== null && value !== ''));
  console.log(JSON.stringify({ sheet: name, nonemptyRows: results[name].length, rows: results[name].slice(0, 100) }));
}
await fs.writeFile(new URL('./dr-workbook-readonly.json', import.meta.url), JSON.stringify(results, null, 2));
