from pathlib import Path
import json, hashlib
from pypdf import PdfReader

OUT = Path(__file__).resolve().parent
DOWNLOADS = Path('C:/Users/lmh/Downloads')

def fact(text, pages, clause=None, kind='main_contract'):
    value = {'text': text, 'pages': pages, 'source_kind': kind}
    if clause:
        value['clause'] = clause
    return value

COMMON = {
    'source_note': 'Same English provisions read independently in both PDFs. Page references below apply to each contract. Main contract and signed Operation & SLA appendix are kept distinct.',
    'acceptance': fact('All works, services, supplies and deliverables are subject to the First Party\'s inspection, examination and acceptance. Acceptance requires its formal written approval. Nonconforming work/service/supply may be rejected and must be re-performed or rectified at no additional cost.', [3], '1'),
    'precedence': fact('Documents and appendices are integral; if they disagree, terms of the Contract prevail. Arabic prevails over English in a language conflict. This extraction does not adjudicate conflicts or interpret the Arabic text.', [2,27], '1; 15(4)'),
    'amendments': fact('Scope, quality and other amendments require mutual agreement, a written amendment signed by duly authorized representatives, and a mutually approved addendum.', [3,4], '3'),
    'performance_security': fact('Final, unconditional and irrevocable bank guarantee from a bank operating within the State: 2% of total contract value. Starts on contract start date and remains valid 90 days after the contract period ends. Revocation requires First Party consent; return follows an approved certificate of completion.', [5,18], '5(3); 11(3)'),
    'general_sanctions': fact('Failure to provide services/materials or exceeding the granted time limit permits legal action under Law 12 of 2020 and relevant UAE laws. Delay penalties/fines/measures are referred to that law; no numeric daily delay rate or service-credit cap is stated in these general clauses. An exemption for emergency, force majeure, First Party cause or other cause beyond supplier control requires supporting proof and First Party consent.', [4,22,23], '4; 12(16)'),
    'liability': fact('Supplier indemnifies direct damages/losses and related claims arising from breach. Wording excludes indirect losses, consequential damages and lost profits, save damages arising from gross negligence, fraud or confidentiality breach. It then states compensation shall not exceed 100% of total contract value. Preserve this clause wording; it is not an express cap on SLA deductions, and the treatment of exceptions is not resolved here. Supplier remains liable for third-party performance.', [20,21], '12(9)'),
    'setoff': fact('First Party may offset/deduct from supplier payments sums, payments or claims owed under the contract or from supplier failure to perform.', [26], '15(3)'),
    'termination': [
        fact('For breach: First Party may terminate if supplier does not rectify within 30 working days following written notice; supplier is liable for First Party costs caused by termination.', [16], '9(1)'),
        fact('Early termination: First Party gives at least 30 days written notice and compensates the value of materials supplied/services rendered.', [16], '9(2)'),
        fact('Additional grounds: fraud/manipulation/bribery conviction; bankruptcy/insolvency/liquidation preventing performance; substitution of supplier; inability to execute wholly or partly. First Party may call performance security, enforce at supplier expense and seek damages.', [16,17], '9(3)-(4)')
    ],
    'disputes': fact('Seek amicable resolution. If unresolved 30 days after dispute arises, refer to both parties\' senior management, whose decision is described as final and binding. Dubai law and applicable UAE federal law govern; disagreement is referred to Dubai Courts. Clause 18 also supplies operational escalation.', [17,18], '10'),
    'first_party_obligations': fact('Pay according to contract; provide written instructions/directives/premises remarks; return performance security after approved completion certificate.', [18], '11'),
    'supplier_delivery_governance': fact('Perform with diligence; obtain First Party written approval of nominated professionals; provide pre-approved qualified specialists and an alternative when the responsible person is unavailable; attend requested progress meetings; collaborate and supply relevant data without cost; consider written comments; maintain complete execution/obligation records and present them upon request; maintain necessary approvals, consents, permits, licenses and authorizations.', [18,19,20,21], '12(1)-(10)'),
    'subcontracting_assignment': fact('Subcontracting and assignment require First Party prior written consent. Notify subcontractor details/items; supplier retains liability, including joint liability with assignee/sub-party.', [15,22], '8; 12(15)'),
    'intellectual_property': fact('Each party retains pre-existing IP. No acquisition of rights over other-party information/outputs/reports; use, licensing or transfer requires prior written consent or separate written agreement as applicable. Notify infringement. On expiry/termination, generated data/deliverables/documents/reports/information assets vest in First Party and must be returned or securely deleted, with written certificate.', [5,6,7], '6'),
    'confidentiality': fact('Keep First Party information/data confidential; no use, disclosure or transfer without prior written consent. Duties survive expiry/termination. Public-domain/legal-disclosure exception requires First Party notification. Third-party service-provider agreements must require compliance.', [7,13,14,23], '7(1),(7),(10),(11); 12(17)'),
    'security_controls': fact('Security controls aligned to First Party requirements: ISO/IEC 27001, ISO/IEC 22301, ISR, DESC and applicable DESC Cloud Security Standard; additional relevant DESC standards; PCI DSS/equivalent if payment data is processed/stored. Follow classification-based storage/management requirements and relevant legal updates without additional cost to First Party.', [8,9,14,23], '7(2),(8)-(10); 12(18)'),
    'cyber_incident_notice': fact('Notify First Party in writing promptly and no later than 24 hours after an actual or suspected security/cyber incident; provide detailed nature/root-cause/corrective-action report under ISR and cooperate with investigation, mitigation and regulators. This is separate from the appendix RCA-after-resolution target.', [14,15], '7(12)'),
    'return_deletion_exit': fact('On expiry/termination or First Party written request, without undue delay return or irreversibly securely delete information/assets, copies, backups and extracts. Retain only as required by law/regulation and continue protection. Give certificate on request. At own cost support timely secure migration, commonly used machine-readable data access and exit procedures for continuity/transfer.', [9,10,11,12], '7(3),(5)'),
    'cloud_ai_data': fact('Cloud use needs First Party and DESC approval; cloud for classified data must use DESC-certified CSP. AI use requires written disclosure and prior First Party approval, equivalent security/confidentiality/data/regulatory controls, written IP/licensing/model/data/output terms, and supplier review/validation before submission; undisclosed/unapproved AI is material breach. No First Party data may be stored, processed or transferred outside UAE without prior written approval and applicable DESC compliance. Personal data is limited to contract purposes and subject to applicable UAE law.', [10,11,12,13,27], '7(4),(6); 15(5)-(6)'),
    'hse_continuity': fact('Observe premises precautions, applicable Dubai HSE laws and relevant international standards for staff safety/environment/service continuity. Promptly report an epidemic disease affecting supplier staff who worked at First Party premises.', [24], '13'),
    'force_majeure': fact('Written notice within 7 working days of force majeure and its impact; late notice disregarded. Supply supporting details and mitigation. Execution extension requires the stated notices/consent and First Party determination in consultation with supplier; resume obligations as feasible. No liability for attributable force-majeure delay; if execution becomes infeasible, termination by operation of law, preserving surviving clauses.', [24,25,26], '14'),
    'phase_postponement': fact('First Party may postpone a phase if supplier is notified before that phase\'s specified commencement date under the notices clause.', [26], '15(1)'),
    'relationship_and_conduct': fact('Neither party acts as the other\'s agent/representative or may create commitments/obligations for it. Prior written consent is required to use the other party\'s name/logo; supplier must avoid damaging First Party reputation/goodwill, deliberate adverse acts and third-party IP infringement. Supplier warrants no actual/potential conflict of interest and must disclose one immediately; First Party may take action including termination without liability.', [6,21,22,26,27,28], '6(5)-(7); 12(11)-(14); 15(2),(7)'),
    'audit': fact('First Party can audit compliance and request statements/reports/records; scope includes IT/security controls, ISR, DESC and ISO compliance. It may use a specialist third party; supplier supplies data/documents/facilitation without extra cost. This compliance-audit duty is distinct from an optional supplier system-audit service in the SLA appendix.', [28], '16'),
    'notices': fact('Official notices to designated contacts may be delivered in person, registered mail, email, or mutually agreed means. Notify representative changes by email and appoint replacement.', [28,29,30], '17'),
    'notice_contacts': [
        {'party':'First Party','name':'Huda Salim AlHashmi','title':'Principal Project Manager','email':'hudasalim.alhashmi@digitaldubai.ae','telephone':'04-5599559','pages':[29]},
        {'party':'Second Party','name':'Mohammed Ahmed Abdo Al Omari','title':'Customer Experience Products Lead','email':'mohammad.alomari@vitronic.com','telephone':'04/3290009','pages':[29,30]}
    ],
    'escalation_rules': fact('L1 Operational/Technical; L2 Supervisory/Functional; L3 Executive/Governance. Automatically escalate upon response/resolution breach or escalation trigger. Remains active until case/dispute closure; document by email/authorized ticketing. No waiver of remedies. P1 outage/major business impact/security-compliance risk: L2 immediately, then L3 if unresolved. P2 High significant impact/limited workaround: start L1 and escalate if SLA breached. P3/P4 noncritical: L1; escalate if repeated or SLA breached. No numeric per-level deadline/max closure duration is printed despite general references to specified/maximum timelines.', [30,31,32], '18'),
    'escalation_contacts': [
        {'party':'First Party','level':'L1','role':'Project Manager','name':'Huda Salim AlHashmi','title':'Principal Project Manager','email':'hudasalim.alhashmi@digitaldubai.ae','telephone':'+971 55 301 1333','pages':[31]},
        {'party':'First Party','level':'L2','role':'Procurement Team','name':'Shaikha Ibrahim Abdulla Almarzooqi','title':'Senior Contracts and Procurement Specialist','email':'shaikha.almarzooqi@digitaldubai.ae','telephone':'+971 50 138 2282','pages':[31]},
        {'party':'First Party','level':'L3','role':'Director','name':'Abdulla Ali Salem Bin Kenaid AlFalasi','title':'Director','email':'abdulla.alfalasi@digitaldubai.ae','telephone':'+971 55 115 6363','pages':[31]},
        {'party':'Second Party','level':'L1','role':'Primary Management Contact','name':'Abdalrhman Asaad','title':'Head of Innovation & Technology Development','email':'Abdalrhman.Asaad@vitronic.com','telephone':'+971 52 692 2465','pages':[31]},
        {'party':'Second Party','level':'L2','role':'Secondary Management Contact','name':'Laith Hamdan','title':'Technology Implementation & Operation Leader','email':'Laith.Hamdan@vitronic.com','telephone':'+971 52 601 9484','pages':[32]},
        {'party':'Second Party','level':'L3','role':'CEO','name':'Dr Youssef El Hansali','title':'CEO','email':'Youssef.El_Hansali@vitronic.com','telephone':'+971 52 833 3330','pages':[32]}
    ]
}

def metric(value,unit):
    return {'value':value,'unit':unit}

def sla(priority,label,description,response=None,workaround=None,mttr=None,resolution=None,coverage=None,note=None):
    d={'priority':priority,'source_label':label,'description':description,'response':response,'workaround':workaround,'mttr':mttr,'resolution':resolution,'support_hours':coverage,'pages':[36],'source_kind':'signed_operation_sla_appendix'}
    if note:d['note']=note
    return d

def make(number,title,req,value,start,end,filename,ddge_signature,vendor_date,email_context):
    path=DOWNLOADS/filename
    reader=PdfReader(path)
    c={
        'contract_number':number,'year':2026,'target_client':'OYOON Center',
        'details':{
            'title':title,'requisition_number':req,'contract_document_date':'2026-07-22',
            'type_evidence':'AMC / service-level support contract; title and signed Operation & SLA appendix',
            'first_party':'Digital Dubai Government Establishment','first_party_affiliation':'Digital Dubai Authority',
            'second_party':'VITRONIC MACHINE VISION MIDDLE EAST (L.L.C.)',
            'term_start':start,'term_end':end,'source_pages':[1,2,3],
            'signature_status':'Both parties\' signature appearances observed in downloaded PDF; cryptographic authenticity not validated',
            'operational_status_note':'Term covers 10 November 2026; no inference of service acceptance, invoice settlement or BG issuance.'},
        'sla_targets':[],
        'delivery':{
            'service_scope':[], 'acceptance':COMMON['acceptance'],
            'service_records_and_staffing':COMMON['supplier_delivery_governance'],
            'separate_hardware_delivery_or_installation_milestones':None,
            'separate_milestones_note':'No separate hardware shipment, installation or project-acceptance milestone dates are printed. Appendix 3 dates are planned invoice dates, not proof of delivery/payment.',
            'rca':fact('For all incidents, provide/share RCA within 48 hours of resolution.',[36],kind='signed_operation_sla_appendix'),
            'cyber_incident_notice':COMMON['cyber_incident_notice']},
        'fees_payments':{
            'currency':'AED','total_excluding_vat':value,'vat_basis':'Exclusive of VAT and applicable fees; no VAT rate or VAT-inclusive total printed',
            'fixed_price':True,'all_expenses_included_in_base_value':True,'source_pages':[4],
            'payment_schedule':[], 'schedule_source_pages':[34],
            'invoice_due_days':None,'payment_terms_note':'Appendix 3 is a planned invoice schedule. No Net N days or settlement evidence is specified in this PDF.',
            'additional_fee_services':[], 'performance_security':COMMON['performance_security'],
            'performance_security_amount_derived':round(value*.02,2),
            'performance_security_derived_note':'Arithmetic only: 2% multiplied by stated ex-VAT contract value; issuance/release not established.',
            'offset_right':COMMON['setoff']},
        'penalties':{
            'general_sanctions':COMMON['general_sanctions'],'general_compensation_cap_and_liability':COMMON['liability'],
            'sla_payment_deductions':None,'numeric_daily_delay_rate':None,'express_sla_deduction_cap':None,
            'rule_note':'Do not treat the general 100% compensation wording as an express SLA deduction cap.'},
        'coverage':{'products':[],'channels':['Telephone','Email','JIRA ticketing system'],'source_pages':[35,36],
                    'service_hours':None,'calendar_or_business_clock_basis':None,'availability_percentage_target':None,
                    'onsite_condition':None,'exclusions':[]},
        'documents':{
            'original_pdf':str(path),'page_count':len(reader.pages),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'source_unchanged':True,'embedded_files_found':list(reader.attachments.keys()),
            'appendices':[
                {'number':1,'title':'Technical Offer','reference':'QU040000261','date_as_printed':'Jul-26','pages':[34],'limitation':'Only reference/icon appears; underlying offer content is not embedded/recoverable from this PDF.'},
                {'number':2,'title':'Financial Offer','reference':'QU040000261','date_as_printed':'Jul-26','pages':[34],'limitation':'Only reference/icon appears; underlying offer content is not embedded/recoverable from this PDF.'},
                {'number':3,'title':'Payment (Schedule or Milestones)','pages':[34]},
                {'number':4,'title':'Additional Agreements (Operation & SLA) only / Awarded Solution and Service Level Agreement (SLA) Details','pages':[34,35,36]}
            ],
            'render_pattern':str(OUT/f'contract-{number}-page-{{page:02}}.png'),
            'ocr_evidence':str(OUT/'contracts-local-ocr.json'),
            'processing_note':'All 36 pages rendered and local Windows English OCR read. Primary terms, appendices, signature dates and contacts visually verified. Arabic is not independently translated; Arabic-prevails clause retained.'},
        'history':[
            {'event':'Stated service period starts','date':start,'pages':[3]},
            {'event':'Contract document dated','date':'2026-07-22','pages':[1]},
            {'event':'Supplier signature date as printed','date_as_printed':vendor_date,'person':'Dr Youssef El Hansali','role':'CEO','pages':[33]},
            {'event':'First Party signature appearance dated','date':ddge_signature,'person':'H.E. Matar AlHumairi','role':'CEO, Digital Dubai Government Establishment','pages':[33]},
            {'event':'Countersigned-copy email context supplied by parent Outlook review','context':email_context,'evidence_scope':'Parent-provided email context, not independently re-read by PDF extraction agent'},
            {'event':'Source review for Hub import','date':'2026-11-10','note':'Read-only source extraction; no Hub write performed by this extraction agent.'},
            {'event':'Stated service period ends','date':end,'pages':[3]}
        ],
        'renewal_and_termination':{'main_contract_renewal':fact('First Party notifies Second Party in writing of intention to renew 30 days before contract expiration.',[3],'2'),
                                   'termination_general':COMMON['termination']},
        'governance_and_general_terms_reference':'common_general_terms applies to this contract, retaining its main-contract source classification.',
        'conflicts_and_unknowns':[]
    }
    return c

c1=make('5341','Oyoon 174 Zabeel System AMC Renewal','12600254',585600,'2026-06-03','2027-06-02',
        'DDGE Contract Oyoon 174 Zabeel System AMC Renewal-Print-CEsigned (2).pdf','2026-10-05T21:51:00+04:00','03-08-2026',
        '6 October 2026 email from Khalid supplies countersigned contract; LPO process pending at that point. This does not establish a current LPO/payment status.')
c0=make('5340','Oyoon 266 ANPR Data Management AMC','12600246',528000,'2026-07-01','2027-06-30',
        'DDGE Contract Oyoon 266 ANPR Data Management AMC-Print-CEsigned.pdf','2026-09-29T09:48:00+04:00','03-08-2018',
        '29 September 2026 email supplies countersigned copy; LPO pending at that point. This does not establish current LPO/payment status.')

c1['sla_targets']=[
    sla('P1','Critical','Major system impact',metric(1,'hour'),metric(8,'hours'),metric(24,'hours')),
    sla('P2','Urgent','Partial system impact',metric(1,'hour'),metric(24,'hours'),metric(48,'hours')),
    sla('P3','Standard','No operational impact',resolution=metric(14,'days')),
    sla('P4','Enhancement','Feature requests',note='Resolution based on agreed timeline; no fixed numeric target printed.')]
c0['sla_targets']=[
    sla('P1','Critical','Major system impact',metric(1,'hour'),metric(8,'hours'),metric(24,'hours'),coverage='24/7 support explicitly printed for P1'),
    sla('P2','Urgent','Partial system impact, no workaround',metric(1,'hour'),metric(24,'hours'),metric(48,'hours')),
    sla('P3','Standard','Fault detected, no operational impact',mttr=metric(14,'days'),resolution=metric(72,'hours'),note='Both resolution within 72 hours and MTTR within 14 days appear in the same line. Keep both; relationship requires clarification.'),
    sla('P4','Enhancement Request','No operational impact',note='Resolution based on agreed timeline; no fixed numeric target printed.')]

scope1=[
    'Technical support and maintenance for VITIS, RRM and SDB systems',
    'Remote diagnostics and support via secured connection',
    'On-site visits if remote resolution fails',
    'Support through telephone, email or JIRA ticketing system',
    'Allocated Software Operation Engineer',
    'Continuous software maintenance updates (bug fixes only)',
    'Software configuration support',
    'System audit upon request',
    'On-site consultancy for fault analysis, optimization and re-engineering',
    'System administration (remote or on-site, by prior negotiation)',
    'Tailored training on system maintenance, operation and administration',
    'Application support and pre-booked services (charged separately)']
scope0=[
    'Remote diagnostics and support via secured connection',
    'On-site visits if remote support fails (within agreed Turnaround Time; no numeric onsite time printed)',
    'Telephone, email and JIRA ticketing support',
    'Quarterly technical support including system administration, performance tuning, fault diagnosis and repair',
    'Continuous software maintenance updates (bug fixes only) at no additional cost',
    'Software configuration support (remote, scheduled in advance)',
    'System audits upon request (subject to service fees)',
    'On-site consultancy for fault analysis, optimization and re-engineering (subject to fees)',
    'System administration (remote or on-site, by prior negotiation)',
    'Tailored training covering system operation, maintenance, monitoring, troubleshooting and reporting',
    'Application support and development via Professional Services Request (PSR)',
    'Pre-booked/ad-hoc services available upon explicit request (not covered under agreement)']
for c,scope in [(c1,scope1),(c0,scope0)]:
    c['delivery']['service_scope']=[fact(x,[35],kind='signed_operation_sla_appendix') for x in scope]

for c,dates,amount in [(c1,['2026-09-04','2026-12-04','2027-03-04','2027-06-03'],146400),
                        (c0,['2026-10-01','2027-01-01','2027-04-01','2027-06-30'],132000)]:
    c['fees_payments']['payment_schedule']=[{'sequence':i+1,'description':f'System Support and Monitoring – {i+1} payment', 'planned_invoice_date':date,'amount_aed_excluding_vat':amount,'percent':25,'pages':[34],'status':'Planned source schedule; actual invoice/payment not verified'} for i,date in enumerate(dates)]

c1['fees_payments']['additional_fee_services']=[fact('Application support and pre-booked services are charged separately. No rates printed.',[35],kind='signed_operation_sla_appendix')]
c0['fees_payments']['additional_fee_services']=[fact('System audits subject to service fees; on-site consultancy subject to fees; pre-booked/ad-hoc services explicitly outside agreement; application support/development via PSR. No fee rates printed. System administration is by prior negotiation.',[35],kind='signed_operation_sla_appendix')]

base_products=[{'support_level':'A','name':'Vitronic Intelligent Tracking System (VITIS)','version':'3.48.1','pages':[35]},
               {'support_level':'A','name':'Roadside Remote Management (RRM)','version':'2.19.4','pages':[35]},
               {'support_level':'A','name':'Smart Dashboard (SDB)','version':'2.1.0','pages':[35]}]
c1['coverage']['products']=base_products+[
    {'support_level':'B','name':'Backend workers and APIs related to VITIS, RRM and SDB; e.g. EmailWorker, FRWorker, Web and API components','pages':[35]},
    {'support_level':'C/D','name':'No specific products defined; limited or no support provided','pages':[35]}]
c0['coverage']['products']=base_products+[
    {'support_level':'B','name':'Vitronic Intelligent Tracking System','version':'1.4.4','pages':[35]},
    {'support_level':'B','name':'ANPRPool (Main ANPR Pool Service)','pages':[35]},
    {'support_level':'C/D','name':'No specific products defined; limited or no support provided','pages':[36]}]
c1['coverage']['service_hours']='Not specified in the signed PDF; do not assume 24/7 for any priority.'
c0['coverage']['service_hours']='P1 explicitly states 24/7 support. Coverage hours for P2/P3/P4 and a general support calendar are not specified.'
c1['coverage']['onsite_condition']='On-site if remote resolution fails; no numeric on-site attendance commitment printed.'
c0['coverage']['onsite_condition']='On-site if remote support fails, within agreed Turnaround Time; no numeric on-site attendance commitment printed.'
c1['coverage']['exclusions']=[fact(x,[36],kind='signed_operation_sla_appendix') for x in [
    'Dubai Police software not listed in supported products','Unauthorized hardware/software changes','System installation or relocation','Consumables repair/replacement','Faults not caused by normal usage']]
c0['coverage']['exclusions']=[fact(x,[36],kind='signed_operation_sla_appendix') for x in [
    'Dubai Police-supplied software except ANPR Pool Service','Unauthorized hardware/software changes','System installation or relocation','Repair of consumables','Faults not caused by normal usage']]

c1['penalties']['sla_payment_deductions']={
    'trigger':'Resolution targets missed','basis_as_printed':'Deductions applied to monthly/quarterly payments','metric':'ARL','metric_definition':None,'pages':[36],
    'source_kind':'signed_operation_sla_appendix',
    'bands_exact':[
        {'condition':'90% ≤ ARL < 98%','deduction_percent':0.5},
        {'condition':'85% ≤ ARL < 89%','deduction_percent':2},
        {'condition':'80% ≤ ARL < 84%','deduction_percent':5},
        {'condition':'65% ≤ ARL < 79%','deduction_percent':10},
        {'condition':'ARL < 65%','outcome':'Subject to SLA contract cancellation'}],
    'limitations':'ARL definition, calculation method, measurement period, uncovered band edges/gaps and an aggregate credit cap are not specified. Preserve the printed bands; do not repair or infer them.'}
c0['penalties']['sla_payment_deductions_note']='No numeric SLA deduction/credit bands printed in the signed Operation & SLA appendix. Apply only the stated general contractual sanctions/liability; do not copy contract 5341 ARL rates.'
c1['renewal_and_termination']['appendix_renewal']=fact('SLA duration 12 months, 3 June 2026 to 2 June 2027, automatic annual renewal unless terminated with 3 months written notice.',[36],kind='signed_operation_sla_appendix')

c1['conflicts_and_unknowns']=[
    {'issue':'Renewal/notice conflict','detail':'Main clause 2: First Party intention-to-renew notice 30 days before expiry. Appendix: automatic annual renewal unless 3 months written termination notice. Main-contract precedence exists, but do not adjudicate or silently replace either text.','pages':[2,3,36]},
    {'issue':'ARL formula undefined and bands have gaps','detail':'Keep exact 90–<98 / 85–<89 / 80–<84 / 65–<79 bands. No definition/measurement or explicit rule for uncovered ranges is printed.','pages':[36]},
    {'issue':'Support calendar unknown','detail':'No general coverage hours, calendar/business clock basis or availability percentage is specified.','pages':[35,36]},
    {'issue':'Underlying offers missing','detail':'Appendix 1/2 references and icons only; no embedded offer documents. Both contracts print the same offer reference QU040000261.','pages':[34]},
    {'issue':'Priority terminology differs','detail':'Escalation clause calls P2 High; appendix calls P2 Urgent. Preserve source labels and same priority code.','pages':[31,36]}]
c0['conflicts_and_unknowns']=[
    {'issue':'Vendor signature date anomaly','detail':'Page 33 literally prints 03-08-2018, whereas this is a 2026 contract and DDGE signature is 29 September 2026. Do not change source date or infer an intended date.','pages':[1,33]},
    {'issue':'P3 target ambiguity','detail':'Same appendix line states resolution within 72 hours and MTTR within 14 days. Keep both targets and label their metrics; obtain clarification before enforcing one as sole deadline.','pages':[36]},
    {'issue':'Coverage calendar incomplete','detail':'P1 says 24/7; coverage/calendar/business clock basis for remaining priorities is unspecified.','pages':[36]},
    {'issue':'No ARL deduction schedule','detail':'Do not import the separate 5341 penalty bands into 5340.','pages':[35,36]},
    {'issue':'Underlying offers missing','detail':'Appendix 1/2 references and icons only; no embedded offer documents. Both contracts print the same offer reference QU040000261.','pages':[34]},
    {'issue':'Priority terminology differs','detail':'Escalation clause calls P2 High; appendix calls P2 Urgent. Preserve source labels and same priority code.','pages':[31,36]}]
for c in (c1,c0):
    c['conflicts_and_unknowns'].extend([
        {'issue':'No settlement or accepted-delivery evidence','detail':'Planned invoice milestones are not proof of invoice issuance, payment, formal service acceptance or BG issuance.','pages':[3,5,34]},
        {'issue':'Contract audit vs service audit','detail':'Clause 16 compliance-audit assistance without additional cost differs from the SLA system-audit service; avoid blending the scopes.','pages':[28,35]},
        {'issue':'Legal-language scope','detail':'English terms extracted. Contract says Arabic prevails; no independent Arabic legal interpretation performed.','pages':[27]}])

data={
    'schema_version':1,'prepared_at':'2026-11-10','purpose':'Read-only PDF source facts for authorized manual TIO Hub entry; not a claim that Hub changes were made.',
    'target_client':'OYOON Center','source_reference_convention':'Each fact pages array refers to the corresponding contract original PDF in documents.original_pdf. Renders follow documents.render_pattern. Shared terms use identical page positions in both PDFs.',
    'unknown_value_convention':'Null means not specified/verified. Do not fill from another contract, application defaults or assumptions.',
    'common_general_terms':COMMON,'contracts':[c1,c0]
}
target=OUT/'import-5341-5340.json'
target.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(target)
print('Contracts:',len(data['contracts']),'Shared term groups:',len(COMMON))
