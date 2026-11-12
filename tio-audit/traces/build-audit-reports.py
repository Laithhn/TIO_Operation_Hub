"""Build audit summaries from preserved observations. No network or application access."""
from pathlib import Path
import json, csv, collections, re

BASE = Path(__file__).resolve().parents[1]
T = BASE / 'traces'
routes = json.loads((T/'responsive-route-list.json').read_text(encoding='utf-8-sig'))
metrics = [json.loads(p.read_text(encoding='utf-8-sig')) for p in sorted((T/'responsive-metrics').glob('R*.json'))]
assert len(routes)==91 and len(metrics)==364
assert len({m['id'] for m in metrics})==364
(T/'responsive-results.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')

def module(route):
    p=route.split('?')[0]
    if p=='/': return 'Dashboard'
    if p in ['/login','/account/password']: return 'Authentication'
    if p=='/my-dashboard': return 'My dashboard'
    if p.startswith('/dashboards/'): return {'operational':'Operational dashboard','sla':'SLA and Contracts dashboard','management':'Management dashboard','project':'Project dashboard'}[p.split('/')[2]]
    if p=='/map': return 'Client map'
    if p=='/actions': return 'Action list'
    if p=='/notifications': return 'Notifications'
    if p=='/data-quality': return 'Data quality'
    if p.startswith('/admin/integrations/'): return 'Jira integrations'
    if p in ['/admin/audit','/admin/archived']: return 'Change history and archive'
    if p.startswith('/admin/config') or p in ['/admin/policies','/admin/settings','/admin/jira']: return 'Configuration and settings'
    if p.startswith('/admin/'): return 'Users roles and access'
    key=p.split('/')[1]
    return {'clients':'Clients and regions','projects':'Projects','contracts':'Contracts','environments':'Environments','versions':'Installations and versions','installations':'Installations and versions','assets':'Servers and components','components':'Servers and components','firewall-rules':'Firewall rules','products':'Products and microservices','microservices':'Products and microservices','cases':'Tickets','commitments':'Commitments','escalations':'Escalations','teams':'Teams and handovers','handovers':'Teams and handovers','reassignment':'Teams and handovers','reporting-center':'Reporting Center'}[key]

rows=[]
cols=['Scenario ID','Module','URL','Test Type','Scenario','Expected Result','Actual Result','Status','Evidence Reference','Limitations','Related Issue']
def add(id,mod,url,kind,name,exp,actual,status,ev,limits='',issue=''):
    rows.append(dict(zip(cols,[id,mod,'https://nb01994.vitronic.de'+url,kind,name,exp,actual,status,ev,limits,issue])))

for m in metrics:
    assert m['documentWidth']<=m['width']+1, m
    assert not m['errorAlerts'], m
    rid=m['id']; ev=f'traces/responsive-metrics/{rid}.json; traces/{rid}.txt; screenshots/{rid}.png'
    if m.get('recheckId'): ev+=f"; traces/{m['recheckId']}.txt; screenshots/{m['recheckId']}.png"
    add('LAY-'+rid,module(m['route']),m['route'],'Layout geometry',f"{m['width']} x {m['height']} initial viewport",'No page-wide horizontal overflow or visible role=alert error','Document width fits viewport; no captured error alert','Passed',ev,'Narrow DOM assertions only; internal overlap, below-fold content, dialogs and full WCAG not implied. Original captures may precede settled content; recovery metrics are labelled.')

functional=[
('TKT-01','Tickets','/cases?due=overdue','Dashboard overdue drilldown','KPI opens matching overdue list','73-row list with Overdue filter selected','118-journey-dashboard;119-journey-overdue-drilldown'),
('TKT-02','Tickets','/cases','Exact search','Known reference returns matching ticket','CS-2963 returned one matching row','019-ticket-exact-search'),
('TKT-03','Tickets','/cases','Partial search','Known title fragment returns matching ticket','Plate Numbers returned one matching row','020-ticket-partial-search'),
('TKT-04','Tickets','/cases','No-match search','Meaningful empty-result state','No matching results displayed','021-ticket-empty-search'),
('TKT-05','Tickets','/cases','Next page','Move beyond first page while retaining population','Records 16–30 of 183 displayed','022-ticket-pagination'),
('TKT-06','Tickets','/cases','Ascending sort state','Selected header reports ascending order','Ascending aria-sort and rendered rows captured','023-ticket-sort-ascending'),
('TKT-07','Tickets','/cases','Descending sort state','Selected header reports descending order','Descending aria-sort and rendered rows captured','024-ticket-sort-descending'),
('NAV-01','Dashboard','/','Global search result navigation','Known ticket found and result opens it','CS-4003 result opened /cases/12203; status label separately fails BUG001','098-global-search-settled;099-global-search-navigation'),
('NAV-02','Dashboard','/','Mobile drawer open and close','Menu can open/close and closed links are not tab stops','Settled keyboard sequence reaches visible header/content controls, not closed drawer','100-mobile-menu-open;101-mobile-menu-closed-keyboard'),
('MAP-01','Client map','/map','Select Saudi Arabia','Country selection shows authorized operational summary','1 client, 78 servers, 91 tickets, 61 overdue and 1 active contract displayed','042-map-country-selection'),
('RPT-01','Reporting Center','/reporting-center/builder/cases','Unfiltered read-only builder preview','Preview displays rows and matching total','First 25 of 1,949 rows loaded; no save/export','061-ticket-report-builder'),
('RPT-02','Reporting Center','/reporting-center/templates','Critical/high template preview','Template limits open urgent tickets','23 matching tickets, consistent with dashboard 5 Critical +18 High','076-report-template-critical-high'),
('NAV-03','Tickets','/cases/10795','Detail refresh','Reload retains accessible ticket identity/content','CS-2595 detail retained after actual browser reload','120-journey-ticket-detail;121-journey-ticket-refresh'),
('NAV-04','Dashboard','/','Browser Back through daily review','Return from detail to overdue list and dashboard','Settled list retains 73 overdue rows; dashboard retains 183 open /73 overdue','122b-journey-overdue-back-settled;123c-journey-dashboard-back-settled'),
]
for id,mod,url,name,exp,actual,ev in functional:
    add(id,mod,url,'Read interaction',name,exp,actual,'Passed','; '.join('traces/'+s+'.txt' for s in ev.split(';')),'Pass applies only to named read behavior, not all controls or metric correctness.')

for prefix,mod,url in [('105-ticket-tab-','Tickets','/cases/12203'),('106-env-tab-','Environments','/environments/3')]:
    for i,p in enumerate(sorted(T.glob(prefix+'*.txt')),1):
        evidence=p.name
        if 'firewall-rules' in evidence: evidence='106b-env-firewall-settled.txt'
        add(f'TAB-{prefix[:3]}-{i:02}',mod,url,'Read tab',p.stem[len(prefix):],'Selected tab displays data or an explicit empty state','Content/empty state observed; no row action executed','Passed','traces/'+evidence,'One existing record; attachment upload/download and lifecycle operations blocked.')

for i,name in enumerate(['operational','technical','commercial','records'],1):
    add(f'CLIENT-{i:02}','Clients and regions','/clients/1','Read tab',name+' client area','Area displays its read panels','Area opened and captured; status consistency separately fails BUG001','Passed',f'traces/044-client-{name}.txt','Only selected child tabs inspected; no write action.')
for i,name in enumerate(['contracts','projects'],5):
    add(f'CLIENT-{i:02}','Clients and regions','/clients/1','Read tab','Commercial '+name,'Selected commercial subtab displays records','Read table opened and captured','Passed',f'traces/{46 if i==5 else 47:03}-client-{name}.txt','One client; no contract/project edits.')

reports=[('Tickets',183,'115-tickets-catalog-preview')]+[(n,c,f'117-catalog-preview-{i:02}') for i,(n,c) in enumerate([('Commitments',6),('Actions',780),('Environments',9),('Versions',8),('Assets',153),('Data quality',263),('Contracts',9),('SLA compliance',677),('Commitment performance',8),('Ticket aging',183),('Team KPI',36),('Team workload',21),('Client health',20)],1)]
for i,(name,count,ev) in enumerate(reports,1):
    add(f'CAT-{i:02}','Reporting Center','/reporting-center/library','Catalog preview',name+' preview','Apply filters and preview returns rows/total',f'{count} rows reported; preview displayed','Passed','traces/'+ev+'.txt','Returned total not independently reconciled against database; no file generated. Tickets status choice parity separately fails BUG006.')

arithmetic=[
('Open priority partition','5 +18 +159 +1 =183','118-journey-dashboard'),
('Open status partition, early snapshot','52 +7 +36 +73 +15 =183','095-dashboard-return'),
('Open status partition, late snapshot','51 +7 +33 +77 +15 =183','118-journey-dashboard'),
('Deadline partition','73 +1 +8 +101 =183','118-journey-dashboard'),
('Open ticket age partition','6 +7 +27 +143 =183','118-journey-dashboard'),
('Data quality rule total','231 +7 +2 +19 +4 =263','118-journey-dashboard'),
('Backlog period delta','50 opened minus32 closed =18 growth','118-journey-dashboard'),
('Response compliance denominator','9 /45 =20%','118-journey-dashboard'),
('Resolution compliance denominator','6 /39 rounds to15.4%','118-journey-dashboard'),
('Both completed and met denominator','1 /39 rounds to2.6%','118-journey-dashboard'),
('Aggregate measured obligations','(9 +6) /(45 +39) rounds to18%','118-journey-dashboard'),
]
for i,(name,result,ev) in enumerate(arithmetic,1):
    add(f'KPI-{i:02}','Dashboard','/','Displayed arithmetic',name,'Displayed parts reconcile using stated denominator',result,'Passed','traces/'+ev+'.txt','Arithmetic of captured UI values only; not an independent record-level SLA, source-data or time-boundary validation. Data changes across time are expected.')

http=json.loads((T/'anonymous-http-observations.json').read_text(encoding='utf-8-sig'))
# Preserve measured HTTP results in their original structured file; scenario facts are independently explicit here.
for i,(route,status,outcome) in enumerate([('/',200,'HTML shell'),('/api/v1/me',401,'Zero-body anonymous denial'),('/api/v1/clients',401,'Zero-body anonymous denial'),('/api/health/live',200,'live'),('/api/health/ready',200,'ready'),('/api/v1/auth/config',200,'Forms; setupRequired false')],1):
    add(f'HTTP-{i:02}','Authentication',route,'Anonymous HTTP',route+' sampled GET',f'Expected response {status}',f'{status}; {outcome}','Passed','traces/anonymous-http-observations.json','One native HTTP sample; no authenticated role matrix, rendering or security certification.')

findings=[('001','Clients and regions','/clients/1?tab=cases','Configured ticket status consistency','Client/search show internal In progress/InProgress rather than Waiting for customer','107-client-ticket-status-reproduced'),('002','Change history and archive','/admin/audit','Valid final user identifier in audit history','Negative generated-looking TIO user id displayed','113-audit-user-mapping-evidence'),('003','Tickets','/cases','Header/body column association','Details and selection headers reverse body order','109-ticket-table-header-alignment'),('004','Notifications','/notifications','Mobile title and action separation','Title and overdue badge/action region overlap at390x844','104-notifications-mobile-reproduced'),('005','Reporting Center','/reporting-center/history','Explain unavailable completed export','Completed masked export has Details unavailable and no recovery guidance','066-export-details'),('006','Reporting Center','/reporting-center/library?report=cases','Configured status options in catalog','Configured Waiting for customer/Resolved/Re-opened unavailable','114-report-configure-dialog'),('007','Tickets','/cases?due=overdue','Configured type label in hint/detail','CS-2595 type hint Incident differs from detail Bug','119-journey-overdue-drilldown')]
for id,mod,url,name,actual,ev in findings:
    add('DEF-'+id,mod,url,'Defect assertion',name,'Consistent, usable and valid behavior as specified in individual issue',actual,'Failed','traces/'+ev+'.txt; issues/TIO-BUG-'+id+'.md','See individual issue for exact reproduction limits and evidence.','TIO-BUG-'+id)

blocked=[
('Personal notes','/notes','Notes page and record interactions','GET notes/tree may initialize starter data; production-safe test account absent'),
('Authentication','/login','Login success/failure and first-run setup','No approved credential test account; existing session retained'),
('Authentication','/','Logout and session expiry','Would alter current session; expiry time/failure injection not authorized'),
('Users roles and access','/admin/access','Multiple-role allow/deny and record scope','Only existing TIO Manager session; no approved alternate roles'),
('Users roles and access','/admin/users','Create/edit users, rights, directory mappings and password flows','Production identity/permission changes prohibited'),
('Configuration and settings','/admin/config','Modify lookup values, settings, policies or Jira mappings','Production configuration changes prohibited'),
('Clients and regions','/clients/new','Client/region CRUD and duplicate/format/persistence checks','Blank new-client form only; no approved test records'),
('Projects','/projects','Project/milestone/status CRUD and approvals','Existing read records only; no approved test records'),
('Contracts','/contracts/new','Contract/payment/SLA target/calendar edits','No approved test contracts; commercial records unchanged'),
('Environments','/environments/new','Environment CRUD, condition reports, review confirmations','Blank form only; no approved test records'),
('Installations and versions','/versions','Installation/version maintenance and imports','No approved test records/import payload'),
('Servers and components','/assets','Asset/component CRUD and bulk operations','No approved test inventory records'),
('Firewall rules','/firewall-rules','Rule creation/update/archive/review','No approved test network records'),
('Products and microservices','/products/new','Product/microservice/version CRUD','Blank product form only; no approved test records'),
('Tickets','/cases/new','Ticket create/assign/transition/respond/resolve/close/reopen','No approved disposable ticket or safe write environment'),
('Tickets','/cases/12203','Attachment upload/download and comment/notification delivery','No approved test attachments/comments; notifications/integrations must not be triggered'),
('Commitments','/commitments/new','Commitment create/revise/complete/cancel','Blank form only; no approved test records'),
('Escalations','/escalations/new','Escalation create/respond/resolve/close/notify','Blank form only; no approved test records or recipients'),
('Teams and handovers','/handovers','Handover/acknowledgement/reassignment and exception approval','No approved test ownership transfer or recipient'),
('Notifications','/notifications','Mark read/acknowledge/delete and delivery','Would alter current-user records or trigger messages'),
('Reporting Center','/reporting-center/history','Export generation/download/file-to-UI reconciliation','No approved export action; existing masked history examined only'),
('Reporting Center','/reporting-center/schedules','Save report, schedule, run and recipient isolation','No approved test records or notification recipients'),
('Jira integrations','/admin/integrations/jira','Test/discover/sync/retry/resolve conflict/rotate secret','External integration and production mapping effects prohibited'),
('Change history and archive','/admin/archived','Delete/archive/restore and new audit transaction verification','No approved disposable records or DB writes'),
('Cross-module','/','Concurrent editing, double-submit, unsaved changes and full validation matrix','Requires approved test data and mutations'),
('Cross-module','/','Offline/timeouts/API failure/retry/error boundary testing','No production failure injection or interception of user requests'),
('Cross-module','/','Full WCAG2.2AA conformance/contrast/screen-reader/200%zoom','No axe or screen-reader run and incomplete manual interaction coverage'),
('Cross-module','/','Cold/warm loading, authenticated API timing, memory and capacity','No HAR/profiler/load environment; native samples are not browser SLOs'),
('Cross-module','/','Backup/restore/failover and recovery objectives','No approved isolated recovery environment; no external services started'),
]
for i,(mod,url,name,why) in enumerate(blocked,1):
    add(f'BLOCK-{i:02}',mod,url,'Unexecuted workflow family',name,'Approved isolated setup permits complete scenario','Not executed: '+why,'Blocked','11-test-blockers-and-limitations.md',why)

(T/'coverage-rows.json').write_text(json.dumps({'columns':cols,'rows':rows},ensure_ascii=False,indent=2),encoding='utf-8')
counts=collections.Counter(r['Status'] for r in rows)
bykind=collections.defaultdict(collections.Counter)
for r in rows: bykind[r['Test Type']][r['Status']]+=1
summary={'inventoryGroups':29,'partiallyAssessedGroups':28,'blockedGroups':1,'fullyTestedGroups':0,'responsiveRoutes':91,'responsiveStates':364,'scenarioTotal':len(rows),'scenarioStatus':dict(counts),'scenarioTypes':dict(bykind),'confirmedDefects':7,'severity':{'P0':0,'P1':0,'P2':4,'P3':3},'preparedPlaywrightDefinitions':298,'executedLocalPolicyTests':8}
(T/'audit-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary,indent=2))
