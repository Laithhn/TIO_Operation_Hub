import json,hashlib,re
from pathlib import Path

out=Path(__file__).parent
source=Path(r'C:\Users\lmh\Downloads\12500433 proposal.pdf')
prior=json.loads((out/'hub-ready-5194-5196.json').read_text(encoding='utf-8'))['contracts'][0]
support='Public holidays excluded; Mon–Fri09:00–18:00 UAE. Targets count support hours from call logging (proposal p28). No fixed resolution time (p7); max2parallel calls (p26).'
coverage='''2026 AMC:8Bluscan speed-enforcement devices,10Bluscan(CCH) devices,14Bluscan(CCH) radar-cabinet cleaning units; signed p23 annual fees unchanged. Secure remote diagnostics/telephone/email support, on-site visits when remote resolution is unavailable, faulty-equipment repair/replacement, corrective restoration and manufacturer-recommended preventive upkeep (signed pp23–24).
ProposalQU040000173,Jan-2025 supplements scope: FM1-based POLISCAN SPEED/SSPX systems have active support/maintenance/development(LevelA); accessories are LevelB,maintenance effort limited toP1/P2; no named LevelC products (proposal p30). Standard coverage Mon–Fri09:00–18:00 UAE/GMT+4; target response1/8/16/72hours counts normal operational hours from logging, not24x7 (pp28,34). Extended telephone service outside normal hours is explicitly NOT included; the outside-hours P1 schedule onp23 is only an example.
Customer provides operational infrastructure,site safety,documents,secure remote access,asset access/site contact,third-party work/material and initial spares for swap-out; follow incident/RMA reporting and first-level checks (pp20–21,25,31–32). Vandalism/disaster recovery,consumables,unagreed changes,installation/moving equipment and non-normal-use faults are excluded (pp21,35). Recommendations: initial spare inventory2%LRUs+2%SRUs and adequate consumables;4-week repair expectation excluding transport/6weeks including transport is a supply-chain estimate,not a resolution SLA (p20). No fixed solution time or uptime percentage (p7).'''
ob='''SIGNED TERMS — DDGE/VITRONIC,requisition12500433; term01-Jan–31-Dec-2026; fixed AED512,506.76 excluding VAT (signed pp1,3–4). Monthly payment within30days of invoice submission with approved,duly signed Service Completion Form (p23). Printed monthly fee sum AED42,708.90×12=512,506.80 versus stated annual512,506.76: preserve4-fils rounding difference. Actual invoices,payments,completion and bank-guarantee provision are unverified.
SLA / CALL PROCESS — P1/P2/P3/P4 response1/8/16/72hours (signed p24;proposal p28). Proposal explicitly limits targets to normal operational hours,from call logging:SupportHours basis. No numeric resolution commitment; p7 says no specific solution time constraints. Callback within1support hour after service call (p25) is distinct from priority response targets. Maximum2parallel service calls; assign tracking number,provide progress/closure timestamp/action summary (pp25–26). Customer first-level checks precede reporting. P1 immediate work to restore via correction/workaround; P2 affects operation without workaround; P3 no operational impact; P4 software enhancement request (p27).
ESCALATION — P1 target exceeded by8working hours or P2 by24working hours → Head of Technical Department; P3 moves toP2. Normal operational hours apply. Senior management contacts customer counterpart; customer may escalate at any time (p29). These are escalation thresholds,NOT resolution targets. Detailed P1/P2 fault investigation on request and service review meetings as appropriate (p33).
PENALTIES / GUARANTEE — Failure/delay measures under Dubai Law12/2020; no numeric SLA penalty rate/formula/cap (signed pp3–4,16). Excusable-delay exemption requires proof and customer consent. Compensation paragraph states100% contract-value liability cap with stated indirect-loss exclusions/exceptions; not a penalty cap (pp13–14). Bank guarantee10%,valid90days after end,revocable only with customer consent (p4). Breach cure15working days; early termination notice30days with payment for supplied services/materials (pp9–10). Force-majeure notice7working days (pp18–19); amicable dispute period30days,then senior management/Dubai Courts (p11).
PRECEDENCE / PRICING — Signed cl1(p2) makes contract terms prevail. Keep signed renewal by written intention30days before expiry(p3),monthly net30+SCF,fixed2026fees,Dubai/UAE law. Proposal conflicting boilerplate: auto-renew/90-day cancellation(p37),12-month extension/six-month cancellation(p41),annual payments(p37),generic30%/60%/10%+14day terms and arrears interest9points above base(p43),German law/venue(p47). Do not apply those as overrides. Proposal2025–2029 fee tables(pp39–40) are supporting quote history,not accepted renewals; final detailed table repeats2028dates although summary labels2029. 2026table matches signed fees.
OUT-OF-SCOPE ONLY — Proposal p37 quotes pre-booked AED4,300/business day if paid in advance; standard AED5,400/business day otherwise,plus agreed expenses(pp24,37). Do not add conditional rates to annual contract total or charge signed included site visits automatically. T&M/additional spend needs authorized customer approval; no unapproved system-software modifications(pp31–32).
GOVERNANCE / HISTORY — Signed consent/addendum,IP,confidentiality/security,HSE,audit/offset and Arabic precedence remain(cl3,6–8,12–16). Supplier CEO Dr Youssef El Hansali signed05-Dec-2025; DDGE CEO H.E.Matar AlHumairi countersigned09-Jan-2026 11:47UTC+4(p22). Contacts remain signed p21. Proposal AppendixD/service catalogue referenced onp28 is absent from this47-page PDF; no extra target invented.'''

def readable(s):
    s=re.sub(r'(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])',' ',s)
    s=re.sub(r',(?=[A-Za-z])',', ',s)
    return s.replace('QU 040000173','QU040000173')
support=readable(support);coverage=readable(coverage);ob=readable(ob)

facts=[
 {'fact':'Response1/8/16/72hours is measured from call logging and only during normal operational hours. Supports changing all four SLA clock bases toSupportHours.','pages':[28],'classification':'Clarification consistent with signed p24; no response value changes.'},
 {'fact':'No specific solution time constraints,especially where program changes are needed. Fixed numeric resolution target remains unknown.','pages':[7]},
 {'fact':'Callback within1support hour of service call,unique tracking number,customer first-level checks,progress updates and closure timestamp/action summary. Maximum2parallel service calls.','pages':[25,26]},
 {'fact':'Head of Technical Department escalation when P1target exceeded by8working hours or P2by24working hours; P3moves toP2; customer may escalate at any time. These are not resolution limits.','pages':[29]},
 {'fact':'Normal remote hours Mon–Fri09:00–18:00 UAE/GMT+4 excluding company holidays. Extended telephone service is explicitly not covered; outside-hoursP1schedule is an example,not coverage. Signed public-holiday exclusion remains governing.','pages':[23,34,39]},
 {'fact':'FM1-based POLISCAN SPEED/SSPX systems LevelA; accessories LevelB with maintenance effort limited toP1/P2. No named LevelC products.','pages':[30]},
 {'fact':'Customer provides infrastructure/site safety,documents,secure remote connection/certificates,access/site contact,third-party works/material and standardized incident/RMA descriptions; customer verifies closure,approves T&M limits and system modifications.','pages':[21,25,31,32]},
 {'fact':'Recommended initial spare inventory2%LRUs+2%SRUs,adequate wear parts/consumables. Average repair expectation4weeks without transport/6weeks including transport is a supply-chain planning assumption,not SLA resolution target.','pages':[20]},
 {'fact':'Warranty covers faulty non-consumable/non-wear hardware repair at repair centre and software rectification validated on customer test/staging site; customer corrective levels/spare swap-out apply.','pages':[21]},
 {'fact':'Generic workflow: hotline/remote triage,customer-trained device swap,RMA repair,field-service escalation,application/product-development escalation; preventive condition-based/predetermined checks and calibration as required; no numeric preventive interval given.','pages':[12,13,14,15,16,17]},
 {'fact':'Detailed P1/P2 fault investigations upon customer request; service review meetings as appropriate.','pages':[33]},
 {'fact':'Excluded additionally: installation/moving systems,equipment not in supported list,consumable/accessory repair or renewal,non-normal-use faults,unagreed configuration changes. Vandalism/disaster recovery require separate process/authorization/orders.','pages':[21,35]},
 {'fact':'Conditional out-of-scope rates: AED4,300/business day pre-booked/paid in advance; AED5,400/business day standard otherwise. Approved manpower/travel and necessary expenses may apply; do not add to2026annual retainer or assume charges for included signed visits.','pages':[24,37]},
 {'fact':'Mutual no-employment-offer covenant during agreement and12months after completion; further staffing familiarity/individual staff not guaranteed.','pages':[7]},
 {'fact':'No OS/Windows licences included; agreed system-software licences only.','pages':[7]}
]
result={
 'contract_reference':'5194 of 2025','hub_contract':'CT1011','source_pdf':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pages':47,'quotation':'QU040000173','date':'January2025',
 'new_material_facts':facts,
 'conflicts_and_precedence':[
  {'proposal':'Automatic annual renewal,cancel90days(p37); elsewhere further12months upon approved proposal with six-month notice(p41).','signed':'Customer written renewal intention30days before31-Dec-2026 expiry(p3).','action':'Retain signed RenewalByAgreement/notice30days and2026end date.'},
  {'proposal':'Annual payments(p37),net30invoice-date(p38),GTCdefault30%/60%/10%+14day schedule and arrears9percentage points above base(p43).','signed':'Monthly payment within30days of invoice submission with approved signed Service Completion Form(p23).','action':'Keep signed monthly conditional payment; do not add GTC instalments or synthetic payment dates.'},
  {'proposal':'German law and supplier-seat jurisdiction(p47),generic liability/warranty provisions(pp44–46).','signed':'Dubai/UAE law,Dubai Courts(p11),specific compensation paragraph and fixed-price terms.','action':'Signed cl1(p2) governs discrepancies; do not replace signed legal/payment/liability terms.'},
  {'proposal':'Out-of-scope site consultancy may be chargeable(pp23–24).','signed':'Site visits when remote resolution unavailable and repair/replacement included(pp23–24).','action':'Keep included contracted activities; conditional proposal rates only outside agreed scope with approval.'},
  {'proposal':'Detailed final future fee table repeats2028dates while yearly summary calls it2029(p40).','action':'Preserve inconsistency in source narrative; no accepted future contract/renewal inferred.'}
 ],
 'proposal_fee_history_not_new_contracts':[
  {'year':2025,'annual_aed':488101.68,'pages':[39,40]},
  {'year':2026,'annual_aed':512506.76,'pages':[39,40],'note':'Matches signed2026total; no fee changes.'},
  {'year':2027,'annual_aed':512506.76,'pages':[39,40]},
  {'year':2028,'annual_aed':536911.85,'pages':[40]},
  {'year':2029,'annual_aed':536634.65,'pages':[40],'note':'Summary says2029; associated detailed table repeats2028dates. Not verified accepted renewal.'}
 ],
 'recommended_field_changes':{'supportHours':support,'coverage':coverage,'obligations':ob},
 'sla_row_updates':[{'priority':x['priority'],'responseMinutes':x['responseMinutes'],'resolutionMinutes':None,'basis':'SupportHours','notes':f"{x['priority']}: response target during normal operational hours from call logging (proposal p28); resolution not fixed (p7). Escalation thresholds in Obligations are separate."} for x in prior['slaTargets']],
 'unchanged_fields':['2026start/end','RenewalByAgreement/30days','Hybrid','Mon–Fri09:00–18:00/AsiaDubai/public holidays excluded','3annual fee packages/512506.76AED','Monthly net30after signed SCF','No numeric penalty formula','Unknown on-site engineer count'],
 'missing_references':['AppendixD/service catalogue referenced p28 not present in47page PDF.','Company holidays2022footnote p34 stale; no dated2026holiday calendar included.'],
 'no_mutations':'Original signed contract,proposal,Hub and current hub-ready JSON unchanged.'
}
assert len(support)<=200,len(support)
assert len(coverage)<=2000,len(coverage)
assert len(ob)<=4000,len(ob)
(out/'supplemental-5194-proposal.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Lengths',len(support),len(coverage),len(ob))
