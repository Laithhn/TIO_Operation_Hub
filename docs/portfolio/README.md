# TIO Hub Documentation Register and Use Guide

| Control field | Controlled value |
|---|---|
| Document ID | TIO-DOC-001 |
| Version / status | 2.2 / Advanced controlled working pack - approval pending |
| Classification | Internal working pack; selected commercial drafts require approval before external issue |
| Owner / approver | Document controller (proposed) / Product owner and relevant function owners (approval pending) |
| Issue date / review | 24 October 2026 / 24 January 2027 or on material product change |
| Source baseline | Repository working tree reviewed 24 October 2026; not a clean release snapshot |
| Supersedes | Initial portfolio draft dated 24 October 2026 |

## 1. Purpose and control statement

This register defines the purpose, audience, status, owner, approval boundary and source of truth for the TIO Operations Hub documentation suite. The pack is a controlled working draft, not an approved contractual, security, product-release or customer-commitment set. Each document carries its own identifier and control record. A change to an authoritative product source takes precedence over copied summary text; the affected summaries must then be reviewed before reissue.

**Issue rule:** No item marked “approval pending” may be represented as approved policy, contractual commitment, audited evidence, certification, customer result or production configuration. Before external distribution, the document owner records the approved version, approver, effective date, audience, distribution method and any redactions in the release record.

## 2. Controlled document register

| ID | Document | Primary audience | Status and controlled use | Owner / approval route |
|---|---|---|---|---|
| TIO-DOC-001 | Documentation register and use guide | All readers / document control | Working draft; governs this pack | Document controller / Product owner |
| TIO-ARC-001 | System Design Document | Architecture, engineering, operations, security | Implementation-informed design baseline; not a deployment attestation | Engineering lead / Architecture and security review |
| TIO-BIZ-001 | Product requirements and roadmap | Product, leadership, UX/UI | Draft; roadmap is a candidate sequence, not a commitment | Product owner / Leadership |
| TIO-MKT-001 | Commercial brief and go-to-market | Sales, prospects, investors | Draft; claims require product and brand approval | Sales / Product owner |
| TIO-TECH-001 | Engineering and delivery guide | Engineering, DevOps, QA | Working technical index; source links remain authoritative | Engineering lead / Release owner |
| TIO-OPS-001 | User and operator guide | Users, support, operations | Draft; screens and permission behavior vary by release | Service owner / Operations |
| TIO-KB-001 | Knowledge base | Users and support | Draft support answers; validate against deployed release | Support lead / Service owner |
| TIO-OPS-002 | Standard operating procedures | Operations, administrators | Draft procedures; local runbooks and approvals required | Operations lead / Service owner |
| TIO-OPS-003 | Service, contract and financial operations playbook | Service owners, contract owners, finance, ITSM operations | Proposed management controls; local approval required | Service owner / Product, Operations, Finance and Legal owners |
| TIO-SVC-001 | Service-level schedule template | Provider and customer | Unexecuted template; every field requires agreement | Service owner / Legal and customer signatories |
| TIO-SEC-001 | Security assurance position | Enterprise buyers, security reviewers | Evidence summary; not an assurance report or attestation | Security owner / Legal and executive approval |
| TIO-MKT-002 | Customer case study template | Sales, customer marketing | Blank template; customer approval required | Marketing / Customer and legal approval |
| TIO-LEG-001 | Terms of service drafting template | Legal and commercial owners | Non-operative drafting aid only | Legal counsel / Authorized contracting entity |
| TIO-LEG-002 | Privacy notice drafting template | Privacy, legal, service operator | Non-publishable until deployment and jurisdiction review | Privacy counsel / Actual controller |
| TIO-DOC-002 | Product screenshot gallery | Product, sales, training | Illustrative UI record from fictional local data | Product / Brand owner before external use |

## 3. Source-of-truth hierarchy

1. **Deployed behavior:** verify the exact release, configuration, identity provider, grants and environment. Screenshots and draft prose do not override actual behavior.
2. **API and data contracts:** `docs/API.md`, `docs/openapi-v1.json`, application migrations/model, and `database/01-schema.sql` for the generated deployment schema. Confirm that API and schema artifacts match the intended release.
3. **Requirements and decisions:** `docs/REQUIREMENTS-COVERAGE.md`, `docs/DECISIONS.md`, `docs/IMPLEMENTATION-PLAN.md`, and current stage/decision records. A recorded decision with owner/date takes precedence over a speculative roadmap statement.
4. **Release and operations:** `docs/RELEASE-NOTES-2.30.0.md`, `docs/DEPLOYMENT-GUIDE.md`, `docs/OPERATIONS.md`, and `docs/TEST-RESULTS.md`. Their scope and issue dates matter; test results are not certification evidence.
5. **Audience documents:** this portfolio summarizes the sources above. Resolve discrepancies at the authoritative source first, then revise the affected summaries.

## 4. Release, review and change control

Every issue must identify: unique document ID, version, status, classification, owner, approver or approval status, issue date, review trigger, source baseline and revision history. Review also checks link validity, version-specific claims, product terminology, security/privacy boundaries, image provenance, accessibility, export rendering, and external distribution rights.

A major revision changes purpose, policy, product boundary, contractual language or audience. A minor revision adds or updates material without changing approved intent. Editorial corrections may use a patch increment, but must still be logged when issued externally. Each controlled document retains its own version; the portfolio issue version does not silently change unchanged document versions. All approval-pending items remain drafts until approved by the listed owners.

**Mandatory review triggers:** product release or API/schema change; authentication or access-policy change; material security/privacy incident; change to data processing, retention or hosting; a new service-level promise; new assurance evidence; change of legal entity/jurisdiction; external brand/customer approval; or discovery that any claim is inaccurate.

## 5. Audience and use rules

- Internal product, engineering and operations readers may use the technical guides as an index, then follow links to the authoritative source.
- Sales may use the commercial brief only after Product and Brand approve the final claims, images and distribution. No unapproved ROI, testimonial, customer outcome, uptime, certification or compliance claim may be added.
- Enterprise security reviewers may receive the assurance position only with Security/Legal approval and only with the evidence set whose date and scope are stated.
- Legal and privacy templates must be completed for the real contracting parties, deployment, data roles, jurisdiction and retention before use.
- Customer-specific operating procedures and SLA schedules are not universal TIO Hub product commitments.

## 6. Document portfolio

| Category | Deliverables | Core question answered |
|---|---|---|
| Technical | [System Design Document](../SYSTEM-DESIGN.md), [engineering guide](technical-pack.md), API, OpenAPI, schema, migration, release and operations sources | What is implemented, how does it integrate, and what must be verified for a release? |
| Product and business | [Product requirements and roadmap](product-pack.md) | Who is served, what capability is in scope, and what remains a decision? |
| Marketing and commercial | [Commercial brief and GTM](commercial-pack.md), [marketing presentation 2.2](../../deliverables/TIO-Hub-Marketing-2.2.pptx); [presentation PDF](../../deliverables/TIO-Hub-Marketing-2.2.pdf), [case-study template](case-study-template.md) | What value can be communicated with evidence and what approval is needed? |
| User and operations | [User guide](user-manual.md), [knowledge base](knowledge-base.md), [SOPs](sop-playbook.md), [service management playbook](service-management-playbook.md), [service schedule template](service-level-schedule.md) | How should people operate service, contract and SLA work and support a configured installation? |
| Legal and assurance | [Terms template](terms-of-service-draft.md), [privacy template](privacy-notice-draft.md), [assurance position](assurance-readiness.md) | What legal decisions and evidence must be completed before a commitment? |

## 7. Issued package

The controlled PDF issue is [TIO Hub Documentation PDFs 2.2](../../deliverables/TIO-Hub-Documentation-PDFs-2.2.zip). The advanced marketing presentation is available as an editable [PowerPoint 2.2](../../deliverables/TIO-Hub-Marketing-2.2.pptx) and [PDF](../../deliverables/TIO-Hub-Marketing-2.2.pdf); the [System Design Document PDF](../../deliverables/TIO-Hub-System-Design-2.2.pdf) accompanies its editable source. The archive contains 14 portfolio documents, the System Design Document, and the presentation PDF.

![TIO Hub operational context from client to case and review](assets/case-workflow.png)

## 8. Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | Initial documentation portfolio | Draft; approval pending |
| 2.0 | 24 Oct 2026 | Rebuilt suite with document control, source hierarchy, review triggers and audience-specific structure | Draft; approval pending |
| 2.1 | 24 Oct 2026 | Refocused portfolio on SLA, contract, financial review and ITSM operations; added controlled service management playbook | Draft; approval pending |
| 2.2 | 24 Oct 2026 | Advanced the control framework, financial reconciliation evidence and service-operations architecture | Draft; approval pending |

