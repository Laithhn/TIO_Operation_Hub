import {Workbook} from '@oai/artifact-tool';
const w=Workbook.create();
const s=w.worksheets.add('s');
s.getRange('A1').formulas=[['=HYPERLINK("https://example.com","link")']];
w.recalculate();
console.log(JSON.stringify(s.getRange('A1').values));
