# Customer Service-Level Schedule Template

| Control field | Controlled value |
|---|---|
| Document ID | TIO-SVC-001 |
| Version / status | 2.0 / Unexecuted template - legal and service approval required |
| Classification | Contract working document |
| Owner / approver | Service owner and counsel / Authorized provider and customer signatories |
| Issue date / review | 24 October 2026 / Each negotiation or amendment |
| Source baseline | Repository operations and product records reviewed 24 October 2026 |
| Supersedes | Initial portfolio SLA schedule dated 24 October 2026 |

> **No commitment is created by this template.** Uptime, response, restoration, credit, support, recovery, and notification obligations exist only when completed and approved in an executed agreement.

## 1. Parties, service, and precedence

| Field | Approved value |
|---|---|
| Provider/customer legal entities | `[ ]` |
| Effective date, term, renewal | `[ ]` |
| Covered TIO Hub version, environment, installation | `[ ]` |
| Hosting, application, database operators | `[ ]` |
| Governing agreement, order form, privacy addendum | `[ ]` |
| Document precedence | `[Counsel-approved clause]` |

## 2. Service boundary and responsibilities

Define included application operation, support, maintenance, monitoring, exclusions, and dependencies. Identify customer IIS/SQL, identity, networks, certificates, backup platform, file storage, map tile provider, and third-party software. TIO Hub does not automatically monitor customer infrastructure or synchronize Jira in the documented design.

| Activity | Provider | Customer | Shared evidence |
|---|---|---|---|
| Application hosting, patching, and health | `[ ]` | `[ ]` | `[ ]` |
| SQL administration and backup | `[ ]` | `[ ]` | `[ ]` |
| Identity lifecycle and access review | `[ ]` | `[ ]` | `[ ]` |
| Attachments, exports, and retention | `[ ]` | `[ ]` | `[ ]` |
| Record accuracy and review | `[ ]` | `[ ]` | `[ ]` |
| Incident intake and communications | `[ ]` | `[ ]` | `[ ]` |

## 3. Support coverage and severity

| Severity | Impact definition | Coverage/time zone | Intake route | Escalation authority |
|---|---|---|---|---|
| P1 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| P2 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| P3 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| P4 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

Specify business days, holidays, out-of-hours coverage, required information, severity reassessment, and customer dependencies. Blank values are not implied targets.

## 4. Response and restoration objectives

| Severity | Initial response target | Update interval | Workaround/restoration objective | Measurement source |
|---|---:|---:|---:|---|
| P1 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| P2 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| P3 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| P4 | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

Define clock start/stop, pause conditions, time zone, exclusions, measurement, review cadence, and dispute process. Contract targets stored by TIO Hub are installation-specific and must not be presented as a universal product guarantee.

## 5. Availability, maintenance, and remedy

| Measure | Approved definition/value |
|---|---|
| Availability target, window, endpoint | `[ ]` |
| Monitoring owner and evidence source | `[ ]` |
| Planned maintenance and notice | `[ ]` |
| Exclusions and dependency treatment | `[ ]` |
| Credits/remedies, if any | `[Counsel-approved terms]` |

No default uptime percentage, monitoring commitment, or service credit is established by the reviewed repository material.

## 6. Recovery, security, and data handling

| Control | Value / owner / evidence |
|---|---|
| Recovery point objective (RPO) | `[ ]` |
| Recovery time objective (RTO) | `[ ]` |
| Database and file backup frequency/retention | `[ ]` |
| Restore exercise and acceptance criteria | `[ ]` |
| Data locations and access boundaries | `[ ]` |
| Incident notification route and timeline | `[Legal-approved]` |
| Record, audit, attachment, and export retention | `[ ]` |
| Data export/return/deletion on termination | `[ ]` |

Database and file-backed data should be backed up consistently. Verify recovery in isolation and record actual performance; a development drill does not prove production-scale RPO/RTO.

## 7. Governance and execution

Reviews occur on `[cadence]` using the measurement definitions above. Amendments require authorized written approval. Attach support matrix, security terms, privacy/DPA, maintenance calendar, recovery plan, and contacts. Legal counsel must confirm enforceability and precedence before execution.

| Party | Authorized signatory | Authority evidence | Signature/date |
|---|---|---|---|
| Provider | `[ ]` | `[ ]` | `[ ]` |
| Customer | `[ ]` | `[ ]` | `[ ]` |

## 8. Revision history

| Version | Date | Change | Approval |
|---|---|---|---|
| 1.0 | 24 Oct 2026 | Initial template | Not executed |
| 2.0 | 24 Oct 2026 | Added responsibilities, measurement mechanics, recovery, and execution controls | Pending counsel/service approval |
