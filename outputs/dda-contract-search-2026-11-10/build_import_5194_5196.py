import copy
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).parent
DOWNLOADS = Path(r'C:\Users\lmh\Downloads')

def fact(value, pages, clause=None, **extra):
    result = {'value': value, 'pages': pages}
    if clause: result['clause'] = clause
    result.update(extra)
    return result

def base(number, filename, page_count, dates, page_map):
    p=DOWNLOADS/filename
    return {
        'reference': f'{number} of 2025',
        'source_pdf': str(p),
        'source_sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
        'source_page_count': page_count,
        'review': 'All pages read through extracted English text; key numeric obligations, signatures, appendices and image-only tables visually verified. Arabic fee table translated for 5194. Referenced external proposal files are not embedded in these PDFs.',
        'customer': fact('Digital Dubai Government Establishment, affiliated with Dubai Digital Authority', [1]),
        'supplier': fact('VITRONIC MACHINE VISION MIDDLE EAST (L.L.C)', [1]),
        'currency': 'AED',
        'start_date': fact(dates[0], [page_map['term']], '2'),
        'end_date': fact(dates[1], [page_map['term']], '2'),
        'renewal': fact('Customer must notify supplier in writing of intention to renew thirty (30) days before expiry. No unconditional automatic renewal is specified.', [page_map['term']], '2', notice_days=30, automatic_renewal=None),
        'status_evidence': 'Countersigned PDF. Status of actual service completion, invoice issuance, payment and guarantee provision is not established by the contract alone.',
        'bank_guarantee': fact('Final, unconditional, irrevocable guarantee from bank operating within the State, for 10% of total contract value; starts on contract start date and remains valid for 90 days after contract end; revocation requires customer consent.', [4], '5.3', percent=10, validity_days_after_end=90, actual_guarantee_provided=None),
        'price_basis': fact('Final fixed total includes all expenses and excludes VAT and applicable statutory fees; no unilateral price increase.', page_map['price'], '5.1-5.2'),
        'penalties': {
            'delay_or_failure_rule': fact('Failure to provide contracted services/materials or delay beyond granted time permits measures under Dubai Law No. 12 of 2020 and relevant laws. Clause 12.16 repeats statutory penalties/fines/measures for delayed execution.', page_map['penalty'], '4; 12.16'),
            'numeric_formula': None,
            'service_credit_formula': None,
            'penalty_rate_or_cap': None,
            'exemption': fact('Supplier may seek exemption with supporting proof for emergency, force majeure, customer-caused delay or another cause outside its control. Exemption is effective only after customer consent under its legal procedures.', [page_map['delay']], '12.16'),
            'import_guidance': 'Do not invent a numeric penalty rate, daily formula, service credit or cap from the statutory reference. Store the statutory rule and exemption condition as text unless a separately verified instrument supplies a formula.'
        },
        'liability': fact('Direct loss/damage indemnity; indirect loss, consequential damage and loss of profit excluded, except damage from gross negligence, fraud or confidentiality breach. The paragraph states compensation shall not exceed 100% of total contract value. Supplier remains responsible for subcontractor performance.', page_map['liability'], '12.9', compensation_cap_percent=100, note='This is a compensation/liability cap, not a delay-penalty cap.'),
        'termination': {
            'breach_cure': fact('Customer may terminate for an unrectified breach after written notification and fifteen (15) working days; supplier liable for customer termination costs.', [page_map['termination']], '9.1', working_days=15),
            'convenience_notice': fact('Customer may terminate early on at least thirty (30) days written notice; customer compensates value of supplied materials/services rendered.', page_map['convenience'], '9.2', calendar_days=30),
            'other_grounds': fact('Fraud/manipulation, bribery conviction, insolvency/bankruptcy/liquidation preventing performance, supplier replacement or inability to perform; customer may call performance security, enforce at supplier expense and seek damages.', [page_map['convenience'][-1]], '9.3-9.4')
        },
        'force_majeure': fact('Written notice within seven working days, with event details, supporting documents and mitigation; agreed timeline extension; resume performance when feasible; proven force-majeure delay relief and termination if performance becomes unfeasible.', page_map['force'], '14', notice_working_days=7),
        'disputes': fact('Attempt amicable settlement; after thirty days without settlement refer to senior management of both parties. Dubai law and applicable UAE federal law govern; Dubai Courts for disagreement.', page_map['disputes'], '10', amicable_days=30),
        'notices': fact('In person, registered mail, email or other mutually agreed means; notify representative changes by email.', page_map['notices'], '17'),
        'contacts': [
            {'party':'Customer','name':'Huda Salim AlHashmi','title':'Principal Project Manager','email':'hudasalim.alhashmi@digitaldubai.ae','phone':'04-5599559','pages':[page_map['contacts']]},
            {'party':'Supplier','name':'Mohammed Ahmed Abdo Al Omari','title':'Customer Experience Products Lead','email':'mohammad.alomari@vitronic.com','phone':'04-3290009','pages':[page_map['contacts']]}
        ],
        'administration_and_security': [
            fact('Changes require mutual written agreement signed by authorized representatives through an approved addendum; contract terms prevail over discrepant appendices.', [page_map['subject'],page_map['amendments']], '1; 3'),
            fact('Prior IP remains with each party; use/licensing/transfer and use of names/logos need written consent or a separate written agreement. Customer materials/data create no supplier IP entitlement.', page_map['ip'], '6'),
            fact('Confidentiality, return of customer confidential materials and security requirements survive expiry/termination. Apply proportionate ISO/IEC 27001, ISO/IEC 22301, ISR/DESC including applicable cloud standards; PCI DSS where payment data is involved.', page_map['security'], '7'),
            fact('Written customer consent required for subcontracting and assignment; supplier remains liable for subcontractor performance.', [page_map['subcontract']], '8; 12.15'),
            fact('Customer preapproval for nominated specialists; qualified replacements, requested meetings, accurate performance records and compliance with written customer directions.', page_map['obligations'], '12.1-12.8'),
            fact('HSE compliance and precautions at customer premises; notify customer promptly if supplier personnel who attended premises contract an epidemic; maintain service continuity.', [page_map['hse']], '13'),
            fact('Customer may offset sums due and request statements/reports/records for audit. In a discrepancy between Arabic and English versions, Arabic prevails.', [page_map['general']], '15-16'),
            fact('Customer returns performance security after an approved contract completion certificate; actual certificate or security return is not evidenced.', [page_map['return_security']], '11.3')
        ],
        'history': [],
        'uncertainties': []
    }

c5194=base(5194,'DDGE Contract OYOON 182 AMC 2026 Al Qudra Bluscan SSPX-Print-CEsigned.pdf',24,('2026-01-01','2026-12-31'),{
    'term':3,'price':[4],'penalty':[3,4,16],'delay':16,'liability':[13,14], 'termination':9,'convenience':[10],'force':[18,19], 'disputes':[11], 'notices':[20,21], 'contacts':21,'subject':2,'amendments':3,'ip':[5,6],'security':[6,7,8,9],'subcontract':9,'obligations':[12,13],'hse':17,'general':20,'return_security':12
})
c5194.update({
    'title': fact('OYOON 182 AMC 2026 Al Qudra Bluscan SSPX, CCH',[1]),
    'requisition': fact('12500433',[1]),
    'category_evidence': 'Annual maintenance and support contract',
    'contract_value_ex_vat': fact(512506.76,[4,23],'5.1; Appendix 3'),
    'term_status_on_2026_11_10': 'Within stated contract term; no renewal beyond 2026 verified.',
    'payment_terms': fact('Monthly payments within thirty (30) days of supplier invoice submission, accompanied by approved, duly signed Service Completion Form confirming satisfactory service delivery.',[23],'Appendix 3',invoice_frequency='Monthly',payment_days=30,requirement='Approved and duly signed Service Completion Form'),
    'fee_lines': [
        {'description':'Maintenance of Bluscan speed enforcement devices','original_arabic':'صيانة أجهزة ضبط السرعة نوع بلوسكان','quantity':8,'monthly_amount_aed':13562.47,'annual_amount_aed':162749.66,'period_start':'2026-01-01','period_end':'2026-12-31','pages':[23]},
        {'description':'Maintenance of Bluscan (CCH) speed enforcement devices','original_arabic':'صيانة أجهزة ضبط السرعة نوع بلوسكان (CCH)','quantity':10,'monthly_amount_aed':28661.33,'annual_amount_aed':343935.90,'period_start':'2026-01-01','period_end':'2026-12-31','pages':[23]},
        {'description':'Cleaning of Bluscan (CCH) radar equipment cabinets','original_arabic':'تنظيف صناديق أجهزة الرادار نوع بلوسكان (CCH)','quantity':14,'monthly_amount_aed':485.10,'annual_amount_aed':5821.20,'period_start':'2026-01-01','period_end':'2026-12-31','pages':[23]}
    ],
    'sla': {
        'source':fact('Appendix 4, Service Level Agreement',[23,24]),
        'scope':fact('Remote diagnostics/support through secure connection; telephone/email during operational hours; on-site visits when remote resolution is unavailable; repair/replacement of faulty equipment; corrective maintenance restoring normal operation; preventive inspections/upkeep per manufacturer recommendations.',[23,24],'Appendix 4.1-4.2'),
        'response_targets': [
            {'priority':'P1','severity_label':'Critical','description':'Major system impact; immediate action','response_hours':1,'resolution_hours':None,'pages':[24]},
            {'priority':'P2','severity_label':'Urgent','description':'Significant impact','response_hours':8,'resolution_hours':None,'pages':[24]},
            {'priority':'P3','severity_label':'Standard','description':'Minor issues','response_hours':16,'resolution_hours':None,'pages':[24]},
            {'priority':'P4','severity_label':'Enhancement','description':'Non-critical requests','response_hours':72,'resolution_hours':None,'pages':[24]}
        ],
        'coverage':fact('Monday to Friday, 09:00–18:00 UAE time; public holidays excluded.',[24],'Appendix 4.6',days=['Monday','Tuesday','Wednesday','Thursday','Friday'],start_time='09:00',end_time='18:00',timezone='Asia/Dubai',public_holidays_excluded=True),
        'customer_responsibilities':fact('Provide remote access, site safety, necessary documentation and initial spare-parts inventory for corrective actions.',[24],'Appendix 4.4'),
        'exclusions':fact('Vandalism, disaster recovery, consumables and non-standard hardware/software changes not mutually agreed.',[24],'Appendix 4.5'),
        'escalation':fact('Escalation procedures apply when resolution exceeds agreed timelines; no numeric resolution limits or named escalation chain provided in this PDF.',[24],'Appendix 4.3'),
        'uptime_target':None,
        'response_clock_basis':None,
        'resolution_targets':None
    },
    'delivery_milestones':fact('Recurring maintenance throughout 1 January–31 December 2026; no separately dated delivery milestones beyond monthly service/invoicing and service-completion evidence.',[3,23,24]),
    'appendices':[
        {'number':1,'title':'Technical Offer','reference':'QU040000173','date_as_printed':'Jan-2025','referenced_file':'12500433 proposal.pdf','pages':[23],'file_embedded_in_source_pdf':False},
        {'number':2,'title':'Financial Offer','reference':'QU040000173','date_as_printed':'Jan-2025','referenced_file':'12500433 proposal.pdf','pages':[23],'file_embedded_in_source_pdf':False},
        {'number':3,'title':'Payment (Schedule or Milestones)','pages':[23]},
        {'number':4,'title':'Additional Agreements (Operation & SLA)','pages':[23,24]}
    ],
    'history':[
        fact('Supplier signature: Dr Youssef El Hansali, CEO; date 05/12/2025.',[22],event_date='2025-12-05'),
        fact('Contract service period starts 1 January 2026.',[3],event_date='2026-01-01'),
        fact('DDGE signature: H.E. Matar AlHumairi, CEO; timestamp 9.1.2026 11:47 UTC+4.',[22],event_date='2026-01-09'),
        fact('Stated contract expiry 31 December 2026.',[3],event_date='2026-12-31')
    ],
    'uncertainties':[
        'Referenced proposal 12500433 proposal.pdf is displayed only as an icon/reference and is not an embedded file in this source; detailed device inventories/specifications from that separate proposal were not verified.',
        'Printed monthly lines total AED 42,708.90; multiplying by 12 gives AED 512,506.80, four fils more than the stated/annual-line total AED 512,506.76. Preserve printed line values; do not silently rebalance invoices.',
        'P1 wording says immediate action, while the explicit response target is 1 hour. Store the 1-hour response target and immediate-action description together.',
        'No numeric resolution or availability target; response-clock handling outside coverage hours is not expressly defined.',
        'No numeric penalty/service-credit rate or cap appears in this PDF; the 100% compensation limit must not be used as a delay-penalty cap.',
        'Actual invoices, payments, completion certificates, bank-guarantee issuance and acceptance history require separate evidence.'
    ]
})

c5196=base(5196,'DDGE Contract OYOON 159 ANPR Data Management Solution-Print-CEsigned (002).pdf',21,('2025-07-01','2026-06-30'),{
    'term':2,'price':[3,4],'penalty':[3,14],'delay':14,'liability':[12,13], 'termination':8,'convenience':[8,9],'force':[15,16,17], 'disputes':[9,10], 'notices':[18], 'contacts':18,'subject':2,'amendments':3,'ip':[4,5],'security':[5,6,7,8],'subcontract':8,'obligations':[10,11,12],'hse':15,'general':17,'return_security':10
})
c5196.update({
    'title':fact('OYOON 159 ANPR Data Management Solution',[1]),
    'requisition':fact('12500298',[1]),
    'category_evidence':'ANPR operations optimization, professional resources, management modules, training/handover/commissioning',
    'contract_value_ex_vat':fact(440000,[3,21],'5.1; Appendix 3'),
    'term_status_on_2026_11_10':'Stated term expired 30 June 2026. No renewal, extension or actual completion proven by this PDF.',
    'payment_terms':fact('Appendix 3 defines planned invoice milestones and payment percentages; the PDF does not state a numeric invoice-to-payment due period.',[20,21],'Appendix 3',payment_days=None),
    'payment_categories':[
        {'description':'Allocation of professional human resources for ANPR operation optimization','amount_aed':308000,'percent':70,'pages':[21]},
        {'description':'Development of the Product (Management Modules)','amount_aed':110000,'percent':25,'pages':[21]},
        {'description':'Training, Handover, and Commissioning to Oyoon Operations','amount_aed':22000,'percent':5,'pages':[21]}
    ],
    'printed_milestone_rows':[
        {'row':'Start of Work','planned_date_as_printed':'01-Jul-25','date_iso':'2025-07-01','pages':[21]},
        {'row':'1.1','description':'Professional resources 1st payment','planned_invoice_date_as_printed':'31-Aug-25','planned_invoice_date_iso':'2025-08-31','invoice_amount_aed':77000,'payment_percent':17.5,'pages':[21]},
        {'row':'1.2','description':'Professional resources 2nd payment','planned_invoice_date_as_printed':'31-Oct-25','planned_invoice_date_iso':'2025-10-31','invoice_amount_aed':77000,'payment_percent':17.5,'pages':[21]},
        {'row':'1.3','description':'Professional resources 3rd payment','planned_invoice_date_as_printed':'31-Dec-25','planned_invoice_date_iso':'2025-12-31','invoice_amount_aed':77000,'payment_percent':17.5,'pages':[21]},
        {'row':'1.4','description':'Professional resources 4th payment','planned_invoice_date_as_printed':'28-Feb-25','planned_invoice_date_iso':'2025-02-28','invoice_amount_aed':77000,'payment_percent':17.5,'pages':[21],'validation_issue':'Printed year 2025 predates stated start; do not change to 2026 without clarification.'},
        {'row':'2.1','description':'Technical proposal plan and technology enhancement of existing software','planned_invoice_date_as_printed':'30-Sep-25','planned_invoice_date_iso':'2025-09-30','invoice_amount_aed':44000,'payment_percent':10,'pages':[21]},
        {'row':'2.2','description':'Complete development and deployment of 2 modules (Dashboard and Management)','planned_invoice_date_as_printed':'28-feb-26','planned_invoice_date_iso':'2026-02-28','invoice_amount_aed':66000,'payment_percent':15,'pages':[21]},
        {'row':'3.1','description':'Final Acceptance','planned_invoice_date_as_printed':'01-Mar-26','planned_invoice_date_iso':'2026-03-01','invoice_amount_aed':44000,'payment_percent':5,'pages':[21],'validation_issue':'AED 44,000 conflicts with 5% and category amount AED 22,000. Preserve as source text; do not treat amount as confirmed financial obligation.'},
        {'row':'End of Work','planned_date_as_printed':'31-Mar-26','date_iso':'2026-03-31','pages':[21]},
        {'row':'TOTAL','amount_aed':440000,'percent':100,'pages':[21]}
    ],
    'sla':{
        'defined_in_source_pdf':False,
        'response_targets':None,
        'resolution_targets':None,
        'coverage':None,
        'uptime_target':None,
        'source_evidence':'No SLA appendix, response/resolution timing table or coverage window in the 21-page source. Appendices 1 and 2 reference a separate proposal; Appendix 3 is the payment schedule.',
        'import_guidance':'Do not copy SLA targets from 5194 or later AMC agreements into this historical delivery/operations contract.'
    },
    'appendices':[
        {'number':1,'title':'Technical Offer','reference':'V 4.0','date_as_printed':'May-2025','referenced_file':'DDGE 12500298 Proposal.pdf','pages':[20],'file_embedded_in_source_pdf':False},
        {'number':2,'title':'Financial Offer','reference':'V 4.0','date_as_printed':'May-2025','referenced_file':'DDGE 12500298 Proposal.pdf','pages':[20],'file_embedded_in_source_pdf':False},
        {'number':3,'title':'Payment (Schedule or Milestones)','pages':[20,21]}
    ],
    'history':[
        fact('Stated contract term and planned start of work 1 July 2025.',[2,21],event_date='2025-07-01'),
        fact('Supplier signature: Dr Youssef El Hansali, CEO; dated 27/11/2025.',[19],event_date='2025-11-27'),
        fact('DDGE signature: H.E. Matar AlHumairi, CEO; timestamp 9.1.2026 11:47 UTC+4.',[19],event_date='2026-01-09'),
        fact('Planned final acceptance 1 March 2026; plan only, not actual acceptance evidence.',[21],event_date='2026-03-01'),
        fact('Planned end of work 31 March 2026; distinct from contractual expiry.',[21],event_date='2026-03-31'),
        fact('Stated contract expiry 30 June 2026.',[2],event_date='2026-06-30')
    ],
    'uncertainties':[
        'Referenced DDGE 12500298 Proposal.pdf (V4.0, May-2025) is not embedded; detailed proposal scope and any proposal-specific service targets remain unverified.',
        'Payment row 1.4 is printed 28-Feb-25, before the 1-Jul-25 start. Do not silently correct year.',
        'Final Acceptance row is AED 44,000 and 5%, whereas its category is AED 22,000/5%. Component invoice amounts total AED 462,000, but category totals and contract total are AED 440,000. Do not create a confirmed AED 462,000 payment schedule.',
        'The milestone table supplies planned invoice dates, not actual invoice/payment/completion dates or an explicit net-payment period.',
        'Planned end of work 31-Mar-2026 and contract expiry 30-Jun-2026 are separate printed dates; preserve both.',
        'No numeric SLA response/resolution/availability target or coverage schedule was found in this PDF.',
        'No numeric penalty/service-credit rate or cap appears in this PDF; the 100% compensation limit must not be used as a delay-penalty cap.',
        'Actual bank-guarantee provision, renewal/extension, service completion, final acceptance and invoice/payment status are not proven by the signed agreement.'
    ]
})

result={'review_date':'2026-11-10','purpose':'Verified source facts for authorized Hub contract import; no Hub mutations performed by this extraction task.','contracts':[c5194,c5196]}
(OUT/'import-5194-5196.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('Wrote',OUT/'import-5194-5196.json')
print('5194 annual fee lines:',sum(x['annual_amount_aed'] for x in c5194['fee_lines']))
print('5196 printed component invoices:',sum(x.get('invoice_amount_aed',0) for x in c5196['printed_milestone_rows']))
