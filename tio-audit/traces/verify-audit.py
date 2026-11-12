"""Local audit-artifact verification only; no application requests."""
from pathlib import Path
import csv, json, re, hashlib, os, collections
B=Path(__file__).resolve().parents[1]
expected=['01-executive-summary.md','02-application-inventory.md','03-test-coverage-matrix.csv','04-detailed-bug-report.md','05-ui-ux-audit.md','06-business-process-gaps.md','07-security-observations.md','08-performance-report.md','09-end-to-end-test-results.md','10-recommendations-roadmap.md','11-test-blockers-and-limitations.md','12-consolidated-issue-register.csv']
checks=[]
def check(name,ok,detail=''):
    checks.append({'check':name,'passed':bool(ok),'detail':detail})
check('Required deliverables exist',all((B/p).is_file() for p in expected))
with (B/expected[2]).open(encoding='utf-8-sig',newline='') as f: coverage=list(csv.DictReader(f))
check('Coverage count and status totals',len(coverage)==465 and collections.Counter(r['Status'] for r in coverage)=={'Passed':429,'Failed':7,'Blocked':29})
check('Unique scenario IDs',len({r['Scenario ID'] for r in coverage})==len(coverage))
check('All coverage evidence paths exist',all((B/p.strip()).exists() for r in coverage for p in r['Evidence Reference'].split(';')))
with (B/expected[-1]).open(encoding='utf-8-sig',newline='') as f:
    reader=csv.DictReader(f); issuecols=reader.fieldnames; issues=list(reader)
requiredcols=['Issue ID','Title','Module','Category','Severity','Business Impact','Reproduction Status','Evidence Reference','Recommended Fix','Suggested Owner','Priority','Status']
check('Issue register exact columns',issuecols==requiredcols)
check('Seven unique issue IDs',len(issues)==7 and {i['Issue ID'] for i in issues}=={f'TIO-BUG-{i:03}' for i in range(1,8)})
check('Issue severity totals',collections.Counter(i['Severity'] for i in issues)=={'P2':4,'P3':3})
fields=['Issue ID','Title','Module','Page URL','Category','Severity','Business Impact','Environment','Preconditions','Steps to Reproduce','Expected Result','Actual Result','Reproducibility','Evidence','Likely Root Cause','Recommended Fix','Acceptance Criteria','Regression Test']
for i in issues:
    content=(B/'issues'/f"{i['Issue ID']}.md").read_text(encoding='utf-8-sig')
    check(i['Issue ID']+' mandatory fields',all(f'**{h}:**' in content for h in fields))
routes=json.loads((B/'traces/responsive-route-list.json').read_text(encoding='utf-8-sig'))
metrics=json.loads((B/'traces/responsive-results.json').read_text(encoding='utf-8-sig'))
check('Responsive aggregate has364 unique observations',len(metrics)==364 and len({m['id'] for m in metrics})==364)
check('91 route mapping and all canonical PNG/TXT pairs',len(routes)==91 and all((B/sub/f'R{i:03}-{size}.{ext}').exists() for i in range(1,92) for size in ['desktop','laptop','tablet','mobile'] for sub,ext in [('screenshots','png'),('traces','txt')]))
check('Geometry assertions supported',all(m['documentWidth']<=m['width']+1 and not m['errorAlerts'] for m in metrics))
missing=[]; mdcount=0
for directory,dirs,files in os.walk(B,followlinks=False):
    dirs[:]=[d for d in dirs if d!='node_modules' and not (Path(directory)/d).is_symlink()]
    for filename in files:
        p=Path(directory)/filename
        if p.suffix!='.md': continue
        mdcount+=1
        for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8-sig')):
            target=target.strip('<>').split('#')[0]
            if not target or re.match(r'https?://|mailto:|codex:',target): continue
            if not (p.parent/target).exists(): missing.append([str(p.relative_to(B)),target])
check('Markdown local evidence links resolve',not missing,{'markdownFiles':mdcount,'missing':missing})
summary=json.loads((B/'traces/audit-summary.json').read_text())
check('Machine summary agrees with ledger',summary['scenarioTotal']==len(coverage) and summary['confirmedDefects']==len(issues) and summary['responsiveStates']==len(metrics))
result={'scope':'Local artifact quality control; not additional live application testing','checks':checks,'passed':sum(c['passed'] for c in checks),'failed':sum(not c['passed'] for c in checks),'exclusions':['Runtime node_modules junction is excluded from artifact traversal/hash manifest.','No claim that a width assertion proves complete visual/functional correctness.']}
(B/'traces/quality-control.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
if result['failed']: raise SystemExit(1)
manifest=[]
for directory,dirs,files in os.walk(B,followlinks=False):
    dirs[:]=[d for d in dirs if d!='node_modules' and not (Path(directory)/d).is_symlink()]
    for filename in sorted(files):
        p=Path(directory)/filename
        if filename=='evidence-sha256.json': continue
        raw=p.read_bytes()
        manifest.append({'path':p.relative_to(B).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
(B/'traces/evidence-sha256.json').write_text(json.dumps({'purpose':'Local integrity manifest; no claim of externally timestamped or independently signed evidence','files':sorted(manifest,key=lambda r:r['path'])},indent=2),encoding='utf-8')
print(json.dumps({'manifestFiles':len(manifest),'totalBytes':sum(r['bytes'] for r in manifest)}))
