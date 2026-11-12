import json,hashlib
from pathlib import Path

out=Path(__file__).parent
source=Path(r'C:\Users\lmh\Downloads\DDGE 12500298 Proposal.pdf')
prior=json.loads((out/'hub-ready-5194-5196.json').read_text(encoding='utf-8'))['contracts'][1]['mainFields']
coverage='''Referenced proposal V4.0, May-2025 (13pp), supplements signed contract5196. Scope: technical audit/device inventory/data-flow and integration review; operational transition maintaining zero downtime/data integrity; retain existing hardware/network during transition; interim anomaly monitoring; on-site co-management and joint incident/escalation protocol (pp6–7). Pilot GWL,DPP,RRM and IDS on isolated infrastructure, mirror selected ANPR streams, benchmark ingestion latency/validation/error/scalability, assess enhancement versus replacement, document committee decision/fallback and migration plan (pp6–8). GWL handles ingestion; DPP validates/stores/integrates; RRM monitors/activates roadside units (pp9–10). Design capacity up to50,000cameras is a design statement, not a purchased camera quantity (p9).
Operations:16/5 real-time monitoring, incident diagnosis, roadside health/remote activation/troubleshooting, predictive scaling, patches/updates, backup verification and storage management. Included customer-care package has2Operation/Dev Engineers; no promise of2concurrent/on-site engineers. Days, shift hours and time zone are not stated; no numeric SLA response/resolution/uptime target (pp11–12). On-site and remote activities support Hybrid classification. All components on-premises; AES-256 at rest,TLS in transit,OAuth2.0/RBAC (p10). Signed contract dates/customer/price prevail over conflicting proposal text (signed p2/cl1 and proposal p13).'''
support='Proposal V4.0 pp11–12:16/5 support with2Operation/Dev Engineers. Days/shift hours/zone and numeric response,resolution,uptime targets unspecified; “around-the-clock” wording is ambiguous.'
newlim='''PROPOSAL SUPPLEMENT — Referenced V4.0,May-2025,DDGE12500298 Proposal.pdf is now verified (13pp). Included2Operation/Dev Engineers and16/5monitoring/support; days,shift times/zone and numeric SLA response/resolution/uptime are absent. “Immediate responses” is qualitative; “around-the-clock” text does not establish24x7 (proposal pp11–12). On-site co-management plus remote troubleshooting support Hybrid; on-site headcount remains unknown. Price AED440,000 exVAT,withholding tax,customs/other taxes includes GWL,DPP,enhanced integrations/customer-care package; do not add these as duplicate fee lines (p12).
Proposal plan:W1–4audit;M2pilot/gap analysis;startM3operational handover;M3–7development/integration;M5–7validation;M7training;M7–8go-live/operations; post-year1extension only by agreement (p8). Deliverables include audit/RACI/joint protocol,pilot/fit report,signed handover,configured modules,acceptance/security reports,training/support plan,go-live/KPI dashboard/monthly reports. These relative milestones are not actual completion or confirmed calendar dates.
PRECEDENCE — Proposal p13 uses unsigned Dubai Police–Oyoon placeholders and08/04/2025–31/12/2025; signed contract names DDGE and01-Jul-2025–30-Jun-2026. Preserve signed contract parties/dates: signed cl1(p2) says contract terms prevail. Proposal does not cure signed payment-table errors.'''
ob=prior['obligations']
start=ob.index('GOVERNANCE — ');end=ob.index('\n\nCONTACTS — ',start)
ob=ob[:start]+'GOVERNANCE — IP,confidentiality,security,HSE,audit/offset and Arabic-language precedence remain as signed clauses3,6–8,12–16.'+ob[end:]
ob=ob[:ob.index('SOURCE LIMITS — ')]+newlim
ob='''SIGNED CONTRACT5196 — DDGE / VITRONIC; requisition12500298; fixed AED440,000 excluding VAT/fees, all expenses included (pp1,3–4). Term01-Jul-2025–30-Jun-2026 (p2). Payment categories: resources AED308,000/70%; modules AED110,000/25%; training/handover/commissioning AED22,000/5% (p21). No numeric invoice-to-payment period. Actual invoice/payment, acceptance and completion status unknown.
PAYMENT ERRORS — p21 row1.4 prints28-Feb-25,AED77,000/17.5%, before01-Jul-25 start; do not correct year silently. Final Acceptance01-Mar-26 prints AED44,000/5%, conflicting with category AED22,000/5%. Printed component invoices total AED462,000 versus AED440,000 signed/category total. Final-acceptance amount stays unknown in structured payments. Planned invoice dates are not payment due dates. Planned end of work31-Mar-2026 is distinct from expiry30-Jun-2026.
GUARANTEE / RENEWAL — Final unconditional irrevocable bank guarantee10% of total, from a bank operating in the State, effective from start and valid90days after end; revocation requires customer consent; actual issue/return unverified (p4 cl5.3). Customer written intention to renew30days before expiry (p2 cl2).
PENALTIES / LIABILITY — Delay/failure measures refer to Dubai Law12/2020; no numeric penalty rate,service-credit formula or penalty cap (p3 cl4;p14 cl12.16). Exemption requires proof of an excusable cause and customer consent. Compensation paragraph states100% contract-value liability limit, excluding indirect/consequential losses and lost profit with exceptions for gross negligence,fraud,confidentiality breach; not a delay-penalty cap (pp12–13 cl12.9). Breach cure15working days after written notice; customer early termination at least30days notice, compensating supplied materials/services (pp8–9 cl9). Force-majeure notice within7working days (pp15–17 cl14). Amicable dispute period30days, then senior management; Dubai/UAE law,Dubai Courts (pp9–10 cl10).
GOVERNANCE — Authorized written addenda; customer consent for IP/name/logo use and subcontracting/assignment; continuing supplier liability,confidentiality/security,HSE,customer audit/offset,Arabic precedence as signed clauses3,6–8,12–16. Contacts(p18): Huda Salim AlHashmi,hudasalim.alhashmi@digitaldubai.ae,04-5599559; Mohammed Ahmed Abdo Al Omari,mohammad.alomari@vitronic.com,04-3290009.
HISTORY — Supplier CEO Dr Youssef El Hansali signed27-Nov-2025; DDGE CEO H.E.Matar AlHumairi countersigned09-Jan-2026 11:47UTC+4 (p19). Planned final acceptance01-Mar-2026/end of work31-Mar-2026 are not actual completion proof (p21). No extension/renewal verified.
'''+newlim
# Readable spacing without changing reference identifiers.
for a,b in [('contract5196','contract 5196'),('up to50,000cameras','up to 50,000 cameras'),('Operations:16/5','Operations: 16/5'),('has2Operation/Dev','has 2 Operation/Dev'),('of2concurrent/on-site','of 2 concurrent/on-site'),('pp11–12:16/5','pp11–12: 16/5'),('with2Operation/Dev','with 2 Operation/Dev'),('Included2Operation/Dev','Included 2 Operation/Dev'),('and16/5monitoring','and 16/5 monitoring'),('establish24x7','establish 24x7'),('AED440,000','AED 440,000'),('Proposal plan:W1–4','Proposal plan: W1–4'),('DDGE12500298','DDGE 12500298')]:
    coverage=coverage.replace(a,b);support=support.replace(a,b);ob=ob.replace(a,b)
ob=ob.replace('Deliverables include audit/RACI/joint protocol,pilot/fit report,signed handover,configured modules,acceptance/security reports,training/support plan,go-live/KPI dashboard/monthly reports. These relative milestones are not actual completion or confirmed calendar dates.','Relative milestones are not actual completion or confirmed calendar dates; detailed deliverables remain in the attached proposal p8.')
import re
def readable(s):
    s=re.sub(r'(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])',' ',s)
    return re.sub(r',(?=[A-Za-z])',', ',s)
ob=readable(ob)
coverage=readable(coverage)
result={
 'contract_reference':'5196 of 2025','hub_contract':'CT1012','source_pdf':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pages':13,'version':'4.0','cover_date':'May-2025',
 'new_material_facts':[
  {'fact':'16/5 operational support/monitoring in shifts; customer-care package includes 2 Operation/Dev Engineers.','pages':[11,12]},
  {'fact':'On-site co-management during transition plus remote roadside activation/troubleshooting. Hybrid classification supported; exact on-site/concurrent engineer count not specified.','pages':[6,11]},
  {'fact':'No numeric response/resolution/availability target. Immediate responses to critical incidents is qualitative; named weekdays, shift times and time zone absent. The around-the-clock sentence appears under16/5 heading and is ambiguous; not a24x7 commitment.','pages':[11,12]},
  {'fact':'Operational takeover, audit, legacy infrastructure continuity, joint routines/escalation/RACI; isolated parallel pilot with live data mirroring, benchmarking and enhancement/replacement decision.','pages':[6,7,8]},
  {'fact':'AES-256 at rest,TLS in transit,OAuth2.0/RBAC; redundant storage/failover; all components on-premises. Up to50,000cameras is design capacity, not delivered inventory or a numeric SLA.','pages':[9,10]},
  {'fact':'RACI: VITRONIC responsible for audit,handover,provisioning,pilot,security review,training/support; Dubai Police accountable for audit/handover, responsible infrastructure readiness, accountable enhancement/replacement decision; development accountable VITRONIC; Zabeel/backoffice integration both accountable.','pages':[9]},
  {'fact':'Price remains AED440,000; GWL,DPP,enhanced integrations and2-engineer16/5care package included; excludes VAT,withholding tax,customs and other taxes. SLA described as included with a customized proposal, but no actual numeric SLA schedule in this document.','pages':[12]}
 ],
 'relative_delivery_stages':[
  {'stage':'Discovery & Audit','timing':'Week1–4','deliverables':'System Audit Report,RACI Matrix,Joint Operations Protocol','pages':[8]},
  {'stage':'Provisioning & Gap Analysis','timing':'Month2','deliverables':'Provisioning Pilot Report,Improvement Analysis,Solution Fit Matrix','pages':[8]},
  {'stage':'Operational Handover & System Takeover','timing':'Start of Month3','deliverables':'Signed Handover Document,Operations Schedule','pages':[8]},
  {'stage':'Development & Module Integration','timing':'Month3–7','deliverables':'Configured Modules,Updated Infrastructure,Development Checklist','pages':[8]},
  {'stage':'Validation & System Testing','timing':'Month5–7','deliverables':'System Acceptance Report,Quality Gate Validation,Security Audit Report','pages':[8]},
  {'stage':'Training & Go-Live Preparation','timing':'Month7','deliverables':'Training Documents,Agreement,Support Plan','pages':[8]},
  {'stage':'New System Go-Live & Continuous Operations','timing':'Months7–8','deliverables':'Go-Live Confirmation,Live Monitoring Dashboard,Monthly Reports','pages':[8]},
  {'stage':'Optional Long-Term Operations','timing':'Post-Year1,TBD','deliverables':'Renewal contract/addendum,Feature Roadmap; subject to separate agreement','pages':[8]}
 ],
 'conflicts_and_precedence':[
  {'proposal':'Unsigned p13 template names Dubai Police–Oyoon and dates08/04/2025–31/12/2025.','signed_contract':'DDGE; term01-Jul-2025–30-Jun-2026.','action':'Retain signed parties/dates under signed cl1,p2: contract terms prevail.'},
  {'proposal':'16/5 heading and package versus around-the-clock sentence p11.','action':'Record16/5 in narrative; do not enable24x7 or invent exact calendar.'},
  {'proposal':'Relative7–8month plan p8.','action':'Add as proposal-relative stages with date/completion blank; do not overwrite signed calendar or assert performance.'}
 ],
 'recommended_field_changes':{'supportModel':'Hybrid','supportHours':support,'coverage':coverage,'obligations':ob,'support24x7':False,'supportDays':[],'supportFrom':'','supportTo':'','supportTimeZone':'','onSiteEngineersRequired':None,'slaTargets':[]},
 'no_changes_to':'Do not change signed contract customer,term,total,existing documented payment conflicts,or create duplicate fees. Existing JSON and Hub left untouched.'
}
assert len(support)<=200,len(support)
assert len(coverage)<=2000,len(coverage)
assert len(ob)<=4000,len(ob)
(out/'supplemental-5196-proposal.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Lengths',len(support),len(coverage),len(ob))
