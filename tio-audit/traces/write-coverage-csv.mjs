import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Workbook } from '@oai/artifact-tool';
const dir=path.dirname(fileURLToPath(import.meta.url));
const input=JSON.parse(await fs.readFile(path.join(dir,'coverage-rows.json'),'utf8'));
const workbook=Workbook.create();
const sheet=workbook.worksheets.add('Coverage');
const matrix=[input.columns,...input.rows.map(row=>input.columns.map(col=>row[col]))];
sheet.getRange(`A1:K${matrix.length}`).values=matrix;
workbook.recalculate();
const observed=sheet.getRange(`A1:K${matrix.length}`).values;
if(JSON.stringify(observed)!==JSON.stringify(matrix)) throw new Error('CSV authoring values changed');
// CSV has no formatting or formula features. Serialize the authored literal values,
// preserving the user-required raw CSV format without exporting an unsolicited XLSX.
const escape=value=>'"'+String(value??'').replaceAll('"','""')+'"';
await fs.writeFile(path.join(dir,'../03-test-coverage-matrix.csv'),'\uFEFF'+observed.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n','utf8');
await fs.writeFile(path.join(dir,'csv-authoring-validation.json'),JSON.stringify({method:'Artifact Tool literal-value workbook authored and exact round-trip compared, then raw CSV serialized',rows:observed.length-1,columns:observed[0].length,formulaOrFormattingFeatures:'None requested in raw CSV'},null,2));
console.log(JSON.stringify({rows:observed.length-1,columns:observed[0].length}));
