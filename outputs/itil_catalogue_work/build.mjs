import fs from 'node:fs/promises';
import {Workbook, SpreadsheetFile} from '@oai/artifact-tool';

const out = 'outputs/itil_catalogue_work';
const wb = Workbook.create();
const cat = wb.worksheets.add('Service catalogue');
const gov = wb.worksheets.add('Service agreements');
const ev = wb.worksheets.add('Jira evidence');
const services = [
['BUS-01','Traffic Violation Case Processing','Customer-facing','Enable authorized users to process and investigate traffic violation cases.','Supports BackOffice case processing and investigation of problems affecting case progression.','Report stuck cases or processing errors; report slowness; investigate incorrect case status or rejection information; submit an enhancement for assessment.','BackOffice, case import, integrations, database, infrastructure and external teams.','Agree whether data correction and reimport are included, who authorizes them, and where responsibility transfers.','TAH-2374, TAD-89, TAH-2358'],
['BUS-02','Roadside Device and Event Monitoring','Customer-facing','Give operations teams visibility of roadside devices and events.','Supports the Roadside Remote Monitoring (RRM) portal and associated monitoring views.','Report missing or incorrect device information; report an RRM issue; investigate an integration; request an enhancement.','RRM, device and vendor integrations, identity service, network, hosting and reporting.','Agree whether scope includes physical device maintenance, network connectivity and vendor support.','TAD-871, TAH-2294, TAH-2343'],
['BUS-03','SFRS Case File and Image Support','Customer-facing','Support access to SFRS portal functions and the relevant rejected-case file process.','Supports CCTV image browsing in SFRS and related extraction functionality for eligible case files.','Report missing or slow CCTV images; report a portal or session issue; investigate an extraction issue; request an enhancement.','SFRS portal, identity service, storage, BackOffice place configuration, extraction components, network and infrastructure.','Agree eligible cases and locations, downstream handling, whether reprocessing is included and regional coverage.','TAD-883, TAD-882'],
['BUS-04','Operational Reporting and Statistics','Customer-facing or offering','Provide authorized users with operational information for monitoring activity and performance.','Supports agreed reports and statistics related to case processing, device events and traffic data.','Report an unavailable report; investigate a discrepancy; request access to an existing report; request a new or changed report.','Source applications, databases, reporting tools, data feeds and access controls.','Agree the supported report inventory, definitions, refresh frequency, retention, and how new reports are handled.','TAD-89, TAD-803, TAH-2351'],
['SUP-01','Case Collection and Import','Supporting','Support movement of case data into downstream processing.','Collection, import and investigation of case-data flow.','Investigate case import failures or delayed case data; assess authorized recovery and reimport requests.','Importer, source data, storage, BackOffice and infrastructure.','Agree ownership, scope and approval of data correction, recovery and reimport.','TAH-2374, TAD-876'],
['SUP-02','Application Integration and APIs','Supporting','Support information exchange between applications and connected systems.','Supports and investigates agreed interfaces between applications and external parties.','Report an interface or API failure; investigate data exchange; request an integration change.','Application interfaces, connected parties, network and identity controls.','Agree interface inventory, responsibilities and third-party escalation.','TAH-2361, TAD-923, TAD-954'],
['SUP-03','Identity and Session Services','Supporting','Support authentication and user sessions for dependent applications.','Supports the shared identity component and application sessions.','Report authentication or session issues; investigate identity service incidents.','Shared identity service, dependent applications and infrastructure.','Agree eligible applications, access administration and escalation responsibilities.','TAD-885'],
['SUP-04','Application Hosting, Monitoring and Recovery','Supporting','Support application operation, monitoring and coordinated recovery.','Coordinates infrastructure, monitoring, incident investigation and recovery support.','Report hosting or monitoring issues; investigate alerts; coordinate approved recovery activities.','Application infrastructure, monitoring, storage, network and recovery arrangements.','Agree infrastructure and vendor responsibilities, coverage and recovery objectives.','TAH-2318, TAH-2373, TAH-2366'],
['SUP-05','Application Change and Release','Supporting','Support delivery of approved application changes.','Coordinates assessment, development, testing, approval and deployment of application changes.','Submit an enhancement for assessment; coordinate an approved release or deployment.','Development, test environments, change approval, deployment and application teams.','Agree approval authority, deployment responsibilities and release coverage.','TAD-879, TAD-866']
];
const evidence = [
['BUS-01, SUP-01','TAH-2374','Cases stuck after a disaster-recovery activity; recovery and reimport requested.','Describes an incident and requested activity; does not establish a standard offering.'],
['BUS-01, BUS-04','TAD-89','Historical requirement for a clerk-performance report by preparation, validation and investigation stages.','Historical requirement from 2019–2020; current availability is not established.'],
['BUS-01','TAH-2358','Requested BackOffice capability to change case state and remove sessions.','Proposed enhancement with staging testing pending in the reviewed record; not established as a standard offering.'],
['BUS-02','TAD-871','RRM operational data and geographic monitoring; comments describe deployment and initial validation in three regions.','Historical deployment and initial validation do not establish present service coverage.'],
['BUS-02','TAH-2294','Idemia monitoring integration with vendor and connectivity dependencies.','Example of a dependency; responsibilities require agreement.'],
['BUS-02, BUS-04','TAH-2343','RRM deployment and historical event reporting.','Confirm current access, reporting scope and ownership.'],
['BUS-03','TAD-883','Slow CCTV image browsing in the SFRS portal.','Issue demonstrates a portal use case, not an agreed performance target.'],
['BUS-03','TAD-882','Extraction of files from storage for certain rejected cases at SFRS-enabled locations.','Reviewed comments do not establish production deployment in every region or automatic case resolution.'],
['BUS-04','TAD-803','Investigation of differences between traffic statistics report counts and source XML data.','A historical discrepancy investigation does not establish current accuracy or report coverage.'],
['BUS-04','TAH-2351','Traffic Statistics release activity.','Release activity does not establish the current feature inventory.'],
['SUP-01','TAD-876','Importer release activity.','Release evidence does not independently establish the current import service agreement.'],
['SUP-02','TAH-2361','Mersaad API issue.','An integration issue is evidence of an interface, not an agreed service boundary.'],
['SUP-02','TAD-923','BackOffice Kafka integration.','Development work does not by itself prove present deployment or support coverage.'],
['SUP-02','TAD-954','CCC integration.','Development work does not by itself prove present deployment or support coverage.'],
['SUP-03','TAD-885','RRM, SFRS and VIPP are described as using the same identity service.','Shared dependency creates potential for a common impact; current architecture requires validation.'],
['SUP-04','TAH-2318','SFRS memory alerts and escalation.','Alert history does not establish agreed monitoring coverage or targets.'],
['SUP-04','TAH-2373','Disaster-recovery exercise.','An exercise is not an agreed recovery-time or recovery-point objective.'],
['SUP-04','TAH-2366','BackOffice disaster-recovery testing.','Testing does not by itself establish recovery commitments.'],
['SUP-05','TAD-879','Case Management enhancement linked to deployment work.','Development and deployment coordination does not establish a standard request or SLA.'],
['BUS-01, SUP-05','TAD-866','BackOffice release activity.','Release activity does not by itself establish current availability or feature scope.']
];

function base(sh, widths, last, title, note) {
  sh.showGridLines=false;
  sh.getRange(`A1:${last}60`).format.font={name:'Arial',size:10,color:'#1F2937'};
  sh.getRange('A1').values=[[title]];
  sh.getRange(`A1:${last}1`).format.rowHeight=27;
  sh.getRange('A1').format.font={name:'Arial',size:15,bold:true,color:'#17365D'};
  sh.getRange('A2').values=[[note]];
  sh.getRange('A2').format.font={name:'Arial',size:10,italic:true,color:'#4B5563'};
  sh.getRange(`A2:${last}2`).format.rowHeight=23;
  for(let i=0;i<widths.length;i++)sh.getRange(`${String.fromCharCode(65+i)}:${String.fromCharCode(65+i)}`).format.columnWidth=widths[i];
}
function head(sh, range) {
  sh.getRange(range).format={fill:'#17365D',font:{name:'Arial',size:10,bold:true,color:'#FFFFFF'},wrapText:true,verticalAlignment:'center',horizontalAlignment:'center'};
  sh.getRange(range).format.rowHeight=35;
}

base(cat,[13,31,22,43,48,52,48,49,28],'I','ITIL service catalogue','DRAFT: Proposed service boundaries and request offerings require owner validation. Refer to Jira evidence for source limitations.');
cat.getRange('A4:I4').values=[['Service ID','Proposed service','Proposed placement','Business outcome','Description','Proposed offerings','Proposed dependencies','Boundary decisions','Evidence IDs']];
head(cat,'A4:I4');
cat.getRange('A5:I13').values=services;
cat.getRange('A5:I13').format.wrapText=true;
cat.getRange('A5:I13').format.verticalAlignment='top';
cat.getRange('A5:I13').format.rowHeight=102;
for(let r=5;r<=13;r++)if(r%2===0)cat.getRange(`A${r}:I${r}`).format.fill='#F2F6FA';
cat.getRange('A5:A13').format.font={name:'Arial',size:10,bold:true,color:'#24547B'};
cat.freezePanes.freezeRows(4);

const gh=['Service ID','Service','Service owner','Delivery team','Customer contact','Consumers / eligibility','Service scope and exclusions','Regions and environments','Support channel','Escalation path','Service hours','Support hours','Availability target','Response target by priority','Resolution target by priority','Maintenance exclusions','Reporting method','Recovery time objective','Recovery point objective','Continuity responsibilities','Lifecycle status','Last validated','Next review','Approved by'];
base(gov,[13,31,23,23,23,30,36,25,24,26,20,20,20,25,25,28,25,23,23,30,20,20,20,23],'X','Service agreements and ownership','Amber cells are intentionally blank for agreed service information. Complete only after validation.');
gov.getRange('A4:X4').values=[gh];head(gov,'A4:X4');
gov.getRange('A5:B13').values=services.map(x=>[x[0],x[1]]);
gov.getRange('C5:X13').format.fill='#FFF4CE';
gov.getRange('A5:X13').format.rowHeight=38;
gov.getRange('A5:X13').format.wrapText=true;
gov.getRange('A5:X13').format.verticalAlignment='center';
gov.freezePanes.freezeRows(4);

base(ev,[19,17,56,62,53],'E','Jira evidence','Sampled TAH and TAD issues, not an exhaustive audit. Access restrictions may apply. Jira history alone does not establish current service delivery or SLAs.');
ev.getRange('A4:E4').values=[['Service ID','Jira issue','Evidence from prior review','Interpretation / limitation','Jira URL']];head(ev,'A4:E4');
ev.getRange('A5:E24').values=evidence.map(x=>[...x,`https://poliscan.atlassian.net/browse/${x[1]}`]);
ev.getRange('A5:E24').format.wrapText=true;
ev.getRange('A5:E24').format.verticalAlignment='top';
ev.getRange('A5:E24').format.rowHeight=52;
for(let r=5;r<=24;r++)if(r%2===0)ev.getRange(`A${r}:E${r}`).format.fill='#F2F6FA';
ev.getRange('E5:E24').format.font={name:'Arial',size:10,color:'#0563C1',underline:'single'};
ev.freezePanes.freezeRows(4);

wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'Service catalogue!A4:I13',include:'values',tableMaxRows:12,tableMaxCols:9,maxChars:3500})).ndjson);
console.log((await wb.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:30},summary:'final error scan'})).ndjson);
for(const [sheetName,range,file] of [['Service catalogue','A1:E8','catalogue.png'],['Service agreements','A1:F8','agreements.png'],['Jira evidence','A1:E9','evidence.png']]) {
  const image=await wb.render({sheetName,range,scale:1,format:'png'});
  await fs.writeFile(`${out}/${file}`,new Uint8Array(await image.arrayBuffer()));
}
const xlsx=await SpreadsheetFile.exportXlsx(wb);
await xlsx.save(`${out}/TAD_TAH_ITIL_Service_Catalogue_Draft.xlsx`);
console.log('Saved workbook');
