# TIO Hub ITSM concept review and prioritization

**Status:** Stakeholder review draft - no workflow approvals have been recorded  
**Prepared:** 24 October 2026  
**Scope:** Seven standalone concept screens for service operations, catalog, incidents and requests, problem, change, configuration, and continual improvement.

## Executive recommendation

Treat the mockups as a target operating-model proposal, not as a committed product roadmap. The strongest path is to agree service ownership, terminology, decision rights, and measures first; then implement a thin service portfolio/catalog, strengthen the existing case and contractual-SLA workflow, and make service configuration relationships dependable. Change enablement and problem management should follow on that foundation. Continual improvement should start as a governed register with measurable outcomes, rather than an unowned dashboard.

This sequence is a recommendation for stakeholder decision. No approval is implied by this document.

## Fit with the current hub

The repository documents a strong operational-record foundation: clients, projects, products, environments, infrastructure inventory and dependencies, contracts, recorded fees/payments, cases, commitments, escalations, reviews, data quality, audit, and reporting. Release decisions A61/A62 add contractual response/resolution measurement and operational-intelligence reporting. Existing contractual clocks snapshot the contract basis and targets, support-hour windows, time zone, and customer-wait pause rule. Public holiday calendars are not modelled. Penalty assessments are indicative and do not post credits or payments.

The concept screens therefore extend current capabilities; they are not screenshots of existing features. The principal process gaps are a service-oriented catalog distinct from the product catalog, explicit incident/request lifecycle and major-incident coordination, a governed change record and authorization path, dedicated problem/known-error records, service-level configuration ownership and impact links, and a continual-improvement register with benefit verification. Existing inventory and dependencies provide useful inputs to a configuration map, but completeness and service relationships need governance.

## Recommended implementation order

| Rank | Workflow | Recommendation | Why / dependency | Stakeholder decision required |
|---|---|---|---|---|
| P0 | Operating model and controls | Agree service owner, process owner, record taxonomy, priority model, approval authority, lifecycle, measurement definitions, and audit expectations before build. | Avoids encoding conflicting business rules. Current roles are Operation Engineer and TIO Manager; new approval roles or separation of duties would be a material access-model decision. | Operations, Product, Finance/Contracts, Security; approve named accountable owners and decision rights. |
| P1 | Service portfolio and request catalog | Define a minimal service register and customer-facing offerings, with owner, status, support window, covered products/environments, request types, and contract references. Start with a small set of high-volume offerings. | Makes requests and service-level reporting meaningful; products are not automatically business services. | Service owners and Product; approve initial service list, offering boundaries, and accountable data stewards. |
| P1 | Incident and request management | Refine the existing case workflow: distinguish incident from service request, introduce agreed categories and impact/urgency priority, assignment queue, response/resolution targets, escalation rules, customer updates, and major-incident coordination. | Direct day-to-day value; reuse existing case history, audit, reporting, and A61 contractual SLA calculations where definitions match. | Service Operations; approve priority matrix, clock exceptions, escalation thresholds, customer communication roles, and closure criteria. |
| P1 | Service configuration foundation | Govern service-to-product/environment/component relationships and ownership; add a dependency view only for verified, maintained data. Begin with manual relationships and change traceability. | Existing inventory/dependencies can seed this; trustworthy relationships are prerequisite to impact analysis. Avoid implying automated discovery. | Operations and technical owners; approve CI types, relationship vocabulary, verification cadence, and authoritative source. |
| P2 | Change enablement | Add standard/normal/emergency change records, risk and impact assessment, authorization evidence, planned windows/conflict checks, implementation outcome, and post-implementation review. | Reduces change-related incidents; depends on service/configuration links and clear authority. | Operations, service owners, security; approve change classes, risk matrix, emergency path, approval matrix, blackout rules, and rollback evidence. |
| P2 | Problem and known-error management | Add problem records linked to recurring incidents, root-cause evidence, workaround/known error, actions, owner, review date, and resolution verification. | Converts recurring incidents into prevention; depends on reliable incident categorization and linkage. | Operations and technical owners; approve problem triggers, RCA standard, known-error publication, and risk acceptance rules. |
| P3 | Continual improvement | Maintain a small improvement register with baseline, expected benefit, owner, due date, evidence, realized outcome, and close/continue decision. | Useful after service measures and operational records are trusted; prevents unverified benefit claims. | Product and Operations; approve intake, prioritization criteria, benefit owner, and review cadence. |

**Suggested sequencing:** P0 decisions → P1 catalog + incident/request + minimum configuration relationships (deliver in thin, independently usable slices) → P2 change and problem → P3 improvement analytics. Adjust order only when service risk, customer demand, or a contractual commitment supports it.

## Review checklist for the stakeholder session

### Service Operations

- Do incident and request need separate queues, statuses, and ownership rules? What should be the minimum viable lifecycle?
- Which impact/urgency combinations create priority, and who may override it with a reason?
- Which escalation events are automatic versus operational actions? How are customer updates owned and recorded?
- What qualifies as a major incident, who leads it, and what is the post-incident review requirement?
- How should A61's contractual clock interact with operational targets? Which holidays, pauses, coverage exceptions, and response evidence rules are required?
- Which change classes and emergency controls match actual operating practice? Who approves and who may implement?

### Product and service owners

- What is a service versus a product, project, contract, or technical component? Who owns each service record?
- Which service offerings should be visible to customers, and what request outcomes and fulfillment teams do they imply?
- Which service-to-product/environment relationships are authoritative, who verifies them, and how often?
- Which service measures drive product decisions, and how should improvement benefits be evidenced?

### Contracts and Finance

- Confirm the source of contract terms, renewal owner, fee/payment recording responsibilities, and reconciliation controls.
- Confirm that indicative SLA penalties are review information, not accounting entries. What approval and evidence are required before any financial posting outside the hub?
- Which SLA definitions are legally binding, and who approves changes to targets, calendars, and penalty terms?

### Security and governance

- Do current two-role permissions support the proposed separation between requester, approver, implementer, and auditor?
- Which records need restricted visibility, retention rules, evidence attachment controls, or privileged audit review?
- Which integrations are in scope? The current documented design stores manual Jira references and does not call Jira, monitoring, client systems, or messaging services.

## Proposed acceptance outcomes

- **Catalog:** each active offering has an accountable owner, supported service window, request path, and validated links to products/contracts; users can identify what they are requesting and what happens next.
- **Incident/request:** every record has service, type, category, impact, urgency, derived priority, accountable owner, lifecycle history, and a correctly measured applicable target; major incidents have a lead, linked work, and review evidence.
- **Configuration:** a service impact view shows only verified relationships, their owner and last verification, and can trace a change or incident to affected records without claiming discovery automation.
- **Change:** each implemented change has class, risk, approver(s), affected services/CIs, window, implementation and rollback plan, outcome, and required review; emergency changes preserve retrospective authorization evidence.
- **Problem:** recurring incidents can be linked to one problem; cause, workaround, corrective actions, ownership, and effectiveness review are recorded.
- **Improvement:** every accepted initiative has a baseline, expected measurable outcome, accountable benefit owner, due/review date, and evidence-based close decision.
- **Commercial controls:** contracts and fees/payments remain traceable to source terms; any penalty remains explicitly indicative until an authorized, separately controlled financial process approves it.

## Decision record to complete in the review

| Decision | Outcome | Accountable approver | Date | Conditions / follow-up |
|---|---|---|---|---|
| Service portfolio and catalog scope | Pending stakeholder review |  |  |  |
| Incident/request taxonomy and priority model | Pending stakeholder review |  |  |  |
| Contractual vs operational SLA rules | Pending stakeholder review |  |  |  |
| Configuration/CI ownership and verification | Pending stakeholder review |  |  |  |
| Change authority and emergency path | Pending stakeholder review |  |  |  |
| Problem and RCA governance | Pending stakeholder review |  |  |  |
| Improvement intake and benefit validation | Pending stakeholder review |  |  |  |
| Finance/penalty boundary and reconciliation | Pending stakeholder review |  |  |  |

**Implementation gate:** convert only approved rows into backlog items. Each item should name a business owner, evidence/acceptance criteria, dependencies, data migration/integration impact, access-control impact, operational owner, and release/rollback plan. Do not treat this priority recommendation as authorization for schema changes, production rollout, financial posting, or external integrations.

## Review provenance and limitations

This draft was prepared from the standalone ITSM concept mockups and the repository's README, decisions, requirements coverage, implementation plan, and operations guide. It is a desk review, not a meeting with Service Operations, Product, Finance, or Security stakeholders. Their approval decisions and named owners remain unrecorded.
