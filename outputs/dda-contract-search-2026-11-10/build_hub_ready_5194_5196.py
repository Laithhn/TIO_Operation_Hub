import json
from pathlib import Path

OUT=Path(__file__).parent
src=json.loads((OUT/'import-5194-5196.json').read_text(encoding='utf-8'))
facts={x['reference'].split()[0]:x for x in src['contracts']}

common_governance='Changes need an authorized mutual written addendum. Customer written consent is required for subcontracting/assignment and use of its IP, name or logo; supplier remains liable. Confidentiality/security survive expiry; return customer materials on request/end. Apply proportionate ISO/IEC27001, ISO/IEC22301, ISR/DESC/cloud and applicable PCI DSS controls. Maintain HSE and continuity. Customer audit/offset rights apply. Arabic prevails if versions differ.'

ob5194='''COMMERCIAL / PAYMENT — AED 512,506.76 excluding VAT, final fixed total including expenses (p4 cl5). Monthly payments within 30 days after invoice submission accompanied by approved, duly signed Service Completion Form confirming satisfactory delivery (p23 App3). Actual invoice/payment/completion status is unverified. Printed annual fee lines are preserved as annual packages; original quantities and monthly figures are in fee descriptions. Monthly figures total AED42,708.90; ×12 is AED512,506.80, AED0.04 above the annual total. Do not silently rebalance.

PENALTIES / LIABILITY — Failure to supply services/materials or delay beyond the granted period permits measures under Dubai Law12/2020 and relevant laws (pp3–4 cl4; p16 cl12.16). No numeric penalty rate, service credit formula or penalty cap is specified. A supplier exemption application needs proof of emergency, force majeure, customer-caused delay or another cause outside supplier control, and customer consent. The compensation paragraph states a 100% contract-value liability limit; indirect/consequential losses and lost profit are excluded with exceptions for gross negligence, fraud or confidentiality breach (pp13–14 cl12.9). This liability limit is not a delay-penalty cap.

GUARANTEE / RENEWAL / TERMINATION — Final unconditional irrevocable bank guarantee: 10% of contract value, from a bank operating in the State, effective from start and valid90days after contract end; revocation requires customer consent. Actual guarantee provision is unverified (p4 cl5.3). Customer written intention to renew30days before expiry; no unconditional automatic renewal (p3 cl2). Unrectified breach:15working-day cure after written notice (p9 cl9.1). Customer early termination: at least30days written notice, paying value of supplied materials/services (p10 cl9.2). Force-majeure notice within7working days with details, supporting proof and mitigation; timeline extension by agreement (pp18–19 cl14). Amicable dispute period30days, then senior management; Dubai law/UAE federal law and Dubai Courts (p11 cl10).

GOVERNANCE — '''+common_governance+''' (Clauses3,6–8,12–16.)

CONTACTS — Huda Salim AlHashmi, Principal Project Manager, hudasalim.alhashmi@digitaldubai.ae,04-5599559; Mohammed Ahmed Abdo Al Omari, Customer Experience Products Lead, mohammad.alomari@vitronic.com,04-3290009. Notices in person, registered mail, email or mutually agreed means; representative changes by email (pp20–21 cl17).

SOURCE HISTORY — Supplier CEO Dr Youssef El Hansali signed05-Dec-2025; service term01-Jan–31-Dec-2026; DDGE CEO H.E.Matar AlHumairi countersigned09-Jan-2026 11:47UTC+4 (pp3,22). These are source events, not Hub audit events. Actual completion, acceptance, invoices/payments and guarantee issue/return are unverified.

SOURCE LIMITS — Requisition12500433 (p1). Technical/financial offerQU040000173,Jan-2025, references12500433 proposal.pdf (p23); that separate proposal is not embedded and was not verified. Numeric resolution/availability targets and the response clock outside coverage hours are not specified; keep them unknown. Customer must provide remote access, site safety, documentation and initial spare-parts inventory (p24).'''

cov5194='''AMC of Al Qudra Bluscan SSPX/CCH equipment during01-Jan–31-Dec-2026. Appendix3(p23):8Bluscan speed enforcement devices,10Bluscan(CCH) devices, and cleaning of14Bluscan(CCH) radar equipment cabinets. Appendix4(pp23–24): secure remote diagnostics/support; telephone/email support within operational hours; on-site visits if remote resolution is unavailable; repair/replacement of faulty equipment; corrective maintenance restoring normal operation; preventive inspections/upkeep per manufacturer recommendations. Coverage Mon–Fri09:00–18:00 UAE time, public holidays excluded. Excludes vandalism, disaster recovery, consumables and non-standard hardware/software changes not mutually agreed. Escalation applies if resolution exceeds agreed timelines; this PDF gives no numeric resolution target or named escalation chain.'''

ob5196='''COMMERCIAL / PAYMENT — AED440,000 excluding VAT, final fixed price including expenses (pp3–4 cl5). Appendix3(pp20–21) categories: professional resources AED308,000/70%; management modules AED110,000/25%; training/handover/commissioning AED22,000/5%. Planned invoice milestones are recorded as conditions, without invented payment due dates. No invoice-to-payment period is stated. Actual delivery, invoice, acceptance and payment status are unverified.

PAYMENT SOURCE ERRORS — Row1.4 prints28-Feb-25,AED77,000/17.5%, before the01-Jul-25 start; preserve this printed date and do not silently change its year. Final Acceptance row3.1 prints01-Mar-26,AED44,000/5%, while its category is AED22,000/5%. Printed component invoices total AED462,000 versus the signed/category total AED440,000. Keep the final-acceptance amount unknown in structured payments and retain the conflict here; no confirmed AED462,000 payment schedule. Planned end of work31-Mar-2026 differs from contract expiry30-Jun-2026; preserve both (p21).

PENALTIES / LIABILITY — Failure to supply services/materials or delay beyond the granted period permits measures under Dubai Law12/2020 and relevant laws (p3 cl4; p14 cl12.16). No numeric penalty rate, service credit formula or penalty cap is stated. Delay exemption needs supporting proof and customer consent. Compensation paragraph states a100% contract-value liability limit; indirect/consequential losses and lost profit are excluded with exceptions for gross negligence, fraud or confidentiality breach (pp12–13 cl12.9). The liability limit is not a delay-penalty cap.

GUARANTEE / RENEWAL / TERMINATION — Final unconditional irrevocable bank guarantee10% of contract value, effective from start and valid90days after end, revocable only with customer consent; actual provision unverified (p4 cl5.3). Renewal requires customer written intention30days before expiry (p2 cl2). Breach cure15working days after written notice; early termination on at least30days written notice with compensation for supplied materials/services (pp8–9 cl9). Force-majeure notice within7working days with supporting details/proof/mitigation; timeline extension by agreement (pp15–17 cl14). Amicable dispute period30days, then senior management; Dubai/UAE law and Dubai Courts (pp9–10 cl10).

GOVERNANCE — '''+common_governance+''' (Clauses3,6–8,12–16.)

CONTACTS — Huda Salim AlHashmi, Principal Project Manager, hudasalim.alhashmi@digitaldubai.ae,04-5599559; Mohammed Ahmed Abdo Al Omari, Customer Experience Products Lead, mohammad.alomari@vitronic.com,04-3290009. Notices in person, registered mail, email or mutually agreed means; representative changes by email (p18 cl17).

SOURCE HISTORY — Stated term01-Jul-2025–30-Jun-2026 (p2); supplier CEO Dr Youssef El Hansali signed27-Nov-2025; DDGE CEO H.E.Matar AlHumairi countersigned09-Jan-2026 11:47UTC+4 (p19). Planned final acceptance01-Mar-2026 and end of work31-Mar-2026 (p21) are not proof of actual acceptance/completion. No extension/renewal is verified.

SOURCE LIMITS — Requisition12500298 (p1). Appendices1/2 reference V4.0,May-2025,DDGE12500298 Proposal.pdf (p20); separate proposal is not embedded/unverified. The21-page source has no SLA appendix, numeric response/resolution/availability targets or coverage hours. Do not copy targets from another contract.'''

cov5196='''OYOON159 ANPR Data Management Solution: allocation of professional human resources for ANPR operations optimization; technology enhancement of existing software; development/deployment of Dashboard and Management modules; training,handover and commissioning to Oyoon Operations (p21 App3). Contract term01-Jul-2025–30-Jun-2026 (p2); planned work period01-Jul-2025–31-Mar-2026 (p21). No verified support model, engineer headcount, SLA response/resolution target, coverage hours or covered environment list is provided by this PDF. Separate proposalV4.0,May-2025 is referenced only and remains unverified (p20).'''

def norm(s):
    # Keep compact wording readable when pasted into the Hub's multiline fields.
    import re
    s=re.sub(r'(?<=[a-zA-Z])(?=\d)', ' ', s)
    s=re.sub(r'(?<=\d)(?=[a-zA-Z])', ' ', s)
    s=s.replace('AED','AED ').replace('days',' days').replace('working',' working').replace('hours',' hours')
    s=s.replace('p ', 'p').replace('pp ', 'pp')
    return s.replace('QU 040000173', 'QU040000173')

def pay(condition, percent=None, amount=None):
    return {'condition':condition,'percentage':percent,'amount':amount,'dueDate':None,'status':'Pending','paidOn':None,
            'status_meaning':'Required Hub workflow default for a recorded contract term; actual invoice/payment status is unknown, not asserted unpaid.'}

def phase(name,desc,date):
    return {'phase':name,'description':desc,'completionPercent':None,'date':date}

c94={
    'reference':'5194 of 2025','clientId':3,'projectId':15,'projectCode':'OYOON-182-AMC-2026','ownerUserId':1,'owner':'Laith Hamdan',
    'mainFields':{'title':'OYOON 182 AMC 2026 Al Qudra Bluscan SSPX, CCH','contractReference':'5194 of 2025','type':'Maintenance','status':'Active','startDate':'2026-01-01','endDate':'2026-12-31','renewalTerms':'RenewalByAgreement','noticeDays':30,'currency':'AED','supportModel':'Hybrid','support24x7':False,'supportDays':['Monday','Tuesday','Wednesday','Thursday','Friday'],'supportFrom':'09:00','supportTo':'18:00','supportTimeZone':'Asia/Dubai','onSiteEngineersRequired':None,'supportHours':'Public holidays excluded. UAE time Mon–Fri09:00–18:00 (p24). P1 immediate action/1h response. Numeric resolution targets and response-clock handling outside coverage hours are unspecified.','coverage':norm(cov5194),'obligations':norm(ob5194),'slaPauseWhileWaitingOnCustomer':False,'environmentIds':[]},
    'slaTargets':[{'priority':x['priority'],'responseMinutes':int(x['response_hours']*60),'resolutionMinutes':None,'basis':'Unknown','notes':x['severity_label']+': '+x['description']+'. Explicit response target; no numeric resolution target or confirmed clock basis (p24 App4).'} for x in facts['5194']['sla']['response_targets']],
    'milestones':[
        phase('AMC service period start','Stated maintenance period begins; actual completion is not inferred (p3 cl2).','2026-01-01'),
        phase('Monthly service and completion evidence','Recurring maintenance throughout2026; approved signed Service Completion Form accompanies each invoice. No fixed monthly day specified (p23 App3).',None),
        phase('AMC service period end','Stated term expiry; renewal requires customer written intention30days before expiry (p3 cl2).','2026-12-31')
    ],
    'fees':[{'description':f"{x['description']}; {x['quantity']} units; 2026 annual package. Printed monthly AED{x['monthly_amount_aed']:,.2f}; annual AED{x['annual_amount_aed']:,.2f} (p23 App3).",'unit':'year','quantity':1,'unitPrice':x['annual_amount_aed'],'normalization':'One annual package preserves stated annual aggregate; original asset quantity is descriptive, not a multiplier.'} for x in facts['5194']['fee_lines']],
    'payments':[pay('Monthly payment within30days after invoice plus approved,duly signed Service Completion Form; actual invoice/payment status unknown (p23 App3).')],
    'penaltyClauses':[],
    'penaltyGuidance':'The available calculation model must not be populated with a synthetic fixed amount or percentage. If live UI offers manual/text-only clauses, use the statutory rule from Obligations; otherwise preserve it in Obligations. The100% liability cap is not a penalty cap.',
    'sourceDocument':facts['5194']['source_pdf'],
    'feeTotalExpected':512506.76
}

payments96=[]
for x in facts['5196']['printed_milestone_rows']:
    if 'row' not in x or '.' not in x['row']: continue
    conflict=x['row']=='3.1'
    desc=f"{x['row']} {x['description']}; planned invoice {x['planned_invoice_date_as_printed']}; actual invoice/payment status unknown (p21)."
    if x['row']=='1.4': desc+=' Printed2025date predates start; year unconfirmed.'
    if conflict: desc+=' Source amount44,000 conflicts with category22,000/5%; amount unconfirmed.'
    payments96.append(pay(desc,x['payment_percent'],None if conflict else x['invoice_amount_aed']))

c96={
    'reference':'5196 of 2025','clientId':3,'projectId':None,'projectIdGuidance':'Parent has the approved5196project mapping; bind that project. Do not assign5194project15.','ownerUserId':1,'owner':'Laith Hamdan',
    'mainFields':{'title':'OYOON 159 ANPR Data Management Solution','contractReference':'5196 of 2025','type':'Implementation','status':'Ended','startDate':'2025-07-01','endDate':'2026-06-30','renewalTerms':'RenewalByAgreement','noticeDays':30,'currency':'AED','supportModel':'Unknown','support24x7':False,'supportDays':[],'supportFrom':'','supportTo':'','supportTimeZone':'','onSiteEngineersRequired':None,'supportHours':'No support hours or SLA response/resolution targets specified in the21-page PDF. Do not retain default support days/times. Referenced V4.0 proposal is unverified (p20).','coverage':norm(cov5196),'obligations':norm(ob5196),'slaPauseWhileWaitingOnCustomer':False,'environmentIds':[]},
    'slaTargets':[],
    'milestones':[
        phase('Start of Work (planned)','Planned work start and stated contract start (pp2,21); actual work completion unverified.','2025-07-01'),
        phase('Professional resources / ANPR operations optimization','Resource allocation phase. Planned invoice dates31-Aug-25,31-Oct-25,31-Dec-25 and printed28-Feb-25; final date predates start and remains unresolved. These are invoice milestones, not actual completion (p21).',None),
        phase('Technical plan and software enhancement (planned invoice milestone)','Technical proposal plan and technology enhancement of existing software. Printed planned invoice milestone; actual delivery/completion unverified (p21).','2025-09-30'),
        phase('Dashboard and Management modules (planned invoice milestone)','Complete development/deployment of2modules. Printed planned invoice milestone; actual delivery/completion unverified (p21).','2026-02-28'),
        phase('Training,handover,commissioning / Final Acceptance (planned)','Planned final acceptance only; source amount44,000 conflicts with category22,000/5%. No actual acceptance certificate verified (p21).','2026-03-01'),
        phase('End of Work (planned)','Printed planned end of work31-Mar-2026; distinct from contract expiry30-Jun-2026; actual completion unverified (pp2,21).','2026-03-31')
    ],
    'fees':[{'description':x['description']+f"; {x['percent']}% category; stated contract allocation excluding VAT (p21 App3).",'unit':'lump sum','quantity':1,'unitPrice':x['amount_aed']} for x in facts['5196']['payment_categories']],
    'payments':payments96,
    'penaltyClauses':[],
    'penaltyGuidance':c94['penaltyGuidance'],
    'sourceDocument':facts['5196']['source_pdf'],
    'feeTotalExpected':440000,
    'paymentAmountCheck':'Known nonconflicting component amounts total418,000; final acceptance amount is blank because source conflicts. Percentages total100%. Printed uncorrected component invoice sum462,000 is NOT a confirmed schedule.'
}

result={'purpose':'Hub-ready UI content, not an API request. Use observed live form labels/options. No browser/Hub mutations performed by this subagent.','rules':['All completion percentages blank; percentages in payment rows are allocation terms, not delivery completion.','All payment dueDate fields blank: planned invoice dates are not payment due dates.','Pending is the only neutral available default in the inspected form; explicitly state actual status unknown. If live UI offers Unknown, prefer Unknown.','No numeric penalty clauses are created without a verified contractual formula.','Do not apply default support calendars to5196.','Source history belongs in narrative; Hub History remains the truthful creation/edit audit.'], 'contracts':[c94,c96]}
for c in result['contracts']:
    c['mainFields']['supportHours']=norm(c['mainFields']['supportHours'])
    for rowset in ['milestones','payments','fees']:
        for row in c[rowset]:
            for k,v in row.items():
                if isinstance(v,str): row[k]=norm(v)
    assert round(sum(x['quantity']*x['unitPrice'] for x in c['fees']),2)==c['feeTotalExpected']
    assert all(x['dueDate'] is None for x in c['payments'])
    assert len(c['mainFields']['supportHours']) <= 200
    assert len(c['mainFields']['coverage']) <= 4000
    assert len(c['mainFields']['obligations']) <= 4000
    assert all(len(x['condition']) < 500 for x in c['payments'])
out=OUT/'hub-ready-5194-5196.json'
out.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(out)
for c in result['contracts']:
    print(c['reference'],'fields lengths',[(k,len(c['mainFields'][k])) for k in ['coverage','obligations','supportHours']], 'rows',[(k,len(c[k])) for k in ['slaTargets','milestones','fees','payments']])
