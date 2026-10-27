# Commercial Brief and Go-to-Market Plan

| Control field | Controlled value |
|---|---|
| Document ID | TIO-MKT-001 |
| Version / status | 2.1 / Internal draft - not approved for external issue |
| Classification | Internal commercial working material |
| Owner / approver | Sales and marketing (proposed) / Product, Brand, Legal (pending) |
| Issue date / review | 24 October 2026 / Before each external campaign or product release |
| Source baseline | Repository working tree reviewed 24 October 2026; UI captures from local fictional-data build 2.30.0 |
| Supersedes | Initial portfolio commercial pack dated 24 October 2026 |

## 1. Positioning statement

For software operations teams that need to coordinate support across client environments, TIO Operations Hub is an internal operational workspace that connects client and technical context with cases, commitments, recorded contract terms, ownership and reporting. Unlike a monitoring platform or service desk integration, TIO Hub provides structured operational records and workflows under customer-managed deployment and access configuration.

## 2. Buyer brief

### The operational problem

An operations review often requires people to assemble client identity, supported environments, installed versions, affected components, open work, ownership and contract context from separate records. When links are unclear or evidence is old, the team must verify the facts before acting.

### What the product provides

TIO Hub keeps client, project and environment records connected to technical inventory and operational work. Teams can record case ownership and history, manage commitments and handovers, review contract-linked SLA measures, use operational reports, and apply configured resource/action permissions.

### Appropriate fit

The strongest candidate fit is an internal software operations or service team that already has accountable record owners and wants a common operational register, can operate a Windows/IIS and SQL Server deployment (or approve an alternative through architecture review), and accepts that Jira references, infrastructure condition and technical data are maintained rather than automatically synchronized or discovered.

### Questions to qualify before proposing a pilot

- Which teams and client data are in scope, and what visibility boundaries apply?
- Who owns data entry, review and correction for clients, environments, versions and cases?
- Which identity provider, access review, audit and export rules are required?
- What hosting, database, backup, attachment, retention and recovery responsibilities will apply?
- Which reports and measurements matter, and how will each be reconciled?
- Are integration, data residency, accessibility, assurance or legal requirements essential?
- What customer-specific support terms and approval process govern the deployment?

### What to say accurately

TIO Hub records operational context and provides workflows and reporting for authorized users. It can measure response and resolution for cases linked to recorded contract terms. Penalty assessments are indicative and do not create payments or credits. The documented build does not automatically synchronize Jira, monitor infrastructure, send email, provide public multi-tenant SaaS, or export reports as formatted PDF.

![Operations overview from a fictional TIO Hub demonstration](assets/screenshots/dashboard.png)

*Illustrative UI capture from a local development build. Fictional data only. Brand-owner approval is required before external use.

## 3. Evidence and claims register

| Proposed claim | Evidence basis | Permitted wording | Approval / evidence still needed |
|---|---|---|---|
| One connected operational view | Domain model and UI navigation connect client, environment, work, contracts and reports | “Connects operational records in one workspace” | Product owner confirms scope for the target release |
| Contract-linked SLA review | Case-level response/resolution measures and report views against recorded terms | “Review service measures for eligible cases linked to recorded contract terms” | Contract owner confirms coverage, target, pause rules, calendar and reporting population |
| Financial review context | Indicative penalty assessments and term/cap cohort reconciliation context | “Support an operational review of potential contractual exposure” | Finance validates clause, calculation and disposition; no credit/payment/accounting settlement is provided |
| ITSM work coordination | Cases, commitments, escalations, owners, handovers and manual Jira references | “Coordinate operational work and retain its record in one workspace” | Do not claim monitoring, automatic Jira synchronization or complete ITIL incident/problem/change management |
| Access is controlled | Server-side authorization, role/resource action controls and tests are documented | “Applies configured authorization to protected operations” | Security review of release/configuration; do not imply tenant isolation |
| SLA measures are available | Contract-linked case terms and response/resolution calculations | “Measures recorded obligations for linked cases” | Contract owner confirms terms and reporting definitions |
| Reporting is repeatable | Central server report registry with preview, exports, schedules and history | “Preview and export authorized operational reports” | Validate report definitions, access and deployment settings |
| Operational outcomes improve | No customer outcomes or controlled pilot data supplied | Do not state quantified savings or results | Pilot baseline, method, sample, customer approval and reproducible evidence |
| Security certification | No SOC 2/ISO report or certificate in reviewed evidence | State evidence status precisely | Valid report/certificate, scope, period, auditor and disclosure approval |

## 4. Go-to-market sequence

1. **Internal readiness:** confirm product version, release notes, support route, demo environment, claims register, approved logos and owner availability.
2. **Discovery:** interview target users and operators about the current register, records, handovers, security constraints and measurement needs. Record findings as research, not assumed facts.
3. **Qualification:** assess hosting, identity, client visibility, data residency, integration requirements, assurance, recovery, support and legal fit. Disqualify or escalate requirements outside the documented scope.
4. **Controlled demonstration:** use approved fictional demo data; demonstrate contract coverage -> linked case and SLA evidence -> owner/escalation -> service report -> indicative financial review boundary. Explain manually maintained fields and integration boundaries.
5. **Pilot proposal:** define scope, named users, migration approach, data ownership, acceptance scenarios, support terms, privacy/security controls, measures, duration, exit and deletion/retention responsibilities.
6. **Evidence review:** reconcile pilot results to source records, document limitations and obtain customer/legal approval for any public quotation or case study.
7. **Expansion decision:** proceed only after product, operational, security, legal and customer owners accept findings and responsibilities.

## 5. Channels and assets

![Fictional operational record-count snapshot](assets/demo-operations-chart.png)

*Counts are from the local development seed. They are examples, not benchmarks or customer outcomes.*


Candidate channels are direct account discovery, internal operations communities, partner referrals and technical briefings. Choose channels after identifying the buyer, sales cycle and support capacity; no market-size or conversion data is supplied. Use the presentation and screenshot gallery as draft demonstration aids only. Obtain written permission for brand marks, customer logos, quotes, screenshots and data before publication.

## 6. Objection handling

| Buyer question | Evidence-based answer |
|---|---|
| Does it discover servers or monitor availability? | No; technical inventory and condition are recorded by authorized users. |
| Does it sync Jira or send notifications by email? | Jira is a manual reference in the documented design. In-hub notifications are supported; outbound email is not. |
| Is it tenant-isolated SaaS? | No such claim is supported. The documented deployment is customer-managed, and the configured visibility policy must be reviewed for the intended data boundary. |
| Is it certified to SOC 2 or ISO 27001? | No report or certificate was present in the reviewed evidence set. Architecture and product evidence may be assessed independently. |
| What uptime, RPO or RTO is committed? | None is established in this draft. These values must be agreed for the service and installation in an approved schedule. |
| Can it export customer reports as PDF? | Current Reporting Center exports CSV or Excel; formatted PDF report export is not documented as available. |

## 7. Funnel and success measures

Define funnel stages and data sources before campaign launch: qualified discovery, technical fit review, approved demo, pilot proposal, signed pilot and documented expansion decision. Track counts and conversion only from a defined CRM or approved source with an agreed time period and owner. For pilots, agree operational measures with the customer before collecting baseline and outcome data. Do not infer causation from before/after metrics without a defensible method.

## 8. Brand and release approvals

Prior to external issue: Product confirms feature/version accuracy; Engineering confirms technical claims; Security approves assurance responses; Legal approves contract/privacy wording; Brand confirms marks and visual assets; Sales owner approves audience and distribution; customer approves named use, quotation, logos and results. The current screenshot header includes reference VITRONIC branding; external use is blocked until brand owner approval or a brand-safe replacement is authorized.

## 9. Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | Initial commercial pack | Draft |
| 2.0 | 24 Oct 2026 | Rebuilt with positioning, qualification, claims evidence, GTM controls and approval gates | Internal draft; approval pending |
| 2.1 | 24 Oct 2026 | Refocused positioning on service obligations, contract governance, finance boundaries and ITSM work coordination | Internal draft; approval pending |

